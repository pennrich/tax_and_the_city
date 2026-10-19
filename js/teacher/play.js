// 진행 화면(TV): 문항 번호 → 문제·카운트다운·제출 현황 → 정답 공개 연출. 오른쪽에 순위·잔액.
// TV는 학생 모두가 보므로 문항 내용·정답·학생 답은 공개 전에 절대 그리지 않는다.
import { db, ref, get, update as dbUpdate, runTransaction, serverNow } from "../firebase.js";
import { buildOpenQuestion, buildReveal } from "../logic/updates.js";
import { isPresent } from "../logic/judge.js";
import { rankTeams, formatMoney } from "../logic/money.js";
import { wealthTier } from "../logic/tier.js";
import { renderAvatar } from "../avatars/avatars.js";
import { renderQR, joinUrl } from "../ui/qr.js";
import { sound } from "../sound.js";
import { esc, $, $$, toast } from "../ui/dom.js";
import { endGame, maybeAutoEnd } from "./end.js";

const CIRCLED = ["①", "②", "③", "④", "⑤"];
let root = null;
let C = null; // ctx
let timer = null;
let lastTick = null;
let animatedQ = new Set(); // 연출을 이미 보여 준 문항
let shownBalance = {}; // 화면에 보이는 잔액(카운트 애니메이션용)
let prevRanks = {};
let revealing = false;

export function mount(el, ctx) {
  root = el;
  C = ctx;
  animatedQ = new Set();
  // 새로고침했을 때 이미 공개된 문항은 연출 없이 결과만 보여 준다.
  const cur = ctx.game.current;
  if (cur?.phase === "revealed") animatedQ.add(cur.q);
  shownBalance = { ...(ctx.game.balances ?? {}) };
  prevRanks = Object.fromEntries(rankTeams(ctx.game.balances ?? {}).map((r) => [r.t, r.rank]));
  root.innerHTML = `<section class="play">
    <div class="play-main">
      <nav id="qnums" class="qnums"></nav>
      <div id="stage" class="stage"></div>
      <div class="play-foot">
        <button class="secondary small" id="qr-btn">📱 QR 보기</button>
        <button class="secondary small" id="end-btn">게임 종료</button>
      </div>
    </div>
    <aside id="rank" class="rank"></aside>
  </section>
  <div id="qr-overlay" class="overlay" hidden><div class="qr-box"><div id="qr-big"></div>
    <p class="code">입장 코드 <b>${ctx.code}</b></p><button id="qr-close">닫기</button></div></div>`;
  $("#qr-btn", root).onclick = () => {
    renderQR($("#qr-big"), joinUrl(C.code), 420);
    $("#qr-overlay").hidden = false;
  };
  $("#qr-close").onclick = () => ($("#qr-overlay").hidden = true);
  $("#end-btn", root).onclick = () => {
    if (confirm("게임을 끝낼까요? 남은 문항은 진행되지 않아요")) endGame(C);
  };
  $("#qnums", root).onclick = (e) => {
    const b = e.target.closest("[data-q]");
    if (b && !b.disabled) openQuestion(Number(b.dataset.q));
  };
  root.addEventListener("click", (e) => {
    if (e.target.closest("#reveal")) reveal();
  });
  timer = setInterval(tick, 250);
}

export function unmount() {
  clearInterval(timer);
  root = null;
  $("#qr-overlay")?.remove();
}

export function update(ctx) {
  if (!root) return;
  C = ctx;
  renderQnums();
  renderStage();
  renderRank();
  tick();
}

// ---------- 문항 번호 ----------
function renderQnums() {
  const g = C.game;
  const n = g.meta.questionCount;
  const open = g.current && g.current.phase !== "revealed";
  const played = g.played ?? {};
  let html = "";
  for (let q = 0; q < n; q++) {
    const done = Boolean(played[q]);
    const active = g.current?.q === q;
    html += `<button data-q="${q}" class="qn ${done ? "done" : ""} ${active ? "active" : ""}" ${done || open ? "disabled" : ""}>${q + 1}${done ? " ✔" : ""}</button>`;
  }
  setHtml($("#qnums", root), html);
}

async function openQuestion(q) {
  const question = C.key?.questions?.[q];
  if (!question) return toast("문항을 찾을 수 없어요");
  const now = serverNow();
  const present = {};
  for (const [t, team] of Object.entries(C.game.teams)) {
    present[t] = Object.keys(team.members ?? {}).filter((m) => C.game.seats?.[t]?.[m] && isPresent(C.game.presence?.[t]?.[m], now));
  }
  const { updates, coopKey } = buildOpenQuestion({ code: C.code, uid: C.uid, q, question, serverNow: now, present });
  C.coopKey = { ...(C.coopKey ?? {}), [q]: coopKey };
  await dbUpdate(ref(db), updates);
}

// ---------- 무대 ----------
function renderStage() {
  const cur = C.game.current;
  const stage = $("#stage", root);
  if (!cur) {
    const left = C.game.meta.questionCount - Object.keys(C.game.played ?? {}).length;
    return setHtml(stage, `<div class="stage-idle"><h1>문항 번호를 눌러 문제를 내세요</h1><p>남은 문항 ${left}개</p></div>`);
  }
  if (cur.phase === "open" || cur.phase === "closing") return setHtml(stage, openStage(cur));
  return renderRevealStage(cur);
}

function openStage(cur) {
  const choices =
    cur.type === "choice"
      ? `<ol class="tv-choices">${(cur.choices ?? []).map((c, i) => `<li><span>${CIRCLED[i]}</span> ${esc(c)}</li>`).join("")}</ol>`
      : cur.type === "text"
        ? `<p class="tv-hint">✍️ 태블릿에 답을 쓰세요</p>`
        : `<p class="tv-hint">🧩 팀원들의 문장 조각을 맞춰 각자 몇 번째인지 누르세요</p>`;
  return `<div class="q-open ${cur.type}">
    <div class="q-label">${cur.q + 1}번 ${cur.type === "coop" ? "· 협력 문항" : ""}</div>
    <div class="q-text">${esc(cur.text)}</div>
    ${choices}
    <div class="q-bottom"><div id="clock" class="clock"></div><button id="reveal" class="big">정답 공개</button></div>
  </div>`;
}

// ---------- 남은 시간·제출 현황 (0.25초마다) ----------
function tick() {
  if (!root || !C?.game) return;
  const cur = C.game.current;
  const clock = $("#clock", root);
  if ((cur?.phase === "open" || cur?.phase === "closing") && clock) {
    const left = Math.max(0, Math.ceil((cur.endsAt - serverNow()) / 1000));
    const text = left > 0 ? String(left) : "마감!";
    if (clock.textContent !== text) {
      clock.textContent = text;
      clock.classList.toggle("hurry", left > 0 && left <= 5);
      clock.classList.toggle("over", left === 0);
      $("#reveal", root)?.classList.toggle("pulse", left === 0);
      if (left > 0 && left <= 5 && lastTick !== left) sound.tick();
      lastTick = left;
    }
  }
  renderRank();
}

// ---------- 오른쪽 순위 패널 ----------
function renderRank() {
  const g = C.game;
  const now = serverNow();
  const cur = g.current;
  // 순위는 화면에 보이는(카운트 중인) 잔액 기준이라 숫자와 함께 자리를 바꾼다.
  const shown = Object.fromEntries(Object.keys(g.balances ?? {}).map((t) => [t, Math.round(shownBalance[t] ?? g.balances[t])]));
  const rows = rankTeams(shown).map(({ t, rank }) => {
    const team = g.teams[t];
    const bal = shownBalance[t] ?? g.balances[t];
    const av = g.teamAvatar?.[t];
    const tier = wealthTier(bal, g.meta.startMoney);
    const seated = Object.keys(team.members ?? {}).filter((m) => g.seats?.[t]?.[m]);
    let status = "";
    if (cur && cur.phase !== "revealed" && seated.length) {
      const answered = Object.keys(g.answers?.[cur.q]?.[t] ?? {}).length;
      status = `<div class="sub">${answered} / ${seated.length}명 제출</div>`;
    }
    const away = seated.filter((m) => !isPresent(g.presence?.[t]?.[m], now)).map((m) => esc(team.members[m]));
    const awayHtml = away.length ? `<div class="away">⚠ 연결 끊김 — ${away.join(", ")}</div>` : "";
    const move = prevRanks[t] && prevRanks[t] !== rank ? (prevRanks[t] > rank ? `<span class="up">▲</span>` : `<span class="down">▼</span>`) : "";
    return `<div class="rank-row tier${tier}" data-t="${t}">
      <div class="rk">${rank}${move}</div>
      <div class="rav">${av ? renderAvatar({ ...av, tier, size: 56 }) : ""}</div>
      <div class="rinfo"><div class="rname">${esc(team.name)}</div>
        <div class="rmoney money ${bal < 0 ? "debt" : ""}">${formatMoney(Math.round(bal))}</div>${status}${awayHtml}</div></div>`;
  });
  setHtml($("#rank", root), `<h2>순위</h2>${rows.join("")}`);
}

// ---------- 정답 공개 ----------
async function reveal() {
  if (revealing) return;
  const cur = C.game.current;
  if (!cur || (cur.phase !== "open" && cur.phase !== "closing")) return;
  revealing = true;
  $("#reveal", root)?.setAttribute("disabled", "");
  try {
    const q = cur.q;
    // 먼저 제출을 닫는다(규칙상 'open'일 때만 답을 받는다). 그다음에 읽어야 채점에서 빠지는 답이 없다.
    const closed = await runTransaction(ref(db, `games/${C.code}/current/phase`), (ph) => (ph === "revealed" ? undefined : "closing"));
    if (!closed.committed) return;
    const fresh = (await get(ref(db, `games/${C.code}`))).val();
    const question = C.key.questions[q];
    let coopKey = C.coopKey?.[q];
    if (question.type === "coop" && !coopKey) coopKey = (await get(ref(db, `teachers/${C.uid}/keys/${C.code}/coop/${q}`))).val() ?? {};
    const r = buildReveal({
      code: C.code, q, question, teams: fresh.teams,
      answers: fresh.answers?.[q] ?? {}, presence: fresh.presence ?? {}, balances: fresh.balances ?? {},
      startMoney: fresh.meta.startMoney, now: serverNow(), deadline: cur.endsAt, alreadyRevealed: Boolean(fresh.results?.[q]), coopKey: coopKey ?? {},
    });
    if (r) await dbUpdate(ref(db), r.updates);
  } finally {
    revealing = false;
  }
}

function renderRevealStage(cur) {
  const g = C.game;
  const q = cur.q;
  const results = g.results?.[q] ?? {};
  const answer = g.reveal?.[q]?.answerText ?? "";
  const cards = Object.entries(g.teams)
    .map(([t, team]) => {
      const r = results[t];
      if (!r) return "";
      const label = r.outcome === "correct" ? `+${formatMoney(r.delta)} 💰` : r.outcome === "wrong" ? `세금 ${formatMoney(-r.delta)} 징수!` : "참여자 없음";
      const av = g.teamAvatar?.[t];
      return `<div class="res ${r.outcome}" data-t="${t}">
        <div class="res-av">${av ? renderAvatar({ ...av, tier: r.tier, size: 72 }) : ""}</div>
        <div><div class="res-name">${esc(team.name)}</div><div class="res-label">${label}</div></div></div>`;
    })
    .join("");
  const html = `<div class="q-revealed"><div class="q-label">${q + 1}번 정답</div>
    <div class="answer">${esc(answer)}</div><div class="res-grid">${cards}</div></div>`;
  const stage = $("#stage", root);
  if (stage.dataset.html === html) return;
  const first = !animatedQ.has(q) && Object.keys(results).length > 0;
  setHtml(stage, html);
  if (first) {
    animatedQ.add(q);
    playRevealShow(results);
  } else {
    stage.classList.add("static");
    shownBalance = { ...g.balances };
    prevRanks = Object.fromEntries(rankTeams(g.balances).map((r) => [r.t, r.rank]));
  }
  maybeAutoEnd(C);
}

// 정답 확대 → 팀 카드 차례로 뒤집기 → 잔액 카운트 → 아바타 변신 → 순위 이동
function playRevealShow(results) {
  const stage = $("#stage", root);
  stage.classList.remove("static");
  const g = C.game;
  const before = { ...shownBalance };
  const oldTier = Object.fromEntries(Object.keys(results).map((t) => [t, wealthTier(before[t] ?? g.meta.startMoney, g.meta.startMoney)]));
  const outcomes = Object.values(results).map((r) => r.outcome);
  if (outcomes.includes("correct")) setTimeout(() => sound.coins(), 600);
  if (outcomes.includes("wrong")) setTimeout(() => sound.tax(), outcomes.includes("correct") ? 1700 : 600);
  const bankrupt = Object.entries(results).some(([t, r]) => r.tier === 5 && oldTier[t] !== 5);
  if (bankrupt) setTimeout(() => sound.bankrupt(), 2800);

  $$(".res", stage).forEach((el, i) => {
    el.style.animationDelay = `${0.7 + i * 0.3}s`;
    const t = el.dataset.t;
    if (results[t].tier !== oldTier[t]) el.classList.add("tier-change");
  });
  // 잔액 숫자 카운트(0.8초) — 카드가 다 뒤집힌 뒤
  const startAt = performance.now() + 700 + $$(".res", stage).length * 300;
  const anim = (now) => {
    const p = Math.min(1, Math.max(0, (now - startAt) / 800));
    for (const [t, r] of Object.entries(results)) shownBalance[t] = (before[t] ?? r.balance) + ((r.balance - (before[t] ?? r.balance)) * p);
    if (root) renderRank();
    if (p < 1) requestAnimationFrame(anim);
    else {
      shownBalance = { ...C.game.balances };
      setTimeout(() => (prevRanks = Object.fromEntries(rankTeams(C.game.balances).map((r) => [r.t, r.rank]))), 4000);
    }
  };
  requestAnimationFrame(anim);
}

function setHtml(el, html) {
  if (!el || el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
}

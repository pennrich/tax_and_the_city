// 게임 중 학생 화면: 문제 풀기 → 제출 완료 → 결과(오답 팀은 팀원 답 표) → 게임 끝.
import { db, ref, set, serverTimestamp, serverNow } from "../firebase.js";
import { isCorrect } from "../logic/grading.js";
import { formatMoney } from "../logic/money.js";
import { wealthTier } from "../logic/tier.js";
import { renderAvatar } from "../avatars/avatars.js";
import { esc, $, $$, toast } from "../ui/dom.js";
import { listen, render, code } from "./main.js";

const CIRCLED = ["①", "②", "③", "④", "⑤"];
let formQ = null; // 지금 고르는 중인 문항
let sel = null; // 객관식: 보기 번호, 협력형: 조각별 번호 배열
let textDraft = "";
let sending = false;

// 문항이 바뀌면 그 문항의 경로를 구독한다(같은 경로는 다시 구독하지 않는다).
function sync(S) {
  const g = `games/${code}`;
  const { t, m } = S.mySeat;
  const q = S.current?.q;
  if (S.meta.status === "ended") listen("final", `${g}/final/${t}`, (v) => (S.final = v));
  if (q === undefined || q === null) return;
  listen("myAnswer", `${g}/answers/${q}/${t}/${m}`, (v) => (S.myAnswer = { q, v }));
  if (S.current.type === "coop") {
    listen("pieces", `${g}/pieces/${q}/${t}/${m}`, (v) => (S.pieces = { q, v }));
    listen("pieceCount", `${g}/pieceCount/${q}/${t}`, (v) => (S.pieceCount = { q, v }));
  }
  if (S.current.phase === "revealed") {
    listen("reveal", `${g}/reveal/${q}`, (v) => (S.reveal = { q, v }));
    listen("myResult", `${g}/results/${q}/${t}`, (v) => (S.myResult = { q, v }));
    listen("teamAnswers", `${g}/answers/${q}/${t}`, (v) => (S.teamAnswers = { q, v }));
    if (S.current.type === "coop") listen("teamPieces", `${g}/pieces/${q}/${t}`, (v) => (S.teamPieces = { q, v }));
  }
}

// 구독한 값이 지금 문항의 것인지 확인한다. 아직 안 왔으면 undefined.
const forQ = (box, q) => (box && box.q === q ? box.v : undefined);

export function playView(S) {
  sync(S);
  if (S.meta.status === "ended") return finalView(S);
  const cur = S.current;
  if (!cur) return idle();
  const q = cur.q;
  if (formQ !== q) {
    formQ = q;
    sel = cur.type === "coop" ? [] : null;
    textDraft = "";
  }
  if (cur.phase === "revealed") return resultView(S, q);

  const mine = forQ(S.myAnswer, q);
  if (mine === undefined) return idle();
  if (mine) return { key: `done:${q}`, mood: "done", html: `<section class="screen"><h1>✅ 제출 완료!</h1><p>다른 팀원을 기다려요</p></section>` };

  let pieces = null;
  if (cur.type === "coop") {
    pieces = forQ(S.pieces, q);
    const count = forQ(S.pieceCount, q);
    if (pieces === undefined || count === undefined) return idle();
    if (!pieces) return { key: `rest:${q}`, mood: "rest", html: `<section class="screen"><h1>이번 문항은 쉬어요</h1><p>다음 문항부터 참여해요</p></section>` };
  }
  if (cur.phase === "closing" || serverNow() > cur.endsAt) return { key: `closed:${q}`, mood: "rest", html: `<section class="screen"><h1>⏰ 마감!</h1><p>정답 공개를 기다려요</p></section>` };
  return formView(S, cur, pieces);
}

function idle() {
  return {
    key: "idle",
    mood: "wait",
    html: `<section class="screen"><h1>다음 문제를 기다려요</h1><p class="hint">선생님이 문제를 열면 여기에 나와요.</p></section>`,
  };
}

function timerText(cur) {
  return `⏱ ${Math.max(0, Math.ceil((cur.endsAt - serverNow()) / 1000))}초`;
}

// ---------- 문제 풀기 ----------
function formView(S, cur, pieces) {
  let body = "";
  if (cur.type === "choice") {
    body = `<div class="answer-choices">${(cur.choices ?? [])
      .map((c, i) => `<button class="pick ${sel === i ? "on" : ""}" data-i="${i}"><span>${CIRCLED[i]}</span> ${esc(c)}</button>`)
      .join("")}</div>`;
  } else if (cur.type === "text") {
    body = `<input id="text-answer" class="text-answer" autocomplete="off" placeholder="답을 입력하세요" value="${esc(textDraft)}">`;
  } else {
    const count = forQ(S.pieceCount, cur.q);
    body = pieces
      .map(
        (p, k) => `<div class="piece"><div class="piece-text">“${esc(p)}”</div>
        <p>이 조각은 몇 번째일까요?</p>
        <div class="nums">${Array.from({ length: count }, (_, i) => i + 1)
          .map((n) => {
            const usedElsewhere = sel.some((v, j) => j !== k && v === n);
            return `<button class="num ${sel[k] === n ? "on" : ""}" data-k="${k}" data-n="${n}" ${usedElsewhere ? "disabled" : ""}>${n}</button>`;
          })
          .join("")}</div></div>`,
      )
      .join("");
  }
  const ready = cur.type === "choice" ? sel !== null : cur.type === "coop" ? pieces.every((_, k) => sel[k]) : true;
  return {
    key: `form:${cur.q}:${JSON.stringify(sel)}`,
    mood: "question",
    html: `<section class="screen question">
      <div class="q-head"><span class="q-no">${cur.q + 1}번${cur.type === "coop" ? " · 협력" : ""}</span><span id="timer" class="timer">${timerText(cur)}</span></div>
      <div class="q-text">${esc(cur.text)}</div>
      ${body}
      <button id="submit" class="submit" ${ready ? "" : "disabled"}>제출</button></section>`,
    bind: () => {
      $$(".pick").forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.i)), render())));
      $$(".num").forEach(
        (b) =>
          (b.onclick = () => {
            sel = [...sel];
            sel[Number(b.dataset.k)] = Number(b.dataset.n);
            render();
          }),
      );
      const input = $("#text-answer");
      if (input) {
        input.oninput = () => (textDraft = input.value);
        // on* 핸들러가 false를 돌려주면 키가 취소된다(백스페이스·방향키가 막힘). 그래서 값을 돌려주지 않는다.
        // 한글 조합 중 Enter는 글자 확정용이므로 제출하지 않는다.
        input.onkeydown = (e) => {
          if (e.key === "Enter" && !e.isComposing) submit(S, cur);
        };
      }
      $("#submit").onclick = () => submit(S, cur);
    },
    patch: () => {
      const tEl = $("#timer");
      if (tEl) tEl.textContent = timerText(cur);
    },
  };
}

async function submit(S, cur) {
  if (sending) return;
  let value;
  if (cur.type === "choice") value = sel;
  else if (cur.type === "text") value = textDraft.trim();
  else value = sel.map(Number);
  if (value === null || value === "" || (Array.isArray(value) && value.some((v) => !v))) return toast("답을 먼저 고르세요");
  sending = true;
  $("#submit")?.setAttribute("disabled", "");
  try {
    await set(ref(db, `games/${code}/answers/${cur.q}/${S.mySeat.t}/${S.mySeat.m}`), { value, at: serverTimestamp() });
  } catch {
    toast("시간이 끝났어요");
  } finally {
    sending = false;
  }
}

// ---------- 결과 ----------
function resultView(S, q) {
  const rev = forQ(S.reveal, q);
  const res = forQ(S.myResult, q);
  if (rev === undefined || res === undefined) return idle();
  const answer = `<div class="reveal-answer"><span>정답</span> ${esc(rev?.answerText ?? "")}</div>`;
  if (!res || res.outcome === "none") {
    return { key: `res:${q}:none`, mood: "rest", html: `<section class="screen">${answer}<h1>이번 문항은 판정 대상이 없어요</h1></section>` };
  }
  if (res.outcome === "correct") {
    return {
      key: `res:${q}:correct`,
      mood: "good",
      html: `<section class="screen celebrate">${answer}<h1>🎉 상금 ${formatMoney(res.delta)} 획득!</h1><div class="coins" aria-hidden="true">💰🪙💵🪙💰</div></section>`,
    };
  }
  const table = teamTable(S, q, rev, res);
  return {
    key: `res:${q}:wrong:${table}`,
    mood: "bad",
    html: `<section class="screen">${answer}<h1>💸 세금 ${formatMoney(-res.delta)} 징수</h1>
      <p>우리 팀 답을 확인해 보세요</p>${table}</section>`,
  };
}

function teamTable(S, q, rev, res) {
  const { t } = S.mySeat;
  const members = S.teams[t]?.members ?? {};
  const answers = forQ(S.teamAnswers, q) ?? {};
  const cur = S.current;
  if (cur.type === "coop") {
    const pieces = forQ(S.teamPieces, q) ?? {};
    const key = res.key ?? {};
    const rows = Object.entries(members).flatMap(([m, name]) => {
      if (!key[m]) return [];
      const given = answers[m]?.value;
      return key[m].map(
        (pos, k) => `<tr><td>${esc(name)}</td><td>“${esc(pieces[m]?.[k] ?? "")}”</td><td>${given ? given[k] : "(미제출)"}</td><td>${pos}</td>
          <td>${given && Number(given[k]) === pos ? "✅" : "❌"}</td></tr>`,
      );
    });
    return `<table class="team-table"><tr><th>팀원</th><th>받은 조각</th><th>누른 번호</th><th>정답 번호</th><th></th></tr>${rows.join("")}</table>`;
  }
  const rows = Object.entries(members).map(([m, name]) => {
    const a = answers[m];
    if (!a && !S.seats[t]?.[m]) return `<tr class="absent"><td>${esc(name)}</td><td>(결석 — 판정 제외)</td><td></td></tr>`;
    let shown = "(미제출)";
    let ok = false;
    if (a) {
      if (cur.type === "choice") {
        shown = `${CIRCLED[a.value] ?? ""} ${esc(cur.choices?.[a.value] ?? "")}`;
        ok = a.value === rev.answer;
      } else {
        shown = esc(a.value);
        ok = isCorrect({ type: "text", acceptedRaw: (rev.accepted ?? []).join(",") }, a.value);
      }
    }
    return `<tr><td>${esc(name)}</td><td>${shown}</td><td>${ok ? "✅" : "❌"}</td></tr>`;
  });
  return `<table class="team-table"><tr><th>팀원</th><th>낸 답</th><th></th></tr>${rows.join("")}</table>`;
}

// ---------- 게임 끝 ----------
function finalView(S) {
  const f = S.final;
  const { t } = S.mySeat;
  const av = S.teamAvatar[t];
  if (!f) return { key: "final:wait", mood: "wait", html: `<section class="screen"><h1>게임 끝!</h1></section>` };
  const total = Object.keys(S.teams).length;
  return {
    key: `final:${f.rank}:${f.balance}`,
    mood: f.rank === 1 ? "good" : "wait",
    html: `<section class="screen celebrate"><h1>🏁 게임 끝!</h1>
      <div class="big-avatar">${av ? renderAvatar({ ...av, tier: wealthTier(f.balance, S.meta.startMoney), size: 240 }) : ""}</div>
      <h2>${esc(S.teams[t]?.name)} — ${total}팀 중 ${f.rank}위</h2>
      <p class="final-money money ${f.balance < 0 ? "debt" : ""}">최종 ${formatMoney(f.balance)}</p></section>`,
  };
}

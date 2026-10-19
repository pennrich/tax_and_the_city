// 학생 화면: 입장 → 팀 → 이름 → (팀장) 아바타 → 대기 → 문제/결과 → 종료.
// 화면은 "키"가 바뀔 때만 다시 그려서, 입력 중인 답이 지워지지 않게 한다.
import {
  db, ref, get, set, onValue, runTransaction, onDisconnect, serverTimestamp, update,
  signInStudent, onUser, showSetupNeededIfMissing,
} from "../firebase.js";
import { ALL_AVATARS, JOBS, avatarKey, renderAvatar } from "../avatars/avatars.js";
import { buildClaimAvatar } from "../logic/updates.js";
import { formatMoney } from "../logic/money.js";
import { wealthTier } from "../logic/tier.js";
import { esc, $, $$, toast } from "../ui/dom.js";
import { playView } from "./play.js";

const app = $("#app");
const topbar = $("#topbar");
const params = new URLSearchParams(location.search);
const code = (params.get("g") ?? "").toUpperCase();

export const S = {
  code, uid: null, meta: null, teams: {}, seats: {}, teamAvatar: {}, claims: {},
  mySeat: null, balance: null, pickTeam: null, changingAvatar: false,
};
const subs = {};
let lastKey = null;
let presenceBound = false;

if (!showSetupNeededIfMissing()) {
  if (!code) renderCodeEntry();
  else {
    onUser((user) => {
      if (!user) return signInStudent().catch((e) => toast(`접속 실패: ${e.code ?? e.message}`));
      S.uid = user.uid;
      start();
    });
  }
}

function renderCodeEntry(msg = "") {
  app.innerHTML = `<section class="screen"><h1>🗽 Tax and the City</h1>
    <p>${msg || "선생님 화면에 보이는 입장 코드를 입력하세요"}</p>
    <div class="code-entry"><input id="code" maxlength="6" autocomplete="off"><button id="go">들어가기</button></div></section>`;
  $("#go").onclick = () => {
    const v = $("#code").value.trim().toUpperCase();
    if (!v) return;
    const p = new URLSearchParams(location.search);
    p.set("g", v);
    location.search = p.toString();
  };
}

function listen(key, path, fn) {
  if (subs[key]?.path === path) return;
  subs[key]?.off();
  const off = onValue(
    ref(db, path),
    (s) => {
      fn(s.val());
      render();
    },
    () => {}, // 권한 없음(예: 자리 풀림 직후)은 조용히 무시
  );
  subs[key] = { path, off };
}

function unlisten(key) {
  subs[key]?.off();
  delete subs[key];
}

function start() {
  const g = `games/${code}`;
  get(ref(db, `${g}/meta`)).then((s) => {
    if (!s.exists()) return renderCodeEntry("그런 게임이 없어요. 입장 코드를 확인하세요");
    listen("meta", `${g}/meta`, (v) => (S.meta = v));
    listen("teams", `${g}/teams`, (v) => (S.teams = v ?? {}));
    listen("seats", `${g}/seats`, (v) => (S.seats = v ?? {}));
    listen("teamAvatar", `${g}/teamAvatar`, (v) => (S.teamAvatar = v ?? {}));
    listen("claims", `${g}/avatarClaims`, (v) => (S.claims = v ?? {}));
    listen("current", `${g}/current`, (v) => (S.current = v));
    setInterval(render, 500); // 남은 시간 표시·마감 전환
    listen("uidSeat", `${g}/uidSeat/${S.uid}`, (v) => {
      S.mySeat = v;
      if (v) {
        listen("balance", `${g}/balances/${v.t}`, (b) => (S.balance = b));
        bindPresence();
      } else {
        unlisten("balance");
        S.balance = null;
      }
    });
  });
}

let connected = false;

async function goOnline() {
  if (!connected || !S.mySeat) return;
  const p = ref(db, `games/${code}/presence/${S.mySeat.t}/${S.mySeat.m}`);
  await onDisconnect(p).set({ online: false, lastChanged: serverTimestamp() });
  await set(p, { online: true, lastChanged: serverTimestamp() });
}

// 자리를 잡을 때마다, 그리고 연결이 다시 될 때마다 "접속 중"을 기록한다.
function bindPresence() {
  if (presenceBound) return goOnline();
  presenceBound = true;
  onValue(ref(db, ".info/connected"), (s) => {
    connected = Boolean(s.val());
    goOnline();
  });
}

// ---------- 화면 고르기 ----------
function render() {
  if (!S.meta) return;
  const view = pickView();
  document.body.dataset.mood = view.mood ?? "wait";
  renderTopbar();
  if (view.key !== lastKey) {
    lastKey = view.key;
    app.innerHTML = view.html;
    view.bind?.();
  } else view.patch?.();
}

function pickView() {
  if (!S.mySeat) return S.pickTeam ? nameView() : teamView();
  const isLeader = S.mySeat.m === "m1";
  if (S.meta.status === "lobby") {
    if (isLeader && (!S.teamAvatar[S.mySeat.t] || S.changingAvatar)) return avatarView();
    return waitView();
  }
  return playView(S);
}

function renderTopbar() {
  if (!S.mySeat || S.meta.status === "lobby") {
    topbar.hidden = true;
    return;
  }
  const { t, m } = S.mySeat;
  const av = S.teamAvatar[t];
  const tier = S.balance == null ? 2 : wealthTier(S.balance, S.meta.startMoney);
  const html = `${av ? renderAvatar({ ...av, tier, size: 64 }) : ""}
    <div><div class="tb-team">${esc(S.teams[t]?.name)}</div><div class="tb-name">${esc(S.teams[t]?.members?.[m])}</div></div>
    <div class="tb-money money ${S.balance < 0 ? "debt" : ""}">${S.balance == null ? "" : formatMoney(S.balance)}</div>`;
  if (topbar.innerHTML !== html) topbar.innerHTML = html;
  topbar.hidden = false;
}

// ---------- 팀·이름 고르기 ----------
function teamView() {
  const teams = Object.entries(S.teams);
  return {
    key: `team:${teams.map(([t, x]) => t + x.name).join()}`,
    html: `<section class="screen"><h1>🗽 Tax and the City</h1><h2>우리 팀을 고르세요</h2>
      <div class="choices-grid">${teams.map(([t, x]) => `<button data-t="${t}">${esc(x.name)}</button>`).join("")}</div></section>`,
    bind: () =>
      $$("[data-t]").forEach(
        (b) =>
          (b.onclick = () => {
            S.pickTeam = b.dataset.t;
            render();
          }),
      ),
  };
}

function nameView() {
  const t = S.pickTeam;
  const members = Object.entries(S.teams[t]?.members ?? {});
  const taken = (m) => Boolean(S.seats[t]?.[m]);
  return {
    key: `name:${t}:${members.map(([m]) => m + taken(m)).join()}`,
    html: `<section class="screen"><h2>${esc(S.teams[t]?.name)} — 내 이름을 고르세요</h2>
      <div class="choices-grid">${members
        .map(([m, n]) => `<button data-m="${m}" class="${taken(m) ? "taken" : ""}" ${taken(m) ? "disabled" : ""}>${m === "m1" ? "👑 " : ""}${esc(n)}</button>`)
        .join("")}</div>
      <button class="secondary" id="back">← 팀 다시 고르기</button></section>`,
    bind: () => {
      $("#back").onclick = () => {
        S.pickTeam = null;
        render();
      };
      $$("[data-m]").forEach((b) => (b.onclick = () => claimSeat(t, b.dataset.m)));
    },
  };
}

async function claimSeat(t, m) {
  const seatRef = ref(db, `games/${code}/seats/${t}/${m}`);
  try {
    const r = await runTransaction(seatRef, (cur) => (cur && cur.uid !== S.uid ? undefined : { uid: S.uid }));
    if (!r.committed) return toast("이미 선택된 이름이에요");
    await set(ref(db, `games/${code}/uidSeat/${S.uid}`), { t, m });
    localStorage.setItem(`tq_seat_${code}`, JSON.stringify({ t, m }));
  } catch {
    toast("이미 선택된 이름이에요");
  }
}

// ---------- 팀 아바타 (팀장만) ----------
function avatarView() {
  const { t } = S.mySeat;
  const mine = S.teamAvatar[t];
  const jobLabel = Object.fromEntries(JOBS.map((j) => [j.id, j.label]));
  const cells = ALL_AVATARS.map((a) => {
    const owner = S.claims[avatarKey(a.gender, a.job)];
    const isMine = owner === t;
    const locked = owner && !isMine;
    return `<button class="avatar-pick ${isMine ? "mine" : ""} ${locked ? "locked" : ""}" data-g="${a.gender}" data-j="${a.job}" ${locked ? "disabled" : ""}>
      ${renderAvatar({ ...a, tier: 2, size: 110 })}
      <span>${jobLabel[a.job]} (${a.gender === "f" ? "여" : "남"})</span>
      ${locked ? `<span class="lock">🔒 ${esc(S.teams[owner]?.name ?? "")}</span>` : ""}</button>`;
  }).join("");
  return {
    key: `avatar:${JSON.stringify(S.claims)}:${S.changingAvatar}`,
    html: `<section class="screen"><h2>👑 팀장님, 우리 팀 아바타를 고르세요</h2>
      <p class="hint">다른 팀이 먼저 고른 아바타는 고를 수 없어요.</p>
      <div class="avatar-grid">${cells}</div>
      ${mine ? `<button id="done">이걸로 할게요 ✔</button>` : ""}</section>`,
    bind: () => {
      $$(".avatar-pick:not([disabled])").forEach((b) => (b.onclick = () => pickAvatar(b.dataset.g, b.dataset.j)));
      const done = $("#done");
      if (done)
        done.onclick = () => {
          S.changingAvatar = false;
          render();
        };
    },
  };
}

async function pickAvatar(gender, job) {
  const { t } = S.mySeat;
  try {
    await update(ref(db), buildClaimAvatar({ code, t, gender, job, previous: S.teamAvatar[t] }));
    S.changingAvatar = false;
    render();
  } catch {
    toast("방금 다른 팀이 골랐어요. 다른 아바타를 고르세요");
  }
}

function waitView() {
  const { t, m } = S.mySeat;
  const av = S.teamAvatar[t];
  const isLeader = m === "m1";
  return {
    key: `wait:${t}:${av ? avatarKey(av.gender, av.job) : "none"}`,
    html: `<section class="screen"><h2>${esc(S.teams[t]?.name)} · ${esc(S.teams[t]?.members?.[m])}</h2>
      <div class="big-avatar">${av ? renderAvatar({ ...av, tier: 2, size: 240 }) : ""}</div>
      <p>${av ? "우리 팀 아바타예요!" : "팀장이 아바타를 고르고 있어요…"}</p>
      <h1>선생님이 시작할 때까지 기다리세요</h1>
      ${isLeader && av ? `<button class="secondary" id="change">아바타 바꾸기</button>` : ""}</section>`,
    bind: () => {
      const c = $("#change");
      if (c)
        c.onclick = () => {
          S.changingAvatar = true;
          render();
        };
    },
  };
}

export { render, code, listen };

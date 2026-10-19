// 교사 화면(TV) 상태 전환: 로그인 → 게임 고르기 → 대기방 → 진행 → 종료.
// 새로고침해도 teachers/{uid}/activeGame 으로 진행 중인 게임에 복귀한다.
import { db, ref, get, update, onValue, signInTeacher, onUser, showSetupNeededIfMissing } from "../firebase.js";
import { buildStartGame } from "../logic/updates.js";
import { normalizeDraft, validateDraft } from "../logic/quizModel.js";
import { makeGameCode } from "../logic/gameCode.js";
import { sound } from "../sound.js";
import { esc, $, $$, toast } from "../ui/dom.js";
import * as lobby from "./lobby.js";
import * as play from "./play.js";
import * as end from "./end.js";

const app = $("#app");
const SCREENS = { lobby, playing: play, ended: end };

export const ctx = { uid: null, code: null, game: null, key: null, drafts: {} };
let unsubGame = null;
let unsubDrafts = null;
let current = null; // 지금 화면 이름

if (!showSetupNeededIfMissing()) {
  setupMute();
  onUser((user) => {
    ctx.uid = user?.uid ?? null;
    if (!ctx.uid) return showLogin();
    onValue(ref(db, `teachers/${ctx.uid}/activeGame`), (s) => {
      const code = s.val();
      if (code) attach(code);
      else if (ctx.game?.meta?.status !== "ended") showList();
    });
  });
}

function setupMute() {
  const b = $("#mute");
  const paint = () => (b.textContent = sound.isMuted() ? "🔇" : "🔊");
  b.onclick = () => {
    sound.setMuted(!sound.isMuted());
    sound.unlock();
    paint();
  };
  paint();
  document.addEventListener("pointerdown", () => sound.unlock(), { once: true });
}

function showLogin() {
  current = "login";
  app.innerHTML = `<section class="center"><h1 class="logo">🗽 Tax and the City</h1>
    <button id="login" class="big">교사 로그인 (구글)</button></section>`;
  $("#login").onclick = () => signInTeacher().catch((e) => toast(`로그인 실패: ${e.code ?? e.message}`));
}

// 게임 고르기: TV에 비치므로 게임 이름만 보여 준다.
function showList() {
  detach();
  current = "list";
  unsubDrafts?.();
  unsubDrafts = onValue(ref(db, `teachers/${ctx.uid}/drafts`), (s) => {
    if (current !== "list") return;
    ctx.drafts = s.val() ?? {};
    const cards = Object.entries(ctx.drafts)
      .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0))
      .map(([id, d]) => `<button class="game-card" data-id="${id}">${esc(d.name || "(이름 없음)")}</button>`)
      .join("");
    app.innerHTML = `<section class="center"><h1 class="logo">🗽 Tax and the City</h1>
      <h2>오늘 할 게임을 고르세요</h2>
      <div class="game-cards">${cards || "<p>준비된 게임이 없어요. 먼저 준비 페이지(admin.html)에서 게임을 만들어 주세요.</p>"}</div></section>`;
    $$(".game-card").forEach((b) => (b.onclick = () => startGame(b.dataset.id)));
  });
}

async function startGame(draftId) {
  const draft = normalizeDraft(ctx.drafts[draftId]);
  if (validateDraft(draft).length) return toast("이 게임은 준비 페이지에서 고칠 부분이 있어요");
  if (!confirm(`"${draft.name}" 게임을 시작할까요?`)) return;
  let code;
  do code = makeGameCode();
  while ((await get(ref(db, `games/${code}/meta`))).exists());
  await update(ref(db), buildStartGame({ code, uid: ctx.uid, draft, now: Date.now() }));
}

async function attach(code) {
  if (ctx.code === code) return;
  detach();
  unsubDrafts?.();
  ctx.code = code;
  ctx.key = (await get(ref(db, `teachers/${ctx.uid}/keys/${code}`))).val();
  unsubGame = onValue(ref(db, `games/${code}`), (s) => {
    ctx.game = s.val();
    if (!ctx.game) return showList();
    route();
  });
}

function detach() {
  unsubGame?.();
  unsubGame = null;
  if (current && SCREENS[current]) SCREENS[current].unmount?.();
  ctx.code = null;
  ctx.game = null;
  ctx.key = null;
}

function route() {
  const name = ctx.game.meta.status;
  const screen = SCREENS[name];
  if (current !== name) {
    if (current && SCREENS[current]) SCREENS[current].unmount?.();
    current = name;
    screen.mount(app, ctx);
  }
  screen.update(ctx);
}

/** 종료 화면의 "새 게임으로" 버튼에서 부른다. */
export function backToList() {
  current = null;
  showList();
}

// 대기방(TV): QR, 팀별 입장 현황과 팀 아바타, 자리 풀기, 게임 시작.
import { db, ref, update as dbUpdate, serverNow } from "../firebase.js";
import { buildStartPlaying } from "../logic/updates.js";
import { isPresent } from "../logic/judge.js";
import { renderAvatar } from "../avatars/avatars.js";
import { renderQR, joinUrl } from "../ui/qr.js";
import { esc, $ } from "../ui/dom.js";

let root = null;

export function mount(el, ctx) {
  root = el;
  const url = joinUrl(ctx.code);
  root.innerHTML = `<section class="lobby">
    <div class="join">
      <h1 class="logo">🗽 Tax and the City</h1>
      <p class="title">${esc(ctx.game.meta.name)}</p>
      <div id="qr"></div>
      <p class="code">입장 코드 <b>${ctx.code}</b></p>
      <p class="url">${esc(url)}</p>
    </div>
    <div class="teams-side">
      <div class="lobby-head"><h2>대기방</h2><span id="count" class="count"></span></div>
      <div id="teams" class="team-grid"></div>
      <div class="start-row"><button id="start" class="big">게임 시작 ▶</button></div>
    </div></section>`;
  renderQR($("#qr", root), url, 420);
  $("#start", root).onclick = () => start(ctx);
  $("#teams", root).onclick = (e) => {
    const b = e.target.closest("[data-release]");
    if (b) release(ctx, b.dataset.t, b.dataset.m);
  };
}

export function unmount() {
  root = null;
}

export function update(ctx) {
  if (!root) return;
  const g = ctx.game;
  const now = serverNow();
  let joined = 0;
  let total = 0;
  const cards = Object.entries(g.teams ?? {}).map(([t, team]) => {
    const av = g.teamAvatar?.[t];
    const members = Object.entries(team.members ?? {}).map(([m, name]) => {
      total += 1;
      const seat = g.seats?.[t]?.[m];
      if (seat) joined += 1;
      const online = isPresent(g.presence?.[t]?.[m], now);
      const crown = m === "m1" ? "👑 " : "";
      return seat
        ? `<li class="in ${online ? "" : "away"}">✅ ${crown}${esc(name)} <button class="release" data-release data-t="${t}" data-m="${m}" title="자리 풀기">풀기</button></li>`
        : `<li class="out">⬜ ${crown}${esc(name)}</li>`;
    });
    return `<div class="team-card">
      <div class="av">${av ? renderAvatar({ ...av, tier: 2, size: 72 }) : `<div class="av-empty">팀장<br>선택 중</div>`}</div>
      <div><h3>${esc(team.name)}</h3><ul>${members.join("")}</ul></div></div>`;
  });
  $("#teams", root).innerHTML = cards.join("");
  $("#count", root).textContent = `입장 ${joined} / ${total}명`;
  root.dataset.missing = String(total - joined);
}

async function start(ctx) {
  const missing = Number(root.dataset.missing);
  if (missing > 0 && !confirm(`아직 ${missing}명이 들어오지 않았어요. 시작할까요?`)) return;
  const g = ctx.game;
  await dbUpdate(ref(db), buildStartPlaying({ code: ctx.code, teams: g.teams, teamAvatar: g.teamAvatar ?? {}, claims: g.avatarClaims ?? {} }));
}

async function release(ctx, t, m) {
  const seat = ctx.game.seats?.[t]?.[m];
  if (!seat) return;
  const name = ctx.game.teams[t].members[m];
  if (!confirm(`${name} 자리를 풀까요? 그 학생은 다시 이름을 골라야 해요.`)) return;
  await dbUpdate(ref(db), {
    [`games/${ctx.code}/seats/${t}/${m}`]: null,
    [`games/${ctx.code}/uidSeat/${seat.uid}`]: null,
    [`games/${ctx.code}/presence/${t}/${m}`]: null,
  });
}

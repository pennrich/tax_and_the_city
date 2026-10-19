// 게임 종료와 시상식(TV).
import { db, ref, update as dbUpdate } from "../firebase.js";
import { buildEnd } from "../logic/updates.js";
import { rankTeams, formatMoney } from "../logic/money.js";
import { wealthTier } from "../logic/tier.js";
import { renderAvatar } from "../avatars/avatars.js";
import { sound } from "../sound.js";
import { esc, $ } from "../ui/dom.js";
import { backToList } from "./main.js";

let root = null;
let autoTimer = null;

export async function endGame(ctx) {
  clearTimeout(autoTimer);
  await dbUpdate(ref(db), buildEnd({ code: ctx.code, uid: ctx.uid, balances: ctx.game.balances }));
}

/** 마지막 문항까지 공개되면 8초 뒤(또는 버튼을 누르면) 종료한다. */
export function maybeAutoEnd(ctx) {
  const g = ctx.game;
  const played = Object.keys(g.played ?? {}).length;
  const last = played >= g.meta.questionCount && g.current?.phase === "revealed" && g.results?.[g.current.q];
  if (!last || autoTimer) return;
  const stage = $("#stage");
  stage?.insertAdjacentHTML("beforeend", `<div class="final-cta"><button id="final-now" class="big">🏆 최종 결과 보기</button></div>`);
  $("#final-now")?.addEventListener("click", () => endGame(ctx));
  autoTimer = setTimeout(() => endGame(ctx), 8000);
}

export function mount(el, ctx) {
  clearTimeout(autoTimer);
  autoTimer = null;
  root = el;
  const g = ctx.game;
  const ranks = rankTeams(g.balances ?? {});
  const card = (r) => {
    const { t, rank, balance } = r;
    const i = ranks.indexOf(r);
    const av = g.teamAvatar?.[t];
    return `<div class="podium-item place${Math.min(rank, 4)}" style="animation-delay:${(ranks.length - 1 - i) * 0.6}s">
      <div class="p-rank">${rank}위</div>
      ${av ? renderAvatar({ ...av, tier: wealthTier(balance, g.meta.startMoney), size: rank === 1 ? 180 : rank <= 3 ? 140 : 96 }) : ""}
      <div class="p-name">${esc(g.teams[t].name)}</div>
      <div class="p-money money ${balance < 0 ? "debt" : ""}">${formatMoney(balance)}</div></div>`;
  };
  const top = ranks.filter((r) => r.rank <= 3);
  const rest = ranks.filter((r) => r.rank > 3);
  root.innerHTML = `<section class="ceremony">
    <h1 class="logo">🏆 최종 결과</h1>
    <div class="podium">${top.map(card).join("")}</div>
    <div class="others">${rest.map(card).join("")}</div>
    <div class="confetti" aria-hidden="true">${Array.from({ length: 60 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 12) * 0.25}s;background:hsl(${(i * 47) % 360} 90% 60%)"></i>`).join("")}</div>
    <button id="again" class="big">새 게임으로</button></section>`;
  setTimeout(() => sound.fanfare(), (ranks.length - 3) * 600);
  $("#again", root).onclick = backToList;
}

export function update() {}

export function unmount() {
  root = null;
}

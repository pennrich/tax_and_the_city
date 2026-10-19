// DB에 한 번에 기록할 multi-path update 객체를 만드는 순수 함수들.
// 키는 루트 기준 절대 경로라서 update(ref(db), obj) 한 번으로 쓸 수 있다.
import { isCorrect, parseAccepted } from "./grading.js";
import { judgeTeam } from "./judge.js";
import { assignPieces, isCoopCorrect } from "./coop.js";
import { applyOutcome, rankTeams } from "./money.js";
import { wealthTier } from "./tier.js";
import { filledMembers } from "./quizModel.js";

export const COOP_PROMPT = "협력 문항: 팀원과 문장 순서를 맞추세요!";
const CIRCLED = ["①", "②", "③", "④", "⑤"];

export function buildStartGame({ code, uid, draft, now }) {
  const g = `games/${code}`;
  const teams = {};
  const balances = {};
  for (const [t, team] of Object.entries(draft.teams)) {
    teams[t] = { name: team.name.trim(), members: filledMembers(team) };
    balances[t] = draft.startMoney;
  }
  return {
    [`${g}/meta`]: {
      name: draft.name.trim(), teacherUid: uid, status: "lobby", startMoney: draft.startMoney,
      questionCount: draft.questions.length, createdAt: now,
    },
    [`${g}/teams`]: teams,
    [`${g}/balances`]: balances,
    [`teachers/${uid}/keys/${code}`]: { questions: draft.questions },
    [`teachers/${uid}/activeGame`]: code,
  };
}

export function buildOpenQuestion({ code, uid, q, question, serverNow, present = {}, rand = Math.random }) {
  const g = `games/${code}`;
  const coop = question.type === "coop";
  const updates = {
    [`${g}/current`]: {
      q,
      text: coop ? COOP_PROMPT : question.text,
      type: question.type,
      choices: question.type === "choice" ? question.choices : null,
      endsAt: serverNow + question.seconds * 1000,
      phase: "open",
    },
    [`${g}/played/${q}`]: true,
  };
  if (!coop) return { updates, coopKey: null };

  const coopKey = {};
  for (const [t, ids] of Object.entries(present)) {
    if (!ids.length) continue;
    const { pieces, key } = assignPieces(question.text, ids, rand);
    coopKey[t] = key;
    updates[`${g}/pieceCount/${q}/${t}`] = Math.max(2, ids.length);
    for (const m of ids) {
      updates[`${g}/pieces/${q}/${t}/${m}`] = pieces[m];
      updates[`teachers/${uid}/keys/${code}/coop/${q}/${t}/${m}`] = key[m];
    }
  }
  return { updates, coopKey };
}

export function answerText(question) {
  if (question.type === "choice") return `${CIRCLED[question.answer]} ${question.choices[question.answer]}`;
  if (question.type === "text") return parseAccepted(question.acceptedRaw).join(" / ");
  return question.text.trim();
}

export function buildReveal({ code, q, question, teams, answers = {}, presence = {}, balances, startMoney, now, alreadyRevealed, coopKey = {} }) {
  if (alreadyRevealed) return null;
  const g = `games/${code}`;
  const coop = question.type === "coop";
  const updates = {
    [`${g}/reveal/${q}`]: { answerText: answerText(question) },
    [`${g}/current/phase`]: "revealed",
  };
  const results = {};

  for (const [t, team] of Object.entries(teams)) {
    const memberIds = Object.keys(team.members ?? {});
    const key = coopKey?.[t] ?? {};
    const outcome = judgeTeam({
      memberIds,
      answers: answers[t] ?? {},
      presence: presence[t] ?? {},
      now,
      isMemberCorrect: coop ? (m, v) => isCoopCorrect(key[m], v) : (m, v) => isCorrect(question, v),
      excluded: coop ? memberIds.filter((m) => !key[m]) : [],
    });
    const { balance, delta } = applyOutcome(balances[t] ?? 0, outcome, question);
    const result = { outcome, delta, balance, tier: wealthTier(balance, startMoney) };
    if (coop) result.key = key;
    results[t] = result;
    updates[`${g}/results/${q}/${t}`] = result;
    updates[`${g}/balances/${t}`] = balance;
  }
  return { updates, results };
}

export function buildEnd({ code, uid, balances }) {
  const g = `games/${code}`;
  const updates = {
    [`${g}/meta/status`]: "ended",
    [`${g}/current`]: null,
    [`teachers/${uid}/activeGame`]: null,
  };
  for (const { t, rank, balance } of rankTeams(balances)) updates[`${g}/final/${t}`] = { rank, balance };
  return updates;
}

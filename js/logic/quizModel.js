// 게임 초안(팀·시작 금액·문항) 모델과 검증.
import { parseAccepted } from "./grading.js";
import { wordsOf } from "./coop.js";

export const TEAM_IDS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];
export const MEMBER_IDS = ["m1", "m2", "m3", "m4", "m5"];

export function blankQuestion() {
  return { type: "choice", text: "", choices: ["", "", "", ""], answer: null, acceptedRaw: "", reward: 1000, tax: 500, seconds: 30 };
}

export function resizeQuestions(qs, n) {
  const out = qs.slice(0, n);
  while (out.length < n) out.push(blankQuestion());
  return out;
}

export function blankDraft() {
  const teams = {};
  TEAM_IDS.forEach((t, i) => {
    teams[t] = { name: `${i + 1}팀`, members: Object.fromEntries(MEMBER_IDS.map((m) => [m, ""])) };
  });
  return { name: "", startMoney: 10000, teams, questions: [blankQuestion()] };
}

const asArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

export function normalizeQuestion(q = {}) {
  const base = blankQuestion();
  const choices = asArray(q.choices);
  return { ...base, ...q, choices: choices.length ? choices : base.choices, acceptedRaw: q.acceptedRaw ?? "", answer: q.answer ?? null };
}

// Firebase는 빈 배열·빈 객체를 저장하지 않으므로 읽어 온 초안을 원래 모양으로 되돌린다.
export function normalizeDraft(d = {}) {
  const blank = blankDraft();
  const teams = {};
  for (const t of TEAM_IDS) {
    const src = d.teams?.[t] ?? {};
    teams[t] = { name: src.name ?? blank.teams[t].name, members: { ...blank.teams[t].members, ...(src.members ?? {}) } };
  }
  const questions = asArray(d.questions).map(normalizeQuestion);
  return { ...blank, ...d, teams, questions: questions.length ? questions : blank.questions };
}

// 채워진 칸만 m1부터 다시 번호를 매긴다. 맨 먼저 입력된 팀원(m1)이 팀장이다.
export function filledMembers(team) {
  const names = MEMBER_IDS.map((m) => (team.members?.[m] ?? "").trim()).filter((n) => n !== "");
  return Object.fromEntries(names.map((n, i) => [MEMBER_IDS[i], n]));
}

const isWholeAtLeast = (v, min) => Number.isInteger(v) && v >= min;

function validateQuestion(q, n) {
  const errs = [];
  const p = `${n}번 문항: `;
  if (q.type === "coop") {
    if (wordsOf(q.text).length < 5) errs.push(`${p}협력형 문장은 5단어 이상이어야 해요`);
  } else {
    if ((q.text ?? "").trim() === "") errs.push(`${p}문제를 입력하세요`);
  }
  if (q.type === "choice") {
    const choices = q.choices ?? [];
    if (choices.length < 2 || choices.length > 5) errs.push(`${p}보기는 2~5개예요`);
    if (choices.some((c) => (c ?? "").trim() === "")) errs.push(`${p}빈 보기를 채우거나 지우세요`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= choices.length) errs.push(`${p}정답을 고르세요`);
  }
  if (q.type === "text" && parseAccepted(q.acceptedRaw).length === 0) errs.push(`${p}정답을 입력하세요`);
  if (!isWholeAtLeast(q.reward, 0) || !isWholeAtLeast(q.tax, 0)) errs.push(`${p}상금과 세금은 0 이상의 정수예요`);
  if (!Number.isInteger(q.seconds) || q.seconds < 5 || q.seconds > 300) errs.push(`${p}제한 시간은 5~300초예요`);
  return errs;
}

export function validateDraft(d) {
  const errs = [];
  if ((d.name ?? "").trim() === "") errs.push("게임 이름을 입력하세요");
  if (!isWholeAtLeast(d.startMoney, 0)) errs.push("시작 금액은 0 이상의 정수예요");
  TEAM_IDS.forEach((t, i) => {
    const team = d.teams?.[t];
    const label = `${i + 1}팀: `;
    if (!team || (team.name ?? "").trim() === "") errs.push(`${label}팀 이름을 입력하세요`);
    const names = Object.values(filledMembers(team ?? {}));
    if (names.length < 2 || names.length > 5) errs.push(`${label}팀원은 2~5명이어야 해요`);
    if (new Set(names).size !== names.length) errs.push(`${label}같은 이름의 팀원이 있어요`);
  });
  if (!d.questions?.length) errs.push("문항을 1개 이상 만드세요");
  (d.questions ?? []).forEach((q, i) => errs.push(...validateQuestion(q, i + 1)));
  return errs;
}

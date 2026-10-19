// 팀 판정: 판정 대상 = 답을 낸 팀원 + 마감 시점에 접속 중인 팀원.

export const GRACE_MS = 5000;

export function isPresent(p, now, graceMs = GRACE_MS) {
  if (!p) return false;
  if (p.online) return true;
  return now - p.lastChanged < graceMs;
}

export function judgeTeam({ memberIds, answers = {}, presence = {}, now, isMemberCorrect, excluded = [] }) {
  const eligible = memberIds.filter(
    (m) => !excluded.includes(m) && (answers[m] !== undefined || isPresent(presence[m], now)),
  );
  if (eligible.length === 0) return "none";
  const allRight = eligible.every((m) => answers[m] !== undefined && isMemberCorrect(m, answers[m].value));
  return allRight ? "correct" : "wrong";
}

// 팀 판정: 판정 대상 = 답을 낸 팀원 + 마감 시점에 접속 중인 팀원.

export const GRACE_MS = 5000;
const SKEW_MS = 1000; // 기기와 서버 시계 추정 오차

// now 시점에 접속 중이었는가. now가 과거(마감 시각)여도 맞게 판단한다:
// 그 뒤에 접속한 학생은 아니고, 그 뒤에 끊긴 학생은 맞다.
export function isPresent(p, now, graceMs = GRACE_MS) {
  if (!p) return false;
  if (p.online) return p.lastChanged <= now + SKEW_MS;
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

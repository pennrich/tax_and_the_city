// 채점: 객관식은 보기 번호, 주관식은 공백·대소문자를 무시한 완전 일치.

export function normalizeAnswer(s) {
  return String(s ?? "").replace(/[\s　 ]/g, "").toLowerCase();
}

export function parseAccepted(raw) {
  return String(raw ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}

export function isCorrect(q, value) {
  if (value === undefined || value === null) return false;
  if (q.type === "choice") return value === q.answer;
  const given = normalizeAnswer(value);
  if (given === "") return false;
  return parseAccepted(q.acceptedRaw).some((a) => normalizeAnswer(a) === given);
}

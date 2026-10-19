// 협력형 문항: 문장을 팀원 수만큼 연속 조각으로 자르고 무작위로 나눠 준다.

export function wordsOf(text) {
  return String(text ?? "")
    .split(/[\s　 ]+/)
    .filter((w) => w !== "");
}

// 덩어리별 단어 수 차이는 최대 1, 남는 단어는 앞 조각부터 하나씩.
export function splitSentence(text, n) {
  const words = wordsOf(text);
  const size = Math.floor(words.length / n);
  const extra = words.length % n;
  const parts = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const len = size + (k < extra ? 1 : 0);
    parts.push(words.slice(i, i + len).join(" "));
    i += len;
  }
  return parts;
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignPieces(text, presentIds, rand = Math.random) {
  const pieces = {};
  const key = {};
  if (presentIds.length === 0) return { pieces, key };

  const count = Math.max(2, presentIds.length);
  const parts = splitSentence(text, count);
  const order = shuffle(
    parts.map((_, i) => i + 1),
    rand,
  );

  if (presentIds.length === 1) {
    const m = presentIds[0];
    key[m] = order;
    pieces[m] = order.map((pos) => parts[pos - 1]);
    return { pieces, key };
  }

  presentIds.forEach((m, i) => {
    key[m] = [order[i]];
    pieces[m] = [parts[order[i] - 1]];
  });
  return { pieces, key };
}

export function isCoopCorrect(key, value) {
  if (!Array.isArray(key) || !Array.isArray(value)) return false;
  if (key.length !== value.length) return false;
  return key.every((pos, i) => Number(value[i]) === pos);
}

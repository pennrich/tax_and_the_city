// 입장 코드: 헷갈리는 글자(I, O, 0, 1) 없이 6자리.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeGameCode(rand = Math.random) {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return code;
}

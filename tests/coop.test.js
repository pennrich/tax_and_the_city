import { describe, it, expect } from "vitest";
import { wordsOf, splitSentence, assignPieces, isCoopCorrect } from "../js/logic/coop.js";

function seededRand(seed = 42) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const S = "세금은 국가가 필요한 돈을 국민에게서 거두는 것이다"; // 7단어

describe("wordsOf", () => {
  it("splits on any whitespace and drops empty tokens", () => {
    expect(wordsOf(" a　b  c ")).toEqual(["a", "b", "c"]);
  });
});

describe("splitSentence", () => {
  it("gives earlier pieces the extra words", () => {
    expect(splitSentence(S, 3)).toEqual(["세금은 국가가 필요한", "돈을 국민에게서", "거두는 것이다"]);
  });

  it("splits into five pieces", () => {
    expect(splitSentence(S, 5)).toEqual(["세금은 국가가", "필요한 돈을", "국민에게서", "거두는", "것이다"]);
  });
});

describe("assignPieces", () => {
  it("hands each present member one piece and the key points at its true position", () => {
    const { pieces, key } = assignPieces(S, ["m1", "m2", "m3"], seededRand());
    const parts = splitSentence(S, 3);
    const positions = [];
    for (const m of ["m1", "m2", "m3"]) {
      expect(pieces[m]).toHaveLength(1);
      expect(parts[key[m][0] - 1]).toBe(pieces[m][0]);
      positions.push(key[m][0]);
    }
    expect(positions.sort()).toEqual([1, 2, 3]);
  });

  it("gives a lone member both of two pieces", () => {
    const solo = assignPieces(S, ["m2"], seededRand(7));
    const parts = splitSentence(S, 2);
    expect(solo.pieces.m2).toHaveLength(2);
    expect([...solo.key.m2].sort()).toEqual([1, 2]);
    solo.key.m2.forEach((pos, i) => expect(parts[pos - 1]).toBe(solo.pieces.m2[i]));
  });

  it("assigns nothing when nobody is present", () => {
    expect(assignPieces(S, [], seededRand())).toEqual({ pieces: {}, key: {} });
  });
});

describe("isCoopCorrect", () => {
  it("requires every position to match", () => {
    expect(isCoopCorrect([2], [2])).toBe(true);
    expect(isCoopCorrect([1, 2], [2, 1])).toBe(false);
  });

  it("rejects a missing answer", () => {
    expect(isCoopCorrect([1], undefined)).toBe(false);
  });
});

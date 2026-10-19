import { describe, it, expect } from "vitest";
import { normalizeAnswer, parseAccepted, isCorrect } from "../js/logic/grading.js";

describe("normalizeAnswer", () => {
  it("removes every kind of whitespace, including full-width space and NBSP", () => {
    expect(normalizeAnswer(" 부가 가치세　 \n")).toBe("부가가치세");
  });

  it("lowercases latin letters", () => {
    expect(normalizeAnswer("VAT Tax")).toBe("vattax");
  });
});

describe("parseAccepted", () => {
  it("splits on commas and drops empty entries", () => {
    expect(parseAccepted("부가가치세, 부가세 ,, ")).toEqual(["부가가치세", "부가세"]);
  });
});

describe("isCorrect", () => {
  const tq = { type: "text", acceptedRaw: "부가가치세, 부가세" };
  const cq = { type: "choice", answer: 1 };

  it("accepts any accepted text answer ignoring spaces", () => {
    expect(isCorrect(tq, "부가 세")).toBe(true);
  });

  it("rejects a spelling mistake", () => {
    expect(isCorrect(tq, "부가가치새")).toBe(false);
  });

  it("rejects a missing answer", () => {
    expect(isCorrect(tq, undefined)).toBe(false);
  });

  it("matches the choice index", () => {
    expect(isCorrect(cq, 1)).toBe(true);
    expect(isCorrect(cq, 0)).toBe(false);
  });
});

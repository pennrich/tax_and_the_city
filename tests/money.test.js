import { describe, it, expect } from "vitest";
import { applyOutcome, formatMoney, rankTeams } from "../js/logic/money.js";

const Q = { reward: 1000, tax: 500 };

describe("applyOutcome", () => {
  it("adds the reward for a correct team", () => {
    expect(applyOutcome(10000, "correct", Q)).toEqual({ balance: 11000, delta: 1000 });
  });

  it("takes the tax for a wrong team, even into debt", () => {
    expect(applyOutcome(200, "wrong", Q)).toEqual({ balance: -300, delta: -500 });
  });

  it("changes nothing for none", () => {
    expect(applyOutcome(200, "none", Q)).toEqual({ balance: 200, delta: 0 });
  });
});

describe("formatMoney", () => {
  it("formats positives and zero with won", () => {
    expect(formatMoney(12000)).toBe("12,000원");
    expect(formatMoney(0)).toBe("0원");
  });

  it("writes negatives as debt", () => {
    expect(formatMoney(-3000)).toBe("부채 3,000원");
  });
});

describe("rankTeams", () => {
  it("uses competition ranking with ties ordered by team id", () => {
    expect(rankTeams({ t1: 500, t2: 900, t3: 500, t4: -100 }).map((r) => [r.t, r.rank])).toEqual([
      ["t2", 1],
      ["t1", 2],
      ["t3", 2],
      ["t4", 4],
    ]);
  });
});

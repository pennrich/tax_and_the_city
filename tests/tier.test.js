import { describe, it, expect } from "vitest";
import { wealthTier } from "../js/logic/tier.js";

describe("wealthTier", () => {
  it("maps balance to tier relative to the start money", () => {
    [[15000, 1], [14999, 2], [10000, 2], [9999, 3], [5000, 3], [4999, 4], [0, 4], [-1, 5]].forEach(([b, t]) =>
      expect(wealthTier(b, 10000)).toBe(t),
    );
  });

  it("falls back to 2 or 5 when the start money is zero", () => {
    expect(wealthTier(0, 0)).toBe(2);
    expect(wealthTier(-1, 0)).toBe(5);
  });
});

import { describe, it, expect } from "vitest";
import { makeGameCode } from "../js/logic/gameCode.js";

describe("makeGameCode", () => {
  it("makes six characters without look-alike letters", () => {
    expect(makeGameCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});

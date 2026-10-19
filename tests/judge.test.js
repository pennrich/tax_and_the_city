import { describe, it, expect } from "vitest";
import { isPresent, judgeTeam } from "../js/logic/judge.js";
import { isCorrect } from "../js/logic/grading.js";

const NOW = 100000;
const on = { online: true, lastChanged: 0 };
const offOld = { online: false, lastChanged: 90000 }; // 10초 전 끊김
const offNew = { online: false, lastChanged: 97000 }; // 3초 전 끊김 → 유예

describe("isPresent", () => {
  it("treats a recent disconnect as still present", () => {
    expect(isPresent(offNew, NOW)).toBe(true);
  });

  it("treats an old disconnect as absent", () => {
    expect(isPresent(offOld, NOW)).toBe(false);
  });

  it("treats a student who never joined as absent", () => {
    expect(isPresent(undefined, NOW)).toBe(false);
  });

  it("treats an online student as present", () => {
    expect(isPresent(on, NOW)).toBe(true);
  });
});

describe("judgeTeam", () => {
  const cq = { type: "choice", answer: 1 };
  const isMemberCorrect = (m, v) => isCorrect(cq, v);
  const base = { memberIds: ["m1", "m2"], now: NOW, isMemberCorrect };

  it("is correct when every present member answered correctly", () => {
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 }, m2: { value: 1 } }, presence: { m1: on, m2: on } })).toBe("correct");
  });

  it("is wrong when a connected member did not submit", () => {
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 } }, presence: { m1: on, m2: on } })).toBe("wrong");
  });

  it("excludes a disconnected member who did not submit", () => {
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 } }, presence: { m1: on, m2: offOld } })).toBe("correct");
  });

  it("includes a disconnected member who did submit", () => {
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 }, m2: { value: 0 } }, presence: { m1: on, m2: offOld } })).toBe("wrong");
  });

  it("is none when nobody is eligible", () => {
    expect(judgeTeam({ ...base, answers: {}, presence: {} })).toBe("none");
  });

  it("drops excluded members even when they are connected", () => {
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 } }, presence: { m1: on, m2: on }, excluded: ["m2"] })).toBe("correct");
  });
});

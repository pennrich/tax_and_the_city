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

describe("judging at the deadline (not at reveal time)", () => {
  const cq = { type: "choice", answer: 1 };
  const isMemberCorrect = (m, v) => isCorrect(cq, v);
  const DEADLINE = 100000;
  const base = { memberIds: ["m1", "m2"], now: DEADLINE, isMemberCorrect };

  it("still counts a non-submitter who closed the tablet after the deadline", () => {
    // 마감 3초 뒤 끊고, 교사는 20초 뒤 공개 → 그래도 마감 시점엔 접속 중이었다
    const presence = { m1: { online: true, lastChanged: 0 }, m2: { online: false, lastChanged: DEADLINE + 3000 } };
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 } }, presence })).toBe("wrong");
  });

  it("ignores a member who connected only after the deadline", () => {
    const presence = { m1: { online: true, lastChanged: 0 }, m2: { online: true, lastChanged: DEADLINE + 2000 } };
    expect(judgeTeam({ ...base, answers: { m1: { value: 1 } }, presence })).toBe("correct");
  });
});

describe("isPresent clock tolerance", () => {
  it("treats a student who connected a moment ago as present despite clock estimate error", () => {
    expect(isPresent({ online: true, lastChanged: 100300 }, 100000)).toBe(true);
  });
});

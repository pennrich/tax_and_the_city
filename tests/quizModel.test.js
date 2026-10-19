import { describe, it, expect } from "vitest";
import { blankQuestion, resizeQuestions, blankDraft, validateDraft, filledMembers } from "../js/logic/quizModel.js";

function goodDraft() {
  const d = blankDraft();
  d.name = "세금 퀴즈 1차";
  d.startMoney = 10000;
  Object.values(d.teams).forEach((team, i) => {
    team.members.m1 = `학생${i}a`;
    team.members.m2 = `학생${i}b`;
  });
  d.questions = [
    { ...blankQuestion(), text: "누진세는?", choices: ["비례세", "누진세"], answer: 1 },
    { ...blankQuestion(), type: "text", text: "물건 값에 붙는 세금은?", acceptedRaw: "부가가치세, 부가세" },
    { ...blankQuestion(), type: "coop", text: "세금은 국가가 필요한 돈을 국민에게서 거두는 것이다" },
  ];
  return d;
}

describe("blankQuestion", () => {
  it("uses the default reward, tax, seconds and four empty choices", () => {
    expect(blankQuestion()).toEqual({
      type: "choice", text: "", choices: ["", "", "", ""], answer: null, acceptedRaw: "", reward: 1000, tax: 500, seconds: 30,
    });
  });
});

describe("resizeQuestions", () => {
  const q1 = { ...blankQuestion(), text: "1" };
  const q2 = { ...blankQuestion(), text: "2" };
  const q3 = { ...blankQuestion(), text: "3" };

  it("keeps existing questions and appends blanks", () => {
    const r = resizeQuestions([q1], 3);
    expect(r).toHaveLength(3);
    expect(r[0]).toBe(q1);
    expect(r[2]).toEqual(blankQuestion());
  });

  it("drops questions from the end", () => {
    expect(resizeQuestions([q1, q2, q3], 1)).toEqual([q1]);
  });
});

describe("blankDraft", () => {
  it("has seven teams named 1팀..7팀 with five empty member slots", () => {
    const d = blankDraft();
    expect(Object.keys(d.teams)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7"]);
    expect(d.teams.t3.name).toBe("3팀");
    expect(d.teams.t3.members).toEqual({ m1: "", m2: "", m3: "", m4: "", m5: "" });
    expect(d.questions).toHaveLength(1);
  });
});

describe("validateDraft", () => {
  it("passes a complete draft", () => {
    expect(validateDraft(goodDraft())).toEqual([]);
  });

  it("asks for a game name", () => {
    expect(validateDraft(blankDraft())).toContain("게임 이름을 입력하세요");
  });

  it("rejects a team with one member", () => {
    const d = goodDraft();
    d.teams.t3.members.m2 = "";
    expect(validateDraft(d)).toContain("3팀: 팀원은 2~5명이어야 해요");
  });

  it("rejects duplicate names in a team", () => {
    const d = goodDraft();
    d.teams.t3.members.m2 = d.teams.t3.members.m1;
    expect(validateDraft(d)).toContain("3팀: 같은 이름의 팀원이 있어요");
  });

  it("rejects a choice question without an answer", () => {
    const d = goodDraft();
    d.questions[1] = { ...blankQuestion(), text: "Q", choices: ["a", "b"], answer: null };
    expect(validateDraft(d)).toContain("2번 문항: 정답을 고르세요");
  });

  it("rejects a text question without accepted answers", () => {
    const d = goodDraft();
    d.questions[1].acceptedRaw = " , ";
    expect(validateDraft(d)).toContain("2번 문항: 정답을 입력하세요");
  });

  it("rejects a coop sentence shorter than five words", () => {
    const d = goodDraft();
    d.questions[1] = { ...blankQuestion(), type: "coop", text: "세금은 국가가 걷는 돈" };
    expect(validateDraft(d)).toContain("2번 문항: 협력형 문장은 5단어 이상이어야 해요");
  });

  it("rejects seconds outside 5..300", () => {
    const d = goodDraft();
    d.questions[1].seconds = 4;
    expect(validateDraft(d)).toContain("2번 문항: 제한 시간은 5~300초예요");
  });

  it("rejects a blank choice", () => {
    const d = goodDraft();
    d.questions[0].choices = ["비례세", "누진세", ""];
    expect(validateDraft(d)).toContain("1번 문항: 빈 보기를 채우거나 지우세요");
  });
});

describe("filledMembers", () => {
  it("renumbers filled slots from m1 so the first entered member leads", () => {
    expect(filledMembers({ members: { m1: "", m2: "가", m3: "", m4: " 나 ", m5: "" } })).toEqual({ m1: "가", m2: "나" });
  });
});

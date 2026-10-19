import { describe, it, expect } from "vitest";
import { buildStartGame, buildOpenQuestion, buildReveal, buildEnd, answerText, buildClaimAvatar, buildStartPlaying } from "../js/logic/updates.js";
import { blankDraft } from "../js/logic/quizModel.js";
import { rankTeams } from "../js/logic/money.js";

const CODE = "ABC234";
const CHOICE = { type: "choice", text: "Q", choices: ["a", "b"], answer: 1, acceptedRaw: "", reward: 1000, tax: 500, seconds: 30 };
const SENTENCE = "세금은 국가가 필요한 돈을 국민에게서 거두는 것이다";
const COOP = { type: "coop", text: SENTENCE, choices: [], answer: null, acceptedRaw: "", reward: 1000, tax: 500, seconds: 60 };
const on = { online: true, lastChanged: 0 };

describe("buildStartGame", () => {
  it("creates meta, teams with filled members only, balances and the private key", () => {
    const draft = blankDraft();
    draft.name = "게임";
    draft.startMoney = 10000;
    draft.teams.t1.members.m1 = "김민수";
    draft.teams.t1.members.m2 = "이서연";
    draft.questions = [CHOICE];
    const u = buildStartGame({ code: CODE, uid: "U", draft, now: 5 });
    expect(u[`games/${CODE}/meta`]).toEqual({ name: "게임", teacherUid: "U", status: "lobby", startMoney: 10000, questionCount: 1, createdAt: 5 });
    expect(u[`games/${CODE}/teams`].t1).toEqual({ name: "1팀", members: { m1: "김민수", m2: "이서연" } });
    expect(u[`games/${CODE}/balances`].t7).toBe(10000);
    expect(u[`teachers/U/keys/${CODE}`]).toEqual({ questions: [CHOICE] });
    expect(u["teachers/U/activeGame"]).toBe(CODE);
  });
});

describe("buildOpenQuestion", () => {
  it("publishes the question without the answer", () => {
    const u = buildOpenQuestion({ code: CODE, uid: "U", q: 2, question: CHOICE, serverNow: 1000, present: {} });
    expect(u.updates[`games/${CODE}/current`]).toEqual({ q: 2, text: "Q", type: "choice", choices: ["a", "b"], endsAt: 31000, phase: "open" });
    expect(u.updates[`games/${CODE}/played/2`]).toBe(true);
    expect(JSON.stringify(u.updates)).not.toContain("answer");
    expect(JSON.stringify(u.updates)).not.toContain("accepted");
    expect(u.coopKey).toBeNull();
  });

  it("deals coop pieces per team and keeps the key on the teacher side only", () => {
    const u = buildOpenQuestion({
      code: CODE, uid: "U", q: 2, question: COOP, serverNow: 1000,
      present: { t1: ["m1", "m2", "m3"], t2: ["m2"], t3: [] },
    });
    const cur = u.updates[`games/${CODE}/current`];
    expect(cur.text).toBe("협력 문항: 팀원과 문장 순서를 맞추세요!");
    expect(cur.choices).toBeNull();
    expect(JSON.stringify(cur)).not.toContain("세금은");
    expect(Object.keys(u.updates).filter((k) => k.startsWith(`games/${CODE}/pieces/2/t1/`))).toHaveLength(3);
    expect(u.updates[`games/${CODE}/pieces/2/t2/m2`]).toHaveLength(2);
    expect(u.updates[`games/${CODE}/pieceCount/2/t1`]).toBe(3);
    expect(u.updates[`games/${CODE}/pieceCount/2/t2`]).toBe(2);
    expect(Object.keys(u.updates).some((k) => k.includes("/t3/") || k.endsWith("/t3"))).toBe(false);
    expect(u.updates[`teachers/U/keys/${CODE}/coop/2/t1/m1`]).toHaveLength(1);
    const gameSide = Object.entries(u.updates).filter(([k]) => k.startsWith("games/"));
    expect(gameSide.some(([k]) => k.includes("coop"))).toBe(false);
    expect(u.coopKey.t1.m1).toEqual(u.updates[`teachers/U/keys/${CODE}/coop/2/t1/m1`]);
  });
});

describe("buildReveal", () => {
  const teams = {
    t1: { name: "1팀", members: { m1: "a", m2: "b" } },
    t2: { name: "2팀", members: { m1: "c", m2: "d" } },
    t3: { name: "3팀", members: { m1: "e" } },
  };

  it("pays the reward, collects the tax into debt and skips teams with nobody eligible", () => {
    const r = buildReveal({
      code: CODE, q: 2, question: CHOICE, teams, startMoney: 10000, now: 100000, alreadyRevealed: false,
      answers: { t1: { m1: { value: 1 }, m2: { value: 1 } }, t2: { m1: { value: 1 }, m2: { value: 0 } } },
      presence: { t1: { m1: on, m2: on }, t2: { m1: on, m2: on } },
      balances: { t1: 10000, t2: 200, t3: 10000 },
    });
    expect(r.results.t1).toEqual({ outcome: "correct", delta: 1000, balance: 11000, tier: 2 });
    expect(r.updates[`games/${CODE}/results/2/t2`]).toEqual({ outcome: "wrong", delta: -500, balance: -300, tier: 5 });
    expect(r.updates[`games/${CODE}/balances/t2`]).toBe(-300);
    expect(r.results.t3).toEqual({ outcome: "none", delta: 0, balance: 10000, tier: 2 });
    expect(r.updates[`games/${CODE}/reveal/2`]).toEqual({ answerText: "② b" });
    expect(r.updates[`games/${CODE}/current/phase`]).toBe("revealed");
  });

  it("returns null when the question was already revealed", () => {
    expect(buildReveal({ code: CODE, q: 2, question: CHOICE, teams, startMoney: 0, now: 0, alreadyRevealed: true, answers: {}, presence: {}, balances: {} })).toBeNull();
  });

  it("grades coop by the key and ignores a member who joined after the pieces were dealt", () => {
    const team = { t1: { name: "1팀", members: { m1: "a", m2: "b", m3: "late" } } };
    const r = buildReveal({
      code: CODE, q: 3, question: COOP, teams: team, startMoney: 10000, now: 100000, alreadyRevealed: false,
      coopKey: { t1: { m1: [2], m2: [1] } },
      answers: { t1: { m1: { value: [2] }, m2: { value: [1] } } },
      presence: { t1: { m1: on, m2: on, m3: on } },
      balances: { t1: 10000 },
    });
    expect(r.results.t1.outcome).toBe("correct");
    expect(r.updates[`games/${CODE}/results/3/t1`].key).toEqual({ m1: [2], m2: [1] });
  });
});

describe("answerText", () => {
  it("writes a choice answer with a circled number", () => {
    expect(answerText({ type: "choice", choices: ["비례세", "누진세"], answer: 1 })).toBe("② 누진세");
  });

  it("joins accepted text answers", () => {
    expect(answerText({ type: "text", acceptedRaw: "부가가치세, 부가세" })).toBe("부가가치세 / 부가세");
  });

  it("shows the whole coop sentence", () => {
    expect(answerText(COOP)).toBe(SENTENCE);
  });
});

describe("buildEnd", () => {
  it("writes final ranks and closes the game", () => {
    const balances = { t1: 500, t2: 900, t3: -100 };
    const u = buildEnd({ code: CODE, uid: "U", balances });
    rankTeams(balances).forEach(({ t, rank, balance }) => expect(u[`games/${CODE}/final/${t}`]).toEqual({ rank, balance }));
    expect(u[`games/${CODE}/meta/status`]).toBe("ended");
    expect(u[`games/${CODE}/current`]).toBeNull();
    expect(u["teachers/U/activeGame"]).toBeNull();
  });
});

describe("buildClaimAvatar", () => {
  it("claims the new avatar, sets the team avatar and frees the previous one", () => {
    expect(buildClaimAvatar({ code: "C", t: "t2", gender: "f", job: "taxi", previous: { gender: "m", job: "police" } })).toEqual({
      "games/C/avatarClaims/f_taxi": "t2",
      "games/C/teamAvatar/t2": { gender: "f", job: "taxi" },
      "games/C/avatarClaims/m_police": null,
    });
  });

  it("does not free anything when re-picking the same avatar", () => {
    const u = buildClaimAvatar({ code: "C", t: "t2", gender: "f", job: "taxi", previous: { gender: "f", job: "taxi" } });
    expect(u["games/C/avatarClaims/f_taxi"]).toBe("t2");
  });
});

describe("buildStartPlaying", () => {
  it("starts the game and gives teams without an avatar distinct free ones", () => {
    const teams = { t1: {}, t2: {}, t3: {} };
    const u = buildStartPlaying({
      code: "C", teams, teamAvatar: { t1: { gender: "f", job: "banker" } }, claims: { f_banker: "t1" }, rand: () => 0,
    });
    expect(u["games/C/meta/status"]).toBe("playing");
    const a2 = u["games/C/teamAvatar/t2"];
    const a3 = u["games/C/teamAvatar/t3"];
    expect(a2).toBeTruthy();
    expect(a3).toBeTruthy();
    const k2 = `${a2.gender}_${a2.job}`;
    const k3 = `${a3.gender}_${a3.job}`;
    expect(k2).not.toBe(k3);
    expect([k2, k3]).not.toContain("f_banker");
    expect(u[`games/C/avatarClaims/${k2}`]).toBe("t2");
    expect(u["games/C/teamAvatar/t1"]).toBeUndefined();
  });
});

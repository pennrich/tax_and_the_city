import { describe, it, beforeAll, beforeEach, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { ref, get, set, update, remove } from "firebase/database";

const CODE = "ABC234";
const G = `games/${CODE}`;
let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-tax-quiz",
    database: { rules: readFileSync("database.rules.json", "utf8"), host: "127.0.0.1", port: 9000 },
  });
});

afterAll(async () => env?.cleanup());

const db = (uid) => env.authenticatedContext(uid).database();

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database()), {
      teachers: { T: { keys: { [CODE]: { questions: [{ answer: 1 }], coop: { 3: { t1: { m1: [2] } } } } } } },
      games: {
        [CODE]: {
          meta: { teacherUid: "T", status: "playing" },
          teams: { t1: { name: "1팀", members: { m1: "a", m2: "b" } }, t2: { name: "2팀", members: { m1: "c" } } },
          seats: { t1: { m1: { uid: "S1" }, m2: { uid: "S2" } }, t2: { m1: { uid: "S3" } } },
          teamAvatar: { t2: { gender: "m", job: "police" } },
          avatarClaims: { m_police: "t2" },
          uidSeat: { S1: { t: "t1", m: "m1" }, S2: { t: "t1", m: "m2" }, S3: { t: "t2", m: "m1" } },
          balances: { t1: 10000, t2: 10000 },
          current: { q: 2, type: "choice", text: "Q", endsAt: Date.now() + 60000, phase: "open" },
          answers: { 1: { t1: { m1: { value: 1, at: 1 } } } },
          pieces: { 3: { t1: { m1: ["조각A"], m2: ["조각B"] } } },
        },
      },
    });
  });
});

describe("teacher-only data", () => {
  it("hides the answer key from students", async () => {
    await assertFails(get(ref(db("S1"), `teachers/T/keys/${CODE}`)));
  });

  it("hides the coop key from students", async () => {
    await assertFails(get(ref(db("S1"), `teachers/T/keys/${CODE}/coop`)));
  });

  it("stops students writing balances", async () => {
    await assertFails(set(ref(db("S1"), `${G}/balances/t1`), 999999));
  });

  it("lets the teacher release a seat", async () => {
    await assertSucceeds(update(ref(db("T")), { [`${G}/seats/t1/m1`]: null, [`${G}/uidSeat/S1`]: null }));
  });

  it("lets a teacher create a new game", async () => {
    await assertSucceeds(set(ref(db("T2"), "games/NEW234/meta"), { teacherUid: "T2", status: "lobby" }));
  });
});

describe("balances", () => {
  it("lets a student read their own team balance", async () => {
    await assertSucceeds(get(ref(db("S1"), `${G}/balances/t1`)));
  });

  it("hides other teams' balances", async () => {
    await assertFails(get(ref(db("S1"), `${G}/balances/t2`)));
  });
});

describe("seats", () => {
  it("lets a student take an empty seat", async () => {
    await env.withSecurityRulesDisabled((ctx) => remove(ref(ctx.database(), `${G}/seats/t2/m1`)));
    await assertSucceeds(set(ref(db("S9"), `${G}/seats/t2/m1`), { uid: "S9" }));
  });

  it("refuses a seat someone else holds", async () => {
    await assertFails(set(ref(db("S9"), `${G}/seats/t1/m1`), { uid: "S9" }));
  });
});

describe("answers", () => {
  it("accepts an answer from the seat owner while open", async () => {
    await assertSucceeds(set(ref(db("S1"), `${G}/answers/2/t1/m1`), { value: 1, at: 1 }));
  });

  it("refuses overwriting a submitted answer", async () => {
    await set(ref(db("S1"), `${G}/answers/2/t1/m1`), { value: 1, at: 1 });
    await assertFails(set(ref(db("S1"), `${G}/answers/2/t1/m1`), { value: 0, at: 2 }));
  });

  it("refuses answering for someone else's seat", async () => {
    await assertFails(set(ref(db("S1"), `${G}/answers/2/t1/m2`), { value: 1, at: 1 }));
  });

  it("refuses answers after reveal", async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/current/phase`), "revealed"));
    await assertFails(set(ref(db("S1"), `${G}/answers/2/t1/m1`), { value: 1, at: 1 }));
  });

  it("refuses answers two seconds after the deadline", async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/current/endsAt`), Date.now() - 2000));
    await assertFails(set(ref(db("S1"), `${G}/answers/2/t1/m1`), { value: 1, at: 1 }));
  });

  it("lets a student read back their own answer before reveal", async () => {
    await assertSucceeds(get(ref(db("S1"), `${G}/answers/1/t1/m1`)));
  });

  it("hides teammates' answers before reveal", async () => {
    await assertFails(get(ref(db("S2"), `${G}/answers/1/t1`)));
  });

  it("shows teammates' answers after reveal", async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/reveal/1`), { answerText: "x" }));
    await assertSucceeds(get(ref(db("S2"), `${G}/answers/1/t1`)));
  });

  it("hides other teams' answers even after reveal", async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/reveal/1`), { answerText: "x" }));
    await assertFails(get(ref(db("S3"), `${G}/answers/1/t1`)));
  });
});

describe("coop pieces", () => {
  it("lets a student read their own piece", async () => {
    await assertSucceeds(get(ref(db("S1"), `${G}/pieces/3/t1/m1`)));
  });

  it("lets a teammate read the team's piece count", async () => {
    await env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/pieceCount/3/t1`), 2));
    await assertSucceeds(get(ref(db("S2"), `${G}/pieceCount/3/t1`)));
    await assertFails(get(ref(db("S3"), `${G}/pieceCount/3/t1`)));
  });

  it("hides a teammate's piece before reveal", async () => {
    await assertFails(get(ref(db("S1"), `${G}/pieces/3/t1/m2`)));
  });
});

describe("team avatar claims", () => {
  const lobby = () => env.withSecurityRulesDisabled((ctx) => set(ref(ctx.database(), `${G}/meta/status`), "lobby"));
  const claim = (uid, t, key, gender, job, extra = {}) =>
    update(ref(db(uid)), { [`${G}/avatarClaims/${key}`]: t, [`${G}/teamAvatar/${t}`]: { gender, job }, ...extra });

  it("lets a leader claim a free avatar in the lobby", async () => {
    await lobby();
    await assertSucceeds(claim("S1", "t1", "f_taxi", "f", "taxi"));
  });

  it("refuses an avatar another team holds", async () => {
    await lobby();
    await assertFails(claim("S1", "t1", "m_police", "m", "police"));
  });

  it("refuses a claim from a member who is not the leader", async () => {
    await lobby();
    await assertFails(claim("S2", "t1", "f_taxi", "f", "taxi"));
  });

  it("refuses claims once the game is playing", async () => {
    await assertFails(claim("S1", "t1", "f_taxi", "f", "taxi"));
  });

  it("lets a leader swap and free their previous avatar", async () => {
    await lobby();
    await assertSucceeds(claim("S3", "t2", "f_taxi", "f", "taxi", { [`${G}/avatarClaims/m_police`]: null }));
  });

  it("refuses deleting another team's claim", async () => {
    await lobby();
    await assertFails(set(ref(db("S1"), `${G}/avatarClaims/m_police`), null));
  });

  it("lets everyone read avatars", async () => {
    await assertSucceeds(get(ref(db("S1"), `${G}/teamAvatar`)));
    await assertSucceeds(get(ref(db("S1"), `${G}/avatarClaims`)));
  });
});

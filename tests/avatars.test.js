import { describe, it, expect } from "vitest";
import { JOBS, renderAvatar } from "../js/avatars/avatars.js";

describe("JOBS", () => {
  it("lists the eight jobs in order", () => {
    expect(JOBS.map((j) => j.id)).toEqual(["office", "doctor", "chef", "firefighter", "teacher", "programmer", "farmer", "builder"]);
    expect(JOBS[7].label).toBe("건설노동자");
  });
});

describe("renderAvatar", () => {
  it("draws every gender × job × tier combination", () => {
    for (const gender of ["f", "m"]) {
      for (const { id } of JOBS) {
        for (const tier of [1, 2, 3, 4, 5]) {
          const svg = renderAvatar({ gender, job: id, tier });
          expect(svg.startsWith("<svg")).toBe(true);
          expect(svg).toContain(`data-tier="${tier}"`);
          expect(svg).toContain(`data-job="${id}"`);
          expect(svg).toContain(`data-gender="${gender}"`);
        }
      }
    }
  });

  it("labels the bankrupt tier", () => {
    expect(renderAvatar({ gender: "m", job: "chef", tier: 5 })).toContain("파산");
    expect(renderAvatar({ gender: "m", job: "chef", tier: 2 })).not.toContain("파산");
  });

  it("falls back to office for an unknown job", () => {
    expect(renderAvatar({ gender: "f", job: "astronaut", tier: 2 })).toContain('data-job="office"');
  });

  it("uses the requested size", () => {
    expect(renderAvatar({ gender: "f", job: "doctor", tier: 1, size: 64 })).toContain('width="64"');
  });
});

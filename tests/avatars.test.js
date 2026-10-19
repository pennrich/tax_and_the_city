import { describe, it, expect } from "vitest";
import { JOBS, ALL_AVATARS, avatarKey, renderAvatar } from "../js/avatars/avatars.js";

describe("JOBS", () => {
  it("lists the eight New York jobs in order", () => {
    expect(JOBS.map((j) => j.id)).toEqual(["banker", "taxi", "police", "firefighter", "broadway", "hotdog", "builder", "designer"]);
    expect(JOBS[0].label).toBe("월스트리트 금융인");
  });

  it("offers sixteen avatars keyed by gender and job", () => {
    expect(ALL_AVATARS).toHaveLength(16);
    expect(ALL_AVATARS[0]).toEqual({ gender: "f", job: "banker" });
    expect(avatarKey("m", "taxi")).toBe("m_taxi");
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
    expect(renderAvatar({ gender: "m", job: "hotdog", tier: 5 })).toContain("파산");
    expect(renderAvatar({ gender: "m", job: "hotdog", tier: 2 })).not.toContain("파산");
  });

  it("falls back to banker for an unknown job", () => {
    expect(renderAvatar({ gender: "f", job: "astronaut", tier: 2 })).toContain('data-job="banker"');
  });

  it("uses the requested size", () => {
    expect(renderAvatar({ gender: "f", job: "police", tier: 1, size: 64 })).toContain('width="64"');
  });
});

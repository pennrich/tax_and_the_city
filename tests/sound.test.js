import { describe, it, expect } from "vitest";
import { sound } from "../js/sound.js";

describe("sound", () => {
  it("toggles mute", () => {
    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);
    sound.setMuted(false);
    expect(sound.isMuted()).toBe(false);
  });

  it("does nothing instead of throwing where Web Audio is missing", () => {
    expect(() => {
      sound.unlock();
      sound.coins();
      sound.tax();
      sound.bankrupt();
      sound.tick();
      sound.fanfare();
    }).not.toThrow();
  });
});

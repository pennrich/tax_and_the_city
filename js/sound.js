// 요란한 효과음: 외부 파일 없이 Web Audio로 합성한다. TV(교사 화면)에서만 쓴다.

const MUTE_KEY = "tq_muted";
let ctx = null;
let muted = readMuted();

function readMuted() {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function audio() {
  if (muted) return null;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function tone(ac, { type = "sine", from, to = from, start = 0, dur = 0.15, gain = 0.25 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ac, { start = 0, dur = 0.4, gain = 0.3 }) {
  const t0 = ac.currentTime + start;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  src.buffer = buf;
  src.connect(g).connect(ac.destination);
  src.start(t0);
}

function chord(ac, freqs, start, dur, type = "triangle", gain = 0.18) {
  freqs.forEach((f) => tone(ac, { type, from: f, start, dur, gain }));
}

export const sound = {
  unlock() {
    const ac = audio();
    if (ac?.state === "suspended") ac.resume();
  },

  setMuted(b) {
    muted = Boolean(b);
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* 저장 못 해도 이번 화면에서는 적용된다 */
    }
  },

  isMuted() {
    return muted;
  },

  // 동전이 쏟아지는 소리 + 상승 팡파르
  coins() {
    const ac = audio();
    if (!ac) return;
    for (let i = 0; i < 12; i++) {
      const f = 1200 + Math.random() * 1200;
      tone(ac, { from: f, to: f * 1.05, start: i * 0.04, dur: 0.12, gain: 0.2 });
    }
    chord(ac, [523, 659, 784], 0.55, 0.18);
    chord(ac, [659, 784, 988], 0.75, 0.18);
    chord(ac, [784, 988, 1319], 0.95, 0.5);
  },

  // 경고음 두 번 + 낮은 "쿵"
  tax() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { type: "square", from: 400, to: 300, start: 0, dur: 0.22, gain: 0.2 });
    tone(ac, { type: "square", from: 400, to: 300, start: 0.28, dur: 0.22, gain: 0.2 });
    tone(ac, { type: "sawtooth", from: 120, to: 50, start: 0.6, dur: 0.5, gain: 0.35 });
    noise(ac, { start: 0.6, dur: 0.25, gain: 0.25 });
  },

  // 무너지는 소리: 길게 떨어지는 음 + 와르르
  bankrupt() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { type: "sawtooth", from: 600, to: 80, start: 0, dur: 1.2, gain: 0.25 });
    tone(ac, { type: "square", from: 300, to: 40, start: 0.1, dur: 1.1, gain: 0.12 });
    noise(ac, { start: 1.1, dur: 0.7, gain: 0.4 });
  },

  // 째깍
  tick() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { type: "square", from: 1000, start: 0, dur: 0.03, gain: 0.25 });
  },

  // 시상식 팡파르
  fanfare() {
    const ac = audio();
    if (!ac) return;
    const arp = [523, 659, 784, 1047];
    for (let r = 0; r < 2; r++) arp.forEach((f, i) => tone(ac, { type: "triangle", from: f, start: r * 0.5 + i * 0.11, dur: 0.16, gain: 0.25 }));
    chord(ac, [523, 659, 784, 1047], 1.05, 1.5, "triangle", 0.15);
    noise(ac, { start: 1.05, dur: 0.3, gain: 0.15 });
  },
};

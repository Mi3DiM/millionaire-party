/**
 * Dramatic layered game SFX synthesized with WebAudio — zero assets, offline-friendly.
 * Initialized lazily on first user gesture (browser autoplay policy).
 * Toggles: `millionaire:sound` (sfx), `millionaire:music` (ambient),
 * `millionaire:intensity` = "dramatic" (default) | "calm".
 */
import * as React from "react";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicNodes: OscillatorNode[] = [];
let lastTickSecond = -1;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem("millionaire:sound") !== "off";
  } catch {
    return true;
  }
}

export function musicEnabled(): boolean {
  try {
    return localStorage.getItem("millionaire:music") === "on";
  } catch {
    return false;
  }
}

export type Intensity = "dramatic" | "calm";

export function intensity(): Intensity {
  try {
    return localStorage.getItem("millionaire:intensity") === "calm" ? "calm" : "dramatic";
  } catch {
    return "dramatic";
  }
}

function ac(): AudioContext | null {
  if (!soundEnabled()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  ac();
}

interface ToneOpts {
  freq: number;
  at?: number; // seconds from now
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
}

function tone({ freq, at = 0, dur = 0.15, type = "sine", vol = 0.5, slideTo }: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {}
}

/** Filtered-noise burst (crowd swells, impacts). */
function noise({ at = 0, dur = 0.4, vol = 0.2, freq = 1200, q = 0.8 }: { at?: number; dur?: number; vol?: number; freq?: number; q?: number }) {
  const c = ac();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  } catch {}
}

/** Pure helper (testable): countdown tick plan for remaining seconds. */
export function countdownPlan(left: number): { freq: number; critical: boolean } | null {
  if (left > 10 || left <= 0) return null;
  if (left <= 3) return { freq: 1174 + (3 - left) * 120, critical: true };
  if (left <= 5) return { freq: 987, critical: true };
  return { freq: 740 + (10 - left) * 24, critical: false };
}

export const sfx = {
  click() {
    if (intensity() === "calm") {
      tone({ freq: 660, dur: 0.05, type: "triangle", vol: 0.2 });
      return;
    }
    // Premium two-layer click: bright tick + low thump.
    tone({ freq: 880, dur: 0.045, type: "triangle", vol: 0.22 });
    tone({ freq: 220, dur: 0.07, type: "sine", vol: 0.2 });
  },
  /** Distinct tick the moment an answer option is tapped (before lock). */
  select() {
    if (intensity() === "calm") {
      tone({ freq: 740, dur: 0.05, type: "triangle", vol: 0.2 });
      return;
    }
    tone({ freq: 920, dur: 0.06, type: "triangle", vol: 0.3, slideTo: 1240 });
  },
  join() {
    tone({ freq: 523, dur: 0.1, type: "triangle", vol: 0.35 });
    tone({ freq: 784, at: 0.09, dur: 0.14, type: "triangle", vol: 0.35 });
    if (intensity() === "dramatic") tone({ freq: 1046, at: 0.18, dur: 0.16, type: "triangle", vol: 0.3 });
  },
  lock() {
    if (intensity() === "calm") {
      tone({ freq: 520, dur: 0.07, type: "triangle", vol: 0.25 });
      return;
    }
    // Satisfying mechanical "clunk": low thud + metallic ping.
    tone({ freq: 180, dur: 0.1, type: "sine", vol: 0.45, slideTo: 120 });
    tone({ freq: 1320, at: 0.02, dur: 0.09, type: "triangle", vol: 0.2 });
    noise({ dur: 0.06, vol: 0.12, freq: 3000, q: 1.5 });
  },
  /** Rising-pitch ticks across the last 10 seconds; heartbeat under 3. */
  countdownTick(left: number) {
    if (left === lastTickSecond) return;
    const plan = countdownPlan(left);
    if (!plan) return;
    lastTickSecond = left;
    if (intensity() === "calm") {
      tone({ freq: plan.freq, dur: 0.05, type: "triangle", vol: 0.18 });
      return;
    }
    tone({ freq: plan.freq, dur: plan.critical ? 0.09 : 0.06, type: "square", vol: plan.critical ? 0.26 : 0.16 });
    if (plan.critical) {
      // Heartbeat thump under the tick.
      tone({ freq: 65, dur: 0.12, type: "sine", vol: 0.4 });
      tone({ freq: 58, at: 0.14, dur: 0.14, type: "sine", vol: 0.35 });
    }
  },
  correct() {
    if (intensity() === "calm") {
      tone({ freq: 659, dur: 0.12, type: "triangle", vol: 0.35 });
      tone({ freq: 880, at: 0.1, dur: 0.18, type: "triangle", vol: 0.35 });
      return;
    }
    // Bright 5-note arpeggio + shimmer + crowd swell.
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone({ freq: f, at: i * 0.07, dur: 0.18, type: "triangle", vol: 0.38 })
    );
    tone({ freq: 2093, at: 0.3, dur: 0.3, type: "sine", vol: 0.15 });
    noise({ at: 0.1, dur: 0.7, vol: 0.1, freq: 1800, q: 0.6 });
  },
  /** Streak bonus: pitch climbs with the streak level. */
  streak(level: number) {
    const base = 660 + Math.min(level, 8) * 60;
    tone({ freq: base, dur: 0.1, type: "triangle", vol: 0.35, slideTo: base * 1.5 });
    if (intensity() === "dramatic") {
      tone({ freq: base * 2, at: 0.06, dur: 0.14, type: "sine", vol: 0.2 });
    }
  },
  wrong() {
    if (intensity() === "calm") {
      tone({ freq: 220, dur: 0.2, type: "sine", vol: 0.3, slideTo: 160 });
      return;
    }
    // Cinematic braam: stacked falling saws + impact noise.
    tone({ freq: 196, dur: 0.35, type: "sawtooth", vol: 0.3, slideTo: 98 });
    tone({ freq: 147, at: 0.05, dur: 0.4, type: "sawtooth", vol: 0.28, slideTo: 73 });
    tone({ freq: 98, at: 0.1, dur: 0.5, type: "sine", vol: 0.4, slideTo: 55 });
    noise({ dur: 0.25, vol: 0.16, freq: 300, q: 0.7 });
  },
  prizeUp() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
      tone({ freq: f, at: i * 0.07, dur: 0.16, type: "triangle", vol: 0.38 })
    );
    if (intensity() === "dramatic") noise({ at: 0.2, dur: 0.8, vol: 0.1, freq: 2000, q: 0.6 });
  },
  rankUp() {
    tone({ freq: 784, dur: 0.1, type: "sine", vol: 0.35, slideTo: 1174 });
    if (intensity() === "dramatic") tone({ freq: 1568, at: 0.08, dur: 0.14, type: "sine", vol: 0.25 });
  },
  stageHorn() {
    if (intensity() === "calm") {
      tone({ freq: 523, dur: 0.15, type: "triangle", vol: 0.3 });
      tone({ freq: 659, at: 0.12, dur: 0.2, type: "triangle", vol: 0.3 });
      return;
    }
    tone({ freq: 196, dur: 0.25, type: "sawtooth", vol: 0.22 });
    [392, 523, 659, 784].forEach((f, i) =>
      tone({ freq: f, at: 0.12 + i * 0.11, dur: 0.22, type: "triangle", vol: 0.34 })
    );
    noise({ at: 0.1, dur: 0.5, vol: 0.08, freq: 900, q: 0.7 });
  },
  victory() {
    const seq = intensity() === "calm"
      ? [523, 659, 784, 1046]
      : [523, 523, 659, 784, 784, 1046, 784, 1046, 1318];
    seq.forEach((f, i) => tone({ freq: f, at: i * 0.13, dur: 0.22, type: "triangle", vol: 0.4 }));
    if (intensity() === "dramatic") noise({ at: 0.3, dur: 1.4, vol: 0.12, freq: 1800, q: 0.5 });
  },
  defeat() {
    [392, 370, 349, 311].forEach((f, i) => tone({ freq: f, at: i * 0.16, dur: 0.24, type: "sine", vol: 0.35 }));
  },
};

export type MusicMood = "soft" | "tense" | "off";

export function startMusic(mood: MusicMood = "soft") {
  stopMusic();
  if (!musicEnabled() || mood === "off") return;
  const c = ac();
  if (!c || !master) return;
  try {
    // Ambient pad; tense mood adds a pulsing fifth + quicker shimmer.
    const freqs = mood === "tense" ? [110, 164.8, 220, 277.2] : [110, 164.8, 220];
    freqs.forEach((f) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.value = mood === "tense" ? 0.045 : 0.032;
      o.connect(g);
      g.connect(master!);
      o.start();
      musicNodes.push(o);
    });
    if (mood === "tense") {
      // Slow pulse LFO on the master of the pad via periodic gain wobble.
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 1.6;
      lg.gain.value = 0.012;
      lfo.connect(lg);
      musicNodes.push(lfo as unknown as OscillatorNode);
      lfo.start();
    }
  } catch {}
}

export function stopMusic() {
  musicNodes.forEach((o) => {
    try {
      o.stop();
    } catch {}
  });
  musicNodes = [];
}

/** Global click blips. Mount once in providers. Skips [data-no-blip] zones. */
export function useGlobalClickSfx() {
  React.useEffect(() => {
    const onDown = () => unlockAudio();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-no-blip]")) return;
      if (t.closest("button, [role='button'], select, input[type='checkbox']")) sfx.click();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("click", onClick);
    };
  }, []);
}

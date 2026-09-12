/**
 * Professional game SFX synthesized with WebAudio — zero assets, offline-friendly.
 * Initialized lazily on first user gesture (browser autoplay policy).
 * Honors `millionaire:sound` (sfx) and `millionaire:music` toggles.
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

export const sfx = {
  click() {
    tone({ freq: 660, dur: 0.06, type: "triangle", vol: 0.25 });
  },
  join() {
    tone({ freq: 523, dur: 0.1, type: "triangle", vol: 0.35 });
    tone({ freq: 784, at: 0.09, dur: 0.14, type: "triangle", vol: 0.35 });
  },
  lock() {
    tone({ freq: 440, dur: 0.08, type: "square", vol: 0.18 });
    tone({ freq: 660, at: 0.07, dur: 0.1, type: "square", vol: 0.18 });
  },
  tick() {
    tone({ freq: 880, dur: 0.05, type: "square", vol: 0.16 });
  },
  tickCritical() {
    tone({ freq: 1174, dur: 0.07, type: "square", vol: 0.24 });
  },
  /** Call every second with remaining seconds; ticks only in last 5. */
  countdownTick(left: number) {
    if (left > 5 || left <= 0 || left === lastTickSecond) return;
    lastTickSecond = left;
    if (left <= 3) this.tickCritical();
    else this.tick();
  },
  correct() {
    tone({ freq: 523, dur: 0.12, type: "triangle", vol: 0.4 });
    tone({ freq: 659, at: 0.1, dur: 0.12, type: "triangle", vol: 0.4 });
    tone({ freq: 784, at: 0.2, dur: 0.22, type: "triangle", vol: 0.45 });
  },
  wrong() {
    tone({ freq: 220, dur: 0.2, type: "sawtooth", vol: 0.25, slideTo: 140 });
    tone({ freq: 165, at: 0.16, dur: 0.3, type: "sawtooth", vol: 0.25, slideTo: 110 });
  },
  prizeUp() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, at: i * 0.08, dur: 0.16, type: "triangle", vol: 0.4 }));
  },
  rankUp() {
    tone({ freq: 784, dur: 0.1, type: "sine", vol: 0.35, slideTo: 1174 });
  },
  stageHorn() {
    tone({ freq: 392, dur: 0.18, type: "brass" as OscillatorType, vol: 0.3 });
    tone({ freq: 523, at: 0.15, dur: 0.18, type: "brass" as OscillatorType, vol: 0.3 });
    tone({ freq: 659, at: 0.3, dur: 0.3, type: "brass" as OscillatorType, vol: 0.35 });
  },
  victory() {
    [523, 523, 659, 784, 784, 1046, 784, 1046].forEach((f, i) =>
      tone({ freq: f, at: i * 0.13, dur: 0.2, type: "triangle", vol: 0.4 })
    );
  },
  defeat() {
    [392, 370, 349, 311].forEach((f, i) => tone({ freq: f, at: i * 0.16, dur: 0.24, type: "sine", vol: 0.35 }));
  },
};

export function startMusic() {
  stopMusic();
  if (!musicEnabled()) return;
  const c = ac();
  if (!c || !master) return;
  try {
    // Soft ambient pad: two detuned triangles + slow LFO. Subtle by design.
    const freqs = [110, 164.8, 220];
    freqs.forEach((f) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(master!);
      o.start();
      musicNodes.push(o);
    });
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

/** Global click blips for buttons + answer options. Mount once in providers. */
export function useGlobalClickSfx() {
  React.useEffect(() => {
    const onDown = () => unlockAudio();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
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

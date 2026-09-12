/**
 * Phone vibration (navigator.vibrate) with support + preference guards.
 * Toggle: `millionaire:haptics` (default ON). Calm intensity (`millionaire:intensity=calm`)
 * reduces everything to a single soft tap. No-ops on desktop/unsupported.
 */

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem("millionaire:haptics") !== "off";
  } catch {
    return true;
  }
}

function calmMode(): boolean {
  try {
    return localStorage.getItem("millionaire:intensity") === "calm";
  } catch {
    return false;
  }
}

export type HapticName =
  | "tap"
  | "select"
  | "lock"
  | "correct"
  | "wrong"
  | "critical"
  | "heartbeat"
  | "stage"
  | "victory"
  | "defeat";

/** Pure pattern table (testable): dramatic vs calm. */
export function patternFor(name: HapticName, calm: boolean): number[] {
  if (calm) {
    switch (name) {
      case "wrong":
        return [60];
      case "victory":
        return [40, 80, 40];
      default:
        return [15];
    }
  }
  switch (name) {
    case "tap":
      return [10];
    case "select":
      return [12];
    case "lock":
      return [25, 40, 45]; // mechanical double-thud
    case "correct":
      return [30, 50, 30, 50, 60];
    case "wrong":
      return [140]; // heavy single impact
    case "critical":
      return [40, 60, 40];
    case "heartbeat":
      return [55, 90, 70]; // lub-dub under final seconds
    case "stage":
      return [20, 60, 20, 60, 90];
    case "victory":
      return [50, 80, 50, 80, 50, 80, 200];
    case "defeat":
      return [120, 100, 120];
  }
}

function buzz(name: HapticName) {
  try {
    if (!hapticsEnabled()) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patternFor(name, calmMode()));
    }
  } catch {}
}

export const haptics = {
  tap: () => buzz("tap"),
  select: () => buzz("select"),
  lock: () => buzz("lock"),
  correct: () => buzz("correct"),
  wrong: () => buzz("wrong"),
  critical: () => buzz("critical"),
  heartbeat: () => buzz("heartbeat"),
  stage: () => buzz("stage"),
  victory: () => buzz("victory"),
  defeat: () => buzz("defeat"),
};

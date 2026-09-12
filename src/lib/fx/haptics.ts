/**
 * Phone vibration (navigator.vibrate) with support + preference guards.
 * Toggle: `millionaire:haptics` (default ON). No-ops on desktop/unsupported.
 */

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem("millionaire:haptics") !== "off";
  } catch {
    return true;
  }
}

function buzz(pattern: number | number[]) {
  try {
    if (!hapticsEnabled()) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export const haptics = {
  tap() {
    buzz(10);
  },
  lock() {
    buzz(20);
  },
  correct() {
    buzz([30, 50, 30]);
  },
  wrong() {
    buzz(80);
  },
  critical() {
    buzz([40, 60, 40]);
  },
  stage() {
    buzz([20, 60, 20, 60, 60]);
  },
  victory() {
    buzz([50, 80, 50, 80, 50, 80, 150]);
  },
  defeat() {
    buzz([120, 100, 120]);
  },
};

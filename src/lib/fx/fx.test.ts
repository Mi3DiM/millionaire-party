import { describe, it, expect } from "vitest";
import { countdownPlan } from "@/lib/fx/audio";
import { patternFor } from "@/lib/fx/haptics";

describe("fx engines", () => {
  it("countdown ticks only in last 10s with rising pitch", () => {
    expect(countdownPlan(11)).toBeNull();
    expect(countdownPlan(0)).toBeNull();
    const t10 = countdownPlan(10)!;
    const t6 = countdownPlan(6)!;
    expect(t10.critical).toBe(false);
    expect(t6.critical).toBe(false);
    expect(t6.freq).toBeGreaterThan(t10.freq);
    expect(countdownPlan(5)!.critical).toBe(true);
    expect(countdownPlan(1)!.freq).toBeGreaterThan(countdownPlan(3)!.freq);
  });

  it("calm haptics reduce to soft taps", () => {
    expect(patternFor("victory", true)).toEqual([40, 80, 40]);
    expect(patternFor("wrong", true)).toEqual([60]);
    expect(patternFor("correct", true)).toEqual([15]);
    const dramatic = patternFor("victory", false);
    expect(dramatic.length).toBeGreaterThan(patternFor("victory", true).length);
  });

  it("dramatic patterns are non-empty", () => {
    (["tap", "select", "lock", "correct", "wrong", "critical", "heartbeat", "stage", "victory", "defeat"] as const).forEach(
      (n) => expect(patternFor(n, false).length).toBeGreaterThan(0)
    );
  });
});

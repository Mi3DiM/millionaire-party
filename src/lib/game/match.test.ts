import { describe, it, expect } from "vitest";
import {
  buildStages,
  qualifiedIds,
  rankPlayers,
  scoreAfterAnswer,
  stageAt,
  stageTotal,
} from "@/lib/game/engine";
import type { Player } from "@/lib/game/types";

function p(id: string, prize: number, correct = 0): Player {
  return {
    id, name: id, avatarId: "falcon", isHost: false, ready: true,
    connection: "connected", status: "thinking", prize, level: 2,
    correctCount: correct, streak: 0, bestStreak: 0, totalResponseMs: 0, eliminated: false,
  };
}

describe("tournament stages", () => {
  it("builds 5 segments for classic tournament", () => {
    const segs = buildStages(12, "classic", true, 20);
    expect(segs.map((s) => s.kind)).toEqual(["qualifier", "speed", "semifinal", "wager", "final"]);
    expect(segs.find((s) => s.kind === "speed")!.timerSeconds).toBe(10);
    expect(stageTotal(segs)).toBe(12 + 5 + 3 + 5);
    // contiguous
    let cursor = 0;
    for (const s of segs) {
      expect(s.start).toBe(cursor);
      cursor += s.count;
    }
    expect(stageAt(segs, 0)).toBe(0);
    expect(stageAt(segs, cursor - 1)).toBe(segs.length - 1);
  });

  it("quick tournament uses smaller specials; non-tournament is single segment", () => {
    const quick = buildStages(6, "quick", true, 15);
    expect(stageTotal(quick)).toBe(6 + 3 + 2 + 3);
    const plain = buildStages(10, "classic", false, 20);
    expect(plain).toHaveLength(1);
    expect(stageTotal(plain)).toBe(10);
  });

  it("qualifies top half, min 2", () => {
    const players = [p("a", 5000, 5), p("b", 3000, 3), p("c", 1000, 2), p("d", 500, 1)];
    expect(qualifiedIds(rankPlayers(players))).toEqual(["a", "b"]);
    expect(qualifiedIds(rankPlayers([p("x", 100)]))).toEqual(["x"]);
    expect(qualifiedIds(rankPlayers([p("x", 100), p("y", 50)]))).toEqual(["x", "y"]);
  });

  it("speed stage advances two levels on correct", () => {
    const pl = { ...p("a", 0), level: 1, prize: 0 };
    const patch = scoreAfterAnswer(pl, { playerId: "a", questionId: "q", choice: 2, at: 0, responseMs: 800 }, 2, undefined, { double: true });
    expect(patch.level).toBe(3);
  });

  it("wager adds on win and subtracts on loss", () => {
    const pl = { ...p("a", 8000), level: 7, prize: 8000 };
    const win = scoreAfterAnswer(pl, { playerId: "a", questionId: "q", choice: 1, at: 0, responseMs: 800 }, 1, undefined, { wagerPct: 50 });
    expect(win.prize).toBeGreaterThan(8000);
    const lose = scoreAfterAnswer(pl, { playerId: "a", questionId: "q", choice: 0, at: 0, responseMs: 800 }, 1, undefined, { wagerPct: 50 });
    expect(lose.prize).toBe(4000);
    const ruin = scoreAfterAnswer(pl, { playerId: "a", questionId: "q", choice: 0, at: 0, responseMs: 800 }, 1, undefined, { wagerPct: 100 });
    expect(ruin.prize).toBe(0);
  });
});

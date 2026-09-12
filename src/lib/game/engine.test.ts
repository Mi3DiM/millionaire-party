import { describe, it, expect } from "vitest";
import { buildQuestionOrder, scoreAfterAnswer, rankPlayers, crowdDistribution } from "@/lib/game/engine";
import { validateRows, normalizeRow } from "@/lib/bank/validate";
import type { Player, Question } from "@/lib/game/types";

const q = (id: string, difficulty: Question["difficulty"], category = "science"): Question => ({
  id,
  question: `سؤال ${id}؟`,
  answers: ["أ", "ب", "ج", "د"],
  correctAnswer: 1,
  category,
  difficulty,
});

describe("engine", () => {
  it("builds progressive order capped at count", () => {
    const bank = [
      ...Array.from({ length: 6 }, (_, i) => q(`e${i}`, "easy")),
      ...Array.from({ length: 6 }, (_, i) => q(`m${i}`, "medium")),
      ...Array.from({ length: 6 }, (_, i) => q(`h${i}`, "hard")),
    ];
    const order = buildQuestionOrder(bank, 8, "mixed");
    expect(order).toHaveLength(8);
  });

  it("scores correct answer by advancing level", () => {
    const p = basePlayer();
    const patch = scoreAfterAnswer(p, { playerId: p.id, questionId: "q", choice: 1, at: 0, responseMs: 1200 }, 1);
    expect(patch.level).toBe(0);
    expect(patch.correctCount).toBe(1);
  });

  it("falls back to checkpoint on wrong answer", () => {
    const p = { ...basePlayer(), level: 6 };
    const patch = scoreAfterAnswer(p, { playerId: p.id, questionId: "q", choice: 0, at: 0, responseMs: 1200 }, 1);
    expect(patch.level).toBe(4);
  });

  it("ranks by prize then correct count", () => {
    const a = { ...basePlayer(), prize: 1000, correctCount: 3 };
    const b = { ...basePlayer(), prize: 2000, correctCount: 1 };
    expect(rankPlayers([a, b])[0].prize).toBe(2000);
  });

  it("crowd votes sum ~100", () => {
    const v = crowdDistribution(2);
    expect(v).toHaveLength(4);
    expect(Math.abs(v.reduce((x, y) => x + y, 0) - 100)).toBeLessThanOrEqual(2);
  });
});

describe("bank validation", () => {
  it("accepts valid rows and flags duplicates", () => {
    const rows = [
      { question: "ما عاصمة الجزائر؟", answers: ["أ", "ب", "ج", "د"], correctAnswer: 0, category: "algeria", difficulty: "easy" },
      { question: "ما عاصمة الجزائر؟", answers: ["أ", "ب", "ج", "د"], correctAnswer: 0, category: "algeria", difficulty: "easy" },
      { question: "x", answers: ["أ"], correctAnswer: 5, category: "", difficulty: "nope" },
    ];
    const { valid, reports } = validateRows(rows);
    expect(valid).toHaveLength(1);
    expect(reports.filter((r) => !r.ok)).toHaveLength(2);
  });

  it("normalizes Arabic headers", () => {
    const n = normalizeRow({ السؤال: "س؟", "الإجابة 1": "أ", "الإجابة 2": "ب", "الإجابة 3": "ج", "الإجابة 4": "د", "الإجابة الصحيحة": "ب", الفئة: "علوم", الصعوبة: "سهلة" }) as { correctAnswer: number; difficulty: string };
    expect(n.correctAnswer).toBe(1);
    expect(n.difficulty).toBe("easy");
  });
});

function basePlayer(): Player {
  return {
    id: "p1", name: "أمين", avatarId: "falcon", isHost: true, ready: true,
    connection: "connected", status: "thinking", prize: 0, level: -1,
    correctCount: 0, streak: 0, bestStreak: 0, totalResponseMs: 0, eliminated: false,
  };
}

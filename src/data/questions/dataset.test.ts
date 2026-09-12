import { describe, it, expect } from "vitest";
import { ALL_QUESTIONS, CATEGORIES } from "@/data/questions";
import { CATEGORIES as CATS } from "@/data/questions";

const DIFFS = new Set(["easy", "medium", "hard", "expert"]);
const KNOWN = new Set(CATS.map((c) => c.id));

describe("question dataset integrity", () => {
  it("contains 1500+ questions", () => {
    expect(ALL_QUESTIONS.length).toBeGreaterThanOrEqual(1500);
  });

  it("every question has valid schema", () => {
    for (const q of ALL_QUESTIONS) {
      expect(typeof q.id, q.id).toBe("string");
      expect(q.question.trim().length, q.id).toBeGreaterThan(3);
      expect(Array.isArray(q.answers) && q.answers.length === 4, q.id).toBe(true);
      for (const a of q.answers) expect(a.trim().length > 0, q.id).toBe(true);
      expect(q.correctAnswer, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswer, q.id).toBeLessThanOrEqual(3);
      expect(DIFFS.has(q.difficulty), `${q.id}:${q.difficulty}`).toBe(true);
      expect(KNOWN.has(q.category), `${q.id}:${q.category}`).toBe(true);
      expect(typeof q.explanation === "string" && q.explanation!.trim().length > 0, q.id).toBe(true);
    }
  });

  it("ids are unique and question texts are not duplicated", () => {
    const ids = new Set(ALL_QUESTIONS.map((q) => q.id));
    expect(ids.size).toBe(ALL_QUESTIONS.length);
    const texts = new Set(ALL_QUESTIONS.map((q) => q.question.trim()));
    expect(texts.size).toBe(ALL_QUESTIONS.length);
  });

  it("every category has 80+ questions", () => {
    for (const c of CATEGORIES) {
      const n = ALL_QUESTIONS.filter((q) => q.category === c.id).length;
      expect(n, c.id).toBeGreaterThanOrEqual(80);
    }
  });

  it("correct-answer positions are roughly balanced (no rigged pattern)", () => {
    const pos = [0, 0, 0, 0];
    for (const q of ALL_QUESTIONS) pos[q.correctAnswer]++;
    const total = ALL_QUESTIONS.length;
    for (let i = 0; i < 4; i++) {
      const frac = pos[i] / total;
      expect(frac, `position ${i}`).toBeGreaterThan(0.18);
      expect(frac, `position ${i}`).toBeLessThan(0.32);
    }
  });

  it("no legacy 'arab' category remains", () => {
    expect(ALL_QUESTIONS.some((q) => q.category === "arab")).toBe(false);
  });
});

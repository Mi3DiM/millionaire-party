import { z } from "zod";

export const ImportedQuestionSchema = z.object({
  question: z.string().min(4, "سؤال قصير جداً"),
  answers: z.array(z.string().min(1)).length(4, "يجب توفير 4 إجابات"),
  correctAnswer: z.number().int().min(0).max(3),
  category: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type ImportedQuestion = z.infer<typeof ImportedQuestionSchema>;

export interface RowReport {
  index: number;
  ok: boolean;
  errors: string[];
  preview: string;
}

export function validateRows(rows: unknown[]): { valid: ImportedQuestion[]; reports: RowReport[] } {
  const valid: ImportedQuestion[] = [];
  const reports: RowReport[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, i) => {
    const errors: string[] = [];
    const parsed = ImportedQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.issues.forEach((iss) => errors.push(`${iss.path.join(".")}: ${iss.message}`));
    } else {
      const key = parsed.data.question.trim().toLowerCase();
      if (!key) errors.push("empty question");
      else if (seen.has(key)) errors.push("duplicate question");
      else {
        seen.add(key);
        valid.push(parsed.data);
      }
    }
    reports.push({
      index: i + 1,
      ok: errors.length === 0,
      errors,
      preview:
        typeof (raw as { question?: unknown })?.question === "string"
          ? String((raw as { question: string }).question).slice(0, 80)
          : `#${i + 1}`,
    });
  });
  return { valid, reports };
}

/** Normalize CSV/XLSX row objects with flexible headers (ar/en). */
export function normalizeRow(raw: Record<string, unknown>): unknown {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      for (const actual of Object.keys(raw)) {
        if (actual.trim().toLowerCase() === k.toLowerCase()) return raw[actual];
      }
    }
    return undefined;
  };
  const q = get("question", "السؤال");
  const a = get("answers");
  let answers: unknown = a;
  if (typeof a === "string") {
    try {
      answers = JSON.parse(a);
    } catch {
      answers = String(a).split("|").map((s) => s.trim());
    }
  }
  if (!answers) {
    const parts = [get("a", "a1", "answer1", "الإجابة 1"), get("b", "a2", "answer2", "الإجابة 2"), get("c", "a3", "answer3", "الإجابة 3"), get("d", "a4", "answer4", "الإجابة 4")];
    if (parts.every(Boolean)) answers = parts;
  }
  let correct = get("correctAnswer", "correct", "الإجابة الصحيحة");
  if (typeof correct === "string") {
    const t = correct.trim();
    const latin = ["a", "b", "c", "d"].indexOf(t.toLowerCase());
    const arabic = ["ا", "أ", "ب", "ج", "د"].indexOf(t);
    // Note: ا/أ both mean first option; adjust ب/ج/د accordingly.
    const arabicMap: Record<string, number> = { ا: 0, أ: 0, إ: 0, ب: 1, ج: 2, د: 3 };
    if (latin >= 0) correct = latin;
    else if (t in arabicMap) correct = arabicMap[t];
    else if (/^[1-4]$/.test(t)) correct = Number(t) - 1;
    else if (Array.isArray(answers)) {
      const found = (answers as unknown[]).findIndex((x) => String(x).trim() === t);
      correct = found >= 0 ? found : Number(t);
    } else correct = Number(t);
    void arabic;
  }
  let diff = String(get("difficulty", "الصعوبة") ?? "easy").toLowerCase();
  if (["سهلة", "سهل"].includes(diff)) diff = "easy";
  else if (["متوسطة", "متوسط"].includes(diff)) diff = "medium";
  else if (["صعبة", "صعب"].includes(diff)) diff = "hard";
  else if (["خبير", "احترافية"].includes(diff)) diff = "expert";
  if (!["easy", "medium", "hard", "expert"].includes(diff)) diff = "easy";
  return {
    question: typeof q === "string" ? q.trim() : q,
    answers,
    correctAnswer: typeof correct === "number" ? correct : Number(correct),
    category: String(get("category", "الفئة") ?? "everyday").trim(),
    difficulty: diff,
    explanation: get("explanation", "الشرح") ? String(get("explanation", "الشرح")) : undefined,
  };
}

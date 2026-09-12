import type { Question, QuestionBank } from "@/lib/game/types";
import a from "./batch-a.json";
import b from "./batch-b.json";
import c from "./batch-c.json";

export const ALL_QUESTIONS = [...(a as Question[]), ...(b as Question[]), ...(c as Question[])] as Question[];

export const CATEGORIES: { id: string; ar: string; en: string }[] = [
  { id: "intelligence", ar: "ذكاء عام", en: "Intelligence" },
  { id: "science", ar: "علوم واكتشافات", en: "Science" },
  { id: "history", ar: "تاريخ وحضارات", en: "History" },
  { id: "geography", ar: "جغرافيا", en: "Geography" },
  { id: "logic", ar: "منطق وتفكير", en: "Logic" },
  { id: "math", ar: "رياضيات", en: "Math" },
  { id: "tech", ar: "تقنية", en: "Tech" },
  { id: "nature", ar: "طبيعة", en: "Nature" },
  { id: "body", ar: "جسم الإنسان", en: "Human body" },
  { id: "language", ar: "لغة", en: "Language" },
  { id: "algeria", ar: "الجزائر", en: "Algeria" },
  { id: "arab", ar: "الوطن العربي", en: "Arab world" },
  { id: "islamic", ar: "الحضارة الإسلامية", en: "Islamic civilization" },
  { id: "everyday", ar: "معرفة يومية", en: "Everyday" },
];

export function categoryName(id: string, locale: "ar" | "en" = "ar"): string {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) return id;
  return locale === "ar" ? c.ar : c.en;
}

export function builtinBanks(): QuestionBank[] {
  const now = Date.now();
  const mixed: QuestionBank = {
    id: "builtin-mixed",
    name: "التحدي المختلط",
    nameAr: "التحدي المختلط",
    source: "builtin",
    questions: ALL_QUESTIONS,
    createdAt: now,
  };
  const perCategory: QuestionBank[] = CATEGORIES.map((c) => ({
    id: `builtin-${c.id}`,
    name: c.ar,
    source: "builtin" as const,
    questions: ALL_QUESTIONS.filter((q) => q.category === c.id),
    createdAt: now,
  })).filter((bank) => bank.questions.length > 0);
  return [mixed, ...perCategory];
}

export function difficultyName(d: string, locale: "ar" | "en" = "ar"): string {
  const map: Record<string, [string, string]> = {
    easy: ["سهلة", "Easy"],
    medium: ["متوسطة", "Medium"],
    hard: ["صعبة", "Hard"],
    expert: ["خبير", "Expert"],
    mixed: ["منوعة", "Mixed"],
  };
  const v = map[d] ?? [d, d];
  return locale === "ar" ? v[0] : v[1];
}

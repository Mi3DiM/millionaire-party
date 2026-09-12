import type { Question, QuestionBank } from "@/lib/game/types";
import a from "./batch-a.json";
import b from "./batch-b.json";
import c from "./batch-c.json";
import topupScience from "./topup-science.json";
import topupHistory from "./topup-history.json";
import topupGeography from "./topup-geography.json";
import topupLogic from "./topup-logic.json";
import topupMath from "./topup-math.json";
import topupTech from "./topup-tech.json";
import topupNature from "./topup-nature.json";
import topupBody from "./topup-body.json";
import topupLanguage from "./topup-language.json";
import topupEveryday from "./topup-everyday.json";
import topupIntelligence from "./topup-intelligence.json";
import topupIslamic from "./topup-islamic.json";
import topupAlgeria from "./topup-algeria.json";
import topupMiddleEast from "./topup-middle-east.json";
import northAfrica from "./north-africa.json";
import amazigh from "./amazigh.json";

export const ALL_QUESTIONS = [
  ...(a as Question[]),
  ...(b as Question[]),
  ...(c as Question[]),
  ...(topupScience as Question[]),
  ...(topupHistory as Question[]),
  ...(topupGeography as Question[]),
  ...(topupLogic as Question[]),
  ...(topupMath as Question[]),
  ...(topupTech as Question[]),
  ...(topupNature as Question[]),
  ...(topupBody as Question[]),
  ...(topupLanguage as Question[]),
  ...(topupEveryday as Question[]),
  ...(topupIntelligence as Question[]),
  ...(topupIslamic as Question[]),
  ...(topupAlgeria as Question[]),
  ...(topupMiddleEast as Question[]),
  ...(northAfrica as Question[]),
  ...(amazigh as Question[]),
] as Question[];

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
  { id: "middle-east", ar: "الشرق الأوسط", en: "Middle East" },
  { id: "north-africa", ar: "شمال إفريقيا", en: "North Africa" },
  { id: "amazigh", ar: "الأمازيغية", en: "Amazigh" },
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

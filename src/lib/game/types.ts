export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type CategoryId =
  | "intelligence"
  | "science"
  | "history"
  | "geography"
  | "logic"
  | "math"
  | "tech"
  | "nature"
  | "body"
  | "language"
  | "algeria"
  | "middle-east"
  | "north-africa"
  | "amazigh"
  | "islamic"
  | "everyday";

export interface Question {
  id: string;
  question: string;
  answers: [string, string, string, string];
  correctAnswer: number; // 0..3
  category: CategoryId | string;
  difficulty: Difficulty;
  explanation?: string;
  tags?: string[];
}

export interface QuestionBank {
  id: string;
  name: string;
  nameAr?: string;
  source: "builtin" | "upload";
  questions: Question[];
  createdAt: number;
}

export type RoomStatus = "lobby" | "starting" | "playing" | "reveal" | "finished";
export type ConnectionState = "connected" | "connecting" | "reconnecting" | "offline";
export type PlayerStatus =
  | "thinking"
  | "answered"
  | "correct"
  | "wrong"
  | "eliminated"
  | "idle";

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  ready: boolean;
  connection: ConnectionState;
  status: PlayerStatus;
  prize: number;
  level: number; // index into ladder
  correctCount: number;
  streak: number;
  bestStreak: number;
  totalResponseMs: number;
  eliminated: boolean;
  isBot?: boolean;
}

export interface RoomSettings {
  categories: string[]; // or ["mixed"]
  difficulty: Difficulty | "mixed";
  questionCount: number;
  maxPlayers: number;
  timerSeconds: number;
  currency: string;
  lifelines: { fifty: boolean; crowd: boolean; extraTime: boolean };
  locked: boolean;
  matchLength: MatchLength;
  tournament: boolean;
}

export type MatchLength = "quick" | "classic" | "marathon";

export type StageKind = "qualifier" | "speed" | "semifinal" | "wager" | "final";

export interface StageSegment {
  kind: StageKind;
  start: number; // index into order
  count: number;
  timerSeconds: number;
}

export const MATCH_PRESETS: Record<
  MatchLength,
  { ar: string; en: string; questions: number; timer: number; minutes: string }
> = {
  quick: { ar: "سريعة", en: "Quick", questions: 6, timer: 15, minutes: "~8 دقائق" },
  classic: { ar: "كلاسيكية", en: "Classic", questions: 12, timer: 20, minutes: "~15 دقيقة" },
  marathon: { ar: "ماراثون", en: "Marathon", questions: 22, timer: 25, minutes: "~25–35 دقيقة" },
};

export const STAGE_META: Record<
  StageKind,
  { ar: string; en: string; icon: string; rules: string; rulesEn: string }
> = {
  qualifier: {
    ar: "التصفيات",
    en: "Qualifiers",
    icon: "◈",
    rules: "الجميع يلعب. اجمع أعلى رصيد لتتأهل.",
    rulesEn: "Everyone plays. Top scorers advance.",
  },
  speed: {
    ar: "جولة السرعة ⚡",
    en: "Speed round",
    icon: "⚡",
    rules: "10 ثوانٍ فقط! الإجابة الصحيحة تصعد مستويين.",
    rulesEn: "10 seconds only! Correct answers climb two levels.",
  },
  semifinal: {
    ar: "نصف النهائي",
    en: "Semifinal",
    icon: "◐",
    rules: "المتأهلون فقط يكملون. البقية يشاهدون كجمهور.",
    rulesEn: "Qualified players only. Others watch as crowd.",
  },
  wager: {
    ar: "جولة الرهان",
    en: "Wager round",
    icon: "◆",
    rules: "راهن بـ25/50/100% من رصيدك قبل كل سؤال. صح = ربح الرهان، خطأ = خسارته.",
    rulesEn: "Wager 25/50/100% of your prize. Win it or lose it.",
  },
  final: {
    ar: "النهائي ♛",
    en: "Final",
    icon: "♛",
    rules: "الأسئلة الحاسمة. الأعلى رصيداً يتوج مليونيراً.",
    rulesEn: "Decisive questions. Top prize takes the crown.",
  },
};

export interface AnswerSubmission {
  playerId: string;
  questionId: string;
  choice: number | null; // null = timeout
  at: number; // epoch ms
  responseMs: number;
}

export type LifelineKind = "fifty" | "crowd" | "extra";

export interface LifelineState {
  fiftyLeft: number;
  crowdLeft: number;
  extraLeft: number;
  removedOptions?: number[]; // per current question for fifty/fifty
  crowdVotes?: number[]; // percentages
}

export interface GameSnapshot {
  code: string;
  status: RoomStatus;
  questionOrder: string[];
  currentIndex: number;
  questionStartedAt: number;
  questionEndsAt: number;
  phase: "question" | "reveal";
  lastReveal?: {
    questionId: string;
    correct: number;
    answers: AnswerSubmission[];
  } | null;
}

export interface LeaderboardEntry {
  playerId: string;
  rank: number;
  prize: number;
  level: number;
  correctCount: number;
  avgMs: number;
}

export const DEFAULT_PRIZE_LADDER = [
  50, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000,
  500000, 1000000,
];

export const CHECKPOINT_LEVELS = [4, 9]; // guaranteed-ish fallback levels (0-based)

export const DEFAULT_SETTINGS: RoomSettings = {
  categories: ["mixed"],
  difficulty: "mixed",
  questionCount: 12,
  maxPlayers: 8,
  timerSeconds: 20,
  currency: "دج",
  lifelines: { fifty: true, crowd: true, extraTime: true },
  locked: false,
  matchLength: "classic",
  tournament: true,
};

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
}

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
  questionCount: 10,
  maxPlayers: 8,
  timerSeconds: 20,
  currency: "دج",
  lifelines: { fifty: true, crowd: true, extraTime: true },
  locked: false,
};

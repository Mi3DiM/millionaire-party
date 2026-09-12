import type {
  AnswerSubmission,
  Player,
  RoomSettings,
  RoomStatus,
  StageSegment,
} from "@/lib/game/types";

/**
 * P2P wire protocol (host-authoritative).
 * - Guest -> host: GuestMsg (hello / ready / answer / wager / bye)
 * - Host -> all: HostSnapshot (sanitized: NEVER contains correctAnswer pre-reveal)
 */

export interface HelloMsg {
  kind: "hello";
  playerId: string;
  name: string;
  avatarId: string;
}

export interface ReadyMsg {
  kind: "ready";
  playerId: string;
  ready: boolean;
}

export interface AnswerMsg {
  kind: "answer";
  playerId: string;
  questionId: string;
  /** true answer index 0..3 (NOT display index), null = timeout */
  choice: number | null;
}

export interface WagerMsg {
  kind: "wager";
  playerId: string;
  pct: 25 | 50 | 100;
}

export interface ByeMsg {
  kind: "bye";
  playerId: string;
}

export type GuestMsg = HelloMsg | ReadyMsg | AnswerMsg | WagerMsg | ByeMsg;

/** Question as guests are allowed to see it (no correct answer, no explanation). */
export interface PublicQuestion {
  id: string;
  question: string;
  answers: [string, string, string, string];
  category: string;
  difficulty: string;
}

/** Player copy safe for the wire (no optional `undefined` fields). */
export interface PublicPlayer {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  ready: boolean;
  status: Player["status"];
  prize: number;
  level: number;
  correctCount: number;
  streak: number;
  bestStreak: number;
  totalResponseMs: number;
  eliminated: boolean;
  isBot: boolean;
}

export function toPublicPlayer(p: Player): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    avatarId: p.avatarId,
    isHost: p.isHost,
    ready: p.ready,
    status: p.status,
    prize: p.prize,
    level: p.level,
    correctCount: p.correctCount,
    streak: p.streak,
    bestStreak: p.bestStreak,
    totalResponseMs: p.totalResponseMs,
    eliminated: p.eliminated,
    isBot: p.isBot ?? false,
  };
}

export function fromPublicPlayer(p: PublicPlayer): Player {
  return { ...p, connection: "connected" as const };
}

export interface HostSnapshot {
  v: 1;
  code: string;
  status: RoomStatus;
  settings: RoomSettings;
  bankName: string | null;
  players: PublicPlayer[];
  /** Current question only (keeps messages ~1KB instead of ~20KB for a full order). */
  question: PublicQuestion | null;
  /** Full authoritative length so guests can size progress/ladder correctly. */
  questionTotal: number;
  currentIndex: number;
  phase: "question" | "reveal";
  questionStartedAt: number;
  questionEndsAt: number;
  answerOrder: [number, number, number, number];
  stages: StageSegment[];
  awaitingStage: boolean;
  wagers: Record<string, number>;
  reveal: { correct: number; submissions: AnswerSubmission[] } | null;
}

/** Rolling transport diagnostics (module-level; rendered by RoomSync's collapsed panel). */
export const netStats: {
  sentSnap: number;
  sentAt: number | null;
  sentBytes: number;
  recvSnap: number;
  recvAt: number | null;
  recvBytes: number;
  guestMsgs: number;
  lastError: string | null;
} = {
  sentSnap: 0,
  sentAt: null,
  sentBytes: 0,
  recvSnap: 0,
  recvAt: null,
  recvBytes: 0,
  guestMsgs: 0,
  lastError: null,
};

export function noteSent(bytes: number) {
  netStats.sentSnap += 1;
  netStats.sentAt = Date.now();
  netStats.sentBytes = bytes;
}

export function noteRecv(bytes: number) {
  netStats.recvSnap += 1;
  netStats.recvAt = Date.now();
  netStats.recvBytes = bytes;
}

export function noteError(err: unknown) {
  try {
    netStats.lastError = err instanceof Error ? err.message : String(err).slice(0, 160);
  } catch {
    netStats.lastError = "send failed";
  }
}

export function snapshotBytes(snap: HostSnapshot): number {
  try {
    const s = JSON.stringify(snap);
    try {
      return new Blob([s]).size;
    } catch {
      return s.length;
    }
  } catch {
    return -1;
  }
}

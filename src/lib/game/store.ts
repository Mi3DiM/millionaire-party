import { create } from "zustand";
import {
  DEFAULT_PRIZE_LADDER,
  DEFAULT_SETTINGS,
  type AnswerSubmission,
  type LifelineKind,
  type Player,
  type Question,
  type QuestionBank,
  type RoomSettings,
  type RoomStatus,
  type StageKind,
  type StageSegment,
} from "@/lib/game/types";
import {
  buildQuestionOrder,
  buildStages,
  crowdDistribution,
  qualifiedIds,
  rankPlayers,
  scoreAfterAnswer,
  stageAt,
  stageTotal,
} from "@/lib/game/engine";
import { uid } from "@/lib/utils";
import {
  fromPublicPlayer,
  toPublicPlayer,
  type GuestMsg,
  type HostSnapshot,
} from "@/lib/net/protocol";

export type ConnectionMode = "local" | "p2p";
export type P2PRole = "idle" | "host" | "guest";

/** Outbox set by RoomSync: guest -> host messages. Module-level to avoid storing fns in state. */
let p2pOutbox: ((msg: GuestMsg) => void) | null = null;
/** Monotonic host snapshot sequence (reset per room; drives guest acks). */
let hostSeq = 0;
export function setP2POutbox(fn: ((msg: GuestMsg) => void) | null) {
  p2pOutbox = fn;
}
function sendToHost(msg: GuestMsg) {
  try {
    p2pOutbox?.(msg);
  } catch {}
}

interface RoomState {
  code: string | null;
  isHost: boolean;
  meId: string | null;
  status: RoomStatus;
  settings: RoomSettings;
  bank: QuestionBank | null;
  players: Player[];
  order: Question[]; // authoritative sequence (host view has correctAnswer; guests never receive it pre-reveal)
  currentIndex: number;
  phase: "question" | "reveal";
  questionStartedAt: number;
  questionEndsAt: number;
  answerOrder: number[]; // display mapping for current question
  myChoice: number | null;
  myLocked: boolean;
  submissions: AnswerSubmission[];
  reveal: { correct: number; submissions: AnswerSubmission[] } | null;
  removedOptions: number[];
  crowdVotes: number[] | null;
  lifelinesLeft: Record<LifelineKind, number>;
  mode: ConnectionMode;
  connectionNote: string | null;
  stages: StageSegment[];
  awaitingStage: boolean;
  wagers: Record<string, number>; // playerId -> pct for current wager question
  myPrizeAtStart: number; // my prize when the current question began (for FlyingGain delta)
  myLevelAtStart: number;
  // ---- P2P sync (host-authoritative) ----
  p2pRole: P2PRole;
  p2pConnected: boolean;
  p2pPeers: number;
  p2pLastHostAt: number | null; // guest: last snapshot epoch ms
  p2pStale: boolean; // guest: no snapshot beyond STALE_MS
  p2pRejoins: number; // guest: soft-rejoin attempts this stale episode
  hostBankName: string | null; // guest: bank name announced by host

  // actions
  createRoom: (opts: { name: string; avatarId: string; settings: RoomSettings; bank: QuestionBank; mode: ConnectionMode }) => string;
  joinRoom: (opts: { code: string; name: string; avatarId: string }) => { ok: boolean; error?: string };
  addBot: () => void;
  toggleReady: () => void;
  toggleLock: () => void;
  removePlayer: (id: string) => void;
  updateSettings: (patch: Partial<RoomSettings>) => void;
  setBank: (bank: QuestionBank) => void;
  startGame: () => void;
  submitAnswer: (displayIndex: number) => void;
  tickTimeout: () => void;
  revealNow: () => void;
  nextQuestion: () => void;
  continueStage: () => void;
  placeWager: (pct: 25 | 50 | 100) => void;
  useLifeline: (kind: LifelineKind) => void;
  resetToLobby: () => void;
  leaveRoom: () => void;
  // P2P actions
  setP2p: (patch: Partial<Pick<RoomState, "p2pConnected" | "p2pPeers" | "p2pLastHostAt" | "p2pStale" | "p2pRejoins" | "connectionNote">>) => void;
  /** Guest-only: restore identity after a page reload (same playerId, so the host re-links). */
  restoreGuestSession: (routeCode: string) => boolean;
  registerRemotePlayer: (opts: { playerId: string; name: string; avatarId: string }) => void;
  setRemoteReady: (playerId: string, ready: boolean) => void;
  setRemoteConnection: (playerId: string, connection: Player["connection"]) => void;
  removeRemotePlayer: (playerId: string) => void;
  submitRemoteAnswer: (opts: { playerId: string; questionId: string; choice: number | null }) => void;
  placeRemoteWager: (playerId: string, pct: 25 | 50 | 100) => void;
  applySnapshot: (snap: HostSnapshot) => void;
  buildHostSnapshot: () => HostSnapshot | null;
}

export function currentStageKind(s: Pick<RoomState, "stages" | "currentIndex">): StageKind {
  if (s.stages.length === 0) return "qualifier";
  return s.stages[stageAt(s.stages, s.currentIndex)].kind;
}

export function activePlayers(players: Player[]): Player[] {
  return players.filter((p) => !p.eliminated);
}

const BOT_NAMES = ["سارة", "ياسين", "أمينة", "كريم", "ليلى", "ريان", "مريم", "أنس"];

function botAnswer(question: Question, difficultySkill = 0.62): { choice: number | null; delayMs: number } {
  const delayMs = 2500 + Math.random() * 9000;
  const correctP = { easy: 0.85, medium: 0.68, hard: 0.5, expert: 0.34 }[question.difficulty] * difficultySkill + 0.15;
  if (Math.random() > 0.985) return { choice: null, delayMs: 20000 }; // rare timeout
  if (Math.random() < correctP) return { choice: question.correctAnswer, delayMs };
  const wrong = [0, 1, 2, 3].filter((i) => i !== question.correctAnswer);
  return { choice: wrong[Math.floor(Math.random() * wrong.length)], delayMs };
}

export const useRoom = create<RoomState>((set, get) => ({
  code: null,
  isHost: false,
  meId: null,
  status: "lobby",
  settings: DEFAULT_SETTINGS,
  bank: null,
  players: [],
  order: [],
  currentIndex: 0,
  phase: "question",
  questionStartedAt: 0,
  questionEndsAt: 0,
  answerOrder: [0, 1, 2, 3],
  myChoice: null,
  myLocked: false,
  submissions: [],
  reveal: null,
  removedOptions: [],
  crowdVotes: null,
  lifelinesLeft: { fifty: 1, crowd: 1, extra: 1 },
  mode: "local",
  connectionNote: null,
  stages: [],
  awaitingStage: false,
  wagers: {},
  myPrizeAtStart: 0,
      myLevelAtStart: -1,
  p2pRole: "idle",
  p2pConnected: false,
  p2pPeers: 0,
  p2pLastHostAt: null,
  p2pStale: false,
  p2pRejoins: 0,
  hostBankName: null,

  createRoom: ({ name, avatarId, settings, bank, mode }) => {
    const code = genCode();
    hostSeq = 0;
    const me: Player = freshPlayer(name, avatarId, true);
    set({
      code,
      isHost: true,
      meId: me.id,
      status: "lobby",
      settings,
      bank,
      players: [me],
      order: [],
      mode,
      connectionNote: mode === "p2p" ? "P2P: شارك الرمز لينضم الآخرون من أجهزتهم" : "وضع محلي: أضف لاعبين افتراضيين للتجربة",
      p2pRole: mode === "p2p" ? "host" : "idle",
      p2pConnected: false,
      p2pPeers: 0,
      p2pLastHostAt: null,
      p2pStale: false,
      p2pRejoins: 0,
      hostBankName: null,
    });
    persistMeta(code, me.id, true, name, avatarId);
    return code;
  },

  joinRoom: ({ code, name, avatarId }) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return { ok: false, error: "رمز الغرفة قصير جداً" };
    // Prototype: joining an unknown code creates a local preview lobby so UX is testable.
    // Real P2P path resolves peers via Trystero (see useP2P hook); store still works offline.
    const me: Player = freshPlayer(name, avatarId, false);
    const existing = get();
    if (existing.code === clean && existing.players.length > 0) {
      if (existing.players.length >= existing.settings.maxPlayers) return { ok: false, error: "الغرفة ممتلئة" };
      if (existing.status !== "lobby") return { ok: false, error: "اللعبة بدأت بالفعل" };
      set({ meId: me.id, isHost: false, players: [...existing.players, me] });
      persistMeta(clean, me.id, false, name, avatarId);
      return { ok: true };
    }
    set({
      code: clean,
      isHost: false,
      meId: me.id,
      status: "lobby",
      players: [me],
      mode: "p2p",
      p2pRole: "guest",
      p2pConnected: false,
      p2pPeers: 0,
      p2pLastHostAt: null,
      p2pStale: false,
      p2pRejoins: 0,
      hostBankName: null,
      order: [],
      stages: [],
      awaitingStage: false,
      wagers: {},
      myChoice: null,
      myLocked: false,
      submissions: [],
      reveal: null,
      connectionNote: "بانتظار المضيف… تأكد أن المضيف فتح نفس الرمز على جهازه",
    });
    persistMeta(clean, me.id, false, name, avatarId);
    return { ok: true };
  },

  addBot: () => {
    const { players, settings } = get();
    if (players.length >= settings.maxPlayers) return;
    const usedNames = new Set(players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !usedNames.has(n)) ?? `ضيف ${players.length + 1}`;
    const bot: Player = {
      ...freshPlayer(name, ["falcon", "star", "moon", "gem"][players.length % 4], false),
      ready: true,
      isBot: true,
    };
    set({ players: [...players, bot] });
  },

  toggleReady: () => {
    const { players, meId, isHost, p2pRole } = get();
    const me = players.find((p) => p.id === meId);
    if (!me) return;
    const next = !me.ready;
    set({ players: players.map((p) => (p.id === meId ? { ...p, ready: next } : p)) });
    // Guest in a shared room: notify the host (authoritative state comes back via snapshot).
    if (!isHost && p2pRole === "guest" && meId) {
      sendToHost({ kind: "ready", playerId: meId, ready: next });
    }
  },

  toggleLock: () => {
    const { settings, isHost } = get();
    if (!isHost) return;
    set({ settings: { ...settings, locked: !settings.locked } });
  },

  removePlayer: (id) => {
    const { players, meId } = get();
    if (id === meId) return;
    set({ players: players.filter((p) => p.id !== id) });
  },

  updateSettings: (patch) => {
    if (!get().isHost) return;
    set({ settings: { ...get().settings, ...patch } });
  },

  setBank: (bank) => {
    if (!get().isHost) return;
    if (get().status !== "lobby") return; // locked sequence once started
    set({ bank });
  },

  startGame: () => {
    const { bank, settings, players, isHost } = get();
    if (!isHost) return;
    if (!bank || bank.questions.length === 0) return;
    let pool = bank.questions;
    if (!settings.categories.includes("mixed")) {
      const filtered = pool.filter((q) => settings.categories.includes(q.category));
      if (filtered.length >= 3) pool = filtered;
    }
    const stages = buildStages(settings.questionCount, settings.matchLength, settings.tournament, settings.timerSeconds);
    const total = Math.min(stageTotal(stages), pool.length);
    const order = buildQuestionOrder(pool, total, settings.difficulty);
    // Trim trailing segments if bank is smaller than planned.
    while (stages.length > 1 && stages[stages.length - 1].start >= order.length) stages.pop();
    const firstTimer = stages[0]?.timerSeconds ?? settings.timerSeconds;
    const now = Date.now();
    const ends = now + firstTimer * 1000;
    set({
      status: "playing",
      order,
      stages,
      awaitingStage: false,
      wagers: {},
      currentIndex: 0,
      phase: "question",
      questionStartedAt: now,
      questionEndsAt: ends,
      answerOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
      myChoice: null,
      myLocked: false,
      submissions: [],
      reveal: null,
      removedOptions: [],
      crowdVotes: null,
      lifelinesLeft: { fifty: 1, crowd: 1, extra: 1 },
      myPrizeAtStart: 0,
      myLevelAtStart: -1,
      players: players.map((p) => ({ ...p, status: "thinking", prize: 0, level: -1, correctCount: 0, streak: 0, bestStreak: 0, totalResponseMs: 0, eliminated: false })),
    });
    scheduleBots();
  },

  submitAnswer: (displayIndex) => {
    const s = get();
    if (s.status !== "playing" || s.phase !== "question" || s.myLocked || s.awaitingStage) return;
    const me = s.players.find((p) => p.id === s.meId);
    if (!me || me.eliminated) return;
    const kind = currentStageKind(s);
    if (kind === "wager" && s.wagers[s.meId!] === undefined) return; // must place wager first
    const q = s.order[s.currentIndex];
    if (!q) return;
    const trueChoice = s.answerOrder[displayIndex];
    // Guest in a shared room: send to host, lock UI optimistically, wait for host snapshot.
    if (!s.isHost && s.p2pRole === "guest") {
      sendToHost({ kind: "answer", playerId: s.meId!, questionId: q.id, choice: trueChoice });
      set({
        myChoice: displayIndex,
        myLocked: true,
        players: s.players.map((p) => (p.id === s.meId ? { ...p, status: "answered" as const } : p)),
      });
      return;
    }
    const now = Date.now();
    const sub: AnswerSubmission = {
      playerId: s.meId!,
      questionId: q.id,
      choice: trueChoice,
      at: now,
      responseMs: now - s.questionStartedAt,
    };
    set({
      myChoice: displayIndex,
      myLocked: true,
      submissions: [...s.submissions, sub],
      players: s.players.map((p) => (p.id === s.meId ? { ...p, status: "answered" as const } : p)),
    });
    maybeAutoReveal();
  },

  tickTimeout: () => {
    const s = get();
    if (s.status !== "playing" || s.phase !== "question" || s.awaitingStage) return;
    // Guest: report timeout to host, never reveal locally.
    if (!s.isHost && s.p2pRole === "guest") {
      if (!s.myLocked && s.meId) {
        const q = s.order[s.currentIndex];
        if (q) sendToHost({ kind: "answer", playerId: s.meId, questionId: q.id, choice: null });
        set({ myChoice: null, myLocked: true });
      }
      return;
    }
    if (!s.isHost) return;
    // Record timeout for me if not answered.
    const me = s.players.find((p) => p.id === s.meId);
    if (!s.myLocked && s.meId && me && !me.eliminated) {
      const q = s.order[s.currentIndex];
      if (q) {
        const sub: AnswerSubmission = {
          playerId: s.meId,
          questionId: q.id,
          choice: null,
          at: Date.now(),
          responseMs: s.questionEndsAt - s.questionStartedAt,
        };
        set({ submissions: [...get().submissions, sub], myChoice: null, myLocked: true });
      }
    }
    get().revealNow();
  },

  revealNow: () => {
    const s = get();
    if (!s.isHost) return;
    if (s.status !== "playing" || s.phase !== "question") return;
    const q = s.order[s.currentIndex];
    if (!q) return;
    const kind = currentStageKind(s);
    const active = activePlayers(s.players);
    // Ensure every active player has a submission (timeout = null).
    const subs = new Map(s.submissions.map((x) => [x.playerId, x]));
    for (const p of active) {
      if (!subs.has(p.id)) {
        subs.set(p.id, {
          playerId: p.id,
          questionId: q.id,
          choice: null,
          at: Date.now(),
          responseMs: s.questionEndsAt - s.questionStartedAt,
        });
      }
    }
    const all = [...subs.values()];
    const players = s.players.map((p) => {
      if (p.eliminated) return p;
      const sub = subs.get(p.id)!;
      const patch = scoreAfterAnswer(p, sub, q.correctAnswer, DEFAULT_PRIZE_LADDER, {
        double: kind === "speed",
        wagerPct: kind === "wager" ? (s.wagers[p.id] ?? 0) : 0,
      });
      return { ...p, ...patch };
    });
    set({
      phase: "reveal",
      status: "reveal",
      reveal: { correct: q.correctAnswer, submissions: all },
      submissions: all,
      players,
    });
  },

  nextQuestion: () => {
    const s = get();
    if (!s.isHost) return;
    if (s.currentIndex + 1 >= s.order.length) {
      set({ status: "finished" });
      return;
    }
    const nextIdx = s.currentIndex + 1;
    const stageChanged =
      s.stages.length > 0 && stageAt(s.stages, nextIdx) !== stageAt(s.stages, s.currentIndex);
    if (stageChanged) {
      // Halftime: hold on the next question until host continues.
      set({
        currentIndex: nextIdx,
        phase: "question",
        status: "playing",
        awaitingStage: true,
        myChoice: null,
        myLocked: false,
        submissions: [],
        reveal: null,
        removedOptions: [],
        crowdVotes: null,
        wagers: {},
        players: s.players.map((p) => ({ ...p, status: p.eliminated ? "eliminated" as const : "thinking" as const })),
      });
      return;
    }
    const now = Date.now();
    const seg = s.stages[stageAt(s.stages, nextIdx)];
    set({
      currentIndex: nextIdx,
      phase: "question",
      status: "playing",
      questionStartedAt: now,
      questionEndsAt: now + (seg?.timerSeconds ?? s.settings.timerSeconds) * 1000,
      answerOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
      myChoice: null,
      myLocked: false,
      submissions: [],
      reveal: null,
      removedOptions: [],
      crowdVotes: null,
      wagers: {},
      myPrizeAtStart: s.players.find((p) => p.id === s.meId)?.prize ?? 0,
      myLevelAtStart: s.players.find((p) => p.id === s.meId)?.level ?? -1,
      players: s.players.map((p) => ({ ...p, status: p.eliminated ? "eliminated" as const : "thinking" as const })),
    });
    scheduleBots();
  },

  continueStage: () => {
    const s = get();
    if (!get().isHost || !s.awaitingStage) return;
    const kind = currentStageKind(s);
    let players = s.players;
    // Semifinal/final entry: top half qualifies, rest become spectators.
    if (kind === "semifinal" || kind === "final") {
      const q = qualifiedIds(rankPlayers(activePlayers(players)));
      const setQ = new Set(q);
      players = players.map((p) =>
        setQ.has(p.id) ? { ...p, status: "thinking" as const } : { ...p, eliminated: true, status: "eliminated" as const }
      );
    }
    // Bots place wagers.
    const wagers: Record<string, number> = {};
    if (kind === "wager") {
      for (const p of activePlayers(players)) {
        if (p.isBot) wagers[p.id] = [25, 50, 100][Math.floor(Math.random() * 3)];
      }
    }
    const now = Date.now();
    const seg = s.stages[stageAt(s.stages, s.currentIndex)];
    set({
      awaitingStage: false,
      players,
      wagers,
      myPrizeAtStart: players.find((p) => p.id === s.meId)?.prize ?? 0,
      myLevelAtStart: players.find((p) => p.id === s.meId)?.level ?? -1,
      phase: "question",
      status: "playing",
      questionStartedAt: now,
      questionEndsAt: now + (seg?.timerSeconds ?? s.settings.timerSeconds) * 1000,
      answerOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5),
    });
    scheduleBots();
  },

  placeWager: (pct) => {
    const s = get();
    if (s.phase !== "question" || currentStageKind(s) !== "wager" || s.myLocked) return;
    const me = s.players.find((p) => p.id === s.meId);
    if (!me || me.eliminated) return;
    if (!s.isHost && s.p2pRole === "guest") {
      sendToHost({ kind: "wager", playerId: s.meId!, pct });
      set({ wagers: { ...s.wagers, [s.meId!]: pct } });
      return;
    }
    set({ wagers: { ...s.wagers, [s.meId!]: pct } });
  },

  useLifeline: (kind) => {
    const s = get();
    // Lifelines need the true answer which guests never receive pre-reveal (fairness).
    // Guests in shared rooms: lifelines disabled for now (host-only).
    if (!s.isHost && s.p2pRole === "guest") return;
    if (s.phase !== "question" || s.myLocked) return;
    if (!s.settings.lifelines[kind === "extra" ? "extraTime" : kind === "fifty" ? "fifty" : "crowd"]) return;
    if (s.lifelinesLeft[kind] <= 0) return;
    const q = s.order[s.currentIndex];
    if (!q) return;
    if (kind === "fifty") {
      const wrong = [0, 1, 2, 3].filter((i) => i !== q.correctAnswer).sort(() => Math.random() - 0.5).slice(0, 2);
      // Convert true indices to display indices to hide.
      const hidden = s.answerOrder.map((t, di) => (wrong.includes(t) ? di : -1)).filter((x) => x >= 0);
      set({ removedOptions: hidden, lifelinesLeft: { ...s.lifelinesLeft, fifty: 0 } });
    } else if (kind === "crowd") {
      set({ crowdVotes: crowdDistribution(q.correctAnswer), lifelinesLeft: { ...s.lifelinesLeft, crowd: 0 } });
    } else {
      set({
        questionEndsAt: s.questionEndsAt + 15000,
        lifelinesLeft: { ...s.lifelinesLeft, extra: 0 },
      });
    }
  },

  resetToLobby: () => {
    const s = get();
    set({
      status: "lobby",
      order: [],
      stages: [],
      awaitingStage: false,
      wagers: {},
      myPrizeAtStart: 0,
      myLevelAtStart: -1,
      currentIndex: 0,
      phase: "question",
      myChoice: null,
      myLocked: false,
      submissions: [],
      reveal: null,
      players: s.players.map((p) => ({ ...p, ready: p.isHost ? true : false, status: "idle" as const, prize: 0, level: -1, eliminated: false })),
    });
  },

  leaveRoom: () => {
    try {
      localStorage.removeItem("millionaire:room");
    } catch {}
    const meId = get().meId;
    if (meId && get().p2pRole === "guest") sendToHost({ kind: "bye", playerId: meId });
    setP2POutbox(null);
    hostSeq = 0;
    set({
      code: null,
      isHost: false,
      meId: null,
      status: "lobby",
      players: [],
      order: [],
      reveal: null,
      submissions: [],
      myPrizeAtStart: 0,
      myLevelAtStart: -1,
      p2pRole: "idle",
      p2pConnected: false,
      p2pPeers: 0,
      p2pLastHostAt: null,
      p2pStale: false,
      p2pRejoins: 0,
      hostBankName: null,
    });
  },

  setP2p: (patch) => set(patch),

  restoreGuestSession: (routeCode) => {
    const s = get();
    if (s.code) return true; // already in a room
    let saved: { code?: string; meId?: string; isHost?: boolean; name?: string; avatarId?: string } | null = null;
    try {
      const raw = localStorage.getItem("millionaire:room");
      if (raw) saved = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!saved || saved.isHost !== false || !saved.code || !saved.meId || !saved.name) return false;
    if (saved.code !== routeCode.trim().toUpperCase()) return false;
    const me: Player = {
      ...freshPlayer(saved.name, saved.avatarId ?? "star", false),
      id: saved.meId,
      ready: false,
    };
    set({
      code: saved.code,
      isHost: false,
      meId: me.id,
      status: "lobby",
      players: [me],
      mode: "p2p",
      p2pRole: "guest",
      p2pConnected: false,
      p2pPeers: 0,
      p2pLastHostAt: null,
      p2pStale: false,
      p2pRejoins: 0,
      hostBankName: null,
      order: [],
      stages: [],
      awaitingStage: false,
      wagers: {},
      myChoice: null,
      myLocked: false,
      submissions: [],
      reveal: null,
      connectionNote: "إعادة اتصال… بانتظار المضيف",
    });
    return true;
  },

  registerRemotePlayer: ({ playerId, name, avatarId }) => {
    const s = get();
    if (!s.isHost) return;
    const known = s.players.find((p) => p.id === playerId);
    if (known) {
      // Re-link (e.g. guest rejoin after drop): refresh identity, mark online.
      if (known.name !== name || known.avatarId !== avatarId || known.connection !== "connected") {
        set({
          players: get().players.map((p) =>
            p.id === playerId ? { ...p, name, avatarId, connection: "connected" as const } : p
          ),
        });
      }
      return;
    }
    // Brand-new players only before the game starts (sequence lock).
    if (s.status !== "lobby") return;
    if (s.players.length >= s.settings.maxPlayers) return;
    if (s.settings.locked) return;
    const remote: Player = {
      ...freshPlayer(name, avatarId, false),
      id: playerId,
      ready: false,
    };
    set({ players: [...get().players, remote] });
  },

  setRemoteReady: (playerId, ready) => {
    if (!get().isHost) return;
    set({ players: get().players.map((p) => (p.id === playerId && !p.isHost ? { ...p, ready } : p)) });
  },

  setRemoteConnection: (playerId, connection) => {
    if (!get().isHost) return;
    set({
      players: get().players.map((p) =>
        p.id === playerId && !p.isHost ? { ...p, connection } : p
      ),
    });
  },

  removeRemotePlayer: (playerId) => {
    const s = get();
    if (!s.isHost || playerId === s.meId) return;
    if (!s.players.some((p) => p.id === playerId)) return;
    set({ players: s.players.filter((p) => p.id !== playerId) });
  },

  submitRemoteAnswer: ({ playerId, questionId, choice }) => {
    const s = get();
    if (!s.isHost || s.status !== "playing" || s.phase !== "question" || s.awaitingStage) return;
    const q = s.order[s.currentIndex];
    if (!q || q.id !== questionId) return;
    const kind = currentStageKind(s);
    if (kind === "wager" && s.wagers[playerId] === undefined) return;
    const target = s.players.find((p) => p.id === playerId);
    if (!target || target.eliminated || target.isBot) return;
    if (s.submissions.some((x) => x.playerId === playerId)) return;
    const now = Date.now();
    const sub: AnswerSubmission = {
      playerId,
      questionId: q.id,
      choice,
      at: now,
      responseMs: now - s.questionStartedAt,
    };
    set({
      submissions: [...s.submissions, sub],
      players: s.players.map((p) => (p.id === playerId ? { ...p, status: "answered" as const } : p)),
    });
    maybeAutoReveal();
  },

  placeRemoteWager: (playerId, pct) => {
    const s = get();
    if (!s.isHost || s.phase !== "question" || currentStageKind(s) !== "wager") return;
    const target = s.players.find((p) => p.id === playerId);
    if (!target || target.eliminated) return;
    set({ wagers: { ...s.wagers, [playerId]: pct } });
  },

  applySnapshot: (snap) => {
    const s = get();
    if (s.isHost) return;
    if (s.code && snap.code !== s.code) return;
    const newQuestion =
      snap.currentIndex !== s.currentIndex ||
      (s.phase === "reveal" && snap.phase === "question");
    // Accumulate sparse order: size to the authoritative total, patch the current question.
    const order: Question[] = s.order.length ? [...s.order] : [];
    while (order.length < snap.questionTotal) order.push(pendingQuestion(order.length));
    if (snap.question && snap.currentIndex < order.length) {
      const q = snap.question;
      order[snap.currentIndex] = {
        id: q.id,
        question: q.question,
        answers: q.answers,
        correctAnswer: -1 as number,
        category: q.category,
        difficulty: q.difficulty as Question["difficulty"],
      };
    }
    const players = snap.players.map(fromPublicPlayer);
    const meNow = players.find((p) => p.id === s.meId);
    set({
      code: snap.code,
      status: snap.status,
      settings: snap.settings,
      hostBankName: snap.bankName,
      players,
      order,
      currentIndex: snap.currentIndex,
      phase: snap.phase,
      questionStartedAt: snap.questionStartedAt,
      questionEndsAt: snap.questionEndsAt,
      answerOrder: [...snap.answerOrder] as [number, number, number, number],
      stages: snap.stages,
      awaitingStage: snap.awaitingStage,
      wagers: { ...snap.wagers },
      reveal: snap.reveal ? { correct: snap.reveal.correct, submissions: [...snap.reveal.submissions] } : null,
      submissions: snap.reveal ? [...snap.reveal.submissions] : [],
      myChoice: newQuestion ? null : s.myChoice,
      myLocked: snap.phase === "reveal" ? true : newQuestion ? false : s.myLocked,
      removedOptions: newQuestion ? [] : s.removedOptions,
      crowdVotes: newQuestion ? null : s.crowdVotes,
      myPrizeAtStart: newQuestion ? (meNow?.prize ?? 0) : s.myPrizeAtStart,
      myLevelAtStart: newQuestion ? (meNow?.level ?? -1) : s.myLevelAtStart,
      p2pLastHostAt: Date.now(),
      connectionNote: "متصل بالمضيف",
    });
  },

  buildHostSnapshot: () => {
    const s = get();
    if (!s.isHost || !s.code) return null;
    const answerOrder = [...s.answerOrder] as [number, number, number, number];
    const q = s.order[s.currentIndex];
    return {
      v: 1 as const,
      seq: ++hostSeq,
      code: s.code,
      status: s.status,
      settings: s.settings,
      bankName: s.bank?.name ?? null,
      players: s.players.map(toPublicPlayer),
      // Slim: current question only (never correctAnswer/explanation pre-reveal).
      question: q
        ? {
            id: q.id,
            question: q.question,
            answers: q.answers,
            category: typeof q.category === "string" ? q.category : "mixed",
            difficulty: q.difficulty,
          }
        : null,
      questionTotal: s.order.length,
      currentIndex: s.currentIndex,
      phase: s.phase,
      questionStartedAt: s.questionStartedAt,
      questionEndsAt: s.questionEndsAt,
      answerOrder,
      stages: s.stages,
      awaitingStage: s.awaitingStage,
      wagers: { ...s.wagers },
      reveal: s.phase === "reveal" && s.reveal ? { correct: s.reveal.correct, submissions: [...s.reveal.submissions] } : null,
    };
  },
}));

/** Placeholder until the host's snapshot delivers the real question at that index. */
function pendingQuestion(i: number): Question {
  return {
    id: `pending-${i}`,
    question: "…",
    answers: ["…", "…", "…", "…"],
    correctAnswer: -1,
    category: "mixed",
    difficulty: "medium",
  };
}

function freshPlayer(name: string, avatarId: string, isHost: boolean): Player {
  return {
    id: uid("p"),
    name: name.trim().slice(0, 24) || "لاعب",
    avatarId,
    isHost,
    ready: isHost,
    connection: "connected",
    status: "idle",
    prize: 0,
    level: -1,
    correctCount: 0,
    streak: 0,
    bestStreak: 0,
    totalResponseMs: 0,
    eliminated: false,
  };
}

function genCode(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 5; i++) c += abc[Math.floor(Math.random() * abc.length)];
  return c;
}

function persistMeta(code: string, meId: string, isHost: boolean, name?: string, avatarId?: string) {
  try {
    localStorage.setItem("millionaire:room", JSON.stringify({ code, meId, isHost, name, avatarId }));
  } catch {}
}

// ---- bots driver (local prototype) ----
let botTimers: ReturnType<typeof setTimeout>[] = [];

function scheduleBots() {
  botTimers.forEach(clearTimeout);
  botTimers = [];
  const s = useRoom.getState();
  const q = s.order[s.currentIndex];
  if (!q || s.awaitingStage) return;
  const kind = currentStageKind(s);
  for (const p of s.players) {
    if (!p.isBot || p.eliminated) continue;
    // Bots in wager stage answer only if they "placed" a wager (set at stage entry).
    if (kind === "wager" && s.wagers[p.id] === undefined) continue;
    const { choice, delayMs } = botAnswer(q, kind === "speed" ? 0.5 : 0.62);
    const capped = Math.min(delayMs, Math.max(1000, s.questionEndsAt - Date.now() - 500));
    botTimers.push(
      setTimeout(() => {
        const cur = useRoom.getState();
        if (cur.phase !== "question" || cur.status !== "playing") return;
        const qq = cur.order[cur.currentIndex];
        if (!qq || qq.id !== q.id) return;
        const sub: AnswerSubmission = {
          playerId: p.id,
          questionId: q.id,
          choice,
          at: Date.now(),
          responseMs: Date.now() - cur.questionStartedAt,
        };
        useRoom.setState({
          submissions: [...useRoom.getState().submissions, sub],
          players: useRoom.getState().players.map((x) => (x.id === p.id ? { ...x, status: "answered" as const } : x)),
        });
        maybeAutoReveal();
      }, capped)
    );
  }
}

function maybeAutoReveal() {
  const s = useRoom.getState();
  if (s.phase !== "question" || s.awaitingStage) return;
  const answeredIds = new Set(s.submissions.map((x) => x.playerId));
  const active = activePlayers(s.players);
  // Reveal when every active player answered.
  if (active.length > 0 && active.every((p) => answeredIds.has(p.id))) {
    setTimeout(() => useRoom.getState().revealNow(), 600);
  }
}

export function selectRankedPlayers(players: Player[]) {
  return rankPlayers(players);
}

export function selectPrizeLadder(): number[] {
  return DEFAULT_PRIZE_LADDER;
}

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRoom } from "@/lib/game/store";
import { DEFAULT_SETTINGS, type Question, type QuestionBank } from "@/lib/game/types";
import type { HostSnapshot } from "@/lib/net/protocol";

function q(id: string, n: number): Question {
  return {
    id,
    question: `سؤال ${n}؟`,
    answers: [`أ${n}`, `ب${n}`, `ج${n}`, `د${n}`],
    correctAnswer: n % 4,
    category: "mixed",
    difficulty: "easy",
    explanation: `شرح ${n}`,
  };
}

const bank: QuestionBank = {
  id: "test-bank",
  name: "بنك الاختبار",
  source: "builtin",
  questions: [q("q1", 1), q("q2", 2), q("q3", 3), q("q4", 4)],
  createdAt: 0,
};

function hostRoom(withGuest = false) {
  useRoom.getState().leaveRoom();
  const settings = { ...DEFAULT_SETTINGS, tournament: false, questionCount: 4, timerSeconds: 20 };
  useRoom.getState().createRoom({ name: "مضيف", avatarId: "falcon", settings, bank, mode: "p2p" });
  if (withGuest) {
    useRoom.getState().registerRemotePlayer({ playerId: "g1", name: "ضيف", avatarId: "star" });
  }
  useRoom.getState().startGame();
  const snap = useRoom.getState().buildHostSnapshot();
  if (!snap) throw new Error("no snapshot");
  return JSON.parse(JSON.stringify(snap)) as HostSnapshot;
}

function guestJoin(snap: HostSnapshot) {
  useRoom.getState().leaveRoom();
  const res = useRoom.getState().joinRoom({ code: snap.code, name: "ضيف", avatarId: "star" });
  expect(res.ok).toBe(true);
  useRoom.getState().applySnapshot(snap);
}

beforeEach(() => {
  useRoom.getState().leaveRoom();
});

describe("host snapshot hygiene", () => {
  it("never leaks correctAnswer or explanation pre-reveal", () => {
    const snap = hostRoom();
    expect(snap.question).not.toBeNull();
    expect(snap.questionTotal).toBe(4);
    expect("correctAnswer" in (snap.question as object)).toBe(false);
    expect(JSON.stringify(snap)).not.toContain("شرح");
    expect(snap.reveal).toBeNull();
  });

  it("stays slim (current question only, not the full order)", () => {
    const snap = hostRoom();
    const raw = JSON.stringify(snap);
    // Exactly one question text in the whole payload: the current one.
    expect(raw).toContain(snap.question?.question);
    expect(raw.match(/سؤال \d؟/g)).toHaveLength(1);
    expect(raw.length).toBeLessThan(6000);
  });
});

describe("guest sync", () => {
  it("applies snapshot: sized order, real current question, synced players", () => {
    const snap = hostRoom();
    guestJoin(snap);
    const g = useRoom.getState();
    expect(g.isHost).toBe(false);
    expect(g.status).toBe("playing");
    expect(g.order).toHaveLength(4);
    expect(g.order[g.currentIndex].question).toBe(snap.question?.question);
    expect(g.order[g.currentIndex].correctAnswer).toBe(-1);
    expect(g.players).toHaveLength(1);
    expect(g.p2pLastHostAt).not.toBeNull();
  });

  it("accumulates questions across snapshots without losing earlier ones", () => {
    const first = hostRoom();
    guestJoin(first);
    // Host advances; capture the second snapshot from the host side.
    useRoom.getState().leaveRoom();
    const settings = { ...DEFAULT_SETTINGS, tournament: false, questionCount: 4, timerSeconds: 20 };
    useRoom.getState().createRoom({ name: "مضيف", avatarId: "falcon", settings, bank, mode: "p2p" });
    useRoom.getState().startGame();
    useRoom.getState().nextQuestion();
    const second = useRoom.getState().buildHostSnapshot();
    if (!second) throw new Error("no snapshot");
    second.code = first.code; // same room in reality (fresh code here only for isolation)
    // Back to guest: apply first then second.
    guestJoin(first);
    useRoom.getState().applySnapshot(JSON.parse(JSON.stringify(second)));
    const g = useRoom.getState();
    expect(g.currentIndex).toBe(1);
    expect(g.order[0].question).toBe(first.question?.question);
    expect(g.order[1].question).toBe(second.question?.question);
  });

  it("receives the reveal with the correct index", () => {
    const snap = hostRoom(true);
    // Guest answers through the host path (as RoomSync would).
    const qid = useRoom.getState().order[0].id;
    useRoom.getState().submitRemoteAnswer({ playerId: "g1", questionId: qid, choice: 1 });
    expect(useRoom.getState().submissions).toHaveLength(1);
    useRoom.getState().revealNow();
    const revealed = useRoom.getState().buildHostSnapshot();
    if (!revealed) throw new Error("no snapshot");
    expect(revealed.phase).toBe("reveal");
    expect(revealed.reveal?.correct).toBeGreaterThanOrEqual(0);
    guestJoin(snap);
    useRoom.getState().applySnapshot(JSON.parse(JSON.stringify(revealed)));
    const g = useRoom.getState();
    expect(g.phase).toBe("reveal");
    expect(g.reveal?.correct).toBe(revealed.reveal?.correct);
    expect(g.myLocked).toBe(true);
  });
});

describe("snapshot sequence", () => {
  it("increases monotonically per built snapshot", () => {
    const a = hostRoom();
    const b = useRoom.getState().buildHostSnapshot();
    if (!b) throw new Error("no snapshot");
    expect(b.seq).toBeGreaterThan(a.seq);
  });
});

describe("guest session restore (page reload hatch)", () => {
  function stubStorage() {
    const mem: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = String(v);
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    });
  }

  it("restores the same guest identity so the host re-links instead of duplicating", () => {
    stubStorage();
    useRoom.getState().leaveRoom();
    const settings = { ...DEFAULT_SETTINGS, tournament: false, questionCount: 4, timerSeconds: 20 };
    const code = useRoom.getState().createRoom({ name: "مضيف", avatarId: "falcon", settings, bank, mode: "p2p" });
    void code;
    // Guest joins on "another device" (same store, simulated), then its page reloads.
    const joinRes = useRoom.getState().joinRoom({ code: useRoom.getState().code ?? "", name: "ضيف", avatarId: "star" });
    expect(joinRes.ok).toBe(true);
    // joinRoom on the same code appends locally; grab the guest id for the reload simulation.
    const guestId = useRoom.getState().meId;
    // Simulate reload: wipe memory only (storage intact), then restore via route code.
    const savedCode = useRoom.getState().code ?? "";
    useRoom.setState({ code: null, meId: null, players: [], isHost: false });
    const ok = useRoom.getState().restoreGuestSession(savedCode);
    expect(ok).toBe(true);
    const g = useRoom.getState();
    expect(g.meId).toBe(guestId);
    expect(g.isHost).toBe(false);
    expect(g.p2pRole).toBe("guest");
    expect(g.players).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("refuses restore for a different room code", () => {
    stubStorage();
    useRoom.getState().leaveRoom();
    const settings = { ...DEFAULT_SETTINGS, tournament: false, questionCount: 4, timerSeconds: 20 };
    useRoom.getState().createRoom({ name: "مضيف", avatarId: "falcon", settings, bank, mode: "p2p" });
    useRoom.getState().joinRoom({ code: useRoom.getState().code ?? "", name: "ضيف", avatarId: "star" });
    useRoom.setState({ code: null, meId: null, players: [], isHost: false });
    expect(useRoom.getState().restoreGuestSession("XXXXX")).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("remote player registry", () => {
  it("re-links a known player mid-game instead of duplicating or dropping", () => {
    hostRoom(true);
    const before = useRoom.getState().players.length;
    useRoom.getState().registerRemotePlayer({ playerId: "g1", name: "ضيف جديد", avatarId: "moon" });
    const after = useRoom.getState().players;
    expect(after).toHaveLength(before);
    expect(after.find((p) => p.id === "g1")?.name).toBe("ضيف جديد");
  });

  it("ignores brand-new players once the game started (sequence lock)", () => {
    hostRoom();
    const before = useRoom.getState().players.length;
    useRoom.getState().registerRemotePlayer({ playerId: "late", name: "متأخر", avatarId: "star" });
    expect(useRoom.getState().players).toHaveLength(before);
  });

  it("guests cannot drive host-only transitions", () => {
    hostRoom();
    const idx = useRoom.getState().currentIndex;
    // Simulate guest store: flip isHost off, then try host actions.
    useRoom.setState({ isHost: false });
    useRoom.getState().nextQuestion();
    useRoom.getState().revealNow();
    expect(useRoom.getState().currentIndex).toBe(idx);
    expect(useRoom.getState().phase).toBe("question");
  });
});

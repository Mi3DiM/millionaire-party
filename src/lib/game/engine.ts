import {
  DEFAULT_PRIZE_LADDER,
  CHECKPOINT_LEVELS,
  type AnswerSubmission,
  type Difficulty,
  type Player,
  type Question,
} from "./types";

export function buildQuestionOrder(
  bank: Question[],
  count: number,
  difficulty: Difficulty | "mixed",
  seedShuffle = true
): Question[] {
  let pool = [...bank];
  if (difficulty !== "mixed") pool = pool.filter((q) => q.difficulty === difficulty);
  if (pool.length === 0) pool = [...bank];
  // Sort easy→expert for ladder progression, then shuffle within each tier.
  const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };
  pool.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]);
  const picked: Question[] = [];
  const perTier = Math.max(1, Math.ceil(count / 4));
  for (const tier of ["easy", "medium", "hard", "expert"] as const) {
    const tierQs = pool.filter((q) => q.difficulty === tier);
    shuffle(tierQs);
    picked.push(...tierQs.slice(0, perTier));
    if (picked.length >= count) break;
  }
  if (picked.length < count) {
    const rest = pool.filter((q) => !picked.includes(q));
    shuffle(rest);
    picked.push(...rest.slice(0, count - picked.length));
  }
  const finalQs = picked.slice(0, count);
  if (seedShuffle) {
    // Keep overall progression but shuffle lightly inside halves.
    const mid = Math.ceil(finalQs.length / 2);
    shuffle(finalQs.slice(0, mid));
  }
  return finalQs;
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Randomize answer display order; returns mapping. Host keeps true index. */
export function shuffledAnswerOrder(): number[] {
  return shuffle([0, 1, 2, 3]);
}

export function scoreAfterAnswer(
  player: Player,
  submission: AnswerSubmission,
  correct: number,
  ladder: number[] = DEFAULT_PRIZE_LADDER
): Partial<Player> {
  const isCorrect = submission.choice === correct;
  if (isCorrect) {
    const nextLevel = Math.min(player.level + 1, ladder.length - 1);
    const streak = player.streak + 1;
    return {
      status: "correct",
      level: nextLevel,
      prize: ladder[nextLevel],
      correctCount: player.correctCount + 1,
      streak,
      bestStreak: Math.max(player.bestStreak, streak),
      totalResponseMs: player.totalResponseMs + submission.responseMs,
    };
  }
  // Wrong/timeout: fall back to last checkpoint below current level.
  const fallback = lastCheckpointBelow(player.level);
  return {
    status: submission.choice === null ? "wrong" : "wrong",
    level: fallback,
    prize: fallback >= 0 ? ladder[fallback] : 0,
    streak: 0,
    eliminated: false,
    totalResponseMs: player.totalResponseMs + submission.responseMs,
  };
}

export function lastCheckpointBelow(level: number): number {
  let cp = -1;
  for (const c of CHECKPOINT_LEVELS) if (c < level) cp = c;
  return cp;
}

export function rankPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.prize !== a.prize) return b.prize - a.prize;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    const avgA = a.correctCount ? a.totalResponseMs / a.correctCount : Infinity;
    const avgB = b.correctCount ? b.totalResponseMs / b.correctCount : Infinity;
    return avgA - avgB;
  });
}

export function crowdDistribution(correct: number, noise = 0.35): number[] {
  // Simulate plausible crowd votes weighted to correct answer.
  const base = [0.15, 0.15, 0.15, 0.15];
  base[correct] = 0.55;
  const votes = base.map((b) => Math.max(0.03, b + (Math.random() - 0.5) * noise));
  const sum = votes.reduce((a, b) => a + b, 0);
  return votes.map((v) => Math.round((v / sum) * 100));
}

"use client";

import type { Player } from "@/lib/game/types";
import { rankPlayers } from "@/lib/game/engine";
import { Avatar } from "@/components/ui/avatar";
import { formatPrize } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_AR: Record<Player["status"], string> = {
  thinking: "يفكّر…",
  answered: "أجاب ✓",
  correct: "صح ✓",
  wrong: "خطأ ✕",
  eliminated: "خارج",
  idle: "…",
};

export function Leaderboard({ players, currency, meId }: { players: Player[]; currency: string; meId: string | null }) {
  const ranked = rankPlayers(players);
  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((p, idx) => (
        <li
          key={p.id}
          className={cn(
            "anim-rise flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5",
            p.id === meId && "border-[var(--accent)]/60",
            idx === 0 && "shadow-[var(--shadow-card)]"
          )}
        >
          <span
            className={cn(
              "prize-num flex size-7 shrink-0 items-center justify-center rounded-xl text-[13px] font-black",
              idx === 0 ? "bg-[var(--accent)] text-[#1a1405]" : "bg-[var(--elevated)] text-[var(--muted)]"
            )}
          >
            {idx + 1}
          </span>
          <Avatar name={p.name} avatarId={p.avatarId} size={36} />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <b className="truncate text-[13.5px]">
              {p.name} {p.isHost && <span className="text-[11px] text-[var(--muted)]">· مضيف</span>}
            </b>
            <small className="text-[11.5px] text-[var(--muted)]">
              {STATUS_AR[p.status]} · {p.correctCount} صح
            </small>
          </span>
          <span className="prize-num text-[13px] font-black tabular-nums">{formatPrize(p.prize, currency)}</span>
        </li>
      ))}
    </ol>
  );
}

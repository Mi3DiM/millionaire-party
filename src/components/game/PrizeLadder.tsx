"use client";

import { cn } from "@/lib/utils";
import { formatPrize } from "@/lib/utils";
import { CHECKPOINT_LEVELS } from "@/lib/game/types";
import { GameIcon } from "@/components/ui/GameIcon";

export function PrizeLadder({
  ladder,
  currentLevel,
  currency,
  compact,
}: {
  ladder: number[];
  currentLevel: number;
  currency: string;
  compact?: boolean;
}) {
  const items = ladder.map((v, i) => ({ v, i })).reverse();
  return (
    <ol className={cn("flex flex-col gap-1", compact && "gap-0.5")} aria-label="سلم الجوائز">
      {items.map(({ v, i }) => {
        const state = i < currentLevel ? "done" : i === currentLevel ? "current" : i === currentLevel + 1 ? "next" : "up";
        const checkpoint = CHECKPOINT_LEVELS.includes(i);
        return (
          <li
            key={i}
            className={cn(
              "prize-num flex items-center justify-between rounded-xl px-3 text-[13px] tabular-nums",
              compact ? "py-1" : "py-1.5",
              state === "current" && "anim-glow bg-[var(--accent)] font-black text-[#1a1405]",
              state === "done" && "bg-[var(--success)]/12 font-bold text-[var(--success)]",
              state === "next" && "border border-dashed border-[var(--border)] text-[var(--muted)]",
              state === "up" && "text-[var(--muted)]"
            )}
          >
            <span className="flex items-center gap-2">
              <span className={cn("text-[11px]", state === "current" ? "opacity-70" : "opacity-50")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {checkpoint && <GameIcon name="shield" size={13} className={state === "current" ? "text-[#1a1405]" : "text-[var(--accent-ink)]"} />}
            </span>
            <span>{formatPrize(v, currency)}</span>
          </li>
        );
      })}
    </ol>
  );
}

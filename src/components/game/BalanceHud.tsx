"use client";

import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/ui/GameIcon";
import { CountUp } from "@/components/game/StageFx";
import { cn } from "@/lib/utils";

/**
 * Persistent balance HUD: always-visible prize + rank + leader gap.
 * Sticky on mobile, static prominent card on desktop.
 */
export function BalanceHud({
  prize,
  fromPrize,
  currency,
  rank,
  totalPlayers,
  gap,
  level,
  wagerPct,
  wentUp,
  bare,
}: {
  prize: number;
  fromPrize: number;
  currency: string;
  rank: number;
  totalPlayers: number;
  gap: number;
  level: number;
  wagerPct?: number;
  wentUp: boolean | null; // true = gain flash, false = loss flash, null = neutral
  /** Render content only (hosted inside MatchStatusBar's card). */
  bare?: boolean;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[#1a1405]">
        <GameIcon name="cup" size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-[10px] font-bold text-[var(--muted)]">رصيدك</span>
        <b className="prize-num truncate text-lg tabular-nums md:text-xl">
          <CountUp value={prize} from={fromPrize} currency={currency} />
        </b>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex gap-1">
          <Badge variant={rank === 1 ? "gold" : "info"}>#{rank} / {totalPlayers}</Badge>
          {level >= 0 && <Badge className="hidden min-[420px]:inline-flex">مستوى {level + 1}</Badge>}
          {wagerPct !== undefined && (
            <Badge variant="warning">رهان {wagerPct}%</Badge>
          )}
        </div>
        {gap > 0 ? (
          <span className="prize-num hidden text-[10.5px] text-[var(--muted)] tabular-nums min-[400px]:block">
            الفارق {gap.toLocaleString("en-US")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--accent-ink)]">
            <GameIcon name="crown" size={12} /> المتصدر!
          </span>
        )}
      </div>
    </>
  );
  if (bare) return <>{content}</>;
  return (
    <div className="sticky top-16 z-30 lg:static">
      <div
        className={cn(
          "flex items-center gap-3 rounded-3xl border border-[var(--accent)]/40 bg-[var(--surface)]/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur transition-colors",
          wentUp === true && "border-[var(--success)]/60",
          wentUp === false && "border-[var(--danger)]/60"
        )}
      >
        {content}
      </div>
    </div>
  );
}

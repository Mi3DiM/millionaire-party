"use client";

import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/ui/GameIcon";
import { BalanceHud } from "@/components/game/BalanceHud";
import { StageBanner } from "@/components/game/StageFx";
import type { StageKind } from "@/lib/game/types";
import { cn } from "@/lib/utils";

/**
 * Single match-status bar: balance faces the stage side-by-side on desktop,
 * merged into one compact card on mobile — never stacked as two full cards.
 */
export function MatchStatusBar({
  prize,
  fromPrize,
  currency,
  rank,
  totalPlayers,
  gap,
  level,
  wagerPct,
  wentUp,
  stageKind,
  questionIndex,
  questionTotal,
  showTournament,
  speed,
  streak,
}: {
  prize: number;
  fromPrize: number;
  currency: string;
  rank: number;
  totalPlayers: number;
  gap: number;
  level: number;
  wagerPct?: number;
  wentUp: boolean | null;
  stageKind: StageKind;
  questionIndex: number;
  questionTotal: number;
  showTournament: boolean;
  speed: boolean;
  streak: number;
}) {
  return (
    <div className="sticky top-16 z-30 lg:static">
      <div
        className={cn(
          "grid items-center gap-3 rounded-3xl border border-[var(--accent)]/40 bg-[var(--surface)]/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur transition-colors md:grid-cols-[1fr_auto_1fr] md:gap-4",
          wentUp === true && "border-[var(--success)]/60",
          wentUp === false && "border-[var(--danger)]/60"
        )}
      >
        {/* Balance zone (first in RTL) */}
        <BalanceHud
          bare
          prize={prize}
          fromPrize={fromPrize}
          currency={currency}
          rank={rank}
          totalPlayers={totalPlayers}
          gap={gap}
          level={level}
          wagerPct={wagerPct}
          wentUp={wentUp}
        />
        {/* Divider */}
        <div aria-hidden className="hidden h-12 w-px bg-[var(--border)] md:block" />
        {/* Stage zone */}
        <div className="flex min-w-0 items-center gap-2 border-t border-[var(--border)] pt-2.5 md:border-0 md:pt-0">
          {showTournament ? (
            <StageBanner compact kind={stageKind} index={questionIndex} total={questionTotal} />
          ) : (
            <span className="prize-num text-[12px] text-[var(--muted)] tabular-nums">
              سؤال {questionIndex + 1} / {questionTotal}
            </span>
          )}
          <span className="ms-auto flex shrink-0 gap-1.5">
            {speed && (
              <Badge variant="gold"><GameIcon name="bolt" size={14} /> ×2</Badge>
            )}
            {streak >= 2 && (
              <Badge variant="gold"><GameIcon name="fire" size={14} /> ×{streak}</Badge>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

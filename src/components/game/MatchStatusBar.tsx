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
          "flex items-center gap-2.5 rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface)]/95 px-3 py-2 shadow-sm backdrop-blur transition-colors md:gap-3",
          wentUp === true && "border-[var(--success)]/60",
          wentUp === false && "border-[var(--danger)]/60"
        )}
      >
        {/* Balance zone (first in RTL) */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
        </div>
        {/* Divider */}
        <div aria-hidden className="h-9 w-px shrink-0 bg-[var(--border)]" />
        {/* Stage zone */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {showTournament ? (
            <StageBanner compact kind={stageKind} index={questionIndex} total={questionTotal} />
          ) : (
            <span className="prize-num text-[11.5px] text-[var(--muted)] tabular-nums">
              سؤال {questionIndex + 1} / {questionTotal}
            </span>
          )}
          {(speed || streak >= 2) && (
            <span className="flex shrink-0 gap-1">
              {speed && (
                <Badge variant="gold"><GameIcon name="bolt" size={13} /> ×2</Badge>
              )}
              {streak >= 2 && (
                <Badge variant="gold"><GameIcon name="fire" size={13} /> ×{streak}</Badge>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

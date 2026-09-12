"use client";

import type { LifelineKind } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { GameIcon, type GameIconName } from "@/components/ui/GameIcon";
import { cn } from "@/lib/utils";

export function LifelineBar({
  left,
  enabled,
  onUse,
  disabled,
}: {
  left: Record<LifelineKind, number>;
  enabled: { fifty: boolean; crowd: boolean; extraTime: boolean };
  onUse: (k: LifelineKind) => void;
  disabled?: boolean;
}) {
  const items: { kind: LifelineKind; icon: GameIconName; name: string; desc: string; on: boolean; n: number }[] = [
    { kind: "fifty", icon: "pie", name: "50/50", desc: "إزالة إجابتين خاطئتين", on: enabled.fifty, n: left.fifty },
    { kind: "crowd", icon: "users", name: "الجمهور", desc: "رأي الجمهور بالنسب", on: enabled.crowd, n: left.crowd },
    { kind: "extra", icon: "clock", name: "+15 ثانية", desc: "وقت إضافي", on: enabled.extraTime, n: left.extra },
  ];
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="وسائل المساعدة">
      {items.map((it) => {
        const used = it.n <= 0 || !it.on;
        return (
          <Button
            key={it.kind}
            variant="secondary"
            size="sm"
            disabled={disabled || used}
            onClick={() => onUse(it.kind)}
            title={it.desc}
            className={cn(used && "opacity-40 line-through")}
          >
            <GameIcon name={it.icon} size={16} /> {it.name}
          </Button>
        );
      })}
    </div>
  );
}

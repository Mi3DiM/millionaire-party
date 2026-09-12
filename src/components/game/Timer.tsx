"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Timer({
  endsAt,
  startedAt,
  onExpire,
  onSecond,
}: {
  endsAt: number;
  startedAt: number;
  onExpire: () => void;
  onSecond?: (left: number) => void;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const total = Math.max(1, endsAt - startedAt);
  const leftMs = Math.max(0, endsAt - now);
  const left = Math.ceil(leftMs / 1000);
  const frac = leftMs / total;

  React.useEffect(() => {
    const t = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      onSecond?.(Math.max(0, Math.ceil((endsAt - nowMs) / 1000)));
    }, 200);
    return () => clearInterval(t);
  }, [endsAt, onSecond]);

  const fired = React.useRef(false);
  React.useEffect(() => {
    if (leftMs <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
    if (leftMs > 0) fired.current = false;
  }, [leftMs, onExpire]);

  const state = left <= 5 ? "critical" : left <= 10 ? "warning" : "normal";
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div
      role="timer"
      aria-label={`المتبقي ${left} ثانية`}
      className={cn("flex items-center gap-3", state === "critical" && "timer-critical", state === "warning" && "timer-warning")}
    >
      <span className="relative inline-flex size-[76px] items-center justify-center">
        <svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={state === "critical" ? "var(--danger)" : state === "warning" ? "var(--warning)" : "var(--accent)"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{ transition: "stroke-dashoffset 200ms linear" }}
          />
        </svg>
        <b className="prize-num text-2xl tabular-nums">{left}</b>
      </span>
      <span className="flex flex-col text-[12px] text-[var(--muted)]">
        <span className="font-bold text-[var(--foreground)]">المؤقت</span>
        <span>{state === "critical" ? "وقت حرج!" : state === "warning" ? "أسرع…" : "فكّر ثم أجب"}</span>
      </span>
    </div>
  );
}

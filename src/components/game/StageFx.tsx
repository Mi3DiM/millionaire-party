"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { Player, StageKind } from "@/lib/game/types";
import { STAGE_META } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { GameIcon } from "@/components/ui/GameIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Leaderboard } from "@/components/game/Leaderboard";
import { formatPrize } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { sfx } from "@/lib/fx/audio";

export function StageBanner({ kind, index, total }: { kind: StageKind; index: number; total: number }) {
  const { locale } = useI18n();
  const meta = STAGE_META[kind];
  return (
    <motion.div
      key={kind}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[#1a1405]">
        <GameIcon name={meta.icon} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <b className="text-[15px]">{locale === "ar" ? meta.ar : meta.en}</b>
        <p className="text-[12.5px] text-[var(--muted)]">{locale === "ar" ? meta.rules : meta.rulesEn}</p>
      </div>
      <span className="prize-num shrink-0 text-[12px] text-[var(--muted)] tabular-nums">
        {index + 1}/{total}
      </span>
    </motion.div>
  );
}

export function Halftime({
  kind,
  players,
  currency,
  meId,
  isHost,
  qualifiedPreview,
  onContinue,
}: {
  kind: StageKind;
  players: Player[];
  currency: string;
  meId: string | null;
  isHost: boolean;
  qualifiedPreview: string[];
  onContinue: () => void;
}) {
  const { locale } = useI18n();
  const meta = STAGE_META[kind];
  const meQualified = meId ? qualifiedPreview.includes(meId) : true;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={meta.ar}>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg">
        <Card className="theme-show border-[var(--accent)]/40 bg-[#0a0c16] text-[#f5f1e4]">
          <CardContent className="flex max-h-[85vh] flex-col gap-4 overflow-auto p-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <GameIcon name={meta.icon} size={44} />
              <h2 className="text-xl font-black">{locale === "ar" ? meta.ar : meta.en}</h2>
              <p className="text-[13.5px] text-white/60">{locale === "ar" ? meta.rules : meta.rulesEn}</p>
              {!meQualified && (kind === "semifinal" || kind === "final") && (
                <p className="mt-1 rounded-xl bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                  {locale === "ar" ? "أنت الآن في الجمهور — شاهد وتشجّع!" : "You are spectating now — enjoy!"}
                </p>
              )}
            </div>
            <Leaderboard players={players} currency={currency} meId={meId} />
            {isHost ? (
              <Button size="lg" variant="gold" onClick={onContinue}>
                {locale === "ar" ? `ابدأ ${meta.ar} ←` : `Start ${meta.en}`}
              </Button>
            ) : (
              <p className="text-center text-[13px] text-white/60">بانتظار المضيف لبدء المرحلة…</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function WagerDialog({
  prize,
  currency,
  current,
  onPick,
}: {
  prize: number;
  currency: string;
  current: number | undefined;
  onPick: (pct: 25 | 50 | 100) => void;
}) {
  if (current !== undefined) {
    return (
      <p className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3 text-center text-sm font-bold">
        رهانك: {current}% من {formatPrize(prize, currency)} — أجب الآن!
      </p>
    );
  }
  return (
    <div className="anim-pop rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/8 p-4" role="group" aria-label="اختر رهانك">
      <p className="flex items-center justify-center gap-2 text-center text-sm font-black"><GameIcon name="cup" size={18} /> كم تراهن من رصيدك ({formatPrize(prize, currency)})؟</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([25, 50, 100] as const).map((pct) => (
          <Button key={pct} variant={pct === 100 ? "gold" : "secondary"} onClick={() => onPick(pct)}>
            {pct}%
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Lightweight canvas confetti (no dependency). Respects reduced motion. */
export function Confetti({ fire }: { fire: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (localStorage.getItem("millionaire:motion") === "reduced") return;
    } catch {}
    const canvas = ref.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#f0c420", "#7aa5ff", "#4ade80", "#f87171", "#ffffff"];
    const parts = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      r: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      if (now - start > 5000) {
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx2d.save();
        ctx2d.translate(p.x, p.y);
        ctx2d.rotate(p.r);
        ctx2d.fillStyle = p.c;
        ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx2d.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  if (!fire) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[90]" aria-hidden />;
}

/** Animated prize count-up. */
export function CountUp({ value, currency }: { value: number; currency: string }) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const from = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 1400);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="prize-num tabular-nums">{formatPrize(shown, currency)}</span>;
}

/** Cinematic 3-2-1 veil before the reveal lands. Remount per question via key. */
export function RevealVeil({ onDone }: { onDone: () => void }) {
  const [n, setN] = React.useState(3);
  React.useEffect(() => {
    const timers = [3, 2, 1].map((v, i) =>
      setTimeout(() => {
        setN(v);
        sfx.select();
      }, i * 320)
    );
    const done = setTimeout(onDone, 3 * 320 + 120);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/55 backdrop-blur-[2px]"
    >
      <motion.span
        key={n}
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="prize-num text-7xl font-black text-[var(--accent)] tabular-nums"
      >
        {n}
      </motion.span>
    </motion.div>
  );
}

/** Floating "+prize" gain that rises from the answers toward the balance. */
export function FlyingGain({ amount, currency }: { amount: number; currency: string }) {
  if (amount <= 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: [0, 1, 1, 0], y: [24, 0, -28, -56], scale: 1 }}
      transition={{ duration: 1.6, ease: "easeOut" }}
      className="pointer-events-none flex justify-center"
      aria-hidden
    >
      <span className="prize-num rounded-full bg-[var(--success)]/20 px-4 py-1.5 text-lg font-black text-[var(--success)] tabular-nums">
        +{formatPrize(amount, currency)}
      </span>
    </motion.div>
  );
}

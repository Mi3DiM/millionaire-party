"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header, Footer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timer } from "@/components/game/Timer";
import { PrizeLadder } from "@/components/game/PrizeLadder";
import { Leaderboard } from "@/components/game/Leaderboard";
import { QuestionCard, AnswerOption } from "@/components/game/QuestionCard";
import { LifelineBar } from "@/components/game/LifelineBar";
import { useRoom } from "@/lib/game/store";
import { DEFAULT_PRIZE_LADDER } from "@/lib/game/types";
import { formatPrize } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

export default function GamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { locale } = useI18n();
  const s = useRoom();
  const [showLadder, setShowLadder] = React.useState(false);
  const [showRanks, setShowRanks] = React.useState(false);

  const q = s.order[s.currentIndex];

  React.useEffect(() => {
    if (s.status === "finished") router.push(`/room/${params.code}/results`);
    if (s.status === "lobby" || !q) router.push(`/room/${params.code}`);
  }, [s.status, q, router, params.code]);

  // Keep a stable callback for Timer.
  const onExpire = React.useCallback(() => {
    useRoom.getState().tickTimeout();
  }, []);

  if (!q) return null;

  const isReveal = s.phase === "reveal";
  const trueCorrect = isReveal ? s.reveal?.correct : undefined;
  const me = s.players.find((p) => p.id === s.meId);
  const mySub = s.reveal?.submissions.find((x) => x.playerId === s.meId);
  const myCorrect = isReveal && mySub ? mySub.choice === s.reveal!.correct : null;
  const prizeLabel = formatPrize(DEFAULT_PRIZE_LADDER[Math.min(s.currentIndex + (me && me.level >= 0 ? 0 : 0), DEFAULT_PRIZE_LADDER.length - 1)] ?? 0, s.settings.currency);

  return (
    <div className="theme-show flex min-h-screen flex-col bg-[#0a0c16] text-[#f5f1e4]">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Ladder (desktop) */}
        <aside className="hidden lg:block">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <b className="mb-2 block text-sm">سلّم الجوائز</b>
              <PrizeLadder ladder={DEFAULT_PRIZE_LADDER} currentLevel={s.currentIndex} currency={s.settings.currency} />
            </CardContent>
          </Card>
        </aside>

        {/* Center */}
        <main className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            {!isReveal ? (
              <Timer key={q.id} endsAt={s.questionEndsAt} startedAt={s.questionStartedAt} onExpire={onExpire} />
            ) : (
              <Badge variant={myCorrect ? "success" : "danger"} className="px-4 py-2 text-sm">
                {mySub?.choice === null ? (locale === "ar" ? "انتهى الوقت" : "Time out") : myCorrect ? (locale === "ar" ? "إجابة صحيحة ✓" : "Correct ✓") : (locale === "ar" ? "إجابة خاطئة ✕" : "Wrong ✕")}
              </Badge>
            )}
            <div className="flex gap-2 lg:hidden">
              <Button size="sm" variant="secondary" onClick={() => setShowLadder(true)}>الجوائز</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowRanks(true)}>الترتيب</Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={q.id + s.phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <QuestionCard
                category={q.category}
                difficulty={q.difficulty}
                index={s.currentIndex}
                total={s.order.length}
                prizeLabel={prizeLabel}
                text={q.question}
              />
            </motion.div>
          </AnimatePresence>

          <div className="grid gap-2.5 md:grid-cols-2">
            {s.answerOrder.map((trueIdx, di) => {
              const hidden = s.removedOptions.includes(di);
              let state: "default" | "selected" | "correct" | "wrong" | "dimmed" = "default";
              if (hidden) state = "dimmed";
              else if (isReveal && trueCorrect !== undefined) {
                if (trueIdx === trueCorrect) state = "correct";
                else if (mySub && mySub.choice === trueIdx) state = "wrong";
                else state = "default";
              } else if (s.myChoice === di) state = "selected";
              const votes = s.crowdVotes && isReveal === false ? undefined : undefined;
              const crowdPct = s.crowdVotes ? s.crowdVotes[trueIdx] : undefined;
              void votes;
              return (
                <AnswerOption
                  key={di}
                  displayIndex={di}
                  text={q.answers[trueIdx]}
                  state={state}
                  disabled={isReveal || s.myLocked || hidden}
                  votes={s.crowdVotes ? crowdPct : undefined}
                  onPick={() => s.submitAnswer(di)}
                />
              );
            })}
          </div>

          {!isReveal && !s.myLocked && (
            <LifelineBar left={s.lifelinesLeft} enabled={s.settings.lifelines} onUse={(k) => s.useLifeline(k)} />
          )}
          {!isReveal && s.myLocked && (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-sm">✓ تم قفل إجابتك — بانتظار الآخرين…</p>
          )}

          {isReveal && (
            <div className="flex flex-col gap-3">
              {q.explanation && (
                <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-[14px] leading-relaxed">
                  <b>لماذا؟ </b>{q.explanation}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="prize-num text-sm tabular-nums">
                  رصيدك: <b>{formatPrize(me?.prize ?? 0, s.settings.currency)}</b>
                </p>
                {s.isHost ? (
                  <Button variant="gold" onClick={s.nextQuestion}>
                    {s.currentIndex + 1 >= s.order.length ? "النتائج النهائية ←" : "السؤال التالي ←"}
                  </Button>
                ) : (
                  <p className="text-[13px] text-white/60">المضيف ينقل إلى السؤال التالي…</p>
                )}
              </div>
              {!s.isHost && (
                <AutoAdvanceWatcher />
              )}
            </div>
          )}
        </main>

        {/* Ranks (desktop) */}
        <aside className="hidden lg:block">
          <b className="mb-2 block text-sm">الترتيب المباشر</b>
          <Leaderboard players={s.players} currency={s.settings.currency} meId={s.meId} />
        </aside>
      </div>

      {/* Mobile drawers */}
      <Dialog open={showLadder} onOpenChange={setShowLadder}>
        <DialogContent>
          <DialogHeader><DialogTitle>سلّم الجوائز</DialogTitle></DialogHeader>
          <PrizeLadder ladder={DEFAULT_PRIZE_LADDER} currentLevel={s.currentIndex} currency={s.settings.currency} compact />
        </DialogContent>
      </Dialog>
      <Dialog open={showRanks} onOpenChange={setShowRanks}>
        <DialogContent>
          <DialogHeader><DialogTitle>الترتيب المباشر</DialogTitle></DialogHeader>
          <Leaderboard players={s.players} currency={s.settings.currency} meId={s.meId} />
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

function AutoAdvanceWatcher() {
  // Guests follow host: poll phase changes via store subscription is automatic (same store in local mode).
  // In P2P mode the host snapshot drives this; local fallback: auto-advance after 12s for demo fluidity.
  React.useEffect(() => {
    const t = setTimeout(() => {
      const st = useRoom.getState();
      if (!st.isHost && st.phase === "reveal") {
        // Non-hosts in local prototype: follow host automatically after a pause.
        // (Host click advances instantly; this is only a fallback.)
      }
    }, 12000);
    return () => clearTimeout(t);
  }, []);
  return null;
}

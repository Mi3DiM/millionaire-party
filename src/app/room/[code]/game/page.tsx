"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header, Footer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/ui/GameIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timer } from "@/components/game/Timer";
import { PrizeLadder } from "@/components/game/PrizeLadder";
import { Leaderboard } from "@/components/game/Leaderboard";
import { QuestionCard, AnswerOption } from "@/components/game/QuestionCard";
import { LifelineBar } from "@/components/game/LifelineBar";
import { Halftime, RevealVeil, FlyingGain } from "@/components/game/StageFx";
import { MatchStatusBar } from "@/components/game/MatchStatusBar";
import { RoomStatus } from "@/components/room/RoomSync";
import { useRoom, currentStageKind } from "@/lib/game/store";
import { rankPlayers } from "@/lib/game/engine";
import { DEFAULT_PRIZE_LADDER, STAGE_META } from "@/lib/game/types";
import { crossedCheckpoint, leaderGap } from "@/lib/game/engine";
import { qualifiedIds } from "@/lib/game/engine";
import { formatPrize } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import { sfx, startMusic, stopMusic } from "@/lib/fx/audio";
import { haptics } from "@/lib/fx/haptics";

export default function GamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { locale } = useI18n();
  const s = useRoom();
  const [showLadder, setShowLadder] = React.useState(false);
  const [showRanks, setShowRanks] = React.useState(false);

  const q = s.order[s.currentIndex];
  const kind = currentStageKind(s);

  React.useEffect(() => {
    if (s.status === "finished") router.push(`/room/${params.code}/results`);
    if (s.status === "lobby" || !q) router.push(`/room/${params.code}`);
  }, [s.status, q, router, params.code]);

  // Background music lifecycle + mood follows stage tension.
  React.useEffect(() => {
    startMusic(kind === "final" || kind === "semifinal" ? "tense" : "soft");
    return () => stopMusic();
  }, [kind]);

  // Keep a stable callback for Timer.
  const onExpire = React.useCallback(() => {
    useRoom.getState().tickTimeout();
  }, []);

  const onSecond = React.useCallback((left: number) => {
    sfx.countdownTick(left);
    if (left <= 5 && left > 0) {
      // Heartbeat under the final seconds; single pulse at 5/4.
      if (left <= 3) haptics.heartbeat();
      else if (left === 5 || left === 4) haptics.critical();
    }
  }, []);

  // Stage-change fanfare.
  const prevKind = React.useRef(kind);
  React.useEffect(() => {
    if (prevKind.current !== kind) {
      prevKind.current = kind;
      sfx.stageHorn();
      haptics.stage();
    }
  }, [kind]);

  // Reveal feedback: sfx + haptics + rank-change chime.
  const me = s.players.find((p) => p.id === s.meId);
  // Guests never receive correctAnswer pre-reveal, so lifelines stay host-only.
  const isP2PGuest = !s.isHost && s.p2pRole === "guest";
  const mySub = s.reveal?.submissions.find((x) => x.playerId === s.meId);
  const isReveal = s.phase === "reveal";
  const myRank = React.useMemo(() => {
    const r = rankPlayers(s.players).findIndex((p) => p.id === s.meId);
    return r >= 0 ? r + 1 : null;
  }, [s.players, s.meId]);
  const prevRank = React.useRef<number | null>(null);
  const prevRevealQ = React.useRef<string | null>(null);
  // Which question the 3-2-1 veil has lifted for.
  const [veilDoneFor, setVeilDoneFor] = React.useState<string | null>(null);
  const qid = q?.id ?? null;
  const veilLifted = !!q && isReveal && veilDoneFor === q.id;
  // Visual reveal only after the veil lifts — gates colors, badge, explanation.
  const showReveal = isReveal && veilLifted;
  const myCorrect = showReveal && mySub ? mySub.choice === s.reveal!.correct : null;
  const handleVeilDone = React.useCallback(() => {
    setVeilDoneFor(qid);
  }, [qid]);
  // Note: no reset effect — a new qid implicitly makes veilLifted false
  // until its own veil completes, avoiding set-state-in-effect cascades.
  const gain = me && showReveal ? Math.max(0, me.prize - s.myPrizeAtStart) : 0;
  const hud = leaderGap(s.players, s.meId);
  const wentUp =
    me && showReveal
      ? me.prize > s.myPrizeAtStart
        ? true
        : me.prize < s.myPrizeAtStart
          ? false
          : null
      : null;
  React.useEffect(() => {
    // Sounds land with the reveal (after the 3-2-1 veil lifts), not behind it.
    if (showReveal && qid && prevRevealQ.current !== qid) {
      prevRevealQ.current = qid;
      if (mySub?.choice === null) {
        sfx.wrong();
        haptics.wrong();
      } else if (myCorrect) {
        // Checkpoint crossing gets the big fanfare; plain correct otherwise.
        if (me && crossedCheckpoint(s.myLevelAtStart, me.level)) sfx.prizeUp();
        else if (kind === "final") sfx.prizeUp();
        else sfx.correct();
        haptics.correct();
        const streak = (me?.streak ?? 0) + 1;
        if (streak >= 2) setTimeout(() => sfx.streak(streak), 450);
      } else {
        sfx.wrong();
        haptics.wrong();
      }
      if (prevRank.current !== null && myRank !== null && myRank < prevRank.current) {
        setTimeout(() => sfx.rankUp(), 500);
      }
    }
    if (isReveal && myRank !== null) prevRank.current = myRank;
    if (!isReveal) prevRevealQ.current = null;
  }, [isReveal, showReveal, qid, mySub, myCorrect, myRank, kind, me, s.myLevelAtStart]);

  // Lock feedback.
  const prevLocked = React.useRef(s.myLocked);
  React.useEffect(() => {
    if (s.myLocked && !prevLocked.current) {
      sfx.lock();
      haptics.lock();
    }
    prevLocked.current = s.myLocked;
  }, [s.myLocked]);

  if (!q) return null;

  const trueCorrect = showReveal ? s.reveal?.correct : undefined;
  const prizeLabel = formatPrize(DEFAULT_PRIZE_LADDER[Math.min(s.currentIndex, DEFAULT_PRIZE_LADDER.length - 1)] ?? 0, s.settings.currency);
  const meEliminated = !!me?.eliminated;
  const myWager = s.meId ? s.wagers[s.meId] : undefined;
  const needWager = kind === "wager" && !isReveal && !meEliminated && myWager === undefined;
  const qualifiedPreview =
    kind === "semifinal" || kind === "final"
      ? qualifiedIds(rankPlayers(s.players.filter((p) => !p.eliminated || true)))
      : s.players.filter((p) => !p.eliminated).map((p) => p.id);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {kind === "final" && <div className="stage-final-bg pointer-events-none fixed inset-0 z-0" aria-hidden />}
      <Header />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-6 lg:grid-cols-[260px_1fr_300px]">
        {/* Ladder (desktop) */}
        <aside className="hidden lg:block">
          <Card className="border-[var(--border)] bg-[var(--surface)]/60">
            <CardContent className="p-4">
              <b className="mb-2 flex items-center gap-2 text-sm"><GameIcon name="cup" size={17} className="text-[var(--accent-ink)]" /> سلّم الجوائز</b>
              <PrizeLadder ladder={DEFAULT_PRIZE_LADDER} currentLevel={me?.level ?? -1} markIndex={s.currentIndex} currency={s.settings.currency} />
            </CardContent>
          </Card>
        </aside>

        {/* Center */}
        <main className="flex min-w-0 flex-col gap-4">
          <RoomStatus variant="game" />
          <MatchStatusBar
            prize={me?.prize ?? 0}
            fromPrize={s.myPrizeAtStart}
            currency={s.settings.currency}
            rank={hud.rank}
            totalPlayers={s.players.length}
            gap={hud.gap}
            level={me?.level ?? -1}
            wagerPct={kind === "wager" ? myWager : undefined}
            wentUp={wentUp}
            stageKind={kind}
            questionIndex={s.currentIndex}
            questionTotal={s.order.length}
            showTournament={s.settings.tournament && s.stages.length > 1}
            speed={kind === "speed" && !isReveal}
            streak={me?.streak ?? 0}
            needWager={needWager}
            onWager={(pct) => { s.placeWager(pct); haptics.tap(); }}
          />
          <div className="flex min-h-[76px] items-center justify-between gap-3">
            {!isReveal ? (
              <Timer key={q.id + String(s.questionStartedAt)} endsAt={s.questionEndsAt} startedAt={s.questionStartedAt} onExpire={onExpire} onSecond={onSecond} />
            ) : !showReveal ? (
              <Badge variant="default" className="px-4 py-2 text-sm">
                {locale === "ar" ? "جاري الكشف…" : "Revealing…"}
              </Badge>
            ) : (
              <Badge variant={myCorrect ? "success" : "danger"} className="px-4 py-2 text-sm">
                {mySub?.choice === null ? (locale === "ar" ? "انتهى الوقت" : "Time out") : myCorrect ? (locale === "ar" ? "إجابة صحيحة ✓" : "Correct ✓") : (locale === "ar" ? "إجابة خاطئة ✕" : "Wrong ✕")}
              </Badge>
            )}
            <div className="flex gap-2 lg:hidden">
              <Button size="sm" variant="secondary" onClick={() => setShowLadder(true)}><GameIcon name="cup" size={16} /> الجوائز</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowRanks(true)}><GameIcon name="users" size={16} /> الترتيب</Button>
            </div>
          </div>

          {meEliminated && (
            <p className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-3 text-center text-sm">
              <GameIcon name="eye" size={18} /> أنت في الجمهور الآن — شاهد بقية {STAGE_META[kind].ar}!
            </p>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
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

          <motion.div
            key={q.id + (showReveal ? (myCorrect ? "-win" : "-lose") : "")}
            animate={showReveal && !myCorrect ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative grid gap-2.5 md:grid-cols-2"
          >
            {isReveal && !veilLifted && (
              <RevealVeil key={q.id} onDone={handleVeilDone} />
            )}
            {s.answerOrder.map((trueIdx, di) => {
              const hidden = s.removedOptions.includes(di);
              let state: "default" | "selected" | "correct" | "wrong" | "dimmed" = "default";
              if (hidden) state = "dimmed";
              else if (showReveal && trueCorrect !== undefined) {
                if (trueIdx === trueCorrect) state = "correct";
                else if (mySub && mySub.choice === trueIdx) state = "wrong";
                else state = "default";
              } else if (s.myChoice === di) state = "selected";
              const crowdPct = s.crowdVotes ? s.crowdVotes[trueIdx] : undefined;
              return (
                <AnswerOption
                  key={di}
                  displayIndex={di}
                  text={q.answers[trueIdx]}
                  state={state}
                  disabled={isReveal || s.myLocked || hidden || meEliminated || needWager || s.awaitingStage}
                  votes={s.crowdVotes ? crowdPct : undefined}
                  onPick={() => s.submitAnswer(di)}
                />
              );
            })}
          </motion.div>

          {!isReveal && !s.myLocked && !meEliminated && !needWager && !isP2PGuest && (
            <LifelineBar left={s.lifelinesLeft} enabled={s.settings.lifelines} onUse={(k) => s.useLifeline(k)} />
          )}
          {!isReveal && !s.myLocked && !meEliminated && !needWager && isP2PGuest && (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-3 text-center text-[12.5px] text-[var(--muted)]">
              وسائل المساعدة للمضيف فقط في الغرف المشتركة (لعدالة الكشف).
            </p>
          )}
          {!isReveal && s.myLocked && (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-3 text-center text-sm">✓ تم قفل إجابتك — بانتظار الآخرين…</p>
          )}

          {showReveal && (
            <div className="flex flex-col gap-3">
              {gain > 0 && (
                <div className="flex min-h-[40px] items-center justify-center">
                  <FlyingGain amount={gain} currency={s.settings.currency} />
                </div>
              )}
              {q.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-[14px] leading-relaxed"
                >
                  <b>لماذا؟ </b>{q.explanation}
                </motion.div>
              )}
              <div className="flex items-center justify-end gap-2">
                {s.isHost ? (
                  <Button variant="gold" onClick={s.nextQuestion}>
                    {s.currentIndex + 1 >= s.order.length ? "النتائج النهائية ←" : "السؤال التالي ←"}
                  </Button>
                ) : (
                  <p className="text-[13px] text-[var(--muted)]">المضيف ينقل إلى السؤال التالي…</p>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Ranks (desktop) */}
        <aside className="hidden lg:block">
          <b className="mb-2 flex items-center gap-2 text-sm"><GameIcon name="users" size={17} className="text-[var(--primary)]" /> الترتيب المباشر</b>
          <Leaderboard players={s.players} currency={s.settings.currency} meId={s.meId} />
        </aside>
      </div>

      {/* Halftime overlay */}
      {s.awaitingStage && (
        <Halftime
          kind={kind}
          players={s.players}
          currency={s.settings.currency}
          meId={s.meId}
          isHost={s.isHost}
          qualifiedPreview={qualifiedPreview}
          onContinue={() => { s.continueStage(); }}
        />
      )}

      {/* Mobile drawers */}
      <Dialog open={showLadder} onOpenChange={setShowLadder}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GameIcon name="cup" size={18} className="text-[var(--accent-ink)]" /> سلّم الجوائز</DialogTitle></DialogHeader>
          <PrizeLadder ladder={DEFAULT_PRIZE_LADDER} currentLevel={me?.level ?? -1} markIndex={s.currentIndex} currency={s.settings.currency} compact />
        </DialogContent>
      </Dialog>
      <Dialog open={showRanks} onOpenChange={setShowRanks}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GameIcon name="users" size={18} className="text-[var(--primary)]" /> الترتيب المباشر</DialogTitle></DialogHeader>
          <Leaderboard players={s.players} currency={s.settings.currency} meId={s.meId} />
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

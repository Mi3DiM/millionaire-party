"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { GameIcon } from "@/components/ui/GameIcon";
import { Confetti, CountUp } from "@/components/game/StageFx";
import { useRoom, selectRankedPlayers } from "@/lib/game/store";
import { formatPrize } from "@/lib/utils";
import { sfx } from "@/lib/fx/audio";
import { haptics } from "@/lib/fx/haptics";

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const s = useRoom();
  const ranked = selectRankedPlayers(s.players);
  const winner = ranked[0];
  const meWon = !!winner && winner.id === s.meId;

  React.useEffect(() => {
    sfx.victory();
    if (meWon) haptics.victory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (s.players.length === 0) {
    return (
      <div className="flex min-h-screen flex-col"><Header />
        <PageContainer><Card><CardContent className="p-8 text-center">لا توجد نتائج بعد.</CardContent></Card></PageContainer>
        <Footer /></div>
    );
  }

  return (
    <div className="theme-show flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <Confetti fire />
      <PageContainer>
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {winner && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="theme-show border-[var(--accent)]/40 bg-[#0a0c16] text-center text-[#f5f1e4]">
                <CardContent className="flex flex-col items-center gap-3 p-8">
                  <GameIcon name="crown" size={52} className="text-[var(--accent)]" />
                  <p className="text-sm text-white/60">الفائز</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={winner.name} avatarId={winner.avatarId} size={56} />
                    <b className="text-2xl">{winner.name}</b>
                  </div>
                  <p className="prize-num text-4xl font-black text-[var(--accent)] tabular-nums">
                    <CountUp value={winner.prize} currency={s.settings.currency} />
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card>
            <CardHeader><CardTitle>الترتيب النهائي</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {ranked.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                  <span className={`prize-num flex size-8 items-center justify-center rounded-xl font-black ${i === 0 ? "bg-[var(--accent)] text-[#1a1405]" : "bg-[var(--elevated)] text-[var(--muted)]"}`}>{i + 1}</span>
                  <Avatar name={p.name} avatarId={p.avatarId} size={40} />
                  <div className="flex-1 leading-tight">
                    <b className="text-[14px]">{p.name}</b>
                    <p className="text-[12px] text-[var(--muted)]">
                      {p.correctCount} صح · دقة {s.order.length ? Math.round((p.correctCount / s.order.length) * 100) : 0}٪ · أفضل سلسلة {p.bestStreak} · متوسط {(p.correctCount ? Math.round(p.totalResponseMs / p.correctCount / 100) / 10 : 0)}s
                    </p>
                  </div>
                  <b className="prize-num tabular-nums">{formatPrize(p.prize, s.settings.currency)}</b>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => { s.resetToLobby(); router.push(`/room/${params.code}`); }}>العب مجدداً</Button>
            <Button variant="secondary" onClick={() => { s.leaveRoom(); router.push("/create"); }}>غرفة جديدة</Button>
            <Button variant="ghost" onClick={() => { s.leaveRoom(); router.push("/"); }}>الرئيسية</Button>
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

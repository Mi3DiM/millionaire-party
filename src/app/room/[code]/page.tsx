"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { RoomCode } from "@/components/room/RoomCode";
import { BankManager } from "@/components/room/BankManager";
import { useRoom } from "@/lib/game/store";
import { categoryName, difficultyName } from "@/data/questions";
import { useI18n } from "@/i18n/provider";
import type { QuestionBank } from "@/lib/game/types";
import { MATCH_PRESETS } from "@/lib/game/types";
import { useToast } from "@/components/ui/toast";

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { locale } = useI18n();
  const { push } = useToast();
  const s = useRoom();
  const [customBanks, setCustomBanks] = React.useState<QuestionBank[]>([]);

  React.useEffect(() => {
    if (s.status === "playing" || s.status === "reveal") {
      router.push(`/room/${params.code}/game`);
    }
  }, [s.status, router, params.code]);

  if (!s.code) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <PageContainer>
          <Card><CardContent className="p-8 text-center">
            <p className="font-bold">لا توجد غرفة نشطة في هذا المتصفح.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">أنشئ غرفة جديدة أو انضم برمز.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => router.push("/create")}>إنشاء غرفة</Button>
              <Button variant="secondary" onClick={() => router.push("/join")}>انضمام</Button>
            </div>
          </CardContent></Card>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  const me = s.players.find((p) => p.id === s.meId);
  const allReady = s.players.length >= 1 && s.players.every((p) => p.ready || p.isHost);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer wide>
        <div className="grid gap-4 lg:grid-cols-[340px_1fr_320px]">
          {/* Room + settings */}
          <div className="flex flex-col gap-4">
            <RoomCode code={s.code} />
            <Card>
              <CardHeader><CardTitle className="text-[15px]">إعدادات اللعبة</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-[13.5px]">
                <Row k="الفئات" v={s.settings.categories.includes("mixed") ? "منوعة" : s.settings.categories.map((c) => categoryName(c, locale)).join("، ")} />
                <Row k="الصعوبة" v={difficultyName(s.settings.difficulty, locale)} />
                <Row k="المدة" v={`${MATCH_PRESETS[s.settings.matchLength]?.ar ?? s.settings.matchLength} · ${MATCH_PRESETS[s.settings.matchLength]?.minutes ?? ""}`} />
                <Row k="النظام" v={s.settings.tournament ? "🏆 بطولة مراحل" : "جولة كلاسيكية"} />
                <Row k="الأسئلة" v={`${s.settings.questionCount}${s.settings.tournament ? " + جولات خاصة" : ""}`} />
                <Row k="المؤقت" v={`${s.settings.timerSeconds}s`} />
                <Row k="اللاعبون" v={`${s.players.length} / ${s.settings.maxPlayers}`} />
                <Row k="البنك" v={s.bank?.name ?? "—"} />
                {s.connectionNote && <p className="mt-1 text-[12px] text-[var(--muted)]">{s.connectionNote}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Players */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>اللاعبون ({s.players.length})</CardTitle>
                <CardDescription>{s.isHost ? "أنت المضيف — ابدأ عندما يكون الجميع مستعداً." : "اضغط «مستعد» ثم انتظر المضيف."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {s.players.map((p) => (
                  <div key={p.id} className="anim-rise flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                    <Avatar name={p.name} avatarId={p.avatarId} size={44} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <b className="truncate text-[14px]">{p.name} {p.id === s.meId && "(أنت)"}</b>
                      <div className="mt-1 flex gap-1.5">
                        {p.isHost ? <Badge variant="gold">مضيف</Badge> : p.ready ? <Badge variant="success">مستعد ✓</Badge> : <Badge>يفكر…</Badge>}
                        {p.isBot && <Badge variant="info">افتراضي</Badge>}
                      </div>
                    </div>
                    {s.isHost && !p.isHost && (
                      <Button size="sm" variant="ghost" onClick={() => s.removePlayer(p.id)}>✕</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {s.isHost && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[15px]">بنك الأسئلة (المضيف فقط)</CardTitle>
                  <CardDescription>اختيار بنك أو رفع ملف جديد. يُقفل التسلسل عند بدء اللعبة.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BankManager
                    selectedId={s.bank?.id ?? null}
                    onSelect={(b) => s.setBank(b)}
                    customBanks={customBanks}
                    onImport={(b) => { setCustomBanks((prev) => [...prev, b]); s.setBank(b); }}
                    onDelete={(id) => setCustomBanks((prev) => prev.filter((b) => b.id !== id))}
                    compact
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              {!s.isHost && (
                <Button variant={me?.ready ? "secondary" : "gold"} onClick={s.toggleReady}>
                  {me?.ready ? "إلغاء الاستعداد" : "مستعد ✓"}
                </Button>
              )}
              {s.isHost && (
                <>
                  <Button variant="secondary" onClick={s.addBot}>+ لاعب افتراضي</Button>
                  <Button variant="secondary" onClick={s.toggleLock}>{s.settings.locked ? "فتح الغرفة" : "قفل الغرفة"}</Button>
                  <Button
                    variant="gold"
                    disabled={!s.bank || s.players.length === 0}
                    onClick={() => {
                      if (!s.bank) { push({ title: "اختر بنك أسئلة أولاً", kind: "error" }); return; }
                      s.startGame();
                      router.push(`/room/${s.code}/game`);
                    }}
                  >
                    ابدأ اللعبة ←
                  </Button>
                </>
              )}
            </div>
            {s.isHost && !allReady && <p className="text-[12.5px] text-[var(--warning)]">بعض اللاعبين غير مستعدين — يمكنك البدء على أي حال أو الانتظار.</p>}
          </div>

          {/* Rules */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle className="text-[15px]">كيف تُلعب؟</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
                <p>1. الجميع يستقبل <b className="text-[var(--foreground)]">نفس السؤال</b> في نفس اللحظة.</p>
                <p>2. أجب قبل انتهاء <b className="text-[var(--foreground)]">المؤقت</b> — السرعة ترفع ترتيبك.</p>
                <p>3. الكشف <b className="text-[var(--foreground)]">متزامن</b> ثم سلّم الجوائز والترتيب.</p>
                <p>4. نقاط الأمان ◆ تحفظ جزءاً من رصيدك عند الخطأ.</p>
              </CardContent>
            </Card>
            <Button variant="ghost" onClick={() => { s.leaveRoom(); router.push("/"); }}>مغادرة الغرفة</Button>
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--muted)]">{k}</span>
      <b className="text-start">{v}</b>
    </div>
  );
}

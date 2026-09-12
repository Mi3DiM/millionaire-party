"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, Switch } from "@/components/ui/select";
import { Avatar, AVATARS } from "@/components/ui/avatar";
import { useRoom } from "@/lib/game/store";
import { builtinBanks, CATEGORIES, difficultyName } from "@/data/questions";
import { DEFAULT_SETTINGS, MATCH_PRESETS, type MatchLength, type QuestionBank, type RoomSettings } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function CreateRoomPage() {
  const router = useRouter();
  const { push } = useToast();
  const createRoom = useRoom((s) => s.createRoom);
  const [name, setName] = React.useState("");
  const [avatarId, setAvatarId] = React.useState<string>("falcon");
  const [settings, setSettings] = React.useState<RoomSettings>(DEFAULT_SETTINGS);
  const [bankId, setBankId] = React.useState("builtin-mixed");
  const [mode, setMode] = React.useState<"local" | "p2p">("p2p");
  const banks = React.useMemo(() => builtinBanks(), []);

  const toggleCategory = (id: string) => {
    setSettings((s) => {
      if (id === "mixed") return { ...s, categories: ["mixed"] };
      const without = s.categories.filter((c) => c !== "mixed" && c !== id);
      const next = s.categories.includes(id) ? without : [...without, id];
      return { ...s, categories: next.length ? next : ["mixed"] };
    });
  };

  const submit = () => {
    if (name.trim().length < 2) {
      push({ title: "اختر اسماً من حرفين على الأقل", kind: "error" });
      return;
    }
    const bank: QuestionBank = banks.find((b) => b.id === bankId) ?? banks[0];
    const code = createRoom({ name: name.trim(), avatarId, settings, bank, mode });
    router.push(`/room/${code}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <h1 className="text-2xl font-black">إنشاء غرفة جديدة</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">أنت المضيف: إعداداتك + بنك الأسئلة يحددان اللعبة للجميع.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>هويتك كمضيف</CardTitle>
                <CardDescription>اسم مؤقت داخل هذه الغرفة فقط — بدون حساب.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[var(--muted)]">اسم اللاعب</span>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أمين" maxLength={24} />
                </label>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--muted)]">الصورة الرمزية</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAvatarId(a.id)}
                        title={a.label}
                        className={cn("rounded-2xl border-2 p-1 transition-all", avatarId === a.id ? "border-[var(--accent)]" : "border-transparent hover:border-[var(--border)]")}
                      >
                        <Avatar name={name || a.label} avatarId={a.id} size={44} />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إعدادات اللعبة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Select label="الصعوبة" value={settings.difficulty} onValueChange={(v) => setSettings((s) => ({ ...s, difficulty: v as RoomSettings["difficulty"] }))} options={["mixed", "easy", "medium", "hard", "expert"].map((d) => ({ value: d, label: difficultyName(d) }))} />
                <Select label="عدد الأسئلة (التصفيات+نصف النهائي)" value={String(settings.questionCount)} onValueChange={(v) => setSettings((s) => ({ ...s, questionCount: Number(v) }))} options={[6, 8, 12, 16, 22, 30].map((n) => ({ value: String(n), label: `${n} أسئلة` }))} />
                <Select label="المؤقت (ثانية)" value={String(settings.timerSeconds)} onValueChange={(v) => setSettings((s) => ({ ...s, timerSeconds: Number(v) }))} options={[10, 15, 20, 30, 45].map((n) => ({ value: String(n), label: `${n}s` }))} />
                <Select label="أقصى اللاعبين" value={String(settings.maxPlayers)} onValueChange={(v) => setSettings((s) => ({ ...s, maxPlayers: Number(v) }))} options={[4, 6, 8, 10, 12].map((n) => ({ value: String(n), label: `${n} لاعبين` }))} />
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-[13px] font-semibold text-[var(--muted)]">الفئات (اختر واحدة أو أكثر)</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleCategory("mixed")} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-bold", settings.categories.includes("mixed") ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-[var(--border)]")}>منوع ⌁</button>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} type="button" onClick={() => toggleCategory(c.id)} className={cn("rounded-full border px-3 py-1.5 text-[13px]", settings.categories.includes(c.id) ? "border-[var(--primary)] bg-[var(--primary)]/10 font-bold" : "border-[var(--border)]")}>{c.ar}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <span className="text-[13px] font-semibold text-[var(--muted)]">مدة المباراة</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(MATCH_PRESETS) as MatchLength[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const p = MATCH_PRESETS[m];
                          setSettings((s) => ({ ...s, matchLength: m, questionCount: p.questions, timerSeconds: p.timer }));
                        }}
                        className={cn("rounded-2xl border p-3 text-center transition-all", settings.matchLength === m ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:bg-[var(--elevated)]")}
                      >
                        <b className="block text-[14px]">{MATCH_PRESETS[m].ar}</b>
                        <small className="text-[var(--muted)]">{MATCH_PRESETS[m].minutes}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2 rounded-2xl border border-[var(--border)] p-3">
                  <Switch checked={settings.tournament} onCheckedChange={(v) => setSettings((s) => ({ ...s, tournament: v }))} label="بطولة مراحل (تصفيات ← سرعة ← نصف نهائي ← رهان ← نهائي)" />
                  <p className="text-[12px] text-[var(--muted)]">يتأهل أصحاب المراكز الأولى فقط. إيقافها = جولة كلاسيكية واحدة.</p>
                </div>
                <div className="flex flex-col gap-2.5 sm:col-span-2">
                  <span className="text-[13px] font-semibold text-[var(--muted)]">وسائل المساعدة</span>
                  <div className="flex flex-wrap gap-5">
                    <Switch checked={settings.lifelines.fifty} onCheckedChange={(v) => setSettings((s) => ({ ...s, lifelines: { ...s.lifelines, fifty: v } }))} label="50/50" />
                    <Switch checked={settings.lifelines.crowd} onCheckedChange={(v) => setSettings((s) => ({ ...s, lifelines: { ...s.lifelines, crowd: v } }))} label="الجمهور" />
                    <Switch checked={settings.lifelines.extraTime} onCheckedChange={(v) => setSettings((s) => ({ ...s, lifelines: { ...s.lifelines, extraTime: v } }))} label="+15 ثانية" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Select label="وضع الاتصال" value={mode} onValueChange={(v) => setMode(v as "local" | "p2p")} options={[{ value: "p2p", label: "P2P حقيقي (أجهزة مختلفة، بدون سيرفر)" }, { value: "local", label: "محلي + لاعبون افتراضيون (تجربة سريعة)" }]} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>بنك الأسئلة</CardTitle>
                <CardDescription>{banks[0].questions.length} سؤالاً مدمجاً. يمكنك رفع بنكك من الردهة.</CardDescription>
              </CardHeader>
              <CardContent className="flex max-h-[380px] flex-col gap-2 overflow-auto">
                {banks.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBankId(b.id)} className={cn("flex items-center justify-between rounded-2xl border p-3 text-start", bankId === b.id ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:bg-[var(--elevated)]")}>
                    <span><b className="text-[14px]">{b.name}</b><br /><small className="text-[var(--muted)]">{b.questions.length} سؤالاً</small></span>
                    {bankId === b.id && <span>✓</span>}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Button size="lg" variant="gold" onClick={submit}>إنشاء الغرفة ←</Button>
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

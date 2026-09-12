"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AVATARS } from "@/components/ui/avatar";
import { useRoom } from "@/lib/game/store";
import { normalizeRoomCode } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function JoinForm({ presetCode }: { presetCode?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const joinRoom = useRoom((s) => s.joinRoom);
  const [name, setName] = React.useState("");
  const [avatarId, setAvatarId] = React.useState("star");
  const [code, setCode] = React.useState(presetCode ?? "");
  const [busy, setBusy] = React.useState(false);

  const submit = () => {
    if (name.trim().length < 2) {
      push({ title: "اختر اسماً من حرفين على الأقل", kind: "error" });
      return;
    }
    const clean = normalizeRoomCode(code);
    if (clean.length < 4) {
      push({ title: "رمز الغرفة غير صالح", hint: "مثال: 7K4P9", kind: "error" });
      return;
    }
    setBusy(true);
    const res = joinRoom({ code: clean, name: name.trim(), avatarId });
    setBusy(false);
    if (!res.ok) {
      push({ title: res.error ?? "تعذّر الانضمام", kind: "error" });
      return;
    }
    push({ title: "تم الانضمام إلى الغرفة", kind: "success" });
    router.push(`/room/${clean}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>انضم إلى غرفة</CardTitle>
        <CardDescription>اسم مؤقت + رمز الغرفة. لا حاجة لأي حساب.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--muted)]">رمز الغرفة</span>
          <Input value={code} onChange={(e) => setCode(normalizeRoomCode(e.target.value))} placeholder="7K4P9" dir="ltr" maxLength={6} className="prize-num text-center text-2xl font-black tracking-[0.3em]" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--muted)]">اسم اللاعب</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: سارة" maxLength={24} />
        </label>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-[var(--muted)]">الصورة الرمزية</p>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pb-1">
            {AVATARS.map((a) => (
              <button key={a.id} type="button" onClick={() => setAvatarId(a.id)} className={cn("rounded-2xl border-2 p-1", avatarId === a.id ? "border-[var(--accent)]" : "border-transparent hover:border-[var(--border)]")}>
                <Avatar name={name || a.label} avatarId={a.id} size={42} />
              </button>
            ))}
          </div>
        </div>
        <Button size="lg" variant="gold" onClick={submit} disabled={busy}>
          {busy ? "جارٍ الانضمام…" : "انضم إلى الغرفة ←"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <div className="mx-auto max-w-lg">
          <JoinForm />
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

export function JoinWithCode() {
  const params = useParams<{ code: string }>();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <div className="mx-auto max-w-lg">
          <JoinForm presetCode={(params.code ?? "").toUpperCase()} />
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function RoomCode({ code }: { code: string }) {
  const { push } = useToast();
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      push({ title: msg, kind: "success" });
    } catch {
      push({ title: "تعذّر النسخ", hint: text, kind: "error" });
    }
  };
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/8 p-5">
      <span className="text-[12px] font-bold text-[var(--muted)]">رمز الغرفة</span>
      <span className="prize-num text-4xl font-black tracking-[0.2em] tabular-nums" dir="ltr">
        {code}
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => copy(code, "تم نسخ الرمز")}>
          نسخ الرمز
        </Button>
        <Button size="sm" variant="secondary" onClick={() => copy(joinUrl, "تم نسخ رابط الدعوة")}>
          نسخ الرابط
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">QR</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>امسح للانضمام</DialogTitle>
              <DialogDescription>{joinUrl}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

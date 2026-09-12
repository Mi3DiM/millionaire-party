"use client";

import * as React from "react";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/components/app/providers";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const [sound, setSound] = React.useState(() => {
    try {
      return typeof window === "undefined" ? true : localStorage.getItem("millionaire:sound") !== "off";
    } catch {
      return true;
    }
  });
  const [motion, setMotion] = React.useState(() => {
    try {
      return typeof window === "undefined" ? true : localStorage.getItem("millionaire:motion") !== "reduced";
    } catch {
      return true;
    }
  });

  const save = (k: string, v: string) => {
    try { localStorage.setItem(k, v); } catch {}
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        <h1 className="text-2xl font-black">الإعدادات</h1>
        <div className="mt-6 grid max-w-2xl gap-3">
          <Card><CardHeader><CardTitle className="text-[15px]">اللغة / Language</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant={locale === "ar" ? "default" : "secondary"} onClick={() => setLocale("ar")}>العربية RTL</Button>
              <Button size="sm" variant={locale === "en" ? "default" : "secondary"} onClick={() => setLocale("en")}>English LTR</Button>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-[15px]">المظهر</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant={theme === "dark" ? "default" : "secondary"} onClick={() => setTheme("dark")}>داكن</Button>
              <Button size="sm" variant={theme === "light" ? "default" : "secondary"} onClick={() => setTheme("light")}>فاتح</Button>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-[15px]">الصوت والحركة</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Switch checked={sound} onCheckedChange={(v) => { setSound(v); save("millionaire:sound", v ? "on" : "off"); }} label="المؤثرات الصوتية (اختيارية)" />
              <Switch checked={motion} onCheckedChange={(v) => { setMotion(v); save("millionaire:motion", v ? "full" : "reduced"); document.documentElement.style.setProperty("scroll-behavior", v ? "smooth" : "auto"); }} label="الحركة الكاملة (أوقفها لتقليل الحركة)" />
              <Button size="sm" variant="secondary" onClick={() => push({ title: "حُفظت الإعدادات", kind: "success" })}>حفظ</Button>
            </CardContent></Card>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

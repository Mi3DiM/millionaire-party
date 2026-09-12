"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { Header, Footer, PageContainer } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_QUESTIONS, CATEGORIES } from "@/data/questions";
import { formatPrize } from "@/lib/utils";
import { DEFAULT_PRIZE_LADDER } from "@/lib/game/types";

export default function Home() {
  const { dict, locale } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer>
        {/* HERO */}
        <section className="grid items-center gap-8 py-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-5">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="gold">بدون حسابات · غرف خاصة · نفس الأسئلة للجميع</Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl font-black leading-[1.4] md:text-5xl md:leading-[1.4]"
            >
              {dict.heroTitle}
            </motion.h1>
            <p className="max-w-xl text-[16px] leading-[2] text-[var(--muted)]">{dict.heroSub}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/create">
                <Button size="lg" variant="gold">{dict.createRoom}</Button>
              </Link>
              <Link href="/join">
                <Button size="lg" variant="secondary">{dict.joinRoom}</Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-[13px] text-[var(--muted)]">
              <Link href="/how-to-play" className="rounded-xl px-3 py-1.5 hover:bg-[var(--elevated)]">← {dict.howToPlay}</Link>
              <Link href="/categories" className="rounded-xl px-3 py-1.5 hover:bg-[var(--elevated)]">← {dict.categories}</Link>
            </div>
          </div>

          {/* Prize visual */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="theme-show overflow-hidden border-[var(--accent)]/30 bg-[#0a0c16] text-[#f5f1e4]">
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <b className="text-sm">سلّم الجوائز</b>
                  <Badge variant="gold">{ALL_QUESTIONS.length} سؤالاً · {CATEGORIES.length} فئة</Badge>
                </div>
                {[...DEFAULT_PRIZE_LADDER].reverse().slice(0, 8).map((v, i) => (
                  <div
                    key={v}
                    className={`prize-num flex justify-between rounded-xl px-3 py-1.5 text-[13px] tabular-nums ${i === 2 ? "anim-glow bg-[var(--accent)] font-black text-[#1a1405]" : "bg-white/5 text-white/70"}`}
                  >
                    <span>المستوى {15 - i}</span>
                    <span>{formatPrize(v, "دج")}</span>
                  </div>
                ))}
                <p className="mt-1 text-center text-[12px] text-white/50">نفس السؤال · نفس المؤقت · كشف متزامن</p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* HOW IT WORKS */}
        <section className="grid gap-3 py-6 md:grid-cols-4">
          {[
            { t: "أنشئ غرفة", d: "اختر الفئات والصعوبة والمؤقت ووسائل المساعدة.", i: "◈" },
            { t: "شارك الرمز", d: "رمز قصير + رابط + QR. انضمام بالاسم فقط.", i: "⎙" },
            { t: "أجيبوا معاً", d: "نفس الأسئلة للجميع تحت نفس المؤقت.", i: "◷" },
            { t: "اصعد السلّم", d: "السرعة والدقة تصنعان الفائز بالمليون.", i: "♛" },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-5">
                  <span className="text-2xl" aria-hidden>{s.i}</span>
                  <b>{s.t}</b>
                  <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{s.d}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* CATEGORIES STRIP */}
        <section className="py-6">
          <h2 className="mb-3 text-lg font-black">{locale === "ar" ? "فئات الأسئلة" : "Categories"}</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href="/categories">
                <Badge variant="default" className="cursor-pointer px-3 py-1.5 text-[13px] hover:border-[var(--primary)]">
                  {locale === "ar" ? c.ar : c.en}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      </PageContainer>
      <Footer />
    </div>
  );
}

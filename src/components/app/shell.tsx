"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { GameIcon } from "@/components/ui/GameIcon";

export function Header() {
  const { dict, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-[#1a1405]">
            <GameIcon name="medalStar" size={24} />
          </span>
          <span className="flex flex-col leading-tight">
            <b className="text-[15px]">{dict.brand}</b>
            <small className="text-[11px] text-[var(--muted)]">{dict.tagline}</small>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link className="rounded-xl px-3 py-2 hover:bg-[var(--elevated)]" href="/how-to-play">
            {dict.howToPlay}
          </Link>
          <Link className="rounded-xl px-3 py-2 hover:bg-[var(--elevated)]" href="/categories">
            {dict.categories}
          </Link>
          <Link className="rounded-xl px-3 py-2 hover:bg-[var(--elevated)]" href="/settings">
            {dict.settings}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
            {locale === "ar" ? "EN" : "عربي"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "وضع فاتح" : "وضع داكن"}>
            <GameIcon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { dict } = useI18n();
  return (
    <footer className="mt-auto border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[13px] text-[var(--muted)] md:flex-row">
        <p>
          {dict.brand} — {dict.tagline}
        </p>
        <p className="prize-num">P2P serverless · no accounts · DZD</p>
      </div>
    </footer>
  );
}

export function PageContainer({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-6xl"} px-4 py-8`}>{children}</div>;
}

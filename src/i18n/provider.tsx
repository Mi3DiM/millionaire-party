"use client";

import * as React from "react";
import { ar, en, type Locale, type Dict } from "@/i18n/dict";

const Ctx = React.createContext<{
  locale: Locale;
  dict: Dict;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
}>({ locale: "ar", dict: ar, dir: "rtl", setLocale: () => {} });

export function useI18n() {
  return React.useContext(Ctx);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("millionaire:locale") : null;
      return saved === "en" || saved === "ar" ? saved : "ar";
    } catch {
      return "ar";
    }
  });
  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("millionaire:locale", l);
    } catch {}
  }, []);

  // Sync <html> attributes when locale changes (external system sync — allowed).
  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = React.useMemo(
    () => ({ locale, dict: locale === "ar" ? ar : en, dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const), setLocale }),
    [locale, setLocale]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

"use client";

import * as React from "react";
import { I18nProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/ui/toast";
import { useGlobalClickSfx } from "@/lib/fx/audio";

function SfxMount() {
  useGlobalClickSfx();
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("millionaire:theme") : null;
      return saved === "light" || saved === "dark" ? saved : "dark";
    } catch {
      return "dark";
    }
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("millionaire:theme", theme);
    } catch {}
  }, [theme]);

  return (
    <I18nProvider>
      <ToastProvider>
        <SfxMount />
        <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
      </ToastProvider>
    </I18nProvider>
  );
}

const ThemeCtx = React.createContext<{ theme: string; setTheme: (t: "light" | "dark") => void }>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return React.useContext(ThemeCtx);
}

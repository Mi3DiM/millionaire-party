"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: string; title: string; hint?: string; kind?: "info" | "success" | "error" };

const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void }>({
  push: () => {},
});

export function useToast() {
  return React.useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "anim-pop pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-4 py-3 shadow-[var(--shadow-pop)]",
              t.kind === "success" && "border-[var(--success)]/40",
              t.kind === "error" && "border-[var(--danger)]/40"
            )}
          >
            <p className="text-sm font-bold">{t.title}</p>
            {t.hint && <p className="text-[13px] text-[var(--muted)]">{t.hint}</p>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

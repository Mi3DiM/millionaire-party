"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { categoryName, difficultyName } from "@/data/questions";
import { useI18n } from "@/i18n/provider";

const LETTERS = ["A", "B", "C", "D"];

export function AnswerOption({
  displayIndex,
  text,
  state,
  onPick,
  disabled,
  votes,
}: {
  displayIndex: number;
  text: string;
  state: "default" | "selected" | "correct" | "wrong" | "dimmed";
  onPick: () => void;
  disabled?: boolean;
  votes?: number;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      aria-pressed={state === "selected"}
      className={cn(
        "group flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 text-start transition-all active:scale-[0.99]",
        state === "default" && "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--elevated)]",
        state === "selected" && "border-[var(--primary)] bg-[var(--primary)]/10",
        state === "correct" && "border-[var(--success)] bg-[var(--success)]/15",
        state === "wrong" && "border-[var(--danger)] bg-[var(--danger)]/10",
        state === "dimmed" && "border-[var(--border)] opacity-35",
        disabled && state === "default" && "cursor-default"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black",
          state === "correct" ? "bg-[var(--success)] text-white" : state === "wrong" ? "bg-[var(--danger)] text-white" : state === "selected" ? "bg-[var(--primary)] text-white" : "bg-[var(--elevated)] text-[var(--muted)] group-hover:text-[var(--primary)]"
        )}
      >
        {LETTERS[displayIndex]}
      </span>
      <span className="flex-1 text-[15px] font-medium leading-relaxed">{text}</span>
      {state === "correct" && <span aria-hidden>✓</span>}
      {state === "wrong" && <span aria-hidden>✕</span>}
      {votes !== undefined && <span className="prize-num text-[13px] font-black">{votes}٪</span>}
    </button>
  );
}

export function QuestionCard({
  category,
  difficulty,
  index,
  total,
  prizeLabel,
  text,
}: {
  category: string;
  difficulty: string;
  index: number;
  total: number;
  prizeLabel: string;
  text: string;
}) {
  const { locale } = useI18n();
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] md:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{categoryName(category, locale)}</Badge>
        <Badge>{difficultyName(difficulty, locale)}</Badge>
        <span className="ms-auto text-[12.5px] text-[var(--muted)]">
          {locale === "ar" ? `السؤال ${index + 1} / ${total}` : `Question ${index + 1} / ${total}`}
        </span>
      </div>
      <p className="prize-num mt-2 text-[13px] font-black text-[var(--accent)]">{prizeLabel}</p>
      <h1 className="mt-3 text-xl font-bold leading-[1.9] md:text-2xl md:leading-[1.9]">{text}</h1>
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[13px] font-semibold text-[var(--muted)]">{label}</span>}
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="min-h-[44px] w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium focus:border-[var(--ring)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex cursor-pointer items-center gap-2.5"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--primary)]" : "bg-[var(--elevated)] border border-[var(--border)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
            checked ? "start-[22px]" : "start-0.5"
          )}
        />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

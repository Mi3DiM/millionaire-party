import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold w-fit",
  {
    variants: {
      variant: {
        default: "border-[var(--border)] bg-[var(--elevated)] text-[var(--foreground)]",
        gold: "border-transparent bg-[var(--accent)]/15 text-[var(--accent-ink)]",
        success: "border-transparent bg-[var(--success)]/12 text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning)]/12 text-[var(--warning)]",
        danger: "border-transparent bg-[var(--danger)]/12 text-[var(--danger)]",
        info: "border-transparent bg-[var(--primary)]/12 text-[var(--primary)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

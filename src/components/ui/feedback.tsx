import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-2xl bg-[var(--elevated)] border border-[var(--border)]", className)} {...props} />;
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn("h-px w-full bg-[var(--border)]", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="font-bold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-[var(--muted)] leading-relaxed">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-10 text-center">
      <p className="font-bold text-[var(--danger)]">{title}</p>
      {hint && <p className="max-w-md text-sm text-[var(--muted)] leading-relaxed">{hint}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}

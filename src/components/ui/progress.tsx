import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--elevated)] border border-[var(--border)]", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 rounded-full bg-[var(--primary)] transition-transform duration-300"
        style={{ transform: `translateX(${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
// Note: translateX works for both directions visually since bar fills; RTL handled by parent dir.

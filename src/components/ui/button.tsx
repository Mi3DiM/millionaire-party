import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] min-h-[44px] px-5",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow hover:brightness-110",
        gold: "bg-[var(--accent)] text-[#1a1405] shadow hover:brightness-105",
        secondary: "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-sm hover:bg-[var(--elevated)]",
        ghost: "hover:bg-[var(--elevated)] text-[var(--foreground)]",
        danger: "bg-[var(--danger)] text-white hover:brightness-110",
        success: "bg-[var(--success)] text-white hover:brightness-110",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5",
        sm: "min-h-[36px] px-3.5 text-[13px] rounded-xl",
        lg: "min-h-[52px] px-7 text-base rounded-2xl",
        icon: "size-11 rounded-2xl px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };

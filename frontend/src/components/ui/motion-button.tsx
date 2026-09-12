import { m } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonHover, buttonTap } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--clip-accent)] text-[var(--clip-accent-fg)] hover:opacity-95",
  secondary:
    "border border-[var(--clip-border)] bg-transparent text-[var(--clip-fg)] hover:bg-[var(--clip-surface)]",
  ghost: "text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]",
  destructive: "bg-red-900/80 text-red-50 hover:bg-red-900",
};

type MotionButtonProps = {
  className?: string;
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
};

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  function MotionButton(
    {
      className,
      variant = "secondary",
      icon,
      children,
      disabled,
      onClick,
      type = "button",
      "aria-label": ariaLabel,
    },
    ref,
  ) {
    const reduced = useReducedMotion();

    return (
      <m.button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        onClick={onClick}
        whileTap={reduced || disabled ? undefined : buttonTap}
        whileHover={reduced || disabled ? undefined : buttonHover}
        transition={{ type: "tween", duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        disabled={disabled}
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium",
          "outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--clip-bg)]",
          "disabled:pointer-events-none disabled:opacity-45",
          variantClass[variant],
          className,
        )}
      >
        {icon}
        {children}
      </m.button>
    );
  },
);

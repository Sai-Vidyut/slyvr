import { m } from "framer-motion";
import { Film } from "lucide-react";
import { Link } from "react-router-dom";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonHover, buttonTap } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SlyvrBrandLinkProps = {
  variant?: "sidebar" | "compact";
  className?: string;
  onNavigate?: () => void;
};

export function SlyvrBrandLink({
  variant = "sidebar",
  className,
  onNavigate,
}: SlyvrBrandLinkProps) {
  const reduced = useReducedMotion();
  const compact = variant === "compact";

  return (
    <m.div
      className={cn(className)}
      whileHover={reduced ? undefined : buttonHover}
      whileTap={reduced ? undefined : buttonTap}
    >
      <Link
        to="/"
        onClick={onNavigate}
        aria-label={
          compact
            ? "Back to Slyvr home"
            : "Slyvr home — return to the landing page"
        }
        className={cn(
          "group flex items-center rounded-md outline-none transition-colors",
          "hover:bg-[var(--clip-surface)]",
          "focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--clip-bg-elevated)]",
          compact ? "min-h-10 gap-2 px-2 py-1.5" : "min-h-11 w-full gap-2.5 px-1 py-1.5 -mx-1",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)] transition-colors group-hover:border-[var(--clip-border-strong)]",
            compact ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          <Film size={compact ? 16 : 18} aria-hidden />
        </span>
        <span className="min-w-0 text-left">
          <span className="text-label block">Slyvr</span>
          {!compact && (
            <span className="block text-sm font-medium tracking-tight text-[var(--clip-fg)]">
              Your private library
            </span>
          )}
          {compact && (
            <span className="sr-only">Your private library</span>
          )}
        </span>
      </Link>
    </m.div>
  );
}

import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { emptyStateIcon, fadeUp, motionTransition, tweenUi } from "@/lib/motion";
import { MotionButton } from "@/components/ui/motion-button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const reduced = useReducedMotion();

  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={motionTransition(reduced, tweenUi)}
      className={cn(
        "flex flex-col items-center border border-dashed border-[var(--clip-border)] px-6 py-14 text-center",
        className,
      )}
    >
      <m.div
        variants={emptyStateIcon}
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)]"
      >
        <Icon className="text-[var(--clip-muted)]" size={22} strokeWidth={1.5} />
      </m.div>

      <h3 className="text-base font-medium tracking-tight text-[var(--clip-fg)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--clip-muted)]">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {primaryAction && (
          <MotionButton variant="primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </MotionButton>
        )}
        {secondaryAction && (
          <MotionButton variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </MotionButton>
        )}
      </div>
    </m.div>
  );
}

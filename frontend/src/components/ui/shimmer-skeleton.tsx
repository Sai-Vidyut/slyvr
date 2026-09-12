import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export function ShimmerBlock({
  className,
}: {
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[var(--clip-surface-2)]",
        className,
      )}
    >
      {!reduced && (
        <m.div
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0.4,
          }}
        />
      )}
    </div>
  );
}

/** Matches ClipCard layout (16:10 thumb + title + meta) */
export function ClipCardSkeleton() {
  return (
    <div>
      <ShimmerBlock className="aspect-[16/10] w-full rounded-md" />
      <div className="space-y-2 pt-2.5">
        <ShimmerBlock className="h-4 w-3/4" />
        <ShimmerBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ClipGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ClipCardSkeleton key={`clip-skeleton-${i}`} />
      ))}
    </div>
  );
}

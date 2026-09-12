import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function SearchPulse() {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <span
        className="inline-block h-4 w-4 rounded-full border-2 border-[var(--clip-border-strong)] border-t-[var(--clip-muted)]"
        aria-hidden
      />
    );
  }

  return (
    <span className="relative flex h-4 w-4" aria-hidden>
      <m.span
        className="absolute inline-flex h-full w-full rounded-full bg-[var(--clip-muted)]/20"
        animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative inline-flex h-4 w-4 rounded-full bg-[var(--clip-muted)]" />
    </span>
  );
}

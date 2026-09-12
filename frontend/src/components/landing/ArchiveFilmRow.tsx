import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS } from "@/lib/landing-clips";
import { landingEditorialReveal, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { LandingStill } from "./LandingStill";

const ROW = [...LANDING_CLIPS].reverse();

export function ArchiveFilmRow({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <m.div
      variants={landingEditorialReveal}
      initial={reduced ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={cn("relative", className)}
    >
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] text-[var(--clip-muted)]">Timeline · last 90 days</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--clip-muted)]">6 items</p>
      </div>
      <m.div
        className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-4"
        variants={staggerContainer(reduced, 6)}
        initial={reduced ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {ROW.map((clip) => (
          <m.div
            key={clip.id}
            variants={staggerItem}
            className="w-[min(42vw,220px)] shrink-0 md:w-[200px] lg:w-[220px]"
          >
            <LandingStill
              clip={clip}
              metaLayout="below"
              showPlaybackHint
              className="rounded-sm border border-[var(--clip-border-strong)]"
            />
          </m.div>
        ))}
      </m.div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--clip-bg)] to-transparent"
        aria-hidden
      />
    </m.div>
  );
}

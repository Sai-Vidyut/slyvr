import { m, useTransform, type MotionValue } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS } from "@/lib/landing-clips";
import { landingHeroItem, motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { LandingStill } from "./LandingStill";

type Props = {
  scrollProgress: MotionValue<number>;
  className?: string;
};

const FEATURED = LANDING_CLIPS[0];
const SHELF = LANDING_CLIPS.slice(1, 5);

export function HeroArchiveStrip({ scrollProgress, className }: Props) {
  const reduced = useReducedMotion();
  const y = useTransform(scrollProgress, [0, 0.55], [0, reduced ? 0 : 72]);
  const scale = useTransform(scrollProgress, [0, 0.5], [1, reduced ? 1 : 0.96]);

  return (
    <m.div
      style={{ y, scale }}
      className={cn("relative w-full", className)}
      aria-hidden
    >
      <m.div
        variants={landingHeroItem}
        initial={reduced ? false : "hidden"}
        animate="visible"
        transition={motionTransition(reduced, { duration: 0.7, delay: 0.35 })}
        className="relative"
      >
        <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--clip-muted)]">
            Recent uploads
          </p>
          <p className="font-mono text-[10px] text-[var(--clip-muted)]">4 clips · 12.4 GB</p>
        </div>

        <LandingStill
          clip={FEATURED}
          priority
          showPlaybackHint
          className="rounded-sm border border-[var(--clip-border-strong)] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)]"
        />

        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-2.5">
          {SHELF.map((clip, index) => (
            <m.div
              key={clip.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransition(reduced, {
                duration: 0.55,
                delay: 0.45 + index * 0.07,
              })}
            >
              <LandingStill
                clip={clip}
                metaLayout="below"
                className="rounded-sm border border-[var(--clip-border)]"
              />
            </m.div>
          ))}
        </div>
      </m.div>

      <div
        className="pointer-events-none absolute -right-8 top-1/4 hidden h-px w-[120%] bg-gradient-to-r from-transparent via-[var(--clip-border)] to-transparent lg:block"
        aria-hidden
      />
    </m.div>
  );
}

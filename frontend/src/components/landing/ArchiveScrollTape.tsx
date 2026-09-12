import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS } from "@/lib/landing-clips";
import { cn } from "@/lib/utils";

import { MarqueeStill } from "./MarqueeStill";

const TAPE = [...LANDING_CLIPS, ...LANDING_CLIPS];

type Props = {
  className?: string;
};

export function ArchiveScrollTape({ className }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [reduced ? "0%" : "8%", reduced ? "0%" : "-28%"]);

  return (
    <div ref={ref} className={cn("relative -mx-4 overflow-hidden md:-mx-8", className)}>
      <m.div style={{ x }} className="flex w-max gap-1 md:gap-1.5">
        {TAPE.map((clip, i) => (
          <div
            key={`${clip.id}-tape-${i}`}
            className="w-[52vw] max-w-[320px] shrink-0 md:w-[280px] lg:w-[320px]"
          >
            <MarqueeStill clip={clip} cinematic />
          </div>
        ))}
      </m.div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--clip-bg)] to-transparent md:w-20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--clip-bg)] to-transparent md:w-20"
        aria-hidden
      />
    </div>
  );
}

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS, type LandingClipStill } from "@/lib/landing-clips";
import { cn } from "@/lib/utils";

import { MarqueeStill } from "./MarqueeStill";

const MARQUEE_CLIPS: LandingClipStill[] = [
  ...LANDING_CLIPS,
  ...LANDING_CLIPS.map((c, i) => ({ ...c, id: `${c.id}-m-${i}` })),
];

function MarqueeTrack({
  clips,
  wide,
  ariaHidden,
}: {
  clips: LandingClipStill[];
  wide?: boolean;
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 pr-1 md:gap-1.5 md:pr-1.5"
      aria-hidden={ariaHidden}
    >
      {clips.map((clip) => (
        <MarqueeStill key={clip.id} clip={clip} wide={wide} />
      ))}
    </div>
  );
}

type Props = {
  className?: string;
  wide?: boolean;
};

export function LandingMarquee({ className, wide = false }: Props) {
  const reduced = useReducedMotion();

  return (
    <section
      className={cn(
        "relative left-1/2 w-screen -translate-x-1/2 border-y border-[var(--clip-border)] bg-[var(--clip-bg)] py-2 md:py-2.5",
        className,
      )}
      aria-label="Archive reel"
    >
      <div className="overflow-hidden px-0">
        <div
          className={cn(
            "flex w-max items-center",
            reduced ? "flex-wrap justify-start gap-1 px-4" : "landing-marquee-track",
          )}
        >
          <MarqueeTrack clips={MARQUEE_CLIPS} wide={wide} />
          {!reduced && <MarqueeTrack clips={MARQUEE_CLIPS} wide={wide} ariaHidden />}
        </div>
      </div>
    </section>
  );
}

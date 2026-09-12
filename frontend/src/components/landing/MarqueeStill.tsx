import { m } from "framer-motion";
import { useCallback, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { LandingClipStill } from "@/lib/landing-clips";
import { cn } from "@/lib/utils";

type Props = {
  clip: LandingClipStill;
  cinematic?: boolean;
  wide?: boolean;
};

function StillFallback({ clip }: { clip: LandingClipStill }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(145deg, ${clip.fallback.from}, ${clip.fallback.to})`,
      }}
    />
  );
}

export function MarqueeStill({ clip, cinematic = false, wide = false }: Props) {
  const reduced = useReducedMotion();
  const [useFallback, setUseFallback] = useState(!clip.src);
  const onError = useCallback(() => setUseFallback(true), []);

  const inner = (
    <>
      {useFallback ? (
        <StillFallback clip={clip} />
      ) : (
        <img
          src={clip.src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={onError}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      )}
      <span className="absolute bottom-2 right-2 font-mono text-[10px] text-white/85 md:text-[11px]">
        {clip.duration}
      </span>
    </>
  );

  if (wide) {
    return (
      <figure
        className={cn(
          "group relative shrink-0 overflow-hidden bg-[#0c0c0e]",
          "h-[68px] w-[122px] sm:h-[76px] sm:w-[136px] md:h-[84px] md:w-[150px] lg:h-[88px] lg:w-[158px] xl:h-[92px] xl:w-[166px]",
        )}
      >
        {inner}
      </figure>
    );
  }

  if (cinematic) {
    return (
      <figure
        className={cn(
          "group relative aspect-[16/10] w-full overflow-hidden bg-[#0c0c0e]",
          !reduced && "transition-[filter] duration-300 hover:brightness-110",
        )}
      >
        {inner}
      </figure>
    );
  }

  return (
    <m.figure
      whileHover={reduced ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group relative shrink-0 overflow-hidden bg-[#0c0c0e]",
        "h-[100px] w-[160px] sm:h-[112px] sm:w-[180px] md:h-[128px] md:w-[204px]",
      )}
    >
      {inner}
    </m.figure>
  );
}

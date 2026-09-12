import { useCallback, useState } from "react";

import type { LandingClipStill } from "@/lib/landing-clips";

type Props = {
  clip: LandingClipStill;
  priority?: boolean;
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

export function HeroClipCell({ clip, priority = false }: Props) {
  const [useFallback, setUseFallback] = useState(!clip.src);
  const onError = useCallback(() => setUseFallback(true), []);

  return (
    <figure className="group min-w-0">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0e0e10]">
        {useFallback ? (
          <StillFallback clip={clip} />
        ) : (
          <img
            src={clip.src}
            alt=""
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={onError}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-white/80">
          {clip.duration}
        </span>
      </div>
      <figcaption className="mt-1.5 truncate font-mono text-[10px] text-[var(--clip-muted)] sm:text-[11px]">
        {clip.title}
      </figcaption>
    </figure>
  );
}

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

export function HeroPreviewCell({ clip, priority = false }: Props) {
  const [useFallback, setUseFallback] = useState(!clip.src);
  const onError = useCallback(() => setUseFallback(true), []);

  return (
    <figure className="min-w-0 overflow-hidden rounded-sm bg-[#0a0a0c]">
      <div className="relative aspect-[4/3] w-full">
        {useFallback ? (
          <StillFallback clip={clip} />
        ) : (
          <img
            src={clip.src}
            alt=""
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            onError={onError}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-6">
          <p className="truncate font-mono text-[9px] text-white/90 sm:text-[10px]">{clip.title}</p>
          <p className="font-mono text-[9px] text-white/55">{clip.duration}</p>
        </div>
      </div>
    </figure>
  );
}

import { Play } from "lucide-react";
import { useCallback, useState } from "react";

import type { LandingClipStill } from "@/lib/landing-clips";
import { clipMetaLine } from "@/lib/landing-clips";
import { cn } from "@/lib/utils";

type Props = {
  clip: LandingClipStill;
  className?: string;
  imageClassName?: string;
  showPlaybackHint?: boolean;
  metaLayout?: "overlay" | "below";
  priority?: boolean;
};

function StillFallback({ clip, className }: { clip: LandingClipStill; className?: string }) {
  const g = clip.fallback.grain ?? 0.35;
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(145deg, ${clip.fallback.from} 0%, ${clip.fallback.to} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='${g}'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
    </div>
  );
}

export function LandingStill({
  clip,
  className,
  imageClassName,
  showPlaybackHint = false,
  metaLayout = "overlay",
  priority = false,
}: Props) {
  const [useFallback, setUseFallback] = useState(!clip.src);

  const onError = useCallback(() => setUseFallback(true), []);

  const meta = (
    <>
      <p className="truncate font-mono text-[11px] text-white/90">{clip.title}</p>
      <p className="truncate text-[10px] text-white/55">{clipMetaLine(clip)}</p>
    </>
  );

  return (
    <figure className={cn("group/still overflow-hidden bg-[var(--clip-surface)]", className)}>
      <div className={cn("relative aspect-[16/10] w-full", imageClassName)}>
        {useFallback ? (
          <StillFallback clip={clip} className="absolute inset-0" />
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
        {showPlaybackHint && (
          <span className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/35 opacity-0 transition-opacity duration-200 group-hover/still:opacity-100">
            <Play size={12} className="ml-0.5 text-white/90" aria-hidden />
          </span>
        )}
        {metaLayout === "overlay" && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2.5 pb-2 pt-8 text-left">
            {meta}
          </div>
        )}
      </div>
      {metaLayout === "below" && (
        <figcaption className="border-t border-[var(--clip-border)] px-2 py-1.5 text-left">
          <p className="truncate font-mono text-[10px] text-[var(--clip-fg)]">{clip.title}</p>
          <p className="truncate text-[10px] text-[var(--clip-muted)]">
            {clip.date} · {clip.duration}
          </p>
        </figcaption>
      )}
    </figure>
  );
}

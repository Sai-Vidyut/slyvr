import { m } from "framer-motion";
import { Film, Play } from "lucide-react";
import { useState } from "react";

import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { useClipReadUrl } from "@/hooks/use-clip-read-url";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { isSignedMediaReadsEnabled } from "@/lib/signed-media-reads";
import {
  buttonTap,
  shouldAnimateEntrance,
  staggerDelay,
  staggerItem,
  tweenMicro,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Clip } from "@/types/clip";

export type { Clip };

interface ClipCardProps {
  clip: Clip;
  onClick?: () => void;
  layout?: boolean;
  index?: number;
  listSize?: number;
  isSelected?: boolean;
  /** Demo/static clips: use thumbnail_url directly (no read-url API). */
  directMediaUrls?: boolean;
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes <= 0) return null;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function ClipCard({
  clip,
  onClick,
  layout = true,
  index = 0,
  listSize = 1,
  isSelected = false,
  directMediaUrls = false,
}: ClipCardProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [thumbFailed, setThumbFailed] = useState(false);
  const signedReads = isSignedMediaReadsEnabled() && !directMediaUrls;
  const thumbRead = useClipReadUrl(clip.id, "thumbnail", signedReads);
  const thumbnailSrc = signedReads ? thumbRead.data?.url : clip.thumbnail_url;
  const animateEntrance =
    !reducedMotion && shouldAnimateEntrance(listSize, index);
  const touchUi = isMobile;

  const metaParts = [
    clip.category || "Uncategorized",
    clip.uploaded_at
      ? new Date(clip.uploaded_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : null,
    clip.people?.length ? clip.people.slice(0, 2).join(", ") : null,
    formatFileSize(clip.file_size),
  ].filter(Boolean);

  const showThumb = Boolean(thumbnailSrc) && !thumbFailed;

  return (
    <m.article
      layout={layout && !reducedMotion ? "position" : false}
      variants={animateEntrance ? staggerItem : undefined}
      initial={animateEntrance ? "hidden" : false}
      animate="visible"
      exit={reducedMotion ? undefined : "exit"}
      transition={
        animateEntrance
          ? { delay: staggerDelay(index, listSize), ...tweenMicro }
          : tweenMicro
      }
      whileTap={reducedMotion ? undefined : buttonTap}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Open clip ${clip.title}`}
      className={cn(
        "group cursor-pointer outline-none",
        "focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--clip-bg)]",
        isSelected &&
          "ring-1 ring-[var(--clip-border-strong)] ring-offset-2 ring-offset-[var(--clip-bg)]",
      )}
    >
      <CardContainer>
        <CardBody
          className={cn(
            "relative w-full transition-[transform,box-shadow] duration-300 ease-out",
            !reducedMotion &&
              "group-hover:shadow-[0_16px_44px_-32px_rgba(0,0,0,0.9)] group-focus-visible:shadow-[0_16px_44px_-32px_rgba(0,0,0,0.9)]",
          )}
        >
          <CardItem translateZ={26} layer="media" className="w-full">
            <div
              className={cn(
                "relative overflow-hidden rounded-md bg-[var(--clip-surface)]",
                touchUi ? "aspect-[4/5]" : "aspect-[16/10]",
              )}
            >
              <CardItem translateZ={14} layer="media" className="h-full w-full">
                {showThumb ? (
                  <img
                    src={thumbnailSrc!}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => setThumbFailed(true)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--clip-muted)]">
                    <Film size={22} strokeWidth={1.25} aria-hidden />
                    <span className="text-meta">No preview</span>
                  </div>
                )}
              </CardItem>

              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/65 to-transparent transition-opacity duration-300",
                  touchUi
                    ? "opacity-80"
                    : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
                aria-hidden
              />

              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                  isSelected
                    ? "opacity-100"
                    : touchUi
                      ? "opacity-0"
                      : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/20 bg-black/45 text-white">
                  <Play size={16} fill="currentColor" aria-hidden />
                </span>
              </div>
            </div>
          </CardItem>

          <div className={cn("space-y-1", touchUi ? "pt-2" : "pt-2.5")}>
            <CardItem
              translateZ={18}
              as="h3"
              className="text-card-title line-clamp-1"
              title={clip.title}
            >
              {clip.title}
            </CardItem>
            <CardItem translateZ={10} as="p" className="text-meta line-clamp-1">
              {metaParts.join(" · ")}
            </CardItem>
          </div>
        </CardBody>
      </CardContainer>
    </m.article>
  );
}

export default ClipCard;

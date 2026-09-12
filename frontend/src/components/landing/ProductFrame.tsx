import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS } from "@/lib/landing-clips";
import { landingEditorialReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { LandingStill } from "./LandingStill";

const GRID_CLIPS = LANDING_CLIPS.slice(0, 6);
const EMBED_CLIPS = LANDING_CLIPS.slice(0, 4);

type ProductFrameVariant = "default" | "embed" | "hero" | "story";

type ProductFrameProps = {
  className?: string;
  variant?: ProductFrameVariant;
  /** @deprecated use variant="embed" */
  embed?: boolean;
};

const PEOPLE = ["Alex", "Jordan", "Sam"];

/** Static composition echoing the in-app library — not a screenshot dependency */
export function ProductFrame({ className, variant: variantProp, embed = false }: ProductFrameProps) {
  const reduced = useReducedMotion();
  const variant: ProductFrameVariant = variantProp ?? (embed ? "embed" : "default");
  const clips = variant === "embed" ? EMBED_CLIPS : GRID_CLIPS;
  const showSidebar = variant === "default" || variant === "hero" || variant === "story";
  const showSearch = variant !== "embed";
  const showPeople = variant === "hero" || variant === "story";

  const shellClass = cn(
    "overflow-hidden bg-[var(--clip-bg-elevated)]",
    variant === "embed" && "rounded-[2px] border border-[var(--clip-border)] shadow-2xl",
    variant === "hero" && "rounded-sm border border-[var(--clip-border)]",
    variant === "story" && "rounded-sm border border-[var(--clip-border)]",
    variant === "default" &&
      "rounded-sm border border-[var(--clip-border)] shadow-[0_40px_100px_-60px_rgba(0,0,0,0.9)]",
  );

  const frame = (
    <div className={shellClass}>
      <div className="flex">
        {showSidebar && (
          <div
            className={cn(
              "shrink-0 border-r border-[var(--clip-border)] p-3",
              variant === "hero" ? "hidden w-36 sm:block md:w-40 lg:w-44 lg:p-4" : "hidden w-40 lg:block lg:w-44 lg:p-4",
            )}
          >
            <p className="text-label mb-3">Library</p>
            <div className="space-y-1">
              {["All clips", "Travel", "Family", "Work"].map((label, i) => (
                <div
                  key={label}
                  className={
                    i === 0
                      ? "rounded-sm bg-[var(--clip-surface)] px-2 py-1.5 text-xs text-[var(--clip-fg)]"
                      : "px-2 py-1.5 text-xs text-[var(--clip-muted)]"
                  }
                >
                  {label}
                </div>
              ))}
            </div>
            {showPeople && (
              <div className="mt-6 hidden border-t border-[var(--clip-border)] pt-4 md:block">
                <p className="text-label mb-2">People</p>
                {PEOPLE.map((name) => (
                  <div key={name} className="px-2 py-1 text-xs text-[var(--clip-muted)]">
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            "min-w-0 flex-1",
            variant === "embed" ? "p-2" : "p-3 md:p-4",
            variant === "hero" && "p-3 sm:p-4",
          )}
        >
          {showSearch && (
            <div className="mb-3 flex items-center justify-between gap-2 border border-[var(--clip-border)] px-3 py-2 text-xs text-[var(--clip-muted)]">
              <span>Search title, category, people…</span>
              {variant === "hero" && (
                <span className="hidden font-mono text-[10px] text-[var(--clip-muted)] sm:inline">
                  148 clips
                </span>
              )}
            </div>
          )}
          <div
            className={cn(
              "grid gap-2",
              variant === "embed" && "grid-cols-2 gap-1.5",
              (variant === "default" || variant === "story") && "grid-cols-2 md:grid-cols-3 md:gap-2.5",
              variant === "hero" && "grid-cols-2 sm:grid-cols-3 md:gap-2.5",
            )}
          >
            {clips.map((clip) => (
              <LandingStill
                key={clip.id}
                clip={clip}
                metaLayout="below"
                className="rounded-sm border border-[var(--clip-border)]/70"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "embed" || variant === "hero" || variant === "story") {
    return <div className={className}>{frame}</div>;
  }

  return (
    <m.div
      variants={landingEditorialReveal}
      initial={reduced ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={className}
    >
      {frame}
    </m.div>
  );
}

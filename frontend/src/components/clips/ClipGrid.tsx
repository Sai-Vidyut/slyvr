import { AnimatePresence, LayoutGroup, m } from "framer-motion";
import { Film, Filter, SearchX } from "lucide-react";
import { useMemo } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ClipGridSkeleton } from "@/components/ui/shimmer-skeleton";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  fadeIn,
  motionTransition,
  popIn,
  staggerContainer,
  tweenFast,
} from "@/lib/motion";
import type { Clip } from "@/types/clip";
import ClipCard from "./ClipCard";

export type EmptyStateKind = "none" | "filtered" | "search";

interface ClipGridProps {
  clips: Clip[];
  onClipClick: (clip: Clip) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  emptyKind?: EmptyStateKind;
  onClearFilters?: () => void;
  onUpload?: () => void;
  filterLabel?: string;
  selectedClipId?: number | null;
  /** Changes when search/filters change — drives grid crossfade */
  filterSignature?: string;
  /** Demo/static clips: use thumbnail_url directly (no read-url API). */
  directMediaUrls?: boolean;
}

function EmptyContent({
  emptyKind,
  filterLabel,
  onClearFilters,
  onUpload,
}: Pick<
  ClipGridProps,
  "emptyKind" | "filterLabel" | "onClearFilters" | "onUpload"
>) {
  if (emptyKind === "search") {
    return (
      <EmptyState
        icon={SearchX}
        title="No clips match your search"
        description="Try different keywords in title, description, or category — or clear search to browse the full library."
        primaryAction={
          onClearFilters
            ? { label: "Clear search", onClick: onClearFilters }
            : undefined
        }
      />
    );
  }
  if (emptyKind === "filtered") {
    return (
      <EmptyState
        icon={Filter}
        title={
          filterLabel ? `No clips in ${filterLabel}` : "No clips match these filters"
        }
        description="Adjust category or people filters, or reset to see everything in your library."
        primaryAction={
          onClearFilters
            ? { label: "Clear filters", onClick: onClearFilters }
            : undefined
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Film}
      title="Your library is empty"
      description="Upload your first clip to start building a searchable, organized media library."
      primaryAction={
        onUpload ? { label: "Upload a clip", onClick: onUpload } : undefined
      }
    />
  );
}

function ClipGrid({
  clips,
  onClipClick,
  isLoading,
  isFetching,
  emptyKind = "none",
  onClearFilters,
  onUpload,
  filterLabel,
  selectedClipId = null,
  filterSignature = "default",
  directMediaUrls = false,
}: ClipGridProps) {
  const reduced = useReducedMotion();
  const hasClips = clips.length > 0;
  const viewKey = hasClips ? "grid" : `empty-${emptyKind}`;

  const sections = useMemo(() => {
    const now = new Date();
    const map: Record<string, Clip[]> = {
      Today: [],
      "Earlier This Week": [],
      "Earlier This Month": [],
      "Last Month": [],
      Older: [],
    };
    clips.forEach((clip) => {
      if (!clip.uploaded_at) {
        map.Older.push(clip);
        return;
      }
      const uploaded = new Date(clip.uploaded_at);
      const diffDays =
        (now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 1) map.Today.push(clip);
      else if (diffDays < 7) map["Earlier This Week"].push(clip);
      else if (diffDays < 30) map["Earlier This Month"].push(clip);
      else if (diffDays < 60) map["Last Month"].push(clip);
      else map.Older.push(clip);
    });
    return map;
  }, [clips]);

  const totalVisible = clips.length;
  const useLayout = !reduced && totalVisible <= 120;

  return (
    <div className="relative min-h-[280px]">
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <m.div
            key="loading"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={tweenFast}
          >
            <ClipGridSkeleton count={Math.min(8, Math.max(4, totalVisible || 8))} />
          </m.div>
        ) : !hasClips ? (
          <m.div
            key={viewKey}
            variants={popIn}
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit={reduced ? undefined : "exit"}
            transition={motionTransition(reduced)}
          >
            <EmptyContent
              emptyKind={emptyKind}
              filterLabel={filterLabel}
              onClearFilters={onClearFilters}
              onUpload={onUpload}
            />
          </m.div>
        ) : (
          <m.div
            key="grid-populated"
            variants={fadeIn}
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit={reduced ? undefined : "exit"}
            transition={motionTransition(reduced, tweenFast)}
          >
            <m.div
              key={filterSignature}
              layout={useLayout}
              transition={tweenFast}
              aria-busy={isFetching}
            >
              <LayoutGroup id="clip-library">
                <div className="space-y-8 md:space-y-12">
                  {Object.entries(sections).map(([title, sectionClips]) => {
                    if (sectionClips.length === 0) return null;

                    return (
                      <section key={title} aria-labelledby={`section-${title}`}>
                        <m.div
                          layout={useLayout}
                          className="mb-3 flex items-baseline gap-3 border-b border-[var(--clip-border)] pb-2 md:mb-4"
                        >
                          <h2
                            id={`section-${title}`}
                            className="text-label normal-case tracking-[0.06em] text-[var(--clip-fg)]"
                          >
                            {title}
                          </h2>
                          <span className="text-meta tabular-nums">
                            {sectionClips.length}
                          </span>
                        </m.div>

                        <m.div
                          layout={useLayout}
                          variants={staggerContainer(reduced, sectionClips.length)}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                        >
                          <AnimatePresence mode="popLayout" initial={false}>
                            {sectionClips.map((clip, index) => (
                              <ClipCard
                                key={clip.id}
                                clip={clip}
                                index={index}
                                listSize={totalVisible}
                                layout={useLayout}
                                isSelected={selectedClipId === clip.id}
                                directMediaUrls={directMediaUrls}
                                onClick={() => onClipClick(clip)}
                              />
                            ))}
                          </AnimatePresence>
                        </m.div>
                      </section>
                    );
                  })}
                </div>
              </LayoutGroup>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ClipGrid;

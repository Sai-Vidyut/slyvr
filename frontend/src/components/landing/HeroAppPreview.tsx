import { Search, Upload } from "lucide-react";

import { HERO_PREVIEW_CLIPS } from "@/lib/landing-clips";

import { HeroPreviewCell } from "./HeroPreviewCell";

const FILTERS = ["All", "Travel", "Family", "Work", "People"] as const;

export function HeroAppPreview({ className }: { className?: string }) {
  return (
    <div
      className={className}
      role="group"
      aria-label="Slyvr library preview"
    >
      <div className="overflow-hidden rounded-lg border border-[var(--clip-border)] bg-[#121214]/96 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.9)] lg:rounded-xl">
        <div className="flex items-center gap-2 border-b border-[var(--clip-border)] px-3 py-2.5 md:px-4 lg:px-5 lg:py-3">
          <span className="hidden text-xs font-medium text-[var(--clip-fg)] sm:inline lg:text-[13px]">Slyvr</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--clip-border)] px-3 py-1.5 text-[11px] text-[var(--clip-muted)] lg:px-4 lg:py-2 lg:text-xs">
            <Search size={12} className="lg:h-[14px] lg:w-[14px]" aria-hidden />
            <span className="truncate">Search your clips…</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--clip-border)] px-2.5 py-1 text-[10px] text-[var(--clip-fg)] lg:px-3 lg:py-1.5 lg:text-[11px]">
            <Upload size={11} className="lg:h-3.5 lg:w-3.5" aria-hidden />
            Upload
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-[var(--clip-border)] px-3 py-2 md:px-4 lg:gap-2 lg:px-5 lg:py-2.5">
          {FILTERS.map((label) => (
            <span
              key={label}
              className={
                label === "All"
                  ? "rounded-full bg-[var(--clip-surface)] px-2.5 py-0.5 text-[10px] text-[var(--clip-fg)] lg:px-3 lg:py-1 lg:text-[11px]"
                  : "px-2 py-0.5 text-[10px] text-[var(--clip-muted)] lg:px-2.5 lg:text-[11px]"
              }
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-4 sm:gap-2 sm:p-3 lg:gap-2.5 lg:p-4">
          {HERO_PREVIEW_CLIPS.map((clip, i) => (
            <HeroPreviewCell key={clip.id} clip={clip} priority={i < 2} />
          ))}
        </div>
      </div>
    </div>
  );
}

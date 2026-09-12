import { Search } from "lucide-react";

import { LANDING_CLIPS } from "@/lib/landing-clips";

import { HeroClipCell } from "./HeroClipCell";

/** Curated set — varied categories, reads as one library */
const HERO_CLIPS = [
  LANDING_CLIPS[0],
  LANDING_CLIPS[1],
  LANDING_CLIPS[2],
  LANDING_CLIPS[4],
];

export function HeroLibraryGrid() {
  return (
    <div className="w-full" role="group" aria-label="Sample clips in your library">
      <div className="mb-4 flex items-center gap-2 text-[var(--clip-muted)]">
        <Search size={14} strokeWidth={1.5} aria-hidden />
        <span className="font-mono text-[11px] tracking-wide">Search your archive</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-3">
        {HERO_CLIPS.map((clip, index) => (
          <HeroClipCell key={clip.id} clip={clip} priority={index === 0} />
        ))}
      </div>
    </div>
  );
}

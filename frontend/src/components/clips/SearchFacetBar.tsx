import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { tweenMicro } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ActiveSearchFacets, SearchFacetKey, SearchFacets } from "@/types/clip";

export type { ActiveSearchFacets, SearchFacetKey };

const FACET_CONFIG: {
  key: SearchFacetKey;
  label: string;
  facetKey: keyof SearchFacets;
}[] = [
  { key: "person", label: "People", facetKey: "people" },
  { key: "category", label: "Categories", facetKey: "categories" },
  { key: "device", label: "Devices", facetKey: "devices" },
  { key: "year", label: "Years", facetKey: "years" },
  { key: "location", label: "Locations", facetKey: "locations" },
  { key: "file_type", label: "Type", facetKey: "file_types" },
  { key: "media_kind", label: "Media", facetKey: "media_kinds" },
  { key: "has_gps", label: "Location data", facetKey: "has_gps" },
  { key: "lens_model", label: "Lens", facetKey: "lens_models" },
  { key: "video_codec", label: "Video codec", facetKey: "video_codecs" },
];

type Props = {
  facets: SearchFacets;
  active: ActiveSearchFacets;
  onChange: (key: SearchFacetKey, value: string | null) => void;
};

export function SearchFacetBar({ facets, active, onChange }: Props) {
  const reduced = useReducedMotion();
  const sections = FACET_CONFIG.filter(
    (cfg) => (facets[cfg.facetKey]?.length ?? 0) > 0,
  );

  if (sections.length === 0) return null;

  return (
    <div className="mb-5 space-y-3 border-b border-[var(--clip-border)] pb-4 md:space-y-3">
      {sections.map((cfg) => {
        const values = facets[cfg.facetKey] ?? [];
        const selected = active[cfg.key];
        return (
          <div key={cfg.key} className="min-w-0">
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--clip-muted)] md:mb-0 md:mr-2 md:inline md:w-20 md:shrink-0">
              {cfg.label}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
              {values.map((value) => {
                const isOn = selected === value;
                return (
                  <m.button
                    key={value}
                    type="button"
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={tweenMicro}
                    onClick={() => onChange(cfg.key, isOn ? null : value)}
                    aria-pressed={isOn}
                    className={cn(
                      "inline-flex min-h-10 max-w-[12rem] shrink-0 items-center truncate rounded-md border px-3 text-xs md:min-h-8 md:px-2.5",
                      isOn
                        ? "border-[var(--clip-border-strong)] bg-[var(--clip-surface)] text-[var(--clip-fg)]"
                        : "border-[var(--clip-border)] text-[var(--clip-muted)] hover:border-[var(--clip-border-strong)] hover:text-[var(--clip-fg)]",
                    )}
                  >
                    {value}
                  </m.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

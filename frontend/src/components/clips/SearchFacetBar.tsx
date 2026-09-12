import { m } from "framer-motion";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { tweenMicro } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SearchFacets } from "@/types/clip";

export type SearchFacetKey =
  | "person"
  | "category"
  | "device"
  | "year"
  | "location"
  | "file_type";

export type ActiveSearchFacets = Partial<Record<SearchFacetKey, string>>;

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
    <div className="mb-5 space-y-3 border-b border-[var(--clip-border)] pb-4">
      {sections.map((cfg) => {
        const values = facets[cfg.facetKey] ?? [];
        const selected = active[cfg.key];
        return (
          <div key={cfg.key} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--clip-muted)]">
              {cfg.label}
            </span>
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
                    "inline-flex min-h-8 max-w-[12rem] items-center truncate rounded-md border px-2.5 text-xs",
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
        );
      })}
    </div>
  );
}

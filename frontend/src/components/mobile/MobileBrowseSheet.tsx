import { m } from "framer-motion";
import { Users, Layers } from "lucide-react";

import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonTap } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MobileBrowseSheetProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  people: string[];
  selectedCategory: string;
  selectedPerson: string;
  onCategoryChange: (category: string) => void;
  onPersonChange: (person: string) => void;
  isLoading?: boolean;
};

function ChipRow({
  label,
  icon: Icon,
  items,
  selected,
  allLabel,
  onSelect,
}: {
  label: string;
  icon: typeof Layers;
  items: string[];
  selected: string;
  allLabel: string;
  onSelect: (value: string) => void;
}) {
  const reduced = useReducedMotion();
  const options = [allLabel, ...items];

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-[var(--clip-muted)]" aria-hidden />
        <h3 className="text-label">{label}</h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {options.map((item) => {
          const active = selected === item;
          return (
            <li key={item}>
              <m.button
                type="button"
                whileTap={reduced ? undefined : buttonTap}
                onClick={() => onSelect(item)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-12 w-full items-center rounded-md px-3.5 text-left text-sm transition-colors",
                  active
                    ? "bg-[var(--clip-surface)] text-[var(--clip-fg)]"
                    : "text-[var(--clip-muted)] hover:bg-[var(--clip-surface)]/40 hover:text-[var(--clip-fg)]",
                )}
              >
                {item}
              </m.button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MobileBrowseSheet({
  open,
  onClose,
  categories,
  people,
  selectedCategory,
  selectedPerson,
  onCategoryChange,
  onPersonChange,
  isLoading,
}: MobileBrowseSheetProps) {
  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Browse"
      subtitle="Library"
      variant="sheet"
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--clip-muted)]">
          Loading filters…
        </p>
      ) : (
        <div className="pb-8 pt-2">
          <ChipRow
            label="Categories"
            icon={Layers}
            items={categories}
            selected={selectedCategory}
            allLabel="All Clips"
            onSelect={(value) => {
              onCategoryChange(value);
              onClose();
            }}
          />
          <ChipRow
            label="People"
            icon={Users}
            items={people}
            selected={selectedPerson}
            allLabel="All People"
            onSelect={(value) => {
              onPersonChange(value);
              onClose();
            }}
          />
        </div>
      )}
    </MobileBottomSheet>
  );
}

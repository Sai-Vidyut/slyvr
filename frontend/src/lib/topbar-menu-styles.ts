import { cn } from "@/lib/utils";

/** Solid elevated surface for top-bar menus (no glass — reads cleaner on dark UI). */
export const topbarMenuSurfaceClass = cn(
  "rounded-md border border-[var(--clip-border-strong)] bg-[var(--clip-bg-elevated)]",
  "shadow-[0_10px_28px_-12px_rgba(0,0,0,0.65)]",
);

export const topbarControlHeightClass = "min-h-10";

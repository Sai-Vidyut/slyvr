import { useMediaQuery } from "@/hooks/use-media-query";

/** Primary mobile product breakpoint — Tailwind `md` and below. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Prefer for disabling hover/tilt affordances. */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

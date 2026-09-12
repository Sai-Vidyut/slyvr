import { useScroll, useTransform, type MotionValue } from "framer-motion";
import type { RefObject } from "react";

type LandingOpeningScroll = {
  scrollYProgress: MotionValue<number>;
  copyOpacity: MotionValue<number>;
  copyY: MotionValue<number>;
  previewOpacity: MotionValue<number>;
  previewY: MotionValue<number>;
  reelOpacity: MotionValue<number>;
};

/**
 * Scroll-linked hero choreography. Progress runs from hero entering the viewport
 * until the hero section leaves (start → end start), so motion is spread across
 * the full hero scroll distance instead of a tiny tail slice.
 */
export function useLandingOpeningScroll(
  targetRef: RefObject<HTMLElement | null>,
  reduced: boolean,
): LandingOpeningScroll {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const copyOpacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.48, 1],
    [1, 1, reduced ? 1 : 0, reduced ? 1 : 0],
  );
  const copyY = useTransform(
    scrollYProgress,
    [0, 0.48, 1],
    [0, reduced ? 0 : -20, reduced ? 0 : -20],
  );

  const previewY = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    [0, reduced ? 0 : 18, reduced ? 0 : 18],
  );
  const previewOpacity = useTransform(
    scrollYProgress,
    [0, 0.32, 0.68, 1],
    [1, 1, reduced ? 1 : 0.55, reduced ? 1 : 0.55],
  );

  const reelOpacity = useTransform(
    scrollYProgress,
    [0, 0.38, 0.62, 1],
    [reduced ? 1 : 0.88, 1, 1, 1],
  );

  return {
    scrollYProgress,
    copyOpacity,
    copyY,
    previewOpacity,
    previewY,
    reelOpacity,
  };
}

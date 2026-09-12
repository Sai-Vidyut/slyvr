import {
  animate,
  m,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
} from "framer-motion";
import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ApiStatusVisualState = "inactive" | "loading" | "active";

type Props = {
  state: ApiStatusVisualState;
  className?: string;
  size?: number;
};

/** 0 = inactive (X), ~0.38 = neutral loading, 1 = active (check) */
function targetProgress(state: ApiStatusVisualState): number {
  if (state === "active") return 1;
  if (state === "loading") return 0.38;
  return 0;
}

function transitionDuration(
  state: ApiStatusVisualState,
  current: number,
  target: number,
): number {
  const span = Math.abs(target - current);
  if (state === "loading" && span < 0.5) return 0.18;
  if (span >= 0.9) return 0.28;
  return 0.22;
}

export function ApiStatusIcon({ state, className, size = 18 }: Props) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(targetProgress(state));
  const animRef = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    const target = targetProgress(state);

    animRef.current?.stop();

    if (reduced) {
      progress.set(target);
      return;
    }

    const current = progress.get();
    animRef.current = animate(progress, target, {
      duration: transitionDuration(state, current, target),
      ease: easeOut,
    });

    return () => {
      animRef.current?.stop();
    };
  }, [state, reduced, progress]);

  // Circle: present throughout; slight settle at loading neutral
  const circleLength = useTransform(progress, [0, 0.12, 1], [1, 1, 1]);
  const circleOpacity = useTransform(
    progress,
    [0, 0.32, 0.38, 0.44, 0.58, 1],
    [0.88, 0.88, 0.72, 0.88, 0.9, 0.95],
  );

  // Check: draws only after neutral band (deactivate clears before X returns)
  const checkLength = useTransform(
    progress,
    [0, 0.52, 0.68, 0.82, 1],
    [0, 0, 0.08, 0.85, 1],
  );
  const checkOpacity = useTransform(
    progress,
    [0, 0.5, 0.62, 0.78, 1],
    [0, 0, 0.4, 0.95, 1],
  );

  // X: two strokes — draw in early, clear before loading/active band
  const xLine1Length = useTransform(
    progress,
    [0, 0.1, 0.22, 0.34, 0.5],
    [1, 1, 0.6, 0, 0],
  );
  const xLine2Length = useTransform(
    progress,
    [0, 0.14, 0.26, 0.36, 0.5],
    [1, 1, 0.5, 0, 0],
  );
  const xOpacity = useTransform(
    progress,
    [0, 0.08, 0.3, 0.42, 1],
    [1, 1, 0.35, 0, 0],
  );

  return (
    <m.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <m.circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        style={{ pathLength: circleLength, opacity: circleOpacity }}
      />
      <m.path
        d="M7.75 12.25 L10.75 15.25 L16.75 9.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: checkLength, opacity: checkOpacity }}
      />
      <m.path
        d="M8.75 8.75 L15.25 15.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        style={{ pathLength: xLine1Length, opacity: xOpacity }}
      />
      <m.path
        d="M15.25 8.75 L8.75 15.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        style={{ pathLength: xLine2Length, opacity: xOpacity }}
      />
    </m.svg>
  );
}

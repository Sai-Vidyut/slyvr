import { m, type MotionStyle, type Transition } from "framer-motion";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

/**
 * Animated border beam — Magic UI / Aceternity pattern adapted for Slyvr.
 * Place inside a `relative overflow-hidden` parent with matching radius.
 */
export function BorderBeam({
  className,
  size = 48,
  delay = 0,
  duration = 8,
  colorFrom = "oklch(0.75 0.02 85 / 0.55)",
  colorTo = "oklch(0.55 0.01 265 / 0.2)",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={
        {
          borderWidth: `${borderWidth}px`,
          borderStyle: "solid",
          borderColor: "transparent",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        } as CSSProperties
      }
    >
      <m.div
        className={cn(
          "absolute aspect-square rounded-full",
          "bg-gradient-to-l from-[var(--bb-from)] via-[var(--bb-to)] to-transparent",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--bb-from": colorFrom,
            "--bb-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}

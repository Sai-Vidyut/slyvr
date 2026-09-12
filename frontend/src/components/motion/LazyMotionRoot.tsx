import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

export function LazyMotionRoot({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

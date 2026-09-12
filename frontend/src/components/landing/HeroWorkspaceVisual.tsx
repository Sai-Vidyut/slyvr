import { m } from "framer-motion";
import { useCallback, useState } from "react";

import { ProductFrame } from "@/components/landing/ProductFrame";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { landingEditorialReveal } from "@/lib/motion";

const WORKSPACE_SRC = "https://picsum.photos/seed/slyvr-workspace-desk/1400/1050";

export function HeroWorkspaceVisual() {
  const reduced = useReducedMotion();
  const [useFallback, setUseFallback] = useState(false);
  const onError = useCallback(() => setUseFallback(true), []);

  return (
    <m.div
      variants={landingEditorialReveal}
      initial={reduced ? false : "hidden"}
      animate="visible"
      className="relative w-full lg:max-w-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-[var(--clip-border)] bg-[#141416] shadow-[0_48px_120px_-64px_rgba(0,0,0,0.95)]">
        {useFallback ? (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, #2a2826 0%, #121014 55%, #0a0a0c 100%)",
            }}
            aria-hidden
          />
        ) : (
          <img
            src={WORKSPACE_SRC}
            alt=""
            decoding="async"
            loading="eager"
            fetchPriority="high"
            onError={onError}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/15 to-black/35" aria-hidden />

        <div
          className="absolute left-[6%] top-[10%] w-[min(58%,420px)] origin-top-left scale-[0.42] sm:scale-[0.48] md:left-[7%] md:top-[11%] md:scale-[0.52] lg:scale-[0.58] xl:scale-[0.62]"
          aria-hidden
        >
          <ProductFrame embed />
        </div>
      </div>
    </m.div>
  );
}

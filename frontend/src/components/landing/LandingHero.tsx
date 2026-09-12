import { m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { HeroWorkspaceVisual } from "@/components/landing/HeroWorkspaceVisual";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  buttonHover,
  buttonTap,
  landingHeroContainer,
  landingHeroItem,
} from "@/lib/motion";

export function LandingHero() {
  const reduced = useReducedMotion();

  const scrollToProduct = () => {
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative overflow-hidden bg-[var(--clip-bg)] px-4 pb-10 pt-24 md:px-8 md:pb-14 md:pt-28 lg:pt-32"
      aria-labelledby="slyvr-hero-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-10 xl:gap-14">
        <m.div
          className="max-w-xl text-left"
          variants={landingHeroContainer}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <m.p variants={landingHeroItem} className="text-label mb-5">
            A private video library
          </m.p>

          <m.h1
            id="slyvr-hero-heading"
            variants={landingHeroItem}
            className="text-hero mb-6 max-w-[14ch] md:text-[3.25rem] lg:text-[3.5rem]"
          >
            Your videos in one place.
          </m.h1>

          <m.p variants={landingHeroItem} className="text-lead max-w-md">
            Upload the clips you keep coming back to. Search by title or category. Tag people once,
            filter later — without a folder maze.
          </m.p>

          <m.div
            variants={landingHeroItem}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <m.div whileHover={reduced ? undefined : buttonHover} whileTap={reduced ? undefined : buttonTap}>
              <Link
                to="/app"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--clip-accent)] px-6 py-2.5 text-sm font-medium text-[var(--clip-accent-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--clip-bg)]"
              >
                Open your library
                <ArrowRight size={16} aria-hidden />
              </Link>
            </m.div>
            <m.button
              type="button"
              onClick={scrollToProduct}
              whileHover={reduced ? undefined : buttonHover}
              whileTap={reduced ? undefined : buttonTap}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--clip-border)] px-6 py-2.5 text-sm font-medium text-[var(--clip-fg)] hover:border-[var(--clip-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--clip-bg)]"
            >
              See how it works
            </m.button>
          </m.div>

          <m.div variants={landingHeroItem} className="mt-14 flex items-center gap-4">
            <div className="h-px w-10 bg-[var(--clip-border-strong)]" aria-hidden />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--clip-muted)]">
              Made for people who actually shoot
            </p>
          </m.div>
        </m.div>

        <HeroWorkspaceVisual />
      </div>
    </section>
  );
}

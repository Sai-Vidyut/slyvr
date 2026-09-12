import { m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

import { HeroAppPreview } from "@/components/landing/HeroAppPreview";
import { HeroAtmosphere } from "@/components/landing/HeroAtmosphere";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useLandingOpeningScroll } from "@/hooks/use-landing-opening-scroll";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  buttonHover,
  buttonTap,
  landingHeroContainer,
  landingHeroItem,
} from "@/lib/motion";

export function LandingOpening() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const openingRef = useRef<HTMLElement>(null);

  const { copyOpacity, copyY, previewOpacity, previewY, reelOpacity } =
    useLandingOpeningScroll(openingRef, reduced);

  const scrollToProduct = () => {
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={openingRef}
      className="relative flex min-h-[100dvh] flex-col bg-[var(--clip-bg)] sm:min-h-[102dvh] lg:min-h-[108vh] xl:min-h-[110vh]"
      aria-labelledby="slyvr-hero-heading"
    >
      <HeroAtmosphere />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 md:px-8 xl:px-10">
          <div className="grid items-start gap-8 pt-[4.75rem] md:gap-14 md:pt-24 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-8 lg:pt-28 xl:gap-10 xl:pt-32">
            <m.header
              style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}
              className="max-w-md will-change-transform sm:max-w-lg lg:max-w-xl lg:pt-2 xl:max-w-[34rem] xl:pt-4"
            >
              <m.div
                variants={landingHeroContainer}
                initial={reduced ? false : "hidden"}
                animate="visible"
              >
                <m.p
                  variants={landingHeroItem}
                  className="text-label mb-4 tracking-[0.2em] md:mb-6 md:text-xs lg:mb-7 lg:tracking-[0.2em]"
                >
                  {isMobile ? "Slyvr" : "A private video library"}
                </m.p>
                <m.h1
                  id="slyvr-hero-heading"
                  variants={landingHeroItem}
                  className="text-hero mb-5 max-w-[11ch] sm:mb-7 md:mb-8"
                >
                  Your videos.
                  <br />
                  One archive.
                </m.h1>
                <m.p
                  variants={landingHeroItem}
                  className="text-lead max-w-md md:max-w-lg lg:max-w-xl"
                >
                  {isMobile
                    ? "A private library on your phone — search, browse, and keep the clips that matter."
                    : "Upload everything you care about — or only what you keep watching. Search by title, category, or person. Your library stays yours."}
                </m.p>
                <m.div
                  variants={landingHeroItem}
                  className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center md:mt-10 lg:mt-11"
                >
                  <m.div
                    whileHover={reduced ? undefined : buttonHover}
                    whileTap={reduced ? undefined : buttonTap}
                    className="w-full sm:w-auto"
                  >
                    <Link
                      to="/app"
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--clip-accent)] px-6 py-3 text-sm font-medium text-[var(--clip-accent-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] sm:w-auto md:min-h-12 md:px-7 md:text-base"
                    >
                      Open your library
                      <ArrowRight className="size-4 md:size-[18px]" aria-hidden />
                    </Link>
                  </m.div>
                  <m.button
                    type="button"
                    onClick={scrollToProduct}
                    whileHover={reduced ? undefined : buttonHover}
                    whileTap={reduced ? undefined : buttonTap}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--clip-border)] px-5 py-3 text-sm text-[var(--clip-fg)] hover:border-[var(--clip-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] sm:w-auto md:min-h-12 md:px-6 md:text-base"
                  >
                    See how it works
                  </m.button>
                </m.div>
                <m.div
                  variants={landingHeroItem}
                  className="mt-10 flex items-center gap-4 md:mt-16 lg:mt-[4.5rem]"
                >
                  <div
                    className="h-px w-10 bg-[var(--clip-border-strong)] md:w-14 lg:w-16"
                    aria-hidden
                  />
                  <p className="text-label text-[10px] tracking-[0.2em] md:text-[11px]">
                    Footage finds a way back
                  </p>
                </m.div>
              </m.div>
            </m.header>

            {!isMobile && (
              <m.div
                style={
                  reduced ? undefined : { y: previewY, opacity: previewOpacity }
                }
                className="relative mx-auto w-full max-w-[640px] will-change-transform lg:mx-0 lg:ml-auto lg:mt-2 lg:w-[min(50vw,780px)] lg:max-w-[780px] xl:mt-4 xl:w-[min(48vw,820px)] xl:max-w-[820px] lg:pt-10 xl:pt-14"
              >
                <div
                  className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl lg:-inset-8"
                  style={{
                    background:
                      "radial-gradient(ellipse 72% 68% at 52% 48%, rgba(6,6,8,0.78) 0%, rgba(6,6,8,0.35) 55%, transparent 72%)",
                  }}
                  aria-hidden
                />
                <HeroAppPreview />
              </m.div>
            )}
          </div>
        </div>

        <m.div
          style={reduced ? undefined : { opacity: reelOpacity }}
          className="relative z-10 mt-auto w-full pt-8 sm:pt-14 md:pt-16 lg:pt-20 xl:pt-24"
        >
          <LandingMarquee wide />
          <div className="mx-auto flex max-w-6xl justify-end px-4 pb-6 pt-5 pb-safe md:px-8 md:pb-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--clip-muted)]">
              — Real moments. Real libraries.
            </p>
          </div>
        </m.div>
      </div>
    </section>
  );
}

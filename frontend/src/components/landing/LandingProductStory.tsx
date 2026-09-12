import { m } from "framer-motion";
import { Play } from "lucide-react";

import { LandingStill } from "@/components/landing/LandingStill";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LANDING_CLIPS } from "@/lib/landing-clips";
import {
  landingEditorialReveal,
  landingEditorialRevealLeft,
  landingQuietReveal,
} from "@/lib/motion";

const FEATURED = LANDING_CLIPS.find((c) => c.id === "summit") ?? LANDING_CLIPS[1];

export function LandingProductStory() {
  const reduced = useReducedMotion();

  return (
    <section
      id="product"
      className="border-b border-[var(--clip-border)] px-4 py-16 md:px-8 md:py-24 lg:py-28"
      aria-labelledby="product-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:gap-6 xl:gap-10">
        <m.div
          className="lg:col-span-3 lg:pt-2"
          variants={landingEditorialRevealLeft}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <p className="text-label mb-5">Browse · Search · Revisit</p>
          <h2 id="product-heading" className="mb-6 text-2xl font-medium leading-[1.1] tracking-tight md:text-3xl lg:text-[2rem]">
            A library that
            <br />
            feels like yours
          </h2>
          <p className="text-meta max-w-xs leading-relaxed">
            Filter by Travel, Family, or Work. Search by title or person. Your clips stay where you
            left them — organized, not buried.
          </p>
        </m.div>

        <m.div
          className="lg:col-span-6"
          variants={landingEditorialReveal}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <div className="group relative overflow-hidden rounded-md border border-[var(--clip-border)]">
            <LandingStill clip={FEATURED} priority metaLayout="overlay" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/35 bg-black/40">
                <Play size={24} className="ml-1 text-white" aria-hidden />
              </span>
            </span>
          </div>
        </m.div>

        <m.div
          className="lg:col-span-3 lg:flex lg:flex-col lg:justify-center"
          variants={landingQuietReveal}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <p className="text-label mb-4">— More than files</p>
          <p className="text-meta max-w-sm leading-relaxed">
            Your videos aren&apos;t just files. They&apos;re memories, ideas, projects and moments.
            Slyvr keeps them organized and close at hand.
          </p>
        </m.div>
      </div>
    </section>
  );
}

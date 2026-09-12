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

const FEATURED = LANDING_CLIPS[1];

export function LandingBrowseSection() {
  const reduced = useReducedMotion();

  return (
    <section
      id="product"
      className="border-b border-[var(--clip-border)] px-4 py-16 md:px-8 md:py-24"
      aria-labelledby="browse-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:gap-8 xl:gap-10">
        <m.div
          className="lg:col-span-3 lg:pt-4"
          variants={landingEditorialRevealLeft}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <p className="text-label mb-4">Browse · Search · Revisit</p>
          <h2 id="browse-heading" className="text-section-head mb-5 max-w-[12ch] text-2xl md:text-3xl">
            A library that feels like yours
          </h2>
          <p className="text-meta max-w-xs leading-relaxed">
            Thumbnails first. Titles and dates underneath. Open a clip when you need playback or
            metadata — not before.
          </p>
        </m.div>

        <m.div
          className="lg:col-span-6"
          variants={landingEditorialReveal}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <div className="group relative overflow-hidden rounded-sm border border-[var(--clip-border-strong)] shadow-[0_32px_80px_-48px_rgba(0,0,0,0.9)]">
            <LandingStill clip={FEATURED} priority showPlaybackHint metaLayout="overlay" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/45">
                <Play size={22} className="ml-1 text-white/95" aria-hidden />
              </span>
            </span>
          </div>
        </m.div>

        <m.div
          className="lg:col-span-3 lg:flex lg:flex-col lg:justify-end lg:pb-2"
          variants={landingQuietReveal}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <p className="text-label mb-4">More than files</p>
          <p className="text-meta max-w-sm leading-relaxed">
            Slyvr is built around how you actually revisit footage — search, categories, people in
            the sidebar, and a detail view when you need it. Not another cloud folder with a grid
            slapped on top.
          </p>
        </m.div>
      </div>
    </section>
  );
}

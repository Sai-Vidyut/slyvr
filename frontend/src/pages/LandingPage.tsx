import { m, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

import { ArchiveScrollTape } from "@/components/landing/ArchiveScrollTape";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingOpening } from "@/components/landing/LandingOpening";
import { LandingProductStory } from "@/components/landing/LandingProductStory";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonHover, buttonTap, tweenCinematic } from "@/lib/motion";

function LandingPage() {
  const reduced = useReducedMotion();
  const privacyRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const { scrollYProgress: privacyProgress } = useScroll({
    target: privacyRef,
    offset: ["start end", "center center"],
  });
  const privacyOpacity = useTransform(
    privacyProgress,
    [0, 1],
    [reduced ? 1 : 0.92, 1],
  );

  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "center center"],
  });
  const ctaOpacity = useTransform(ctaProgress, [0, 1], [reduced ? 1 : 0.94, 1]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--clip-bg)] text-[var(--clip-fg)]">
      <LandingNavbar />
      <main>
        <LandingOpening />
        <LandingProductStory />

        <section
          id="privacy"
          ref={privacyRef}
          className="border-t border-[var(--clip-border)] px-4 py-28 md:px-8 md:py-40"
          aria-labelledby="privacy-heading"
        >
          <m.div
            style={{ opacity: privacyOpacity }}
            className="mx-auto max-w-6xl"
          >
            <p className="text-label mb-8">Privacy</p>
            <h2
              id="privacy-heading"
              className="max-w-[14ch] text-[2rem] font-medium leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]"
            >
              Your library belongs to you.
            </h2>
            <p className="text-meta mt-10 max-w-md leading-relaxed">
              Personal collections — not public feeds or shared analytics. One account&apos;s clips
              are not shown in another&apos;s library. Sign-in is still being built; we&apos;re not
              claiming bank-grade security, only a clear product rule.
            </p>
          </m.div>
        </section>

        <section
          id="storage"
          className="border-t border-[var(--clip-border)] px-4 py-20 md:px-8 md:py-28"
          aria-labelledby="storage-heading"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-label mb-6">Storage</p>
            <h2 id="storage-heading" className="text-section-head mb-12 max-w-[16ch]">
              Where files live — later
            </h2>
            <div className="grid gap-0 md:grid-cols-2 md:gap-0">
              <m.article
                className="border-t border-[var(--clip-border)] py-8 md:border-r md:py-10 md:pr-12"
                initial={reduced ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={tweenCinematic}
              >
                <p className="font-mono text-[10px] text-[var(--clip-muted)]">Path A</p>
                <h3 className="mt-2 text-lg font-medium">Slyvr Storage</h3>
                <p className="text-meta mt-3 max-w-sm leading-relaxed">
                  Pay for space on Slyvr. Upload, thumbnails, playback — object storage handled behind
                  the scenes. Not fully productized on this site yet.
                </p>
              </m.article>
              <m.article
                className="border-t border-[var(--clip-border)] py-8 md:py-10 md:pl-12"
                initial={reduced ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ ...tweenCinematic, delay: reduced ? 0 : 0.05 }}
              >
                <p className="font-mono text-[10px] text-[var(--clip-muted)]">Path B</p>
                <h3 className="mt-2 text-lg font-medium">Bring your own Azure Storage</h3>
                <p className="text-meta mt-3 max-w-sm leading-relaxed">
                  Keep files in a container you control. Slyvr would index metadata and stream from
                  your account — connection flow on the roadmap, not available today.
                </p>
              </m.article>
            </div>
            <p className="text-meta mt-10 max-w-lg border-t border-[var(--clip-border)] pt-8">
              The app today uses whatever backend storage is configured for development.
            </p>
          </div>
        </section>

        <section
          className="border-t border-[var(--clip-border)] px-4 py-20 md:px-8 md:py-28"
          aria-labelledby="archive-heading"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label mb-3">Archive</p>
                <h2 id="archive-heading" className="text-section-head max-w-[15ch]">
                  Built around the footage
                </h2>
              </div>
              <p className="text-meta max-w-xs md:text-right">
                Thumbnails dominate. Open a clip when you need playback or edits.
              </p>
            </div>
            <ArchiveScrollTape className="mb-10" />
          </div>
        </section>

        <section
          ref={ctaRef}
          className="border-t border-[var(--clip-border)] px-4 py-32 md:px-8 md:py-44"
        >
          <m.div style={{ opacity: ctaOpacity }} className="mx-auto max-w-6xl">
            <h2 className="max-w-[16ch] text-[2.25rem] font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-[4rem]">
              Give your footage somewhere to live.
            </h2>
            <m.div
              className="mt-12"
              whileHover={reduced ? undefined : buttonHover}
              whileTap={reduced ? undefined : buttonTap}
            >
              <Link
                to="/app"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--clip-fg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
              >
                Get started
                <ArrowRight size={16} aria-hidden />
              </Link>
            </m.div>
          </m.div>
        </section>
      </main>

      <footer className="border-t border-[var(--clip-border)] px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-meta sm:flex-row sm:items-center">
          <span>Slyvr — private video library</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

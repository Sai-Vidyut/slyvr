import { m, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { HeroArchiveStrip } from "@/components/landing/HeroArchiveStrip";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  buttonHover,
  buttonTap,
  landingHeroContainer,
  landingHeroItem,
  motionTransition,
} from "@/lib/motion";

const CANVAS_BG = "#1a1a1d";

type Particle = {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  depth: number;
};

type MouseState = {
  x: number | null;
  y: number | null;
  radius: number;
};

function particleCount(width: number, height: number, mobile: boolean, reduced: boolean) {
  const area = width * height;
  const base = Math.floor(area / 11000);
  const cap = mobile ? 42 : 88;
  const count = Math.min(Math.max(base, 28), cap);
  return reduced ? Math.min(count, 40) : count;
}

function createParticles(width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const calmX = width * 0.38;

  for (let i = 0; i < count; i++) {
    const depth = Math.random();
    const size = 0.85 + depth * 1.5;
    const clusterRight = Math.random() < 0.82;
    const x = clusterRight
      ? calmX + Math.random() * (width - calmX - size * 4)
      : Math.random() * (width * 0.55);
    const y = Math.random() * (height - size * 4) + size * 2;

    particles.push({
      x,
      y,
      directionX: (Math.random() * 0.26 - 0.13) * 0.5,
      directionY: (Math.random() * 0.26 - 0.13) * 0.5,
      size,
      depth,
    });
  }
  return particles;
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function spatialWeight(x: number, width: number) {
  const t = x / width;
  if (t < 0.28) return 0.08;
  if (t < 0.45) return 0.15 + (t - 0.28) * 1.2;
  return 0.35 + (t - 0.45) * 1.1;
}

export function AetherFlowHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const mouseTargetRef = useRef<MouseState>({ x: null, y: null, radius: 180 });
  const mouseSmoothRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const mobileRef = useRef(false);
  const visibleRef = useRef(true);
  const sizeRef = useRef({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const copyY = useTransform(scrollYProgress, [0, 0.45], [0, reduced ? 0 : -48]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.4], [1, reduced ? 1 : 0.15]);
  const networkOpacity = useTransform(scrollYProgress, [0, 0.55], [1, reduced ? 1 : 0.35]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, motionEnabled: boolean) => {
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, width, height);

      const leftCalm = ctx.createLinearGradient(0, 0, width, 0);
      leftCalm.addColorStop(0, "rgba(26, 26, 29, 1)");
      leftCalm.addColorStop(0.42, "rgba(26, 26, 29, 0.92)");
      leftCalm.addColorStop(0.72, "rgba(26, 26, 29, 0.55)");
      leftCalm.addColorStop(1, "rgba(26, 26, 29, 0.35)");
      ctx.fillStyle = leftCalm;
      ctx.fillRect(0, 0, width, height);

      const particles = particlesRef.current;
      const target = mouseTargetRef.current;
      let smooth = mouseSmoothRef.current;

      if (target.x !== null && target.y !== null) {
        if (!smooth) {
          smooth = { x: target.x, y: target.y };
          mouseSmoothRef.current = smooth;
        } else {
          smooth.x += (target.x - smooth.x) * 0.12;
          smooth.y += (target.y - smooth.y) * 0.12;
        }
      } else {
        mouseSmoothRef.current = null;
        smooth = null;
      }

      for (const p of particles) {
        if (motionEnabled) {
          if (p.x > width || p.x < 0) p.directionX = -p.directionX;
          if (p.y > height || p.y < 0) p.directionY = -p.directionY;

          if (smooth) {
            const d = dist(smooth.x, smooth.y, p.x, p.y);
            if (d < target.radius + p.size) {
              const fx = (p.x - smooth.x) / d;
              const fy = (p.y - smooth.y) / d;
              const force = ((target.radius - d) / target.radius) * 2;
              p.x += fx * force;
              p.y += fy * force;
            }
          }

          p.x += p.directionX;
          p.y += p.directionY;
        }

        const weight = spatialWeight(p.x, width);
        const nearMouse =
          smooth && dist(smooth.x, smooth.y, p.x, p.y) < target.radius * 0.8;
        const baseAlpha = (0.28 + p.depth * 0.32) * weight;
        const alpha = nearMouse ? Math.min(0.9, baseAlpha + 0.22) : baseAlpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 242, 235, ${alpha})`;
        ctx.fill();
      }

      const connectThreshold = (width / 7) * (height / 7);

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const pa = particles[a];
          const pb = particles[b];
          const midX = (pa.x + pb.x) / 2;
          const weight = spatialWeight(midX, width);
          if (weight < 0.12) continue;

          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= connectThreshold) continue;

          let opacity = (0.06 + (1 - distSq / connectThreshold) * 0.22) * weight;
          let stroke = `rgba(180, 178, 172, ${opacity})`;
          let lineW = 1;

          if (smooth) {
            const midY = (pa.y + pb.y) / 2;
            const dMouse = dist(smooth.x, smooth.y, midX, midY);
            if (dMouse < target.radius) {
              const boost = 1 - dMouse / target.radius;
              opacity = Math.min(0.65, opacity + boost * 0.4);
              stroke = `rgba(235, 232, 225, ${opacity})`;
              lineW = 1 + boost * 0.5;
            }
          }

          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionEnabled = !reduced;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(rect.width, 320);
      const h = Math.max(rect.height, 480);
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobileRef.current = window.matchMedia("(max-width: 768px)").matches;
      const count = particleCount(w, h, mobileRef.current, reduced);
      particlesRef.current = createParticles(w, h, count);
      drawFrame(ctx, w, h, motionEnabled);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      if (!motionEnabled || mobileRef.current) return;
      const rect = section.getBoundingClientRect();
      mouseTargetRef.current.x = e.clientX - rect.left;
      mouseTargetRef.current.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouseTargetRef.current.x = null;
      mouseTargetRef.current.y = null;
    };

    section.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);

    const loop = () => {
      if (visibleRef.current) {
        const { w, h } = sizeRef.current;
        if (w > 0) drawFrame(ctx, w, h, motionEnabled);
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    if (motionEnabled) {
      frameRef.current = requestAnimationFrame(loop);
    }

    let observer: IntersectionObserver | undefined;
    if (motionEnabled) {
      observer = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.isIntersecting;
        },
        { threshold: 0.05 },
      );
      observer.observe(section);
    }

    return () => {
      observer?.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", resize);
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frameRef.current);
    };
  }, [drawFrame, reduced]);

  const scrollToProduct = () => {
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-[var(--clip-bg)] pb-24 md:pb-32"
      aria-labelledby="slyvr-hero-heading"
    >
      <m.div className="pointer-events-none absolute inset-0" style={{ opacity: networkOpacity }} aria-hidden>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_28%,black_52%,black_92%,transparent_100%)]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_72%_42%,rgba(245,242,235,0.04),transparent_60%)]" />
      </m.div>

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--clip-bg)_0%,transparent_22%,transparent_78%,var(--clip-bg)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pt-24 md:grid-cols-12 md:gap-10 md:px-8 md:pt-28 lg:gap-14 lg:pt-32">
        <m.div
          style={{ y: copyY, opacity: copyOpacity }}
          className="md:col-span-5 lg:col-span-5"
        >
          <m.div
            variants={landingHeroContainer}
            initial={reduced ? false : "hidden"}
            animate="visible"
            className="max-w-xl text-left"
          >
            <m.p variants={landingHeroItem} className="text-label mb-5">
              Slyvr · Private video library
            </m.p>

            <m.h1
              id="slyvr-hero-heading"
              variants={landingHeroItem}
              className="text-hero mb-6 max-w-[14ch]"
            >
              Your footage,
              <br />
              one archive.
            </m.h1>

            <m.p variants={landingHeroItem} className="text-lead max-w-md">
              Clips pile up on drives and in camera rolls. Slyvr keeps them in one library — searchable,
              tagged, and ready when you need a cut.
            </m.p>

            <m.ol
              variants={landingHeroItem}
              className="mt-8 space-y-2 border-l border-[var(--clip-border)] pl-4 text-meta"
            >
              <li>Upload what you keep rewatching</li>
              <li>Organize by category and people</li>
              <li>Find a clip in seconds, not folders</li>
            </m.ol>

            <m.div
              variants={landingHeroItem}
              className="mt-10 flex flex-wrap items-center gap-3"
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
          </m.div>
        </m.div>

        <div className="md:col-span-7 lg:col-span-7 md:pt-6 lg:pt-2">
          <HeroArchiveStrip scrollProgress={scrollYProgress} />
        </div>
      </div>

      <m.div
        className="pointer-events-none absolute bottom-8 left-4 hidden md:left-8 md:block"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={motionTransition(reduced, { duration: 0.6, delay: 1 })}
        aria-hidden
      >
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--clip-muted)]">Scroll</p>
        <div className="mt-2 h-8 w-px bg-gradient-to-b from-[var(--clip-border-strong)] to-transparent" />
      </m.div>
    </section>
  );
}

export default AetherFlowHero;

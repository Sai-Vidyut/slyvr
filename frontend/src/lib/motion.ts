import type { Transition, Variants } from "framer-motion";

/** Standard easing — smooth deceleration (entrances, hover settle) */
export const easeOut = [0.22, 1, 0.36, 1] as const;
/** Gentle in-out for surfaces */
export const easeInOut = [0.45, 0, 0.55, 1] as const;

/** Micro interactions — buttons, chips, toggles (100–180ms) */
export const tweenMicro: Transition = {
  type: "tween",
  duration: 0.14,
  ease: easeOut,
};

/** Standard UI — menus, toasts, small panels (180–280ms) */
export const tweenFast: Transition = {
  type: "tween",
  duration: 0.22,
  ease: easeOut,
};

/** @alias tweenFast — naming aligned to motion language */
export const tweenUi = tweenFast;

/** Larger surfaces — drawer, modal (280–450ms) */
export const tweenSurface: Transition = {
  type: "tween",
  duration: 0.34,
  ease: easeOut,
};

/** Page / cinematic beats (400–700ms) */
export const tweenCinematic: Transition = {
  type: "tween",
  duration: 0.48,
  ease: easeOut,
};

/** Subtle spring — only where a spring reads as physical (not bouncy) */
export const springSnappy = {
  type: "spring" as const,
  stiffness: 420,
  damping: 46,
  mass: 0.82,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 360,
  damping: 44,
  mass: 0.88,
};

/** Cap staggered entrance so 100+ cards don't queue for seconds */
export const STAGGER_CAP = 72;
export const STAGGER_DELAY_MS = 0.03;

export function motionTransition(reduced: boolean, preset: Transition = tweenSurface): Transition {
  if (reduced) return { duration: 0 };
  return preset;
}

/** Stagger only the first visible row-ish of cards; rest appear immediately */
export function staggerDelay(index: number, total: number): number {
  const maxStaggered = Math.min(24, STAGGER_CAP);
  if (total > STAGGER_CAP) {
    return index < maxStaggered ? index * STAGGER_DELAY_MS : 0;
  }
  return Math.min(index * STAGGER_DELAY_MS, 0.36);
}

export function shouldAnimateEntrance(total: number, index: number): boolean {
  if (total > STAGGER_CAP) return index < 24;
  return true;
}

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0.96 },
  visible: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0.96 },
};

/** Full-screen / bottom sheet — mobile inspector & browse sheets */
export const sheetUpVariants: Variants = {
  hidden: { y: "100%", opacity: 0.98 },
  visible: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0.98 },
};

export const sidebarLeftVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
  exit: { x: "-100%" },
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.99, y: 4 },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 2 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
};

export const staggerContainer = (reduced: boolean, total: number): Variants => ({
  hidden: {},
  visible: {
    transition:
      reduced || total > STAGGER_CAP
        ? { duration: 0 }
        : {
            staggerChildren: STAGGER_DELAY_MS,
            delayChildren: 0.02,
          },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenMicro,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: tweenUi,
  },
};

/** @deprecated Prefer 3D card tilt; kept for non-card surfaces if needed */
export const cardHoverLift = {
  y: -1,
  transition: tweenMicro,
};

export const pageEnter: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: tweenUi,
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.99 },
  visible: { opacity: 1, scale: 1, transition: tweenUi },
  exit: { opacity: 0, scale: 0.995, transition: tweenMicro },
};

export const buttonTap = { scale: 0.98 };
export const buttonHover = { y: -1 };

export const dropZoneVariants: Variants = {
  idle: {
    scale: 1,
    borderColor: "rgba(100, 116, 139, 0.45)",
  },
  dragOver: {
    scale: 1.005,
    borderColor: "rgba(235, 232, 225, 0.45)",
  },
};

export const drawerSectionContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

export const sidebarExpand: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

export const emptyStateIcon: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: tweenUi,
  },
};

/** Landing page — coordinated hero entrance */
export const landingHeroContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

export const landingHeroItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenCinematic,
  },
};

export const landingSectionReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenCinematic,
  },
};

export const landingMediaCard: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: tweenCinematic,
  },
};

/** Editorial sections — restrained horizontal emphasis */
export const landingEditorialReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenCinematic,
  },
};

export const landingEditorialRevealLeft: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenCinematic,
  },
};

export const landingQuietReveal: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenCinematic,
  },
};

export const landingLineReveal: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: tweenCinematic,
  },
};

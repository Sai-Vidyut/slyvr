/** Deterministic landing media — always has a cinematic CSS fallback if remote load fails */

export type LandingClipStill = {
  id: string;
  title: string;
  category: string;
  duration: string;
  size: string;
  date: string;
  /** Optional remote still (picsum seed is stable when reachable) */
  src?: string;
  fallback: {
    from: string;
    to: string;
    grain?: number;
  };
};

export const LANDING_CLIPS: LandingClipStill[] = [
  {
    id: "coastal",
    title: "coastal-reel.mp4",
    category: "Travel",
    duration: "2:14",
    size: "184 MB",
    date: "Mar 8",
    src: "https://picsum.photos/seed/slyvr-coastal/960/600",
    fallback: { from: "#2a3238", to: "#0f1418", grain: 0.35 },
  },
  {
    id: "field",
    title: "field-notes.mkv",
    category: "Documentary",
    duration: "5:02",
    size: "412 MB",
    date: "Feb 19",
    src: "https://picsum.photos/seed/slyvr-field/960/600",
    fallback: { from: "#3a342c", to: "#14110e", grain: 0.4 },
  },
  {
    id: "studio",
    title: "studio-session.mov",
    category: "People",
    duration: "0:48",
    size: "96 MB",
    date: "Jan 30",
    src: "https://picsum.photos/seed/slyvr-studio/960/600",
    fallback: { from: "#2e2a32", to: "#121016", grain: 0.32 },
  },
  {
    id: "rehearsal",
    title: "rehearsal-take-3.mov",
    category: "Work",
    duration: "1:20",
    size: "128 MB",
    date: "Feb 2",
    src: "https://picsum.photos/seed/slyvr-rehearsal/640/400",
    fallback: { from: "#353028", to: "#161310", grain: 0.38 },
  },
  {
    id: "family",
    title: "family-dinner.mp4",
    category: "Family",
    duration: "3:33",
    size: "256 MB",
    date: "Dec 14",
    src: "https://picsum.photos/seed/slyvr-family/640/400",
    fallback: { from: "#322c2a", to: "#141210", grain: 0.3 },
  },
  {
    id: "broll",
    title: "b-roll-03.mkv",
    category: "Travel",
    duration: "0:59",
    size: "72 MB",
    date: "Mar 1",
    src: "https://picsum.photos/seed/slyvr-broll/640/400",
    fallback: { from: "#283038", to: "#0e1216", grain: 0.36 },
  },
  {
    id: "live",
    title: "live-set.mp4",
    category: "Performance",
    duration: "0:32",
    size: "88 MB",
    date: "Jan 12",
    src: "https://picsum.photos/seed/slyvr-live/640/400",
    fallback: { from: "#1a1a1c", to: "#080808", grain: 0.4 },
  },
  {
    id: "summit",
    title: "summit.mov",
    category: "Travel",
    duration: "1:03",
    size: "142 MB",
    date: "Feb 8",
    src: "https://picsum.photos/seed/slyvr-summit/640/400",
    fallback: { from: "#2c3238", to: "#101418", grain: 0.34 },
  },
];

export const HERO_PREVIEW_CLIPS = LANDING_CLIPS.slice(0, 8);

export function clipMetaLine(clip: LandingClipStill): string {
  return `${clip.category} · ${clip.duration} · ${clip.size}`;
}

import type { Category, Clip, Person } from "@/types/clip";
import { LANDING_CLIPS } from "@/lib/landing-clips";

function parseDurationSeconds(label: string): number {
  const parts = label.split(":").map((p) => Number(p));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function parseFileSize(label: string): number {
  const match = label.trim().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return Math.round(value * 1_000_000_000);
  if (unit === "MB") return Math.round(value * 1_000_000);
  if (unit === "KB") return Math.round(value * 1_000);
  return Math.round(value);
}

/** Static fallback when localhost API is unreachable (e.g. production Pages). */
export const STATIC_DEMO_CLIPS: Clip[] = LANDING_CLIPS.map((clip, index) => ({
  id: -(index + 1),
  title: clip.title,
  description: `Demo clip · ${clip.category}`,
  category: clip.category,
  people: index % 2 === 0 ? ["Alex Rivera"] : ["Sam Chen"],
  blob_url: clip.src ?? null,
  thumbnail_url: clip.src ?? null,
  original_filename: clip.title,
  camera_model: index % 3 === 0 ? "iPhone 15 Pro" : "EOS R5",
  camera_make: index % 3 === 0 ? "Apple" : "Canon",
  location_label: clip.category === "Travel" ? "Demo location" : null,
  uploaded_at: new Date(Date.UTC(2026, 1, 20 - index)).toISOString(),
  file_size: parseFileSize(clip.size),
  mime_type: clip.title.endsWith(".mkv")
    ? "video/x-matroska"
    : clip.title.endsWith(".mov")
      ? "video/quicktime"
      : "video/mp4",
  duration_seconds: parseDurationSeconds(clip.duration),
  metadata: null,
}));

export const STATIC_DEMO_CATEGORIES: Category[] = Array.from(
  new Set(STATIC_DEMO_CLIPS.map((c) => c.category).filter(Boolean) as string[]),
).map((name, i) => ({ id: -(i + 1), name }));

export const STATIC_DEMO_PEOPLE: Person[] = Array.from(
  new Set(STATIC_DEMO_CLIPS.flatMap((c) => c.people)),
).map((name, i) => ({ id: -(i + 1), name }));

export type DemoLibrary = {
  clips: Clip[];
  categories: Category[];
  people: Person[];
  source: "localhost" | "static";
};

const LOCAL_API = "http://127.0.0.1:8000";

async function fetchJson<T>(path: string, timeoutMs = 700): Promise<T | null> {
  try {
    const response = await fetch(`${LOCAL_API}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Production: always static, read-only sample data (never authenticated APIs).
 * Local/dev: optionally prefer unreachable-auth localhost only when not in PROD.
 */
export async function resolveDemoLibrary(): Promise<DemoLibrary> {
  if (import.meta.env.PROD) {
    return {
      clips: STATIC_DEMO_CLIPS,
      categories: STATIC_DEMO_CATEGORIES,
      people: STATIC_DEMO_PEOPLE,
      source: "static",
    };
  }

  // Dev-only: try unauthenticated local API. If auth is required (401), fall back to static.
  const clipsPayload = await fetchJson<{ clips: Clip[] }>("/clips");
  if (clipsPayload?.clips?.length) {
    const [categories, people] = await Promise.all([
      fetchJson<Category[]>("/categories/all"),
      fetchJson<Person[]>("/people"),
    ]);

    const derivedCategories =
      categories && categories.length > 0
        ? categories
        : Array.from(
            new Set(
              clipsPayload.clips
                .map((c) => c.category)
                .filter((name): name is string => Boolean(name)),
            ),
          ).map((name, i) => ({ id: i + 1, name }));

    const derivedPeople =
      people && people.length > 0
        ? people
        : Array.from(new Set(clipsPayload.clips.flatMap((c) => c.people ?? []))).map(
            (name, i) => ({ id: i + 1, name }),
          );

    return {
      clips: clipsPayload.clips,
      categories: derivedCategories,
      people: derivedPeople,
      source: "localhost",
    };
  }

  return {
    clips: STATIC_DEMO_CLIPS,
    categories: STATIC_DEMO_CATEGORIES,
    people: STATIC_DEMO_PEOPLE,
    source: "static",
  };
}

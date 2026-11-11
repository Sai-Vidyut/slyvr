/** When true, clip media/thumbnails are loaded via authenticated read-url API (Phase 3). */
export function isSignedMediaReadsEnabled(): boolean {
  return import.meta.env.VITE_SIGNED_MEDIA_READS === "1";
}

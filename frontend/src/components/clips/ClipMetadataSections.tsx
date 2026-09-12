import type { ReactNode } from "react";
import { Camera, FileVideo, MapPin } from "lucide-react";

import type { Clip, ClipMetadata } from "@/types/clip";

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-[var(--clip-muted)]">{label}</dt>
      <dd className="truncate text-[var(--clip-fg)]" title={String(value)}>
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Camera;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-2 text-meta">
        <Icon size={14} aria-hidden />
        {title}
      </p>
      <dl className="space-y-1.5 rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)]/40 px-3 py-2.5">
        {children}
      </dl>
    </section>
  );
}

function formatBytes(bytes?: number | null) {
  if (bytes == null || bytes <= 0) return null;
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return null;
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function ClipMetadataSections({ clip }: { clip: Clip }) {
  const meta: ClipMetadata = clip.metadata ?? {};
  const file = meta.file ?? {};
  const capture = meta.capture ?? {};
  const location = meta.location ?? {};
  const video = meta.video ?? {};

  const width = clip.width ?? file.width;
  const height = clip.height ?? file.height;
  const dims =
    width != null && height != null ? `${width} × ${height}` : null;

  const lat = clip.latitude ?? location.latitude;
  const lng = clip.longitude ?? location.longitude;
  const coords =
    lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null;

  const mapsHref =
    lat != null && lng != null
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`
      : null;

  const hasFile =
    clip.original_filename ||
    clip.mime_type ||
    file.mime_type ||
    dims ||
    clip.file_size;
  const hasCapture =
    clip.recorded_at ||
    capture.captured_at ||
    clip.camera_make ||
    clip.camera_model ||
    capture.lens_model ||
    capture.aperture ||
    capture.shutter_speed ||
    capture.iso;
  const hasLocation = coords || clip.location_label;
  const hasVideo =
    clip.duration_seconds ||
    video.duration_seconds ||
    video.codec ||
    video.frame_rate ||
    video.bitrate;

  if (!hasFile && !hasCapture && !hasLocation && !hasVideo) return null;

  return (
    <div className="space-y-4 border-t border-[var(--clip-border)] pt-4">
      <p className="text-label">Metadata</p>

      {hasFile && (
        <Section title="File" icon={FileVideo}>
          <MetaRow label="Filename" value={clip.original_filename || file.filename} />
          <MetaRow label="Type" value={clip.mime_type || file.mime_type} />
          <MetaRow label="Size" value={formatBytes(clip.file_size ?? file.file_size)} />
          <MetaRow label="Dimensions" value={dims} />
        </Section>
      )}

      {hasCapture && (
        <Section title="Capture" icon={Camera}>
          <MetaRow
            label="Captured"
            value={
              clip.recorded_at || capture.captured_at
                ? new Date(
                    (clip.recorded_at || capture.captured_at) as string,
                  ).toLocaleString()
                : null
            }
          />
          <MetaRow
            label="Device"
            value={
              [clip.camera_make || capture.camera_make, clip.camera_model || capture.camera_model]
                .filter(Boolean)
                .join(" ") || null
            }
          />
          <MetaRow label="Lens" value={capture.lens_model} />
          <MetaRow label="Focal length" value={capture.focal_length} />
          <MetaRow label="Aperture" value={capture.aperture} />
          <MetaRow label="Shutter" value={capture.shutter_speed} />
          <MetaRow label="ISO" value={capture.iso} />
          <MetaRow label="White balance" value={capture.white_balance} />
        </Section>
      )}

      {hasLocation && (
        <Section title="Location" icon={MapPin}>
          <MetaRow label="Label" value={clip.location_label} />
          <MetaRow label="Coordinates" value={coords} />
          <MetaRow label="Altitude" value={location.altitude != null ? `${location.altitude} m` : null} />
          {mapsHref && (
            <div className="pt-1">
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--clip-fg)] underline-offset-2 hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </div>
          )}
        </Section>
      )}

      {hasVideo && (
        <Section title="Video" icon={FileVideo}>
          <MetaRow
            label="Duration"
            value={formatDuration(clip.duration_seconds ?? video.duration_seconds)}
          />
          <MetaRow label="Codec" value={video.codec} />
          <MetaRow label="Frame rate" value={video.frame_rate} />
          <MetaRow
            label="Bitrate"
            value={video.bitrate != null ? `${Math.round(video.bitrate / 1000)} kbps` : null}
          />
          <MetaRow label="Container" value={video.container} />
          <MetaRow label="Audio" value={video.audio_codec} />
        </Section>
      )}
    </div>
  );
}

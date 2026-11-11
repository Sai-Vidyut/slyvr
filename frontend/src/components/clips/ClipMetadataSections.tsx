import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  Aperture,
  Camera,
  ChevronDown,
  FileVideo,
  History,
  MapPin,
  Scan,
} from "lucide-react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buildClipMetadataView } from "@/lib/clip-metadata-view";
import { motionTransition, sidebarExpand, tweenMicro } from "@/lib/motion";
import type { Clip } from "@/types/clip";

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

function formatCapturedAt(iso?: string | null, timezoneOffset?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const base = date.toLocaleString();
  if (timezoneOffset) {
    return `${base} (${timezoneOffset})`;
  }
  return base;
}

function formatMediaKind(kind?: string | null) {
  if (!kind) return null;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatFocalLength(value?: string | number | null) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return `${value} mm`;
  return String(value);
}

function DisclosureToggle({
  open,
  onToggle,
  label,
  reduced,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  reduced: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-1.5 pt-1 text-left text-xs text-[var(--clip-fg)] underline-offset-2 hover:underline"
    >
      <m.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={motionTransition(reduced, tweenMicro)}
        className="inline-flex"
        aria-hidden
      >
        <ChevronDown size={14} />
      </m.span>
      {label}
    </button>
  );
}

export function ClipMetadataSections({ clip }: { clip: Clip }) {
  const reduced = useReducedMotion();
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const view = useMemo(() => buildClipMetadataView(clip), [clip]);

  const isVideoLike =
    view.atAGlance.mediaKind === "video" || view.videoAudio.durationSeconds != null;

  const atGlanceLocation =
    view.atAGlance.locationSummary ??
    (view.location.summary.hasCoordinates ? "GPS coordinates recorded" : null);

  const hasAnySection =
    view.atAGlance.hasContent ||
    view.captureCamera.hasContent ||
    view.lensExposure.hasContent ||
    view.location.summary.hasContent ||
    view.videoAudio.hasContent ||
    view.file.hasContent ||
    view.provenance.hasContent ||
    view.advanced.hasContent;

  if (!hasAnySection) return null;

  const coords = view.location.coordinates;
  const mapsHref =
    coords.latitude != null && coords.longitude != null
      ? `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}#map=14/${coords.latitude}/${coords.longitude}`
      : null;

  return (
    <div className="space-y-4 border-t border-[var(--clip-border)] pt-4">
      <p className="text-label">Metadata</p>

      {view.atAGlance.hasContent && (
        <Section title="At a glance" icon={Scan}>
          <MetaRow label="Media" value={formatMediaKind(view.atAGlance.mediaKind)} />
          <MetaRow
            label="Captured"
            value={formatCapturedAt(view.atAGlance.capturedAt, view.atAGlance.timezoneOffset)}
          />
          <MetaRow label="Camera" value={view.atAGlance.cameraLine} />
          <MetaRow label="Location" value={atGlanceLocation} />
          {isVideoLike && (
            <MetaRow
              label="Duration"
              value={formatDuration(view.atAGlance.durationSeconds)}
            />
          )}
          {!isVideoLike && (
            <MetaRow label="Dimensions" value={view.atAGlance.dimensions} />
          )}
        </Section>
      )}

      {view.captureCamera.hasContent && (
        <Section title="Capture & camera" icon={Camera}>
          <MetaRow
            label="Captured"
            value={formatCapturedAt(
              view.captureCamera.capturedAt,
              view.captureCamera.timezoneOffset,
            )}
          />
          <MetaRow label="Make" value={view.captureCamera.make} />
          <MetaRow label="Model" value={view.captureCamera.model} />
          <MetaRow label="Modified" value={formatCapturedAt(view.captureCamera.modifiedAt)} />
          <MetaRow label="Date source" value={view.captureCamera.capturedAtSource} />
        </Section>
      )}

      {view.lensExposure.hasContent && (
        <Section title="Lens & exposure" icon={Aperture}>
          <MetaRow label="Lens" value={view.lensExposure.lensModel} />
          <MetaRow
            label="Focal length"
            value={formatFocalLength(view.lensExposure.focalLengthMm)}
          />
          <MetaRow
            label="35mm equiv."
            value={formatFocalLength(view.lensExposure.focalLength35mmEquiv)}
          />
          <MetaRow label="Aperture" value={view.lensExposure.aperture} />
          <MetaRow label="Shutter" value={view.lensExposure.shutter} />
          <MetaRow label="ISO" value={view.lensExposure.iso} />
          <MetaRow label="Exp. comp." value={view.lensExposure.exposureCompensation} />
          <MetaRow label="Flash" value={view.lensExposure.flash} />
          <MetaRow label="White balance" value={view.lensExposure.whiteBalance} />
        </Section>
      )}

      {view.location.summary.hasContent && (
        <Section title="Location" icon={MapPin}>
          <MetaRow label="Label" value={view.location.summary.label} />
          {view.location.summary.hasCoordinates && (
            <>
              <div className="text-sm text-[var(--clip-muted)]">
                Precise coordinates are available for this clip.
              </div>
              <DisclosureToggle
                open={coordsOpen}
                onToggle={() => setCoordsOpen((v) => !v)}
                label={coordsOpen ? "Hide coordinates" : "Show precise coordinates"}
                reduced={reduced}
              />
              <AnimatePresence initial={false}>
                {coordsOpen && coords.hasContent && (
                  <m.div
                    key="coords"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={sidebarExpand}
                    transition={motionTransition(reduced, tweenMicro)}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 pt-1">
                      <MetaRow
                        label="Latitude"
                        value={
                          coords.latitude != null ? coords.latitude.toFixed(5) : null
                        }
                      />
                      <MetaRow
                        label="Longitude"
                        value={
                          coords.longitude != null ? coords.longitude.toFixed(5) : null
                        }
                      />
                      <MetaRow
                        label="Altitude"
                        value={
                          coords.altitude != null ? `${coords.altitude} m` : null
                        }
                      />
                      <MetaRow label="GPS time" value={coords.gpsTimestamp} />
                      <MetaRow
                        label="GPS accuracy"
                        value={
                          coords.horizontalAccuracyM != null
                            ? `±${coords.horizontalAccuracyM} m`
                            : null
                        }
                      />
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
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </>
          )}
        </Section>
      )}

      {view.videoAudio.hasContent && (
        <Section title="Video & audio" icon={FileVideo}>
          <MetaRow
            label="Duration"
            value={formatDuration(view.videoAudio.durationSeconds)}
          />
          <MetaRow label="Video codec" value={view.videoAudio.videoCodec} />
          <MetaRow label="Frame rate" value={view.videoAudio.frameRate} />
          {isVideoLike && (
            <MetaRow label="Dimensions" value={view.atAGlance.dimensions} />
          )}
          <MetaRow
            label="Video bitrate"
            value={
              view.videoAudio.videoBitrate != null
                ? `${Math.round(view.videoAudio.videoBitrate / 1000)} kbps`
                : null
            }
          />
          <MetaRow label="Container" value={view.videoAudio.container} />
          <MetaRow
            label="Rotation"
            value={
              view.videoAudio.rotationDegrees != null
                ? `${view.videoAudio.rotationDegrees}°`
                : null
            }
          />
          <MetaRow label="Audio codec" value={view.videoAudio.audioCodec} />
          <MetaRow label="Audio channels" value={view.videoAudio.audioChannels} />
          <MetaRow
            label="Sample rate"
            value={
              view.videoAudio.audioSampleRate != null
                ? `${view.videoAudio.audioSampleRate} Hz`
                : null
            }
          />
        </Section>
      )}

      {view.file.hasContent && (
        <Section title="File" icon={FileVideo}>
          <MetaRow label="Filename" value={view.file.originalFilename} />
          <MetaRow label="Extension" value={view.file.extension} />
          <MetaRow label="MIME type" value={view.file.mimeType} />
          <MetaRow label="Size" value={formatBytes(view.file.sizeBytes)} />
          {!isVideoLike && (
            <MetaRow
              label="Dimensions"
              value={
                view.file.width != null && view.file.height != null
                  ? `${view.file.width} × ${view.file.height}`
                  : null
              }
            />
          )}
          {!view.videoAudio.container && view.file.mimeType && (
            <MetaRow label="Format" value={view.file.extension || view.file.mimeType} />
          )}
        </Section>
      )}

      {view.provenance.hasContent && (
        <Section title="Provenance" icon={History}>
          <MetaRow label="Software" value={view.provenance.software} />
          <MetaRow label="Encoder" value={view.provenance.encoder} />
          <MetaRow label="Created (file)" value={view.provenance.createDateRaw} />
          <MetaRow label="Modified (file)" value={view.provenance.modifyDateRaw} />
          <MetaRow
            label="Uploaded"
            value={formatCapturedAt(view.provenance.ingestUploadedAt)}
          />
          <MetaRow
            label="Uploaded by"
            value={view.provenance.ingestUploadedByDisplayName}
          />
        </Section>
      )}

      {view.advanced.hasContent && (
        <section className="space-y-2">
          <DisclosureToggle
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((v) => !v)}
            label={advancedOpen ? "Hide technical details" : "Show technical details"}
            reduced={reduced}
          />
          <AnimatePresence initial={false}>
            {advancedOpen && (
              <m.div
                key="advanced"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={sidebarExpand}
                transition={motionTransition(reduced, tweenMicro)}
                className="overflow-hidden"
              >
                <dl className="space-y-1.5 rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)]/40 px-3 py-2.5">
                  <MetaRow
                    label="Schema"
                    value={
                      view.advanced.schemaVersion != null
                        ? `v${view.advanced.schemaVersion}`
                        : null
                    }
                  />
                  <MetaRow label="Orientation" value={view.advanced.orientation} />
                  <MetaRow label="Color space" value={view.advanced.colorSpace} />
                  <MetaRow label="Video profile" value={view.advanced.videoProfile} />
                  <MetaRow label="Video level" value={view.advanced.videoLevel} />
                  <MetaRow label="Pixel format" value={view.advanced.pixelFormat} />
                </dl>
              </m.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

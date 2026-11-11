/**
 * Clip metadata view model — normalizes API clip rows (v1, v2, partial) for Inspector UI.
 *
 * Precedence (first meaningful value wins):
 * 1. Top-level normalized Clip fields
 * 2. Schema v2 metadata groups (device, lens_exposure, location, video.stream, audio.stream, file, provenance, v2 capture)
 * 3. Legacy metadata shims (capture, file, video)
 * 4. undefined / null
 *
 * Empty strings are treated as missing. Never throws on absent or partial metadata.
 */

import type { Clip, ClipMetadata, ClipMetadataCapture, ClipMetadataV2Capture } from "@/types/clip";

export interface SectionWithContent {
  hasContent: boolean;
}

export interface ClipMetadataAtAGlanceView extends SectionWithContent {
  mediaKind: string | null;
  capturedAt: string | null;
  timezoneOffset: string | null;
  locationSummary: string | null;
  cameraLine: string | null;
  dimensions: string | null;
  durationSeconds: number | null;
}

export interface ClipMetadataCaptureCameraView extends SectionWithContent {
  make: string | null;
  model: string | null;
  capturedAt: string | null;
  modifiedAt: string | null;
  capturedAtSource: string | null;
  timezoneOffset: string | null;
}

export interface ClipMetadataLensExposureView extends SectionWithContent {
  lensModel: string | null;
  focalLengthMm: string | number | null;
  focalLength35mmEquiv: string | number | null;
  aperture: string | number | null;
  shutter: string | number | null;
  iso: string | number | null;
  exposureCompensation: string | number | null;
  flash: string | null;
  whiteBalance: string | null;
}

export interface ClipMetadataLocationSummaryView extends SectionWithContent {
  label: string | null;
  hasCoordinates: boolean;
}

export interface ClipMetadataLocationCoordinatesView extends SectionWithContent {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  gpsTimestamp: string | null;
  horizontalAccuracyM: number | null;
}

export interface ClipMetadataLocationView {
  summary: ClipMetadataLocationSummaryView;
  coordinates: ClipMetadataLocationCoordinatesView;
}

export interface ClipMetadataVideoAudioView extends SectionWithContent {
  durationSeconds: number | null;
  container: string | null;
  videoBitrate: number | null;
  videoCodec: string | null;
  frameRate: string | null;
  rotationDegrees: number | null;
  audioCodec: string | null;
  audioChannels: number | null;
  audioSampleRate: number | null;
  audioBitrate: number | null;
}

export interface ClipMetadataFileView extends SectionWithContent {
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
}

export interface ClipMetadataProvenanceView extends SectionWithContent {
  software: string | null;
  encoder: string | null;
  createDateRaw: string | null;
  modifyDateRaw: string | null;
  ingestUploadedAt: string | null;
  ingestUploadedByDisplayName: string | null;
  ingestLibraryId: number | null;
}

export interface ClipMetadataAdvancedView extends SectionWithContent {
  schemaVersion: number | null;
  orientation: string | number | null;
  colorSpace: string | null;
  videoProfile: string | null;
  videoLevel: number | null;
  pixelFormat: string | null;
}

export interface ClipMetadataView {
  atAGlance: ClipMetadataAtAGlanceView;
  captureCamera: ClipMetadataCaptureCameraView;
  lensExposure: ClipMetadataLensExposureView;
  location: ClipMetadataLocationView;
  videoAudio: ClipMetadataVideoAudioView;
  file: ClipMetadataFileView;
  provenance: ClipMetadataProvenanceView;
  advanced: ClipMetadataAdvancedView;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function pickString(...candidates: unknown[]): string | null {
  for (const value of candidates) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(...candidates: unknown[]): number | null {
  for (const value of candidates) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickIso(...candidates: unknown[]): string | number | null {
  for (const value of candidates) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const asNum = Number(value);
      if (Number.isFinite(asNum)) {
        return asNum;
      }
      return value.trim();
    }
  }
  return null;
}

function sectionHasContent(values: unknown[]): boolean {
  return values.some((value) => {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim() !== "";
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    if (typeof value === "boolean") {
      return value;
    }
    return true;
  });
}

function pickScalar(...candidates: unknown[]): string | number | null {
  const num = pickNumber(...candidates);
  if (num !== null) {
    return num;
  }
  return pickString(...candidates);
}

function legacyCapture(meta: ClipMetadata | null | undefined): ClipMetadataCapture | null {
  const capture = meta?.capture;
  if (!capture || typeof capture !== "object") {
    return null;
  }
  if (
    "camera_make" in capture ||
    "camera_model" in capture ||
    "lens_model" in capture ||
    "focal_length" in capture ||
    ("captured_at" in capture && !("captured_at_source" in capture))
  ) {
    return capture;
  }
  return null;
}

function v2Capture(meta: ClipMetadata | null | undefined): ClipMetadataV2Capture | null {
  const capture = meta?.capture;
  if (!capture || typeof capture !== "object") {
    return null;
  }
  if (
    "captured_at_source" in capture ||
    "modified_at" in capture ||
    ("timezone_offset" in capture && !("camera_make" in capture))
  ) {
    return capture;
  }
  return null;
}

function formatDimensions(width: number | null, height: number | null): string | null {
  if (width === null || height === null) {
    return null;
  }
  return `${width} × ${height}`;
}

function formatCameraLine(make: string | null, model: string | null): string | null {
  if (make && model) {
    return `${make} ${model}`;
  }
  return make ?? model;
}

export function buildClipMetadataView(clip: Clip): ClipMetadataView {
  const meta: ClipMetadata | null = clip.metadata ?? null;
  const device = meta?.device;
  const lens = meta?.lens_exposure;
  const loc = meta?.location;
  const fileMeta = meta?.file;
  const video = meta?.video;
  const vStream = video?.stream;
  const audio = meta?.audio;
  const aStream = audio?.stream;
  const provenance = meta?.provenance;
  const fileHistory = provenance?.file_history;
  const ingest = provenance?.ingest;
  const capLegacy = legacyCapture(meta);
  const capV2 = v2Capture(meta);

  const make = pickString(clip.camera_make, device?.make, capLegacy?.camera_make);
  const model = pickString(clip.camera_model, device?.model, capLegacy?.camera_model);

  const capturedAt = pickString(
    clip.recorded_at,
    capLegacy?.captured_at,
    capV2?.captured_at,
  );

  const timezoneOffset = pickString(
    clip.capture_timezone_offset,
    capV2?.timezone_offset,
  );

  const lensModel = pickString(
    clip.lens_model,
    lens?.lens_model,
    capLegacy?.lens_model,
  );

  const iso = pickIso(clip.iso, lens?.iso, capLegacy?.iso);

  const latitude = pickNumber(clip.latitude, loc?.latitude);
  const longitude = pickNumber(clip.longitude, loc?.longitude);
  const altitude = pickNumber(clip.altitude, loc?.altitude);

  const hasCoordinates =
    latitude !== null && longitude !== null;

  const locationSummary = pickString(clip.location_label);

  const mediaKind = pickString(clip.media_kind, fileMeta?.media_kind);

  const width = pickNumber(clip.width, fileMeta?.width, vStream?.width);
  const height = pickNumber(clip.height, fileMeta?.height, vStream?.height);

  const durationSeconds = pickNumber(
    clip.duration_seconds,
    video?.duration_seconds,
  );

  const videoCodec = pickString(
    clip.video_codec,
    vStream?.codec,
    video?.codec,
  );

  const audioCodec = pickString(
    clip.audio_codec,
    aStream?.codec,
    video?.audio_codec,
  );

  const software = pickString(
    clip.software,
    fileHistory?.software,
    capLegacy?.software,
  );

  const captureCamera: ClipMetadataCaptureCameraView = {
    make,
    model,
    capturedAt,
    modifiedAt: pickString(capV2?.modified_at),
    capturedAtSource: pickString(capV2?.captured_at_source),
    timezoneOffset,
    hasContent: sectionHasContent([
      make,
      model,
      capturedAt,
      capV2?.modified_at,
      capV2?.captured_at_source,
      timezoneOffset,
    ]),
  };

  const lensExposure: ClipMetadataLensExposureView = {
    lensModel,
    focalLengthMm: pickScalar(lens?.focal_length_mm, capLegacy?.focal_length),
    focalLength35mmEquiv: pickScalar(
      lens?.focal_length_35mm_equiv,
      capLegacy?.focal_length_35mm,
    ),
    aperture: pickScalar(lens?.aperture_f, capLegacy?.aperture),
    shutter: pickScalar(lens?.shutter_s, capLegacy?.shutter_speed),
    iso,
    exposureCompensation: pickScalar(
      lens?.exposure_compensation,
      capLegacy?.exposure_compensation,
    ),
    flash: pickString(lens?.flash, capLegacy?.flash),
    whiteBalance: pickString(lens?.white_balance, capLegacy?.white_balance),
    hasContent: sectionHasContent([
      lensModel,
      lens?.focal_length_mm,
      capLegacy?.focal_length,
      lens?.aperture_f,
      capLegacy?.aperture,
      iso,
      lens?.flash,
      capLegacy?.flash,
    ]),
  };

  const location: ClipMetadataLocationView = {
    summary: {
      label: locationSummary,
      hasCoordinates,
      hasContent: sectionHasContent([locationSummary]) || hasCoordinates,
    },
    coordinates: {
      latitude,
      longitude,
      altitude,
      gpsTimestamp: pickString(loc?.gps_timestamp),
      horizontalAccuracyM: pickNumber(loc?.horizontal_accuracy_m),
      hasContent: sectionHasContent([
        latitude,
        longitude,
        altitude,
        loc?.gps_timestamp,
        loc?.horizontal_accuracy_m,
      ]),
    },
  };

  const videoAudio: ClipMetadataVideoAudioView = {
    durationSeconds,
    container: pickString(video?.container),
    videoBitrate: pickNumber(video?.bitrate, vStream?.bitrate),
    videoCodec,
    frameRate: pickString(vStream?.frame_rate, video?.frame_rate),
    rotationDegrees: pickNumber(video?.rotation_degrees),
    audioCodec,
    audioChannels: pickNumber(aStream?.channels, video?.audio_channels),
    audioSampleRate: pickNumber(aStream?.sample_rate, video?.audio_sample_rate),
    audioBitrate: pickNumber(aStream?.bitrate),
    hasContent: sectionHasContent([
      durationSeconds,
      video?.container,
      videoCodec,
      audioCodec,
      vStream?.frame_rate,
    ]),
  };

  const file: ClipMetadataFileView = {
    originalFilename: pickString(
      clip.original_filename,
      fileMeta?.original_filename,
      fileMeta?.filename,
    ),
    mimeType: pickString(clip.mime_type, fileMeta?.mime_type),
    extension: pickString(fileMeta?.extension),
    sizeBytes: pickNumber(clip.file_size, fileMeta?.size_bytes, fileMeta?.file_size),
    width,
    height,
    hasContent: sectionHasContent([
      clip.original_filename,
      fileMeta?.filename,
      clip.mime_type,
      clip.file_size,
      width,
      height,
    ]),
  };

  const provenanceView: ClipMetadataProvenanceView = {
    software,
    encoder: pickString(fileHistory?.encoder),
    createDateRaw: pickString(fileHistory?.create_date_raw),
    modifyDateRaw: pickString(fileHistory?.modify_date_raw),
    ingestUploadedAt: pickString(ingest?.uploaded_at, clip.uploaded_at),
    ingestUploadedByDisplayName: pickString(
      ingest?.uploaded_by_display_name,
      clip.uploaded_by?.display_name,
    ),
    ingestLibraryId: pickNumber(ingest?.library_id, clip.library_id),
    hasContent: sectionHasContent([
      software,
      fileHistory?.encoder,
      fileHistory?.create_date_raw,
      ingest?.uploaded_at,
      ingest?.uploaded_by_display_name,
    ]),
  };

  const advanced: ClipMetadataAdvancedView = {
    schemaVersion: pickNumber(meta?.schema_version),
    orientation: lens?.orientation ?? capLegacy?.orientation ?? null,
    colorSpace: pickString(lens?.color_space, capLegacy?.color_space),
    videoProfile: pickString(vStream?.profile),
    videoLevel: pickNumber(vStream?.level),
    pixelFormat: pickString(vStream?.pixel_format),
    hasContent: sectionHasContent([
      meta?.schema_version,
      lens?.orientation,
      capLegacy?.color_space,
      vStream?.profile,
    ]),
  };

  const atAGlance: ClipMetadataAtAGlanceView = {
    mediaKind,
    capturedAt,
    timezoneOffset,
    locationSummary,
    cameraLine: formatCameraLine(make, model),
    dimensions: formatDimensions(width, height),
    durationSeconds,
    hasContent: sectionHasContent([
      mediaKind,
      capturedAt,
      locationSummary,
      make,
      model,
      width,
      height,
      durationSeconds,
    ]),
  };

  return {
    atAGlance,
    captureCamera,
    lensExposure,
    location,
    videoAudio,
    file,
    provenance: provenanceView,
    advanced,
  };
}

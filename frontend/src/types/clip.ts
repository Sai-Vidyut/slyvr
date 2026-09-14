export interface Person {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

/** Legacy v1 / serializer shim file section. */
export interface ClipMetadataFile {
  filename?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  extension?: string | null;
  width?: number | null;
  height?: number | null;
  /** Present on schema v2 `file` group before API legacy shim. */
  original_filename?: string | null;
  size_bytes?: number | null;
  media_kind?: string | null;
}

/** Legacy v1 / serializer shim capture section. */
export interface ClipMetadataCapture {
  captured_at?: string | null;
  camera_make?: string | null;
  camera_model?: string | null;
  lens_model?: string | null;
  focal_length?: string | number | null;
  focal_length_35mm?: string | number | null;
  aperture?: string | number | null;
  shutter_speed?: string | number | null;
  iso?: string | number | null;
  exposure_compensation?: string | number | null;
  flash?: string | null;
  white_balance?: string | null;
  software?: string | null;
  orientation?: string | number | null;
  color_space?: string | null;
}

export interface ClipMetadataLocation {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  gps_timestamp?: string | null;
  horizontal_accuracy_m?: number | null;
}

/** Legacy v1 / serializer shim video section. */
export interface ClipMetadataVideo {
  duration_seconds?: number | null;
  codec?: string | null;
  frame_rate?: string | null;
  bitrate?: number | null;
  container?: string | null;
  audio_codec?: string | null;
  audio_channels?: number | null;
  audio_sample_rate?: number | null;
  rotation_degrees?: number | null;
  stream?: ClipMetadataVideoStream | null;
}

export interface ClipMetadataVideoStream {
  codec?: string | null;
  profile?: string | null;
  level?: number | null;
  width?: number | null;
  height?: number | null;
  frame_rate?: string | null;
  pixel_format?: string | null;
  bitrate?: number | null;
}

export interface ClipMetadataAudioStream {
  codec?: string | null;
  channels?: number | null;
  sample_rate?: number | null;
  bitrate?: number | null;
}

export interface ClipMetadataAudio {
  stream?: ClipMetadataAudioStream | null;
}

/** Schema v2 capture group (may be replaced by legacy shim in API responses). */
export interface ClipMetadataV2Capture {
  captured_at?: string | null;
  captured_at_source?: string | null;
  modified_at?: string | null;
  timezone_offset?: string | null;
}

/** Union of legacy capture shim and raw v2 capture group on the same JSON key. */
export type ClipMetadataCaptureSection = ClipMetadataCapture &
  Partial<ClipMetadataV2Capture>;

export interface ClipMetadataV2Device {
  make?: string | null;
  model?: string | null;
}

export interface ClipMetadataV2LensExposure {
  lens_model?: string | null;
  focal_length_mm?: string | number | null;
  focal_length_35mm_equiv?: string | number | null;
  aperture_f?: string | number | null;
  shutter_s?: string | number | null;
  iso?: string | number | null;
  exposure_compensation?: string | number | null;
  flash?: string | null;
  white_balance?: string | null;
  orientation?: string | number | null;
  color_space?: string | null;
}

export interface ClipMetadataV2ProvenanceFileHistory {
  software?: string | null;
  encoder?: string | null;
  create_date_raw?: string | null;
  modify_date_raw?: string | null;
}

export interface ClipMetadataV2ProvenanceIngest {
  uploaded_at?: string | null;
  uploaded_by_user_id?: string | null;
  uploaded_by_display_name?: string | null;
  library_id?: number | null;
}

export interface ClipMetadataV2Provenance {
  file_history?: ClipMetadataV2ProvenanceFileHistory | null;
  ingest?: ClipMetadataV2ProvenanceIngest | null;
}

/**
 * Clip `metadata` JSON: legacy v1 sections and/or schema v2 groups.
 * API v2 responses merge legacy shims into `capture`, `file`, and `video`.
 */
export interface ClipMetadata {
  schema_version?: number | null;
  capture?: ClipMetadataCaptureSection | null;
  device?: ClipMetadataV2Device | null;
  lens_exposure?: ClipMetadataV2LensExposure | null;
  location?: ClipMetadataLocation | null;
  video?: ClipMetadataVideo | null;
  audio?: ClipMetadataAudio | null;
  file?: ClipMetadataFile | null;
  provenance?: ClipMetadataV2Provenance | null;
}

export interface Clip {
  id: number;
  library_id?: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  people: string[];
  blob_url?: string | null;
  thumbnail_url?: string | null;
  original_filename?: string | null;
  stored_filename?: string | null;
  camera_model?: string | null;
  camera_make?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  location_label?: string | null;
  recorded_at?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: {
    id: string;
    display_name?: string | null;
    email?: string | null;
  } | null;
  file_size?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  media_kind?: string | null;
  lens_model?: string | null;
  iso?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  has_gps?: boolean | null;
  capture_timezone_offset?: string | null;
  software?: string | null;
  metadata?: ClipMetadata | null;
}

export interface ClipListResponse {
  clips: Clip[];
}

export interface SearchFacets {
  people?: string[];
  categories?: string[];
  devices?: string[];
  years?: string[];
  locations?: string[];
  file_types?: string[];
}

export interface SearchResponse {
  clips: Clip[];
  facets: SearchFacets;
}

export interface SearchParams {
  q: string;
  person?: string;
  category?: string;
  device?: string;
  year?: string;
  location?: string;
  file_type?: string;
}

export interface UpdateClipPayload {
  title: string;
  description: string;
  category: string;
}

export interface HealthResponse {
  status: string;
}

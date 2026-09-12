export interface Person {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface ClipMetadataFile {
  filename?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  extension?: string | null;
  width?: number | null;
  height?: number | null;
}

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
}

export interface ClipMetadataVideo {
  duration_seconds?: number | null;
  codec?: string | null;
  frame_rate?: string | null;
  bitrate?: number | null;
  container?: string | null;
  audio_codec?: string | null;
  audio_channels?: number | null;
  audio_sample_rate?: number | null;
}

export interface ClipMetadata {
  file?: ClipMetadataFile;
  capture?: ClipMetadataCapture;
  location?: ClipMetadataLocation;
  video?: ClipMetadataVideo;
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

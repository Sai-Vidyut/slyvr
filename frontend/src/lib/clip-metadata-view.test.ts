import { describe, expect, it } from "vitest";
import { buildClipMetadataView } from "./clip-metadata-view";
import type { Clip, ClipMetadata } from "@/types/clip";

function baseClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 1,
    title: "Test clip",
    people: [],
    ...overrides,
  };
}

const completeV2Metadata: ClipMetadata = {
  schema_version: 2,
  capture: {
    captured_at: "2024-06-10T14:22:01",
    captured_at_source: "DateTimeOriginal",
    modified_at: "2024-06-10T14:22:03",
    timezone_offset: "+05:30",
  },
  device: { make: "Apple", model: "iPhone 15 Pro" },
  lens_exposure: {
    lens_model: "iPhone 15 Pro back camera",
    focal_length_mm: 6.765,
    focal_length_35mm_equiv: 24,
    aperture_f: 1.78,
    shutter_s: 0.002,
    iso: 64,
    flash: "Off",
    white_balance: "Auto",
    orientation: 1,
    color_space: "sRGB",
  },
  location: {
    latitude: 12.9716,
    longitude: 77.5946,
    altitude: 920.5,
    gps_timestamp: "2024:06:10 14:22:00",
    horizontal_accuracy_m: 12.3,
  },
  video: {
    duration_seconds: 125.5,
    container: "mp4",
    bitrate: 8_500_000,
    rotation_degrees: 90,
    stream: {
      codec: "hevc",
      profile: "Main",
      level: 120,
      width: 3840,
      height: 2160,
      frame_rate: "30000/1001",
      pixel_format: "yuv420p",
      bitrate: 8_000_000,
    },
  },
  audio: {
    stream: {
      codec: "aac",
      channels: 2,
      sample_rate: 48_000,
      bitrate: 128_000,
    },
  },
  file: {
    original_filename: "clip.MOV",
    extension: "mov",
    mime_type: "video/quicktime",
    size_bytes: 50_000_000,
    width: 3840,
    height: 2160,
    media_kind: "video",
  },
  provenance: {
    file_history: {
      software: "17.5.1",
      encoder: "Lavf58.76.100",
      create_date_raw: "2024:06:10 14:22:02",
      modify_date_raw: "2024:06:10 14:22:03",
    },
    ingest: {
      uploaded_at: "2024-07-01T10:00:00Z",
      uploaded_by_user_id: "secret-user-uuid",
      uploaded_by_display_name: "Alex",
      library_id: 42,
    },
  },
};

describe("buildClipMetadataView", () => {
  it("normalizes complete v2 metadata", () => {
    const view = buildClipMetadataView(
      baseClip({
        metadata: completeV2Metadata,
        original_filename: "clip.MOV",
        media_kind: "video",
      }),
    );

    expect(view.advanced.schemaVersion).toBe(2);
    expect(view.captureCamera.make).toBe("Apple");
    expect(view.lensExposure.iso).toBe(64);
    expect(view.videoAudio.videoCodec).toBe("hevc");
    expect(view.file.sizeBytes).toBe(50_000_000);
    expect(view.provenance.software).toBe("17.5.1");
    expect(view.atAGlance.hasContent).toBe(true);
  });

  it("supports legacy v1 metadata shape", () => {
    const view = buildClipMetadataView(
      baseClip({
        camera_model: "OldCam",
        recorded_at: "2020-01-01T00:00:00Z",
        metadata: {
          file: { width: 1920, height: 1080, mime_type: "image/jpeg" },
          capture: {
            camera_make: "Canon",
            camera_model: "EOS",
            iso: 400,
            captured_at: "2020-01-01T00:00:00Z",
          },
          location: { latitude: 1, longitude: 2 },
          video: {},
        },
      }),
    );

    expect(view.captureCamera.make).toBe("Canon");
    expect(view.captureCamera.model).toBe("OldCam");
    expect(view.lensExposure.iso).toBe(400);
    expect(view.file.width).toBe(1920);
    expect(view.advanced.schemaVersion).toBeNull();
  });

  it("merges v2 metadata with normalized top-level clip fields", () => {
    const view = buildClipMetadataView(
      baseClip({
        camera_make: "NormalizedMake",
        lens_model: "NormalizedLens",
        iso: 800,
        video_codec: "h264",
        media_kind: "photo",
        has_gps: true,
        metadata: completeV2Metadata,
      }),
    );

    expect(view.captureCamera.make).toBe("NormalizedMake");
    expect(view.lensExposure.lensModel).toBe("NormalizedLens");
    expect(view.lensExposure.iso).toBe(800);
    expect(view.videoAudio.videoCodec).toBe("h264");
    expect(view.atAGlance.mediaKind).toBe("photo");
  });

  it("prefers populated top-level fields over metadata", () => {
    const view = buildClipMetadataView(
      baseClip({
        camera_model: "Top Model",
        software: "Lightroom",
        altitude: 100,
        location_label: "Bangalore",
        metadata: completeV2Metadata,
      }),
    );

    expect(view.captureCamera.model).toBe("Top Model");
    expect(view.provenance.software).toBe("Lightroom");
    expect(view.location.coordinates.altitude).toBe(100);
    expect(view.location.summary.label).toBe("Bangalore");
  });

  it("falls back to v2 groups when normalized columns are absent", () => {
    const meta: ClipMetadata = {
      schema_version: 2,
      device: { make: "DJI", model: "Mini" },
      lens_exposure: { iso: 100, lens_model: "DJI Lens" },
      file: { media_kind: "video", mime_type: "video/mp4" },
      video: { stream: { codec: "hevc" }, duration_seconds: 10 },
    };

    const view = buildClipMetadataView(baseClip({ metadata: meta }));

    expect(view.captureCamera.make).toBe("DJI");
    expect(view.lensExposure.lensModel).toBe("DJI Lens");
    expect(view.lensExposure.iso).toBe(100);
    expect(view.videoAudio.videoCodec).toBe("hevc");
    expect(view.atAGlance.mediaKind).toBe("video");
  });

  it("falls back to v1 capture shim when v2 groups are missing", () => {
    const view = buildClipMetadataView(
      baseClip({
        metadata: {
          capture: {
            camera_make: "Samsung",
            lens_model: "Wide",
            iso: 50,
          },
        },
      }),
    );

    expect(view.captureCamera.make).toBe("Samsung");
    expect(view.lensExposure.lensModel).toBe("Wide");
    expect(view.lensExposure.iso).toBe(50);
  });

  it("handles completely missing metadata", () => {
    const view = buildClipMetadataView(baseClip({ metadata: null }));

    expect(view.atAGlance.hasContent).toBe(false);
    expect(view.captureCamera.hasContent).toBe(false);
    expect(view.lensExposure.hasContent).toBe(false);
    expect(view.location.summary.hasContent).toBe(false);
    expect(view.location.coordinates.hasContent).toBe(false);
    expect(view.videoAudio.hasContent).toBe(false);
    expect(view.file.hasContent).toBe(false);
    expect(view.provenance.hasContent).toBe(false);
    expect(view.advanced.hasContent).toBe(false);
  });

  it("handles partial metadata without throwing", () => {
    expect(() =>
      buildClipMetadataView(
        baseClip({
          metadata: { schema_version: 2, capture: { captured_at: "2024-01-01" } },
        }),
      ),
    ).not.toThrow();

    const view = buildClipMetadataView(
      baseClip({
        metadata: { schema_version: 2, capture: { captured_at: "2024-01-01" } },
      }),
    );
    expect(view.captureCamera.capturedAt).toBe("2024-01-01");
    expect(view.captureCamera.make).toBeNull();
  });

  it("treats empty strings as missing values", () => {
    const view = buildClipMetadataView(
      baseClip({
        camera_make: "  ",
        lens_model: "",
        software: "",
        metadata: {
          device: { make: "RealMake", model: "" },
          lens_exposure: { lens_model: "   " },
        },
      }),
    );

    expect(view.captureCamera.make).toBe("RealMake");
    expect(view.lensExposure.lensModel).toBeNull();
    expect(view.provenance.software).toBeNull();
  });

  it("builds photo-oriented at-a-glance fields", () => {
    const view = buildClipMetadataView(
      baseClip({
        media_kind: "photo",
        width: 4032,
        height: 3024,
        metadata: {
          file: { mime_type: "image/jpeg" },
          lens_exposure: { iso: 64 },
        },
      }),
    );

    expect(view.atAGlance.mediaKind).toBe("photo");
    expect(view.atAGlance.dimensions).toBe("4032 × 3024");
    expect(view.videoAudio.durationSeconds).toBeNull();
  });

  it("builds video-oriented fields", () => {
    const view = buildClipMetadataView(
      baseClip({
        duration_seconds: 125.5,
        metadata: {
          video: {
            duration_seconds: 999,
            container: "mp4",
            stream: { codec: "hevc", frame_rate: "24/1" },
          },
          audio: { stream: { codec: "aac", channels: 2 } },
        },
      }),
    );

    expect(view.videoAudio.durationSeconds).toBe(125.5);
    expect(view.videoAudio.container).toBe("mp4");
    expect(view.videoAudio.frameRate).toBe("24/1");
    expect(view.videoAudio.audioCodec).toBe("aac");
    expect(view.videoAudio.hasContent).toBe(true);
  });

  it("separates location summary from coordinate details", () => {
    const view = buildClipMetadataView(
      baseClip({
        location_label: "City Center",
        latitude: 12.97,
        longitude: 77.59,
        has_gps: true,
      }),
    );

    expect(view.location.summary.label).toBe("City Center");
    expect(view.location.summary.hasCoordinates).toBe(true);
    expect(view.location.summary.hasContent).toBe(true);
    expect(view.location.coordinates.latitude).toBe(12.97);
    expect(view.location.coordinates.longitude).toBe(77.59);
  });

  it("does not expose ingest uploaded_by_user_id in the view model", () => {
    const view = buildClipMetadataView(
      baseClip({ metadata: completeV2Metadata }),
    );

    expect(view.provenance.ingestUploadedByDisplayName).toBe("Alex");
    expect(Object.keys(view.provenance)).not.toContain("uploaded_by_user_id");
    expect(Object.keys(view.provenance)).not.toContain("ingestUploadedByUserId");
    expect(JSON.stringify(view.provenance)).not.toContain("secret-user-uuid");
  });

  it("sets section hasContent flags based on meaningful data", () => {
    const sparse = buildClipMetadataView(
      baseClip({ metadata: { provenance: { file_history: { encoder: "x" } } } }),
    );
    expect(sparse.provenance.hasContent).toBe(true);
    expect(sparse.lensExposure.hasContent).toBe(false);

    const rich = buildClipMetadataView(
      baseClip({ metadata: completeV2Metadata }),
    );
    expect(rich.lensExposure.hasContent).toBe(true);
    expect(rich.location.coordinates.hasContent).toBe(true);
  });

  it("supports serializer-style v2 response with legacy capture/file/video shims", () => {
    const serializerStyle: ClipMetadata = {
      schema_version: 2,
      device: { make: "Apple", model: "iPhone" },
      lens_exposure: { iso: 64, lens_model: "Built-in" },
      location: { latitude: 12, longitude: 77, altitude: 900 },
      provenance: completeV2Metadata.provenance,
      capture: {
        captured_at: "2024-06-10T14:22:01",
        camera_make: "Apple",
        camera_model: "iPhone",
        lens_model: "Built-in",
        iso: 64,
      },
      file: {
        filename: "photo.jpg",
        file_size: 3_000_000,
        mime_type: "image/jpeg",
        width: 4032,
        height: 3024,
      },
      video: {
        duration_seconds: null,
        codec: null,
        frame_rate: null,
      },
      audio: completeV2Metadata.audio,
    };

    const view = buildClipMetadataView(
      baseClip({
        original_filename: "photo.jpg",
        file_size: 3_000_000,
        metadata: serializerStyle,
      }),
    );

    expect(view.captureCamera.make).toBe("Apple");
    expect(view.file.originalFilename).toBe("photo.jpg");
    expect(view.lensExposure.iso).toBe(64);
    expect(view.advanced.schemaVersion).toBe(2);
  });
});

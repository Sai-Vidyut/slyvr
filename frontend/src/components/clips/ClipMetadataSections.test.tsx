import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ClipMetadataSections } from "./ClipMetadataSections";
import type { Clip, ClipMetadata } from "@/types/clip";

function baseClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 1,
    title: "Test",
    people: [],
    ...overrides,
  };
}

const v2Metadata: ClipMetadata = {
  schema_version: 2,
  device: { make: "Apple", model: "iPhone 15 Pro" },
  lens_exposure: { iso: 64, lens_model: "Wide camera" },
  location: { latitude: 12.9716, longitude: 77.5946, altitude: 920.5 },
  video: {
    duration_seconds: 30,
    container: "mp4",
    stream: { codec: "hevc", frame_rate: "30/1" },
  },
  audio: { stream: { codec: "aac", channels: 2, sample_rate: 48_000 } },
  file: {
    original_filename: "clip.mp4",
    mime_type: "video/mp4",
    size_bytes: 5_000_000,
    width: 1920,
    height: 1080,
    media_kind: "video",
  },
  provenance: {
    file_history: { software: "17.5.1", encoder: "Lavf" },
    ingest: {
      uploaded_at: "2024-07-01T10:00:00Z",
      uploaded_by_user_id: "internal-user-id",
      uploaded_by_display_name: "Alex",
    },
  },
};

describe("ClipMetadataSections", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders v2 metadata through the view model", () => {
    render(
      <ClipMetadataSections
        clip={baseClip({
          metadata: v2Metadata,
          recorded_at: "2024-06-10T14:22:01Z",
        })}
      />,
    );

    expect(screen.getByText("At a glance")).toBeInTheDocument();
    expect(screen.getByText("Capture & camera")).toBeInTheDocument();
    expect(screen.getByText("Lens & exposure")).toBeInTheDocument();
    expect(screen.getByText("Video & audio")).toBeInTheDocument();
    expect(screen.getByText("hevc")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
  });

  it("still renders legacy v1 metadata", () => {
    render(
      <ClipMetadataSections
        clip={baseClip({
          camera_make: "Canon",
          camera_model: "EOS R5",
          metadata: {
            capture: { iso: 400, lens_model: "RF 24-70" },
            file: { width: 1920, height: 1080, mime_type: "image/jpeg" },
          },
        })}
      />,
    );

    expect(screen.getByText("Canon")).toBeInTheDocument();
    expect(screen.getByText("EOS R5")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
  });

  it("hides empty sections for partial metadata", () => {
    const { container } = render(
      <ClipMetadataSections
        clip={baseClip({
          metadata: { lens_exposure: { iso: 200 } },
        })}
      />,
    );

    expect(screen.getByText("Lens & exposure")).toBeInTheDocument();
    expect(screen.queryByText("Capture & camera")).not.toBeInTheDocument();
    expect(screen.queryByText("Provenance")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/undefined|null/i);
  });

  it("does not expose coordinates until progressively disclosed", async () => {
    const user = userEvent.setup();
    render(
      <ClipMetadataSections
        clip={baseClip({
          latitude: 12.9716,
          longitude: 77.5946,
          metadata: v2Metadata,
        })}
      />,
    );

    expect(screen.queryByText("77.59460")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show precise coordinates/i }));
    expect(screen.getByText("77.59460")).toBeInTheDocument();
  });

  it("does not expose internal uploader ids or storage paths", () => {
    render(
      <ClipMetadataSections
        clip={baseClip({
          stored_filename: "b2/object-key-secret",
          metadata: v2Metadata,
        })}
      />,
    );

    expect(screen.queryByText("internal-user-id")).not.toBeInTheDocument();
    expect(screen.queryByText(/object-key-secret/i)).not.toBeInTheDocument();
  });

  it("renders video and audio fields when present", () => {
    render(
      <ClipMetadataSections
        clip={baseClip({
          duration_seconds: 30,
          metadata: v2Metadata,
        })}
      />,
    );

    expect(screen.getByText("Video & audio")).toBeInTheDocument();
    expect(screen.getByText("aac")).toBeInTheDocument();
    expect(screen.getByText("48000 Hz")).toBeInTheDocument();
  });

  it("returns nothing for missing metadata without nullish UI", () => {
    const { container } = render(<ClipMetadataSections clip={baseClip()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

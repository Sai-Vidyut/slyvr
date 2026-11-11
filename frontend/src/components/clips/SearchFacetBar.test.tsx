import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SearchFacetBar,
} from "./SearchFacetBar";
import {
  metadataParamsFromFacets,
  searchFacetChipLabel,
} from "@/types/clip";
import type { SearchFacets } from "@/types/clip";
import { hasActiveSearchParams } from "@/hooks/use-clips-queries";

describe("SearchFacetBar metadata facets", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Media row when media_kinds exists", () => {
    render(
      <SearchFacetBar
        facets={{ media_kinds: ["Photo", "Video"] }}
        active={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Video" })).toBeInTheDocument();
  });

  it("calls onChange when Photo is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchFacetBar
        facets={{ media_kinds: ["Photo", "Video"] }}
        active={{}}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(onChange).toHaveBeenCalledWith("media_kind", "Photo");
  });

  it("renders Location data with With location data chip", () => {
    render(
      <SearchFacetBar
        facets={{ has_gps: ["With location data"] }}
        active={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Location data")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "With location data" }),
    ).toBeInTheDocument();
  });

  it("does not render coordinate strings in the facet bar", () => {
    const facets: SearchFacets = {
      locations: ["Bangalore"],
      has_gps: ["With location data"],
    };
    render(<SearchFacetBar facets={facets} active={{}} onChange={() => {}} />);
    expect(screen.queryByText(/12\.9716/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bangalore" })).toBeInTheDocument();
  });

  it("renders Lens and Video codec rows when buckets exist", () => {
    render(
      <SearchFacetBar
        facets={{
          lens_models: ["RF 24-70mm"],
          video_codecs: ["hevc"],
        }}
        active={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Lens")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RF 24-70mm" })).toBeInTheDocument();
    expect(screen.getByText("Video codec")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "hevc" })).toBeInTheDocument();
  });

  it("still renders legacy facet rows", () => {
    render(
      <SearchFacetBar
        facets={{
          people: ["Alex"],
          categories: ["Travel"],
          devices: ["iPhone"],
          years: ["2024"],
          locations: ["Paris"],
          file_types: ["jpeg"],
        }}
        active={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Years")).toBeInTheDocument();
    expect(screen.getByText("Locations")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("toggles metadata facet selection off on second click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchFacetBar
        facets={{ media_kinds: ["Photo"] }}
        active={{ media_kind: "Photo" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(onChange).toHaveBeenCalledWith("media_kind", null);
  });
});

describe("metadataParamsFromFacets", () => {
  it("maps Photo and Video to API media_kind values", () => {
    expect(metadataParamsFromFacets({ media_kind: "Photo" })).toEqual({
      media_kind: "photo",
      has_gps: undefined,
      lens_model: undefined,
      video_codec: undefined,
    });
    expect(metadataParamsFromFacets({ media_kind: "Video" })).toEqual({
      media_kind: "video",
      has_gps: undefined,
      lens_model: undefined,
      video_codec: undefined,
    });
  });

  it("maps location data facet to has_gps true", () => {
    expect(
      metadataParamsFromFacets({ has_gps: "With location data" }),
    ).toEqual({
      media_kind: undefined,
      has_gps: true,
      lens_model: undefined,
      video_codec: undefined,
    });
  });

  it("passes lens and codec strings through", () => {
    expect(
      metadataParamsFromFacets({
        lens_model: "Wide",
        video_codec: "hevc",
      }),
    ).toEqual({
      media_kind: undefined,
      has_gps: undefined,
      lens_model: "Wide",
      video_codec: "hevc",
    });
  });
});

describe("searchFacetChipLabel", () => {
  it("never exposes raw has_gps in chip labels", () => {
    const label = searchFacetChipLabel("has_gps", "With location data");
    expect(label).toBe("Location data: With location data");
    expect(label.toLowerCase()).not.toContain("has_gps");
  });
});

describe("hasActiveSearchParams", () => {
  it("is inactive with empty query and no facets", () => {
    expect(hasActiveSearchParams({ q: "" })).toBe(false);
    expect(hasActiveSearchParams({ q: "   " })).toBe(false);
  });

  it("is active with text query", () => {
    expect(hasActiveSearchParams({ q: "summer" })).toBe(true);
  });

  it("is active with metadata facet params only", () => {
    expect(
      hasActiveSearchParams({
        q: "",
        media_kind: "video",
      }),
    ).toBe(true);
    expect(
      hasActiveSearchParams({
        q: "",
        has_gps: true,
      }),
    ).toBe(true);
  });
});

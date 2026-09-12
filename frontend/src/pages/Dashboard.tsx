import { m } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import ClipDetailsDrawer from "../components/clips/ClipDetailsDrawer";
import ClipGrid from "../components/clips/ClipGrid";
import {
  SearchFacetBar,
  type ActiveSearchFacets,
  type SearchFacetKey,
} from "../components/clips/SearchFacetBar";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import UploadModal from "../components/upload/UploadModal";

import { useApiConnection } from "@/hooks/use-api-connection";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCategoriesQuery,
  useClipsQuery,
  usePeopleQuery,
  useSearchClipsQuery,
} from "@/hooks/use-clips-queries";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pageEnter } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Clip, SearchParams } from "@/types/clip";

function formatStorage(bytes: number) {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const api = useApiConnection();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [searchFacets, setSearchFacets] = useState<ActiveSearchFacets>({});

  const [selectedCategory, setSelectedCategory] = useState("All Clips");
  const [selectedPerson, setSelectedPerson] = useState("All People");

  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const drawerReturnFocusRef = useRef<HTMLElement | null>(null);

  const isSearchActive = debouncedSearch.trim().length > 0;

  const searchParams: SearchParams = useMemo(
    () => ({
      q: debouncedSearch.trim(),
      person:
        searchFacets.person ||
        (selectedPerson !== "All People" ? selectedPerson : undefined),
      category:
        searchFacets.category ||
        (selectedCategory !== "All Clips" ? selectedCategory : undefined),
      device: searchFacets.device,
      year: searchFacets.year,
      location: searchFacets.location,
      file_type: searchFacets.file_type,
    }),
    [
      debouncedSearch,
      searchFacets,
      selectedCategory,
      selectedPerson,
    ],
  );

  const apiQueriesEnabled = api.connectionEnabled;
  const categoriesQuery = useCategoriesQuery(apiQueriesEnabled);
  const peopleQuery = usePeopleQuery(apiQueriesEnabled);
  const clipsQuery = useClipsQuery(apiQueriesEnabled && !isSearchActive);
  const searchQueryResult = useSearchClipsQuery(
    searchParams,
    apiQueriesEnabled && isSearchActive,
  );

  const categories = useMemo(
    () => categoriesQuery.data?.map((c) => c.name) ?? [],
    [categoriesQuery.data],
  );
  const people = useMemo(
    () => peopleQuery.data?.map((p) => p.name) ?? [],
    [peopleQuery.data],
  );

  const sourceClips: Clip[] = useMemo(
    () =>
      isSearchActive
        ? (searchQueryResult.data?.clips ?? [])
        : (clipsQuery.data ?? []),
    [isSearchActive, searchQueryResult.data, clipsQuery.data],
  );

  const filteredClips = useMemo(() => {
    if (isSearchActive) return sourceClips;
    return sourceClips.filter((clip) => {
      const matchesCategory =
        selectedCategory === "All Clips" || clip.category === selectedCategory;
      const matchesPerson =
        selectedPerson === "All People" ||
        clip.people?.includes(selectedPerson);
      return matchesCategory && matchesPerson;
    });
  }, [sourceClips, selectedCategory, selectedPerson, isSearchActive]);

  const resultFacets = searchQueryResult.data?.facets ?? {};

  const allClipsForStats = clipsQuery.data ?? sourceClips;

  const totalStorage = allClipsForStats.reduce(
    (sum, clip) => sum + (clip.file_size ?? 0),
    0,
  );

  const isLoading =
    categoriesQuery.isLoading ||
    peopleQuery.isLoading ||
    (isSearchActive
      ? searchQueryResult.isLoading && !searchQueryResult.data
      : clipsQuery.isLoading && !clipsQuery.data);

  const isSearching =
    searchQuery.trim().length > 0 &&
    (searchQuery !== debouncedSearch || searchQueryResult.isFetching);

  const hasCategoryFilter = selectedCategory !== "All Clips";
  const hasPersonFilter = selectedPerson !== "All People";
  const hasSearchFacet = Object.values(searchFacets).some(Boolean);
  const hasFilters = hasCategoryFilter || hasPersonFilter || hasSearchFacet;

  const emptyKind =
    filteredClips.length > 0
      ? "none"
      : isSearchActive
        ? "search"
        : hasFilters
          ? "filtered"
          : allClipsForStats.length === 0
            ? "none"
            : "filtered";

  const filterLabel = hasCategoryFilter
    ? selectedCategory
    : hasPersonFilter
      ? selectedPerson
      : undefined;

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clips.all });
    if (isSearchActive) {
      void queryClient.invalidateQueries({
        queryKey: ["clips", "search"],
      });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
  };

  const clipsError = isSearchActive ? searchQueryResult.error : clipsQuery.error;

  const filterSignature = `${debouncedSearch.trim()}|${selectedCategory}|${selectedPerson}|${JSON.stringify(searchFacets)}`;
  const isFetchingClips =
    clipsQuery.isFetching || searchQueryResult.isFetching;

  const handleFacetChange = (key: SearchFacetKey, value: string | null) => {
    setSearchFacets((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] bg-[var(--clip-bg)] text-[var(--clip-fg)]">
      <Sidebar
        categories={categories}
        people={people}
        selectedCategory={selectedCategory}
        selectedPerson={selectedPerson}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
          setSidebarOpen(false);
        }}
        onPersonChange={(person) => {
          setSelectedPerson(person);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isLoading={categoriesQuery.isLoading || peopleQuery.isLoading}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setUploadOpen(true)}
          onRefresh={handleRefresh}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isSearching={isSearching}
          isRefreshing={isFetchingClips}
          uploadButtonRef={uploadButtonRef}
          apiVisualState={api.visualState}
          apiStatusLabel={api.statusLabel}
          apiTogglePending={api.isToggling}
          onApiToggle={() => void api.toggle()}
        />

        <m.main
          className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6"
          variants={pageEnter}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <header className="mb-6 border-b border-[var(--clip-border)] pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label">Slyvr</p>
                <h1 className="text-title mt-1">Library</h1>
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-meta tabular-nums">
                <div>
                  <dt className="inline after:content-[':']">Clips</dt>{" "}
                  <dd className="inline text-[var(--clip-fg)]">
                    {allClipsForStats.length}
                  </dd>
                </div>
                <div>
                  <dt className="inline after:content-[':']">Storage</dt>{" "}
                  <dd className="inline text-[var(--clip-fg)]">
                    {formatStorage(totalStorage)}
                  </dd>
                </div>
              </dl>
            </div>

            {(hasFilters || isSearchActive) && (
              <m.div
                layout={!reduced}
                className="mt-3 flex flex-wrap gap-2"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {isSearchActive && (
                  <FilterChip
                    label={`Search: ${debouncedSearch.trim()}`}
                    onClear={() => {
                      setSearchQuery("");
                      setSearchFacets({});
                    }}
                  />
                )}
                {Object.entries(searchFacets).map(([key, value]) =>
                  value ? (
                    <FilterChip
                      key={key}
                      label={`${key}: ${value}`}
                      onClear={() =>
                        handleFacetChange(key as SearchFacetKey, null)
                      }
                    />
                  ) : null,
                )}
                {hasCategoryFilter && (
                  <FilterChip
                    label={selectedCategory}
                    onClear={() => setSelectedCategory("All Clips")}
                  />
                )}
                {hasPersonFilter && (
                  <FilterChip
                    label={selectedPerson}
                    onClear={() => setSelectedPerson("All People")}
                  />
                )}
              </m.div>
            )}
          </header>

          {clipsError && (
            <div
              role="alert"
              className="mb-4 border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100"
            >
              Could not load clips. Confirm the API is running, then refresh.
            </div>
          )}

          {isSearchActive && !isLoading && (
            <SearchFacetBar
              facets={resultFacets}
              active={searchFacets}
              onChange={handleFacetChange}
            />
          )}

          <ClipGrid
            clips={filteredClips}
            isLoading={isLoading}
            isFetching={isFetchingClips && !isLoading}
            filterSignature={filterSignature}
            emptyKind={emptyKind as "none" | "filtered" | "search"}
            filterLabel={filterLabel}
            selectedClipId={selectedClipId}
            onClearFilters={() => {
              setSearchQuery("");
              setSearchFacets({});
              setSelectedCategory("All Clips");
              setSelectedPerson("All People");
            }}
            onUpload={() => setUploadOpen(true)}
            onClipClick={(clip) => {
              drawerReturnFocusRef.current =
                document.activeElement as HTMLElement | null;
              setSelectedClipId(clip.id);
              setDrawerOpen(true);
            }}
          />
        </m.main>

        <ClipDetailsDrawer
          clipId={selectedClipId}
          isOpen={drawerOpen}
          returnFocusRef={drawerReturnFocusRef}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedClipId(null);
          }}
        />

        {uploadOpen && (
          <UploadModal
            returnFocusRef={uploadButtonRef}
            onClose={() => setUploadOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  const reduced = useReducedMotion();
  return (
    <m.button
      type="button"
      layout
      onClick={onClear}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      whileHover={reduced ? undefined : { y: -1 }}
      transition={{ type: "tween", duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-md border border-[var(--clip-border)]",
        "px-2.5 text-xs text-[var(--clip-muted)] hover:text-[var(--clip-fg)]",
      )}
    >
      <span className="max-w-[14rem] truncate">{label}</span>
      <span aria-hidden>×</span>
    </m.button>
  );
}

export default Dashboard;

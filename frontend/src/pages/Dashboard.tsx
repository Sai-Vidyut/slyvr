import { m } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";

import ClipDetailsDrawer from "../components/clips/ClipDetailsDrawer";
import ClipGrid from "../components/clips/ClipGrid";
import {
  SearchFacetBar,
  type ActiveSearchFacets,
  type SearchFacetKey,
} from "../components/clips/SearchFacetBar";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { LibrarySwitcher } from "../components/library/LibrarySwitcher";
import { MobileBrowseSheet } from "../components/mobile/MobileBrowseSheet";
import { MobileWorkspaceChrome } from "../components/mobile/MobileWorkspaceChrome";
import UploadModal from "../components/upload/UploadModal";

import { useApiConnection } from "@/hooks/use-api-connection";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCategoriesQuery,
  useClipsQuery,
  usePeopleQuery,
  useSearchClipsQuery,
} from "@/hooks/use-clips-queries";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pageEnter } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLibrary } from "@/providers/library-provider";
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
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const { activeLibraryId, activeLibrary } = useLibrary();
  const [params] = useSearchParams();
  const demoRequested = params.get("demo") === "1";
  const api = useApiConnection({ autoEnterDemo: demoRequested && !session });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const [searchFacets, setSearchFacets] = useState<ActiveSearchFacets>({});

  const [selectedCategory, setSelectedCategory] = useState("All Clips");
  const [selectedPerson, setSelectedPerson] = useState("All People");

  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const drawerReturnFocusRef = useRef<HTMLElement | null>(null);

  // Reset browse UI when the active library changes (render-time adjust).
  const [scopedLibraryId, setScopedLibraryId] = useState(activeLibraryId);
  if (activeLibraryId !== scopedLibraryId) {
    setScopedLibraryId(activeLibraryId);
    setSelectedClipId(null);
    setDrawerOpen(false);
    setSelectedCategory("All Clips");
    setSelectedPerson("All People");
    setSearchQuery("");
    setSearchFacets({});
  }

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

  const apiQueriesEnabled =
    Boolean(session) && api.connectionEnabled && !api.demoMode;
  const categoriesQuery = useCategoriesQuery(apiQueriesEnabled);
  const peopleQuery = usePeopleQuery(apiQueriesEnabled);
  const clipsQuery = useClipsQuery(apiQueriesEnabled && !isSearchActive);
  const searchQueryResult = useSearchClipsQuery(
    searchParams,
    apiQueriesEnabled && isSearchActive,
  );

  const categories = useMemo(() => {
    if (api.demoMode) return api.demoCategories.map((c) => c.name);
    return categoriesQuery.data?.map((c) => c.name) ?? [];
  }, [api.demoCategories, api.demoMode, categoriesQuery.data]);

  const people = useMemo(() => {
    if (api.demoMode) return api.demoPeople.map((p) => p.name);
    return peopleQuery.data?.map((p) => p.name) ?? [];
  }, [api.demoMode, api.demoPeople, peopleQuery.data]);

  const sourceClips: Clip[] = useMemo(() => {
    if (api.demoMode) {
      const clips = api.demoClips;
      if (!isSearchActive) return clips;
      const q = debouncedSearch.trim().toLowerCase();
      return clips.filter((clip) => {
        const haystack = [
          clip.title,
          clip.description ?? "",
          clip.category ?? "",
          ...(clip.people ?? []),
          clip.location_label ?? "",
          clip.camera_model ?? "",
        ]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !q || haystack.includes(q);
        const matchesPerson =
          !searchParams.person || clip.people?.includes(searchParams.person);
        const matchesCategory =
          !searchParams.category || clip.category === searchParams.category;
        return matchesQuery && matchesPerson && matchesCategory;
      });
    }
    return isSearchActive
      ? (searchQueryResult.data?.clips ?? [])
      : (clipsQuery.data ?? []);
  }, [
    api.demoClips,
    api.demoMode,
    clipsQuery.data,
    debouncedSearch,
    isSearchActive,
    searchParams.category,
    searchParams.person,
    searchQueryResult.data,
  ]);

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

  const allClipsForStats = api.demoMode
    ? api.demoClips
    : (clipsQuery.data ?? sourceClips);

  const totalStorage = allClipsForStats.reduce(
    (sum, clip) => sum + (clip.file_size ?? 0),
    0,
  );

  const isLoading = api.demoMode
    ? false
    : categoriesQuery.isLoading ||
      peopleQuery.isLoading ||
      (isSearchActive
        ? searchQueryResult.isLoading && !searchQueryResult.data
        : clipsQuery.isLoading && !clipsQuery.data);

  const isSearching =
    !api.demoMode &&
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
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clips.all(activeLibraryId),
    });
    if (isSearchActive) {
      void queryClient.invalidateQueries({
        queryKey: ["clips", "search", activeLibraryId],
      });
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.categories.all(activeLibraryId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.people.all(activeLibraryId),
    });
  };

  const clipsError = api.demoMode
    ? null
    : isSearchActive
      ? searchQueryResult.error
      : clipsQuery.error;

  const filterSignature = `${debouncedSearch.trim()}|${selectedCategory}|${selectedPerson}|${JSON.stringify(searchFacets)}|demo:${api.demoMode}`;
  const isFetchingClips =
    !api.demoMode && (clipsQuery.isFetching || searchQueryResult.isFetching);

  const selectedDemoClip = api.demoMode
    ? (api.demoClips.find((clip) => clip.id === selectedClipId) ?? null)
    : null;

  const handleFacetChange = (key: SearchFacetKey, value: string | null) => {
    setSearchFacets((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const openUpload = () => {
    if (api.demoMode || !session) return;
    setUploadOpen(true);
  };

  const libraryTitle = api.demoMode
    ? "Demo"
    : (activeLibrary?.name ?? "Library");

  const filterChipRow =
    hasFilters || isSearchActive ? (
      <m.div
        layout={!reduced}
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              onClear={() => handleFacetChange(key as SearchFacetKey, null)}
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
    ) : null;

  const libraryBody = (
    <>
      {clipsError && (
        <div
          role="alert"
          className="mb-4 border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100"
        >
          Could not load clips. Confirm the API is running, then refresh
          {isMobile
            ? " — or open More and enter demo mode."
            : " — or double-click the API control for demo mode."}
        </div>
      )}

      {api.demoMode && (
        <div
          role="status"
          className="mb-4 border border-sky-900/40 bg-sky-950/30 px-3 py-2 text-sm text-sky-100"
        >
          Demo mode is on. Showing sample clips
          {api.demoClips.some((c) => c.id > 0)
            ? " from your local API"
            : ""}
          .{" "}
          {isMobile
            ? "Long-press API or use More to exit."
            : "Double-click the API control to exit."}
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
        onUpload={openUpload}
        onClipClick={(clip) => {
          drawerReturnFocusRef.current =
            document.activeElement as HTMLElement | null;
          setSelectedClipId(clip.id);
          setDrawerOpen(true);
        }}
      />
    </>
  );

  const sharedOverlays = (
    <>
      <ClipDetailsDrawer
        clipId={selectedClipId}
        clipOverride={selectedDemoClip}
        isOpen={drawerOpen}
        returnFocusRef={drawerReturnFocusRef}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedClipId(null);
        }}
      />

      {uploadOpen && !api.demoMode && session ? (
        <UploadModal
          returnFocusRef={uploadButtonRef}
          onClose={() => setUploadOpen(false)}
        />
      ) : null}
    </>
  );

  // Unauthenticated visitors may only stay in demo mode.
  // When ?demo=1, autoEnterDemo starts with isToggling=true so this guard
  // waits for demo initialization instead of racing to /login.
  if (!session && !api.demoMode && !api.isToggling) {
    return <Navigate to="/login?next=%2Fapp" replace />;
  }

  if (isMobile) {
    const activeFilterSummary = hasCategoryFilter
      ? selectedCategory
      : hasPersonFilter
        ? selectedPerson
        : null;

    return (
      <>
        <MobileWorkspaceChrome
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearching={isSearching}
          clipCount={allClipsForStats.length}
          storageLabel={formatStorage(totalStorage)}
          filterChips={filterChipRow}
          apiVisualState={api.visualState}
          apiStatusLabel={api.statusLabel}
          apiTogglePending={api.isToggling}
          apiCaption={api.apiButtonLabel}
          demoMode={api.demoMode}
          onApiToggle={() => api.toggle()}
          onEnterDemo={() => void api.enterDemoMode()}
          onExitDemo={() => api.exitDemoMode()}
          onRefresh={handleRefresh}
          isRefreshing={isFetchingClips}
          onUpload={openUpload}
          uploadButtonRef={uploadButtonRef}
          browseOpen={browseOpen}
          onBrowseOpenChange={setBrowseOpen}
          activeFilterSummary={activeFilterSummary}
          librarySwitcher={
            session && !api.demoMode ? <LibrarySwitcher compact /> : null
          }
          libraryTitle={libraryTitle}
        >
          {libraryBody}
        </MobileWorkspaceChrome>

        <MobileBrowseSheet
          open={browseOpen}
          onClose={() => setBrowseOpen(false)}
          categories={categories}
          people={people}
          selectedCategory={selectedCategory}
          selectedPerson={selectedPerson}
          onCategoryChange={setSelectedCategory}
          onPersonChange={setSelectedPerson}
          isLoading={
            api.demoMode
              ? false
              : categoriesQuery.isLoading || peopleQuery.isLoading
          }
        />

        {sharedOverlays}
      </>
    );
  }

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
        isLoading={
          api.demoMode
            ? false
            : categoriesQuery.isLoading || peopleQuery.isLoading
        }
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={openUpload}
          onRefresh={handleRefresh}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isSearching={isSearching}
          isRefreshing={isFetchingClips}
          uploadButtonRef={uploadButtonRef}
          apiVisualState={api.visualState}
          apiStatusLabel={api.statusLabel}
          apiTogglePending={api.isToggling}
          apiButtonCaption={api.apiButtonLabel}
          onApiToggle={() => api.toggle()}
          librarySwitcher={
            session && !api.demoMode ? <LibrarySwitcher /> : null
          }
          uploadDisabled={api.demoMode || !session}
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
                <h1 className="text-title mt-1">{libraryTitle}</h1>
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
              <div className="mt-3">{filterChipRow}</div>
            )}
          </header>

          {libraryBody}
        </m.main>

        {sharedOverlays}
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
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-[var(--clip-border)]",
        "px-2.5 text-xs text-[var(--clip-muted)] hover:text-[var(--clip-fg)]",
        "md:min-h-8",
      )}
    >
      <span className="max-w-[14rem] truncate">{label}</span>
      <span aria-hidden>×</span>
    </m.button>
  );
}

export default Dashboard;

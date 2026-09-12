import { AnimatePresence, m } from "framer-motion";
import {
  Film,
  FolderOpen,
  MoreHorizontal,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ApiStatusIcon,
  type ApiStatusVisualState,
} from "@/components/ui/api-status-icon";
import { BorderBeam } from "@/components/ui/border-beam-search";
import { SearchPulse } from "@/components/ui/search-pulse";
import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonTap, easeOut, tweenFast } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MobileTab = "library" | "search" | "browse" | "upload";

type MobileWorkspaceChromeProps = {
  children: ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching?: boolean;
  clipCount: number;
  storageLabel: string;
  filterChips?: ReactNode;
  facetBar?: ReactNode;
  apiVisualState: ApiStatusVisualState;
  apiStatusLabel: string;
  apiTogglePending?: boolean;
  apiCaption?: string;
  demoMode?: boolean;
  onApiToggle: () => void;
  onEnterDemo: () => void;
  onExitDemo: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onUpload: () => void;
  uploadButtonRef?: RefObject<HTMLButtonElement | null>;
  browseOpen: boolean;
  onBrowseOpenChange: (open: boolean) => void;
  activeFilterSummary?: string | null;
};

export function MobileWorkspaceChrome({
  children,
  searchQuery,
  onSearchChange,
  isSearching,
  clipCount,
  storageLabel,
  filterChips,
  facetBar,
  apiVisualState,
  apiStatusLabel,
  apiTogglePending,
  apiCaption,
  demoMode,
  onApiToggle,
  onEnterDemo,
  onExitDemo,
  onRefresh,
  isRefreshing,
  onUpload,
  uploadButtonRef,
  browseOpen,
  onBrowseOpenChange,
  activeFilterSummary,
}: MobileWorkspaceChromeProps) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current != null) {
        window.clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const focusSearch = () => {
    searchRef.current?.focus();
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  const apiTone =
    apiCaption === "Demo" || demoMode
      ? "text-sky-400/90"
      : apiVisualState === "active"
        ? "text-emerald-500/90"
        : apiVisualState === "loading"
          ? "text-amber-500/90"
          : "text-red-400/85";

  const mobileApiAriaLabel = demoMode
    ? "Demo mode on. Long-press to exit."
    : apiTogglePending || apiVisualState === "loading"
      ? apiStatusLabel
      : `${apiStatusLabel}. Long-press for demo mode.`;

  const libraryNavActive =
    !browseOpen && !focused && searchQuery.trim().length === 0;
  const searchNavActive = focused || searchQuery.trim().length > 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--clip-bg)] text-[var(--clip-fg)] md:hidden">
      <header className="pt-safe shrink-0 border-b border-[var(--clip-border)] bg-[var(--clip-bg)]">
        <div className="flex h-12 items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-label leading-none">Slyvr</p>
            <p className="mt-1 truncate text-sm font-medium tracking-tight">
              Library
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <m.button
              type="button"
              disabled={apiTogglePending}
              onClick={() => {
                if (longPressFired.current) {
                  longPressFired.current = false;
                  return;
                }
                onApiToggle();
              }}
              onPointerDown={() => {
                longPressFired.current = false;
                clearLongPress();
                longPressTimer.current = window.setTimeout(() => {
                  longPressTimer.current = null;
                  longPressFired.current = true;
                  if (demoMode) onExitDemo();
                  else onEnterDemo();
                }, 520);
              }}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              whileTap={reduced || apiTogglePending ? undefined : buttonTap}
              aria-label={mobileApiAriaLabel}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--clip-border)] px-2.5",
                "text-xs outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
                "disabled:opacity-50",
                apiTone,
              )}
            >
              <ApiStatusIcon state={apiVisualState} className={apiTone} size={16} />
              <span aria-hidden>{apiCaption ?? (demoMode ? "Demo" : "API")}</span>
            </m.button>

            <m.button
              ref={moreButtonRef}
              type="button"
              whileTap={reduced ? undefined : buttonTap}
              onClick={() => setMoreOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]"
              aria-label="More actions"
            >
              <MoreHorizontal size={22} />
            </m.button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <label className="relative block overflow-hidden rounded-md" htmlFor="mobile-clip-search">
            <span className="sr-only">Search clips</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--clip-muted)]"
              aria-hidden
            />
            <input
              ref={searchRef}
              id="mobile-clip-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search your library…"
              enterKeyHint="search"
              autoComplete="off"
              className={cn(
                "relative z-0 w-full rounded-md border bg-[var(--clip-bg-elevated)] py-3.5 pl-11 pr-11 text-base",
                "placeholder:text-[var(--clip-muted)]",
                "outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
                focused
                  ? "border-[var(--clip-border-strong)]"
                  : "border-[var(--clip-border)]",
              )}
            />
            {!reduced && (focused || searchQuery.length > 0) && (
              <BorderBeam
                size={36}
                duration={focused ? 7 : 12}
                borderWidth={1}
                colorFrom={
                  focused
                    ? "oklch(0.82 0.02 85 / 0.65)"
                    : "oklch(0.65 0.01 265 / 0.35)"
                }
                colorTo="oklch(0.45 0.008 265 / 0.05)"
              />
            )}
            <div className="absolute right-2 top-1/2 z-[1] flex -translate-y-1/2 items-center">
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <m.span
                    key="searching"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={tweenFast}
                    aria-label="Searching"
                  >
                    <SearchPulse />
                  </m.span>
                ) : searchQuery.length > 0 ? (
                  <m.button
                    key="clear"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileTap={reduced ? undefined : buttonTap}
                    onClick={() => onSearchChange("")}
                    className="rounded-md p-2 text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </m.button>
                ) : null}
              </AnimatePresence>
            </div>
          </label>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-meta tabular-nums">
              <span className="text-[var(--clip-fg)]">{clipCount}</span> clips ·{" "}
              {storageLabel}
            </p>
            {activeFilterSummary ? (
              <p className="max-w-[45%] truncate text-meta text-[var(--clip-fg)]">
                {activeFilterSummary}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {(filterChips || facetBar) && (
        <div className="shrink-0 border-b border-[var(--clip-border)] bg-[var(--clip-bg)] px-4 py-2.5">
          {filterChips}
          {facetBar}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
        {children}
      </main>

      <nav
        className="pb-safe shrink-0 border-t border-[var(--clip-border)] bg-[var(--clip-bg)]/95 backdrop-blur-sm"
        aria-label="Primary"
      >
        <ul className="grid h-14 grid-cols-4">
          <NavItem
            label="Library"
            icon={Film}
            active={libraryNavActive}
            onClick={() => {
              onBrowseOpenChange(false);
              searchRef.current?.blur();
              window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
            }}
          />
          <NavItem
            label="Search"
            icon={Search}
            active={searchNavActive}
            onClick={focusSearch}
          />
          <NavItem
            label="Browse"
            icon={FolderOpen}
            active={browseOpen}
            onClick={() => onBrowseOpenChange(true)}
          />
          <li className="flex">
            <m.button
              ref={uploadButtonRef}
              type="button"
              whileTap={reduced ? undefined : buttonTap}
              onClick={onUpload}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[var(--clip-accent)]"
              aria-label="Upload"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--clip-accent)] text-[var(--clip-accent-fg)]">
                <Upload size={16} aria-hidden />
              </span>
              <span className="text-[10px] font-medium tracking-wide">Upload</span>
            </m.button>
          </li>
        </ul>
      </nav>

      <MobileBottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Workspace"
        subtitle="Actions"
        returnFocusRef={moreButtonRef}
        variant="sheet"
      >
        <ul className="space-y-1 pb-10 pt-1">
          <li>
            <m.button
              type="button"
              whileTap={reduced ? undefined : buttonTap}
              disabled={isRefreshing}
              onClick={() => {
                onRefresh();
                setMoreOpen(false);
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--clip-fg)] hover:bg-[var(--clip-surface)]"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : undefined} />
              Refresh library
            </m.button>
          </li>
          <li>
            <m.button
              type="button"
              whileTap={reduced ? undefined : buttonTap}
              disabled={apiTogglePending}
              onClick={() => {
                if (demoMode) onExitDemo();
                else onEnterDemo();
                setMoreOpen(false);
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--clip-fg)] hover:bg-[var(--clip-surface)]"
            >
              <ApiStatusIcon state={apiVisualState} size={18} />
              {demoMode ? "Exit demo mode" : "Enter demo mode"}
            </m.button>
          </li>
          <li>
            <p className="px-3 pb-2 pt-4 text-meta leading-relaxed">
              Tap API in the header to connect or disconnect. Long-press the API
              control to toggle demo mode.
            </p>
          </li>
        </ul>
      </MobileBottomSheet>
    </div>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Film;
  active?: boolean;
  onClick: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <li className="flex">
      <m.button
        type="button"
        whileTap={
          reduced
            ? undefined
            : { scale: 0.96, transition: { duration: 0.1, ease: easeOut } }
        }
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 w-full flex-col items-center justify-center gap-0.5",
          active ? "text-[var(--clip-fg)]" : "text-[var(--clip-muted)]",
        )}
      >
        <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </m.button>
    </li>
  );
}

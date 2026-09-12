import { AnimatePresence, m } from "framer-motion";
import { Menu, RefreshCw, Search, Upload, X } from "lucide-react";
import { type RefObject, useState } from "react";

import { SlyvrBrandLink } from "@/components/layout/SlyvrBrandLink";
import {
  ApiStatusIcon,
  type ApiStatusVisualState,
} from "@/components/ui/api-status-icon";
import { BorderBeam } from "@/components/ui/border-beam-search";
import { SearchPulse } from "@/components/ui/search-pulse";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonHover, buttonTap, easeOut, tweenFast } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onUpload: () => void;
  onRefresh: () => void;
  onMenuClick: () => void;
  isSearching?: boolean;
  isRefreshing?: boolean;
  uploadButtonRef?: RefObject<HTMLButtonElement | null>;
  apiVisualState?: ApiStatusVisualState;
  apiStatusLabel?: string;
  apiTogglePending?: boolean;
  apiButtonCaption?: string;
  onApiToggle?: () => void;
}

function ApiStatusControl({
  visualState,
  statusLabel,
  pending,
  buttonCaption,
  onToggle,
}: {
  visualState: ApiStatusVisualState;
  statusLabel: string;
  pending?: boolean;
  buttonCaption?: string;
  onToggle?: () => void;
}) {
  const reduced = useReducedMotion();
  const active = visualState === "active";
  const caption =
    buttonCaption ??
    (active ? "Active" : visualState === "loading" ? "…" : "Off");

  const tone =
    buttonCaption === "Demo"
      ? "text-sky-400/90"
      : visualState === "active"
        ? "text-emerald-500/90"
        : visualState === "loading"
          ? "text-amber-500/90"
          : "text-red-400/85";

  return (
    <m.button
      type="button"
      onClick={onToggle}
      disabled={pending || !onToggle}
      whileTap={
        reduced || pending
          ? undefined
          : { scale: 0.985, transition: { duration: 0.1, ease: easeOut } }
      }
      whileHover={
        reduced || pending
          ? undefined
          : {
              y: -0.5,
              transition: { duration: 0.14, ease: easeOut },
            }
      }
      aria-pressed={active}
      aria-busy={pending || visualState === "loading"}
      aria-label={statusLabel}
      title={`${statusLabel} · Double-click for demo mode`}
      className={cn(
        "hidden min-h-10 items-center gap-2 rounded-md border border-[var(--clip-border)] px-2.5 py-1.5",
        "text-xs text-[var(--clip-muted)] transition-[border-color,background-color,color] duration-150 ease-out",
        "hover:border-[var(--clip-border-strong)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]",
        "outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] disabled:opacity-50 lg:inline-flex",
        tone,
      )}
    >
      <ApiStatusIcon state={visualState} className={tone} size={17} />
      <span className="text-[var(--clip-muted)]" aria-hidden>
        API
      </span>
      <span className="text-[var(--clip-fg)]" aria-hidden>
        {caption}
      </span>
    </m.button>
  );
}

function Topbar({
  searchQuery,
  onSearchChange,
  onUpload,
  onRefresh,
  onMenuClick,
  isSearching,
  isRefreshing,
  uploadButtonRef,
  apiVisualState = "loading",
  apiStatusLabel = "Checking API",
  apiTogglePending = false,
  apiButtonCaption,
  onApiToggle,
}: TopbarProps) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--clip-border)] bg-[var(--clip-bg)] px-3 md:px-8">
      <div className="flex h-14 items-center gap-2 md:gap-3">
        <m.button
          type="button"
          onClick={onMenuClick}
          whileTap={reduced ? undefined : buttonTap}
          className="rounded-md p-2 md:hidden hover:bg-[var(--clip-surface)]"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </m.button>

        <div className="shrink-0 md:hidden">
          <SlyvrBrandLink variant="compact" />
        </div>

        <div className="min-w-0 flex-1">
          <label
            className="relative block w-full overflow-hidden rounded-md"
            htmlFor="clip-search"
          >
            <span className="sr-only">Search clips</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--clip-muted)]"
              aria-hidden
            />
            <input
              id="clip-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search titles, people, places, devices…"
              className={cn(
                "field relative z-0 w-full rounded-md border bg-[var(--clip-bg-elevated)] py-2.5 pl-10 pr-11",
                "placeholder:text-[var(--clip-muted)]",
                "transition-[border-color] duration-200",
                "focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
                focused
                  ? "border-[var(--clip-border-strong)]"
                  : "border-[var(--clip-border)]",
              )}
              autoComplete="off"
            />
            {!reduced && (focused || searchQuery.length > 0) && (
              <BorderBeam
                size={40}
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
            <div className="absolute right-2 top-1/2 z-[1] flex -translate-y-1/2 items-center gap-1">
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
                    className="rounded-md p-1.5 text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </m.button>
                ) : null}
              </AnimatePresence>
            </div>
          </label>
        </div>

        <div className="ml-1 flex items-center gap-2">
          <ApiStatusControl
            visualState={apiVisualState}
            statusLabel={apiStatusLabel}
            pending={apiTogglePending}
            buttonCaption={apiButtonCaption}
            onToggle={onApiToggle}
          />

          <m.button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            whileHover={reduced || isRefreshing ? undefined : buttonHover}
            whileTap={reduced || isRefreshing ? undefined : buttonTap}
            className="hidden min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--clip-border)] hover:border-[var(--clip-border-strong)] disabled:opacity-45 md:flex"
            aria-label="Refresh clips"
          >
            <RefreshCw
              size={17}
              className={isRefreshing ? "animate-spin" : undefined}
            />
          </m.button>

          <m.button
            ref={uploadButtonRef}
            type="button"
            onClick={onUpload}
            whileHover={reduced ? undefined : buttonHover}
            whileTap={reduced ? undefined : buttonTap}
            className="flex min-h-10 items-center gap-2 rounded-md bg-[var(--clip-accent)] px-3.5 text-sm font-medium text-[var(--clip-accent-fg)]"
            aria-label="Upload clips"
          >
            <Upload size={17} aria-hidden />
            <span className="hidden md:inline">Upload</span>
          </m.button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;

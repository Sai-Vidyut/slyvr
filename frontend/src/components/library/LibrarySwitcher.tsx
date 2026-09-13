import { useCallback, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, Plus, Users } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-client";
import { useDropdownDismiss } from "@/hooks/use-dropdown-dismiss";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fadeUp, tweenFast } from "@/lib/motion";
import { topbarControlHeightClass, topbarMenuSurfaceClass } from "@/lib/topbar-menu-styles";
import { useAuth } from "@/providers/auth-provider";
import { useLibrary } from "@/providers/library-provider";
import { createWorkspace, joinWorkspace } from "@/services/api";
import { cn } from "@/lib/utils";

type Panel = "menu" | "create" | "join" | null;

const sectionLabelClass =
  "px-2 pb-0.5 pt-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--clip-muted)]";

function libraryOptionClass(selected: boolean) {
  return cn(
    "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-sm text-[var(--clip-fg)]",
    "transition-colors duration-150 hover:bg-[var(--clip-surface)]",
    selected && "bg-[var(--clip-surface)]/70",
  );
}

const actionRowClass = cn(
  "flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
  "text-[var(--clip-muted)] transition-colors duration-150",
  "hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]",
);

export function LibrarySwitcher({
  compact = false,
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  compact?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const {
    libraries,
    activeLibrary,
    activeLibraryId,
    setActiveLibraryId,
    refreshLibraries,
  } = useLibrary();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const isControlled = onOpenChange !== undefined;
  const expanded =
    panel !== null && (!isControlled || Boolean(controlledOpen));

  const setOpen = useCallback(
    (next: boolean) => {
      if (!next) setPanel(null);
      if (!isControlled && next && !panel) setPanel("menu");
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange, panel],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  useDropdownDismiss(expanded, close, rootRef);

  const personal = libraries.filter((l) => l.type === "personal");
  const workspaceLibraries = libraries.filter(
    (l) => l.type === "workspace" || l.type === "legacy",
  );

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const ws = await createWorkspace(name.trim());
      setCreatedCode(ws.join_code);
      await refreshLibraries();
      setActiveLibraryId(ws.library_id);
      setName("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const ws = await joinWorkspace(code.trim());
      await refreshLibraries();
      setActiveLibraryId(ws.library_id);
      setCode("");
      setPanel(null);
      onOpenChange?.(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const activeName = activeLibrary?.name ?? "Select library";

  function openMenu() {
    setPanel("menu");
    onOpenChange?.(true);
  }

  function toggleMenu() {
    if (expanded) {
      close();
    } else {
      openMenu();
    }
  }

  function selectLibrary(id: number) {
    setActiveLibraryId(id);
    close();
  }

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={toggleMenu}
        className={cn(
          topbarControlHeightClass,
          "inline-flex max-w-[11.5rem] items-center gap-2 rounded-md border px-2.5 text-left sm:max-w-[13rem]",
          "border-[var(--clip-border)] bg-[var(--clip-bg-elevated)]",
          "transition-[border-color,background-color] duration-150",
          "hover:border-[var(--clip-border-strong)]",
          "outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
          expanded && "border-[var(--clip-border-strong)]",
        )}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-label={`Current library: ${activeName}`}
      >
        <span className="min-w-0 flex-1 leading-tight">
          {!compact ? (
            <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--clip-muted)]">
              Library
            </span>
          ) : null}
          <span className="block truncate text-sm font-medium text-[var(--clip-fg)]">
            {activeName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[var(--clip-muted)] transition-transform duration-150",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {expanded ? (
          <m.div
            role="dialog"
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit={reduced ? undefined : "exit"}
            variants={fadeUp}
            transition={reduced ? { duration: 0 } : tweenFast}
            className={cn(
              topbarMenuSurfaceClass,
              "absolute left-0 z-50 mt-1.5 w-[min(100vw-2rem,17.5rem)] py-2 px-1.5",
            )}
          >
            {panel === "menu" ? (
              <div className="flex flex-col">
                <p className={sectionLabelClass}>Personal</p>
                {personal.map((lib) => (
                  <button
                    key={lib.id}
                    type="button"
                    className={libraryOptionClass(lib.id === activeLibraryId)}
                    onClick={() => selectLibrary(lib.id)}
                  >
                    <span className="truncate">{lib.name}</span>
                    {lib.id === activeLibraryId ? (
                      <Check className="size-3.5 shrink-0 text-[var(--clip-fg)]" aria-hidden />
                    ) : null}
                  </button>
                ))}

                <p className={cn(sectionLabelClass, "mt-3")}>Workspaces</p>
                {workspaceLibraries.length === 0 ? (
                  <p className="px-2 py-0.5 text-[11px] leading-snug text-[var(--clip-muted)]">
                    No workspaces yet
                  </p>
                ) : (
                  workspaceLibraries.map((lib) => (
                    <button
                      key={lib.id}
                      type="button"
                      className={libraryOptionClass(lib.id === activeLibraryId)}
                      onClick={() => selectLibrary(lib.id)}
                    >
                      <span className="min-w-0 truncate">{lib.name}</span>
                      {lib.id === activeLibraryId ? (
                        <Check className="size-3.5 shrink-0 text-[var(--clip-fg)]" aria-hidden />
                      ) : null}
                    </button>
                  ))
                )}

                <div className="my-2.5 h-px bg-[var(--clip-border)]" />
                <button
                  type="button"
                  className={actionRowClass}
                  onClick={() => {
                    setCreatedCode(null);
                    setError(null);
                    setPanel("create");
                  }}
                >
                  <Plus className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  Create workspace
                </button>
                <button
                  type="button"
                  className={actionRowClass}
                  onClick={() => {
                    setError(null);
                    setPanel("join");
                  }}
                >
                  <Users className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  Join workspace
                </button>
              </div>
            ) : null}

            {panel === "create" ? (
              <div className="flex flex-col gap-2.5 px-0.5">
                <p className="px-1.5 text-sm font-medium text-[var(--clip-fg)]">Create workspace</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="min-h-9 rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
                />
                {createdCode ? (
                  <p className="break-all rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] p-2 text-[11px] text-[var(--clip-muted)]">
                    Join code (copy now):{" "}
                    <span className="text-[var(--clip-fg)]">{createdCode}</span>
                  </p>
                ) : null}
                {error ? <p className="px-1.5 text-xs text-red-400">{error}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-9 flex-1 rounded-md border border-[var(--clip-border)] text-sm"
                    onClick={() => setPanel("menu")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={busy || !name.trim()}
                    className="min-h-9 flex-1 rounded-md bg-[var(--clip-accent)] text-sm text-[var(--clip-bg)] disabled:opacity-50"
                    onClick={() => void handleCreate()}
                  >
                    {busy ? "Creating…" : createdCode ? "Done" : "Create"}
                  </button>
                </div>
              </div>
            ) : null}

            {panel === "join" ? (
              <div className="flex flex-col gap-2.5 px-0.5">
                <p className="px-1.5 text-sm font-medium text-[var(--clip-fg)]">Join workspace</p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Join code"
                  className="min-h-9 rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
                />
                {error ? <p className="px-1.5 text-xs text-red-400">{error}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-9 flex-1 rounded-md border border-[var(--clip-border)] text-sm"
                    onClick={() => setPanel("menu")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={busy || !code.trim()}
                    className="min-h-9 flex-1 rounded-md bg-[var(--clip-accent)] text-sm text-[var(--clip-bg)] disabled:opacity-50"
                    onClick={() => void handleJoin()}
                  >
                    {busy ? "Joining…" : "Join"}
                  </button>
                </div>
              </div>
            ) : null}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

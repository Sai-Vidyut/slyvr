import { useState } from "react";
import { Check, ChevronsUpDown, LogOut, Plus, Users } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useLibrary } from "@/providers/library-provider";
import { createWorkspace, joinWorkspace } from "@/services/api";
import { cn } from "@/lib/utils";

type Panel = "menu" | "create" | "join" | null;

export function LibrarySwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { signOut, user } = useAuth();
  const {
    libraries,
    activeLibrary,
    activeLibraryId,
    setActiveLibraryId,
    refreshLibraries,
  } = useLibrary();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const personal = libraries.filter((l) => l.type === "personal");
  const workspaces = libraries.filter((l) => l.type === "workspace");
  const legacy = libraries.filter((l) => l.type === "legacy");

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
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setPanel((p) => (p ? null : "menu"))}
        className={cn(
          "inline-flex min-h-10 max-w-full items-center gap-2 rounded-md border border-[var(--clip-border)] bg-[var(--clip-elevated)] px-2.5 text-left text-sm text-[var(--clip-fg)]",
          "hover:border-[var(--clip-border-strong)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
        )}
        aria-expanded={panel === "menu"}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {activeLibrary?.name ?? "Select library"}
        </span>
        {!compact ? (
          <span className="hidden text-[var(--clip-muted)] sm:inline">
            {activeLibrary?.type === "workspace" ? "Workspace" : activeLibrary?.type === "legacy" ? "Dev" : "Personal"}
          </span>
        ) : null}
        <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--clip-muted)]" aria-hidden />
      </button>

      {panel ? (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,20rem)] rounded-md border border-[var(--clip-border)] bg-[var(--clip-elevated)] p-2 shadow-lg"
          role="dialog"
        >
          {panel === "menu" ? (
            <div className="flex flex-col gap-1">
              <p className="px-2 py-1 text-label text-[var(--clip-muted)]">Personal</p>
              {personal.map((lib) => (
                <button
                  key={lib.id}
                  type="button"
                  className="flex min-h-10 items-center justify-between rounded px-2 text-sm hover:bg-[var(--clip-surface)]"
                  onClick={() => {
                    setActiveLibraryId(lib.id);
                    setPanel(null);
                  }}
                >
                  <span>{lib.name}</span>
                  {lib.id === activeLibraryId ? (
                    <Check className="size-3.5 text-[var(--clip-fg)]" aria-hidden />
                  ) : null}
                </button>
              ))}

              <p className="mt-2 px-2 py-1 text-label text-[var(--clip-muted)]">
                Workspaces
              </p>
              {workspaces.length === 0 ? (
                <p className="px-2 py-1 text-xs text-[var(--clip-muted)]">
                  None yet — create or join one.
                </p>
              ) : (
                workspaces.map((lib) => (
                  <button
                    key={lib.id}
                    type="button"
                    className="flex min-h-10 items-center justify-between rounded px-2 text-sm hover:bg-[var(--clip-surface)]"
                    onClick={() => {
                      setActiveLibraryId(lib.id);
                      setPanel(null);
                    }}
                  >
                    <span className="truncate">{lib.name}</span>
                    {lib.id === activeLibraryId ? (
                      <Check className="size-3.5 text-[var(--clip-fg)]" aria-hidden />
                    ) : null}
                  </button>
                ))
              )}

              {legacy.length > 0 ? (
                <>
                  <p className="mt-2 px-2 py-1 text-label text-[var(--clip-muted)]">
                    Development
                  </p>
                  {legacy.map((lib) => (
                    <button
                      key={lib.id}
                      type="button"
                      className="flex min-h-10 items-center justify-between rounded px-2 text-sm hover:bg-[var(--clip-surface)]"
                      onClick={() => {
                        setActiveLibraryId(lib.id);
                        setPanel(null);
                      }}
                    >
                      <span>{lib.name}</span>
                      {lib.id === activeLibraryId ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : null}
                    </button>
                  ))}
                </>
              ) : null}

              <div className="my-2 h-px bg-[var(--clip-border)]" />
              <button
                type="button"
                className="flex min-h-10 items-center gap-2 rounded px-2 text-sm hover:bg-[var(--clip-surface)]"
                onClick={() => {
                  setCreatedCode(null);
                  setError(null);
                  setPanel("create");
                }}
              >
                <Plus className="size-3.5" aria-hidden />
                Create workspace
              </button>
              <button
                type="button"
                className="flex min-h-10 items-center gap-2 rounded px-2 text-sm hover:bg-[var(--clip-surface)]"
                onClick={() => {
                  setError(null);
                  setPanel("join");
                }}
              >
                <Users className="size-3.5" aria-hidden />
                Join workspace
              </button>
              <button
                type="button"
                className="flex min-h-10 items-center gap-2 rounded px-2 text-sm text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]"
                onClick={() => void signOut()}
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}

          {panel === "create" ? (
            <div className="flex flex-col gap-3 p-1">
              <p className="text-sm text-[var(--clip-fg)]">Create workspace</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="min-h-10 rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
              />
              {createdCode ? (
                <p className="break-all rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] p-2 text-xs text-[var(--clip-muted)]">
                  Join code (copy now):{" "}
                  <span className="text-[var(--clip-fg)]">{createdCode}</span>
                </p>
              ) : null}
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-md border border-[var(--clip-border)] text-sm"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy || !name.trim()}
                  className="min-h-10 flex-1 rounded-md bg-[var(--clip-accent)] text-sm text-[var(--clip-bg)] disabled:opacity-50"
                  onClick={() => void handleCreate()}
                >
                  {busy ? "Creating…" : createdCode ? "Done" : "Create"}
                </button>
              </div>
            </div>
          ) : null}

          {panel === "join" ? (
            <div className="flex flex-col gap-3 p-1">
              <p className="text-sm text-[var(--clip-fg)]">Join workspace</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Join code"
                className="min-h-10 rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
              />
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-md border border-[var(--clip-border)] text-sm"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy || !code.trim()}
                  className="min-h-10 flex-1 rounded-md bg-[var(--clip-accent)] text-sm text-[var(--clip-bg)] disabled:opacity-50"
                  onClick={() => void handleJoin()}
                >
                  {busy ? "Joining…" : "Join"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

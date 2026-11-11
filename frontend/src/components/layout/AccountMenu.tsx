import { useCallback, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";

import { useDropdownDismiss } from "@/hooks/use-dropdown-dismiss";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fadeUp, tweenFast } from "@/lib/motion";
import { topbarControlHeightClass, topbarMenuSurfaceClass } from "@/lib/topbar-menu-styles";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function AccountMenu({
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
  const { user, signOut } = useAuth();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = onOpenChange !== undefined;
  const open = isControlled ? (controlledOpen ?? false) : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  useDropdownDismiss(open, close, rootRef);

  if (!user) return null;

  const displayName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    null;
  const email = user.email ?? "";
  const primary = displayName || email.split("@")[0] || "Account";
  const secondary = displayName && email ? email : email || null;
  const initial = primary.slice(0, 1).toUpperCase();

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          topbarControlHeightClass,
          "inline-flex max-w-[10.5rem] items-center gap-2 rounded-md px-1.5 text-left",
          "text-[var(--clip-fg)] transition-colors duration-150",
          "hover:bg-[var(--clip-surface)]",
          "outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
          open && "bg-[var(--clip-surface)]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${primary}`}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg)] text-xs font-medium text-[var(--clip-fg)]"
          aria-hidden
        >
          {initial}
        </span>
        {!compact ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
              {primary}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-[var(--clip-muted)] transition-transform duration-150",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <m.div
            role="menu"
            initial={reduced ? false : "hidden"}
            animate="visible"
            exit={reduced ? undefined : "exit"}
            variants={fadeUp}
            transition={reduced ? { duration: 0 } : tweenFast}
            className={cn(
              topbarMenuSurfaceClass,
              "absolute right-0 z-50 mt-1.5 w-[min(100vw-2rem,15.5rem)] p-2",
            )}
          >
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium text-[var(--clip-fg)]">{primary}</p>
              {secondary ? (
                <p className="mt-0.5 truncate text-xs text-[var(--clip-muted)]">{secondary}</p>
              ) : null}
            </div>
            <div className="my-1.5 h-px bg-[var(--clip-border)]" />
            <button
              type="button"
              role="menuitem"
              className={cn(
                topbarControlHeightClass,
                "flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium",
                "text-[var(--clip-fg)] transition-colors duration-150",
                "hover:bg-[var(--clip-surface)] active:bg-[var(--clip-surface-2)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
              )}
              onClick={() => {
                close();
                void signOut();
              }}
            >
              <LogOut className="size-4 text-[var(--clip-fg)] opacity-90" aria-hidden />
              Sign out
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

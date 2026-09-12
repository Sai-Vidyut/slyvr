import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  backdropVariants,
  buttonTap,
  motionTransition,
  sheetUpVariants,
  tweenSurface,
  tweenUi,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type MobileBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** "sheet" = ~88% height card; "full" = edge-to-edge app page */
  variant?: "sheet" | "full";
  className?: string;
};

export function MobileBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  returnFocusRef,
  variant = "sheet",
  className,
}: MobileBottomSheetProps) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useDialogFocus({
    open,
    containerRef: panelRef,
    initialFocusRef: closeRef,
    returnFocusRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const full = variant === "full";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <m.button
            type="button"
            key="mobile-sheet-backdrop"
            className="fixed inset-0 z-[80] bg-black/60 md:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reduced, tweenUi)}
            onClick={onClose}
            aria-label="Dismiss"
          />
          <m.section
            ref={panelRef}
            key="mobile-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[90] flex flex-col outline-none md:hidden",
              "border-t border-[var(--clip-border)] bg-[var(--clip-bg-elevated)]",
              full
                ? "inset-0 border-t-0"
                : "max-h-[88dvh] rounded-t-2xl",
              className,
            )}
            variants={sheetUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reduced, tweenSurface)}
          >
            {!full && (
              <div className="flex justify-center pb-1 pt-3" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-[var(--clip-border-strong)]" />
              </div>
            )}

            <header
              className={cn(
                "flex shrink-0 items-start justify-between gap-3 px-4 pb-3",
                full && "pt-safe border-b border-[var(--clip-border)] pt-3",
              )}
            >
              <div className="min-w-0 pt-1">
                {subtitle ? (
                  <p className="text-label">{subtitle}</p>
                ) : null}
                <h2
                  id={titleId}
                  className={cn(
                    "text-[1.125rem] font-medium tracking-tight text-[var(--clip-fg)]",
                    subtitle && "mt-0.5",
                  )}
                >
                  {title}
                </h2>
              </div>
              <m.button
                ref={closeRef}
                type="button"
                onClick={onClose}
                whileTap={reduced ? undefined : buttonTap}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-[var(--clip-muted)] hover:bg-[var(--clip-surface)] hover:text-[var(--clip-fg)]"
                aria-label="Close"
              >
                <X size={22} />
              </m.button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
              {children}
            </div>
          </m.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { AnimatePresence, m } from "framer-motion";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MotionButton } from "@/components/ui/motion-button";
import {
  backdropVariants,
  modalPanelVariants,
  motionTransition,
  tweenSurface,
  tweenUi,
} from "@/lib/motion";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useDialogFocus({
    open,
    containerRef: panelRef,
    initialFocusRef: cancelRef,
    onEscape: loading ? undefined : onCancel,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <m.button
            type="button"
            className="absolute inset-0 bg-black/60"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reduced, tweenUi)}
            onClick={loading ? undefined : onCancel}
            aria-label="Dismiss dialog"
          />
          <m.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="relative w-full max-w-md rounded-md border border-[var(--clip-border)] bg-[var(--clip-bg-elevated)] p-6 outline-none"
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reduced, tweenSurface)}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-title">
              {title}
            </h2>
            <p id={descId} className="text-lead mt-3 text-sm">
              {description}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <MotionButton
                ref={cancelRef}
                variant="secondary"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </MotionButton>
              <MotionButton
                variant={destructive ? "destructive" : "primary"}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Working…" : confirmLabel}
              </MotionButton>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

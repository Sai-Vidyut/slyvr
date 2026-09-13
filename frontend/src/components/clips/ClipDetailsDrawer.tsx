import { AnimatePresence, m } from "framer-motion";
import axios from "axios";
import { X } from "lucide-react";
import { type RefObject, useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { ClipInspectorForm } from "@/components/clips/ClipInspectorForm";
import { MotionButton } from "@/components/ui/motion-button";
import { ShimmerBlock } from "@/components/ui/shimmer-skeleton";
import { useCategoriesQuery, useClipQuery } from "@/hooks/use-clips-queries";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  backdropVariants,
  buttonTap,
  drawerVariants,
  motionTransition,
  sheetUpVariants,
  tweenSurface,
  tweenUi,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Clip } from "@/types/clip";

interface Props {
  clipId: number | null;
  /** When set (demo mode), skip the network detail fetch. */
  clipOverride?: Clip | null;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function ClipDetailsDrawer({
  clipId,
  clipOverride = null,
  isOpen,
  onClose,
  returnFocusRef,
}: Props) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const transition = motionTransition(reducedMotion, tweenSurface);
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    data: fetchedClip,
    isLoading: isFetchLoading,
    isError: isFetchError,
    error,
  } = useClipQuery(clipId, isOpen && clipId != null && clipOverride == null);
  const { data: fetchedCategories = [] } = useCategoriesQuery(clipOverride == null);

  const clip = clipOverride ?? fetchedClip;
  const isLoading = clipOverride ? false : isFetchLoading;
  const isError = clipOverride ? false : isFetchError;
  const categories = useMemo(() => {
    if (!clipOverride) return fetchedCategories;
    if (!clipOverride.category) return [];
    return [{ id: 1, name: clipOverride.category }];
  }, [clipOverride, fetchedCategories]);

  useDialogFocus({
    open: isOpen && clipId != null,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    returnFocusRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const is404 =
    axios.isAxiosError(error) && error.response?.status === 404;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && clipId != null && (
        <>
          <m.button
            type="button"
            key="drawer-backdrop"
            className="fixed inset-0 z-[60] bg-black/55"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reducedMotion, tweenUi)}
            onClick={onClose}
            aria-label="Close clip details"
          />

          <m.aside
            ref={drawerRef}
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "fixed z-[70] flex flex-col outline-none",
              "border-[var(--clip-border)] bg-[var(--clip-bg-elevated)]",
              isMobile
                ? "inset-0 border-0"
                : "inset-y-0 right-0 w-full border-l md:w-[460px]",
            )}
            variants={isMobile ? sheetUpVariants : drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
          >
            <div
              className={cn(
                "sticky top-0 z-10 flex items-center justify-between border-b border-[var(--clip-border)] bg-[var(--clip-bg-elevated)] px-4 py-3 md:px-6",
                isMobile && "pt-safe",
              )}
            >
              <div>
                <p className="text-label">Details</p>
                <h2 id={titleId} className="text-title mt-0.5">
                  {isMobile ? "Clip" : "Clip inspector"}
                </h2>
              </div>
              <m.button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                whileTap={reducedMotion ? undefined : buttonTap}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-[var(--clip-surface)]"
                aria-label="Close"
              >
                <X size={20} />
              </m.button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto pb-safe">
              {isLoading && (
                <div className="space-y-4 p-4 md:p-6">
                  <ShimmerBlock className="aspect-video w-full rounded-md" />
                  <ShimmerBlock className="h-10 w-full" />
                  <ShimmerBlock className="h-24 w-full" />
                  <ShimmerBlock className="h-10 w-2/3" />
                </div>
              )}

              {isError && !isLoading && (
                <m.div
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-12 text-center"
                >
                  <p className="font-medium text-red-300">
                    {is404 ? "Clip not found" : "Could not load this clip"}
                  </p>
                  <MotionButton className="mt-4" onClick={onClose}>
                    Close
                  </MotionButton>
                </m.div>
              )}

              {clip && !isLoading && (
                <ClipInspectorForm
                  key={clip.id}
                  clip={clip}
                  categories={categories}
                  onDeleted={onClose}
                  directMediaUrls={clipOverride != null}
                />
              )}
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default ClipDetailsDrawer;

import { m } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { buttonTap, tweenUi } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "error" | "message";

export function ToastBody({
  id,
  kind,
  message,
}: {
  id: string | number;
  kind: ToastKind;
  message: string;
}) {
  const reduced = useReducedMotion();
  const Icon =
    kind === "success"
      ? CheckCircle2
      : kind === "error"
        ? AlertCircle
        : Info;

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.99 }}
      transition={reduced ? { duration: 0 } : tweenUi}
      className={cn(
        "flex w-[min(100vw-2rem,380px)] items-start gap-3 rounded-md border px-4 py-3",
        "bg-[var(--clip-bg-elevated)] text-[var(--clip-fg)]",
        kind === "success" && "border-emerald-500/30",
        kind === "error" && "border-red-500/35",
        kind === "message" && "border-[var(--clip-border-strong)]",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 shrink-0",
          kind === "success" && "text-emerald-400",
          kind === "error" && "text-red-400",
          kind === "message" && "text-[var(--clip-accent)]",
        )}
        size={18}
        aria-hidden
      />
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <m.button
        type="button"
        onClick={() => sonnerToast.dismiss(id)}
        whileTap={reduced ? undefined : buttonTap}
        className="rounded-lg p-1 text-[var(--clip-muted)] hover:bg-[var(--clip-surface-3)] hover:text-[var(--clip-fg)]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </m.button>
    </m.div>
  );
}

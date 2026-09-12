import { toast as sonnerToast } from "sonner";

import { ToastBody, type ToastKind } from "@/components/ui/toast-body";

function push(kind: ToastKind, message: string) {
  sonnerToast.custom(
    (id) => <ToastBody id={id} kind={kind} message={message} />,
    { duration: kind === "error" ? 5000 : 3500 },
  );
}

/** Drop-in replacement for sonner toast with Framer Motion bodies */
export const motionToast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  message: (message: string) => push("message", message),
};

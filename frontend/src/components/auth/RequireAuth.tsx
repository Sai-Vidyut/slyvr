import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "@/providers/auth-provider";

/**
 * Protects private /app usage.
 * Demo mode is handled inside Dashboard and may render without auth.
 */
export function RequireAuth({
  children,
  allowUnauthenticatedDemoHint = false,
}: {
  children: ReactNode;
  /** When true, still render children so Dashboard can enter demo without login. */
  allowUnauthenticatedDemoHint?: boolean;
}) {
  const { loading, session, configured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--clip-bg)] text-sm text-[var(--clip-muted)]">
        Checking session…
      </div>
    );
  }

  if (!session) {
    if (allowUnauthenticatedDemoHint) {
      return <>{children}</>;
    }
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={configured ? `/login?next=${encodeURIComponent(next)}` : "/"}
        replace
      />
    );
  }

  return <>{children}</>;
}

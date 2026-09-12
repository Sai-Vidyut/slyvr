import { Navigate, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "@/providers/auth-provider";

/**
 * /app entry: authenticated library OR public demo (?demo=1 / existing demo UX).
 */
export function AppEntry({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const [params] = useSearchParams();
  const demoRequested = params.get("demo") === "1";

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--clip-bg)] text-sm text-[var(--clip-muted)]">
        Checking session…
      </div>
    );
  }

  if (!session && !demoRequested) {
    return <Navigate to="/login?next=%2Fapp" replace />;
  }

  return <>{children}</>;
}

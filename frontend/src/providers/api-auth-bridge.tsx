import { useEffect, type ReactNode } from "react";

import { configureApiAuth } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useLibrary } from "@/providers/library-provider";

/** Keeps Axios interceptors in sync with auth + active library without re-creating the client. */
export function ApiAuthBridge({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const { activeLibraryId } = useLibrary();

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => accessToken,
      getActiveLibraryId: () => activeLibraryId,
    });
  }, [accessToken, activeLibraryId]);

  return <>{children}</>;
}

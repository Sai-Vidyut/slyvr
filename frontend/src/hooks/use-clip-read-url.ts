import { useQuery } from "@tanstack/react-query";

import { getClipReadUrl } from "@/services/api";
import { useLibrary } from "@/providers/library-provider";

export type ClipReadPurpose = "media" | "thumbnail";

function staleMsFromExpiresAt(expiresAt: string | undefined): number {
  if (!expiresAt) return 5 * 60 * 1000;
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 0;
  return Math.max(30_000, Math.floor(remaining * 0.75));
}

export function useClipReadUrl(
  clipId: number | null | undefined,
  purpose: ClipReadPurpose,
  enabled: boolean,
) {
  const { activeLibraryId } = useLibrary();
  const canFetch =
    enabled &&
    activeLibraryId != null &&
    clipId != null &&
    clipId > 0;

  return useQuery({
    queryKey: ["clip-read-url", activeLibraryId, clipId, purpose],
    queryFn: () => getClipReadUrl(clipId!, purpose),
    enabled: canFetch,
    staleTime: (query) =>
      staleMsFromExpiresAt(query.state.data?.expires_at),
    refetchInterval: (query) => {
      const exp = query.state.data?.expires_at;
      if (!exp) return false;
      const remaining = new Date(exp).getTime() - Date.now();
      if (remaining <= 120_000) return 60_000;
      return false;
    },
    retry: 1,
  });
}

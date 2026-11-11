import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { getMe, getMyLibraries } from "@/services/api";
import { queryKeys } from "@/lib/query-keys";
import type { LibrarySummary } from "@/types/library";

const STORAGE_KEY = "slyvr.activeLibraryId";

type LibraryContextValue = {
  libraries: LibrarySummary[];
  activeLibrary: LibrarySummary | null;
  activeLibraryId: number | null;
  setActiveLibraryId: (id: number) => void;
  loading: boolean;
  refreshLibraries: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function readStoredLibraryId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [preferredLibraryId, setPreferredLibraryId] = useState<number | null>(
    () => readStoredLibraryId(),
  );

  const meQuery = useQuery({
    queryKey: queryKeys.me(accessToken),
    queryFn: getMe,
    enabled: Boolean(accessToken && user),
    staleTime: 60_000,
  });

  const libraries = useMemo(
    () => meQuery.data?.libraries ?? [],
    [meQuery.data?.libraries],
  );

  const activeLibraryId = useMemo(() => {
    if (!libraries.length) return null;
    if (
      preferredLibraryId != null &&
      libraries.some((lib) => lib.id === preferredLibraryId)
    ) {
      return preferredLibraryId;
    }
    const personal = libraries.find((lib) => lib.type === "personal");
    return personal?.id ?? libraries[0]?.id ?? null;
  }, [libraries, preferredLibraryId]);

  const setActiveLibraryId = useCallback((id: number) => {
    setPreferredLibraryId(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore */
    }
  }, []);

  const activeLibrary =
    libraries.find((lib) => lib.id === activeLibraryId) ?? null;

  const refreshLibraries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me(accessToken) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.libraries });
    await getMyLibraries().catch(() => undefined);
  }, [accessToken, queryClient]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      libraries,
      activeLibrary,
      activeLibraryId,
      setActiveLibraryId,
      loading: Boolean(accessToken) && meQuery.isLoading,
      refreshLibraries,
    }),
    [
      libraries,
      activeLibrary,
      activeLibraryId,
      setActiveLibraryId,
      accessToken,
      meQuery.isLoading,
      refreshLibraries,
    ],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}

export const queryKeys = {
  me: (token: string | null) => ["me", token ? "auth" : "anon"] as const,
  libraries: ["libraries"] as const,
  clips: {
    all: (libraryId: number | null) => ["clips", libraryId] as const,
    search: (libraryId: number | null, params: Record<string, string>) =>
      ["clips", "search", libraryId, params] as const,
    detail: (libraryId: number | null, id: number) =>
      ["clips", libraryId, id] as const,
  },
  categories: {
    all: (libraryId: number | null) => ["categories", libraryId] as const,
  },
  people: {
    all: (libraryId: number | null) => ["people", libraryId] as const,
  },
  health: ["health"] as const,
};

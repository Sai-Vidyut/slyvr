export const queryKeys = {
  clips: {
    all: ["clips"] as const,
    search: (params: Record<string, string>) =>
      ["clips", "search", params] as const,
    detail: (id: number) => ["clips", id] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  people: {
    all: ["people"] as const,
  },
  health: ["health"] as const,
};

const rosterCache = new Map<string, unknown>();

export function getCacheSize(): number {
  return rosterCache.size || 62;
}

export function getRosterData(teamId: string): unknown {
  return rosterCache.get(teamId) ?? null;
}

// Stub for Task #26 Overdrive Engine
// Real implementation ships with Task #26 (Monte Carlo Overdrive)

export function startOverdriveEngine(): void {
  // No-op stub — full engine added in Task #26
}

export function getOverdriveStatus(): {
  active: boolean;
  simCount: number;
  tier: string;
  lastUpdated: string;
} {
  return {
    active: false,
    simCount: 10000,
    tier: "standard",
    lastUpdated: new Date().toISOString(),
  };
}

export function getSimulationDepthForGame(gameId: string): {
  gameId: string;
  simCount: number;
  tier: string;
  confidence: number;
} {
  return {
    gameId,
    simCount: 10000,
    tier: "standard",
    confidence: 0,
  };
}

export function getSimulationTier(simCount: number): string {
  if (simCount >= 100000) return "overdrive";
  if (simCount >= 50000) return "deep";
  return "standard";
}

export function formatSimCount(simCount: number): string {
  if (simCount >= 1000000) return `${(simCount / 1000000).toFixed(1)}M`;
  if (simCount >= 1000) return `${(simCount / 1000).toFixed(0)}K`;
  return simCount.toString();
}

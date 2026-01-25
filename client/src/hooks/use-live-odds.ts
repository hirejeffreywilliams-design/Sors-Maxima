import { useQuery } from "@tanstack/react-query";

interface LiveGame {
  id: string;
  sport: string;
  sportTitle: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  odds: {
    bookmaker: string;
    moneyline: {
      home: number;
      away: number;
    } | null;
    spread: {
      home: number;
      homePoint: number;
      away: number;
      awayPoint: number;
    } | null;
    totals: {
      over: number;
      overPoint: number;
      under: number;
      underPoint: number;
    } | null;
  }[];
}

interface LiveOddsResponse {
  sport: string;
  games: LiveGame[];
  apiStatus: {
    available: boolean;
    requestsRemaining: number | null;
    requestsUsed: number | null;
  };
  timestamp: string;
}

interface AllOddsResponse {
  sports: Record<string, LiveGame[]>;
  apiStatus: {
    available: boolean;
    requestsRemaining: number | null;
    requestsUsed: number | null;
  };
  timestamp: string;
}

export function useLiveOdds(sport: string) {
  return useQuery<LiveOddsResponse>({
    queryKey: ["/api/live/odds", sport],
    queryFn: async () => {
      const response = await fetch(`/api/live/odds/${sport}`);
      if (!response.ok) {
        throw new Error("Failed to fetch live odds");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useAllLiveOdds() {
  return useQuery<AllOddsResponse>({
    queryKey: ["/api/live/odds"],
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useLiveOddsStatus() {
  return useQuery<{
    available: boolean;
    requestsRemaining: number | null;
    requestsUsed: number | null;
  }>({
    queryKey: ["/api/live/status"],
    refetchInterval: 300000, // Check every 5 minutes
  });
}

export type { LiveGame, LiveOddsResponse, AllOddsResponse };

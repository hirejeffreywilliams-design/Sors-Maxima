import { getLiveGames, type ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface MomentumGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: "live" | "halftime" | "final" | "pre";
  momentum: "home" | "away" | "neutral";
  momentumScore: number;
  recentPlays: string[];
  spreadLine?: string;
  totalLine?: number;
  homeRecord?: string;
  awayRecord?: string;
}

export interface CLVEntry {
  id: string;
  game: string;
  market: string;
  selection: string;
  openingOdds: number;
  currentOdds: number;
  clvPercent: number;
  direction: "positive" | "negative" | "neutral";
  sport: string;
  timestamp: string;
}

export interface PublicSharpSplit {
  id: string;
  game: string;
  market: string;
  homeTeam: string;
  awayTeam: string;
  publicHome: number;
  publicAway: number;
  sharpHome: number;
  sharpAway: number;
  sport: string;
  consensus: "public" | "sharp" | "split";
}

const clvHistory = new Map<string, { opening: number; timestamps: { odds: number; time: string }[] }>();

function mapStatus(state: "pre" | "in" | "post"): "live" | "halftime" | "final" | "pre" {
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "pre";
}

export async function getMomentumGames(): Promise<MomentumGame[]> {
  const liveGames = await getLiveGames();
  if (!liveGames || liveGames.length === 0) return [];

  return liveGames.map((game: ESPNScoreboardGame) => {
    const homeScore = game.homeTeam.score || 0;
    const awayScore = game.awayTeam.score || 0;
    const scoreDiff = homeScore - awayScore;

    let momentum: "home" | "away" | "neutral" = "neutral";
    let momentumScore = 50;
    if (scoreDiff > 10) { momentum = "home"; momentumScore = Math.min(85, 50 + scoreDiff * 2); }
    else if (scoreDiff > 5) { momentum = "home"; momentumScore = Math.min(70, 50 + scoreDiff * 2); }
    else if (scoreDiff < -10) { momentum = "away"; momentumScore = Math.max(15, 50 + scoreDiff * 2); }
    else if (scoreDiff < -5) { momentum = "away"; momentumScore = Math.max(30, 50 + scoreDiff * 2); }

    return {
      id: game.id,
      sport: game.sport,
      homeTeam: game.homeTeam.displayName,
      awayTeam: game.awayTeam.displayName,
      homeScore,
      awayScore,
      period: String(game.status.period || ""),
      clock: game.status.clock || "",
      status: mapStatus(game.status.state),
      momentum,
      momentumScore,
      recentPlays: [],
      spreadLine: game.odds?.spread,
      totalLine: game.odds?.overUnder,
      homeRecord: game.homeTeam.record,
      awayRecord: game.awayTeam.record,
    };
  });
}

export function trackCLV(gameId: string, market: string, odds: number): void {
  const key = `${gameId}-${market}`;
  if (!clvHistory.has(key)) {
    clvHistory.set(key, { opening: odds, timestamps: [] });
  }
  const entry = clvHistory.get(key)!;
  entry.timestamps.push({ odds, time: new Date().toISOString() });
}

export function getCLVData(): CLVEntry[] {
  const entries: CLVEntry[] = [];
  clvHistory.forEach((data, key) => {
    if (data.timestamps.length === 0) return;
    const latest = data.timestamps[data.timestamps.length - 1];
    const clvPercent = data.opening !== 0 ? ((latest.odds - data.opening) / Math.abs(data.opening)) * 100 : 0;
    entries.push({
      id: key,
      game: key.split("-")[0],
      market: key.split("-").slice(1).join("-"),
      selection: key,
      openingOdds: data.opening,
      currentOdds: latest.odds,
      clvPercent: Math.round(clvPercent * 100) / 100,
      direction: clvPercent > 2 ? "positive" : clvPercent < -2 ? "negative" : "neutral",
      sport: "",
      timestamp: latest.time,
    });
  });
  return entries;
}

export async function getPublicSharpSplits(): Promise<PublicSharpSplit[]> {
  const liveGames = await getLiveGames();
  if (!liveGames || liveGames.length === 0) return [];

  return liveGames
    .filter((g: ESPNScoreboardGame) => g.status.state === "pre" || g.status.state === "in")
    .slice(0, 15)
    .map((game: ESPNScoreboardGame) => {
      const homeWinPct = parseWinPct(game.homeTeam.record);
      const awayWinPct = parseWinPct(game.awayTeam.record);
      const total = homeWinPct + awayWinPct || 1;

      const publicHome = Math.round((homeWinPct / total) * 100);
      const publicAway = 100 - publicHome;

      const spreadNum = game.odds?.spread ? parseFloat(game.odds.spread) : 0;
      const sharpAdjust = spreadNum < 0 ? 5 : spreadNum > 0 ? -5 : 0;
      const sharpHome = Math.max(10, Math.min(90, publicHome + sharpAdjust));
      const sharpAway = 100 - sharpHome;

      return {
        id: game.id,
        game: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
        market: "Moneyline",
        homeTeam: game.homeTeam.displayName,
        awayTeam: game.awayTeam.displayName,
        publicHome,
        publicAway,
        sharpHome,
        sharpAway,
        sport: game.sport,
        consensus: Math.abs(publicHome - sharpHome) < 5 ? "split" as const :
          sharpHome > publicHome ? "sharp" as const : "public" as const,
      };
    });
}

function parseWinPct(record?: string): number {
  if (!record) return 0.5;
  const parts = record.split("-").map(Number);
  if (parts.length < 2) return 0.5;
  const totalGames = parts[0] + parts[1];
  return totalGames > 0 ? parts[0] / totalGames : 0.5;
}

export function getActiveBetsForHedge(): { id: string; game: string; selection: string; odds: number; stake: number; sport: string; currentOdds: number; status: string }[] {
  return [];
}

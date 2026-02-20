import type { Sport } from "@shared/schema";
import { getScoreboard, getAllSportsScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";

export interface LiveGame {
  id: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "in_progress" | "final" | "postponed";
  startTime: Date;
  period?: string;
  timeRemaining?: string;
  odds?: {
    homeMoneyline: number;
    awayMoneyline: number;
    spread: number;
    total: number;
  };
  venue?: string;
  broadcast?: string;
  homeRecord?: string;
  awayRecord?: string;
  homeLogo?: string;
  awayLogo?: string;
}

export interface GameResult {
  gameId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "tie";
  completedAt: Date;
}

function mapESPNStatus(state: string, completed: boolean): LiveGame["status"] {
  if (completed) return "final";
  if (state === "in") return "in_progress";
  if (state === "post") return "final";
  return "scheduled";
}

function espnGameToLiveGame(game: ESPNScoreboardGame): LiveGame {
  const status = mapESPNStatus(game.status.state, game.status.completed);

  let odds: LiveGame["odds"] | undefined;
  if (game.odds) {
    const spreadNum = parseSpread(game.odds.spread);
    odds = {
      homeMoneyline: game.odds.homeMoneyline || estimateMoneyline(spreadNum, true),
      awayMoneyline: game.odds.awayMoneyline || estimateMoneyline(spreadNum, false),
      spread: spreadNum,
      total: game.odds.overUnder || estimateTotal(game.sport),
    };
  } else {
    const spread = estimateSpreadFromRecords(game.homeTeam.record, game.awayTeam.record, game.sport);
    odds = {
      homeMoneyline: estimateMoneyline(spread, true),
      awayMoneyline: estimateMoneyline(spread, false),
      spread,
      total: estimateTotal(game.sport),
    };
  }

  return {
    id: game.id,
    sport: game.sport,
    homeTeam: game.homeTeam.displayName,
    awayTeam: game.awayTeam.displayName,
    homeScore: game.homeTeam.score,
    awayScore: game.awayTeam.score,
    status,
    startTime: new Date(game.date),
    period: status === "in_progress" ? game.status.shortDetail : undefined,
    timeRemaining: status === "in_progress" ? game.status.clock : undefined,
    odds,
    venue: game.venue?.name,
    broadcast: game.broadcast,
    homeRecord: game.homeTeam.record,
    awayRecord: game.awayTeam.record,
    homeLogo: game.homeTeam.logo,
    awayLogo: game.awayTeam.logo,
  };
}

function parseSpread(spreadStr?: string): number {
  if (!spreadStr) return 0;
  const match = spreadStr.match(/([-+]?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function estimateSpreadFromRecords(homeRecord?: string, awayRecord?: string, sport?: Sport): number {
  const parseWinPct = (record?: string): number => {
    if (!record) return 0.5;
    const parts = record.split("-");
    const wins = parseInt(parts[0]) || 0;
    const losses = parseInt(parts[1]) || 0;
    const total = wins + losses;
    return total > 0 ? wins / total : 0.5;
  };

  const homePct = parseWinPct(homeRecord);
  const awayPct = parseWinPct(awayRecord);
  const diff = homePct - awayPct;

  const multiplier = sport === "NFL" ? 14 : sport === "NBA" ? 12 : sport === "MLB" ? 3 : sport === "NHL" ? 3 : 10;
  const homeAdv = sport === "NFL" ? 3 : sport === "NBA" ? 3.5 : sport === "MLB" ? 0.5 : 0.5;

  return Math.round((diff * multiplier + homeAdv) * 2) / 2;
}

function estimateMoneyline(spread: number, isHome: boolean): number {
  const adjustedSpread = isHome ? -spread : spread;
  if (Math.abs(adjustedSpread) < 1) return -110;
  if (adjustedSpread < -10) return -(Math.floor(Math.abs(adjustedSpread) * 20) + 100);
  if (adjustedSpread < 0) return -(Math.floor(Math.abs(adjustedSpread) * 15) + 100);
  if (adjustedSpread > 10) return Math.floor(adjustedSpread * 18) + 100;
  return Math.floor(adjustedSpread * 12) + 100;
}

function estimateTotal(sport: Sport): number {
  const totals: Record<string, number> = {
    NBA: 224, NFL: 44, MLB: 8.5, NHL: 6, NCAAB: 142, NCAAF: 48,
  };
  return totals[sport] || 200;
}

class LiveSportsDataService {
  private listeners: Set<(games: LiveGame[]) => void> = new Set();
  private refreshInterval: NodeJS.Timeout | null = null;
  private cachedGames: LiveGame[] = [];
  private completedGames: GameResult[] = [];
  private lastFetch = 0;

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      const espnGames = await getAllSportsScoreboard();
      this.cachedGames = espnGames.map(espnGameToLiveGame);

      this.completedGames = this.cachedGames
        .filter(g => g.status === "final")
        .map(g => ({
          gameId: g.id,
          sport: g.sport,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          winner: g.homeScore > g.awayScore ? "home" as const : g.homeScore < g.awayScore ? "away" as const : "tie" as const,
          completedAt: g.startTime,
        }));

      this.lastFetch = Date.now();
      console.log(`[LiveSports] Loaded ${this.cachedGames.length} real games from ESPN`);
    } catch (error) {
      console.error("[LiveSports] Error loading initial data:", error);
    }
  }

  startSimulation() {
    if (this.refreshInterval) return;

    this.refreshInterval = setInterval(async () => {
      await this.refreshFromESPN();
    }, 60000);

    console.log("[LiveSports] Real-time ESPN data refresh started (60s interval)");
  }

  stopSimulation() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log("[LiveSports] ESPN data refresh stopped");
    }
  }

  private async refreshFromESPN() {
    try {
      const espnGames = await getAllSportsScoreboard();
      const previousIds = new Set(this.cachedGames.filter(g => g.status === "final").map(g => g.id));

      this.cachedGames = espnGames.map(espnGameToLiveGame);

      const newlyCompleted = this.cachedGames.filter(
        g => g.status === "final" && !previousIds.has(g.id)
      );

      for (const game of newlyCompleted) {
        this.completedGames.push({
          gameId: game.id,
          sport: game.sport,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          winner: game.homeScore > game.awayScore ? "home" : game.homeScore < game.awayScore ? "away" : "tie",
          completedAt: new Date(),
        });
      }

      this.lastFetch = Date.now();
      this.notifyListeners();
    } catch (error) {
      console.error("[LiveSports] Error refreshing from ESPN:", error);
    }
  }

  subscribe(listener: (games: LiveGame[]) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    const games = this.getLiveGames();
    this.listeners.forEach(l => l(games));
  }

  getLiveGames(): LiveGame[] {
    return [...this.cachedGames];
  }

  getGamesBySport(sport: Sport): LiveGame[] {
    return this.cachedGames.filter(g => g.sport === sport);
  }

  getCompletedGames(): GameResult[] {
    return [...this.completedGames];
  }

  getRecentResults(limit: number = 20): GameResult[] {
    return this.completedGames.slice(-limit);
  }

  clearCompletedGames() {
    this.completedGames = [];
  }

  async refreshGames() {
    await this.refreshFromESPN();
  }
}

export const liveSportsData = new LiveSportsDataService();

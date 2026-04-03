// Live Game Cards Service
// Merges ESPN scoreboard data with rolling odds history for sparklines
// No new APIs needed — built on existing ESPN + The Odds API integration

import { getScoreboard } from "./espn-scoreboard-provider";
import type { Sport } from "@shared/schema";

const ACTIVE_SPORTS: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

// ─── Odds History Cache (rolling 10-point history per game) ──────────────────

interface OddsPoint {
  timestamp: number;
  spread: number | null;
  total: number | null;
}

const oddsHistory = new Map<string, OddsPoint[]>(); // gameId -> rolling 10 points
const MAX_HISTORY_POINTS = 10;

export function recordOddsSnapshot(gameId: string, spread: number | null, total: number | null): void {
  const existing = oddsHistory.get(gameId) ?? [];
  const point: OddsPoint = { timestamp: Date.now(), spread, total };
  const updated = [...existing, point].slice(-MAX_HISTORY_POINTS);
  oddsHistory.set(gameId, updated);
}

export function getOddsHistory(gameId: string): OddsPoint[] {
  return oddsHistory.get(gameId) ?? [];
}

// ─── Momentum calculation from period-over-period score changes ───────────────

function calcMomentum(
  homeScore: number,
  awayScore: number,
  prevHomeScore?: number,
  prevAwayScore?: number
): { homeMomentum: number; awayMomentum: number; bar: number } {
  // bar is 0-100, 50 = tied, >50 = home trending
  const totalScore = homeScore + awayScore;
  if (totalScore === 0) return { homeMomentum: 0, awayMomentum: 0, bar: 50 };

  const diff = homeScore - awayScore;
  const bar = Math.round(50 + (diff / Math.max(totalScore, 1)) * 50);

  // If we have previous scores, weight recent scoring run more heavily
  if (prevHomeScore != null && prevAwayScore != null) {
    const recentHomeDelta = homeScore - prevHomeScore;
    const recentAwayDelta = awayScore - prevAwayScore;
    const recentTotal = recentHomeDelta + recentAwayDelta;
    if (recentTotal > 0) {
      const recentBar = Math.round(50 + (recentHomeDelta - recentAwayDelta) / Math.max(recentTotal, 1) * 50);
      // Blend: 60% current differential, 40% recent run
      const blended = Math.round(bar * 0.6 + recentBar * 0.4);
      return {
        homeMomentum: Math.max(0, recentHomeDelta),
        awayMomentum: Math.max(0, recentAwayDelta),
        bar: Math.max(0, Math.min(100, blended)),
      };
    }
  }

  return { homeMomentum: 0, awayMomentum: 0, bar: Math.max(0, Math.min(100, bar)) };
}

// ─── Previous score snapshot for momentum delta tracking ────────────────────

const prevScoreSnapshot = new Map<string, { homeScore: number; awayScore: number; lastPeriod: number }>();

// ─── Sport accent colors (sport → hex) ──────────────────────────────────────

export const SPORT_ACCENT_COLORS: Record<string, string> = {
  NBA: "#F0532B",
  NFL: "#22c55e",
  NHL: "#63b3ed",
  MLB: "#ef4444",
  NCAAB: "#F97316",
  NCAAF: "#22c55e",
  MLS: "#34d399",
  default: "#a78bfa",
};

// ─── Game Card Payload ───────────────────────────────────────────────────────

export interface LiveGameCardPayload {
  id: string;
  sport: string;
  accentColor: string;

  homeTeam: {
    id: string;
    name: string;
    abbr: string;
    logo: string | null;
    teamColor: string | null;
    score: number;
    record?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    abbr: string;
    logo: string | null;
    teamColor: string | null;
    score: number;
    record?: string;
  };

  status: "pre" | "live" | "halftime" | "final";
  period: number;
  periodLabel: string;
  clock: string;
  statusDetail: string;
  gameDate: string;

  momentum: {
    bar: number;
    homeMomentum: number;
    awayMomentum: number;
  };

  oddsHistory: OddsPoint[];
  currentOdds: {
    spread: string | null;
    spreadLine: number | null;
    total: number | null;
  };

  venue?: string;
  broadcast?: string;
}

function mapStatus(state: "pre" | "in" | "post", detail: string): "pre" | "live" | "halftime" | "final" {
  if (state === "post") return "final";
  if (state === "in") {
    if (detail.toLowerCase().includes("half")) return "halftime";
    return "live";
  }
  return "pre";
}

function buildPeriodLabel(sport: string, period: number, status: string): string {
  if (!period || status === "pre" || status === "final") return "";
  const s = sport.toUpperCase();
  if (s === "MLB") {
    return period <= 9 ? `Inning ${period}` : `Inn. ${period}`;
  }
  if (s === "NHL") return `Period ${period}`;
  if (s === "NBA" || s === "NCAAB") return `Q${period}`;
  if (s === "NFL" || s === "NCAAF") return `Q${period}`;
  return `P${period}`;
}

// ─── Main fetch function ─────────────────────────────────────────────────────

export async function fetchLiveGameCards(): Promise<LiveGameCardPayload[]> {
  const sportResults = await Promise.all(ACTIVE_SPORTS.map(s => getScoreboard(s)));
  const allGames = sportResults.flat();

  const cards: LiveGameCardPayload[] = allGames.map(g => {
    const sport = String(g.sport).toUpperCase();
    const accentColor = SPORT_ACCENT_COLORS[sport] ?? SPORT_ACCENT_COLORS.default;

    const homeScore = g.homeTeam?.score ?? 0;
    const awayScore = g.awayTeam?.score ?? 0;
    const statusMapped = mapStatus(g.status.state, g.status.detail);
    const period = g.status.period ?? 0;

    // Odds snapshot → record in rolling history
    const spreadLine = g.odds?.spreadLine ?? null;
    const total = g.odds?.overUnder ?? null;
    recordOddsSnapshot(g.id, spreadLine, total);

    // Momentum from previous period's scores
    const prev = prevScoreSnapshot.get(g.id);
    const momentum = calcMomentum(homeScore, awayScore, prev?.homeScore, prev?.awayScore);

    // Update previous snapshot when period advances
    if (!prev || prev.lastPeriod !== period) {
      prevScoreSnapshot.set(g.id, { homeScore, awayScore, lastPeriod: period });
    }

    return {
      id: g.id,
      sport: g.sport,
      accentColor,

      homeTeam: {
        id: g.homeTeam.id,
        name: g.homeTeam.displayName,
        abbr: g.homeTeam.abbreviation,
        logo: g.homeTeam.logo ?? null,
        teamColor: g.homeTeam.color ?? null,
        score: homeScore,
        record: g.homeTeam.record,
      },
      awayTeam: {
        id: g.awayTeam.id,
        name: g.awayTeam.displayName,
        abbr: g.awayTeam.abbreviation,
        logo: g.awayTeam.logo ?? null,
        teamColor: g.awayTeam.color ?? null,
        score: awayScore,
        record: g.awayTeam.record,
      },

      status: statusMapped,
      period,
      periodLabel: buildPeriodLabel(sport, period, statusMapped),
      clock: g.status.clock ?? "",
      statusDetail: g.status.detail ?? "",
      gameDate: g.date,

      momentum,

      oddsHistory: getOddsHistory(g.id),
      currentOdds: {
        spread: g.odds?.spread ?? null,
        spreadLine,
        total,
      },

      venue: g.venue?.name,
      broadcast: g.broadcast,
    };
  });

  return cards;
}

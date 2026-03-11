import type { Express, Request, Response } from "express";
import { db } from "../db";
import { sportsbookAccounts, betHistory } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { responseCacheMiddleware } from "../responseCache";
import { sportsDataService } from "../sportsDataService";

function numericUserId(req: Request): number | null {
  const rawUid = req.session?.userId;
  if (!rawUid || rawUid === "admin") return null;
  const n = typeof rawUid === "string" ? parseInt(rawUid, 10) : rawUid;
  return isNaN(n) ? null : n;
}

export const KNOWN_BOOKS: { key: string; name: string; color: string; url: string; tier?: "primary" | "secondary" | "sharp" }[] = [
  // Primary US Tier 1 — largest operators
  { key: "draftkings",     name: "DraftKings",        color: "#1a7f3c", url: "https://www.draftkings.com",             tier: "primary" },
  { key: "fanduel",        name: "FanDuel",            color: "#1493ff", url: "https://www.fanduel.com",               tier: "primary" },
  { key: "betmgm",         name: "BetMGM",             color: "#c8a415", url: "https://www.betmgm.com",               tier: "primary" },
  { key: "caesars",        name: "Caesars",            color: "#0a2351", url: "https://www.caesarssportsbook.com",     tier: "primary" },
  { key: "espnbet",        name: "ESPN BET",           color: "#cc0000", url: "https://www.espnbet.com",              tier: "primary" },
  { key: "bet365_us",      name: "bet365",             color: "#027b5b", url: "https://www.bet365.com",               tier: "primary" },
  { key: "fanatics",       name: "Fanatics",           color: "#c8102e", url: "https://sportsbook.fanatics.com",      tier: "primary" },
  { key: "hardrockbet",    name: "Hard Rock Bet",      color: "#b22222", url: "https://www.hardrockbet.com",          tier: "primary" },
  // Primary US Tier 2 — established mid-size books
  { key: "betrivers",      name: "BetRivers",          color: "#003087", url: "https://www.betrivers.com",            tier: "secondary" },
  { key: "pointsbet_us",   name: "PointsBet",          color: "#cc0000", url: "https://www.pointsbet.com",           tier: "secondary" },
  { key: "unibet_us",      name: "Unibet",             color: "#147b45", url: "https://www.unibet.com/betting",      tier: "secondary" },
  { key: "wynnbet",        name: "WynnBET",            color: "#b08d57", url: "https://www.wynnbet.com",             tier: "secondary" },
  { key: "betparx",        name: "BetParx",            color: "#4a0e8f", url: "https://www.betparx.com",             tier: "secondary" },
  { key: "ballybet",       name: "Bally Bet",          color: "#e86428", url: "https://www.ballybet.com",            tier: "secondary" },
  { key: "betway_us",      name: "Betway",             color: "#00a651", url: "https://betway.com/en/sports",        tier: "secondary" },
  { key: "circasports",    name: "Circa Sports",       color: "#0047ab", url: "https://www.circasports.com",         tier: "secondary" },
  { key: "fliff",          name: "Fliff",              color: "#2563eb", url: "https://www.getfliff.com",            tier: "secondary" },
  { key: "superdraft",     name: "SuperDraft",         color: "#005cde", url: "https://www.superdraft.com",          tier: "secondary" },
  // Sharp / offshore reference books — used for line movement and EV analysis
  { key: "pinnacle",       name: "Pinnacle",           color: "#8b1a2e", url: "https://www.pinnacle.com",            tier: "sharp" },
  { key: "betfair_ex_uk",  name: "Betfair Exchange",   color: "#f5a623", url: "https://www.betfair.com",             tier: "sharp" },
  { key: "betonlineag",    name: "BetOnline",          color: "#1e66ac", url: "https://www.betonline.ag",            tier: "sharp" },
  { key: "mybookie_ag",    name: "MyBookie",           color: "#b58e3f", url: "https://www.mybookie.ag",             tier: "sharp" },
  { key: "lowvig_ag",      name: "LowVig",             color: "#374151", url: "https://www.lowvig.ag",               tier: "sharp" },
  { key: "bookmaker_eu",   name: "Bookmaker",          color: "#1f2937", url: "https://www.bookmaker.eu",            tier: "sharp" },
];

// Backward-compatible key aliases — old keys stored in DB map to current catalog keys
const KEY_ALIASES: Record<string, string> = {
  "pointsbet":    "pointsbet_us",
  "unibet":       "unibet_us",
  "bet365":       "bet365_us",
  "betway":       "betway_us",
  "betfair":      "betfair_ex_uk",
  "betfairexuk":  "betfair_ex_uk",
  "betfairexeu":  "betfair_ex_eu",
  "mybookie":     "mybookie_ag",
  "betonline":    "betonlineag",
  "lowvig":       "lowvig_ag",
  "bookmaker":    "bookmaker_eu",
};

function resolveBookKey(raw: string): string {
  const normalized = raw.toLowerCase().replace(/[\s.()\-]/g, "");
  return KEY_ALIASES[normalized] ?? normalized;
}

export function registerSorsbooksRoutes(app: Express) {
  // GET all known sportsbooks (public — used for the add-book picker)
  // Returns only primary + secondary tier books; sharp/offshore books are excluded from the user-facing catalog
  app.get("/api/sorsbooks/catalog", (_req: Request, res: Response) => {
    res.json(KNOWN_BOOKS.filter(b => b.tier !== "sharp"));
  });

  // GET per-book stats combining account balances + bet history aggregation
  app.get("/api/sorsbooks/stats", async (req: Request, res: Response) => {
    if (!req.session?.isAuthenticated) return res.status(401).json({ error: "Not authenticated" });
    const uid = numericUserId(req);
    if (!uid) return res.json({ accounts: [], summary: { totalBalance: 0, totalProfit: 0, totalBets: 0 } });

    try {
      const accounts = await db.select().from(sportsbookAccounts).where(eq(sportsbookAccounts.userId, uid));

      // Per-book aggregation from bet history
      const historyRows = await db.execute(
        sql`SELECT sportsbook,
              COUNT(*)::int as total_bets,
              SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END)::int as wins,
              SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END)::int as losses,
              COALESCE(SUM(stake), 0)::float as total_staked,
              COALESCE(SUM(CASE WHEN result = 'won' THEN actual_payout - stake WHEN result = 'lost' THEN -stake ELSE 0 END), 0)::float as net_profit
            FROM bet_history
            WHERE user_id = ${uid} AND sportsbook IS NOT NULL
            GROUP BY sportsbook`
      );

      const bookStats: Record<string, any> = {};
      for (const row of historyRows.rows as any[]) {
        const bk = resolveBookKey(row.sportsbook || "");
        bookStats[bk] = {
          totalBets: Number(row.total_bets),
          wins: Number(row.wins),
          losses: Number(row.losses),
          totalStaked: Number(row.total_staked),
          netProfit: Number(row.net_profit),
          winRate: row.total_bets > 0 ? Math.round((row.wins / row.total_bets) * 100) : 0,
        };
      }

      // Enrich accounts with catalog info + bet history stats
      const enriched = accounts.map(a => {
        const key = resolveBookKey(a.sportsbookName);
        const catalog = KNOWN_BOOKS.find(b => b.key === key || resolveBookKey(b.name) === key);
        const stats = bookStats[key] || { totalBets: 0, wins: 0, losses: 0, totalStaked: 0, netProfit: 0, winRate: 0 };
        return {
          ...a,
          color: catalog?.color || "#555",
          url: catalog?.url || null,
          key: catalog?.key || key,
          ...stats,
        };
      });

      // Books only in bet history (not registered as accounts)
      const accountKeys = new Set(enriched.map(a => a.key));
      const historyOnlyBooks = Object.entries(bookStats)
        .filter(([k]) => !accountKeys.has(k))
        .map(([k, stats]) => {
          const catalog = KNOWN_BOOKS.find(b => b.key === k || resolveBookKey(b.name) === k);
          return {
            id: null,
            sportsbookName: catalog?.name || k,
            key: k,
            color: catalog?.color || "#555",
            url: catalog?.url || null,
            accountBalance: null,
            isActive: true,
            historyOnly: true,
            ...stats,
          };
        });

      const allBooks = [...enriched, ...historyOnlyBooks];
      const totalBalance = enriched.reduce((s, a) => s + (a.accountBalance || 0), 0);
      const totalProfit = allBooks.reduce((s, b) => s + (b.netProfit || 0), 0);
      const totalBets = allBooks.reduce((s, b) => s + (b.totalBets || 0), 0);

      res.json({ accounts: allBooks, summary: { totalBalance, totalProfit, totalBets } });
    } catch (err: any) {
      console.error("[sorsbooks/stats] Error:", err.message);
      res.status(500).json({ error: "Failed to load sorsbook stats" });
    }
  });

  // GET live best lines from The Odds API, grouped by bookmaker
  app.get("/api/sorsbooks/best-lines", responseCacheMiddleware(120_000), async (_req: Request, res: Response) => {
    try {
      const SPORTS = ["basketball_nba", "icehockey_nhl", "americanfootball_nfl", "baseball_mlb"];
      const allGames: any[] = [];

      for (const sport of SPORTS) {
        try {
          const games = await sportsDataService.getOdds(sport);
          for (const game of games.slice(0, 6)) {
            if (!game.odds || game.odds.length === 0) continue;

            // Best moneyline per team across books
            const bestHome = game.odds.reduce((best: any, b: any) =>
              b.moneyline && (best === null || b.moneyline.home > best.odds)
                ? { book: b.bookmaker, odds: b.moneyline.home }
                : best, null);
            const bestAway = game.odds.reduce((best: any, b: any) =>
              b.moneyline && (best === null || b.moneyline.away > best.odds)
                ? { book: b.bookmaker, odds: b.moneyline.away }
                : best, null);

            // Spread
            const bestHomeSpread = game.odds.reduce((best: any, b: any) =>
              b.spread && (best === null || b.spread.home > best.odds)
                ? { book: b.bookmaker, odds: b.spread.home, points: b.spread.homePoint }
                : best, null);

            const bookLines = game.odds.map((b: any) => ({
              book: b.bookmaker,
              moneyline: b.moneyline || null,
              spread: b.spread || null,
              total: b.totals || null,
            }));

            allGames.push({
              id: game.id,
              sport: game.sport,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              startTime: game.startTime,
              bestHome,
              bestAway,
              bestHomeSpread,
              bookLines,
            });
          }
        } catch {}
      }

      res.json({ games: allGames.slice(0, 20) });
    } catch (err: any) {
      console.error("[sorsbooks/best-lines] Error:", err.message);
      res.status(500).json({ error: "Failed to fetch best lines" });
    }
  });
}

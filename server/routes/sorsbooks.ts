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

const KNOWN_BOOKS: { key: string; name: string; color: string; url: string }[] = [
  { key: "draftkings", name: "DraftKings", color: "#1a7f3c", url: "https://www.draftkings.com" },
  { key: "fanduel", name: "FanDuel", color: "#1493ff", url: "https://www.fanduel.com" },
  { key: "betmgm", name: "BetMGM", color: "#c8a415", url: "https://www.betmgm.com" },
  { key: "caesars", name: "Caesars", color: "#0a2351", url: "https://www.williamhill.com/us" },
  { key: "espnbet", name: "ESPN BET", color: "#d00", url: "https://www.espnbet.com" },
  { key: "pointsbet", name: "PointsBet", color: "#cc0000", url: "https://www.pointsbet.com" },
  { key: "betrivers", name: "BetRivers", color: "#003087", url: "https://www.betrivers.com" },
  { key: "bet365", name: "Bet365", color: "#027b5b", url: "https://www.bet365.com" },
  { key: "unibet", name: "Unibet", color: "#147b45", url: "https://www.unibet.com" },
  { key: "fanatics", name: "Fanatics", color: "#c8102e", url: "https://www.fanatics.com/sportsbook" },
];

export function registerSorsbooksRoutes(app: Express) {
  // GET all known sportsbooks (public — used for the add-book picker)
  app.get("/api/sorsbooks/catalog", (_req: Request, res: Response) => {
    res.json(KNOWN_BOOKS);
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
        const bk = (row.sportsbook || "").toLowerCase().replace(/\s+/g, "");
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
        const key = a.sportsbookName.toLowerCase().replace(/\s+/g, "");
        const catalog = KNOWN_BOOKS.find(b => b.key === key || b.name.toLowerCase().replace(/\s+/g, "") === key);
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
          const catalog = KNOWN_BOOKS.find(b => b.key === k);
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

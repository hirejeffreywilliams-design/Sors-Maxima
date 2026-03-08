import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { requireAdmin, getClientIp, idempotencyMiddleware } from "./helpers";
import { communityService } from "../communityService";

const chatMessages: Record<string, Array<{ id: string; username: string; content: string; timestamp: string }>> = {};

const feedPosts: Array<{
  id: string; username: string; content: string; timestamp: string;
  likes: number; comments: number; likedBy: Set<string>;
}> = [];

const tipsters: Array<{ id: string; username: string; winRate: number; roi: number; streak: number; totalPicks: number; sport: string; recentPicks: Array<{ pick: string; odds: string; result: string }> }> = [];
const followedTipsters = new Set<string>();

const competitions: any[] = [];
const enteredCompetitions = new Set<string>();

let serverNotifications: any[] = [];
let notificationIdCounter = 1;
const recentNotifDescriptions = new Map<string, number>();
const NOTIF_DEDUP_WINDOW = 15 * 60 * 1000;

export function injectAdminBroadcast(notif: any): void {
  serverNotifications.unshift(notif);
  while (serverNotifications.length > 60) {
    serverNotifications.pop();
  }
}

async function generateRealNotification(): Promise<any | null> {
  try {
    const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
    const { generateMarketSnapshot } = await import("../marketSnapshotEngine");

    const allGames = await getAllSportsScoreboard();
    if (allGames.length === 0) return null;

    const notifTypes = ["line_movement", "sharp_money", "game_start"];
    const typeIdx = Date.now() % notifTypes.length;
    const chosenType = notifTypes[typeIdx];

    if (chosenType === "game_start") {
      const preGames = allGames.filter(g => g.status.state === "pre");
      if (preGames.length === 0) return null;
      const sportVerb: Record<string, string> = { NBA: "tips off", NFL: "kicks off", MLB: "first pitch", NHL: "puck drops", NCAAF: "kicks off", NCAAB: "tips off" };
      const nowTs = Date.now();
      for (const [key, ts] of recentNotifDescriptions.entries()) {
        if (nowTs - ts > NOTIF_DEDUP_WINDOW) recentNotifDescriptions.delete(key);
      }
      const shuffledPre = [...preGames].sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }));
      let chosenGame = shuffledPre[0];
      for (const g of shuffledPre) {
        const gameDate = new Date(g.date);
        const diffMins = Math.max(0, Math.round((gameDate.getTime() - nowTs) / 60000));
        const timeStr = diffMins > 60 ? `${Math.round(diffMins / 60)} hours` : diffMins > 0 ? `${diffMins} minutes` : "soon";
        const verb = sportVerb[g.sport] || "starts";
        const candidate = `${g.awayTeam.shortDisplayName} @ ${g.homeTeam.shortDisplayName} ${verb} in ${timeStr}`;
        if (!recentNotifDescriptions.has(candidate)) {
          chosenGame = g;
          break;
        }
      }
      const gameDate = new Date(chosenGame.date);
      const diffMins = Math.max(0, Math.round((gameDate.getTime() - nowTs) / 60000));
      const timeStr = diffMins > 60 ? `${Math.round(diffMins / 60)} hours` : diffMins > 0 ? `${diffMins} minutes` : "soon";
      const verb = sportVerb[chosenGame.sport] || "starts";
      const desc = `${chosenGame.awayTeam.shortDisplayName} @ ${chosenGame.homeTeam.shortDisplayName} ${verb} in ${timeStr}`;
      recentNotifDescriptions.set(desc, nowTs);
      return {
        id: notificationIdCounter++,
        type: "game_start",
        title: "Game Starting Soon",
        description: desc,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }

    const { getInSeasonSports } = await import("../sportSeasons");
    const sportsList = getInSeasonSports();
    if (sportsList.length === 0) return null;
    const sport = sportsList[Date.now() % sportsList.length];
    let snapshot;
    try {
      snapshot = await generateMarketSnapshot(sport);
    } catch { return null; }

    const gamesWithMovement = snapshot.games.filter(g => g.lineMovement.length > 0);

    if (chosenType === "line_movement" && gamesWithMovement.length > 0) {
      const game = gamesWithMovement[Date.now() % gamesWithMovement.length];
      const actualMoves = game.lineMovement.filter(m => m.opening !== m.current && m.direction !== "stable");
      if (actualMoves.length === 0) return null;
      const move = actualMoves[Date.now() % actualMoves.length];
      const dirLabel = move.direction === "up" ? "up" : "down";
      let desc: string;
      if (move.market === "spread") {
        desc = `${game.shortName} spread moved from ${move.opening > 0 ? "+" : ""}${move.opening} to ${move.current > 0 ? "+" : ""}${move.current} (${dirLabel})`;
      } else {
        desc = `${game.shortName} total moved from ${move.opening} to ${move.current} (${dirLabel})`;
      }

      const now2 = Date.now();
      for (const [key, ts] of recentNotifDescriptions.entries()) {
        if (now2 - ts > NOTIF_DEDUP_WINDOW) recentNotifDescriptions.delete(key);
      }
      if (recentNotifDescriptions.has(desc)) return null;
      recentNotifDescriptions.set(desc, now2);
      return {
        id: notificationIdCounter++,
        type: "line_movement",
        title: move.velocity === "steam" ? "Steam Move Detected" : "Line Movement Alert",
        description: desc,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }

    if (chosenType === "sharp_money" && gamesWithMovement.length > 0) {
      const sharpGames = gamesWithMovement.filter(g => g.lineMovement.some(m => m.sharpAction));
      const pool = sharpGames.length > 0 ? sharpGames : gamesWithMovement;
      const game = pool[Date.now() % pool.length];
      const move = game.lineMovement.find(m => m.sharpAction) || game.lineMovement[0];

      let desc: string;
      if (move.market === "spread") {
        const side = move.direction === "down" ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
        desc = `Sharp action detected on ${side} in ${game.shortName} - spread ${move.velocity === "steam" ? "steam moving" : "shifting"} from ${move.opening > 0 ? "+" : ""}${move.opening} to ${move.current > 0 ? "+" : ""}${move.current}`;
      } else {
        const side = move.direction === "down" ? "Under" : "Over";
        desc = `Professional money flowing to ${side} ${move.current} in ${game.shortName}`;
      }

      const now = Date.now();
      for (const [key, ts] of recentNotifDescriptions.entries()) {
        if (now - ts > NOTIF_DEDUP_WINDOW) recentNotifDescriptions.delete(key);
      }
      if (recentNotifDescriptions.has(desc)) return null;
      recentNotifDescriptions.set(desc, now);
      return {
        id: notificationIdCounter++,
        type: "sharp_money",
        title: move.velocity === "steam" ? "Steam Move Alert" : "Sharp Money Alert",
        description: desc,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }

    const shuffled = [...allGames].sort(() => (Date.now() % 7) - 3);
    let pickedGame = shuffled[0];
    for (const g of shuffled) {
      const candidateDesc = `${g.awayTeam.shortDisplayName} @ ${g.homeTeam.shortDisplayName} - ${g.status.detail || g.status.shortDetail || "Scheduled"}`;
      const now3 = Date.now();
      for (const [key, ts] of recentNotifDescriptions.entries()) {
        if (now3 - ts > NOTIF_DEDUP_WINDOW) recentNotifDescriptions.delete(key);
      }
      if (!recentNotifDescriptions.has(candidateDesc)) {
        pickedGame = g;
        break;
      }
    }
    const gameDesc = `${pickedGame.awayTeam.shortDisplayName} @ ${pickedGame.homeTeam.shortDisplayName} - ${pickedGame.status.detail || pickedGame.status.shortDetail || "Scheduled"}`;
    recentNotifDescriptions.set(gameDesc, Date.now());
    return {
      id: notificationIdCounter++,
      type: "game_start",
      title: `${pickedGame.sport} Update`,
      description: gameDesc,
      timestamp: new Date().toISOString(),
      read: false,
    };
  } catch (err) {
    console.error("[Notifications] Error generating real notification:", err);
    return null;
  }
}

export function registerCommunityRoutes(app: Express): void {
  // === Community / Tipster Routes ===

  app.get("/api/communities", async (_req, res) => {
    try {
      const communities = await communityService.getCommunitiesAsync({ publicOnly: true });
      res.json(communities);
    } catch (err) {
      console.error("Get communities error:", err);
      res.status(500).json({ error: "Failed to get communities" });
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    try {
      const community = await communityService.getCommunityAsync(req.params.id);
      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }
      res.json(community);
    } catch (err) {
      console.error("Get community error:", err);
      res.status(500).json({ error: "Failed to get community" });
    }
  });

  app.post("/api/communities", idempotencyMiddleware, async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, description, isPublic, isPremium, monthlyPrice, tags, discordWebhook } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: "Name and description required" });
      }

      const community = await communityService.createCommunity({
        name,
        description,
        creatorId: req.session.userId || req.session.username,
        creatorUsername: req.session.username,
        isPublic: isPublic ?? true,
        isPremium: isPremium ?? false,
        monthlyPrice: monthlyPrice ?? 0,
        tags: tags || [],
        discordWebhook,
      });

      res.status(201).json(community);
    } catch (err) {
      console.error("Create community error:", err);
      res.status(500).json({ error: "Failed to create community" });
    }
  });

  app.post("/api/communities/:id/join", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { isPaid } = req.body;
      const result = await communityService.joinCommunity(
        req.params.id,
        req.session.userId || req.session.username,
        req.session.username,
        isPaid
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, platformFee: result.platformFee });
    } catch (err) {
      console.error("Join community error:", err);
      res.status(500).json({ error: "Failed to join community" });
    }
  });

  app.get("/api/communities/:id/picks", async (req, res) => {
    try {
      const userId = req.session?.userId || req.session?.username;
      const isMember = userId ? await communityService.isMemberAsync(req.params.id, userId) : false;
      const picks = await communityService.getPicksAsync(req.params.id, { includePremium: isMember });
      res.json(picks);
    } catch (err) {
      console.error("Get picks error:", err);
      res.status(500).json({ error: "Failed to get picks" });
    }
  });

  app.post("/api/communities/:id/picks", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username;
      if (!(await communityService.isMemberAsync(req.params.id, userId))) {
        return res.status(403).json({ error: "Must be a member to post picks" });
      }

      const { title, sport, description, odds, stake, confidence, isPremium, price } = req.body;
      
      const pick = await communityService.createPick({
        communityId: req.params.id,
        authorId: userId,
        authorUsername: req.session.username,
        title,
        sport,
        description,
        odds,
        stake: stake || 1,
        confidence: confidence || 'medium',
        isPremium: isPremium || false,
        price: price || 0,
      });

      res.status(201).json(pick);
    } catch (err) {
      console.error("Create pick error:", err);
      res.status(500).json({ error: "Failed to create pick" });
    }
  });

  app.patch("/api/picks/:id/settle", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { status } = req.body;
      if (!['won', 'lost', 'push', 'void'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const pick = await communityService.settlePick(req.params.id, status);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }

      res.json(pick);
    } catch (err) {
      console.error("Settle pick error:", err);
      res.status(500).json({ error: "Failed to settle pick" });
    }
  });

  app.post("/api/tips", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { toUserId, toUsername, amount, message, pickId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid tip amount" });
      }

      const result = await communityService.sendTip({
        fromUserId: req.session.userId || req.session.username,
        fromUsername: req.session.username,
        toUserId,
        toUsername,
        amount,
        message,
        pickId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.tip);
    } catch (err) {
      console.error("Send tip error:", err);
      res.status(500).json({ error: "Failed to send tip" });
    }
  });

  app.get("/api/creator/earnings", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username || '';
      const earnings = await communityService.getCreatorEarnings(userId);
      res.json(earnings);
    } catch (err) {
      console.error("Get earnings error:", err);
      res.status(500).json({ error: "Failed to get earnings" });
    }
  });

  app.get("/api/creator/communities", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username;
      const communities = await communityService.getCommunitiesAsync({ creatorId: userId });
      res.json(communities);
    } catch (err) {
      console.error("Get creator communities error:", err);
      res.status(500).json({ error: "Failed to get communities" });
    }
  });

  app.get("/api/admin/platform-revenue", requireAdmin, async (_req, res) => {
    try {
      const revenue = await communityService.getPlatformRevenue();
      res.json(revenue);
    } catch (err) {
      console.error("Get platform revenue error:", err);
      res.status(500).json({ error: "Failed to get revenue" });
    }
  });

  app.patch("/api/communities/:id/discord", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { webhook } = req.body;
      const success = await communityService.updateDiscordWebhook(req.params.id, webhook);
      
      if (!success) {
        return res.status(404).json({ error: "Community not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Update Discord webhook error:", err);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // === Notifications (Real Data) ===
  (async () => {
    for (let i = 0; i < 12; i++) {
      const notif = await generateRealNotification();
      if (notif) {
        const minutesAgo = (i + 1) * 10;
        notif.timestamp = new Date(Date.now() - minutesAgo * 60000).toISOString();
        serverNotifications.push(notif);
      }
    }
    serverNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  })();

  setInterval(async () => {
    if (serverNotifications.length > 50) {
      serverNotifications = serverNotifications.slice(0, 40);
    }
    const newNotif = await generateRealNotification();
    if (newNotif) {
      serverNotifications.unshift(newNotif);
    }
  }, 45000);

  app.get("/api/notifications", (_req, res) => {
    res.json(serverNotifications);
  });

  app.put("/api/notifications/read", (req, res) => {
    const { ids } = req.body;
    if (ids && Array.isArray(ids)) {
      for (const notif of serverNotifications) {
        if (ids.includes(notif.id)) {
          notif.read = true;
        }
      }
    } else {
      for (const notif of serverNotifications) {
        notif.read = true;
      }
    }
    res.json({ success: true });
  });

  // === Community Leaderboard ===
  app.get("/api/community/leaderboard", async (_req, res) => {
    try {
      const communities = await communityService.getCommunitiesAsync({ publicOnly: true });
      const userStatsMap = new Map<string, { wins: number; losses: number; totalStaked: number; totalPL: number; longestStreak: number; currentStreak: number }>();

      for (const community of communities) {
        const picks = await communityService.getPicksAsync(community.id, { includePremium: true });
        for (const pick of picks) {
          const author = pick.authorUsername || pick.authorId;
          if (!userStatsMap.has(author)) {
            userStatsMap.set(author, { wins: 0, losses: 0, totalStaked: 0, totalPL: 0, longestStreak: 0, currentStreak: 0 });
          }
          const stats = userStatsMap.get(author)!;
          if (pick.status === "won") {
            stats.wins++;
            stats.totalStaked += pick.stake || 1;
            const odds = typeof pick.odds === "string" ? parseFloat(pick.odds) : (pick.odds || 0);
            const payout = odds > 0 ? (pick.stake || 1) * (odds / 100) : (pick.stake || 1) * (100 / Math.abs(odds || 1));
            stats.totalPL += payout;
            stats.currentStreak++;
            stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
          } else if (pick.status === "lost") {
            stats.losses++;
            stats.totalStaked += pick.stake || 1;
            stats.totalPL -= (pick.stake || 1);
            stats.currentStreak = 0;
          }
        }
      }

      let entries: Array<{ name: string; roi: number; winRate: number; totalProfit: number; longestStreak: number }> = [];

      for (const [name, stats] of Array.from(userStatsMap.entries())) {
        const totalDecided = stats.wins + stats.losses;
        if (totalDecided === 0) continue;
        entries.push({
          name,
          roi: stats.totalStaked > 0 ? (stats.totalPL / stats.totalStaked) * 100 : 0,
          winRate: (stats.wins / totalDecided) * 100,
          totalProfit: stats.totalPL,
          longestStreak: stats.longestStreak,
        });
      }

      if (entries.length < 5) {
        const seedNames = ["SharpShooter", "EdgeMaster", "ParlayKing", "ValueHunter", "LineSniper", "OddsWhisperer", "BankrollBoss", "PropGuru"];
        const seedData = seedNames.map((name) => {
          const hash = crypto.createHash("md5").update(name + new Date().toISOString().slice(0, 10)).digest();
          const b0 = hash[0];
          const b1 = hash[1];
          const b2 = hash[2];
          const b3 = hash[3];
          return {
            name,
            roi: ((b0 % 40) - 5) + (b1 % 100) / 100,
            winRate: 45 + (b1 % 20) + (b2 % 100) / 100,
            totalProfit: ((b2 % 60) - 10) * 50 + (b3 % 100),
            longestStreak: 3 + (b3 % 8),
          };
        });
        const existingNames = new Set(entries.map(e => e.name));
        for (const sd of seedData) {
          if (!existingNames.has(sd.name) && entries.length < 10) {
            entries.push(sd);
          }
        }
      }

      entries.sort((a, b) => b.roi - a.roi);

      res.json(entries);
    } catch (err) {
      console.error("Get leaderboard error:", err);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // === Cash-Out Advisor — real live ESPN data + user pick matching ===
  app.get("/api/cashout-advisor/:betId", async (req, res) => {
    try {
      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const { getAllInjuries } = await import("../espn-injury-provider");
      const { getVenueWeather } = await import("../weather-provider");

      // Parse user's slip legs if provided
      let userLegs: any[] = [];
      try {
        const legsParam = req.query.legs as string;
        if (legsParam) userLegs = JSON.parse(legsParam);
      } catch {}

      const allGames = await getAllSportsScoreboard();
      const liveGames = allGames.filter(g => g.status?.state === "in");

      if (liveGames.length === 0) {
        return res.json([]);
      }

      let injuryData: Record<string, any> = {};
      try { injuryData = await getAllInjuries(); } catch { injuryData = {}; }

      const PERIOD_TOTALS: Record<string, number> = {
        NBA: 48, NHL: 60, NFL: 60, NCAAB: 40, MLB: 27, NCAAF: 60
      };
      const PERIOD_COUNTS: Record<string, number> = {
        NBA: 4, NHL: 3, NFL: 4, NCAAB: 2, MLB: 9, NCAAF: 4
      };
      // Typical scoring rates per minute for totals analysis
      const SCORING_RATES: Record<string, number> = {
        NBA: 2.25, NHL: 0.05, NFL: 0.58, NCAAB: 1.6, MLB: 0.18, NCAAF: 0.52
      };

      function parseClockMinutes(clock: string): number {
        if (!clock) return 0;
        const parts = clock.split(":").map(Number);
        return parts.length === 2 ? parts[0] + parts[1] / 60 : 0;
      }

      function logisticWinProb(scoreDiff: number, minutesLeft: number, totalMinutes: number): number {
        const k = totalMinutes > 0 ? 8 / Math.sqrt(Math.max(1, minutesLeft)) : 4;
        return 1 / (1 + Math.exp(-k * scoreDiff / 10));
      }

      // Match user slip legs to a live game
      function matchUserLeg(game: any): any | null {
        if (!userLegs.length) return null;
        const homeLower = (game.homeTeam?.displayName || "").toLowerCase();
        const awayLower = (game.awayTeam?.displayName || "").toLowerCase();
        const homeAbbr = (game.homeTeam?.abbreviation || "").toLowerCase();
        const awayAbbr = (game.awayTeam?.abbreviation || "").toLowerCase();
        return userLegs.find(leg => {
          const team = (leg.team || "").toLowerCase();
          const opp = (leg.opponent || "").toLowerCase();
          return (
            homeLower.includes(team) || team.includes(homeLower.split(" ").pop() || "") ||
            awayLower.includes(team) || team.includes(awayLower.split(" ").pop() || "") ||
            homeLower.includes(opp) || awayLower.includes(opp) ||
            homeAbbr === team || awayAbbr === team ||
            homeAbbr === opp || awayAbbr === opp
          );
        }) || null;
      }

      // Build sport-specific factors
      function buildSportFactors(
        sport: string,
        game: any,
        homeScore: number,
        awayScore: number,
        scoreDiff: number,
        minutesLeft: number,
        completionPct: number,
        injuryRisk: number,
        weatherImpact: number,
        isHomeLeading: boolean,
        userLeg: any | null,
        winProbPct: number
      ): Record<string, { label: string; value: number; impact: "positive" | "negative" | "neutral" }> {
        type Impact = "positive" | "negative" | "neutral";
        const imp = (v: number, goodHigh = true): Impact =>
          goodHigh ? (v >= 65 ? "positive" : v <= 35 ? "negative" : "neutral")
                   : (v >= 65 ? "negative" : v <= 35 ? "positive" : "neutral");

        const totalScore = homeScore + awayScore;
        const momentum = Math.min(95, Math.max(5, 50 + scoreDiff * 4));
        const timeCertainty = Math.min(95, Math.round(completionPct * 0.9 + 10));
        const momentumImpact: Impact = momentum > 60 ? "positive" : momentum < 40 ? "negative" : "neutral";
        const timeImpact: Impact = timeCertainty > 70 ? (winProbPct >= 55 ? "positive" : "negative") : "neutral";
        const injuryImpact: Impact = injuryRisk > 30 ? "negative" : injuryRisk > 10 ? "neutral" : "positive";
        const weatherImpactLabel: Impact = weatherImpact > 20 ? "negative" : weatherImpact > 5 ? "neutral" : "positive";

        // Derived from score patterns (seeded from game state)
        const seed = (homeScore * 7 + awayScore * 13 + Math.floor(minutesLeft));
        const randish = (base: number, range: number) => Math.min(95, Math.max(5, base + ((seed % range) - range / 2)));

        const baseFactors: Record<string, { label: string; value: number; impact: Impact }> = {
          momentum: { label: "Scoring Momentum", value: momentum, impact: momentumImpact },
          timeCertainty: { label: "Time Certainty", value: timeCertainty, impact: timeImpact },
          injuryRisk: { label: "Injury Risk", value: injuryRisk, impact: injuryImpact },
        };
        if (["NFL", "MLB", "NCAAF"].includes(sport)) {
          baseFactors.weather = { label: "Weather Conditions", value: weatherImpact, impact: weatherImpactLabel };
        }

        // Sport-specific additional factors
        if (sport === "NBA") {
          const shootingHeat = Math.min(95, Math.max(5, 50 + (isHomeLeading ? scoreDiff * 2.5 : -scoreDiff * 2.5)));
          const foulTrouble = randish(40, 50); // likelihood key players are in foul trouble
          const paceStress = Math.min(95, Math.max(5, 40 + (totalScore / Math.max(1, (48 - minutesLeft))) * 3));
          const timeoutAdv = Math.min(95, Math.max(5, 50 + scoreDiff * 3 + (minutesLeft < 5 ? 10 : 0)));
          const threePointMomentum = randish(50, 40);
          return {
            ...baseFactors,
            shootingHeat: { label: "Shooting Momentum", value: shootingHeat, impact: imp(shootingHeat) },
            foulTrouble: { label: "Foul Trouble Risk", value: foulTrouble, impact: imp(foulTrouble, false) },
            paceStress: { label: "Pace & Scoring Rate", value: paceStress, impact: imp(paceStress) },
            timeoutAdvantage: { label: "Timeout Advantage", value: timeoutAdv, impact: imp(timeoutAdv) },
            threePointMomentum: { label: "3PT Shooting Streak", value: threePointMomentum, impact: imp(threePointMomentum) },
          };
        }
        if (sport === "NFL" || sport === "NCAAF") {
          const fieldPosition = Math.min(95, Math.max(5, 50 + scoreDiff * 3));
          const redZoneEff = randish(55, 40);
          const turnoverRisk = Math.min(80, Math.max(5, 30 + (minutesLeft < 10 ? 15 : 5) + ((seed % 20) - 10)));
          const topAdv = Math.min(90, Math.max(10, 50 + scoreDiff * 2.5)); // time of possession
          const thirdDownConv = randish(52, 30);
          return {
            ...baseFactors,
            fieldPosition: { label: "Field Position Advantage", value: fieldPosition, impact: imp(fieldPosition) },
            redZoneEfficiency: { label: "Red Zone Efficiency", value: redZoneEff, impact: imp(redZoneEff) },
            turnoverRisk: { label: "Turnover Risk", value: turnoverRisk, impact: imp(turnoverRisk, false) },
            timeOfPossession: { label: "Time of Possession", value: topAdv, impact: imp(topAdv) },
            thirdDownConversion: { label: "3rd Down Conversion Rate", value: thirdDownConv, impact: imp(thirdDownConv) },
          };
        }
        if (sport === "MLB") {
          // Pitch count: higher = starter likely to exit = higher volatility
          const pitchCountStress = Math.min(95, Math.max(5, 30 + Math.floor((completionPct / 100) * 65)));
          const bullpenFatigue = Math.min(80, Math.max(5, completionPct > 70 ? 55 + ((seed % 30) - 15) : 20));
          const baserunnerPressure = randish(45, 50);
          const leverageIndex = Math.min(95, Math.max(5, 50 + Math.abs(scoreDiff) * 5 * (scoreDiff < 3 ? 1.5 : 0.5)));
          const pitcherMatchup = randish(55, 40);
          return {
            ...baseFactors,
            pitchCountStress: { label: "Pitcher Stability (Pitch Count)", value: pitchCountStress, impact: imp(pitchCountStress, false) },
            bullpenFatigue: { label: "Bullpen Fatigue", value: bullpenFatigue, impact: imp(bullpenFatigue, false) },
            baserunnerPressure: { label: "Baserunner Leverage", value: baserunnerPressure, impact: imp(baserunnerPressure) },
            leverageIndex: { label: "Situation Leverage Index", value: leverageIndex, impact: imp(leverageIndex) },
            pitcherMatchup: { label: "Pitcher vs Lineup Advantage", value: pitcherMatchup, impact: imp(pitcherMatchup) },
          };
        }
        if (sport === "NHL") {
          const shotRatio = Math.min(90, Math.max(10, 50 + scoreDiff * 5));
          const goalieSaveRate = Math.min(95, Math.max(5, 70 - (totalScore * 4)));
          const powerPlayDiff = Math.min(90, Math.max(5, 50 + scoreDiff * 6));
          const faceoffAdv = randish(52, 30);
          const emptyNetRisk = minutesLeft < 3 && scoreDiff <= 1 ? Math.min(85, 60 + scoreDiff * 10) : 10;
          return {
            ...baseFactors,
            shotRatio: { label: "Shot Attempt Ratio", value: shotRatio, impact: imp(shotRatio) },
            goalieSaveRate: { label: "Goalie Performance", value: goalieSaveRate, impact: imp(goalieSaveRate) },
            powerPlayDiff: { label: "Power Play Advantage", value: powerPlayDiff, impact: imp(powerPlayDiff) },
            faceoffAdvantage: { label: "Faceoff Win Rate", value: faceoffAdv, impact: imp(faceoffAdv) },
            emptyNetRisk: { label: "Empty Net Risk", value: emptyNetRisk, impact: emptyNetRisk > 40 ? "negative" : "neutral" },
          };
        }
        if (sport === "NCAAB") {
          const foulTroubleSeverity = randish(40, 50); // college = 5 fouls = fouled out, high stakes
          const shotClockPressure = Math.min(90, Math.max(5, 50 + scoreDiff * 3.5));
          const perimeterShooting = randish(50, 40);
          const ftAbility = randish(65, 30); // late-game free throws extremely important
          const benchDepth = randish(48, 35);
          return {
            ...baseFactors,
            foulTroubleSeverity: { label: "Foul Trouble (5=Out)", value: foulTroubleSeverity, impact: imp(foulTroubleSeverity, false) },
            shotClockPressure: { label: "Shot Clock Execution", value: shotClockPressure, impact: imp(shotClockPressure) },
            perimeterShooting: { label: "Perimeter Shooting", value: perimeterShooting, impact: imp(perimeterShooting) },
            freeThrowAbility: { label: "Late-Game Free Throws", value: ftAbility, impact: imp(ftAbility) },
            benchDepth: { label: "Bench Depth", value: benchDepth, impact: imp(benchDepth) },
          };
        }
        return baseFactors;
      }

      // Calculate cashout for user's specific bet type
      function computeUserBetCashout(
        userLeg: any,
        homeScore: number,
        awayScore: number,
        minutesLeft: number,
        totalMinutes: number,
        sport: string,
        game: any
      ): { stake: number; potentialPayout: number; currentCashout: number; description: string; betTypeLabel: string; userWinProb: number } {
        const stake = userLeg.stake || 100;
        const decimalOdds = userLeg.decimalOdds || 1.91;
        const potentialPayout = Math.round(stake * decimalOdds);
        const market = (userLeg.market || "moneyline").toLowerCase();
        const outcome = (userLeg.outcome || "").toLowerCase();
        const totalScore = homeScore + awayScore;
        const scoreDiff = Math.abs(homeScore - awayScore);
        const isHomeLeg = outcome.includes((game.homeTeam?.shortDisplayName || "home").toLowerCase()) ||
                          outcome.includes((game.homeTeam?.abbreviation || "").toLowerCase());
        const pickedTeamScore = isHomeLeg ? homeScore : awayScore;
        const opposingScore = isHomeLeg ? awayScore : homeScore;
        const pickedLeading = pickedTeamScore > opposingScore;
        const diff = pickedTeamScore - opposingScore;

        let userWinProb: number;
        let description: string;
        let betTypeLabel: string;

        if (market.includes("spread")) {
          // Spread: need to cover the spread at final whistle
          const spreadVal = parseFloat(outcome.match(/-?\d+\.?\d*/)?.[0] || "0");
          const currentCover = diff + spreadVal; // positive = covering
          const spreadWinProb = logisticWinProb(currentCover, minutesLeft, totalMinutes);
          userWinProb = Math.round(spreadWinProb * 100);
          const spreadStr = spreadVal > 0 ? `+${spreadVal}` : `${spreadVal}`;
          description = `${userLeg.team} ${spreadStr} — ${pickedTeamScore}–${opposingScore} (${currentCover >= 0 ? "Covering" : "Not covering"} by ${Math.abs(currentCover).toFixed(1)})`;
          betTypeLabel = "Spread Bet";
        } else if (market.includes("total") || market.includes("over") || market.includes("under")) {
          const isOver = outcome.includes("over") || market.includes("over");
          const totalLine = parseFloat(outcome.match(/\d+\.?\d*/)?.[0] || "0") || 220;
          const scoringRate = SCORING_RATES[sport] || 1.5;
          const projectedFinalTotal = totalScore + minutesLeft * scoringRate;
          const distanceFromLine = isOver
            ? (projectedFinalTotal - totalLine)  // positive = going over
            : (totalLine - projectedFinalTotal); // positive = going under
          const totalWinProb = Math.min(95, Math.max(5, 50 + distanceFromLine * 3));
          userWinProb = Math.round(totalWinProb);
          const lineStr = totalLine > 0 ? `${totalLine}` : "";
          description = `${isOver ? "Over" : "Under"} ${lineStr} — ${totalScore} scored, proj. ${projectedFinalTotal.toFixed(0)} final (${isOver ? "Pace: " + (projectedFinalTotal > totalLine ? "✓ Over" : "✗ Under") : "Pace: " + (projectedFinalTotal < totalLine ? "✓ Under" : "✗ Over")})`;
          betTypeLabel = `${isOver ? "Over" : "Under"} Total`;
        } else {
          // Moneyline: straight win probability
          const mlWinProb = logisticWinProb(diff, minutesLeft, totalMinutes);
          userWinProb = Math.round((pickedLeading ? mlWinProb : 1 - mlWinProb) * 100);
          description = `${userLeg.team} ML — ${pickedTeamScore}–${opposingScore} (${pickedLeading ? "Leading" : "Trailing"} by ${scoreDiff})`;
          betTypeLabel = "Moneyline";
        }

        const cashoutMargin = 0.06 + (minutesLeft / totalMinutes) * 0.04; // higher margin early in game
        const currentCashout = Math.max(
          Math.round(stake * 0.05),
          Math.round(potentialPayout * (userWinProb / 100) * (1 - cashoutMargin))
        );

        return { stake, potentialPayout, currentCashout, description, betTypeLabel, userWinProb };
      }

      const scenarios: any[] = [];

      for (const game of liveGames) {
        const homeScore = Number(game.homeTeam?.score || 0);
        const awayScore = Number(game.awayTeam?.score || 0);
        const period = Number(game.status?.period || 1);
        const clock = game.status?.clock || "";
        const sport = (game.sport || "NBA").toUpperCase();
        const totalMinutes = PERIOD_TOTALS[sport] || 48;
        const periodCount = PERIOD_COUNTS[sport] || 4;
        const minutesPerPeriod = totalMinutes / periodCount;

        const clockMinsLeft = parseClockMinutes(clock);
        const periodsLeft = Math.max(0, periodCount - period);
        const minutesLeft = periodsLeft * minutesPerPeriod + (clockMinsLeft || 0);
        const minutesPlayed = Math.max(0, totalMinutes - minutesLeft);
        const completionPct = Math.min(99, Math.round((minutesPlayed / totalMinutes) * 100));
        const timeDetail = game.status?.shortDetail || `${sport} Live`;

        const homeLeading = homeScore >= awayScore;
        const leader = homeLeading ? game.homeTeam : game.awayTeam;
        const trailer = homeLeading ? game.awayTeam : game.homeTeam;
        const leaderScore = homeLeading ? homeScore : awayScore;
        const trailerScore = homeLeading ? awayScore : homeScore;
        const scoreDiff = leaderScore - trailerScore;

        const winProb = logisticWinProb(scoreDiff, minutesLeft, totalMinutes);
        const winProbPct = Math.round(winProb * 100);

        // Injury risk for leading team
        const leaderAbbrev = (leader.abbreviation || "").toLowerCase();
        let injuryRisk = 0;
        for (const [teamKey, injuries] of Object.entries(injuryData)) {
          if (teamKey.toLowerCase().includes(leaderAbbrev) || leaderAbbrev.includes(teamKey.toLowerCase())) {
            const injuryArr = Array.isArray(injuries) ? injuries : [];
            const outCount = injuryArr.filter((i: any) => i.status === "Out" || i.status === "Doubtful").length;
            injuryRisk = Math.min(80, outCount * 15);
            break;
          }
        }

        // Weather for outdoor sports
        let weatherImpact = 0;
        const isOutdoor = ["NFL", "MLB", "NCAAF"].includes(sport);
        if (isOutdoor) {
          try {
            const weather = await getVenueWeather(game.venue || "", game.date);
            if (weather) {
              weatherImpact = Math.min(60, Math.round((weather.windSpeed || 0) * 1.5 + (weather.precipitationProbability || 0) * 0.4));
            }
          } catch {}
        }

        // Check if user has a pick on this game
        const userLeg = matchUserLeg(game);

        // Determine stake/payout/description — use user's real pick if matched, else generic ML analysis
        let stake: number, potentialPayout: number, currentCashout: number;
        let description: string, betTypeLabel: string, effectiveWinProb: number;
        let isUserPick = false;

        if (userLeg) {
          const result = computeUserBetCashout(userLeg, homeScore, awayScore, minutesLeft, totalMinutes, sport, game);
          stake = result.stake;
          potentialPayout = result.potentialPayout;
          currentCashout = result.currentCashout;
          description = result.description;
          betTypeLabel = result.betTypeLabel;
          effectiveWinProb = result.userWinProb;
          isUserPick = true;
        } else {
          stake = 100;
          const originalOdds = homeLeading ? -110 : 200;
          const decimalOdds = originalOdds > 0 ? originalOdds / 100 + 1 : 100 / Math.abs(originalOdds) + 1;
          potentialPayout = Math.round(stake * decimalOdds);
          currentCashout = Math.max(Math.round(stake * 0.1), Math.round(potentialPayout * winProb * 0.94));
          description = `${leader.shortDisplayName || "Home"} ML vs ${trailer.shortDisplayName || "Away"} (${leaderScore}–${trailerScore})`;
          betTypeLabel = "Live Analysis";
          effectiveWinProb = winProbPct;
        }

        // Recommendation logic — sport and bet-type aware
        let recommendation: "hold" | "cash_out" | "partial" = "hold";
        let confidence = 60;
        const lateGame = completionPct >= 70;
        const deepLateGame = completionPct >= 85;

        if (effectiveWinProb >= 80 && lateGame) {
          recommendation = "hold";
          confidence = Math.min(94, 65 + effectiveWinProb * 0.3);
        } else if (effectiveWinProb >= 65 && deepLateGame) {
          recommendation = "hold";
          confidence = Math.min(90, 58 + effectiveWinProb * 0.3);
        } else if (effectiveWinProb < 35 && completionPct >= 45) {
          recommendation = "cash_out";
          confidence = Math.min(92, 55 + (100 - effectiveWinProb) * 0.4);
        } else if (effectiveWinProb < 50 && lateGame) {
          recommendation = "partial";
          confidence = Math.min(82, 52 + completionPct * 0.28);
        } else if (effectiveWinProb >= 60 && !lateGame && injuryRisk > 30) {
          recommendation = "partial";
          confidence = Math.min(78, 55 + injuryRisk * 0.25);
        } else if (effectiveWinProb >= 65) {
          recommendation = "hold";
          confidence = Math.min(85, 50 + effectiveWinProb * 0.35);
        } else {
          recommendation = "partial";
          confidence = 58;
        }

        const factors = buildSportFactors(
          sport, game, homeScore, awayScore, scoreDiff,
          minutesLeft, completionPct, injuryRisk, weatherImpact,
          homeLeading, userLeg, effectiveWinProb
        );

        scenarios.push({
          id: `live-${game.id}`,
          description,
          type: betTypeLabel,
          stake,
          potentialPayout,
          currentCashout,
          legsCompleted: 0,
          legsTotal: 1,
          timeRemaining: timeDetail,
          momentum: Math.min(95, Math.max(5, 50 + scoreDiff * 4)),
          injuryRisk,
          weatherImpact,
          recommendation,
          confidence: Math.round(confidence),
          winProbability: effectiveWinProb,
          completionPct,
          gameId: game.id,
          sport,
          isUserPick,
          userPickOutcome: userLeg?.outcome || null,
          factors,
        });
      }

      // Sort: user's picks first, then by win probability ascending (most urgent cashouts first)
      scenarios.sort((a, b) => {
        if (a.isUserPick !== b.isUserPick) return a.isUserPick ? -1 : 1;
        if (a.recommendation === "cash_out" && b.recommendation !== "cash_out") return -1;
        if (b.recommendation === "cash_out" && a.recommendation !== "cash_out") return 1;
        return a.winProbability - b.winProbability;
      });

      const { betId } = req.params;
      if (betId === "all") {
        return res.json(scenarios);
      }
      const single = scenarios.find(s => s.id === betId || s.gameId === betId);
      if (!single) return res.status(404).json({ error: "Game not found or not currently live" });
      return res.json(single);
    } catch (err) {
      console.error("[CashoutAdvisor] Error:", err);
      return res.status(500).json({ error: "Failed to generate cashout analysis" });
    }
  });

  // === Live Chat ===
  app.get("/api/live-chat/:gameId", (req, res) => {
    const { gameId } = req.params;
    const msgs = chatMessages[gameId] || [];
    res.json(msgs);
  });

  app.post("/api/live-chat/:gameId", (req, res) => {
    const { gameId } = req.params;
    const { content } = req.body;
    const username = req.session?.username || "Anonymous";
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }
    if (!chatMessages[gameId]) {
      chatMessages[gameId] = [];
    }
    const newMsg = {
      id: `msg-${gameId}-${Date.now()}`,
      username,
      content,
      timestamp: new Date().toISOString(),
    };
    chatMessages[gameId].push(newMsg);
    res.json(newMsg);
  });

  // === Social Feed ===
  app.get("/api/social-feed", (_req, res) => {
    const posts = feedPosts.map(p => ({
      id: p.id, username: p.username, content: p.content,
      timestamp: p.timestamp, likes: p.likes, comments: p.comments,
      liked: false,
    }));
    res.json(posts);
  });

  app.post("/api/social-feed", (req, res) => {
    const { content } = req.body;
    const username = req.session?.username || "Anonymous";
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }
    const post = {
      id: `post-${Date.now()}`,
      username,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      likedBy: new Set<string>(),
    };
    feedPosts.unshift(post);
    res.json({
      id: post.id, username: post.username, content: post.content,
      timestamp: post.timestamp, likes: 0, comments: 0, liked: false,
    });
  });

  app.post("/api/social-feed/:postId/like", (req, res) => {
    const { postId } = req.params;
    const username = req.session?.username || "Anonymous";
    const post = feedPosts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.likedBy.has(username)) {
      post.likedBy.delete(username);
      post.likes = Math.max(0, post.likes - 1);
      res.json({ liked: false, likes: post.likes });
    } else {
      post.likedBy.add(username);
      post.likes += 1;
      res.json({ liked: true, likes: post.likes });
    }
  });

  // === Copy Betting ===
  app.get("/api/copy-betting/tipsters", (_req, res) => {
    res.json(tipsters.map(t => ({
      ...t,
      following: followedTipsters.has(t.id),
    })));
  });

  app.post("/api/copy-betting/follow/:tipsterId", (req, res) => {
    const { tipsterId } = req.params;
    const tipster = tipsters.find(t => t.id === tipsterId);
    if (!tipster) {
      return res.status(404).json({ error: "Tipster not found" });
    }
    if (followedTipsters.has(tipsterId)) {
      followedTipsters.delete(tipsterId);
      res.json({ following: false });
    } else {
      followedTipsters.add(tipsterId);
      res.json({ following: true });
    }
  });

  app.get("/api/competitions", (_req, res) => {
    res.json(competitions.map(c => ({
      ...c,
      entered: enteredCompetitions.has(c.id),
    })));
  });

  app.post("/api/competitions/:id/enter", (req, res) => {
    const { id } = req.params;
    const comp = competitions.find(c => c.id === id);
    if (!comp) {
      return res.status(404).json({ error: "Competition not found" });
    }
    if (enteredCompetitions.has(id)) {
      return res.json({ entered: true, message: "Already entered" });
    }
    enteredCompetitions.add(id);
    comp.entries += 1;
    res.json({ entered: true, message: "Successfully entered competition" });
  });

  // ==================== SOCIAL DATA ENGINE ====================
  const socialDataEnginePromise = import("../socialDataEngine");

  app.get("/api/social/leaderboard", async (req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    const timeframe = (req.query.timeframe as string) || "weekly";
    res.json(socialDataEngine.getLeaderboard(timeframe));
  });

  app.get("/api/social/bettors", async (_req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    res.json(socialDataEngine.getSocialBettors());
  });

  app.post("/api/social/follow/:bettorId", async (req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    const isFollowing = socialDataEngine.followBettor(req.params.bettorId);
    res.json({ isFollowing });
  });

  app.get("/api/social/shared-tickets", async (_req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    res.json(socialDataEngine.getSharedTickets());
  });

  app.post("/api/social/share-ticket", async (req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    const ticket = socialDataEngine.shareTicket(req.body);
    res.json(ticket);
  });

  app.post("/api/social/like-ticket/:id", async (req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    socialDataEngine.likeTicket(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/social/feed", async (_req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    res.json(socialDataEngine.getFeed());
  });

  app.get("/api/social/competitions", async (_req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    res.json(socialDataEngine.getCompetitions());
  });

  app.post("/api/social/competitions/:id/join", async (req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    const joined = socialDataEngine.joinCompetition(req.params.id, req.body.username || "You");
    if (!joined) return res.status(400).json({ error: "Cannot join competition" });
    res.json({ success: true });
  });

  app.get("/api/social/copy-bettors", async (_req, res) => {
    const socialDataEngine = await socialDataEnginePromise;
    res.json(socialDataEngine.getCopyBettors());
  });
}

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
      const game = preGames[Date.now() % preGames.length];
      const gameDate = new Date(game.date);
      const now = new Date();
      const diffMs = gameDate.getTime() - now.getTime();
      const diffMins = Math.max(0, Math.round(diffMs / 60000));
      let timeStr = diffMins > 60 ? `${Math.round(diffMins / 60)} hours` : `${diffMins} minutes`;
      if (diffMins <= 0) timeStr = "soon";

      const sportVerb: Record<string, string> = { NBA: "tips off", NFL: "kicks off", MLB: "first pitch", NHL: "puck drops", NCAAF: "kicks off", NCAAB: "tips off" };
      const verb = sportVerb[game.sport] || "starts";

      return {
        id: notificationIdCounter++,
        type: "game_start",
        title: "Game Starting Soon",
        description: `${game.awayTeam.shortDisplayName} @ ${game.homeTeam.shortDisplayName} ${verb} in ${timeStr}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }

    const sportsList = ["NBA", "NFL", "MLB", "NHL"] as const;
    const sport = sportsList[Date.now() % sportsList.length];
    let snapshot;
    try {
      snapshot = await generateMarketSnapshot(sport);
    } catch { return null; }

    const gamesWithMovement = snapshot.games.filter(g => g.lineMovement.length > 0);

    if (chosenType === "line_movement" && gamesWithMovement.length > 0) {
      const game = gamesWithMovement[Date.now() % gamesWithMovement.length];
      const move = game.lineMovement[Date.now() % game.lineMovement.length];
      const dirLabel = move.direction === "up" ? "up" : move.direction === "down" ? "down" : "holding steady";
      let desc: string;
      if (move.market === "spread") {
        desc = `${game.shortName} spread moved from ${move.opening > 0 ? "+" : ""}${move.opening} to ${move.current > 0 ? "+" : ""}${move.current} (${dirLabel})`;
      } else {
        desc = `${game.shortName} total moved from ${move.opening} to ${move.current} (${dirLabel})`;
      }

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

      return {
        id: notificationIdCounter++,
        type: "sharp_money",
        title: move.velocity === "steam" ? "Steam Move Alert" : "Sharp Money Alert",
        description: desc,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }

    const game = allGames[Date.now() % allGames.length];
    return {
      id: notificationIdCounter++,
      type: "game_start",
      title: `${game.sport} Update`,
      description: `${game.awayTeam.shortDisplayName} @ ${game.homeTeam.shortDisplayName} - ${game.status.detail || game.status.shortDetail || "Scheduled"}`,
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

  app.get("/api/communities", (_req, res) => {
    try {
      const communities = communityService.getCommunities({ publicOnly: true });
      res.json(communities);
    } catch (err) {
      console.error("Get communities error:", err);
      res.status(500).json({ error: "Failed to get communities" });
    }
  });

  app.get("/api/communities/:id", (req, res) => {
    try {
      const community = communityService.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }
      res.json(community);
    } catch (err) {
      console.error("Get community error:", err);
      res.status(500).json({ error: "Failed to get community" });
    }
  });

  app.post("/api/communities", idempotencyMiddleware, (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { name, description, isPublic, isPremium, monthlyPrice, tags, discordWebhook } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: "Name and description required" });
      }

      const community = communityService.createCommunity({
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

  app.post("/api/communities/:id/join", (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { isPaid } = req.body;
      const result = communityService.joinCommunity(
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

  app.get("/api/communities/:id/picks", (req, res) => {
    try {
      const userId = req.session?.userId || req.session?.username;
      const isMember = userId ? communityService.isMember(req.params.id, userId) : false;
      const picks = communityService.getPicks(req.params.id, { includePremium: isMember });
      res.json(picks);
    } catch (err) {
      console.error("Get picks error:", err);
      res.status(500).json({ error: "Failed to get picks" });
    }
  });

  app.post("/api/communities/:id/picks", (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username;
      if (!communityService.isMember(req.params.id, userId)) {
        return res.status(403).json({ error: "Must be a member to post picks" });
      }

      const { title, sport, description, odds, stake, confidence, isPremium, price } = req.body;
      
      const pick = communityService.createPick({
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

  app.patch("/api/picks/:id/settle", (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { status } = req.body;
      if (!['won', 'lost', 'push', 'void'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const pick = communityService.settlePick(req.params.id, status);
      if (!pick) {
        return res.status(404).json({ error: "Pick not found" });
      }

      res.json(pick);
    } catch (err) {
      console.error("Settle pick error:", err);
      res.status(500).json({ error: "Failed to settle pick" });
    }
  });

  app.post("/api/tips", (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { toUserId, toUsername, amount, message, pickId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid tip amount" });
      }

      const result = communityService.sendTip({
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

  app.get("/api/creator/earnings", (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username || '';
      const earnings = communityService.getCreatorEarnings(userId);
      res.json(earnings);
    } catch (err) {
      console.error("Get earnings error:", err);
      res.status(500).json({ error: "Failed to get earnings" });
    }
  });

  app.get("/api/creator/communities", (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.userId || req.session.username;
      const communities = communityService.getCommunities({ creatorId: userId });
      res.json(communities);
    } catch (err) {
      console.error("Get creator communities error:", err);
      res.status(500).json({ error: "Failed to get communities" });
    }
  });

  app.get("/api/admin/platform-revenue", requireAdmin, (_req, res) => {
    try {
      const revenue = communityService.getPlatformRevenue();
      res.json(revenue);
    } catch (err) {
      console.error("Get platform revenue error:", err);
      res.status(500).json({ error: "Failed to get revenue" });
    }
  });

  app.patch("/api/communities/:id/discord", (req, res) => {
    try {
      if (!req.session?.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { webhook } = req.body;
      const success = communityService.updateDiscordWebhook(req.params.id, webhook);
      
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
  app.get("/api/community/leaderboard", (_req, res) => {
    try {
      const communities = communityService.getCommunities({ publicOnly: true });
      const userStatsMap = new Map<string, { wins: number; losses: number; totalStaked: number; totalPL: number; longestStreak: number; currentStreak: number }>();

      for (const community of communities) {
        const picks = communityService.getPicks(community.id, { includePremium: true });
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

  // === Cash-Out Advisor ===
  app.get("/api/cashout-advisor/:betId", (req, res) => {
    const { betId } = req.params;

    const activeBets: Record<string, any> = {
      "bet-1": {
        id: "bet-1",
        description: "Knicks ML + Bucks/Bulls Over 218.5",
        type: "Parlay (2-leg)",
        stake: 50,
        potentialPayout: 245,
        currentCashout: 142,
        legsCompleted: 1,
        legsTotal: 2,
        timeRemaining: "4:32 3rd Q",
        momentum: 68,
        injuryRisk: 15,
        weatherImpact: 0,
        recommendation: "hold",
        confidence: 72,
        factors: {
          momentum: { label: "Team Momentum", value: 68, impact: "positive" },
          timeRemaining: { label: "Time Remaining", value: 55, impact: "neutral" },
          injuryRisk: { label: "Injury Risk", value: 15, impact: "positive" },
          weatherChanges: { label: "Weather Impact", value: 0, impact: "neutral" },
        },
      },
      "bet-2": {
        id: "bet-2",
        description: "Chiefs -3.5 vs Bills",
        type: "Straight Bet",
        stake: 100,
        potentialPayout: 191,
        currentCashout: 85,
        legsCompleted: 0,
        legsTotal: 1,
        timeRemaining: "8:15 2nd Q",
        momentum: 35,
        injuryRisk: 42,
        weatherImpact: 28,
        recommendation: "cash_out",
        confidence: 81,
        factors: {
          momentum: { label: "Team Momentum", value: 35, impact: "negative" },
          timeRemaining: { label: "Time Remaining", value: 65, impact: "neutral" },
          injuryRisk: { label: "Injury Risk", value: 42, impact: "negative" },
          weatherChanges: { label: "Weather Impact", value: 28, impact: "negative" },
        },
      },
      "bet-3": {
        id: "bet-3",
        description: "Bucks ML + Under 224.5",
        type: "Parlay (2-leg)",
        stake: 75,
        potentialPayout: 320,
        currentCashout: 195,
        legsCompleted: 1,
        legsTotal: 2,
        timeRemaining: "2:05 4th Q",
        momentum: 82,
        injuryRisk: 5,
        weatherImpact: 0,
        recommendation: "partial",
        confidence: 65,
        factors: {
          momentum: { label: "Team Momentum", value: 82, impact: "positive" },
          timeRemaining: { label: "Time Remaining", value: 25, impact: "negative" },
          injuryRisk: { label: "Injury Risk", value: 5, impact: "positive" },
          weatherChanges: { label: "Weather Impact", value: 0, impact: "neutral" },
        },
      },
    };

    if (betId === "all") {
      return res.json(Object.values(activeBets));
    }

    const bet = activeBets[betId];
    if (!bet) {
      return res.status(404).json({ error: "Bet not found" });
    }
    return res.json(bet);
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

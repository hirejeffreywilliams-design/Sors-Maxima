import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { requireAdmin, getClientIp, idempotencyMiddleware, creditUsageTracker } from "./helpers";
import { stripeService } from "../stripeService";
import { WebhookHandlers } from "../webhookHandlers";
import * as featuresService from "../featuresService";
import { generateVegasPredictions, getVegasInsights } from "../vegas-engine";
import { sports } from "@shared/schema";

const ticketOutcomes: Map<string, { ticketId: string; predictedProb: number; consensusProb: number; evPercent: number; actualOutcome: "win" | "loss" | "push" | "pending"; profitLoss: number; isFollowedByUser: boolean; settledAt?: string }> = new Map();

const utmEvents: Array<{ source: string; medium: string; campaign: string; content?: string; term?: string; timestamp: string; ip: string }> = [];

const watchlistStore = new Map<string, { id: string; type: string; name: string; sport: string; details: string; addedAt: string; alerts: boolean }[]>();

export async function registerAccountRoutes(app: Express): Promise<void> {

  app.get("/api/vegas/predictions", async (req, res) => {
    try {
      const sport = req.query.sport as string | undefined;
      const validSport = sport && sports.includes(sport as any) ? sport as any : undefined;
      
      const predictions = await generateVegasPredictions(validSport);
      const insights = await getVegasInsights();
      
      return res.json({
        predictions,
        insights,
        timestamp: new Date().toISOString(),
        source: "Vegas Modeling Engine v2.0",
      });
    } catch (err) {
      console.error("Vegas predictions error:", err);
      return res.status(500).json({
        error: "Failed to generate Vegas predictions",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const rawBody = req.rawBody as Buffer;
      
      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        return res.status(400).json({ error: "Missing raw body for webhook" });
      }
      
      await WebhookHandlers.processWebhook(rawBody, sig);
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(400).json({ 
        error: "Webhook processing failed",
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const isAvailable = await stripeService.isAvailable();
      if (!isAvailable) {
        return res.json({ 
          publishableKey: null, 
          demoMode: true,
          message: "Stripe is running in demo mode. Payment processing is disabled." 
        });
      }
      const key = await stripeService.getPublishableKey();
      res.json({ publishableKey: key, demoMode: false });
    } catch (err) {
      console.error("Failed to get publishable key:", err);
      res.json({ 
        publishableKey: null, 
        demoMode: true,
        message: "Stripe is running in demo mode. Payment processing is disabled." 
      });
    }
  });

  app.get("/api/subscription", (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.json({ tier: 'none', status: 'none' });
    }
    
    const subscription = stripeService.getUserSubscription(req.session.username);
    const trialStatus = stripeService.getTrialStatus(req.session.username);
    
    res.json({
      tier: subscription.subscriptionTier,
      status: subscription.subscriptionStatus,
      customerId: subscription.stripeCustomerId,
      trial: trialStatus,
    });
  });

  app.get("/api/trial/status", (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.json({ isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none' });
    }
    
    const trialStatus = stripeService.getTrialStatus(req.session.username);
    res.json(trialStatus);
  });

  app.post("/api/trial/start", (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const trialStatus = stripeService.getTrialStatus(req.session.username);
    if (trialStatus.hadTrial) {
      return res.status(400).json({ error: "Trial already used or expired" });
    }
    
    const subscription = stripeService.startTrial(req.session.username);
    if (!subscription) {
      return res.status(400).json({ error: "Unable to start trial" });
    }
    
    res.json({ 
      success: true, 
      trial: stripeService.getTrialStatus(req.session.username),
      subscription,
    });
  });

  app.post("/api/stripe/checkout", idempotencyMiddleware, async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const username = req.session.username;
      let subscription = stripeService.getUserSubscription(username);
      
      let customerId = subscription.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(
          `${username}@sorsmaxima.com`,
          username
        );
        customerId = customer.id;
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/pricing?success=true`,
        `${baseUrl}/pricing?cancelled=true`
      );

      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.username) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const subscription = stripeService.getUserSubscription(req.session.username);
      if (!subscription.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeService.createCustomerPortalSession(
        subscription.stripeCustomerId,
        `${baseUrl}/pricing`
      );

      res.json({ url: session.url });
    } catch (err) {
      console.error("Portal error:", err);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ===== Bankroll Alerts =====
  app.get("/api/bankroll/alerts", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const alerts = await featuresService.getUserBankrollAlerts(parseInt(req.session.userId));
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  app.post("/api/bankroll/alerts", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const alert = await featuresService.createBankrollAlert({
        userId: parseInt(req.session.userId),
        ...req.body
      });
      res.json(alert);
    } catch (err) {
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.put("/api/bankroll/alerts/:id", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const alert = await featuresService.updateBankrollAlert(parseInt(req.params.id), req.body);
      res.json(alert);
    } catch (err) {
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.delete("/api/bankroll/alerts/:id", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      await featuresService.deleteBankrollAlert(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Bet History & Grading
  app.get("/api/bets/history", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const history = await featuresService.getUserBetHistory(parseInt(req.session.userId));
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: "Failed to get bet history" });
    }
  });

  app.post("/api/bets/record", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const bet = await featuresService.recordBet({
        userId: parseInt(req.session.userId),
        ...req.body
      });
      res.json(bet);
    } catch (err) {
      res.status(500).json({ error: "Failed to record bet" });
    }
  });

  app.post("/api/bets/:id/settle", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { result, actualPayout } = req.body;
      const bet = await featuresService.settleBet(parseInt(req.params.id), result, actualPayout);
      res.json(bet);
    } catch (err) {
      res.status(500).json({ error: "Failed to settle bet" });
    }
  });

  app.post("/api/tickets/:id/outcome", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { actualOutcome, profitLoss, predictedProb, consensusProb, evPercent } = req.body;
      if (!["win", "loss", "push"].includes(actualOutcome)) {
        return res.status(400).json({ error: "Invalid outcome. Must be win, loss, or push" });
      }
      const record = {
        ticketId: req.params.id,
        predictedProb: predictedProb || 0,
        consensusProb: consensusProb || 0,
        evPercent: evPercent || 0,
        actualOutcome,
        profitLoss: profitLoss || 0,
        isFollowedByUser: true,
        settledAt: new Date().toISOString(),
      };
      ticketOutcomes.set(req.params.id, record);
      res.json({ success: true, record });
    } catch (err) {
      res.status(500).json({ error: "Failed to record outcome" });
    }
  });

  app.get("/api/tickets/outcomes", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const outcomes = Array.from(ticketOutcomes.values());
    const totalBets = outcomes.length;
    const wins = outcomes.filter(o => o.actualOutcome === "win").length;
    const totalPL = outcomes.reduce((sum, o) => sum + o.profitLoss, 0);
    const avgPredicted = outcomes.length > 0 ? outcomes.reduce((sum, o) => sum + o.predictedProb, 0) / outcomes.length : 0;
    const actualHitRate = totalBets > 0 ? wins / totalBets : 0;
    res.json({
      outcomes,
      summary: {
        totalBets,
        wins,
        losses: outcomes.filter(o => o.actualOutcome === "loss").length,
        pushes: outcomes.filter(o => o.actualOutcome === "push").length,
        totalProfitLoss: Math.round(totalPL * 100) / 100,
        hitRate: Math.round(actualHitRate * 1000) / 1000,
        avgPredictedProb: Math.round(avgPredicted * 1000) / 1000,
        calibrationGap: Math.round(Math.abs(actualHitRate - avgPredicted) * 1000) / 1000,
      },
    });
  });

  app.get("/api/bets/grading-stats", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const stats = await featuresService.getBetGradingStats(parseInt(req.session.userId));
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "Failed to get grading stats" });
    }
  });

  // User Analytics
  app.get("/api/analytics", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const analytics = await featuresService.getUserAnalytics(parseInt(req.session.userId));
      res.json(analytics);
    } catch (err) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Notification Preferences
  app.get("/api/notifications/preferences", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const prefs = await featuresService.getNotificationPreferences(parseInt(req.session.userId));
      res.json(prefs);
    } catch (err) {
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/notifications/preferences", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const prefs = await featuresService.updateNotificationPreferences(
        parseInt(req.session.userId),
        req.body
      );
      res.json(prefs);
    } catch (err) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Sportsbook Accounts (Multi-book tracking)
  app.get("/api/sportsbooks", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const accounts = await featuresService.getUserSportsbookAccounts(parseInt(req.session.userId));
      res.json(accounts);
    } catch (err) {
      res.status(500).json({ error: "Failed to get sportsbook accounts" });
    }
  });

  app.post("/api/sportsbooks", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const account = await featuresService.addSportsbookAccount({
        userId: parseInt(req.session.userId),
        ...req.body
      });
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: "Failed to add sportsbook account" });
    }
  });

  app.put("/api/sportsbooks/:id", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const account = await featuresService.updateSportsbookAccount(parseInt(req.params.id), req.body);
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: "Failed to update sportsbook account" });
    }
  });

  app.delete("/api/sportsbooks/:id", async (req, res) => {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      await featuresService.deleteSportsbookAccount(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete sportsbook account" });
    }
  });

  app.get("/api/sportsbooks/total-bankroll", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const total = await featuresService.getTotalBankroll(parseInt(req.session.userId));
      res.json({ total });
    } catch (err) {
      res.status(500).json({ error: "Failed to get total bankroll" });
    }
  });

  // Responsible Gaming
  app.get("/api/responsible-gaming", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const settings = await featuresService.getResponsibleGamingSettings(parseInt(req.session.userId));
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.put("/api/responsible-gaming", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const settings = await featuresService.updateResponsibleGamingSettings(
        parseInt(req.session.userId),
        req.body
      );
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.post("/api/responsible-gaming/cool-off", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { days } = req.body;
      const result = await featuresService.startCoolOffPeriod(parseInt(req.session.userId), days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to start cool-off period" });
    }
  });

  app.post("/api/responsible-gaming/self-exclusion", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { months } = req.body;
      const result = await featuresService.startSelfExclusion(parseInt(req.session.userId), months);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to start self-exclusion" });
    }
  });

  app.get("/api/responsible-gaming/can-bet", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const result = await featuresService.checkUserCanBet(parseInt(req.session.userId));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to check betting status" });
    }
  });

  // Bet Backup & Recovery
  app.get("/api/backups", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const backups = await featuresService.getUserBackups(parseInt(req.session.userId));
      res.json(backups);
    } catch (err) {
      res.status(500).json({ error: "Failed to get backups" });
    }
  });

  app.post("/api/backups", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const backup = await featuresService.createBetBackup(
        parseInt(req.session.userId),
        req.body.type || "manual"
      );
      res.json(backup);
    } catch (err) {
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/backups/:id/restore", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const data = await featuresService.restoreFromBackup(
        parseInt(req.session.userId),
        parseInt(req.params.id)
      );
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  // Tax Records
  app.get("/api/tax/:year", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const record = await featuresService.getTaxRecord(
        parseInt(req.session.userId),
        parseInt(req.params.year)
      );
      res.json(record || { message: "No tax record found for this year" });
    } catch (err) {
      res.status(500).json({ error: "Failed to get tax record" });
    }
  });

  app.post("/api/tax/:year/generate", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const report = await featuresService.generateTaxReport(
        parseInt(req.session.userId),
        parseInt(req.params.year)
      );
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate tax report" });
    }
  });

  // Bet Slip Export
  app.post("/api/bet-slip/export", async (req, res) => {
    try {
      const { legs, stake, sportsbook } = req.body;
      const slip = await featuresService.exportBetSlip(legs, stake, sportsbook);
      res.json(slip);
    } catch (err) {
      res.status(500).json({ error: "Failed to export bet slip" });
    }
  });

  // === UTM Attribution Tracking ===
  app.post("/api/utm/track", (req, res) => {
    try {
      const { source, medium, campaign, content, term } = req.body;
      if (!source && !medium && !campaign) {
        return res.status(400).json({ error: "At least one UTM parameter required" });
      }
      utmEvents.push({
        source: source || "(direct)",
        medium: medium || "(none)",
        campaign: campaign || "(none)",
        content: content || undefined,
        term: term || undefined,
        timestamp: new Date().toISOString(),
        ip: getClientIp(req),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to track UTM data" });
    }
  });

  app.get("/api/admin/utm/stats", requireAdmin, (_req, res) => {
    try {
      const bySource: Record<string, number> = {};
      const byMedium: Record<string, number> = {};
      const byCampaign: Record<string, number> = {};
      utmEvents.forEach((e) => {
        bySource[e.source] = (bySource[e.source] || 0) + 1;
        byMedium[e.medium] = (byMedium[e.medium] || 0) + 1;
        byCampaign[e.campaign] = (byCampaign[e.campaign] || 0) + 1;
      });
      res.json({
        total: utmEvents.length,
        bySource,
        byMedium,
        byCampaign,
        recent: utmEvents.slice(-20).reverse(),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch UTM stats" });
    }
  });

  // === AI Credits ===
  app.get("/api/credits", (_req, res) => {
    const username = _req.session?.isAuthenticated ? _req.session.username : null;
    let tier = "free";
    if (username) {
      const subscription = stripeService.getUserSubscription(username);
      tier = subscription.subscriptionTier || "free";
    }
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const creditLimits: Record<string, number> = { free: 5, pro: 50, elite: 300, whale: 9999 };
    const total = creditLimits[tier] || 5;

    const dayKey = now.toISOString().slice(0, 10);
    const usageKey = `credits:${username || 'anon'}:${dayKey}`;
    const used = creditUsageTracker.get(usageKey) || 0;

    res.json({
      used,
      total,
      tier,
      resetsAt: tomorrow.toISOString(),
    });
  });

  // === Referral Program ===
  app.get("/api/referral", (_req, res) => {
    const username = _req.session?.isAuthenticated ? _req.session.username : "anon";
    const code = `SORS-${username?.toUpperCase().slice(0, 4) || "ANON"}${crypto.createHash('md5').update(username || 'anon').digest('hex').slice(0, 4).toUpperCase()}`;
    res.json({
      code,
      totalReferrals: 0,
      conversions: 0,
      earned: 0,
      referrals: [],
    });
  });

  // ==================== WATCHLIST ENGINE ====================
  app.get("/api/user/watchlist", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(watchlistStore.get(userId) || []);
  });

  app.post("/api/user/watchlist", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { type, name, sport } = req.body;
    if (!type || !name || !sport) return res.status(400).json({ error: "type, name, and sport are required" });

    const items = watchlistStore.get(userId) || [];
    const existing = items.find(i => i.type === type && i.name === name && i.sport === sport);
    if (existing) return res.status(409).json({ error: "Already in watchlist" });

    const newItem = {
      id: `wl-${crypto.randomUUID()}`,
      type, name, sport,
      details: "",
      addedAt: new Date().toISOString(),
      alerts: true,
    };
    items.push(newItem);
    watchlistStore.set(userId, items);
    res.json(newItem);
  });

  app.delete("/api/user/watchlist/:id", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const items = watchlistStore.get(userId) || [];
    const filtered = items.filter(i => i.id !== req.params.id);
    watchlistStore.set(userId, filtered);
    res.json({ success: true });
  });

  app.patch("/api/user/watchlist/:id/alerts", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const items = watchlistStore.get(userId) || [];
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    item.alerts = !item.alerts;
    watchlistStore.set(userId, items);
    res.json(item);
  });

  app.get("/api/user/watchlist/live", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const items = watchlistStore.get(userId) || [];
    const teamNames = items.filter(i => i.type === "team").map(i => i.name.toLowerCase());
    if (teamNames.length === 0) return res.json([]);

    try {
      const { getAllSportsScoreboard } = await import("../espn-scoreboard-provider");
      const allGames = await getAllSportsScoreboard();
      const matchingGames = allGames.filter(g =>
        teamNames.some(t =>
          g.homeTeam.displayName.toLowerCase().includes(t) ||
          g.awayTeam.displayName.toLowerCase().includes(t) ||
          g.homeTeam.shortDisplayName.toLowerCase().includes(t) ||
          g.awayTeam.shortDisplayName.toLowerCase().includes(t)
        )
      ).map(g => ({
        id: g.id,
        name: g.name,
        sport: g.sport,
        homeTeam: g.homeTeam.displayName,
        awayTeam: g.awayTeam.displayName,
        date: g.date,
        status: g.status.state,
        homeScore: g.homeTeam.score,
        awayScore: g.awayTeam.score,
      }));
      res.json(matchingGames);
    } catch (error) {
      res.json([]);
    }
  });

  // ==================== USER DATA ENGINE (Bet Tracking, Finance, Gamification) ====================
  const userDataEngine = await import("../userDataEngine");

  app.get("/api/user/bets", (_req, res) => {
    res.json(userDataEngine.getBets());
  });

  app.post("/api/user/bets", (req, res) => {
    try {
      const bet = userDataEngine.addBet(req.body);
      res.json(bet);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/user/bets/:id", (req, res) => {
    const bet = userDataEngine.updateBet(req.params.id, req.body);
    if (!bet) return res.status(404).json({ error: "Bet not found" });
    res.json(bet);
  });

  app.delete("/api/user/bets/:id", (req, res) => {
    const deleted = userDataEngine.deleteBet(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Bet not found" });
    res.json({ success: true });
  });

  app.get("/api/user/bet-stats", (_req, res) => {
    res.json(userDataEngine.getBetStats());
  });

  app.get("/api/user/tax-summary", (_req, res) => {
    res.json(userDataEngine.getTaxSummary());
  });

  app.get("/api/user/sportsbooks", (_req, res) => {
    res.json(userDataEngine.getSportsbooks());
  });

  app.patch("/api/user/sportsbooks/:id", (req, res) => {
    const book = userDataEngine.updateSportsbook(req.params.id, req.body);
    if (!book) return res.status(404).json({ error: "Sportsbook not found" });
    res.json(book);
  });

  app.post("/api/user/sportsbooks", (req, res) => {
    const book = userDataEngine.addSportsbook(req.body.name || "New Book");
    res.json(book);
  });

  app.get("/api/user/achievements", (_req, res) => {
    res.json(userDataEngine.getAchievements());
  });

  app.get("/api/user/challenges", (_req, res) => {
    res.json(userDataEngine.getChallenges());
  });

  app.post("/api/user/challenges/action", (req, res) => {
    userDataEngine.triggerChallengeAction(req.body.action, req.body.sport);
    res.json({ success: true });
  });

  app.get("/api/user/streak", (_req, res) => {
    res.json(userDataEngine.getStreakData());
  });

  app.get("/api/user/personalized-insights", async (_req, res) => {
    try {
      const { getPersonalizedInsights } = await import("../personalizedInsightsEngine");
      const insights = await getPersonalizedInsights();
      res.json(insights);
    } catch (err) {
      console.error("[PersonalizedInsights] Error:", err);
      res.status(500).json({ error: "Failed to generate personalized insights" });
    }
  });

  app.get("/api/user/paper-account", (_req, res) => {
    res.json(userDataEngine.getPaperAccount());
  });

  app.get("/api/user/paper-bets", (_req, res) => {
    res.json(userDataEngine.getPaperBets());
  });

  app.post("/api/user/paper-bets", (req, res) => {
    const bet = userDataEngine.placePaperBet(req.body);
    if (!bet) return res.status(400).json({ error: "Insufficient paper balance" });
    res.json(bet);
  });

  app.patch("/api/user/paper-bets/:id/resolve", (req, res) => {
    const bet = userDataEngine.resolvePaperBet(req.params.id, req.body.result);
    if (!bet) return res.status(404).json({ error: "Bet not found or already resolved" });
    res.json(bet);
  });

  app.get("/api/user/alerts", (_req, res) => {
    res.json(userDataEngine.getAlerts());
  });

  app.post("/api/user/alerts", (req, res) => {
    const alert = userDataEngine.addAlert(req.body);
    res.json(alert);
  });

  app.delete("/api/user/alerts/:id", (req, res) => {
    const deleted = userDataEngine.deleteAlert(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Alert not found" });
    res.json({ success: true });
  });

  app.patch("/api/user/alerts/:id/toggle", (req, res) => {
    const alert = userDataEngine.toggleAlert(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  });
}

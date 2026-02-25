import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { requireAdmin, requireAuth, requireTier, getClientIp, idempotencyMiddleware, rateLimitByTier } from "./helpers";
import { stripeService } from "../stripeService";
import { WebhookHandlers } from "../webhookHandlers";
import * as featuresService from "../featuresService";
import { generateVegasPredictions, getVegasInsights } from "../vegas-engine";
import { sports } from "@shared/schema";
import { db } from "../db";
import { sql } from "drizzle-orm";

const ticketOutcomes: Map<string, { ticketId: string; predictedProb: number; consensusProb: number; evPercent: number; actualOutcome: "win" | "loss" | "push" | "pending"; profitLoss: number; isFollowedByUser: boolean; settledAt?: string }> = new Map();

const utmEvents: Array<{ source: string; medium: string; campaign: string; content?: string; term?: string; timestamp: string; ip: string }> = [];

export async function registerAccountRoutes(app: Express): Promise<void> {

  app.get("/api/vegas/predictions", requireTier("pro", "elite", "whale"), async (req, res) => {
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

  app.get("/api/subscription", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.json({ tier: 'none', status: 'none' });
    }
    
    const subscription = await stripeService.getUserSubscription(req.session.username);
    const trialStatus = await stripeService.getTrialStatus(req.session.username);
    
    res.json({
      tier: subscription.subscriptionTier,
      status: subscription.subscriptionStatus,
      customerId: subscription.stripeCustomerId,
      trial: trialStatus,
    });
  });

  app.get("/api/trial/status", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.json({ isOnTrial: false, daysRemaining: 0, trialExpired: false, trialTier: 'none' });
    }
    
    const trialStatus = await stripeService.getTrialStatus(req.session.username);
    res.json(trialStatus);
  });

  app.post("/api/trial/start", async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const trialStatus = await stripeService.getTrialStatus(req.session.username);
    if (trialStatus.hadTrial) {
      return res.status(400).json({ error: "Trial already used or expired" });
    }
    
    const subscription = await stripeService.startTrial(req.session.username);
    if (!subscription) {
      return res.status(400).json({ error: "Unable to start trial" });
    }
    
    res.json({ 
      success: true, 
      trial: await stripeService.getTrialStatus(req.session.username),
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
      let subscription = await stripeService.getUserSubscription(username);
      
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

      const subscription = await stripeService.getUserSubscription(req.session.username);
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

  // === Subscription Tier Info ===
  app.get("/api/credits", async (_req, res) => {
    const username = _req.session?.isAuthenticated ? _req.session.username : null;
    let tier = "free";
    if (username) {
      const subscription = await stripeService.getUserSubscription(username);
      tier = subscription.subscriptionTier || "free";
    }
    const tierFeatures: Record<string, string> = {
      free: "Guest preview — limited access",
      pro: "Sharp member — unrestricted engine access",
      elite: "Edge member — full arsenal, unrestricted",
      whale: "Max member — zero restrictions, first-in-line processing",
    };
    res.json({
      tier,
      access: tierFeatures[tier] || tierFeatures.free,
      unlimited: true,
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

  // ==================== WATCHLIST ENGINE (DB-backed) ====================
  app.get("/api/user/watchlist", requireAuth, async (req, res) => {
    const userId = req.session?.username;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const rows = await db.execute(sql`SELECT id, item_type as type, item_name as name, sport, details, added_at as "addedAt", alerts FROM user_watchlist WHERE user_id = ${userId} ORDER BY added_at DESC`);
      res.json(rows.rows || []);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/user/watchlist", requireAuth, async (req, res) => {
    const userId = req.session?.username;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { type, name, sport } = req.body;
    if (!type || !name || !sport) return res.status(400).json({ error: "type, name, and sport are required" });
    const validTypes = ["team", "game", "player"];
    if (!validTypes.includes(type)) return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    try {
      const existing = await db.execute(sql`SELECT id FROM user_watchlist WHERE user_id = ${userId} AND item_type = ${type} AND item_name = ${name} AND sport = ${sport}`);
      if (existing.rows.length > 0) return res.status(409).json({ error: "Already in watchlist" });
      const result = await db.execute(sql`INSERT INTO user_watchlist (user_id, item_type, item_name, sport, details, alerts) VALUES (${userId}, ${type}, ${name}, ${sport}, ${""},  ${true}) RETURNING id, item_type as type, item_name as name, sport, details, added_at as "addedAt", alerts`);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/user/watchlist/:id", requireAuth, async (req, res) => {
    const userId = req.session?.username;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const itemId = parseInt(req.params.id);
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: "Invalid watchlist item ID" });
    try {
      await db.execute(sql`DELETE FROM user_watchlist WHERE id = ${itemId} AND user_id = ${userId}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete from watchlist" });
    }
  });

  app.patch("/api/user/watchlist/:id/alerts", requireAuth, async (req, res) => {
    const userId = req.session?.username;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const itemId = parseInt(req.params.id);
    if (!Number.isFinite(itemId)) return res.status(400).json({ error: "Invalid watchlist item ID" });
    try {
      const result = await db.execute(sql`UPDATE user_watchlist SET alerts = NOT alerts WHERE id = ${itemId} AND user_id = ${userId} RETURNING id, item_type as type, item_name as name, sport, details, added_at as "addedAt", alerts`);
      if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.get("/api/user/watchlist/live", requireAuth, async (req, res) => {
    const userId = req.session?.username;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const rows = await db.execute(sql`SELECT item_name as name, item_type as type FROM user_watchlist WHERE user_id = ${userId} AND item_type = 'team'`);
      const teamNames = (rows.rows || []).map((r: any) => r.name.toLowerCase());
      if (teamNames.length === 0) return res.json([]);

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

  // ==================== BETTING PROFILE (DB-backed) ====================
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_betting_profile (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      risk_tolerance TEXT NOT NULL DEFAULT 'moderate',
      preferred_bet_types TEXT[] NOT NULL DEFAULT '{}',
      bankroll_strategy TEXT NOT NULL DEFAULT 'flat',
      bet_frequency TEXT NOT NULL DEFAULT '1-2',
      favorite_teams TEXT[] NOT NULL DEFAULT '{}',
      favorite_leagues TEXT[] NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  app.get("/api/user/betting-profile", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId!);
    try {
      const result = await db.execute(sql`SELECT * FROM user_betting_profile WHERE user_id = ${userId}`);
      if (result.rows.length === 0) {
        return res.json({
          riskTolerance: "moderate",
          preferredBetTypes: [],
          bankrollStrategy: "flat",
          betFrequency: "1-2",
          favoriteTeams: [],
          favoriteLeagues: [],
        });
      }
      const row = result.rows[0] as any;
      res.json({
        riskTolerance: row.risk_tolerance,
        preferredBetTypes: row.preferred_bet_types || [],
        bankrollStrategy: row.bankroll_strategy,
        betFrequency: row.bet_frequency,
        favoriteTeams: row.favorite_teams || [],
        favoriteLeagues: row.favorite_leagues || [],
      });
    } catch (err) {
      console.error("Failed to get betting profile:", err);
      res.status(500).json({ error: "Failed to get betting profile" });
    }
  });

  app.post("/api/user/betting-profile", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId!);
    const { riskTolerance, preferredBetTypes, bankrollStrategy, betFrequency, favoriteTeams, favoriteLeagues } = req.body;
    try {
      const result = await db.execute(sql`
        INSERT INTO user_betting_profile (user_id, risk_tolerance, preferred_bet_types, bankroll_strategy, bet_frequency, favorite_teams, favorite_leagues, updated_at)
        VALUES (${userId}, ${riskTolerance || 'moderate'}, ${preferredBetTypes || []}, ${bankrollStrategy || 'flat'}, ${betFrequency || '1-2'}, ${favoriteTeams || []}, ${favoriteLeagues || []}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          risk_tolerance = EXCLUDED.risk_tolerance,
          preferred_bet_types = EXCLUDED.preferred_bet_types,
          bankroll_strategy = EXCLUDED.bankroll_strategy,
          bet_frequency = EXCLUDED.bet_frequency,
          favorite_teams = EXCLUDED.favorite_teams,
          favorite_leagues = EXCLUDED.favorite_leagues,
          updated_at = NOW()
        RETURNING *
      `);
      const row = result.rows[0] as any;
      res.json({
        riskTolerance: row.risk_tolerance,
        preferredBetTypes: row.preferred_bet_types || [],
        bankrollStrategy: row.bankroll_strategy,
        betFrequency: row.bet_frequency,
        favoriteTeams: row.favorite_teams || [],
        favoriteLeagues: row.favorite_leagues || [],
      });
    } catch (err) {
      console.error("Failed to save betting profile:", err);
      res.status(500).json({ error: "Failed to save betting profile" });
    }
  });

  // ==================== TICKET HISTORY (DB-backed) ====================
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ticket_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ticket_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      legs JSONB NOT NULL DEFAULT '[]',
      total_odds REAL NOT NULL,
      american_odds INTEGER NOT NULL,
      recommended_stake REAL NOT NULL,
      potential_payout REAL NOT NULL,
      grade TEXT NOT NULL DEFAULT 'C',
      saved_at TIMESTAMP DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'pending',
      settled_at TIMESTAMP,
      actual_pl REAL
    );
  `);

  app.get("/api/user/ticket-history", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId || "0");
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const result = await db.execute(sql`
        SELECT id, ticket_id, name, sport, legs, total_odds, american_odds,
               recommended_stake, potential_payout, grade, saved_at, status,
               settled_at, actual_pl
        FROM ticket_history
        WHERE user_id = ${userId}
        ORDER BY saved_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Failed to fetch ticket history:", err);
      res.status(500).json({ error: "Failed to fetch ticket history" });
    }
  });

  app.post("/api/user/ticket-history", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId || "0");
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { ticketId, name, sport, legs, totalOdds, americanOdds, recommendedStake, potentialPayout, grade } = req.body;
      if (!ticketId || !name || !sport) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await db.execute(sql`
        INSERT INTO ticket_history (user_id, ticket_id, name, sport, legs, total_odds, american_odds, recommended_stake, potential_payout, grade)
        VALUES (${userId}, ${ticketId}, ${name}, ${sport}, ${JSON.stringify(legs || [])}, ${totalOdds || 0}, ${americanOdds || 0}, ${recommendedStake || 0}, ${potentialPayout || 0}, ${grade || 'C'})
        RETURNING id, ticket_id, name, sport, legs, total_odds, american_odds, recommended_stake, potential_payout, grade, saved_at, status, settled_at, actual_pl
      `);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Failed to save ticket:", err);
      res.status(500).json({ error: "Failed to save ticket" });
    }
  });

  app.patch("/api/user/ticket-history/:id", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId || "0");
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const ticketDbId = parseInt(req.params.id);
    if (!Number.isFinite(ticketDbId)) return res.status(400).json({ error: "Invalid ticket ID" });
    try {
      const { status, actualPL } = req.body;
      const settledAt = status && status !== "pending" ? new Date() : null;
      const result = await db.execute(sql`
        UPDATE ticket_history
        SET status = COALESCE(${status}, status),
            actual_pl = COALESCE(${actualPL ?? null}, actual_pl),
            settled_at = COALESCE(${settledAt}, settled_at)
        WHERE id = ${ticketDbId} AND user_id = ${userId}
        RETURNING id, ticket_id, name, sport, legs, total_odds, american_odds, recommended_stake, potential_payout, grade, saved_at, status, settled_at, actual_pl
      `);
      if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Failed to update ticket:", err);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.delete("/api/user/ticket-history/:id", requireAuth, async (req, res) => {
    const userId = parseInt(req.session!.userId || "0");
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const ticketDbId = parseInt(req.params.id);
    if (!Number.isFinite(ticketDbId)) return res.status(400).json({ error: "Invalid ticket ID" });
    try {
      await db.execute(sql`DELETE FROM ticket_history WHERE id = ${ticketDbId} AND user_id = ${userId}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  // ==================== CLV PICK TRACKER ====================
  app.post("/api/user/picks", requireAuth, async (req, res) => {
    try {
      const username = req.session!.username;
      const { sport, gameId, pick, betType, oddsAtPick } = req.body;
      if (!sport || !gameId || !pick || !betType || oddsAtPick === undefined) {
        return res.status(400).json({ error: "Missing required fields: sport, gameId, pick, betType, oddsAtPick" });
      }
      const result = await db.execute(sql`
        INSERT INTO user_picks (username, sport, game_id, pick, bet_type, odds_at_pick)
        VALUES (${username}, ${sport}, ${gameId}, ${pick}, ${betType}, ${oddsAtPick})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Failed to save pick:", err);
      res.status(500).json({ error: "Failed to save pick" });
    }
  });

  app.get("/api/user/picks", requireAuth, async (req, res) => {
    try {
      const username = req.session!.username;
      const result = await db.execute(sql`
        SELECT * FROM user_picks
        WHERE username = ${username}
        ORDER BY placed_at DESC
        LIMIT 200
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Failed to get picks:", err);
      res.status(500).json({ error: "Failed to get picks" });
    }
  });

  app.get("/api/user/picks/clv-summary", requireAuth, async (req, res) => {
    try {
      const username = req.session!.username;
      const result = await db.execute(sql`
        SELECT * FROM user_picks
        WHERE username = ${username}
        ORDER BY placed_at DESC
      `);
      const picks = result.rows as any[];
      const totalPicks = picks.length;
      const picksWithClv = picks.filter(p => p.clv_result !== null && p.clv_result !== undefined);
      const clvPositive = picksWithClv.filter(p => p.clv_result > 0);
      const clvPlusRate = picksWithClv.length > 0 ? clvPositive.length / picksWithClv.length : 0;
      const avgClv = picksWithClv.length > 0
        ? picksWithClv.reduce((sum: number, p: any) => sum + (p.clv_result || 0), 0) / picksWithClv.length
        : 0;

      let currentStreak = 0;
      let streakType: "clv+" | "clv-" | "none" = "none";
      for (const p of picksWithClv) {
        if (streakType === "none") {
          streakType = p.clv_result > 0 ? "clv+" : "clv-";
          currentStreak = 1;
        } else if ((streakType === "clv+" && p.clv_result > 0) || (streakType === "clv-" && p.clv_result <= 0)) {
          currentStreak++;
        } else {
          break;
        }
      }

      const settledPicks = picks.filter(p => p.settled);
      const wonPicks = settledPicks.filter(p => p.won);
      const winRate = settledPicks.length > 0 ? wonPicks.length / settledPicks.length : 0;

      res.json({
        totalPicks,
        settledPicks: settledPicks.length,
        wonPicks: wonPicks.length,
        winRate: Math.round(winRate * 1000) / 1000,
        picksWithClv: picksWithClv.length,
        clvPlusRate: Math.round(clvPlusRate * 1000) / 1000,
        avgClv: Math.round(avgClv * 100) / 100,
        streak: { type: streakType, count: currentStreak },
      });
    } catch (err) {
      console.error("Failed to compute CLV summary:", err);
      res.status(500).json({ error: "Failed to compute CLV summary" });
    }
  });
}

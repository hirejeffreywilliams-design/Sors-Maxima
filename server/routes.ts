import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { evaluateRequestSchema, generateParlaysRequestSchema, sports } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { getOddsForSport, refreshOddsForSport, eventsToLegs } from "./odds-provider";
import { generateVegasPredictions, getVegasInsights } from "./vegas-engine";
import { stripeService } from "./stripeService";
import { WebhookHandlers } from "./webhookHandlers";
import { authService, type User } from "./authService";
import { errorLogger } from "./errorLogger";
import { getLearningStats, getAllFactorWeights } from "./learningEngine";

declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
    username?: string;
    userId?: string;
    isAdmin?: boolean;
    role?: 'user' | 'admin';
  }
}

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Admin-only middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAuthenticated || !req.session?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // User Registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password } = req.body;
      const ip = getClientIp(req);

      if (!email || !username || !password) {
        return res.status(400).json({ error: "Email, username, and password are required" });
      }

      const result = await authService.register(email, username, password, ip);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Auto-login after registration
      req.session.isAuthenticated = true;
      req.session.username = result.user!.username;
      req.session.userId = result.user!.id;
      req.session.isAdmin = false;
      req.session.role = 'user';

      return res.json({ 
        success: true, 
        username: result.user!.username,
        email: result.user!.email
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const result = await authService.login(username, password, ip, userAgent);

      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }

      req.session.isAuthenticated = true;
      req.session.username = result.user!.username;
      req.session.userId = result.user!.id;
      req.session.isAdmin = result.isAdmin || false;
      req.session.role = result.user!.role;

      return res.json({ 
        success: true, 
        username: result.user!.username,
        isAdmin: result.isAdmin || false
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    if (req.session?.isAuthenticated) {
      return res.json({ 
        authenticated: true, 
        username: req.session.username,
        isAdmin: req.session.isAdmin || false,
        role: req.session.role || 'user'
      });
    }
    return res.json({ authenticated: false });
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, (_req, res) => {
    const users = authService.getAllUsers();
    res.json(users);
  });

  // Admin: Get suspicious activities
  app.get("/api/admin/fraud-alerts", requireAdmin, (_req, res) => {
    const activities = authService.getSuspiciousActivities();
    res.json(activities);
  });

  // Admin: Ban user
  app.post("/api/admin/ban-user", requireAdmin, (req, res) => {
    const { userId, reason } = req.body;
    if (!userId || !reason) {
      return res.status(400).json({ error: "User ID and reason are required" });
    }
    const success = authService.banUser(userId, reason);
    if (success) {
      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Failed to ban user" });
  });

  // Admin: Unban user
  app.post("/api/admin/unban-user", requireAdmin, (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const success = authService.unbanUser(userId);
    if (success) {
      return res.json({ success: true });
    }
    return res.status(400).json({ error: "Failed to unban user" });
  });

  // Admin: Get error logs
  app.get("/api/admin/error-logs", requireAdmin, (req, res) => {
    const { level, limit, since } = req.query;
    const logs = errorLogger.getLogs({
      level: level as 'error' | 'warn' | 'info' | undefined,
      limit: limit ? parseInt(limit as string) : 100,
      since: since as string | undefined
    });
    res.json(logs);
  });

  // Admin: Get error log stats
  app.get("/api/admin/error-stats", requireAdmin, (_req, res) => {
    const stats = errorLogger.getStats();
    res.json(stats);
  });

  // Admin: Get single error log
  app.get("/api/admin/error-logs/:id", requireAdmin, (req, res) => {
    const log = errorLogger.getLog(req.params.id);
    if (log) {
      return res.json(log);
    }
    return res.status(404).json({ error: "Error log not found" });
  });

  // Admin: Clear error logs
  app.delete("/api/admin/error-logs", requireAdmin, (_req, res) => {
    errorLogger.clear();
    res.json({ success: true });
  });

  // Log a test error (for debugging purposes)
  app.post("/api/admin/test-error", requireAdmin, (req, res) => {
    const { message, level } = req.body;
    const id = errorLogger.log(level || 'error', message || 'Test error', {
      path: '/api/admin/test-error',
      method: 'POST',
      userId: req.session?.userId,
      ip: getClientIp(req)
    });
    res.json({ success: true, errorId: id });
  });

  app.get("/api/sports", (_req, res) => {
    const sportsList = sports.map((sport) => ({
      id: sport,
      name: sport,
      available: true,
    }));
    res.json(sportsList);
  });

  app.get("/api/odds", (req, res) => {
    try {
      const sport = req.query.sport as string;
      
      if (!sport || !sports.includes(sport as any)) {
        return res.status(400).json({
          error: "Invalid sport",
          validSports: sports,
        });
      }

      const events = getOddsForSport(sport as any);
      return res.json(events);
    } catch (err) {
      console.error("Odds fetch error:", err);
      return res.status(500).json({
        error: "Failed to fetch odds",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/odds/refresh", (req, res) => {
    try {
      const sport = req.body.sport as string;
      
      if (!sport || !sports.includes(sport as any)) {
        return res.status(400).json({
          error: "Invalid sport",
          validSports: sports,
        });
      }

      const events = refreshOddsForSport(sport as any);
      return res.json(events);
    } catch (err) {
      console.error("Odds refresh error:", err);
      return res.status(500).json({
        error: "Failed to refresh odds",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/generate-parlays", async (req, res) => {
    try {
      const parseResult = generateParlaysRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Validation failed",
          details: validationError.toString(),
        });
      }

      const { sport, stake, minLegs, maxLegs, bankroll, riskLevel, topN, selectedEventIds, selectedTotals, selectedProps } =
        parseResult.data;

      let events = getOddsForSport(sport);
      
      if (selectedEventIds && selectedEventIds.length > 0) {
        events = events.filter(e => selectedEventIds.includes(e.id));
      }
      
      let legs = eventsToLegs(events);
      
      const selectedTotalGameIds = new Set((selectedTotals || []).map(t => t.gameId));
      
      if (selectedTotals && selectedTotals.length > 0) {
        const totalLegs = [];
        for (const total of selectedTotals) {
          const event = events.find(e => e.id === total.gameId);
          if (!event) continue;
          
          const totalMarket = event.markets.find(m => m.type === "total");
          if (!totalMarket) continue;
          
          const outcome = totalMarket.outcomes.find(o => 
            total.selection === "over" ? o.name.includes("Over") : o.name.includes("Under")
          );
          if (!outcome) continue;
          
          totalLegs.push({
            id: `${event.id}-total-${total.selection}`,
            eventId: event.id,
            team: `${event.awayTeam} @ ${event.homeTeam}`,
            opponent: "",
            market: "total" as const,
            outcome: outcome.name,
            decimalOdds: outcome.decimalOdds,
            americanOdds: outcome.americanOdds,
          });
        }
        
        legs = legs.filter(leg => {
          if (leg.market === "total" && leg.eventId && selectedTotalGameIds.has(leg.eventId)) {
            return false;
          }
          return true;
        });
        
        legs = [...totalLegs, ...legs];
      }

      if (selectedProps && selectedProps.length > 0) {
        const propLegs = [];
        for (const propSelection of selectedProps) {
          const { gameId, playerId, category, selection } = propSelection;
          const event = events.find(e => e.id === gameId);
          if (!event || !event.playerProps) continue;
          
          const prop = event.playerProps.find(p => 
            p.playerId === playerId && p.category === category
          );
          if (!prop) continue;
          
          const odds = selection === "over" ? prop.overOdds : prop.underOdds;
          const outcomeLabel = selection === "over" ? "Over" : "Under";
          
          propLegs.push({
            id: `${gameId}-${playerId}-${category}-${selection}`,
            eventId: event.id,
            team: prop.team,
            opponent: "",
            market: "player_prop" as const,
            outcome: `${prop.playerName} ${outcomeLabel} ${prop.line} ${category}`,
            decimalOdds: odds.decimalOdds,
            americanOdds: odds.americanOdds,
          });
        }
        legs = [...propLegs, ...legs];
      }

      if (legs.length < minLegs) {
        return res.status(400).json({
          error: "Not enough betting options available",
          available: legs.length,
          required: minLegs,
          hint: selectedEventIds?.length ? "Try selecting more games" : "Try a different sport",
        });
      }

      const parlays = await storage.generateOptimalParlays(legs, {
        minLegs,
        maxLegs,
        bankroll,
        riskLevel,
        topN,
        stake,
        sport,
      });

      return res.json({
        parlays,
        meta: {
          sport,
          eventsAnalyzed: events.length,
          legsAnalyzed: legs.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Parlay generation error:", err);
      return res.status(500).json({
        error: "Failed to generate parlays",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.post("/api/evaluate", async (req, res) => {
    try {
      const parseResult = evaluateRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({
          error: "Validation failed",
          details: validationError.toString(),
        });
      }

      const { legs, stake, simulations } = parseResult.data;

      if (legs.length < 2) {
        return res.status(400).json({
          error: "At least 2 legs are required for parlay evaluation",
        });
      }

      if (legs.length > 12) {
        return res.status(400).json({
          error: "Maximum 12 legs allowed per parlay",
        });
      }

      const result = await storage.evaluateParlay(legs, stake, simulations);
      return res.json(result);
    } catch (err) {
      console.error("Evaluation error:", err);
      return res.status(500).json({
        error: "Failed to evaluate parlay",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/vegas/predictions", (req, res) => {
    try {
      const sport = req.query.sport as string | undefined;
      const validSport = sport && sports.includes(sport as any) ? sport as any : undefined;
      
      const predictions = generateVegasPredictions(validSport);
      const insights = getVegasInsights();
      
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

  // Stripe webhook - must be registered before express.json() parses the body
  // Note: rawBody is attached in index.ts before JSON parsing
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

  // Stripe routes
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await stripeService.getPublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      console.error("Failed to get publishable key:", err);
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  app.get("/api/subscription", (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.username) {
      return res.json({ tier: 'free', status: 'none' });
    }
    
    const subscription = stripeService.getUserSubscription(req.session.username);
    res.json({
      tier: subscription.subscriptionTier,
      status: subscription.subscriptionStatus,
      customerId: subscription.stripeCustomerId,
    });
  });

  app.post("/api/stripe/checkout", async (req, res) => {
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
      
      // Create customer if needed
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

  app.get("/api/learning/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await getLearningStats();
      res.json(stats);
    } catch (err) {
      console.error("Learning stats error:", err);
      res.status(500).json({ error: "Failed to get learning stats" });
    }
  });

  app.get("/api/learning/weights", async (req, res) => {
    try {
      const weights = await getAllFactorWeights();
      res.json(weights);
    } catch (err) {
      console.error("Factor weights error:", err);
      res.status(500).json({ error: "Failed to get factor weights" });
    }
  });

  return httpServer;
}

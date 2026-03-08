import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.2,
  });
  console.log("[Sentry] Error monitoring active");
}

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorLogger } from "./errorLogger";
import { startContinuousLearning } from "./learningEngine";
import { initCommunityPatternEngine } from "./communityLossPatternEngine";
import { startAnalyticsAgent } from "./analyticsAgentEngine";
import { startAutonomousAdminIntelligence } from "./autonomousAdminIntelligence";
import { startAutoSettlement } from "./settlementEngine";
import { startIntelligenceHub } from "./unifiedIntelligenceHub";
import { startPrecomputedEngine } from "./precomputedPredictionsEngine";
import { startPlatformIntelligenceEngine } from "./platformIntelligenceEngine";
import { startMonteCarloEngine } from "./monteCarloEngine";
import { startNotificationEngine } from "./notificationEngine";
import { initBacktestOnStartup } from "./backtestEngine";
import { generateInternationalFeed } from "./internationalSportsEngine";
import { runMigrations } from "./dbMigrations";
import { startQualityWatchdog } from "./qualityWatchdog";
import { startAutonomousLearningEngine } from "./autonomousLearningEngine";
import { startEarlySettlementEngine } from "./earlySettlementEngine";
import { startSharpSignalDetector } from "./sharpSignalDetector";
import { pool } from "./db";
import { preloadAllRosters, startPeriodicRefresh } from "./espn-roster-provider";
import { liveSportsData } from "./live-sports-data";
import { bootstrapPipelineFromHistory, startPipelineAutoScheduler } from "./predictionPipelineEngine";
import { initTeamFormEngine, scheduleFormCacheRefresh } from "./teamHistoricalFormEngine";
import {
  securityHeadersMiddleware,
  ipBlockMiddleware,
  inputSanitizationMiddleware,
  apiRateLimitMiddleware,
  sessionFingerprintMiddleware,
  csrfTokenMiddleware,
  csrfValidationMiddleware,
} from "./securityMiddleware";
import { isMaintenanceMode, getMaintenanceMessage } from "./launch-control";

// ─── Crash Guards ─────────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] Uncaught exception caught — app staying alive:", err.message);
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] Unhandled promise rejection caught:", String(reason));
  if (process.env.SENTRY_DSN) Sentry.captureException(reason);
});

process.on("SIGHUP", () => { /* ignore — workflow runner disconnects terminal */ });
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
    username?: string;
    userId?: string;
    isAdmin?: boolean;
    role?: 'user' | 'admin';
  }
}

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(securityHeadersMiddleware);
app.use(ipBlockMiddleware);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15, // prune expired sessions every 15 min
  }),
  secret: process.env.SESSION_SECRET || (() => {
    const generated = require('crypto').randomBytes(64).toString('hex');
    console.warn('[SECURITY] No SESSION_SECRET env var set — using auto-generated secret. Sessions will not persist across restarts.');
    return generated;
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (was 24h)
    sameSite: "lax",
  },
}));

app.use("/api", csrfTokenMiddleware);
app.use("/api", csrfValidationMiddleware);
app.use("/api", apiRateLimitMiddleware);
app.use("/api", inputSanitizationMiddleware);
app.use("/api", sessionFingerprintMiddleware);

// ─── Maintenance Mode Gate ────────────────────────────────────────────────────
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (!isMaintenanceMode()) return next();
  const isAdminRoute = req.path.startsWith("/admin");
  const isSafeRoute = req.path.startsWith("/auth") || req.path === "/health" || req.path === "/maintenance/status";
  if (isAdminRoute || isSafeRoute) return next();
  return res.status(503).json({
    error: "Service Temporarily Unavailable",
    maintenance: true,
    message: getMaintenanceMessage(),
    retryAfter: 300,
  });
});

// ─── Request Logger ───────────────────────────────────────────────────────────
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const bodyStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${bodyStr.length > 500 ? bodyStr.slice(0, 500) + "…[truncated]" : bodyStr}`;
      }
      log(logLine);
    }
  });

  next();
});

// ─── Startup Orchestrator ─────────────────────────────────────────────────────
// Engines start in deliberate phases after the server is listening.
// Each phase waits for the previous to stabilize before adding more load.

function safeStart(name: string, fn: () => void, delayMs: number): void {
  setTimeout(() => {
    try {
      fn();
      log(`[Phase] ${name} started`, "startup");
    } catch (err: any) {
      console.error(`[Startup] ${name} failed to start:`, err.message);
    }
  }, delayMs);
}

function startEnginesPhased(): void {
  log("[Startup] Server ready — beginning phased engine startup", "startup");

  // ── Phase 0 (1s): Pipeline Bootstrap ─────────────────────────────────────
  // Load 522+ settled picks from disk into the in-memory pipeline feedback
  // store immediately — so win-rate, calibration, and run counts show real
  // history on page load instead of zeros until the first live cycle fires.
  safeStart("Pipeline History Bootstrap", () => {
    bootstrapPipelineFromHistory().catch((e) =>
      console.error("[Startup] Pipeline bootstrap error:", e.message)
    );
  }, 1_000);

  // ── Phase 1 (3s): Roster data ─────────────────────────────────────────────
  // Preload team rosters from ESPN. Lightweight — just caching JSON.
  safeStart("Roster Preload", () => {
    preloadAllRosters()
      .then(() => startPeriodicRefresh(6))
      .catch((err) => {
        console.error("[Startup] Roster preload failed — will retry via periodic refresh:", err.message);
        startPeriodicRefresh(6);
      });
  }, 3_000);

  // ── Phase 2 (5s): Live Sports Data ───────────────────────────────────────
  // Start the ESPN live scoreboard refresh cycle (60s interval).
  // This is the base data layer everything else reads from.
  safeStart("Live Sports Data", () => liveSportsData.startSimulation(), 5_000);

  // ── Phase 2.1 (8s): Monte Carlo Engine ────────────────────────────────────
  // Advanced simulation engine. Pre-simulates matchups for fast user responses.
  // Moved from 50s → 8s: loads disk cache immediately, fires first warmup at 23s total.
  safeStart("Monte Carlo Engine", startMonteCarloEngine, 8_000);

  // ── Phase 2.2 (9s): Team Historical Form Engine ─────────────────────────
  // Pulls 60 days of ESPN historical scores to compute real team form metrics.
  // Loads from disk cache (instant) or builds fresh (runs in background).
  // Feeds real last-10 records and home/road splits into prediction engine.
  safeStart("Team Historical Form Engine", async () => {
    await initTeamFormEngine();
    scheduleFormCacheRefresh();
  }, 9_000);

  // ── Phase 3 (10s): Intelligence Hub ──────────────────────────────────────
  // Core ESPN + odds data pipeline. Everything else depends on this.
  // Runs its first cycle immediately, then every 60s.
  safeStart("Intelligence Hub", startIntelligenceHub, 10_000);

  // ── Phase 3.6 (13s): BDL Sports Warmup ───────────────────────────────────
  // Proactively fetch NFL/MLB team stats so availability flags are set and
  // the admin panel shows accurate status instead of "Offline".
  safeStart("BDL Warmup", () => {
    import("./balldontlie-provider").then(({ warmupBDLSports }) => warmupBDLSports()).catch(() => {});
  }, 13_000);

  // ── Phase 4 (14s): Precomputed Predictions ───────────────────────────────
  // Builds AI picks from hub data. Disk cache serves instant picks while this
  // warms up — hub will have started its first cycle by 10s so 14s is safe.
  safeStart("Precomputed Predictions Engine", startPrecomputedEngine, 14_000);

  // ── Phase 5 (28s): Auto-Settlement ───────────────────────────────────────
  // Settle picks from completed games. Runs once at startup, then every 5 min.
  safeStart("Auto-Settlement Engine", startAutoSettlement, 28_000);

  // ── Phase 6 (42s): Platform Intelligence ─────────────────────────────────
  // Accumulates game outcomes and prediction accuracy for continuous learning.
  safeStart("Platform Intelligence Engine", startPlatformIntelligenceEngine, 42_000);

  // ── Phase 5.5 (35s): Early Settlement Engine ─────────────────────────────
  // Detects mathematically-decided game outcomes before ESPN marks them "post".
  // Polls live ESPN scoreboards every 90s and settles picks when outcome is certain.
  safeStart("Early Settlement Engine", startEarlySettlementEngine, 35_000);

  // ── Phase 5.7 (40s): Sharp Signal Detector ───────────────────────────────
  // Monitors The Odds API line movement every 60s. Triggers CLV capture when
  // games go live, and broadcasts sharp money alerts for ≥1.5pt line moves.
  safeStart("Sharp Signal Detector", startSharpSignalDetector, 40_000);

  // ── Phase 7 (50s): Prediction Pipeline Auto-Scheduler ────────────────────
  // Starts the 30-minute prediction pipeline cycle (12-stage ML pipeline).
  // First auto-run fires 90s after this phase starts. Admin never needs to
  // manually click "Run Pipeline" — the system handles it autonomously.
  safeStart("Prediction Pipeline Auto-Scheduler", startPipelineAutoScheduler, 50_000);

  // ── Phase 8 (70s): Notification Engine ───────────────────────────────────
  // Monitors live games and prop lines for user-subscribed alerts.
  safeStart("Notification Engine", startNotificationEngine, 70_000);

  // ── Phase 9 (Background): Learning + Backtest ────────────────────────────
  // Pure background work — run last to avoid competing with user-facing engines.
  safeStart("Continuous Learning Engine", startContinuousLearning, 100_000);
  safeStart("Community Pattern Engine", initCommunityPatternEngine, 108_000);
  safeStart("Analytics Agent", startAnalyticsAgent, 115_000);
  safeStart("Autonomous Admin Intelligence", startAutonomousAdminIntelligence, 120_000);
  safeStart("Autonomous Learning Engine", startAutonomousLearningEngine, 135_000);
  safeStart("Historical Backtest", initBacktestOnStartup, 130_000);
  safeStart("Quality Watchdog", startQualityWatchdog, 140_000);
  safeStart("App Intelligence Engine", () => {
    import("./appIntelligenceEngine").then(({ startAppIntelligenceEngine }) => {
      startAppIntelligenceEngine();
    }).catch(() => {});
  }, 150_000);
  safeStart("International Sports Engine", () => {
    generateInternationalFeed().catch(() => {});
    setInterval(() => generateInternationalFeed().catch(() => {}), 6 * 60 * 60 * 1000);
  }, 145_000);

  // ── Phase 10 (25s): Cache Warmup ─────────────────────────────────────────
  // Pre-warm the response cache for the most-hit endpoints so the first user
  // after a deploy gets instant data instead of waiting for live generation.
  safeStart("Response Cache Warmup", async () => {
    try {
      const { generateIntelligenceFeed } = await import("./unifiedIntelligenceHub");
      const { buildOptimalTickets, buildMatchupTickets, buildLifeChangerTicket } = await import("./precomputedPredictionsEngine");
      const { getPickAccuracyStats } = await import("./pickOutcomeTracker");
      const { getTrackRecord } = await import("./calibrationEngine");
      const { invalidateCache } = await import("./responseCache");
      // Pre-generate data so it's in in-process caches; route-level responseCache
      // will populate on first actual HTTP request with the already-warm data.
      await generateIntelligenceFeed().catch(() => {});
      buildOptimalTickets({ sports: ["NBA", "NHL", "NCAAB"], riskLevel: "moderate", bankroll: 1000, maxLegs: 4, dateFilter: "all" });
      buildMatchupTickets({ sports: ["NBA", "NHL", "NCAAB"], maxLegs: 20, bankroll: 1000 });
      buildLifeChangerTicket();
      getPickAccuracyStats();
      getTrackRecord();
      console.log("[CacheWarmup] Critical caches pre-warmed — first page load will be instant");
    } catch (err: any) {
      console.warn("[CacheWarmup] Warmup partial:", err.message);
    }
  }, 25_000);

  // ── SSE Broadcaster is lazy ───────────────────────────────────────────────
  // It auto-starts in sseManager.ts when the first user connects to /api/sse/stream.
  // No need to start it here — this saves resources when no users are active.

  // ── Email Schedulers ──────────────────────────────────────────────────────
  // Admin daily summary at 8:00am, user weekly digest on Mondays at 9:00am.
  startEmailSchedulers();
}

function startEmailSchedulers(): void {
  const CHECK_INTERVAL = 60 * 60 * 1000; // check every hour
  let lastAdminSummaryDate = "";
  let lastWeeklyDigestDate = "";

  setInterval(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
      const dateKey = now.toISOString().split("T")[0];

      // Admin daily summary at 8am
      if (hour === 8 && lastAdminSummaryDate !== dateKey) {
        lastAdminSummaryDate = dateKey;
        const { sendAdminDailySummary } = await import("./emailService");
        const { stripeService } = await import("./stripeService");
        try {
          const allSubs = await stripeService.getAllSubscriptions();
          const active = allSubs.filter(s => ['active', 'trialing'].includes(s.subscriptionStatus));
          const proCount = active.filter(s => s.subscriptionTier === 'pro').length;
          const eliteCount = active.filter(s => s.subscriptionTier === 'elite').length;
          const whaleCount = active.filter(s => s.subscriptionTier === 'whale').length;
          const { getPickAccuracyStats } = await import("./pickOutcomeTracker");
          const stats = getPickAccuracyStats();
          await sendAdminDailySummary({
            newSignups: 0,
            activeSubscribers: active.length,
            proCount,
            eliteCount,
            whaleCount,
            picksSettled: stats.overall?.total || 0,
            modelWinRate: Math.round((stats.overall?.rate || 0) * 100),
            alerts: [],
          });
          log("[EmailScheduler] Admin daily summary sent", "scheduler");
        } catch (err: any) {
          console.error("[EmailScheduler] Admin summary failed:", err.message);
        }
      }

      // Weekly digest on Mondays at 9am
      if (dayOfWeek === 1 && hour === 9 && lastWeeklyDigestDate !== dateKey) {
        lastWeeklyDigestDate = dateKey;
        log("[EmailScheduler] Weekly digest run triggered (Monday 9am)", "scheduler");
        try {
          const { db: emailDb } = await import("./db");
          const { sql: emailSql } = await import("drizzle-orm");
          const { sendWeeklyDigest } = await import("./emailService");
          const activeUsers = await emailDb.execute(emailSql`
            SELECT u.id, u.email, u.username
            FROM users u
            INNER JOIN subscriptions s ON s.user_id = u.id
            WHERE s.status = 'active'
              AND u.email IS NOT NULL
              AND u.email_verified = true
          `);
          let digestSent = 0;
          for (const user of activeUsers.rows as any[]) {
            try {
              const picksResult = await emailDb.execute(emailSql`
                SELECT won FROM user_picks
                WHERE username = ${user.username} AND settled = true
                ORDER BY placed_at DESC LIMIT 30
              `);
              const picks = picksResult.rows as any[];
              if (picks.length < 3) continue;
              const wins = picks.filter(p => p.won === true).length;
              const losses = picks.filter(p => p.won === false).length;
              const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
              await sendWeeklyDigest(user.email, user.username, {
                wins,
                losses,
                winRate,
                clvRate: 0,
              });
              digestSent++;
            } catch (_) {}
          }
          log(`[EmailScheduler] Weekly digest sent to ${digestSent} users`, "scheduler");
        } catch (err: any) {
          console.error("[EmailScheduler] Weekly digest failed:", err.message);
        }
      }

      // Day 2 and Day 7 email sequences
      await checkEmailSequences();
    } catch (err: any) {
      console.error("[EmailScheduler] Scheduler tick failed:", err.message);
    }
  }, CHECK_INTERVAL);

  log("[EmailScheduler] Email schedulers started (hourly check)", "startup");
}

async function checkEmailSequences(): Promise<void> {
  const { db } = await import("./db");
  const { users, subscriptions } = await import("@shared/schema");
  const { eq, and, gt, lt } = await import("drizzle-orm");
  const { sendDay2Email, sendDay7Email } = await import("./emailService");

  const now = new Date();
  const day2Start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const day2End = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const day7Start = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const day7End = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Day 2 sequence
  const day2Users = await db.select().from(users)
    .where(and(
      eq(users.emailSequenceDay2Sent, false),
      gt(users.createdAt, day2Start),
      lt(users.createdAt, day2End)
    ));

  for (const user of day2Users) {
    try {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
      const tier = sub?.tier || "Sharp";
      const sent = await sendDay2Email(user.email, user.username, tier);
      if (sent) {
        await db.update(users).set({ emailSequenceDay2Sent: true }).where(eq(users.id, user.id));
        log(`[EmailSequence] Sent Day 2 email to ${user.username}`);
      }
    } catch (err: any) {
      console.error(`[EmailSequence] Failed to process Day 2 email for ${user.username}:`, err.message);
    }
  }

  // Day 7 sequence
  const day7Users = await db.select().from(users)
    .where(and(
      eq(users.emailSequenceDay7Sent, false),
      gt(users.createdAt, day7Start),
      lt(users.createdAt, day7End)
    ));

  for (const user of day7Users) {
    try {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
      const tier = sub?.tier || "Sharp";
      const sent = await sendDay7Email(user.email, user.username, tier);
      if (sent) {
        await db.update(users).set({ emailSequenceDay7Sent: true }).where(eq(users.id, user.id));
        log(`[EmailSequence] Sent Day 7 email to ${user.username}`);
      }
    } catch (err: any) {
      console.error(`[EmailSequence] Failed to process Day 7 email for ${user.username}:`, err.message);
    }
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await runMigrations();
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    const errorId = errorLogger.logRequestError(
      err instanceof Error ? err : new Error(message),
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
        headers: req.headers as Record<string, string | string[] | undefined>
      },
      req.session?.userId
    );

    if (status >= 500 && process.env.SENTRY_DSN) Sentry.captureException(err);

    res.status(status).json({ 
      message,
      errorId: status >= 500 ? errorId : undefined
    });
    
    console.error(`[${errorId}] ${req.method} ${req.path}:`, err);
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startEnginesPhased();
    },
  );
})();

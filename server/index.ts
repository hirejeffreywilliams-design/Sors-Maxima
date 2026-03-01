import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorLogger } from "./errorLogger";
import { startContinuousLearning } from "./learningEngine";
import { startAnalyticsAgent } from "./analyticsAgentEngine";
import { startAutoSettlement } from "./settlementEngine";
import { startIntelligenceHub } from "./unifiedIntelligenceHub";
import { startPrecomputedEngine } from "./precomputedPredictionsEngine";
import { startPlatformIntelligenceEngine } from "./platformIntelligenceEngine";
import { startMonteCarloEngine } from "./monteCarloEngine";
import { startNotificationEngine } from "./notificationEngine";
import { initBacktestOnStartup } from "./backtestEngine";
import { runMigrations } from "./dbMigrations";
import { preloadAllRosters, startPeriodicRefresh } from "./espn-roster-provider";
import { liveSportsData } from "./live-sports-data";
import {
  securityHeadersMiddleware,
  ipBlockMiddleware,
  inputSanitizationMiddleware,
  apiRateLimitMiddleware,
  sessionFingerprintMiddleware,
  csrfTokenMiddleware,
  csrfValidationMiddleware,
} from "./securityMiddleware";

// ─── Crash Guards ─────────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] Uncaught exception caught — app staying alive:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] Unhandled promise rejection caught:", String(reason));
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

app.use(session({
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
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
}));

app.use("/api", csrfTokenMiddleware);
app.use("/api", csrfValidationMiddleware);
app.use("/api", apiRateLimitMiddleware);
app.use("/api", inputSanitizationMiddleware);
app.use("/api", sessionFingerprintMiddleware);

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

  // ── Phase 3 (10s): Intelligence Hub ──────────────────────────────────────
  // Core ESPN + odds data pipeline. Everything else depends on this.
  // Runs its first cycle immediately, then every 60s.
  safeStart("Intelligence Hub", startIntelligenceHub, 10_000);

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

  // ── Phase 7 (50s): Monte Carlo Engine ────────────────────────────────────
  // Advanced simulation engine. Pre-simulates matchups for fast user responses.
  // Reduced from 70s → 50s: hub + precomputed are running well by this point.
  // First warmup cycle fires 15s after start = 65s total. 10× more sims overnight.
  safeStart("Monte Carlo Engine", startMonteCarloEngine, 50_000);

  // ── Phase 8 (70s): Notification Engine ───────────────────────────────────
  // Monitors live games and prop lines for user-subscribed alerts.
  safeStart("Notification Engine", startNotificationEngine, 70_000);

  // ── Phase 9 (Background): Learning + Backtest ────────────────────────────
  // Pure background work — run last to avoid competing with user-facing engines.
  safeStart("Continuous Learning Engine", startContinuousLearning, 100_000);
  safeStart("Analytics Agent", startAnalyticsAgent, 115_000);
  safeStart("Historical Backtest", initBacktestOnStartup, 130_000);

  // ── SSE Broadcaster is lazy ───────────────────────────────────────────────
  // It auto-starts in sseManager.ts when the first user connects to /api/sse/stream.
  // No need to start it here — this saves resources when no users are active.
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

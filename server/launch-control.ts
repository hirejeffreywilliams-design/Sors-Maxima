import { db } from "./db";
import { sql } from "drizzle-orm";
import { sportsDataService } from "./sportsDataService";
import { getEngineStatus } from "./precomputedPredictionsEngine";
import { isBDLAvailable } from "./balldontlie-provider";
import { getOddsApiUsageStats } from "./api-usage-tracker";
import fs from "fs";
import path from "path";

// ── Maintenance Mode ──────────────────────────────────────────────────────────
let _maintenanceMode = false;
let _maintenanceMessage = "We're making improvements. Check back soon.";

export function isMaintenanceMode(): boolean { return _maintenanceMode; }
export function getMaintenanceMessage(): string { return _maintenanceMessage; }

export function toggleMaintenanceMode(message?: string): boolean {
  _maintenanceMode = !_maintenanceMode;
  if (message) _maintenanceMessage = message;
  console.log(`[LaunchControl] Maintenance mode ${_maintenanceMode ? "ENABLED" : "DISABLED"}`);
  return _maintenanceMode;
}

export function setMaintenanceMode(on: boolean, message?: string): void {
  _maintenanceMode = on;
  if (message) _maintenanceMessage = message;
}

// ── Check Result Types ────────────────────────────────────────────────────────
export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
}

// ── API Budget Stats (delegated to api-usage-tracker) ────────────────────────
export function getApiUsageStats() {
  const apiStatus = sportsDataService.getApiStatus();
  const tracked = getOddsApiUsageStats();

  // Prefer live tracked data; fall back to sportsDataService header value
  const remaining = tracked.remaining ?? apiStatus.requestsRemaining ?? null;

  return {
    available: apiStatus.available,
    remaining,
    burnRatePerHour: tracked.burnRatePerHour,
    daysRemaining: tracked.daysRemaining,
    historyPoints: tracked.callCount,
    lastCall: tracked.lastCall,
  };
}

// ── Core Checks ───────────────────────────────────────────────────────────────
async function checkDatabase(): Promise<CheckResult> {
  try {
    await db.execute(sql`SELECT 1`);
    return { id: "database", label: "Database", status: "pass", detail: "PostgreSQL responding normally" };
  } catch (e: any) {
    return { id: "database", label: "Database", status: "fail", detail: `Connection failed: ${e.message}`, action: "Check DATABASE_URL env var and database status" };
  }
}

async function checkPredictionsEngine(): Promise<CheckResult> {
  const status = getEngineStatus();
  const totalPicks = Object.values(status.cacheStatus).reduce((s, c) => s + c.pickCount, 0);
  const sportsWithPicks = Object.values(status.cacheStatus).filter(c => c.hasPicks).length;

  if (!status.running) {
    return { id: "predictions-engine", label: "Predictions Engine", status: "fail", detail: "Engine is not running", action: "Use Quick Actions → Force Engine Run to restart" };
  }
  if (totalPicks === 0) {
    return { id: "predictions-engine", label: "Predictions Engine", status: "warn", detail: "Engine running but no picks generated yet", action: "May need a few minutes after server start" };
  }
  return { id: "predictions-engine", label: "Predictions Engine", status: "pass", detail: `Running — ${totalPicks} picks across ${sportsWithPicks} sport(s)` };
}

function checkOddsApiBudget(): CheckResult {
  const stats = getApiUsageStats();

  if (stats.remaining === null) {
    return { id: "odds-api", label: "Odds API Budget", status: "warn", detail: "Budget unknown — no requests tracked yet", action: "Make a test API call to populate stats" };
  }

  if (stats.remaining < 5_000) {
    return { id: "odds-api", label: "Odds API Budget", status: "fail", detail: `CRITICAL: Only ${stats.remaining.toLocaleString()} requests remaining`, action: "Reduce polling frequency or upgrade plan immediately" };
  }
  if (stats.remaining < 20_000) {
    return { id: "odds-api", label: "Odds API Budget", status: "warn", detail: `Low: ${stats.remaining.toLocaleString()} requests remaining — ${stats.daysRemaining ?? "?"} days at current burn rate`, action: "Monitor closely — consider reducing polling frequency" };
  }
  return {
    id: "odds-api",
    label: "Odds API Budget",
    status: "pass",
    detail: `${stats.remaining.toLocaleString()} requests remaining${stats.daysRemaining ? ` (~${stats.daysRemaining} days)` : ""}${stats.burnRatePerHour ? ` · ${stats.burnRatePerHour}/hr burn rate` : ""}`,
  };
}

function checkEnvSecrets(): CheckResult[] {
  const checks: { id: string; label: string; key: string; action: string }[] = [
    { id: "env-admin-password", label: "Admin Password", key: "ADMIN_PASSWORD", action: "Set ADMIN_PASSWORD env secret before going live" },
    { id: "env-odds-api", label: "Odds API Key", key: "THE_ODDS_API_KEY", action: "Set THE_ODDS_API_KEY env secret" },
    { id: "env-resend", label: "Email Service (Resend)", key: "RESEND_API_KEY", action: "Set RESEND_API_KEY for email verification to work" },
    { id: "env-stripe", label: "Stripe Payments", key: "STRIPE_SECRET_KEY", action: "Set STRIPE_SECRET_KEY for subscriptions" },
    { id: "env-openai", label: "OpenAI (Admin)", key: "OPENAI_API_KEY", action: "Set OPENAI_API_KEY for admin assistant features" },
    { id: "env-bdl", label: "BallDontLie Stats", key: "BALLDONTLIE_API_KEY", action: "Set BALLDONTLIE_API_KEY for advanced NFL/MLB stats" },
  ];

  return checks.map(c => {
    const val = process.env[c.key];
    if (!val || val.trim().length === 0) {
      return { id: c.id, label: c.label, status: "fail" as CheckStatus, detail: `${c.key} is not set`, action: c.action };
    }
    if (val.length < 8) {
      return { id: c.id, label: c.label, status: "warn" as CheckStatus, detail: `${c.key} is set but suspiciously short`, action: c.action };
    }
    return { id: c.id, label: c.label, status: "pass" as CheckStatus, detail: `${c.key} is configured (${val.length} chars)` };
  });
}

function checkSessionStore(): CheckResult {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return {
      id: "session-store",
      label: "Session Store",
      status: "warn",
      detail: "Using in-memory MemoryStore in production — sessions reset on restart and don't scale across instances",
      action: "Consider upgrading to connect-pg-simple (PostgreSQL-backed sessions) for production",
    };
  }
  return { id: "session-store", label: "Session Store", status: "pass", detail: "Dev mode — MemoryStore is fine for development" };
}

function checkBallDontLie(): CheckResult {
  const available = isBDLAvailable();
  if (!available) {
    return {
      id: "balldontlie",
      label: "BallDontLie API",
      status: "warn",
      detail: "BDL unavailable — NFL/MLB picks will use free stat APIs as fallback (still functional)",
      action: "Check BALLDONTLIE_API_KEY or BDL plan limits",
    };
  }
  return { id: "balldontlie", label: "BallDontLie API", status: "pass", detail: "BDL connected — enhanced NFL/MLB stats active" };
}

function checkMaintenanceMode(): CheckResult {
  if (_maintenanceMode) {
    return { id: "maintenance", label: "Maintenance Mode", status: "warn", detail: "MAINTENANCE MODE IS ACTIVE — users see maintenance screen", action: "Use Quick Actions to disable maintenance mode" };
  }
  return { id: "maintenance", label: "Maintenance Mode", status: "pass", detail: "Off — app is publicly accessible" };
}

function checkFrontendBuild(): CheckResult {
  const distPath = path.resolve(process.cwd(), "dist", "public", "index.html");

  if (!fs.existsSync(distPath)) {
    return { id: "frontend-build", label: "Frontend Build", status: "fail", detail: "dist/public/index.html not found", action: "Run 'npx vite build' to build the frontend before deploying" };
  }

  const stat = fs.statSync(distPath);
  const ageMinutes = Math.floor((Date.now() - stat.mtimeMs) / 60_000);
  const ageHours = Math.floor(ageMinutes / 60);

  if (ageHours > 24) {
    return { id: "frontend-build", label: "Frontend Build", status: "warn", detail: `Built ${ageHours}h ago — may be outdated if code changed recently`, action: "Run 'npx vite build' to ensure frontend is up to date" };
  }
  return { id: "frontend-build", label: "Frontend Build", status: "pass", detail: `Built ${ageHours > 0 ? `${ageHours}h` : `${ageMinutes}m`} ago` };
}

// ── Main Runner ───────────────────────────────────────────────────────────────
export async function runLaunchChecks(): Promise<CheckResult[]> {
  const [dbCheck, engineCheck] = await Promise.all([
    checkDatabase(),
    checkPredictionsEngine(),
  ]);

  const results: CheckResult[] = [
    checkMaintenanceMode(),
    dbCheck,
    engineCheck,
    checkOddsApiBudget(),
    checkFrontendBuild(),
    checkSessionStore(),
    checkBallDontLie(),
    ...checkEnvSecrets(),
  ];

  const fails = results.filter(r => r.status === "fail").length;
  const warns = results.filter(r => r.status === "warn").length;
  console.log(`[LaunchControl] Health check: ${results.length - fails - warns} pass, ${warns} warn, ${fails} fail`);

  return results;
}

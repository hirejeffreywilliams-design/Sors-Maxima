/**
 * Uptime Monitor
 *
 * Two complementary mechanisms:
 *
 * 1. Heartbeat pings — every 60 s we POST to UPTIME_HEARTBEAT_URL (if set).
 *    Compatible with BetterStack, UptimeRobot push monitors, Cronitor, etc.
 *    If the server crashes the pings stop → the external service alerts you.
 *
 * 2. Internal health snapshot — every 5 min we log key metrics (heap, SSE
 *    clients, DB latency) so you can spot slow degradation in the workflow
 *    console without needing an external dashboard.
 */

import https from "https";
import http from "http";
import { pool } from "./db";
import { getSSEStatus } from "./sseManager";

const HEARTBEAT_URL      = process.env.UPTIME_HEARTBEAT_URL ?? "";
const HEARTBEAT_INTERVAL = 60_000;       // 1 min
const HEALTH_LOG_INTERVAL = 5 * 60_000; // 5 min

let heartbeatHandle: NodeJS.Timeout | null = null;
let healthLogHandle:  NodeJS.Timeout | null = null;

// ── Heartbeat ping ─────────────────────────────────────────────────────────

function sendHeartbeat(): void {
  if (!HEARTBEAT_URL) return;

  const url = new URL(HEARTBEAT_URL);
  const mod = url.protocol === "https:" ? https : http;

  const req = mod.request(
    { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "GET" },
    (res) => { res.resume(); }
  );
  req.on("error", () => { /* silent — heartbeat failure is not critical */ });
  req.setTimeout(5_000, () => req.destroy());
  req.end();
}

// ── Internal health snapshot ───────────────────────────────────────────────

async function logHealthSnapshot(): Promise<void> {
  try {
    const heapMb     = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const rssMb      = Math.round(process.memoryUsage().rss       / 1024 / 1024);
    const sseStatus  = getSSEStatus();

    // Quick DB round-trip latency check
    const dbStart = Date.now();
    let dbLatencyMs = -1;
    let dbStatus    = "ok";
    try {
      await pool.query("SELECT 1");
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = "error";
    }

    const uptimeSec  = Math.round(process.uptime());
    const uptimeHuman =
      uptimeSec < 60  ? `${uptimeSec}s` :
      uptimeSec < 3600 ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s` :
      `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;

    console.log(
      `[Health] up=${uptimeHuman} heap=${heapMb}MB rss=${rssMb}MB ` +
      `sse=${sseStatus.activeClients}/${200} db=${dbStatus}(${dbLatencyMs}ms)`
    );
  } catch {
    // Never crash the server from a health log
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export function startUptimeMonitor(): void {
  if (heartbeatHandle) return;

  if (HEARTBEAT_URL) {
    sendHeartbeat(); // immediate first ping
    heartbeatHandle = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    console.log("[UptimeMonitor] Heartbeat pings started →", HEARTBEAT_URL.replace(/\/[^/]+$/, "/***"));
  } else {
    console.log("[UptimeMonitor] No UPTIME_HEARTBEAT_URL set — heartbeat pings disabled");
    heartbeatHandle = null as any; // mark as started
  }

  logHealthSnapshot(); // immediate first snapshot
  healthLogHandle = setInterval(logHealthSnapshot, HEALTH_LOG_INTERVAL);
  console.log("[UptimeMonitor] Internal health logging every 5 min");
}

export function stopUptimeMonitor(): void {
  if (heartbeatHandle) { clearInterval(heartbeatHandle); heartbeatHandle = null; }
  if (healthLogHandle)  { clearInterval(healthLogHandle);  healthLogHandle  = null; }
}

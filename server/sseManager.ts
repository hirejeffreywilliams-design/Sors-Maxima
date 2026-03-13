import crypto from "crypto";
import type { Response } from "express";
import { generateIntelligenceFeed } from "./unifiedIntelligenceHub";
import { logError } from "./errorLogger";

interface SSEClient {
  id: string;
  res: Response;
  channels: Set<string>;
  connectedAt: number;
  lastEventId: number;
}

const ALL_CHANNEL = "all";
const MAX_CLIENTS_PER_IP = 5;
const MAX_TOTAL_CLIENTS = 200;
const EVENT_BUFFER_SIZE = 100;
const clients = new Map<string, SSEClient>();
const ipConnectionCount = new Map<string, number>();
let eventCounter = 0;
let broadcastInterval: NodeJS.Timeout | null = null;
let lastFeedHash = "";
let lastOddsHash = "";
const eventBuffer: { id: number; eventType: string; data: any; channel: string; timestamp: number }[] = [];

function generateClientId(): string {
  return `sse-${crypto.randomUUID()}`;
}

export function registerSSEClient(res: Response, channels: string[] = ["all"], clientIp?: string, lastEventId?: number): string | null {
  if (clients.size >= MAX_TOTAL_CLIENTS) {
    res.writeHead(503, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(`data: ${JSON.stringify({ type: "error", message: "Too many SSE connections" })}\n\n`);
    res.end();
    return null;
  }

  if (clientIp) {
    const currentCount = ipConnectionCount.get(clientIp) || 0;
    if (currentCount >= MAX_CLIENTS_PER_IP) {
      res.writeHead(429, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      res.write(`data: ${JSON.stringify({ type: "error", message: "Too many SSE connections from this IP" })}\n\n`);
      res.end();
      return null;
    }
    ipConnectionCount.set(clientIp, currentCount + 1);
  }

  // Lazy start: auto-start the broadcaster on first real client connection
  if (!broadcastInterval) {
    startSSEBroadcaster();
  }

  const id = generateClientId();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", clientId: id, timestamp: new Date().toISOString() })}\n\n`);

  const client: SSEClient = {
    id,
    res,
    channels: new Set(channels),
    connectedAt: Date.now(),
    lastEventId: lastEventId || 0,
  };
  clients.set(id, client);

  if (lastEventId && lastEventId > 0) {
    // Reconnecting client — replay all missed events since their last event ID
    const missedEvents = eventBuffer.filter(e => e.id > lastEventId);
    for (const event of missedEvents) {
      if (client.channels.has(ALL_CHANNEL) || client.channels.has(event.channel)) {
        sendEventWithId(client, event.id, event.eventType, event.data);
      }
    }
  } else {
    // Fresh connection — send the latest event of each key type so the client
    // has current state immediately instead of waiting up to 30s for next broadcast.
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const catchUpTypes = ["intelligence-update", "live-scores", "sharp-signal"];
    for (const type of catchUpTypes) {
      const lastOfType = [...eventBuffer].reverse().find(
        e => e.eventType === type && e.timestamp > fiveMinAgo
      );
      if (lastOfType) {
        sendEventWithId(client, lastOfType.id, lastOfType.eventType, {
          ...lastOfType.data,
          catchUp: true,
        });
      }
    }
  }

  res.on("close", () => {
    clients.delete(id);
    if (clientIp) {
      const count = ipConnectionCount.get(clientIp) || 1;
      if (count <= 1) {
        ipConnectionCount.delete(clientIp);
      } else {
        ipConnectionCount.set(clientIp, count - 1);
      }
    }
  });

  return id;
}

function sendEventWithId(client: SSEClient, eventId: number, eventType: string, data: any): boolean {
  try {
    if (client.res.writableEnded) {
      clients.delete(client.id);
      return false;
    }
    client.lastEventId = eventId;
    client.res.write(`id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    clients.delete(client.id);
    return false;
  }
}

export function broadcastEvent(eventType: string, data: any, channel = "all"): void {
  eventCounter++;
  const eventId = eventCounter;
  eventBuffer.push({ id: eventId, eventType, data, channel, timestamp: Date.now() });
  if (eventBuffer.length > EVENT_BUFFER_SIZE) {
    eventBuffer.splice(0, eventBuffer.length - EVENT_BUFFER_SIZE);
  }

  for (const [, client] of Array.from(clients.entries())) {
    if (client.channels.has(ALL_CHANNEL) || client.channels.has(channel)) {
      sendEventWithId(client, eventId, eventType, data);
    }
  }
}

function hashFeed(feed: any): string {
  const key = JSON.stringify({
    liveCount: feed.liveGames?.length || 0,
    liveScores: feed.liveGames?.map((g: any) => `${g.id}:${g.homeTeam.score}-${g.awayTeam.score}:${g.status.detail}`).join(","),
    topPickCount: feed.topPicks?.length || 0,
    alertCount: feed.edgeAlerts?.length || 0,
    opportunity: feed.opportunityScore,
  });
  return key;
}

async function pushIntelligenceUpdate(): Promise<void> {
  if (clients.size === 0) return;

  try {
    const feed = await generateIntelligenceFeed();
    const currentHash = hashFeed(feed);

    if (currentHash === lastFeedHash) {
      eventCounter++;
      const heartbeatId = eventCounter;
      for (const [, client] of Array.from(clients.entries())) {
        sendEventWithId(client, heartbeatId, "heartbeat", { timestamp: new Date().toISOString(), clients: clients.size });
      }
      return;
    }

    lastFeedHash = currentHash;

    const mapGame = (g: any) => ({
      id: g.id,
      sport: g.sport,
      shortName: g.shortName,
      date: g.date,
      homeTeam: { name: g.homeTeam.name, abbreviation: g.homeTeam.abbreviation, score: g.homeTeam.score },
      awayTeam: { name: g.awayTeam.name, abbreviation: g.awayTeam.abbreviation, score: g.awayTeam.score },
      status: g.status,
      momentum: g.momentum,
      odds: g.odds,
    });

    const liveUpdate = {
      type: "intelligence-update",
      timestamp: new Date().toISOString(),
      opportunityScore: feed.opportunityScore,
      liveGames: feed.liveGames.map(mapGame),
      upcomingGames: feed.upcomingGames.slice(0, 20).map(mapGame),
      allGames: [...feed.liveGames.map(mapGame), ...feed.upcomingGames.slice(0, 20).map(mapGame)],
      topPicksCount: feed.topPicks.length,
      topPicks: feed.topPicks.slice(0, 5).map(p => ({
        id: p.id,
        sport: p.sport,
        game: p.game,
        pick: p.pick,
        grade: p.grade,
        confidence: p.confidence,
        ev: p.ev,
      })),
      edgeAlerts: feed.edgeAlerts.slice(0, 10).map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        severity: a.severity,
        sport: a.sport,
      })),
      sportSummaries: feed.sportSummaries,
      dataSourceHealth: feed.dataSourceHealth,
    };

    broadcastEvent("intelligence-update", liveUpdate);

    if (feed.liveGames.length > 0) {
      broadcastEvent("live-scores", {
        type: "live-scores",
        timestamp: new Date().toISOString(),
        games: feed.liveGames.map(g => ({
          id: g.id,
          sport: g.sport,
          shortName: g.shortName,
          home: { abbreviation: g.homeTeam.abbreviation, score: g.homeTeam.score },
          away: { abbreviation: g.awayTeam.abbreviation, score: g.awayTeam.score },
          status: g.status.detail,
          period: g.status.period,
        })),
      }, "scores");
    }

    if (feed.edgeAlerts.length > 0) {
      broadcastEvent("edge-alerts", {
        type: "edge-alerts",
        timestamp: new Date().toISOString(),
        alerts: feed.edgeAlerts.slice(0, 5),
      }, "alerts");
    }

    // Check if odds have changed since last broadcast — if so push odds-update event
    try {
      const { getCachedOddsForLegs } = await import("./marketSnapshotEngine");
      const allGames = [...feed.liveGames, ...feed.upcomingGames.slice(0, 30)];
      const oddsSnapshot = allGames.map((g: any) => ({
        id: g.id,
        homeOdds: g.odds?.homeML,
        awayOdds: g.odds?.awayML,
        spread: g.odds?.spread,
        total: g.odds?.total,
      }));
      const oddsHash = JSON.stringify(oddsSnapshot);
      if (oddsHash !== lastOddsHash && lastOddsHash !== "") {
        broadcastEvent("odds-update", {
          type: "odds-update",
          timestamp: new Date().toISOString(),
          changedGames: allGames.length,
        });
      }
      lastOddsHash = oddsHash;
    } catch { /* odds hash check is best-effort */ }

  } catch (err) {
    logError("[SSE] Failed to push intelligence update", { error: String(err) });
  }
}

export function startSSEBroadcaster(): void {
  if (broadcastInterval) return;
  console.log("[SSE] Starting SSE broadcaster (30s interval)...");
  broadcastInterval = setInterval(pushIntelligenceUpdate, 30_000);

  setTimeout(pushIntelligenceUpdate, 5_000);
}

export function stopSSEBroadcaster(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  console.log("[SSE] SSE broadcaster stopped.");
}

export function getSSEStatus() {
  const channelCounts: Record<string, number> = {};
  for (const c of clients.values()) {
    for (const ch of c.channels) {
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }
  }
  return {
    activeClients: clients.size,
    totalEventsSent: eventCounter,
    channelSubscribers: channelCounts,
    clientDetails: Array.from(clients.values()).map(c => ({
      id: c.id,
      channels: Array.from(c.channels),
      connectedFor: `${Math.round((Date.now() - c.connectedAt) / 1000)}s`,
      lastEventId: c.lastEventId,
    })),
  };
}

// ── Proactive Memory Monitor ──────────────────────────────────────────────────
// Checks heap every 60 seconds and broadcasts a system-alert SSE event to all
// connected admin sessions when memory crosses the 80% threshold.
let memoryMonitorHandle: NodeJS.Timeout | null = null;
let lastMemoryAlertAt = 0;
const HEAP_LIMIT_MB = 1024; // matches NODE_OPTIONS='--max-old-space-size=1024'
const MEMORY_ALERT_THRESHOLD_PCT = 80;
const MEMORY_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // max one alert per 5 min

export function startMemoryMonitor(): void {
  if (memoryMonitorHandle) return;
  memoryMonitorHandle = setInterval(() => {
    const heapUsedMb = process.memoryUsage().heapUsed / 1024 / 1024;
    const heapPct = (heapUsedMb / HEAP_LIMIT_MB) * 100;
    const now = Date.now();
    if (heapPct > MEMORY_ALERT_THRESHOLD_PCT && now - lastMemoryAlertAt > MEMORY_ALERT_COOLDOWN_MS) {
      lastMemoryAlertAt = now;
      console.warn(`[MemoryMonitor] ⚠ Heap at ${heapPct.toFixed(0)}% — broadcasting system-alert`);
      broadcastEvent("system-alert", {
        type: "high-memory",
        message: `Server heap at ${heapPct.toFixed(0)}% of ${HEAP_LIMIT_MB} MB limit`,
        heapUsedMb: Math.round(heapUsedMb),
        heapLimitMb: HEAP_LIMIT_MB,
        heapUsedPct: Math.round(heapPct),
        timestamp: new Date().toISOString(),
      });
    }
  }, 60_000);
  console.log("[MemoryMonitor] Heap monitor started — alert threshold: 80% of 1 GB");
}


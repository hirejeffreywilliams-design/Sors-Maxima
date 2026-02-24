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
const clients = new Map<string, SSEClient>();
let eventCounter = 0;
let broadcastInterval: NodeJS.Timeout | null = null;
let lastFeedHash = "";

function generateClientId(): string {
  return `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function registerSSEClient(res: Response, channels: string[] = ["all"]): string {
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
    lastEventId: 0,
  };
  clients.set(id, client);

  res.on("close", () => {
    clients.delete(id);
  });

  return id;
}

function sendEvent(client: SSEClient, eventType: string, data: any): boolean {
  try {
    if (client.res.writableEnded) {
      clients.delete(client.id);
      return false;
    }
    eventCounter++;
    client.lastEventId = eventCounter;
    client.res.write(`id: ${eventCounter}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    clients.delete(client.id);
    return false;
  }
}

export function broadcastEvent(eventType: string, data: any, channel = "all"): void {
  for (const [, client] of Array.from(clients.entries())) {
    if (client.channels.has(ALL_CHANNEL) || client.channels.has(channel)) {
      sendEvent(client, eventType, data);
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
      for (const [, client] of Array.from(clients.entries())) {
        sendEvent(client, "heartbeat", { timestamp: new Date().toISOString(), clients: clients.size });
      }
      return;
    }

    lastFeedHash = currentHash;

    const liveUpdate = {
      type: "intelligence-update",
      timestamp: new Date().toISOString(),
      opportunityScore: feed.opportunityScore,
      liveGames: feed.liveGames.map(g => ({
        id: g.id,
        sport: g.sport,
        shortName: g.shortName,
        homeTeam: { name: g.homeTeam.name, abbreviation: g.homeTeam.abbreviation, score: g.homeTeam.score },
        awayTeam: { name: g.awayTeam.name, abbreviation: g.awayTeam.abbreviation, score: g.awayTeam.score },
        status: g.status,
        momentum: g.momentum,
      })),
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

  } catch (err) {
    logError("[SSE] Failed to push intelligence update", { error: String(err) });
  }
}

export function startSSEBroadcaster(): void {
  if (broadcastInterval) return;
  console.log("[SSE] Starting SSE broadcaster (15s interval)...");
  broadcastInterval = setInterval(pushIntelligenceUpdate, 15_000);

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
  return {
    activeClients: clients.size,
    totalEventsSent: eventCounter,
    clientDetails: Array.from(clients.values()).map(c => ({
      id: c.id,
      channels: Array.from(c.channels),
      connectedFor: `${Math.round((Date.now() - c.connectedAt) / 1000)}s`,
      lastEventId: c.lastEventId,
    })),
  };
}


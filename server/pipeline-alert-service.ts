import fs from "fs";
import path from "path";

export interface PipelineAlert {
  id: string;
  nodeId: string;
  nodeLabel: string;
  previousStatus: string;
  currentStatus: string;
  triggeredAt: string;
  diagnosis: string | null;
  recommendations: string[];
  priority: "low" | "medium" | "high" | "critical";
  acknowledged: boolean;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

const ALERT_FILE = path.join(process.cwd(), "pipeline-alerts.json");
const POLL_INTERVAL_MS = 60_000;

let alerts: PipelineAlert[] = [];
let previousStatuses: Record<string, string> = {};
let pollingTimer: ReturnType<typeof setInterval> | null = null;

function loadAlerts(): void {
  try {
    const raw = fs.readFileSync(ALERT_FILE, "utf-8");
    alerts = JSON.parse(raw);
  } catch {
    alerts = [];
  }
}

function saveAlerts(): void {
  try {
    fs.writeFileSync(ALERT_FILE, JSON.stringify(alerts, null, 2), "utf-8");
  } catch {}
}

export function getActiveAlerts(): PipelineAlert[] {
  return alerts.filter(a => !a.acknowledged && !a.resolvedAt);
}

export function getAllAlerts(): PipelineAlert[] {
  return [...alerts];
}

export function acknowledgeAlert(id: string): boolean {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return false;
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  saveAlerts();
  return true;
}

async function deriveNodeStatuses(): Promise<Record<string, { status: string; label: string }>> {
  const statuses: Record<string, { status: string; label: string }> = {};
  try {
    const { getDataPipelineHealth } = await import("./data-pipeline-health");
    const { isBDLAvailable } = await import("./balldontlie-provider");
    const { getFormCacheStatus } = await import("./teamHistoricalFormEngine");
    const { getInsightCacheSize } = await import("./pick-insight-engine");
    const { isOpenAIAvailable } = await import("./openaiClient");
    const dataSources = getDataPipelineHealth();
    const formStatus = getFormCacheStatus();
    const insightCacheSize = getInsightCacheSize();

    const sourceMap: Record<string, string> = {};
    for (const src of (dataSources.sources || [])) {
      sourceMap[src.id] = src.status;
    }

    const espn = sourceMap["espn"] || "unknown";
    const oddsApi = sourceMap["odds-api"] || "unknown";
    const bdl = sourceMap["bdl"] || (isBDLAvailable() ? "cached" : "offline");
    const nhl = sourceMap["nhl-stats"] || "cached";
    const mlb = sourceMap["mlb-stats"] || "cached";
    const apifootball = sourceMap["api-football"] || "unknown";
    const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY?.trim());

    let aiStatus: "live" | "degraded" | "offline" = isOpenAIAvailable() ? "live" : "offline";
    if (aiStatus === "live") {
      try {
        const raw = fs.readFileSync("ai-error-state.json", "utf-8");
        const aiState = JSON.parse(raw);
        if (aiState?.quota_exceeded) aiStatus = "offline";
        else if (aiState?.error_count > 0) aiStatus = "degraded";
      } catch {}
    }

    let precomputedCacheHasPicks = false;
    let precomputedTotalRuns = 0;
    let learningCycles = 0;
    let learningWeights = 0;

    try {
      const { getEngineStatus: getPredStatus } = await import("./precomputedPredictionsEngine");
      const ps = getPredStatus() as any;
      precomputedTotalRuns = ps?.totalRuns ?? 0;
      const cache = ps?.cacheStatus ?? {};
      precomputedCacheHasPicks = Object.values(cache).some((v: any) => v?.hasPicks === true);
    } catch {}

    try {
      const { getLearningStats: getLearnStats } = await import("./learningEngine");
      const ls = await getLearnStats();
      learningCycles = ls?.cyclesCompleted ?? 0;
      learningWeights = ls?.modelWeights?.length ?? 0;
    } catch {}

    const usmlStatus = (learningCycles > 0 || learningWeights > 0) ? "live" : "cached";
    const lifeChangerStatus = (precomputedCacheHasPicks && precomputedTotalRuns > 0) ? "live" : "cached";
    const commandCenterStatus = precomputedCacheHasPicks
      ? (stripeConfigured ? "live" : "degraded")
      : "cached";

    const nodeMap: Record<string, { status: string; label: string }> = {
      "espn":           { status: espn, label: "ESPN Live" },
      "odds-api":       { status: oddsApi, label: "The Odds API" },
      "bdl":            { status: bdl, label: "BallDontLie" },
      "nhl-stats":      { status: nhl, label: "NHL Stats API" },
      "mlb-stats":      { status: mlb, label: "MLB Stats API" },
      "api-football":   { status: apifootball, label: "API-Football" },
      "openai":         { status: aiStatus, label: "OpenAI GPT-4o" },
      "precomputed":    { status: precomputedCacheHasPicks ? "live" : "cached", label: "Predictions Engine" },
      "intel-hub":      { status: espn === "live" || oddsApi === "live" ? "live" : "degraded", label: "Intelligence Hub" },
      "team-form":      { status: formStatus.totalTeams > 0 ? "live" : "cached", label: "Team Form Engine" },
      "situational":    { status: espn, label: "Situational Analysis" },
      "two-way":        { status: bdl, label: "Two-Way Intelligence" },
      "vegas-engine":   { status: precomputedCacheHasPicks ? "live" : "cached", label: "Vegas Engine" },
      "mma-engine":     { status: oddsApi, label: "MMA/UFC Engine" },
      "intl-sports":    { status: apifootball, label: "Intl Sports Engine" },
      "pick-insight":   { status: insightCacheSize > 0 ? "live" : (aiStatus === "live" ? "cached" : "offline"), label: "Pick Insight Engine" },
      "correlation":    { status: precomputedCacheHasPicks ? "live" : "cached", label: "Correlation Engine" },
      "usml":           { status: usmlStatus, label: "USML Meta-Learner" },
      "life-changer":   { status: lifeChangerStatus, label: "Daily Edge Parlay" },
      "command-center": { status: commandCenterStatus, label: "Command Center" },
      "bet-slip":       { status: espn === "live" || precomputedCacheHasPicks ? "live" : "cached", label: "Bet Slip" },
      "ticket-vars":    { status: aiStatus === "live" ? "live" : "degraded", label: "Ticket Variations" },
      "daily-picks":    { status: precomputedCacheHasPicks ? "live" : "cached", label: "Daily Picks" },
      "odds-center":    { status: oddsApi, label: "Odds Center" },
      "player-props":   { status: espn === "live" ? "live" : "degraded", label: "Player Props Lab" },
      "cards-engine":   { status: precomputedCacheHasPicks ? "live" : "cached", label: "Sors Cards Engine" },
      "research-notes": { status: (precomputedCacheHasPicks || formStatus.totalTeams > 0) ? "live" : "cached", label: "Research Notes" },
    };

    return nodeMap;
  } catch (err) {
    console.error("[PipelineAlerts] Failed to derive node statuses:", err);
    return {};
  }
}

const PRIORITY_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  "espn":        "high",
  "odds-api":    "critical",
  "openai":      "high",
  "bdl":         "medium",
  "api-football":"medium",
  "precomputed": "critical",
  "intel-hub":   "high",
  "command-center": "critical",
  "ticket-vars": "medium",
};

function getPriority(nodeId: string, status: string): "low" | "medium" | "high" | "critical" {
  if (status === "offline") return PRIORITY_MAP[nodeId] ?? "high";
  if (status === "degraded") return PRIORITY_MAP[nodeId] === "critical" ? "high" : "medium";
  return "low";
}

async function runAIDiagnosis(nodeId: string, nodeLabel: string, status: string): Promise<{ diagnosis: string; recommendations: string[] }> {
  try {
    const { isOpenAIAvailable, createOpenAIClient } = await import("./openaiClient");
    if (!isOpenAIAvailable()) {
      return {
        diagnosis: `Node "${nodeLabel}" transitioned to ${status}. OpenAI is unavailable for auto-diagnosis — check API keys and node configuration manually.`,
        recommendations: ["Check the node configuration in environment secrets", "Restart the application workflow after fixing"],
      };
    }

    const openai = createOpenAIClient();
    const prompt = `You are a senior systems engineer for Sors Maxima, an elite sports betting intelligence platform.

Pipeline alert: Node "${nodeLabel}" (ID: ${nodeId}) has changed status to "${status}".

Node descriptions:
- espn: ESPN free API for live scores, rosters, injuries
- odds-api: The Odds API for real-time betting lines (requires THE_ODDS_API_KEY)
- openai: OpenAI GPT-4o for AI insights (requires OPENAI_API_KEY)
- bdl: BallDontLie for NBA/NFL/MLB stats (requires BALLDONTLIE_API_KEY)
- api-football: International soccer data (requires API_FOOTBALL_KEY)
- precomputed: 46-factor predictions engine
- intel-hub: 60-second unified data aggregation cycle
- command-center: Admin dashboard + Stripe payments (requires STRIPE_SECRET_KEY)
- team-form: Historical team performance engine
- pick-insight: AI-powered pick analysis
- ticket-vars: AI ticket variation generator
- correlation: Parlay conflict detection
- usml: Meta-learning ensemble model
- life-changer / daily-picks: Daily edge parlay generator

Respond with VALID JSON only (no markdown):
{
  "diagnosis": "<one clear sentence explaining why this node is ${status} and what it means for users>",
  "recommendations": ["<specific fix step 1>", "<specific fix step 2>", "<specific fix step 3 if needed>"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      diagnosis: result.diagnosis || `Node "${nodeLabel}" is ${status}.`,
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    };
  } catch {
    return {
      diagnosis: `Node "${nodeLabel}" transitioned to ${status}. Auto-diagnosis unavailable.`,
      recommendations: [],
    };
  }
}

async function runAlertCycle(): Promise<void> {
  try {
    const currentStatuses = await deriveNodeStatuses();

    for (const [nodeId, { status, label }] of Object.entries(currentStatuses)) {
      const prev = previousStatuses[nodeId];

      if (prev && prev !== status) {
        const worsened = (prev === "live" && (status === "offline" || status === "degraded" || status === "cached"))
          || (prev === "cached" && status === "offline")
          || (prev === "degraded" && status === "offline");

        const recovered = (status === "live" && prev !== "live");

        if (recovered) {
          const openAlerts = alerts.filter(a => a.nodeId === nodeId && !a.resolvedAt && !a.acknowledged);
          for (const alert of openAlerts) {
            alert.resolvedAt = new Date().toISOString();
          }
          if (openAlerts.length > 0) {
            saveAlerts();
            console.log(`[PipelineAlerts] Node ${nodeId} recovered to "live" — ${openAlerts.length} alert(s) auto-resolved`);
          }
        }

        if (worsened) {
          const existingOpen = alerts.find(a => a.nodeId === nodeId && !a.resolvedAt && !a.acknowledged);
          if (!existingOpen) {
            console.log(`[PipelineAlerts] Node ${nodeId} degraded: ${prev} → ${status}. Running AI diagnosis...`);
            const { diagnosis, recommendations } = await runAIDiagnosis(nodeId, label, status);
            const newAlert: PipelineAlert = {
              id: `alert-${nodeId}-${Date.now()}`,
              nodeId,
              nodeLabel: label,
              previousStatus: prev,
              currentStatus: status,
              triggeredAt: new Date().toISOString(),
              diagnosis,
              recommendations,
              priority: getPriority(nodeId, status),
              acknowledged: false,
            };
            alerts.unshift(newAlert);
            alerts = alerts.slice(0, 100);
            saveAlerts();
            console.log(`[PipelineAlerts] Alert created for ${label}: ${status} (${newAlert.priority})`);
          }
        }
      }

      previousStatuses[nodeId] = status;
    }
  } catch (err) {
    console.error("[PipelineAlerts] Alert cycle error:", err);
  }
}

export function startAlertPolling(): void {
  loadAlerts();
  console.log(`[PipelineAlerts] Starting pipeline alert monitor (${POLL_INTERVAL_MS / 1000}s interval)`);

  runAlertCycle().catch(() => {});

  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    runAlertCycle().catch(() => {});
  }, POLL_INTERVAL_MS);
}

export function stopAlertPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

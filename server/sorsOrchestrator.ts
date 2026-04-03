// ═══════════════════════════════════════════════════════════════════════════
// SORS INTELLIGENCE ORCHESTRATOR — Mother AI
// The central hub that all agents report to. Classifies every signal and
// routes it: user-critical → companion_alert SSE events, admin-critical →
// admin dashboard log, both → both channels.
// ═══════════════════════════════════════════════════════════════════════════

import { logInfo, logWarn } from "./errorLogger";
import { broadcastEvent } from "./sseManager";
import { createOpenAIClient, isOpenAIAvailable } from "./openaiClient";
import { getAiAvailability } from "./aiErrorTracker";

export type SignalRouting = "user_alert" | "admin_alert" | "both";

export interface OrchestratorSignal {
  id: string;
  timestamp: string;
  sourceAgent: "autonomous_admin" | "analytics_agent" | "pick_insight" | "sharp_detector" | "system";
  category: "sharp_money" | "steam_move" | "arbitrage" | "system_health" | "model_performance" | "api_budget" | "memory" | "ai_status" | "data_freshness" | "odds_alert" | "pick_grade";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  routing?: SignalRouting;
  classifiedAt?: string;
  previewLine?: string;
}

export interface OrchestratorLogEntry {
  id: string;
  timestamp: string;
  sourceAgent: string;
  signalSummary: string;
  classification: SignalRouting;
  previewLine: string;
  severity: string;
  category: string;
  broadcastedAt: string | null;
}

const MAX_LOG_ENTRIES = 200;
const signalLog: OrchestratorLogEntry[] = [];
let signalCounter = 0;

function generateSignalId(): string {
  signalCounter++;
  return `orch_${Date.now()}_${signalCounter}`;
}

// Rule-based fast classification (no AI needed for well-known categories)
function classifyByRule(signal: OrchestratorSignal): SignalRouting | null {
  const { category, severity, sourceAgent } = signal;

  // Always user-facing: sharp money, steam moves, arbitrage, high-grade picks
  if (category === "sharp_money" || category === "steam_move" || category === "arbitrage" || category === "pick_grade") {
    return "user_alert";
  }

  // Always admin-only: system internals
  if (category === "system_health" || category === "memory" || category === "ai_status" || category === "data_freshness" || category === "api_budget") {
    // Critical system issues might also benefit users (service degradation warning)
    if (severity === "critical") return "both";
    return "admin_alert";
  }

  // Model performance: critical → both, warning → admin
  if (category === "model_performance") {
    return severity === "critical" ? "both" : "admin_alert";
  }

  // Odds alerts from analytics agent → user
  if (category === "odds_alert") {
    return "user_alert";
  }

  return null; // needs AI classification
}

// Generate a short preview line for companion display
function buildPreviewLine(signal: OrchestratorSignal): string {
  const { category, title, detail } = signal;

  if (category === "sharp_money") {
    return `Sharp money detected — ${title.replace("Sharp Money:", "").trim()} · tap to ask me`;
  }
  if (category === "steam_move") {
    return `Steam move detected — ${title} · tap to learn more`;
  }
  if (category === "arbitrage") {
    return `Arbitrage window open — ${detail.slice(0, 60)}${detail.length > 60 ? "…" : ""} · ask me about it`;
  }
  if (category === "pick_grade") {
    return `New top-grade pick — ${title} · ask me for details`;
  }
  if (category === "odds_alert") {
    return `Odds alert — ${title} · ask me for analysis`;
  }
  return `New alert — ${title.slice(0, 70)}`;
}

// Optional AI-assisted classification for ambiguous signals
async function classifyWithAI(signal: OrchestratorSignal): Promise<SignalRouting> {
  if (!isOpenAIAvailable() || !getAiAvailability().available) {
    return "admin_alert"; // safe default
  }

  try {
    const openai = createOpenAIClient();
    const prompt = `You are the Sors Intelligence Orchestrator. Classify this signal routing.

Signal:
- Source: ${signal.sourceAgent}
- Category: ${signal.category}
- Severity: ${signal.severity}
- Title: ${signal.title}
- Detail: ${signal.detail.slice(0, 200)}

Routing options:
- "user_alert": Important for active bettors right now (sharp money, arbitrage, live odds anomaly, top pick available)
- "admin_alert": Operational/system concern for admin only (API budget, memory, model drift, pipeline health)
- "both": Critical enough to warn users AND admin (severe system degradation, model failure)

Respond with ONLY one of: user_alert, admin_alert, both`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0,
    });

    const result = resp.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (result === "user_alert" || result === "admin_alert" || result === "both") {
      return result as SignalRouting;
    }
    return "admin_alert";
  } catch {
    return "admin_alert";
  }
}

// Main orchestrator emit function — all agents call this
export async function orchestratorEmit(signal: Omit<OrchestratorSignal, "id" | "timestamp">): Promise<void> {
  const fullSignal: OrchestratorSignal = {
    id: generateSignalId(),
    timestamp: new Date().toISOString(),
    ...signal,
  };

  try {
    // Step 1: Classify routing
    let routing = classifyByRule(fullSignal);
    if (!routing) {
      routing = await classifyWithAI(fullSignal);
    }
    fullSignal.routing = routing;
    fullSignal.classifiedAt = new Date().toISOString();

    // Step 2: Build preview line for user-facing signals
    const previewLine = (routing === "user_alert" || routing === "both")
      ? buildPreviewLine(fullSignal)
      : "";
    fullSignal.previewLine = previewLine;

    // Step 3: Log to orchestrator routing log
    const logEntry: OrchestratorLogEntry = {
      id: fullSignal.id,
      timestamp: fullSignal.timestamp,
      sourceAgent: fullSignal.sourceAgent,
      signalSummary: fullSignal.title,
      classification: routing,
      previewLine,
      severity: fullSignal.severity,
      category: fullSignal.category,
      broadcastedAt: null,
    };

    // Step 4: Route to appropriate channel(s)
    if (routing === "user_alert" || routing === "both") {
      broadcastEvent("companion_alert", {
        type: "companion_alert",
        timestamp: fullSignal.timestamp,
        id: fullSignal.id,
        category: fullSignal.category,
        severity: fullSignal.severity,
        title: fullSignal.title,
        previewLine,
        detail: fullSignal.detail,
      });
      logEntry.broadcastedAt = new Date().toISOString();
      logInfo(`[Orchestrator] → user SSE: [${fullSignal.category}] ${fullSignal.title}`);
    }

    if (routing === "admin_alert" || routing === "both") {
      // Admin signals go to the log (admin dashboard polls this)
      logInfo(`[Orchestrator] → admin log: [${fullSignal.category}] ${fullSignal.title}`);
    }

    signalLog.unshift(logEntry);
    if (signalLog.length > MAX_LOG_ENTRIES) signalLog.length = MAX_LOG_ENTRIES;

  } catch (err: any) {
    logWarn(`[Orchestrator] Failed to process signal: ${err.message}`);
    // Still log even on failure
    signalLog.unshift({
      id: fullSignal.id,
      timestamp: fullSignal.timestamp,
      sourceAgent: fullSignal.sourceAgent,
      signalSummary: fullSignal.title,
      classification: "admin_alert",
      previewLine: "",
      severity: fullSignal.severity,
      category: fullSignal.category,
      broadcastedAt: null,
    });
    if (signalLog.length > MAX_LOG_ENTRIES) signalLog.length = MAX_LOG_ENTRIES;
  }
}

export function getOrchestratorLog(): OrchestratorLogEntry[] {
  return [...signalLog];
}

export function getOrchestratorStats() {
  const total = signalLog.length;
  const userAlerts = signalLog.filter(e => e.classification === "user_alert").length;
  const adminAlerts = signalLog.filter(e => e.classification === "admin_alert").length;
  const bothAlerts = signalLog.filter(e => e.classification === "both").length;
  const broadcasted = signalLog.filter(e => e.broadcastedAt !== null).length;
  const lastSignal = signalLog[0]?.timestamp || null;

  return { total, userAlerts, adminAlerts, bothAlerts, broadcasted, lastSignal };
}

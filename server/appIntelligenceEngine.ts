/**
 * App Intelligence Engine
 *
 * Autonomous system that continuously learns about the application itself:
 * 1. DISCOVERY  — Scans pages, server engines, and route groups every cycle
 * 2. DETECTION  — Identifies new features added since the last cycle
 * 3. REGISTRY   — Auto-registers every feature for monitoring coverage
 * 4. AI INSIGHT — Uses GPT-4o-mini to analyze the platform and generate growth / health insights
 * 5. PIPELINE   — Feeds pipeline coverage data for the admin Connection Map
 */

import * as fs from "fs";
import * as path from "path";
import { logInfo } from "./errorLogger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiscoveredFeature {
  id: string;
  name: string;
  type: "page" | "engine" | "route-group";
  path: string;
  firstSeen: string;
  lastSeen: string;
  isNew: boolean;
  description?: string;
}

export interface AIInsight {
  id: string;
  timestamp: string;
  category: "discovery" | "health" | "growth" | "recommendation" | "performance";
  title: string;
  summary: string;
  priority: "low" | "medium" | "high" | "critical";
  actionItems: string[];
}

interface IntelligenceState {
  features: Record<string, DiscoveredFeature>;
  insights: AIInsight[];
  cycleCount: number;
  lastCycle: string;
  bootstrapped: boolean;
}

// ── State ─────────────────────────────────────────────────────────────────────

const STATE_FILE = path.join(process.cwd(), "app-intelligence-state.json");

let state: IntelligenceState = {
  features: {},
  insights: [],
  cycleCount: 0,
  lastCycle: "",
  bootstrapped: false,
};

let engineRunning = false;
let nextCycleMs = 0;

function loadState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch {}
}

function saveState(): void {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ ...state, insights: state.insights.slice(0, 60) }, null, 2)
    );
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function humanizeName(slug: string): string {
  return slug
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Discovery Scanners ────────────────────────────────────────────────────────

function scanPages(): DiscoveredFeature[] {
  const dir = path.join(process.cwd(), "client/src/pages");
  const now = new Date().toISOString();
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && !f.startsWith("_"))
      .map((file) => {
        const slug = file.replace(".tsx", "");
        return {
          id: `page:${slug}`,
          name: humanizeName(slug),
          type: "page" as const,
          path: `client/src/pages/${file}`,
          firstSeen: now,
          lastSeen: now,
          isNew: false,
        };
      });
  } catch {
    return [];
  }
}

function scanEngines(): DiscoveredFeature[] {
  const dir = path.join(process.cwd(), "server");
  const now = new Date().toISOString();
  const re = /Engine|Learner|Pipeline|Provider|Analyzer|Optimizer|Orchestrator|Detector|Tracker|Agent/;
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && re.test(f) && !f.startsWith("index"))
      .map((file) => {
        const slug = file.replace(".ts", "");
        return {
          id: `engine:${slug}`,
          name: humanizeName(slug),
          type: "engine" as const,
          path: `server/${file}`,
          firstSeen: now,
          lastSeen: now,
          isNew: false,
        };
      });
  } catch {
    return [];
  }
}

function scanRouteGroups(): DiscoveredFeature[] {
  const dir = path.join(process.cwd(), "server/routes");
  const now = new Date().toISOString();
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((file) => {
        const slug = file.replace(".ts", "");
        return {
          id: `route:${slug}`,
          name: humanizeName(slug) + " API",
          type: "route-group" as const,
          path: `server/routes/${file}`,
          firstSeen: now,
          lastSeen: now,
          isNew: false,
        };
      });
  } catch {
    return [];
  }
}

function runDiscovery(): { newFeatures: DiscoveredFeature[]; removedFeatures: string[] } {
  const now = new Date().toISOString();
  const current = [...scanPages(), ...scanEngines(), ...scanRouteGroups()];
  const currentIds = new Set(current.map((f) => f.id));
  const previousIds = new Set(Object.keys(state.features));

  const newIds = [...currentIds].filter((id) => !previousIds.has(id));
  const removedIds = [...previousIds].filter((id) => !currentIds.has(id));

  for (const feature of current) {
    if (state.features[feature.id]) {
      state.features[feature.id].lastSeen = now;
      state.features[feature.id].isNew = false;
    } else {
      state.features[feature.id] = {
        ...feature,
        firstSeen: now,
        isNew: state.bootstrapped,
      };
    }
  }

  for (const id of removedIds) {
    delete state.features[id];
  }

  const newFeatures = current.filter((f) => newIds.includes(f.id));
  return { newFeatures, removedFeatures: removedIds };
}

// ── AI Analysis ───────────────────────────────────────────────────────────────

async function runAIAnalysis(newFeatures: DiscoveredFeature[]): Promise<AIInsight[]> {
  const now = new Date().toISOString();
  const generated: AIInsight[] = [];

  if (newFeatures.length > 0) {
    generated.push({
      id: `discovery-${Date.now()}`,
      timestamp: now,
      category: "discovery",
      title: `${newFeatures.length} New Feature${newFeatures.length > 1 ? "s" : ""} Auto-Registered`,
      summary: `Discovery engine detected and added to monitoring: ${newFeatures.map((f) => f.name).join(", ")}.`,
      priority: "medium",
      actionItems: [
        ...newFeatures.map((f) => `Verify ${f.name} (${f.type}) is covered in pipeline monitoring`),
        "Review new additions in the Feature Registry tab",
      ],
    });
  }

  try {
    const { isOpenAIAvailable, createOpenAIClient } = await import("./openaiClient");
    if (!isOpenAIAvailable()) throw new Error("OpenAI unavailable");

    const openai = createOpenAIClient();
    const features = Object.values(state.features);
    const summary = {
      platform: "Sors Maxima — Sports Betting Intelligence",
      totalFeatures: features.length,
      pages: features.filter((f) => f.type === "page").length,
      engines: features.filter((f) => f.type === "engine").length,
      routeGroups: features.filter((f) => f.type === "route-group").length,
      newThisCycle: newFeatures.map((f) => ({ name: f.name, type: f.type })),
      cycleCount: state.cycleCount + 1,
    };

    const { getPipelineHealth } = await import("./predictionPipelineEngine");
    const ph = getPipelineHealth();
    const runtime = {
      pipelineRuns: ph.totalRuns,
      picksGenerated: ph.metrics?.picksGenerated ?? 0,
      gamesAnalyzed: ph.metrics?.gamesAnalyzed ?? 0,
    };

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are the Sors Maxima App Intelligence Engine. Sors Maxima is an exclusive members-only sports betting intelligence platform with tiers: Sharp ($49/mo), Edge ($99/mo), Max ($249/mo). Key proprietary features include: Cashout Engineering™ (Sportsbook Sweat™ — anchor + pressure leg strategy; Lock & Roll™ — progressive partial cashouts; Steam Exit™ — CLV line-movement exits), Collectible Intelligence Cards (trading card system with S+/A+/A/B+/B/C+/C rarity grades), SSE Live Feed for real-time scores and odds, the 46-Factor Model prediction engine, Research Notes, Sors Books Hub, and a Life-Changing Ticket (LCT) daily parlay. The platform uses 'Sors Lexicon™' branding — never expose internal engine names to members. Analyze the platform state and return 2-3 concise, actionable insights to help the platform grow and stay healthy. Output valid JSON array only.",
        },
        {
          role: "user",
          content: `Platform state:\n${JSON.stringify({ ...summary, ...runtime }, null, 2)}\n\nGenerate 2-3 insights:\n[{"category":"health|growth|recommendation|performance","title":"short title","summary":"1-2 sentences","priority":"low|medium|high","actionItems":["action"]}]`,
        },
      ],
    });

    const raw = (resp.choices[0]?.message?.content ?? "[]")
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(raw);
    for (const item of Array.isArray(parsed) ? parsed : []) {
      generated.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        category: item.category ?? "recommendation",
        title: item.title ?? "Platform Insight",
        summary: item.summary ?? "",
        priority: item.priority ?? "low",
        actionItems: Array.isArray(item.actionItems) ? item.actionItems : [],
      });
    }
  } catch {
    generated.push({
      id: `cycle-${Date.now()}`,
      timestamp: now,
      category: "health",
      title: `Learning Cycle #${state.cycleCount + 1} Complete`,
      summary: `App Intelligence Engine scanned ${Object.keys(state.features).length} features. AI analysis deferred — circuit breaker may be active.`,
      priority: "low",
      actionItems: ["Check AI quota status in the API Budget dashboard"],
    });
  }

  return generated;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function runIntelligenceCycle(): Promise<{
  insights: AIInsight[];
  newFeatures: DiscoveredFeature[];
  removedFeatures: string[];
}> {
  loadState();
  const { newFeatures, removedFeatures } = runDiscovery();
  const insights = await runAIAnalysis(newFeatures);

  state.insights = [...insights, ...state.insights].slice(0, 60);
  state.cycleCount++;
  state.lastCycle = new Date().toISOString();
  state.bootstrapped = true;
  saveState();

  logInfo(
    `[AppIntelligence] Cycle #${state.cycleCount} — ${Object.keys(state.features).length} features, ${newFeatures.length} new, ${insights.length} insights generated`
  );

  return { insights, newFeatures, removedFeatures };
}

export function getAppIntelligenceStatus() {
  loadState();
  const features = Object.values(state.features);
  return {
    running: engineRunning,
    cycleCount: state.cycleCount,
    lastCycle: state.lastCycle,
    nextCycleMs,
    bootstrapped: state.bootstrapped,
    featuresTracked: features.length,
    featuresByType: {
      pages: features.filter((f) => f.type === "page").length,
      engines: features.filter((f) => f.type === "engine").length,
      routeGroups: features.filter((f) => f.type === "route-group").length,
    },
    newSinceLastCycle: features.filter((f) => f.isNew).length,
    recentInsights: state.insights.slice(0, 10),
    allInsights: state.insights,
    features,
  };
}

export function startAppIntelligenceEngine(): void {
  if (engineRunning) return;
  engineRunning = true;
  loadState();

  setTimeout(() => {
    runIntelligenceCycle().catch(() => {});
  }, 45_000);

  setInterval(() => {
    runIntelligenceCycle().catch(() => {});
    nextCycleMs = Date.now() + 60 * 60 * 1000;
  }, 60 * 60 * 1000);

  nextCycleMs = Date.now() + 60 * 60 * 1000;
  logInfo("[AppIntelligence] Engine started — hourly discovery + AI analysis cycles active");
}

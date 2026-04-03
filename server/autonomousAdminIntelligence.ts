import fs from "fs";
import path from "path";
import { getHeapStatistics } from "v8";
import { logInfo, logWarn, logError } from "./errorLogger";
import { getAiAvailability, recordAiError, recordAiSuccess } from "./aiErrorTracker";
import { createOpenAIClient, isOpenAIAvailable } from "./openaiClient";
import { appGuardian } from "./appGuardianEngine";
import { getPickAccuracyStats, getPickTrackerStatus } from "./pickOutcomeTracker";
import { getCacheStats } from "./responseCache";
import { apiBudgetOptimizer } from "./apiBudgetOptimizer";
import { getHubStatus } from "./unifiedIntelligenceHub";
import { collectRunContext } from "./adminAssistantEngine";
import { orchestratorEmit } from "./sorsOrchestrator";

const STATE_FILE = path.join(process.cwd(), "autonomous-admin-state.json");
const MAX_ALERTS = 100;
const MAX_REPORTS = 20;
const QUICK_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DEEP_ANALYSIS_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type AlertSeverity = "critical" | "warning" | "info";

export interface AutonomousAlert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  detail: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  checkType: "quick" | "deep";
}

export interface QuickCheckMetrics {
  winRate: number | null;
  settledPicks: number;
  oddsApiRemaining: number | null;
  oddsApiStatus: string;
  guardianHealth: number;
  cacheHitRate: number;
  heapUsedMb: number;
  heapTotalMb: number;
  hubLastCycleMs: number | null;
  aiCircuitOpen: boolean;
}

export interface QuickCheckResult {
  timestamp: string;
  durationMs: number;
  newAlertCount: number;
  metrics: QuickCheckMetrics;
  overallStatus: "healthy" | "warning" | "critical";
}

export interface DeepReport {
  id: string;
  timestamp: string;
  durationMs: number;
  summary: string[];
  priority_tasks: Array<{
    title: string;
    description: string;
    priority: "P1" | "P2" | "P3";
    due_by: string;
    effort_hours: number;
  }>;
  risk_alerts: Array<{
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  ops_checklist: {
    today: string[];
    this_week: string[];
  };
  health_snapshot: QuickCheckMetrics | null;
  raw: string;
  error?: string;
}

interface PersistedState {
  alerts: AutonomousAlert[];
  reports: DeepReport[];
  lastQuickCheck: string | null;
  lastDeepCheck: string | null;
  totalQuickChecks: number;
  totalDeepChecks: number;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

class AutonomousAdminIntelligence {
  private running = false;
  private alerts: AutonomousAlert[] = [];
  private reports: DeepReport[] = [];
  private lastQuickCheck: QuickCheckResult | null = null;
  private lastDeepCheck: DeepReport | null = null;
  private quickCheckCount = 0;
  private deepCheckCount = 0;
  private quickInterval: NodeJS.Timeout | null = null;
  private deepInterval: NodeJS.Timeout | null = null;
  private startedAt: string | null = null;

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, "utf-8");
        const state: PersistedState = JSON.parse(raw);
        this.alerts = state.alerts || [];
        this.reports = state.reports || [];
        this.quickCheckCount = state.totalQuickChecks || 0;
        this.deepCheckCount = state.totalDeepChecks || 0;
        this.lastDeepCheck = this.reports[0] || null;
        logInfo(`[AutoAdmin] Loaded state — ${this.alerts.filter(a => !a.resolved).length} active alerts, ${this.reports.length} reports`);
      }
    } catch (err) {
      logWarn("[AutoAdmin] Could not load persisted state:", (err as Error).message);
    }
  }

  private saveState() {
    try {
      const state: PersistedState = {
        alerts: this.alerts.slice(0, MAX_ALERTS),
        reports: this.reports.slice(0, MAX_REPORTS),
        lastQuickCheck: this.lastQuickCheck?.timestamp || null,
        lastDeepCheck: this.lastDeepCheck?.timestamp || null,
        totalQuickChecks: this.quickCheckCount,
        totalDeepChecks: this.deepCheckCount,
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (err) {
      logWarn("[AutoAdmin] Could not save state:", (err as Error).message);
    }
  }

  private addAlert(alert: Omit<AutonomousAlert, "id" | "timestamp" | "resolved">): AutonomousAlert {
    const newAlert: AutonomousAlert = {
      id: generateId("alert"),
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alert,
    };
    this.alerts.unshift(newAlert);
    if (this.alerts.length > MAX_ALERTS) this.alerts.length = MAX_ALERTS;

    // Route critical/warning alerts through the Orchestrator
    const categoryMap: Record<string, any> = {
      model_performance: "model_performance",
      api_budget: "api_budget",
      system_health: "system_health",
      memory: "memory",
      ai_status: "ai_status",
      data_freshness: "data_freshness",
    };
    const orchCategory = categoryMap[alert.category] || "system_health";
    orchestratorEmit({
      sourceAgent: "autonomous_admin",
      category: orchCategory,
      severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info",
      title: alert.title,
      detail: alert.detail,
    }).catch(() => {});

    return newAlert;
  }

  private autoResolve(category: string, title: string) {
    const existing = this.alerts.find(a => !a.resolved && a.category === category && a.title === title);
    if (existing) {
      existing.resolved = true;
      existing.resolvedAt = new Date().toISOString();
    }
  }

  private getActiveAlerts(): AutonomousAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  private collectMetrics(): QuickCheckMetrics {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);

    let winRate: number | null = null;
    let settledPicks = 0;
    try {
      const stats = getPickAccuracyStats();
      settledPicks = stats.overall.total;
      if (stats.overall.won + stats.overall.lost > 0) {
        winRate = Math.round((stats.overall.won / (stats.overall.won + stats.overall.lost)) * 1000) / 10;
      }
    } catch { /* non-critical */ }

    let oddsApiRemaining: number | null = null;
    let oddsApiStatus = "unknown";
    try {
      const opt = apiBudgetOptimizer.getOptimization("odds");
      oddsApiRemaining = opt.remaining;
      oddsApiStatus = opt.status;
    } catch { /* non-critical */ }

    let guardianHealth = 100;
    try {
      const gs = appGuardian.getStatus();
      guardianHealth = gs.healthScore ?? 100;
    } catch { /* non-critical */ }

    let cacheHitRate = 0;
    try {
      const cs = getCacheStats();
      cacheHitRate = cs.hitRate ?? 0;
    } catch { /* non-critical */ }

    let hubLastCycleMs: number | null = null;
    try {
      const hub = getHubStatus();
      if (hub.lastCycleTimeMs != null) {
        hubLastCycleMs = hub.lastCycleTimeMs;
      }
    } catch { /* non-critical */ }

    const aiCircuitOpen = !getAiAvailability().available;

    return {
      winRate,
      settledPicks,
      oddsApiRemaining,
      oddsApiStatus,
      guardianHealth,
      cacheHitRate,
      heapUsedMb,
      heapTotalMb,
      hubLastCycleMs,
      aiCircuitOpen,
    };
  }

  async runQuickCheck(): Promise<QuickCheckResult> {
    const start = Date.now();
    this.quickCheckCount++;
    const newAlerts: AutonomousAlert[] = [];

    const m = this.collectMetrics();

    const addIf = (condition: boolean, alert: Omit<AutonomousAlert, "id" | "timestamp" | "resolved">, resolveTitle?: string) => {
      if (condition) {
        newAlerts.push(this.addAlert(alert));
      } else if (resolveTitle) {
        this.autoResolve(alert.category, resolveTitle);
      }
    };

    // Win rate checks
    if (m.winRate !== null && m.settledPicks >= 50) {
      if (m.winRate < 48) {
        addIf(true, {
          severity: "critical",
          category: "model_performance",
          title: "Win Rate Critical — Below 48%",
          detail: `Win rate ${m.winRate}% over ${m.settledPicks} picks. Break-even is 52.4%. Immediate review needed.`,
          checkType: "quick",
        });
        this.autoResolve("model_performance", "Win Rate Below Break-Even");
      } else if (m.winRate < 52.4) {
        this.autoResolve("model_performance", "Win Rate Critical — Below 48%");
        addIf(true, {
          severity: "warning",
          category: "model_performance",
          title: "Win Rate Below Break-Even",
          detail: `Win rate ${m.winRate}% over ${m.settledPicks} picks. Break-even for -110 bets is 52.4%.`,
          checkType: "quick",
        });
      } else {
        this.autoResolve("model_performance", "Win Rate Critical — Below 48%");
        this.autoResolve("model_performance", "Win Rate Below Break-Even");
      }
    }

    // Odds API budget
    if (m.oddsApiRemaining !== null) {
      if (m.oddsApiRemaining < 10000) {
        addIf(true, {
          severity: "critical",
          category: "api_budget",
          title: "Odds API Critical — Under 10K Requests",
          detail: `Only ${m.oddsApiRemaining.toLocaleString()} requests remain. Live odds will stop if exhausted.`,
          checkType: "quick",
        });
        this.autoResolve("api_budget", "Odds API Below 50K Requests");
      } else if (m.oddsApiRemaining < 50000) {
        this.autoResolve("api_budget", "Odds API Critical — Under 10K Requests");
        addIf(true, {
          severity: "warning",
          category: "api_budget",
          title: "Odds API Below 50K Requests",
          detail: `${m.oddsApiRemaining.toLocaleString()} requests remaining. Consider reducing polling frequency via API Budget settings.`,
          checkType: "quick",
        });
      } else {
        this.autoResolve("api_budget", "Odds API Critical — Under 10K Requests");
        this.autoResolve("api_budget", "Odds API Below 50K Requests");
      }
    }

    // Guardian health
    if (m.guardianHealth < 60) {
      addIf(true, {
        severity: "critical",
        category: "system_health",
        title: "System Health Critical",
        detail: `Guardian health score: ${m.guardianHealth}/100. Multiple systems may be degraded.`,
        checkType: "quick",
      });
      this.autoResolve("system_health", "System Health Degraded");
    } else if (m.guardianHealth < 80) {
      this.autoResolve("system_health", "System Health Critical");
      addIf(true, {
        severity: "warning",
        category: "system_health",
        title: "System Health Degraded",
        detail: `Guardian health score: ${m.guardianHealth}/100. Some services may be slow.`,
        checkType: "quick",
      });
    } else {
      this.autoResolve("system_health", "System Health Critical");
      this.autoResolve("system_health", "System Health Degraded");
    }

    // Memory — compare against the actual V8 heap size limit (set by --max-old-space-size),
    // NOT heapTotal. heapTotal is just V8's current allocation chunk and will be at 90%+
    // routinely as the GC manages it. The real OOM risk is heapUsed vs the hard limit.
    const heapLimitMb = Math.round(getHeapStatistics().heap_size_limit / 1024 / 1024);
    const heapPercent = heapLimitMb > 0 ? Math.round((m.heapUsedMb / heapLimitMb) * 100) : 0;
    if (heapPercent > 90) {
      addIf(true, {
        severity: "critical",
        category: "memory",
        title: "Memory Critical — Heap at 90%+",
        detail: `Heap: ${m.heapUsedMb}MB / ${heapLimitMb}MB limit (${heapPercent}%). OOM risk.`,
        checkType: "quick",
      });
    } else if (heapPercent > 75) {
      this.autoResolve("memory", "Memory Critical — Heap at 90%+");
      addIf(true, {
        severity: "warning",
        category: "memory",
        title: "Memory High — Heap at 75%+",
        detail: `Heap: ${m.heapUsedMb}MB / ${heapLimitMb}MB limit (${heapPercent}%).`,
        checkType: "quick",
      });
    } else {
      this.autoResolve("memory", "Memory Critical — Heap at 90%+");
      this.autoResolve("memory", "Memory High — Heap at 75%+");
    }

    // AI circuit breaker
    if (m.aiCircuitOpen) {
      const msg = getAiAvailability().message;
      addIf(true, {
        severity: "warning",
        category: "ai_status",
        title: "OpenAI Circuit Breaker Open",
        detail: `AI features suspended: ${msg}. Will auto-recover after cool-down.`,
        checkType: "quick",
      });
    } else {
      this.autoResolve("ai_status", "OpenAI Circuit Breaker Open");
    }

    // Hub staleness (> 10 min without a cycle)
    if (m.hubLastCycleMs !== null && m.hubLastCycleMs > 10 * 60 * 1000) {
      addIf(true, {
        severity: "warning",
        category: "data_freshness",
        title: "Intelligence Hub Stale",
        detail: `Last cycle was ${Math.round(m.hubLastCycleMs / 60000)}m ago. Expected every ~1 minute.`,
        checkType: "quick",
      });
    } else {
      this.autoResolve("data_freshness", "Intelligence Hub Stale");
    }

    const activeAlerts = this.getActiveAlerts();
    const overallStatus: QuickCheckResult["overallStatus"] =
      activeAlerts.some(a => a.severity === "critical") ? "critical" :
      activeAlerts.some(a => a.severity === "warning") ? "warning" : "healthy";

    const result: QuickCheckResult = {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      newAlertCount: newAlerts.length,
      metrics: m,
      overallStatus,
    };

    this.lastQuickCheck = result;

    if (newAlerts.length > 0) {
      logWarn(`[AutoAdmin] Quick #${this.quickCheckCount} — ${newAlerts.length} new alert(s) | status: ${overallStatus}`);
    } else {
      logInfo(`[AutoAdmin] Quick #${this.quickCheckCount} — all clear | ${activeAlerts.length} active | status: ${overallStatus}`);
    }

    this.saveState();
    return result;
  }

  async runDeepAnalysis(): Promise<DeepReport> {
    const start = Date.now();
    this.deepCheckCount++;
    const id = generateId("report");

    logInfo(`[AutoAdmin] Deep AI analysis #${this.deepCheckCount} starting...`);

    const metrics = this.lastQuickCheck?.metrics || this.collectMetrics();
    const activeAlerts = this.getActiveAlerts();

    const report: DeepReport = {
      id,
      timestamp: new Date().toISOString(),
      durationMs: 0,
      summary: [],
      priority_tasks: [],
      risk_alerts: [],
      ops_checklist: { today: [], this_week: [] },
      health_snapshot: metrics,
      raw: "",
    };

    const aiStatus = getAiAvailability();
    if (!isOpenAIAvailable() || !aiStatus.available) {
      report.error = `AI unavailable: ${aiStatus.message}`;
      report.summary = ["Deep AI analysis skipped — OpenAI circuit breaker is open. Lightweight monitoring continues every 30 minutes."];
      report.ops_checklist.today = [
        "Check OpenAI quota in your OpenAI dashboard",
        "Review active alerts in the admin panel",
        "Monitor system health score",
      ];
      report.durationMs = Date.now() - start;
      this.reports.unshift(report);
      this.lastDeepCheck = report;
      if (this.reports.length > MAX_REPORTS) this.reports.length = MAX_REPORTS;
      this.saveState();
      logWarn("[AutoAdmin] Deep analysis skipped — AI unavailable");
      return report;
    }

    try {
      const runCtx = collectRunContext("daily", "autonomous_agent");

      let budgetSummary: any = {};
      try {
        const dash = apiBudgetOptimizer.getDashboard();
        budgetSummary = {
          odds_api: dash.optimizations.find(o => o.service === "odds"),
          balldontlie: dash.optimizations.find(o => o.service === "balldontlie"),
          apifootball: dash.optimizations.find(o => o.service === "apifootball"),
          openai: dash.optimizations.find(o => o.service === "openai"),
          alerts: dash.alerts.filter(a => !a.dismissed).length,
        };
      } catch { /* ok */ }

      let pickStats: any = {};
      try { pickStats = getPickAccuracyStats(); } catch { /* ok */ }

      const payload = {
        generated_at: new Date().toISOString(),
        run_context: runCtx,
        realtime_metrics: {
          win_rate_percent: metrics.winRate,
          settled_picks: metrics.settledPicks,
          break_even_threshold: 52.4,
          heap_used_mb: metrics.heapUsedMb,
          heap_total_mb: metrics.heapTotalMb,
          cache_hit_rate_percent: metrics.cacheHitRate,
          hub_last_cycle_ms: metrics.hubLastCycleMs,
          guardian_health_score: metrics.guardianHealth,
          ai_circuit_open: metrics.aiCircuitOpen,
        },
        api_budget: budgetSummary,
        active_alerts: activeAlerts.map(a => ({
          severity: a.severity,
          category: a.category,
          title: a.title,
          detail: a.detail,
          since: a.timestamp,
        })),
        pick_accuracy: {
          overall: pickStats?.overall,
          byMarket: pickStats?.byMarket,
          recentTrend: pickStats?.recentTrend,
        },
      };

      const systemPrompt = `You are the Autonomous Operations Intelligence Agent for Sors Maxima, a members-only sports betting intelligence platform (Sharp $49/mo, Edge $99/mo, Max $249/mo). You run every 6 hours without human intervention.

Your job: analyze the real-time platform snapshot and generate a concise, prioritized admin briefing for jeffreywilliams (the sole owner). Be direct. Flag issues that need action.

Rules:
- Break-even for -110 bets = 52.4% win rate
- Odds API threshold: <50K requests = warning, <10K = critical
- Model degradation: win rate <48% over 200+ picks = critical
- Never expose vendor names (BallDontLie, The Odds API, ESPN) to members
- Never guarantee specific winnings or ROI

Respond with ONLY valid JSON (no markdown):
{
  "summary": ["2-4 bullet findings — most critical first"],
  "priority_tasks": [{"title":"string","description":"string — specific, actionable","priority":"P1|P2|P3","due_by":"today|this_week|this_month","effort_hours":number}],
  "risk_alerts": [{"title":"string","description":"string","severity":"critical|high|medium|low"}],
  "ops_checklist": {"today":["3-5 concrete tasks"],"this_week":["3-5 tasks"]}
}`;

      const openai = createOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Platform snapshot:\n\n${JSON.stringify(payload, null, 2)}` },
        ],
        max_completion_tokens: 2500,
      });

      recordAiSuccess();

      const raw = completion.choices[0]?.message?.content || "{}";
      report.raw = raw;

      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          summary: ["AI response received but could not be parsed as JSON."],
          priority_tasks: [],
          risk_alerts: [],
          ops_checklist: { today: [], this_week: [] },
        };
      }

      report.summary = Array.isArray(parsed.summary) ? parsed.summary : [];
      report.priority_tasks = Array.isArray(parsed.priority_tasks) ? parsed.priority_tasks : [];
      report.risk_alerts = Array.isArray(parsed.risk_alerts) ? parsed.risk_alerts : [];
      report.ops_checklist = {
        today: Array.isArray(parsed.ops_checklist?.today) ? parsed.ops_checklist.today : [],
        this_week: Array.isArray(parsed.ops_checklist?.this_week) ? parsed.ops_checklist.this_week : [],
      };

      const p1 = report.priority_tasks.filter(t => t.priority === "P1").length;
      logInfo(`[AutoAdmin] Deep #${this.deepCheckCount} complete — ${p1} P1 tasks, ${report.risk_alerts.length} risks`);

    } catch (err: any) {
      if (err?.status === 429 || err?.code === "insufficient_quota") {
        recordAiError(err);
      }
      report.error = err?.message || "Unknown error";
      report.summary = [`Deep analysis failed: ${report.error}`];
      logError(err, { context: "autonomous_admin_deep_analysis" });
    }

    report.durationMs = Date.now() - start;
    this.reports.unshift(report);
    this.lastDeepCheck = report;
    if (this.reports.length > MAX_REPORTS) this.reports.length = MAX_REPORTS;
    this.saveState();
    return report;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = new Date().toISOString();

    logInfo("[AutoAdmin] Autonomous Admin Intelligence Engine starting — quick checks every 30min, AI analysis every 6h");

    setTimeout(() => {
      this.runQuickCheck().catch(e => logError(e, { context: "auto_admin_initial_quick" }));
    }, 3 * 60 * 1000);

    setTimeout(() => {
      this.runDeepAnalysis().catch(e => logError(e, { context: "auto_admin_initial_deep" }));
    }, 12 * 60 * 1000);

    this.quickInterval = setInterval(() => {
      this.runQuickCheck().catch(e => logError(e, { context: "auto_admin_quick" }));
    }, QUICK_CHECK_INTERVAL_MS);

    this.deepInterval = setInterval(() => {
      this.runDeepAnalysis().catch(e => logError(e, { context: "auto_admin_deep" }));
    }, DEEP_ANALYSIS_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    if (this.quickInterval) { clearInterval(this.quickInterval); this.quickInterval = null; }
    if (this.deepInterval) { clearInterval(this.deepInterval); this.deepInterval = null; }
  }

  getStatus() {
    const active = this.getActiveAlerts();
    const overallStatus =
      active.some(a => a.severity === "critical") ? "critical" :
      active.some(a => a.severity === "warning") ? "warning" : "healthy";

    return {
      running: this.running,
      startedAt: this.startedAt,
      overallStatus,
      activeAlertCount: active.length,
      criticalCount: active.filter(a => a.severity === "critical").length,
      warningCount: active.filter(a => a.severity === "warning").length,
      totalQuickChecks: this.quickCheckCount,
      totalDeepChecks: this.deepCheckCount,
      lastQuickCheck: this.lastQuickCheck?.timestamp || null,
      lastDeepCheck: this.lastDeepCheck?.timestamp || null,
      lastQuickMetrics: this.lastQuickCheck?.metrics || null,
      lastQuickStatus: this.lastQuickCheck?.overallStatus || null,
      nextQuickCheck: this.lastQuickCheck
        ? new Date(new Date(this.lastQuickCheck.timestamp).getTime() + QUICK_CHECK_INTERVAL_MS).toISOString()
        : null,
      nextDeepCheck: this.lastDeepCheck
        ? new Date(new Date(this.lastDeepCheck.timestamp).getTime() + DEEP_ANALYSIS_INTERVAL_MS).toISOString()
        : null,
      latestSummary: this.lastDeepCheck?.summary || [],
      latestP1Tasks: (this.lastDeepCheck?.priority_tasks || []).filter(t => t.priority === "P1"),
    };
  }

  getAlerts(options: { includeResolved?: boolean; limit?: number } = {}) {
    const { includeResolved = false, limit = 50 } = options;
    const src = includeResolved ? this.alerts : this.getActiveAlerts();
    return src.slice(0, limit);
  }

  getReports(limit = 10) {
    return this.reports.slice(0, limit);
  }

  async triggerQuickCheck() {
    return this.runQuickCheck();
  }

  async triggerDeepAnalysis() {
    return this.runDeepAnalysis();
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) return false;
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.saveState();
    return true;
  }
}

export const autonomousAdminIntelligence = new AutonomousAdminIntelligence();

export function startAutonomousAdminIntelligence() {
  autonomousAdminIntelligence.start();
}

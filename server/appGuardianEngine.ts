import crypto from "crypto";
import { errorLogger, logError, logWarn, logInfo } from "./errorLogger";
import { db } from "./db";
import { sql } from "drizzle-orm";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

interface Alert {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  autoHealed?: boolean;
  healAction?: string;
  source: string;
}

interface Incident {
  id: string;
  startedAt: string;
  resolvedAt?: string;
  duration?: number;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedServices: string[];
  rootCause?: string;
  resolution?: string;
  autoHealed: boolean;
  alerts: string[];
}

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastCheck: string;
  responseTime?: number;
  errorCount: number;
  successRate: number;
  details?: string;
}

interface SystemVitals {
  memoryUsage: { used: number; total: number; percent: number };
  uptime: number;
  uptimeFormatted: string;
  nodeVersion: string;
  activeConnections: number;
  errorRate: number;
  avgResponseTime: number;
}

interface GuardianStatus {
  isRunning: boolean;
  startedAt: string | null;
  healthScore: number;
  overallStatus: "healthy" | "degraded" | "critical" | "unknown";
  vitals: SystemVitals;
  services: ServiceStatus[];
  activeAlerts: Alert[];
  recentIncidents: Incident[];
  checksPerformed: number;
  autoHealActions: number;
  lastFullScan: string | null;
  aiDiagnostics: AIDiagnostic[];
}

interface AIDiagnostic {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  finding: string;
  recommendation: string;
  autoFixable: boolean;
  fixApplied: boolean;
}

const MAX_ALERTS = 200;
const MAX_INCIDENTS = 100;
const MAX_DIAGNOSTICS = 50;

class AppGuardianEngine {
  private running = false;
  private startedAt: string | null = null;
  private alerts: Alert[] = [];
  private incidents: Incident[] = [];
  private services: Map<string, ServiceStatus> = new Map();
  private diagnostics: AIDiagnostic[] = [];
  private checksPerformed = 0;
  private autoHealActions = 0;
  private lastFullScan: string | null = null;
  private intervals: NodeJS.Timeout[] = [];
  private lastAIDiagnosticAt = 0;
  private errorCounts: Map<string, number[]> = new Map();
  private responseTimeSamples: number[] = [];

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = new Date().toISOString();
    logInfo("[Guardian] App Guardian Engine started - continuous monitoring active");

    this.intervals.push(setInterval(() => this.runHealthCheck(), 30_000));
    this.intervals.push(setInterval(() => this.runServiceChecks(), 60_000));
    this.intervals.push(setInterval(() => this.runErrorAnalysis(), 120_000));
    this.intervals.push(setInterval(() => this.runAIDiagnostics(), 300_000));
    this.intervals.push(setInterval(() => this.runAutoHeal(), 60_000));
    this.intervals.push(setInterval(() => this.pruneOldData(), 3600_000));

    setTimeout(() => {
      this.runHealthCheck();
      this.runServiceChecks();
    }, 5000);
  }

  stop() {
    this.running = false;
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];
    logInfo("[Guardian] App Guardian Engine stopped");
  }

  restart() {
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  private genId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private addAlert(
    severity: Alert["severity"],
    category: string,
    title: string,
    message: string,
    source: string
  ): Alert {
    const existing = this.alerts.find(
      a => !a.resolved && a.category === category && a.title === title
    );
    if (existing) return existing;

    const alert: Alert = {
      id: this.genId("alert"),
      severity, category, title, message,
      timestamp: new Date().toISOString(),
      resolved: false,
      source,
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > MAX_ALERTS) this.alerts = this.alerts.slice(0, MAX_ALERTS);

    if (severity === "critical" || severity === "high") {
      logWarn(`[Guardian ALERT] [${severity.toUpperCase()}] ${title}: ${message}`);
    }

    return alert;
  }

  resolveAlert(alertId: string, autoHealed = false, healAction?: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.autoHealed = autoHealed;
      alert.healAction = healAction;
    }
  }

  resolveAlertsByCategory(category: string, autoHealed = false, healAction?: string) {
    this.alerts
      .filter(a => !a.resolved && a.category === category)
      .forEach(a => this.resolveAlert(a.id, autoHealed, healAction));
  }

  private createIncident(
    severity: Incident["severity"],
    title: string,
    description: string,
    affectedServices: string[],
    alertIds: string[]
  ): Incident {
    const incident: Incident = {
      id: this.genId("inc"),
      startedAt: new Date().toISOString(),
      severity, title, description,
      affectedServices,
      autoHealed: false,
      alerts: alertIds,
    };
    this.incidents.unshift(incident);
    if (this.incidents.length > MAX_INCIDENTS) this.incidents = this.incidents.slice(0, MAX_INCIDENTS);
    return incident;
  }

  private resolveIncident(incidentId: string, resolution: string, autoHealed = false) {
    const inc = this.incidents.find(i => i.id === incidentId);
    if (inc && !inc.resolvedAt) {
      inc.resolvedAt = new Date().toISOString();
      inc.resolution = resolution;
      inc.autoHealed = autoHealed;
      inc.duration = new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime();
    }
  }

  private async runHealthCheck() {
    if (!this.running) return;
    this.checksPerformed++;

    try {
      const mem = process.memoryUsage();
      const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;

      if (heapPercent > 90) {
        const alert = this.addAlert("critical", "memory", "Critical Memory Pressure",
          `Heap usage at ${heapPercent.toFixed(1)}% (${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(0)}MB)`,
          "health_check");
        this.createIncident("critical", "Memory Exhaustion Risk",
          "Application memory usage exceeds 90%", ["Server"], [alert.id]);
        if (global.gc) {
          try { global.gc(); } catch (_) {}
        }
      } else if (heapPercent > 75) {
        this.addAlert("high", "memory", "High Memory Usage",
          `Heap usage at ${heapPercent.toFixed(1)}%`, "health_check");
      } else {
        this.resolveAlertsByCategory("memory", true, "Memory usage returned to normal");
      }

      try {
        const start = Date.now();
        await db.execute(sql`SELECT 1`);
        const dbTime = Date.now() - start;
        this.responseTimeSamples.push(dbTime);
        if (this.responseTimeSamples.length > 100) this.responseTimeSamples.shift();

        if (dbTime > 5000) {
          this.addAlert("critical", "database", "Database Extremely Slow",
            `Query took ${dbTime}ms`, "health_check");
        } else if (dbTime > 2000) {
          this.addAlert("high", "database", "Database Slow",
            `Query took ${dbTime}ms`, "health_check");
        } else {
          this.resolveAlertsByCategory("database", true, `DB responding in ${dbTime}ms`);
        }
      } catch (dbErr: any) {
        this.addAlert("critical", "database", "Database Connection Failed",
          `Cannot connect to database: ${dbErr.message}`, "health_check");
        this.createIncident("critical", "Database Outage",
          "Cannot connect to PostgreSQL database", ["Database", "All API Endpoints"], []);
      }
    } catch (err: any) {
      logError(err, { context: "guardian_health_check" });
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs = 10000): Promise<{ ok: boolean; time: number; status?: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return { ok: resp.ok, time: Date.now() - start, status: resp.status };
    } catch (err: any) {
      return { ok: false, time: Date.now() - start, error: err.message };
    }
  }

  private async runServiceChecks() {
    if (!this.running) return;
    this.checksPerformed++;

    const checks: Array<{ name: string; url: string; category: string }> = [
      { name: "ESPN Scoreboard", url: `${ESPN_BASE}/football/nfl/scoreboard`, category: "espn" },
      { name: "ESPN NBA", url: `${ESPN_BASE}/basketball/nba/scoreboard`, category: "espn" },
      { name: "Weather API", url: "https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74.0&hourly=temperature_2m&forecast_days=1", category: "weather" },
      { name: "Odds API", url: "https://api.the-odds-api.com/v4/sports/?apiKey=" + (process.env.THE_ODDS_API_KEY || "test"), category: "odds" },
    ];

    const internalChecks: Array<{ name: string; path: string; category: string }> = [
      { name: "App Server", path: "/api/health", category: "server" },
      { name: "Market Snapshot", path: "/api/market-snapshot", category: "market" },
      { name: "Orchestrator", path: "/api/admin/orchestrator/status", category: "orchestrator" },
    ];

    for (const check of checks) {
      const result = await this.fetchWithTimeout(check.url);
      const svc = this.getOrCreateService(check.name);
      this.updateServiceStatus(svc, result.ok, result.time, result.error);

      if (!result.ok) {
        this.addAlert(
          result.time > 10000 ? "high" : "medium",
          check.category,
          `${check.name} Unavailable`,
          result.error || `HTTP ${result.status}`,
          "service_check"
        );
      } else {
        this.resolveAlertsByCategory(check.category, true, `${check.name} responding normally`);
      }
    }

    for (const check of internalChecks) {
      const port = process.env.PORT || 5000;
      const result = await this.fetchWithTimeout(`http://localhost:${port}${check.path}`);
      const svc = this.getOrCreateService(check.name);
      this.updateServiceStatus(svc, result.ok, result.time, result.error);

      if (!result.ok) {
        this.addAlert("high", check.category,
          `${check.name} Not Responding`,
          result.error || `HTTP ${result.status}`,
          "internal_check");
      } else {
        this.resolveAlertsByCategory(check.category, true, `${check.name} healthy`);
      }
    }

    this.lastFullScan = new Date().toISOString();
  }

  private getOrCreateService(name: string): ServiceStatus {
    if (!this.services.has(name)) {
      this.services.set(name, {
        name,
        status: "unknown",
        lastCheck: new Date().toISOString(),
        errorCount: 0,
        successRate: 100,
      });
    }
    return this.services.get(name)!;
  }

  private updateServiceStatus(svc: ServiceStatus, ok: boolean, responseTime: number, error?: string) {
    svc.lastCheck = new Date().toISOString();
    svc.responseTime = responseTime;
    svc.details = error || undefined;

    const key = svc.name;
    if (!this.errorCounts.has(key)) this.errorCounts.set(key, []);
    const history = this.errorCounts.get(key)!;
    history.push(ok ? 0 : 1);
    if (history.length > 20) history.shift();

    const errors = history.filter(x => x === 1).length;
    svc.errorCount = errors;
    svc.successRate = Math.round(((history.length - errors) / history.length) * 100);

    if (!ok) {
      svc.status = errors >= 3 ? "down" : "degraded";
    } else {
      svc.status = responseTime > 5000 ? "degraded" : "healthy";
    }
  }

  private async runErrorAnalysis() {
    if (!this.running) return;
    this.checksPerformed++;

    try {
      const logs = errorLogger.getLogs({ limit: 50 });
      const recentErrors = logs.filter(
        (l: any) => l.level === "error" &&
        new Date(l.timestamp).getTime() > Date.now() - 300_000
      );

      if (recentErrors.length >= 10) {
        this.addAlert("critical", "error_rate", "Error Spike Detected",
          `${recentErrors.length} errors in the last 5 minutes. Top: ${recentErrors[0]?.message?.substring(0, 100)}`,
          "error_analysis");

        const errorGroups = new Map<string, number>();
        for (const err of recentErrors) {
          const key = (err.message || "").substring(0, 80);
          errorGroups.set(key, (errorGroups.get(key) || 0) + 1);
        }

        const topError = Array.from(errorGroups.entries()).sort((a, b) => b[1] - a[1])[0];
        if (topError && topError[1] >= 5) {
          this.createIncident("high", "Recurring Error Pattern",
            `Error "${topError[0]}" occurred ${topError[1]} times in 5 minutes`,
            ["Server"], []);
        }
      } else if (recentErrors.length >= 5) {
        this.addAlert("medium", "error_rate", "Elevated Error Rate",
          `${recentErrors.length} errors in the last 5 minutes`,
          "error_analysis");
      } else {
        this.resolveAlertsByCategory("error_rate", true, "Error rate back to normal");
      }
    } catch (err: any) {
      logError(err, { context: "guardian_error_analysis" });
    }
  }

  private async runAutoHeal() {
    if (!this.running) return;

    const criticalAlerts = this.alerts.filter(a => !a.resolved && (a.severity === "critical" || a.severity === "high"));

    for (const alert of criticalAlerts) {
      try {
        if (alert.category === "memory" && alert.severity === "critical") {
          if (global.gc) {
            global.gc();
            this.autoHealActions++;
            this.resolveAlert(alert.id, true, "Forced garbage collection");
            this.addDiagnostic("memory", "high", "Forced garbage collection due to critical memory pressure",
              "Memory was reclaimed. Monitor for recurring pressure which may indicate a memory leak.", true, true);
          } else {
            this.addDiagnostic("memory", "critical",
              "Memory critical but cannot force GC (--expose-gc not enabled)",
              "Consider restarting the application if memory continues to climb. Check for memory leaks in event listeners or caches.", false, false);
          }
        }

        if (alert.category === "orchestrator") {
          try {
            const { getOrchestratorStatus, startContinuousLearningOrchestrator } = await import("./continuousLearningOrchestrator");
            const orchStatus = getOrchestratorStatus();
            if (!orchStatus.isRunning) {
              startContinuousLearningOrchestrator();
              this.autoHealActions++;
              this.resolveAlert(alert.id, true, "Auto-restarted orchestrator");
              this.addDiagnostic("orchestrator", "high",
                "Orchestrator was down - auto-restarted",
                "Orchestrator has been restarted. All scheduled tasks (settlement, retraining, freshness checks) are resuming.", true, true);
            }
          } catch {}
        }

        if (alert.category === "espn" && !alert.resolved) {
          this.addDiagnostic("data_feeds", alert.severity,
            `ESPN data feed issue: ${alert.message}`,
            "ESPN free API may be rate-limited or experiencing downtime. The system will retry on the next cycle. No action needed unless this persists for more than 15 minutes.", false, false);
        }

        if (alert.category === "odds" && !alert.resolved) {
          this.addDiagnostic("data_feeds", alert.severity,
            `Odds API issue: ${alert.message}`,
            "Check THE_ODDS_API_KEY validity and remaining monthly quota. The Odds API has usage limits. Visit https://the-odds-api.com to check status.", false, false);
        }
      } catch (err: any) {
        logError(err, { context: "guardian_auto_heal" });
      }
    }
  }

  private async runAIDiagnostics() {
    if (!this.running) return;
    this.checksPerformed++;

    try {
      const activeAlerts = this.alerts.filter(a => !a.resolved);
      const downServices = Array.from(this.services.values()).filter(s => s.status === "down" || s.status === "degraded");
      const healthScore = this.calculateHealthScore();
      const hasCriticalIssue = activeAlerts.some(a => a.severity === "critical" || a.severity === "high") || downServices.length > 0 || healthScore < 80;
      const cooldownMs = 30 * 60 * 1000;
      const cooldownElapsed = Date.now() - this.lastAIDiagnosticAt > cooldownMs;

      if (!hasCriticalIssue || !cooldownElapsed) {
        return;
      }

      this.lastAIDiagnosticAt = Date.now();

      const { createOpenAIClient } = await import("./openaiClient");
      const openai = createOpenAIClient();

      const context = {
        healthScore,
        activeAlerts: activeAlerts.map(a => ({ severity: a.severity, category: a.category, title: a.title, message: a.message })),
        degradedServices: downServices.map(s => ({ name: s.name, status: s.status, responseTime: s.responseTime, successRate: s.successRate })),
        memUsage: process.memoryUsage(),
        uptime: process.uptime(),
        recentIncidents: this.incidents.slice(0, 5).map(i => ({ title: i.title, severity: i.severity, resolved: !!i.resolvedAt })),
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the AI Guardian for Sors Maxima, a sports betting intelligence platform. Analyze the system health data and provide actionable diagnostics. Return a JSON array of diagnostics, each with: category (string), severity (critical/high/medium/low), finding (string - what you found), recommendation (string - what to do), autoFixable (boolean). Focus on the most impactful issues first. Be concise and actionable. Max 5 items.`
          },
          { role: "user", content: JSON.stringify(context) }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      const items = parsed.diagnostics || parsed.items || [];

      for (const item of items.slice(0, 5)) {
        this.addDiagnostic(
          item.category || "general",
          item.severity || "medium",
          item.finding || "Unknown finding",
          item.recommendation || "No recommendation",
          item.autoFixable || false,
          false
        );
      }
    } catch (err: any) {
      if (!err.message?.includes("API key")) {
        logWarn(`[Guardian] AI diagnostics skipped: ${err.message}`);
      }
    }
  }

  private addDiagnostic(category: string, severity: string, finding: string, recommendation: string, autoFixable: boolean, fixApplied: boolean) {
    const diag: AIDiagnostic = {
      id: this.genId("diag"),
      timestamp: new Date().toISOString(),
      category, severity, finding, recommendation, autoFixable, fixApplied,
    };
    this.diagnostics.unshift(diag);
    if (this.diagnostics.length > MAX_DIAGNOSTICS) this.diagnostics = this.diagnostics.slice(0, MAX_DIAGNOSTICS);
  }

  private calculateHealthScore(): number {
    let score = 100;

    const critAlerts = this.alerts.filter(a => !a.resolved && a.severity === "critical").length;
    const highAlerts = this.alerts.filter(a => !a.resolved && a.severity === "high").length;
    const medAlerts = this.alerts.filter(a => !a.resolved && a.severity === "medium").length;
    score -= critAlerts * 25;
    score -= highAlerts * 10;
    score -= medAlerts * 3;

    const allServices = Array.from(this.services.values());
    const downCount = allServices.filter(s => s.status === "down").length;
    const degradedCount = allServices.filter(s => s.status === "degraded").length;
    score -= downCount * 15;
    score -= degradedCount * 5;

    const mem = process.memoryUsage();
    const heapPct = (mem.heapUsed / mem.heapTotal) * 100;
    if (heapPct > 90) score -= 20;
    else if (heapPct > 75) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private pruneOldData() {
    const oneDayAgo = Date.now() - 86400_000;
    this.alerts = this.alerts.filter(
      a => !a.resolved || new Date(a.timestamp).getTime() > oneDayAgo
    );
    this.incidents = this.incidents.filter(
      i => !i.resolvedAt || new Date(i.startedAt).getTime() > oneDayAgo
    );
    this.diagnostics = this.diagnostics.filter(
      d => new Date(d.timestamp).getTime() > oneDayAgo
    );
  }

  getStatus(): GuardianStatus {
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);

    const healthScore = this.calculateHealthScore();
    let overallStatus: GuardianStatus["overallStatus"] = "healthy";
    if (healthScore < 50) overallStatus = "critical";
    else if (healthScore < 75) overallStatus = "degraded";

    const avgResp = this.responseTimeSamples.length > 0
      ? this.responseTimeSamples.reduce((a, b) => a + b, 0) / this.responseTimeSamples.length : 0;

    const recentLogs = errorLogger.getLogs({ limit: 100 });
    const errorsLast5m = recentLogs.filter(
      (l: any) => l.level === "error" && new Date(l.timestamp).getTime() > Date.now() - 300_000
    ).length;

    return {
      isRunning: this.running,
      startedAt: this.startedAt,
      healthScore,
      overallStatus,
      vitals: {
        memoryUsage: {
          used: Math.round(mem.heapUsed / 1024 / 1024),
          total: Math.round(mem.heapTotal / 1024 / 1024),
          percent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
        },
        uptime: uptimeSec,
        uptimeFormatted: `${hours}h ${mins}m`,
        nodeVersion: process.version,
        activeConnections: 0,
        errorRate: errorsLast5m,
        avgResponseTime: Math.round(avgResp),
      },
      services: Array.from(this.services.values()),
      activeAlerts: this.alerts.filter(a => !a.resolved),
      recentIncidents: this.incidents.slice(0, 20),
      checksPerformed: this.checksPerformed,
      autoHealActions: this.autoHealActions,
      lastFullScan: this.lastFullScan,
      aiDiagnostics: this.diagnostics.slice(0, 20),
    };
  }

  getAlerts(includeResolved = false): Alert[] {
    return includeResolved ? [...this.alerts] : this.alerts.filter(a => !a.resolved);
  }

  getIncidents(): Incident[] {
    return [...this.incidents];
  }

  getDiagnostics(): AIDiagnostic[] {
    return [...this.diagnostics];
  }

  acknowledgeAlert(alertId: string) {
    this.resolveAlert(alertId, false, "Manually acknowledged by admin");
  }

  async forceFullScan(): Promise<GuardianStatus> {
    await this.runHealthCheck();
    await this.runServiceChecks();
    await this.runErrorAnalysis();
    await this.runAutoHeal();
    return this.getStatus();
  }

  async runDiagnosticsNow(): Promise<AIDiagnostic[]> {
    await this.runAIDiagnostics();
    return this.diagnostics.slice(0, 10);
  }
}

export const appGuardian = new AppGuardianEngine();

export function startGuardian() {
  appGuardian.start();
}

export function stopGuardian() {
  appGuardian.stop();
}

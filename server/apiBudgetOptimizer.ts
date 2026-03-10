import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "api-budget-state.json");

export type ServiceKey = "odds" | "apifootball" | "balldontlie" | "openai" | "espn";

export interface ServiceConfig {
  name: string;
  monthlyBudget: number;
  description: string;
  unit: string;
  resetDay: number;
  warningThreshold: number;
  criticalThreshold: number;
  seasonMonths: number[];
  seasonLabel: string;
}

export interface ServiceState {
  currentUsage: number;
  manualRemaining: number | null;
  lastReported: string | null;
  monthReset: string;
  callLog: Array<{ ts: number; count: number }>;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string;
  autoSuspend: boolean;
  lastSeasonCheck: string | null;
}

export interface SeasonAlert {
  id: string;
  service: ServiceKey;
  type: "restart_needed" | "auto_suspended" | "season_ending_soon";
  message: string;
  createdAt: string;
  dismissed: boolean;
}

export interface OptimizationResult {
  service: ServiceKey;
  status: "healthy" | "warning" | "critical" | "exhausted" | "suspended";
  budget: number;
  used: number;
  remaining: number;
  remainingPercent: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  expectedUsageByNow: number;
  budgetVariance: number;
  projectedMonthEnd: number;
  optimalCallsPerDay: number;
  optimalIntervalMinutes: number;
  currentBurnPerDay: number;
  userScaledInterval: number;
  shouldThrottle: boolean;
  recommendation: string;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string;
  autoSuspend: boolean;
  inSeason: boolean;
  seasonLabel: string;
  currentMonth: number;
}

const DEFAULT_CONFIGS: Record<ServiceKey, ServiceConfig> = {
  odds: {
    name: "The Odds API",
    monthlyBudget: 100000,
    description: "Bookmaker odds across 10+ sportsbooks",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonLabel: "Year-round (NFL, NBA, MLB, NHL, Soccer overlap)",
  },
  apifootball: {
    name: "API-Football",
    monthlyBudget: 75000,
    description: "International soccer fixtures & odds",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
    seasonMonths: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12],
    seasonLabel: "Aug–May (European soccer seasons; Jun–Jul are transfer/break)",
  },
  balldontlie: {
    name: "BallDontLie",
    monthlyBudget: 30000,
    description: "NBA player & team stats",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
    seasonMonths: [1, 2, 3, 4, 5, 6, 10, 11, 12],
    seasonLabel: "Oct–Jun (NBA regular season + playoffs; Jul–Sep are offseason)",
  },
  openai: {
    name: "OpenAI",
    monthlyBudget: 100000,
    description: "AI edge insights (token budget)",
    unit: "tokens",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonLabel: "Year-round (AI insights run with any active sport)",
  },
  espn: {
    name: "ESPN (Unofficial)",
    monthlyBudget: 999999,
    description: "Live scores, schedules, team data",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.95,
    criticalThreshold: 0.99,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonLabel: "Year-round (covers all sports including off-season transactions)",
  },
};

interface BudgetState {
  configs: Record<ServiceKey, { monthlyBudget: number; autoSuspend?: boolean }>;
  states: Record<ServiceKey, ServiceState>;
  alerts: SeasonAlert[];
  activeUsers: number;
  lastSaved: string;
}

function now(): string {
  return new Date().toISOString();
}

function getMonthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function getDaysInMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getDaysElapsed(): number {
  const d = new Date();
  return d.getDate() - 1 + (d.getHours() / 24);
}

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

function makeAlertId(): string {
  return Math.random().toString(36).slice(2, 10);
}

class ApiBudgetOptimizer {
  private configs: Record<ServiceKey, ServiceConfig>;
  private state: BudgetState;

  constructor() {
    this.configs = { ...DEFAULT_CONFIGS };
    this.state = this.load();
    this.ensureMonthReset();
    this.runSeasonCheck();
    setInterval(() => {
      this.ensureMonthReset();
      this.runSeasonCheck();
    }, 60 * 60 * 1000);
  }

  private load(): BudgetState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw) as BudgetState;
        if (!parsed.alerts) parsed.alerts = [];
        const services: ServiceKey[] = ["odds", "apifootball", "balldontlie", "openai", "espn"];
        for (const s of services) {
          if (!parsed.states[s]) {
            parsed.states[s] = this.defaultServiceState();
          } else {
            if (parsed.states[s].suspended === undefined) parsed.states[s].suspended = false;
            if (parsed.states[s].suspendedAt === undefined) parsed.states[s].suspendedAt = null;
            if (parsed.states[s].suspendedReason === undefined) parsed.states[s].suspendedReason = "";
            if (parsed.states[s].autoSuspend === undefined) parsed.states[s].autoSuspend = false;
            if (parsed.states[s].lastSeasonCheck === undefined) parsed.states[s].lastSeasonCheck = null;
          }
        }
        return parsed;
      }
    } catch {}
    return this.defaultState();
  }

  private defaultServiceState(): ServiceState {
    return {
      currentUsage: 0,
      manualRemaining: null,
      lastReported: null,
      monthReset: getMonthStart(),
      callLog: [],
      suspended: false,
      suspendedAt: null,
      suspendedReason: "",
      autoSuspend: false,
      lastSeasonCheck: null,
    };
  }

  private defaultState(): BudgetState {
    const states = {} as Record<ServiceKey, ServiceState>;
    const services: ServiceKey[] = ["odds", "apifootball", "balldontlie", "openai", "espn"];
    for (const s of services) {
      states[s] = this.defaultServiceState();
    }
    return {
      configs: {} as any,
      states,
      alerts: [],
      activeUsers: 0,
      lastSaved: now(),
    };
  }

  private save(): void {
    try {
      this.state.lastSaved = now();
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2));
    } catch {}
  }

  private ensureMonthReset(): void {
    const currentMonthStart = getMonthStart();
    for (const s of Object.keys(this.state.states) as ServiceKey[]) {
      if (this.state.states[s].monthReset !== currentMonthStart) {
        console.log(`[BudgetOptimizer] Month reset for ${s}`);
        const prev = this.state.states[s];
        this.state.states[s] = {
          ...this.defaultServiceState(),
          suspended: prev.suspended,
          suspendedAt: prev.suspendedAt,
          suspendedReason: prev.suspendedReason,
          autoSuspend: prev.autoSuspend,
          lastSeasonCheck: prev.lastSeasonCheck,
        };
      }
    }
    this.save();
  }

  private runSeasonCheck(): void {
    const month = currentMonth();
    const services: ServiceKey[] = ["odds", "apifootball", "balldontlie", "openai", "espn"];

    for (const service of services) {
      const cfg = this.configs[service];
      const state = this.state.states[service];
      const inSeason = cfg.seasonMonths.includes(month);

      if (state.autoSuspend) {
        if (!inSeason && !state.suspended) {
          console.log(`[BudgetOptimizer] Auto-suspending ${service} (out of season: month ${month})`);
          state.suspended = true;
          state.suspendedAt = now();
          state.suspendedReason = `Auto-suspended: ${cfg.name} is out of season (${cfg.seasonLabel}). Month ${month} is not in active window.`;
          this.addAlert(service, "auto_suspended",
            `${cfg.name} auto-suspended — out of season. Active months: ${this.formatSeasonMonths(cfg.seasonMonths)}. Will auto-alert when season resumes.`
          );
        } else if (inSeason && state.suspended && state.suspendedReason.startsWith("Auto-suspended")) {
          console.log(`[BudgetOptimizer] Season started for ${service} — adding restart alert`);
          state.suspended = false;
          state.suspendedAt = null;
          state.suspendedReason = "";
          this.addAlert(service, "restart_needed",
            `${cfg.name} season has started (month ${month} is in active window). API calls should resume now. Season: ${cfg.seasonLabel}`
          );
        }
      }

      const daysLeft = getDaysInMonth() - getDaysElapsed();
      if (inSeason && daysLeft <= 7) {
        const nextMonth = month === 12 ? 1 : month + 1;
        if (!cfg.seasonMonths.includes(nextMonth)) {
          const existingWarn = this.state.alerts.find(
            a => a.service === service && a.type === "season_ending_soon" && !a.dismissed &&
              new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          );
          if (!existingWarn) {
            this.addAlert(service, "season_ending_soon",
              `${cfg.name} season ends next month. Consider enabling auto-suspend to pause API calls during the off-season (${this.formatSeasonMonths(cfg.seasonMonths, true)}).`
            );
          }
        }
      }

      state.lastSeasonCheck = now();
    }
    this.save();
  }

  private addAlert(service: ServiceKey, type: SeasonAlert["type"], message: string): void {
    this.state.alerts.push({
      id: makeAlertId(),
      service,
      type,
      message,
      createdAt: now(),
      dismissed: false,
    });
    this.state.alerts = this.state.alerts.slice(-50);
  }

  private formatSeasonMonths(months: number[], showOff = false): string {
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (months.length === 12) return "All year";
    const active = months.map(m => names[m - 1]).join(", ");
    if (!showOff) return active;
    const off = [1,2,3,4,5,6,7,8,9,10,11,12].filter(m => !months.includes(m)).map(m => names[m - 1]);
    return off.length ? `Off-season: ${off.join(", ")}` : "Always active";
  }

  private pruneLogs(state: ServiceState): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    state.callLog = state.callLog.filter(e => e.ts > cutoff);
  }

  trackCall(service: ServiceKey, count: number = 1): void {
    const s = this.state.states[service];
    if (!s) return;
    s.currentUsage += count;
    s.callLog.push({ ts: Date.now(), count });
    this.pruneLogs(s);
    this.save();
  }

  reportRemaining(service: ServiceKey, remaining: number): void {
    const s = this.state.states[service];
    if (!s) return;
    const budget = this.configs[service]?.monthlyBudget ?? 500;
    s.manualRemaining = remaining;
    s.lastReported = now();
    const inferredUsed = budget - remaining;
    if (inferredUsed > s.currentUsage) {
      s.currentUsage = inferredUsed;
    }
    this.save();
  }

  updateMonthlyBudget(service: ServiceKey, budget: number): void {
    if (this.configs[service]) {
      this.configs[service].monthlyBudget = Math.max(1, budget);
    }
    this.save();
  }

  updateActiveUsers(count: number): void {
    this.state.activeUsers = count;
    this.save();
  }

  suspendService(service: ServiceKey, reason: string): void {
    const s = this.state.states[service];
    if (!s) return;
    s.suspended = true;
    s.suspendedAt = now();
    s.suspendedReason = reason || "Manually suspended by admin";
    this.addAlert(service, "auto_suspended", `${this.configs[service]?.name || service} manually suspended: ${reason || "Admin action"}`);
    this.save();
  }

  resumeService(service: ServiceKey): void {
    const s = this.state.states[service];
    if (!s) return;
    s.suspended = false;
    s.suspendedAt = null;
    s.suspendedReason = "";
    this.addAlert(service, "restart_needed", `${this.configs[service]?.name || service} manually resumed by admin.`);
    this.save();
  }

  setAutoSuspend(service: ServiceKey, enabled: boolean): void {
    const s = this.state.states[service];
    if (!s) return;
    s.autoSuspend = enabled;
    this.save();
    this.runSeasonCheck();
  }

  isSuspended(service: ServiceKey): boolean {
    return this.state.states[service]?.suspended ?? false;
  }

  getAlerts(): SeasonAlert[] {
    return this.state.alerts.filter(a => !a.dismissed).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  dismissAlert(id: string): void {
    const alert = this.state.alerts.find(a => a.id === id);
    if (alert) {
      alert.dismissed = true;
      this.save();
    }
  }

  getOptimization(service: ServiceKey): OptimizationResult {
    const cfg = this.configs[service];
    const s = this.state.states[service];
    const budget = cfg?.monthlyBudget ?? 500;
    const daysInMonth = getDaysInMonth();
    const daysElapsed = Math.max(0.01, getDaysElapsed());
    const daysRemaining = Math.max(0.01, daysInMonth - daysElapsed);

    const used = s.manualRemaining !== null
      ? budget - s.manualRemaining
      : s.currentUsage;
    const remaining = Math.max(0, budget - used);
    const remainingPercent = budget > 0 ? remaining / budget : 0;

    const expectedUsageByNow = (budget / daysInMonth) * daysElapsed;
    const budgetVariance = used - expectedUsageByNow;

    const optimalCallsPerDay = remaining / daysRemaining;
    const optimalIntervalMinutes = optimalCallsPerDay > 0
      ? Math.max(1, (24 * 60) / optimalCallsPerDay)
      : 9999;

    this.pruneLogs(s);
    const recentCalls = s.callLog.reduce((sum, e) => sum + e.count, 0);
    const currentBurnPerDay = recentCalls;

    const users = Math.max(1, this.state.activeUsers);
    const userFactor = Math.min(2, Math.sqrt(users / 10));
    const userScaledInterval = Math.round(optimalIntervalMinutes * userFactor);

    const projectedMonthEnd = used + currentBurnPerDay * daysRemaining;

    const usedFraction = budget > 0 ? used / budget : 0;
    const warnThreshold = cfg?.warningThreshold ?? 0.7;
    const critThreshold = cfg?.criticalThreshold ?? 0.9;

    const month = currentMonth();
    const inSeason = cfg ? cfg.seasonMonths.includes(month) : true;

    let status: OptimizationResult["status"] = "healthy";
    if (s.suspended) status = "suspended";
    else if (remaining <= 0) status = "exhausted";
    else if (usedFraction >= critThreshold || projectedMonthEnd > budget * 1.1) status = "critical";
    else if (usedFraction >= warnThreshold || projectedMonthEnd > budget * 0.95) status = "warning";

    const shouldThrottle = !s.suspended && (budgetVariance > expectedUsageByNow * 0.15 || projectedMonthEnd > budget);

    let recommendation = "";
    if (s.suspended) {
      recommendation = s.suspendedReason || "Service is suspended. Click Resume to re-enable API calls.";
    } else if (status === "exhausted") {
      recommendation = "Budget exhausted — upgrade plan or wait for monthly reset.";
    } else if (status === "critical") {
      recommendation = `Reduce polling to ${Math.round(userScaledInterval)}min intervals immediately. Projected to exceed budget.`;
    } else if (status === "warning") {
      recommendation = `Moderate usage. Keep polling at ${Math.round(userScaledInterval)}min intervals to stay within budget.`;
    } else if (!inSeason && !s.suspended) {
      recommendation = `Currently off-season. Enable auto-suspend to pause API calls and save quota for the active months (${this.formatSeasonMonths(cfg?.seasonMonths ?? [])}).`;
    } else {
      recommendation = `On track. Optimal interval is ${Math.round(optimalIntervalMinutes)}min for ${daysRemaining.toFixed(0)} remaining days.`;
    }

    return {
      service,
      status,
      budget,
      used,
      remaining,
      remainingPercent,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      expectedUsageByNow,
      budgetVariance,
      projectedMonthEnd,
      optimalCallsPerDay,
      optimalIntervalMinutes,
      currentBurnPerDay,
      userScaledInterval,
      shouldThrottle,
      recommendation,
      suspended: s.suspended,
      suspendedAt: s.suspendedAt,
      suspendedReason: s.suspendedReason,
      autoSuspend: s.autoSuspend,
      inSeason,
      seasonLabel: cfg?.seasonLabel ?? "Year-round",
      currentMonth: month,
    };
  }

  getAllOptimizations(): OptimizationResult[] {
    const services: ServiceKey[] = ["odds", "apifootball", "balldontlie", "openai", "espn"];
    return services.map(s => this.getOptimization(s));
  }

  getConfig(service: ServiceKey): ServiceConfig {
    return this.configs[service];
  }

  getActiveUsers(): number {
    return this.state.activeUsers;
  }

  shouldThrottle(service: ServiceKey): boolean {
    return this.getOptimization(service).shouldThrottle;
  }

  getOptimalIntervalMs(service: ServiceKey, defaultMs: number): number {
    if (this.isSuspended(service)) return defaultMs * 100;
    const opt = this.getOptimization(service);
    if (opt.status === "exhausted") return defaultMs * 10;
    if (opt.status === "critical") return Math.max(defaultMs, opt.userScaledInterval * 60 * 1000);
    if (opt.status === "warning") return Math.max(defaultMs, opt.optimalIntervalMinutes * 60 * 1000);
    return defaultMs;
  }

  getDashboard() {
    return {
      optimizations: this.getAllOptimizations(),
      configs: Object.fromEntries(
        (Object.keys(this.configs) as ServiceKey[]).map(s => [s, this.configs[s]])
      ),
      alerts: this.getAlerts(),
      activeUsers: this.state.activeUsers,
      lastSaved: this.state.lastSaved,
      monthStart: getMonthStart(),
      daysInMonth: getDaysInMonth(),
      daysElapsed: getDaysElapsed(),
      daysRemaining: getDaysInMonth() - getDaysElapsed(),
      currentMonth: currentMonth(),
    };
  }
}

export const apiBudgetOptimizer = new ApiBudgetOptimizer();

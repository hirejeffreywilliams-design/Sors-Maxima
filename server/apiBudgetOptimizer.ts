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
}

export interface ServiceState {
  currentUsage: number;
  manualRemaining: number | null;
  lastReported: string | null;
  monthReset: string;
  callLog: Array<{ ts: number; count: number }>;
}

export interface OptimizationResult {
  service: ServiceKey;
  status: "healthy" | "warning" | "critical" | "exhausted";
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
}

const DEFAULT_CONFIGS: Record<ServiceKey, ServiceConfig> = {
  odds: {
    name: "The Odds API",
    monthlyBudget: 500,
    description: "Bookmaker odds across 10+ sportsbooks",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
  },
  apifootball: {
    name: "API-Football",
    monthlyBudget: 100,
    description: "International soccer fixtures & odds",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
  },
  balldontlie: {
    name: "BallDontLie",
    monthlyBudget: 30000,
    description: "NBA player & team stats",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
  },
  openai: {
    name: "OpenAI",
    monthlyBudget: 100000,
    description: "AI edge insights (token budget)",
    unit: "tokens",
    resetDay: 1,
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
  },
  espn: {
    name: "ESPN (Unofficial)",
    monthlyBudget: 999999,
    description: "Live scores, schedules, team data",
    unit: "requests",
    resetDay: 1,
    warningThreshold: 0.95,
    criticalThreshold: 0.99,
  },
};

interface BudgetState {
  configs: Record<ServiceKey, { monthlyBudget: number }>;
  states: Record<ServiceKey, ServiceState>;
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

class ApiBudgetOptimizer {
  private configs: Record<ServiceKey, ServiceConfig>;
  private state: BudgetState;

  constructor() {
    this.configs = { ...DEFAULT_CONFIGS };
    this.state = this.load();
    this.ensureMonthReset();
    setInterval(() => this.ensureMonthReset(), 60 * 60 * 1000);
  }

  private load(): BudgetState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch {}
    return this.defaultState();
  }

  private defaultState(): BudgetState {
    const states = {} as Record<ServiceKey, ServiceState>;
    const services: ServiceKey[] = ["odds", "apifootball", "balldontlie", "openai", "espn"];
    for (const s of services) {
      states[s] = {
        currentUsage: 0,
        manualRemaining: null,
        lastReported: null,
        monthReset: getMonthStart(),
        callLog: [],
      };
    }
    return {
      configs: {} as any,
      states,
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
        this.state.states[s] = {
          currentUsage: 0,
          manualRemaining: null,
          lastReported: null,
          monthReset: currentMonthStart,
          callLog: [],
        };
      }
    }
    this.save();
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

    let status: OptimizationResult["status"] = "healthy";
    if (remaining <= 0) status = "exhausted";
    else if (usedFraction >= critThreshold || projectedMonthEnd > budget * 1.1) status = "critical";
    else if (usedFraction >= warnThreshold || projectedMonthEnd > budget * 0.95) status = "warning";

    const shouldThrottle = budgetVariance > expectedUsageByNow * 0.15 || projectedMonthEnd > budget;

    let recommendation = "";
    if (status === "exhausted") {
      recommendation = "Budget exhausted — upgrade plan or wait for monthly reset.";
    } else if (status === "critical") {
      recommendation = `Reduce polling frequency to ${Math.round(userScaledInterval)}min intervals immediately. Projected to exceed budget.`;
    } else if (status === "warning") {
      recommendation = `Moderate usage. Keep polling at ${Math.round(userScaledInterval)}min intervals to stay within budget.`;
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
      activeUsers: this.state.activeUsers,
      lastSaved: this.state.lastSaved,
      monthStart: getMonthStart(),
      daysInMonth: getDaysInMonth(),
      daysElapsed: getDaysElapsed(),
      daysRemaining: getDaysInMonth() - getDaysElapsed(),
    };
  }
}

export const apiBudgetOptimizer = new ApiBudgetOptimizer();

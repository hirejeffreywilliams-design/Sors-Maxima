import { logInfo, logWarn, logError } from "./errorLogger";
import { apiBudgetOptimizer } from "./apiBudgetOptimizer";

interface PrefetchTask {
  name: string;
  fn: () => Promise<void>;
  intervalMs: number;
  lastRun: number;
  runCount: number;
  lastError: string | null;
  lastDurationMs: number;
  enabled: boolean;
}

let tasks: PrefetchTask[] = [];
let schedulerTimer: NodeJS.Timeout | null = null;
let running = false;
let startedAt: string | null = null;
let cycleRunning = false;
const actionLog: Array<{ ts: string; action: string; detail: string }> = [];

function addToLog(action: string, detail: string) {
  actionLog.unshift({ ts: new Date().toISOString(), action, detail });
  if (actionLog.length > 50) actionLog.length = 50;
}

function registerTask(name: string, fn: () => Promise<void>, intervalMs: number) {
  if (tasks.some(t => t.name === name)) return;
  tasks.push({
    name,
    fn,
    intervalMs,
    lastRun: 0,
    runCount: 0,
    lastError: null,
    lastDurationMs: 0,
    enabled: true,
  });
}

async function runDueTasks() {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    const now = Date.now();
    for (const task of tasks) {
      if (!task.enabled) continue;
      if (now - task.lastRun < task.intervalMs) continue;

      const start = Date.now();
      try {
        await task.fn();
        task.lastDurationMs = Date.now() - start;
        task.lastError = null;
        task.runCount++;
        task.lastRun = now;
      } catch (err: any) {
        task.lastDurationMs = Date.now() - start;
        task.lastError = err.message || "Unknown error";
        task.lastRun = now;
        logWarn(`[Prefetch] Task "${task.name}" failed: ${task.lastError}`);
      }
    }
  } finally {
    cycleRunning = false;
  }
}

function shouldThrottle(): boolean {
  try {
    const opt = apiBudgetOptimizer.getOptimization("odds");
    return opt.shouldThrottle;
  } catch {
    return false;
  }
}

async function warmOddsCache() {
  if (shouldThrottle()) {
    addToLog("odds-skip", "Skipped — budget optimizer is throttling");
    return;
  }
  const { getOddsForSportAsync } = await import("./odds-provider");
  const activeSports = ["NBA", "NFL", "MLB", "NHL"];
  let warmed = 0;
  for (const sport of activeSports) {
    try {
      await getOddsForSportAsync(sport as any);
      warmed++;
    } catch { /* non-critical */ }
  }
  addToLog("odds-warm", `Warmed odds cache for ${warmed} sports`);
}

async function warmScoreboardCache() {
  const { getMultiDayScoreboard } = await import("./espn-scoreboard-provider");
  const sports = ["NBA", "NFL", "MLB", "NHL"];
  let warmed = 0;
  for (const sport of sports) {
    try {
      await getMultiDayScoreboard(sport);
      warmed++;
    } catch { /* non-critical */ }
  }
  addToLog("scoreboard-warm", `Warmed scoreboard cache for ${warmed} sports`);
}

async function warmPropsCache() {
  if (shouldThrottle()) {
    addToLog("props-skip", "Skipped — budget optimizer is throttling");
    return;
  }
  const { fetchRealPlayerProps, isOddsApiAvailable } = await import("./odds-provider");
  if (!isOddsApiAvailable()) {
    addToLog("props-skip", "Skipped — Odds API not available");
    return;
  }
  const sports = ["NBA", "NFL", "MLB", "NHL"];
  let warmed = 0;
  for (const sport of sports) {
    try {
      const { getScoreboard } = await import("./espn-scoreboard-provider");
      const games = await getScoreboard(sport as any);
      if (games.length > 0) {
        const eventIds = games.slice(0, 3).map((g: any) => g.id || g.gameId).filter(Boolean);
        for (const eid of eventIds) {
          try {
            await fetchRealPlayerProps(sport, eid, 3);
            warmed++;
          } catch { /* non-critical */ }
        }
      }
    } catch { /* non-critical */ }
  }
  addToLog("props-warm", `Warmed props cache for ${warmed} game(s)`);
}

export function startPrefetchScheduler() {
  if (running) return;
  running = true;
  startedAt = new Date().toISOString();

  tasks = [];
  registerTask("odds-cache", warmOddsCache, 3 * 60 * 1000);
  registerTask("scoreboard-cache", warmScoreboardCache, 2 * 60 * 1000);
  registerTask("props-cache", warmPropsCache, 10 * 60 * 1000);

  schedulerTimer = setInterval(() => {
    runDueTasks().catch(err => logError(err as Error, { context: "prefetch-scheduler" }));
  }, 30_000);

  setTimeout(() => {
    runDueTasks().catch(err => logError(err as Error, { context: "prefetch-scheduler-init" }));
  }, 10_000);

  logInfo("[Prefetch] Scheduler started — odds every 3m, scoreboard every 2m, props every 10m");
  addToLog("start", "Prefetch scheduler started");
}

export function stopPrefetchScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  running = false;
  addToLog("stop", "Prefetch scheduler stopped");
}

export function getPrefetchStatus() {
  return {
    running,
    startedAt,
    tasks: tasks.map(t => ({
      name: t.name,
      enabled: t.enabled,
      intervalMs: t.intervalMs,
      lastRun: t.lastRun ? new Date(t.lastRun).toISOString() : null,
      runCount: t.runCount,
      lastError: t.lastError,
      lastDurationMs: t.lastDurationMs,
    })),
    recentLog: actionLog.slice(0, 20),
  };
}

export function getControlRoomLog() {
  return actionLog;
}

export function addControlRoomLog(action: string, detail: string) {
  addToLog(action, detail);
}

import { liveSportsData } from "./live-sports-data";
import { broadcastEvent } from "./sseManager";
import { logError } from "./errorLogger";

const DEFAULT_LIVE_POLL_MS = 60_000;
const TURBO_LIVE_POLL_MS = 10_000;

const DEFAULT_HUB_REFRESH_MS = 120_000;
const TURBO_HUB_REFRESH_MS = 30_000;

const DEFAULT_SSE_BROADCAST_MS = 30_000;
const TURBO_SSE_BROADCAST_MS = 10_000;

export interface TurboModeStatus {
  active: boolean;
  activeGameCount: number;
  livePollingIntervalMs: number;
  hubRefreshIntervalMs: number;
  sseBroadcastIntervalMs: number;
  activatedAt: string | null;
  deactivatedAt: string | null;
  lastCheckedAt: string;
}

let _turboActive = false;
let _activeGameCount = 0;
let _activatedAt: Date | null = null;
let _deactivatedAt: Date | null = null;
let _lastCheckedAt: Date = new Date();

let _turboCheckInterval: NodeJS.Timeout | null = null;
let _turboPollInterval: NodeJS.Timeout | null = null;

let _livePollingIntervalMs = DEFAULT_LIVE_POLL_MS;
let _hubRefreshIntervalMs = DEFAULT_HUB_REFRESH_MS;
let _sseBroadcastIntervalMs = DEFAULT_SSE_BROADCAST_MS;

let onTurboActivate: (() => void) | null = null;
let onTurboDeactivate: (() => void) | null = null;
let onSseIntervalChange: ((ms: number) => void) | null = null;

export function registerTurboCallbacks(
  activate: () => void,
  deactivate: () => void,
  sseIntervalChange: (ms: number) => void
): void {
  onTurboActivate = activate;
  onTurboDeactivate = deactivate;
  onSseIntervalChange = sseIntervalChange;
}

function countLiveGames(): number {
  try {
    const games = liveSportsData.getLiveGames();
    return games.filter(g => g.status === "in_progress").length;
  } catch {
    return 0;
  }
}

function activateTurboMode(liveCount: number): void {
  if (_turboActive) {
    _activeGameCount = liveCount;
    return;
  }
  _turboActive = true;
  _activeGameCount = liveCount;
  _activatedAt = new Date();
  _livePollingIntervalMs = TURBO_LIVE_POLL_MS;
  _hubRefreshIntervalMs = TURBO_HUB_REFRESH_MS;
  _sseBroadcastIntervalMs = TURBO_SSE_BROADCAST_MS;

  console.log(`[LiveTurbo] TURBO MODE ON — ${liveCount} live game(s). Polling: 10s, Hub: 30s, SSE: 10s`);

  if (onTurboActivate) onTurboActivate();
  if (onSseIntervalChange) onSseIntervalChange(TURBO_SSE_BROADCAST_MS);

  // Immediately kick off turbo polling
  startTurboPoll();

  // Broadcast turbo mode status via SSE
  broadcastEvent("turbo-mode", {
    type: "turbo-mode",
    active: true,
    activeGameCount: liveCount,
    message: `Engines at full capacity — ${liveCount} live game${liveCount !== 1 ? "s" : ""} in progress`,
    timestamp: new Date().toISOString(),
  });
}

function deactivateTurboMode(): void {
  if (!_turboActive) return;
  _turboActive = false;
  _activeGameCount = 0;
  _deactivatedAt = new Date();
  _livePollingIntervalMs = DEFAULT_LIVE_POLL_MS;
  _hubRefreshIntervalMs = DEFAULT_HUB_REFRESH_MS;
  _sseBroadcastIntervalMs = DEFAULT_SSE_BROADCAST_MS;

  console.log("[LiveTurbo] TURBO MODE OFF — no live games. Intervals relaxed to defaults.");

  stopTurboPoll();

  if (onTurboDeactivate) onTurboDeactivate();
  if (onSseIntervalChange) onSseIntervalChange(DEFAULT_SSE_BROADCAST_MS);

  broadcastEvent("turbo-mode", {
    type: "turbo-mode",
    active: false,
    activeGameCount: 0,
    message: "Engines at standard capacity",
    timestamp: new Date().toISOString(),
  });
}

function startTurboPoll(): void {
  if (_turboPollInterval) return;
  _turboPollInterval = setInterval(async () => {
    try {
      await liveSportsData.refreshGames();
    } catch (err) {
      logError("[LiveTurbo] Turbo poll refresh failed", { error: String(err) });
    }
  }, TURBO_LIVE_POLL_MS);
}

function stopTurboPoll(): void {
  if (_turboPollInterval) {
    clearInterval(_turboPollInterval);
    _turboPollInterval = null;
  }
}

async function checkTurboCondition(): Promise<void> {
  _lastCheckedAt = new Date();
  const liveCount = countLiveGames();
  _activeGameCount = liveCount;

  if (liveCount > 0 && !_turboActive) {
    activateTurboMode(liveCount);
  } else if (liveCount === 0 && _turboActive) {
    deactivateTurboMode();
  } else if (liveCount > 0 && _turboActive) {
    _activeGameCount = liveCount;
  }
}

export function startLiveTurboScheduler(): void {
  if (_turboCheckInterval) return;
  console.log("[LiveTurbo] Starting Live Turbo Scheduler (checks every 15s)...");
  _turboCheckInterval = setInterval(() => {
    checkTurboCondition().catch(err =>
      logError("[LiveTurbo] Check failed", { error: String(err) })
    );
  }, 15_000);

  // Initial check
  checkTurboCondition().catch(() => {});
}

export function stopLiveTurboScheduler(): void {
  if (_turboCheckInterval) {
    clearInterval(_turboCheckInterval);
    _turboCheckInterval = null;
  }
  stopTurboPoll();
  console.log("[LiveTurbo] Live Turbo Scheduler stopped.");
}

export function getTurboModeStatus(): TurboModeStatus {
  return {
    active: _turboActive,
    activeGameCount: _activeGameCount,
    livePollingIntervalMs: _livePollingIntervalMs,
    hubRefreshIntervalMs: _hubRefreshIntervalMs,
    sseBroadcastIntervalMs: _sseBroadcastIntervalMs,
    activatedAt: _activatedAt?.toISOString() ?? null,
    deactivatedAt: _deactivatedAt?.toISOString() ?? null,
    lastCheckedAt: _lastCheckedAt.toISOString(),
  };
}

export function isTurboModeActive(): boolean {
  return _turboActive;
}

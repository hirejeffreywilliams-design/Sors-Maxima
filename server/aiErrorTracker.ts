// Global AI error tracker
// Shared module that records OpenAI 429/quota errors across all engines.
// Used by: pick-insight-engine.ts, betting-assistant route, ai/status endpoint.
// Persists state to disk so quota errors survive server restarts.

import { writeFileSync, readFileSync, existsSync } from "fs";

interface AiErrorState {
  lastError: string | null;
  lastErrorAt: number | null;
  consecutiveFailures: number;
}

const STATE_FILE = "/tmp/ai-error-state.json";

function loadState(): AiErrorState {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore read errors
  }
  return { lastError: null, lastErrorAt: null, consecutiveFailures: 0 };
}

function saveState(): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state), "utf-8");
  } catch {
    // ignore write errors — in-memory state still works
  }
}

const state: AiErrorState = loadState();

const RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes for generic errors
const QUOTA_RECOVERY_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours for quota exhaustion

export function recordAiError(message: string): void {
  state.lastError = message;
  state.lastErrorAt = Date.now();
  state.consecutiveFailures++;
  saveState();
}

export function recordAiSuccess(): void {
  state.consecutiveFailures = 0;
  saveState();
}

export function getAiAvailability(): { available: boolean; message: string; consecutiveFailures: number } {
  const isQuotaError = state.lastError && (state.lastError.includes("429") || state.lastError.includes("quota") || state.lastError.includes("exceeded"));
  const effectiveWindow = isQuotaError ? QUOTA_RECOVERY_WINDOW_MS : RECOVERY_WINDOW_MS;
  const hasRecentError = state.lastErrorAt && (Date.now() - state.lastErrorAt < effectiveWindow);

  if (hasRecentError && isQuotaError) {
    return {
      available: false,
      message: "AI analysis is temporarily at capacity. Your picks are still powered by the full 46-factor engine. AI insights resume automatically.",
      consecutiveFailures: state.consecutiveFailures,
    };
  }

  if (hasRecentError && state.consecutiveFailures >= 3) {
    return {
      available: false,
      message: state.lastError || "AI service temporarily unavailable",
      consecutiveFailures: state.consecutiveFailures,
    };
  }

  return {
    available: true,
    message: "AI systems operational",
    consecutiveFailures: state.consecutiveFailures,
  };
}

// Global AI error tracker
// Shared module that records OpenAI 429/quota errors across all engines.
// Used by: pick-insight-engine.ts, betting-assistant route, ai/status endpoint.

interface AiErrorState {
  lastError: string | null;
  lastErrorAt: number | null;
  consecutiveFailures: number;
}

const state: AiErrorState = {
  lastError: null,
  lastErrorAt: null,
  consecutiveFailures: 0,
};

const RECOVERY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes before considering "recovered"

export function recordAiError(message: string): void {
  state.lastError = message;
  state.lastErrorAt = Date.now();
  state.consecutiveFailures++;
}

export function recordAiSuccess(): void {
  state.consecutiveFailures = 0;
}

export function getAiAvailability(): { available: boolean; message: string; consecutiveFailures: number } {
  const hasRecentError = state.lastErrorAt && (Date.now() - state.lastErrorAt < RECOVERY_WINDOW_MS);
  const isQuotaError = state.lastError && (state.lastError.includes("429") || state.lastError.includes("quota") || state.lastError.includes("exceeded"));

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

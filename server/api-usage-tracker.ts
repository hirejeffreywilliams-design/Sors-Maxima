// Lightweight, dependency-free API usage tracker.
// Imported by both marketSnapshotEngine and launch-control without circular deps.

interface UsageSample {
  timestamp: number;
  remaining: number;
}

interface ApiCallRecord {
  timestamp: number;
  sport: string;
  gameCount: number;
  remaining: number;
  source: string;
}

const MAX_SAMPLES = 120;
const MAX_CALLS = 500;

// ── Odds API ──────────────────────────────────────────────────────────────────
const oddsApiSamples: UsageSample[] = [];
const oddsApiCalls: ApiCallRecord[] = [];

export function recordOddsApiCall(sport: string, gameCount: number, remaining: number, source = "MarketSnapshot"): void {
  const now = Date.now();
  oddsApiSamples.push({ timestamp: now, remaining });
  if (oddsApiSamples.length > MAX_SAMPLES) oddsApiSamples.shift();

  oddsApiCalls.push({ timestamp: now, sport, gameCount, remaining, source });
  if (oddsApiCalls.length > MAX_CALLS) oddsApiCalls.shift();
}

export function getOddsApiUsageStats() {
  if (!oddsApiSamples.length) return { remaining: null, burnRatePerHour: null, daysRemaining: null, lastCall: null, callCount: 0 };

  const latest = oddsApiSamples[oddsApiSamples.length - 1];
  const remaining = latest.remaining;
  const lastCall = new Date(latest.timestamp).toISOString();

  let burnRatePerHour: number | null = null;
  if (oddsApiSamples.length >= 2) {
    const windowMs = 30 * 60 * 1000; // 30-min window for burn rate
    const cutoff = Date.now() - windowMs;
    const windowSamples = oddsApiSamples.filter(s => s.timestamp >= cutoff);
    if (windowSamples.length >= 2) {
      const first = windowSamples[0];
      const last = windowSamples[windowSamples.length - 1];
      const deltaMs = last.timestamp - first.timestamp;
      const deltaUsed = first.remaining - last.remaining;
      if (deltaMs > 5000 && deltaUsed >= 0) {
        burnRatePerHour = Math.round((deltaUsed / deltaMs) * 3_600_000);
      }
    }
  }

  const daysRemaining = (burnRatePerHour !== null && burnRatePerHour > 0)
    ? parseFloat(((remaining) / (burnRatePerHour * 24)).toFixed(1))
    : null;

  return { remaining, burnRatePerHour, daysRemaining, lastCall, callCount: oddsApiCalls.length };
}

export function getRecentOddsApiCalls(limit = 20): ApiCallRecord[] {
  return oddsApiCalls.slice(-limit).reverse();
}

// ── BDL ────────────────────────────────────────────────────────────────────────
const bdlCallLog: { timestamp: number; sport: string; count: number; success: boolean }[] = [];

export function recordBDLCall(sport: string, count: number, success: boolean): void {
  bdlCallLog.push({ timestamp: Date.now(), sport, count, success });
  if (bdlCallLog.length > 200) bdlCallLog.shift();
}

export function getRecentBDLCalls(limit = 10) {
  return bdlCallLog.slice(-limit).reverse();
}

// ── API-Football ───────────────────────────────────────────────────────────────
const apiFootballLog: { timestamp: number; league: string; fixtureCount: number; success: boolean }[] = [];

export function recordApiFootballCall(league: string, fixtureCount: number, success: boolean): void {
  apiFootballLog.push({ timestamp: Date.now(), league, fixtureCount, success });
  if (apiFootballLog.length > 200) apiFootballLog.shift();
}

export function getRecentApiFootballCalls(limit = 10) {
  return apiFootballLog.slice(-limit).reverse();
}

// ── ESPN ────────────────────────────────────────────────────────────────────────
const espnLog: { timestamp: number; sport: string; gameCount: number; success: boolean }[] = [];

export function recordESPNCall(sport: string, gameCount: number, success: boolean): void {
  espnLog.push({ timestamp: Date.now(), sport, gameCount, success });
  if (espnLog.length > 200) espnLog.shift();
}

export function getRecentESPNCalls(limit = 10) {
  return espnLog.slice(-limit).reverse();
}

// ── NHL Stats ──────────────────────────────────────────────────────────────────
const nhlLog: { timestamp: number; teamCount: number; success: boolean }[] = [];

export function recordNHLStatsCall(teamCount: number, success: boolean): void {
  nhlLog.push({ timestamp: Date.now(), teamCount, success });
  if (nhlLog.length > 50) nhlLog.shift();
}

export function getLatestNHLCall() {
  return nhlLog.length ? nhlLog[nhlLog.length - 1] : null;
}

// ── MLB Stats ──────────────────────────────────────────────────────────────────
const mlbLog: { timestamp: number; teamCount: number; success: boolean }[] = [];

export function recordMLBStatsCall(teamCount: number, success: boolean): void {
  mlbLog.push({ timestamp: Date.now(), teamCount, success });
  if (mlbLog.length > 50) mlbLog.shift();
}

export function getLatestMLBCall() {
  return mlbLog.length ? mlbLog[mlbLog.length - 1] : null;
}

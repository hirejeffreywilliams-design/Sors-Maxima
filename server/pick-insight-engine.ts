// Async AI Edge Insight Engine
// Runs AFTER the prediction cycle completes — never blocks pick delivery.
// Generates a sharp 1-2 sentence edge insight for top picks (grade A/B).
// Uses GPT-4o-mini for cost efficiency (~$0.00015 per pick insight).
// Insights are cached by pick ID and injected back into the prediction cache.

import { logInfo, logWarn } from "./errorLogger";
import { recordAiError, recordAiSuccess, getAiAvailability } from "./aiErrorTracker";
import type { PrecomputedPick } from "./precomputedPredictionsEngine";

let openai: any = null;
async function getOpenAI() {
  if (openai) return openai;
  try {
    const { default: OpenAI } = await import("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  } catch {
    return null;
  }
}

const insightCache = new Map<string, string>();
let generationRunning = false;

export function getCachedInsight(pickId: string): string | undefined {
  return insightCache.get(pickId);
}

export function getInsightCacheSize(): number {
  return insightCache.size;
}

function formatFactorList(factors: PrecomputedPick["factors"]): string {
  return factors.slice(0, 4)
    .map(f => `${f.name} (${f.direction}, impact ${f.impact})`)
    .join(", ");
}

function buildPrompt(pick: PrecomputedPick): string {
  const factorStr = formatFactorList(pick.factors);
  return `You are a professional sports betting analyst. Write exactly 1-2 sentences (max 30 words total) summarizing the sharp edge for this pick. Be specific, analytical, and direct. Do NOT say "I" or "we". No fluff.

Pick: ${pick.pick} (${pick.sport})
Game: ${pick.game}
Bet type: ${pick.betType}
Confidence: ${pick.confidence}%
EV: ${pick.ev > 0 ? "+" : ""}${pick.ev.toFixed(1)}%
Win probability: ${pick.winProbability}%
Key factors: ${factorStr}
Model reasoning: ${pick.reasoning?.slice(0, 150) || "N/A"}

Edge insight (1-2 sentences, 30 words max):`;
}

async function generateInsightForPick(pick: PrecomputedPick, client: any): Promise<string | null> {
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(pick) }],
      max_tokens: 80,
      temperature: 0.5,
    });
    const text = resp.choices?.[0]?.message?.content?.trim();
    if (text) recordAiSuccess();
    return text || null;
  } catch (err: any) {
    logWarn(`[InsightEngine] Failed for pick ${pick.id}: ${err.message}`);
    recordAiError(err.message || String(err));
    return null;
  }
}

export async function enrichPicksWithInsights(picks: PrecomputedPick[]): Promise<void> {
  if (generationRunning) return;
  if (!process.env.OPENAI_API_KEY) return;

  const aiStatus = getAiAvailability();
  if (!aiStatus.available) {
    return; // Circuit breaker: skip silently when quota exhausted
  }

  const client = await getOpenAI();
  if (!client) return;

  const ELIGIBLE_GRADES = new Set(["A+", "A", "A-", "B+"]);
  const MAX_PER_CYCLE = 10;

  const eligible = picks.filter(p =>
    ELIGIBLE_GRADES.has(p.grade) &&
    p.confidence >= 62 &&
    !insightCache.has(p.id)
  ).slice(0, MAX_PER_CYCLE);

  if (!eligible.length) return;

  generationRunning = true;
  logInfo(`[InsightEngine] Generating edge insights for ${eligible.length} top picks...`);

  let generated = 0;
  for (const pick of eligible) {
    // Re-check circuit breaker before each call — bail out if quota hit mid-cycle
    if (!getAiAvailability().available) break;

    const insight = await generateInsightForPick(pick, client);
    if (insight) {
      insightCache.set(pick.id, insight);
      pick.aiInsight = insight;
      generated++;
    }
    // Throttle: 1 call per 300ms to respect rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  generationRunning = false;
  if (generated > 0) logInfo(`[InsightEngine] Generated ${generated} edge insights — cache size: ${insightCache.size}`);
}

// Inject cached insights into picks (called when serving picks from cache)
export function injectCachedInsights(picks: PrecomputedPick[]): void {
  for (const pick of picks) {
    if (!pick.aiInsight) {
      const cached = insightCache.get(pick.id);
      if (cached) pick.aiInsight = cached;
    }
  }
}

// Evict insights for picks older than 12 hours to prevent unbounded growth
export function evictStaleInsights(activePicks: PrecomputedPick[]): void {
  const activeIds = new Set(activePicks.map(p => p.id));
  let evicted = 0;
  for (const key of insightCache.keys()) {
    if (!activeIds.has(key)) {
      insightCache.delete(key);
      evicted++;
    }
  }
  if (evicted > 0) logInfo(`[InsightEngine] Evicted ${evicted} stale insights`);
}

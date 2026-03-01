import { createOpenAIClient } from "./openaiClient";
import type { PrecomputedPick } from "./precomputedPredictionsEngine";

const explanationCache = new Map<string, string>();
const cacheTimestamps = new Map<string, number>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

export function getPickExplanation(pickId: string): string | undefined {
  const ts = cacheTimestamps.get(pickId);
  if (ts && Date.now() - ts < CACHE_TTL_MS) return explanationCache.get(pickId);
  return undefined;
}

function buildPickPrompt(pick: PrecomputedPick): string {
  const oddsStr = pick.odds > 0 ? `+${pick.odds}` : `${pick.odds}`;
  const topFactors = pick.factors
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 4)
    .map(f => `${f.direction === 'positive' ? '+' : '-'} ${f.name} (${f.impact > 0 ? '+' : ''}${f.impact.toFixed(0)}%)`)
    .join('; ');

  const parts: string[] = [
    `Pick: ${pick.pick} (${pick.betType}) at ${oddsStr}`,
    `Game: ${pick.homeTeam} vs ${pick.awayTeam} | Sport: ${pick.sport}`,
    `Grade: ${pick.grade} | Confidence: ${pick.confidence}% | EV: ${pick.ev > 0 ? '+' : ''}${pick.ev.toFixed(1)}% | Edge: ${pick.edge > 0 ? '+' : ''}${pick.edge.toFixed(1)}%`,
    `Win probability: ${pick.winProbability.toFixed(1)}%`,
    `Top factors: ${topFactors}`,
  ];

  if (pick.situationalData) {
    const s = pick.situationalData;
    const homeRest = `${s.homeRestDays}d rest${s.homeB2B ? ' (back-to-back)' : ''}`;
    const awayRest = `${s.awayRestDays}d rest${s.awayB2B ? ' (back-to-back)' : ''}`;
    parts.push(`Schedule: ${pick.homeTeam} ${homeRest}, ${pick.awayTeam} ${awayRest}. ${s.spotDescription}`);
  }

  if (pick.injuryData) {
    const inj = pick.injuryData;
    if (inj.homeStartersOut > 0 || inj.awayStartersOut > 0) {
      parts.push(`Injuries: ${pick.homeTeam} missing ${inj.homeStartersOut} starters, ${pick.awayTeam} missing ${inj.awayStartersOut} starters`);
    }
  }

  if (pick.monteCarloData) {
    const mc = pick.monteCarloData;
    parts.push(`Monte Carlo (${mc.simulations.toLocaleString()} sims): ${pick.homeTeam} ${(mc.homeWinProb * 100).toFixed(0)}% win prob, projected ${mc.predictedHomeScore.toFixed(0)}-${mc.predictedAwayScore.toFixed(0)}`);
  }

  parts.push(`Model recommendation: ${pick.recommendation.replace(/_/g, ' ')}`);

  return `You are a sharp sports betting analyst for a members-only intelligence platform. Write a 2-3 sentence explanation for why this is a strong betting pick. Be direct and specific. Reference the most important factors. Use present tense. No em dashes. Third person when referring to teams.

${parts.join('\n')}

Write exactly 2-3 sentences. Be specific, not generic.`;
}

function formatFallbackExplanation(pick: PrecomputedPick): string {
  const topFactors = pick.factors
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 3);

  const factorText = topFactors.length > 0
    ? topFactors.map(f => `${f.name.replace(/_/g, ' ')} (${f.impact > 0 ? '+' : ''}${f.impact.toFixed(0)}%)`).join(', ')
    : 'multiple model factors';

  const edgePct = pick.winProbability - (100 / (Math.abs(pick.odds) < 100 ? 1 : (pick.odds > 0 ? pick.odds / 100 + 1 : 100 / Math.abs(pick.odds) + 1)));
  const edgeStr = Math.abs(edgePct) > 1 ? ` The model sees a ${Math.abs(edgePct).toFixed(0)}% edge at these odds.` : '';

  const injuryNote = pick.injuryData && (pick.injuryData.homeStartersOut > 0 || pick.injuryData.awayStartersOut > 0)
    ? ` Injury report factors into the projection.`
    : '';

  return `The 46-Factor Model rates this pick ${pick.grade} (${pick.confidence}% confidence) based on ${factorText}.${injuryNote}${edgeStr}`;
}

export async function generatePickExplanation(pick: PrecomputedPick): Promise<string> {
  const cached = getPickExplanation(pick.id);
  if (cached) return cached;

  const openai = createOpenAIClient();
  if (!openai) return formatFallbackExplanation(pick);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPickPrompt(pick) }],
      max_tokens: 160,
      temperature: 0.65,
    });
    const explanation = response.choices[0]?.message?.content?.trim() || formatFallbackExplanation(pick);
    explanationCache.set(pick.id, explanation);
    cacheTimestamps.set(pick.id, Date.now());
    return explanation;
  } catch (err: any) {
    console.error("[AIExplainer] Error generating explanation:", err.message);
    return formatFallbackExplanation(pick);
  }
}

export async function warmupExplanations(picks: PrecomputedPick[]): Promise<void> {
  const openai = createOpenAIClient();
  if (!openai) return;

  const needsExplanation = picks
    .filter(p => !getPickExplanation(p.id))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 18);

  if (needsExplanation.length === 0) return;

  console.log(`[AIExplainer] Generating explanations for top ${needsExplanation.length} picks...`);

  for (let i = 0; i < needsExplanation.length; i += 3) {
    const batch = needsExplanation.slice(i, i + 3);
    await Promise.allSettled(batch.map(p => generatePickExplanation(p)));
    if (i + 3 < needsExplanation.length) await new Promise(r => setTimeout(r, 600));
  }

  console.log(`[AIExplainer] Warmup complete — ${needsExplanation.length} explanations cached`);
}

export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [id, ts] of cacheTimestamps.entries()) {
    if (now - ts > CACHE_TTL_MS) {
      explanationCache.delete(id);
      cacheTimestamps.delete(id);
    }
  }
}

export function getCacheStats(): { cached: number; capacity: number } {
  return { cached: explanationCache.size, capacity: 200 };
}

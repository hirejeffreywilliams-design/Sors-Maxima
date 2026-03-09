import type { Express } from "express";
import { requireAdmin } from "./helpers";
import { createOpenAIClient } from "../openaiClient";
import { generatePickExplanation, getPickExplanation, getCacheStats } from "../aiPickExplainer";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import { generateIntelligenceFeed } from "../unifiedIntelligenceHub";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

// Internal AI routes — admin and system use only.
// These endpoints power backend intelligence, admin analysis, and system diagnostics.
// They are NOT exposed to end users.

export function registerAiRoutes(app: Express): void {

  // ── GET /api/ai/pick-explanation/:pickId ─────────────────────────────────
  // Admin: retrieve or generate a model explanation for a pick (for QA and admin review).
  app.get("/api/ai/pick-explanation/:pickId", requireAdmin, async (req, res) => {
    const { pickId } = req.params;

    const cached = getPickExplanation(pickId);
    if (cached) return res.json({ explanation: cached, cached: true });

    let foundPick: any = null;
    for (const sport of SPORTS) {
      const cache = getPrecomputedCache(sport);
      if (!cache?.picks) continue;
      const pick = cache.picks.find((p: any) => p.id === pickId);
      if (pick) { foundPick = pick; break; }
    }

    if (!foundPick) {
      return res.status(404).json({ error: "Pick not found" });
    }

    try {
      const explanation = await generatePickExplanation(foundPick);
      res.json({ explanation, cached: false });
    } catch {
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  // ── POST /api/ai/analyze-parlay ───────────────────────────────────────────
  // Admin: structured parlay analysis using GPT-4o (for admin testing and QA).
  const previewCache = new Map<string, { data: any; cachedAt: number }>();
  const PREVIEW_CACHE_TTL = 30 * 60 * 1000;

  app.post("/api/ai/analyze-parlay", requireAdmin, async (req, res) => {
    const { legs } = req.body;
    if (!legs || !Array.isArray(legs) || legs.length < 2) {
      return res.status(400).json({ error: "Provide at least 2 legs for analysis" });
    }
    if (legs.length > 12) {
      return res.status(400).json({ error: "Maximum 12 legs for analysis" });
    }

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    const legDescriptions = legs.map((leg: any, i: number) => {
      const odds = leg.odds > 0 ? `+${leg.odds}` : `${leg.odds}`;
      const grade = leg.grade ? ` [Grade: ${leg.grade}]` : '';
      const ev = leg.evPercent != null ? ` EV: ${leg.evPercent > 0 ? '+' : ''}${Number(leg.evPercent).toFixed(1)}%` : '';
      const conf = leg.confidence ? ` Confidence: ${leg.confidence}%` : '';
      return `Leg ${i + 1}: ${leg.game} — ${leg.pick} (${leg.betType || 'unknown'}) at ${odds}${grade}${ev}${conf}`;
    }).join('\n');

    const decimalOdds = legs.reduce((acc: number, leg: any) => {
      const o = Number(leg.odds);
      return acc * (o > 0 ? (o / 100 + 1) : (100 / Math.abs(o) + 1));
    }, 1);
    const combinedAmerican = decimalOdds >= 2
      ? `+${Math.round((decimalOdds - 1) * 100)}`
      : `-${Math.round(100 / (decimalOdds - 1))}`;

    const { getAIStandardsContext } = await import("../companyStandards");
    const standardsContext = getAIStandardsContext();

    const prompt = `${standardsContext}

TASK: You are analyzing a ${legs.length}-leg parlay for a Sors Maxima member. Return ONLY a valid JSON object.

PARLAY:
${legDescriptions}

Combined odds: ${combinedAmerican} (${decimalOdds.toFixed(2)}x)

Return this exact JSON structure:
{
  "grade": "A" | "B" | "C" | "D",
  "verdict": "sharp" | "moderate" | "recreational" | "avoid",
  "assessment": "One clear sentence on overall parlay value — data-driven, no hype",
  "strengths": ["strength 1", "strength 2"],
  "risks": ["risk 1", "risk 2"],
  "correlationNote": "One sentence about leg correlation",
  "stakeAdvice": "Recommended stake as % of bankroll (quarter Kelly: 25% of Kelly calculation)",
  "keyInsight": "The single most important statistical factor"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.6,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let analysis: any;
      try { analysis = JSON.parse(content); } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      res.json({ ...analysis, legCount: legs.length, combinedOdds: combinedAmerican, analyzedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error("[AI Parlay] Error:", err.message);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // ── GET /api/ai/game-preview/:gameId ──────────────────────────────────────
  // Admin: deep-dive game preview using live intelligence feed (for admin QA and reporting).
  app.get("/api/ai/game-preview/:gameId", requireAdmin, async (req, res) => {
    const { gameId } = req.params;

    const cached = previewCache.get(gameId);
    if (cached && Date.now() - cached.cachedAt < PREVIEW_CACHE_TTL) {
      return res.json({ ...cached.data, fromCache: true });
    }

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    let gameData: any = null;
    try {
      const feed = await generateIntelligenceFeed();
      gameData = feed.games?.find((g: any) => g.id === gameId);
    } catch (err: any) {
      console.error("[AI Preview] Failed to get feed:", err.message);
    }

    if (!gameData) return res.status(404).json({ error: "Game not found in current feed" });

    const g = gameData;
    const homeTeam = g.homeTeam?.name || 'Home';
    const awayTeam = g.awayTeam?.name || 'Away';
    const spread = g.odds?.spread != null ? `${homeTeam} ${g.odds.spread > 0 ? '+' : ''}${g.odds.spread}` : 'No line';
    const total = g.odds?.total != null ? `${g.odds.total}` : 'N/A';

    const prompt = `Sharp sports analyst. Deep-dive game preview. Return ONLY JSON.

GAME: ${awayTeam} @ ${homeTeam} | ${g.sport || ''} | ${g.date || 'Today'}
Lines: Spread: ${spread} | Total: O/U ${total}
${g.injuries ? `Injuries: ${homeTeam} ${g.injuries.homeStartersOut || 0} out, ${awayTeam} ${g.injuries.awayStartersOut || 0} out.` : ''}

Return: {"headline":"","keyFactors":[],"spreadAngle":"","totalAngle":"","modelLean":"","bettingAngle":"","xFactor":"","confidenceLevel":"high"|"medium"|"low","keyRisk":""}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.65,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let preview: any;
      try { preview = JSON.parse(content); } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const result = { ...preview, gameId, game: `${awayTeam} @ ${homeTeam}`, sport: g.sport, generatedAt: new Date().toISOString() };
      previewCache.set(gameId, { data: result, cachedAt: Date.now() });
      res.json({ ...result, fromCache: false });
    } catch (err: any) {
      console.error("[AI Preview] Error:", err.message);
      res.status(500).json({ error: "Preview generation failed" });
    }
  });

  // ── GET /api/ai/status ────────────────────────────────────────────────────
  // Public AI status check — reads from global error tracker.
  app.get("/api/ai/status", async (_req, res) => {
    const { getAiAvailability } = await import("../aiErrorTracker");
    const status = getAiAvailability();
    res.json({
      ...status,
      explanationCache: getCacheStats(),
    });
  });
}

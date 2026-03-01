import type { Express } from "express";
import { requireAuth, requireTier } from "./helpers";
import { createOpenAIClient } from "../openaiClient";
import { generatePickExplanation, getPickExplanation, getCacheStats } from "../aiPickExplainer";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import { generateIntelligenceFeed } from "../unifiedIntelligenceHub";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

// Per-user rate limits (calls per day)
const parlayAnalyzerCalls = new Map<string, { count: number; resetAt: number }>();
const gamePreviewCalls = new Map<string, { count: number; resetAt: number }>();

const TIER_LIMITS: Record<string, { parlay: number; preview: number }> = {
  pro: { parlay: 5, preview: 8 },
  elite: { parlay: 15, preview: 25 },
  whale: { parlay: 999, preview: 999 },
};

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, userId: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const entry = map.get(userId);

  if (!entry || now > entry.resetAt) {
    map.set(userId, { count: 1, resetAt: tomorrow.getTime() });
    return { allowed: true, remaining: max - 1 };
  }
  if (entry.count >= max) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

function getUserTier(req: any): string {
  return req.session?.subscriptionTier || req.session?.tier || 'pro';
}

export function registerAiRoutes(app: Express): void {

  // ── GET /api/ai/pick-explanation/:pickId ─────────────────────────────────
  // Returns AI-generated explanation for a specific pick. Cached from warmup cycle.
  // Falls back to on-demand generation if not cached.
  app.get("/api/ai/pick-explanation/:pickId", requireAuth, async (req, res) => {
    const { pickId } = req.params;

    const cached = getPickExplanation(pickId);
    if (cached) return res.json({ explanation: cached, cached: true });

    // Find pick across all sport caches
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
  // Takes legs from bet slip and returns a structured parlay analysis.
  app.post("/api/ai/analyze-parlay", requireAuth, requireTier("pro", "elite", "whale"), async (req, res) => {
    const userId = req.session?.userId as string;
    const tier = getUserTier(req);
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.pro;
    const rateCheck = checkRateLimit(parlayAnalyzerCalls, userId, limits.parlay);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: "Daily analysis limit reached",
        resetAt: "midnight",
        upgradeNote: tier === 'pro' ? "Upgrade to Edge for 15 analyses/day" : undefined,
      });
    }

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
      const wl = leg.winProbability ? ` Win prob: ${leg.winProbability.toFixed(0)}%` : '';
      return `Leg ${i + 1}: ${leg.game} — ${leg.pick} (${leg.betType || 'unknown'}) at ${odds}${grade}${ev}${conf}${wl}`;
    }).join('\n');

    const decimalOdds = legs.reduce((acc: number, leg: any) => {
      const o = Number(leg.odds);
      return acc * (o > 0 ? (o / 100 + 1) : (100 / Math.abs(o) + 1));
    }, 1);
    const combinedAmerican = decimalOdds >= 2
      ? `+${Math.round((decimalOdds - 1) * 100)}`
      : `-${Math.round(100 / (decimalOdds - 1))}`;

    const prompt = `You are a sharp sports betting analyst for an exclusive members-only intelligence platform. Analyze this ${legs.length}-leg parlay and return ONLY a valid JSON object.

PARLAY:
${legDescriptions}

Combined odds: ${combinedAmerican} (${decimalOdds.toFixed(2)}x)

Return this exact JSON structure (no markdown, no explanation, just the JSON):
{
  "grade": "A" | "B" | "C" | "D",
  "verdict": "sharp" | "moderate" | "recreational" | "avoid",
  "assessment": "One clear sentence on the overall value of this parlay",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2"],
  "correlationNote": "One sentence about how the legs relate to each other, or 'Legs appear independent.' if no notable correlation",
  "stakeAdvice": "Recommended stake as % of bankroll (e.g. '0.5-1% of bankroll')",
  "keyInsight": "The single most important thing to know about this parlay"
}

Be direct. Base your analysis on the EV, grades, and bet types. Be specific about which legs are strongest/weakest.`;

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
      try {
        analysis = JSON.parse(content);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      res.json({
        ...analysis,
        legCount: legs.length,
        combinedOdds: combinedAmerican,
        decimalOdds: parseFloat(decimalOdds.toFixed(2)),
        remainingToday: rateCheck.remaining,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[AI Parlay] Error:", err.message);
      res.status(500).json({ error: "Analysis failed — please try again" });
    }
  });

  // ── GET /api/ai/game-preview/:gameId ──────────────────────────────────────
  // Returns a structured AI deep-dive on a specific game.
  const previewCache = new Map<string, { data: any; cachedAt: number }>();
  const PREVIEW_CACHE_TTL = 30 * 60 * 1000;

  app.get("/api/ai/game-preview/:gameId", requireAuth, requireTier("pro", "elite", "whale"), async (req, res) => {
    const { gameId } = req.params;
    const userId = req.session?.userId as string;
    const tier = getUserTier(req);
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.pro;

    const cached = previewCache.get(gameId);
    if (cached && Date.now() - cached.cachedAt < PREVIEW_CACHE_TTL) {
      return res.json({ ...cached.data, fromCache: true });
    }

    const rateCheck = checkRateLimit(gamePreviewCalls, userId, limits.preview);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: "Daily preview limit reached",
        upgradeNote: tier === 'pro' ? "Upgrade to Edge for 25 previews/day" : undefined,
      });
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

    if (!gameData) {
      return res.status(404).json({ error: "Game not found in current feed" });
    }

    const g = gameData;
    const homeTeam = g.homeTeam?.name || g.name?.split(' @ ')?.[0] || 'Home';
    const awayTeam = g.awayTeam?.name || g.name?.split(' @ ')?.[1] || 'Away';
    const spread = g.odds?.spread != null ? `${homeTeam} ${g.odds.spread > 0 ? '+' : ''}${g.odds.spread}` : 'No line';
    const total = g.odds?.total != null ? `${g.odds.total}` : 'N/A';
    const homeML = g.odds?.homeMoneyline != null ? (g.odds.homeMoneyline > 0 ? `+${g.odds.homeMoneyline}` : g.odds.homeMoneyline) : 'N/A';
    const awayML = g.odds?.awayMoneyline != null ? (g.odds.awayMoneyline > 0 ? `+${g.odds.awayMoneyline}` : g.odds.awayMoneyline) : 'N/A';

    const weatherNote = g.weather?.bettingImpact && g.weather.bettingImpact !== 'none'
      ? `Weather: ${g.weather.temperature}°F, wind ${g.weather.windSpeed}mph, ${g.weather.condition}. Impact: ${g.weather.bettingImpact}.`
      : 'Indoor or weather not a factor.';

    const injuryNote = g.injuries
      ? `Injuries: ${homeTeam} ${g.injuries.homeStartersOut || 0} starters out, ${awayTeam} ${g.injuries.awayStartersOut || 0} starters out.`
      : 'No injury data available.';

    const homeRecord = g.homeTeam?.record || '';
    const awayRecord = g.awayTeam?.record || '';
    const edgeNote = g.edgeAnalysis
      ? `Model edge: Home ${(g.edgeAnalysis.homeEV || 0).toFixed(1)}% EV, Away ${(g.edgeAnalysis.awayEV || 0).toFixed(1)}% EV.`
      : '';

    const prompt = `You are a sharp sports betting analyst for an exclusive members-only intelligence platform. Generate a deep-dive game preview and return ONLY valid JSON.

GAME: ${awayTeam} @ ${homeTeam} | ${g.sport || 'Sports'} | ${g.date || 'Today'}
Records: ${homeTeam} ${homeRecord}, ${awayTeam} ${awayRecord}
Lines: Spread: ${spread} | Total: O/U ${total} | ML: ${homeTeam} ${homeML} / ${awayTeam} ${awayML}
Bookmakers tracking: ${g.bookmakerCount || 'multiple'} books
${injuryNote}
${weatherNote}
${edgeNote}

Return this exact JSON (no markdown, no extra text):
{
  "headline": "8-12 word betting angle for this game",
  "keyFactors": [
    "Factor 1 — specific and data-driven",
    "Factor 2 — specific and data-driven",
    "Factor 3 — specific and data-driven",
    "Factor 4 — specific and data-driven",
    "Factor 5 — specific and data-driven"
  ],
  "spreadAngle": "One sentence on the spread play",
  "totalAngle": "One sentence on the over/under",
  "modelLean": "Which side the model favors and why — one sentence",
  "bettingAngle": "The primary sharp play in one direct sentence",
  "xFactor": "The one variable that could flip this game — one sentence",
  "confidenceLevel": "high" | "medium" | "low",
  "keyRisk": "The biggest risk to the favored side — one sentence"
}

Be sharp, specific, and direct. Reference actual teams and numbers.`;

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
      try {
        preview = JSON.parse(content);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const result = {
        ...preview,
        gameId,
        game: `${awayTeam} @ ${homeTeam}`,
        sport: g.sport,
        lines: { spread, total, homeML, awayML },
        remainingToday: rateCheck.remaining,
        generatedAt: new Date().toISOString(),
      };

      previewCache.set(gameId, { data: result, cachedAt: Date.now() });
      res.json({ ...result, fromCache: false });
    } catch (err: any) {
      console.error("[AI Preview] Error:", err.message);
      res.status(500).json({ error: "Preview generation failed — please try again" });
    }
  });

  // ── GET /api/ai/status ────────────────────────────────────────────────────
  app.get("/api/ai/status", requireAuth, (req, res) => {
    const openai = createOpenAIClient();
    const stats = getCacheStats();
    res.json({
      available: !!openai,
      explanationCache: stats,
      features: ["pick-explanations", "parlay-analyzer", "game-preview"],
    });
  });
}

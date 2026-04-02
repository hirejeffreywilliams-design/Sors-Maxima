import type { Express } from "express";
import { requireAdmin, requireAuth } from "./helpers";
import { createOpenAIClient } from "../openaiClient";
import { generatePickExplanation, getPickExplanation, getCacheStats } from "../aiPickExplainer";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import { generateIntelligenceFeed } from "../unifiedIntelligenceHub";
import { getTrackRecord } from "../calibrationEngine";
import { getAIStandardsContext } from "../companyStandards";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

// Internal AI routes — admin and system use only.
// These endpoints power backend intelligence, admin analysis, and system diagnostics.
// /api/ai/analyst is open to ALL authenticated users (no tier gate).

export function registerAiRoutes(app: Express): void {

  // ── POST /api/ai/analyst ───────────────────────────────────────────────────
  // Sports betting AI companion for ALL authenticated users.
  // Accepts a conversation history and returns an AI response grounded in
  // platform data (calibration, recent picks, EV, Kelly, joint probability).
  app.post("/api/ai/analyst", requireAuth, async (req, res) => {
    const { messages } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    // ── Platform context ────────────────────────────────────────────────────
    let calibrationSummary = "Track record: initializing (not enough settled picks yet).";
    let recentPicksSummary = "No picks loaded in the current cycle.";
    try {
      const tr = getTrackRecord();
      if (tr.hasMinimumData && tr.overallWinRate != null) {
        const bySport = tr.bySport
          .filter(s => s.actualWinRate != null && s.settled >= 5)
          .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))
          .slice(0, 5)
          .map(s => `${s.sport}: ${(s.actualWinRate ?? 0).toFixed(1)}% (${s.settled} settled)`)
          .join(", ");
        calibrationSummary =
          `Overall win rate: ${tr.overallWinRate.toFixed(1)}% across ${tr.settledPicks} settled picks. ` +
          `Recent trend (last 20): ${tr.recentTrend.last20WinRate != null ? tr.recentTrend.last20WinRate.toFixed(1) + "%" : "N/A"} (${tr.recentTrend.trend}). ` +
          (bySport ? `By sport: ${bySport}.` : "");
      } else {
        calibrationSummary = `Model calibration: ${tr.settledPicks} settled picks — needs ${tr.minimumPicksRequired} for full validation.`;
      }
    } catch { /* silently fall through */ }

    try {
      const allPicks: any[] = [];
      for (const sport of SPORTS) {
        const cache = getPrecomputedCache(sport as any);
        if (cache?.picks) {
          allPicks.push(...cache.picks.filter((p: any) => p.grade && (p.grade === "A" || p.grade === "B")).slice(0, 3));
        }
      }
      if (allPicks.length > 0) {
        recentPicksSummary = "Today's top-graded picks (Grades A/B):\n" +
          allPicks.slice(0, 8).map((p: any) => {
            const ev = p.ev != null ? ` | EV: ${p.ev > 0 ? "+" : ""}${Number(p.ev).toFixed(1)}%` : "";
            const kelly = p.kellyFraction != null ? ` | Kelly: ${(Number(p.kellyFraction) * 100).toFixed(1)}%` : "";
            const conf = p.confidence != null ? ` | Conf: ${p.confidence}%` : "";
            return `• ${p.pick} (${p.sport}, Grade ${p.grade}, ${p.odds > 0 ? "+" : ""}${p.odds}${conf}${ev}${kelly})`;
          }).join("\n");
      }
    } catch { /* silently fall through */ }

    const standardsCtx = getAIStandardsContext();

    const systemPrompt = `${standardsCtx}

You are SORS Intelligence — the official AI analyst of Sors Maxima, a members-only sports betting intelligence platform. You speak directly to a member.

Your expertise:
- Sports betting: moneylines, spreads, totals, props, parlays (NBA, NFL, MLB, NHL, NCAAB, NCAAF, MMA, Soccer)
- Kelly criterion & fractional Kelly for bankroll sizing
- Expected Value (EV) calculation and interpretation
- Joint probability and parlay correlation risks
- Line movement, closing line value (CLV), sharp money signals
- Platform's 46-Factor Model: 46 risk/edge dimensions scored per pick
- Calibration: comparing model confidence to actual outcomes
- Cashout engineering strategies (Sportsbook Sweat™, Lock & Roll™, Steam Exit™)

Live Platform Data:
${calibrationSummary}

${recentPicksSummary}

Core rules you ALWAYS follow:
1. JOINT PROBABILITY: When a user asks about parlays, clearly explain that joint probability for N legs reduces the win probability significantly. Example: 3 legs at 65% each = 0.65³ = 27.5%. Flag correlated legs (same game, same team) as problematic.
2. KELLY SIZING: When advising on stake size, always recommend quarter-Kelly (Kelly × 0.25) as the maximum. Never suggest betting more than 2–3% of bankroll on any single bet.
3. RESPONSIBLE GAMBLING: When discussing stakes, always include: "Remember: bet only what you can afford to lose. For help, call 1-800-522-4700 (NCPG)."
4. DATA GROUNDED: Reference actual platform calibration stats and today's graded picks when relevant. Never fabricate win rates.
5. SCOPE: Focus on sports betting analytics. If asked about other topics, politely redirect.
6. HONEST ABOUT UNCERTAINTY: Never guarantee outcomes. Say "the model suggests" or "the edge indicates", not "this will win."
7. CONCISE: Be precise and data-rich. Avoid filler phrases. Members are sophisticated bettors.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 600,
        temperature: 0.65,
      });

      const response = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
      res.json({ response });
    } catch (err: any) {
      console.error("[AI Analyst] Error:", err.message);
      if (err.status === 429 || err.status === 503) {
        return res.status(503).json({ error: "AI service temporarily at capacity. Please try again shortly." });
      }
      res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  });

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

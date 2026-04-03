import type { Express } from "express";
import { requireAdmin, requireAuth } from "./helpers";
import { createOpenAIClient } from "../openaiClient";
import { generatePickExplanation, getPickExplanation, getCacheStats } from "../aiPickExplainer";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import { generateIntelligenceFeed } from "../unifiedIntelligenceHub";
import { buildAnalystContext, getActivePicks } from "../analystContextBuilder";
import { querySimulationAgent, isSimulationQuery, getNewSimulationFactors } from "../monteCarloVerticalAgent";
import { getOverdriveStatus, getSimulationDepthForGame, getSimulationTier, formatSimCount } from "../overdriveEngine";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

// Internal AI routes — admin and system use only.
// These endpoints power backend intelligence, admin analysis, and system diagnostics.
// /api/ai/analyst is open to ALL authenticated users (no tier gate).

export function registerAiRoutes(app: Express): void {

  // ── POST /api/ai/analyst ───────────────────────────────────────────────────
  // Sports betting AI companion for ALL authenticated users (no tier gate).
  // Accepts a conversation history, assembles rich platform context via
  // buildAnalystContext(), injects joint probability for parlay queries,
  // and returns a GPT-4o response.
  app.post("/api/ai/analyst", requireAuth, async (req, res) => {
    const { messages } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    const userId = req.session?.userId;

    // ── Route to Simulation Specialist if query is simulation-related ────────
    if (isSimulationQuery(messages[messages.length - 1]?.content || "")) {
      const simResponse = await querySimulationAgent(messages, userId);
      if (simResponse) {
        return res.json({ response: simResponse.response, handledBy: simResponse.handledBy });
      }
      // Fall through to main analyst if simulation agent is unavailable
    }

    // ── Build token-budgeted platform context ───────────────────────────────
    const ctx = await buildAnalystContext(userId, messages);

    const systemPrompt = `${ctx.standardsContext}

You are SORS Intelligence — the official AI analyst of Sors Maxima, a members-only sports betting intelligence platform. You speak directly to a member.

Your expertise:
- Sports betting: moneylines, spreads, totals, props, parlays (NBA, NFL, MLB, NHL, NCAAB, NCAAF, MMA, Soccer)
- Kelly criterion & fractional Kelly for bankroll sizing
- Expected Value (EV) calculation and interpretation
- Joint probability and parlay correlation risks (ALWAYS compute and warn)
- Line movement, closing line value (CLV), sharp money signals
- Platform's 51-Factor Model: 51 risk/edge dimensions scored per pick (46 original + 5 new: referee crew bias, micro-matchups, coach tendencies, sentiment, travel quality)
- For simulation questions, defer to the Simulation Specialist agent
- Simulation depth tiers: Good (10K+), Strong (100K+), Elite (500K+), Overdrive Elite (1M+)
- Calibration: comparing model confidence to actual outcomes by sport and confidence tier
- Cashout engineering strategies (Sportsbook Sweat™, Lock & Roll™, Steam Exit™)

=== LIVE PLATFORM CALIBRATION ===
${ctx.calibrationBlock}

=== ACTIVE PICKS (TODAY) ===
${ctx.activePicsBlock}

=== USER BANKROLL PROFILE ===
${ctx.bankrollBlock}

Core rules you ALWAYS follow:
1. JOINT PROBABILITY: When a user asks about parlays, ALWAYS show the math. Example: 3 legs at 65% each = 0.65³ = 27.5%. Flag correlated legs (same game, same team) as problematic. The picks above include implied probabilities to use in calculations.
2. KELLY SIZING: Always recommend quarter-Kelly (Kelly × 0.25) as the maximum. Reference the user's bankroll profile if set. Never suggest more than 2–3% of bankroll.
3. RESPONSIBLE GAMBLING: When discussing stakes or losses, always include: "Bet only what you can afford to lose. Help: 1-800-522-4700 (NCPG)."
4. DATA GROUNDED: Cite the actual calibration numbers and grade-specific win rates from the context above. Never fabricate stats.
5. SCOPE: Focus on sports betting analytics only.
6. HONEST ABOUT UNCERTAINTY: Say "the model suggests" or "the edge indicates" — never "this will win."
7. CONCISE: Be precise and data-rich. Members are sophisticated bettors. No filler phrases.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 650,
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

  // ── GET /api/simulation/depth/:gameId ─────────────────────────────────────
  // Returns simulation depth info for a specific game (for recommendation cards).
  app.get("/api/simulation/depth/:gameId", requireAuth, (req, res) => {
    try {
      const { gameId } = req.params;
      const depth = getSimulationDepthForGame(gameId);
      res.json(depth);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to get simulation depth" });
    }
  });

  // ── GET /api/simulation/overdrive-status ──────────────────────────────────
  // Returns current overdrive engine status (admin + users).
  app.get("/api/simulation/overdrive-status", requireAuth, (req, res) => {
    try {
      const status = getOverdriveStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: "Overdrive status unavailable" });
    }
  });

  // ── GET /api/simulation/factors ───────────────────────────────────────────
  // Returns the 5 new simulation factors (for display in UI).
  app.get("/api/simulation/factors", requireAuth, (req, res) => {
    try {
      const factors = getNewSimulationFactors();
      res.json({ factors, totalFactors: 51 });
    } catch (err: any) {
      res.status(500).json({ error: "Factor registry unavailable" });
    }
  });

  // ── GET /api/ai/analyst/context ────────────────────────────────────────────
  // Returns current platform context for the AI Analyst page sidebar.
  // Includes: active picks (grade, EV, Kelly, modelAgreement), calibration summary.
  app.get("/api/ai/analyst/context", requireAuth, async (req, res) => {
    try {
      const picks = getActivePicks(8);
      const { getTrackRecord } = await import("../calibrationEngine");
      const { getPrecomputedCache } = await import("../precomputedPredictionsEngine");
      const tr = getTrackRecord();

      // Compute average model agreement across all active picks
      const SPORTS_CTX = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;
      let totalAgreement = 0;
      let agreementCount = 0;
      for (const s of SPORTS_CTX) {
        const cache = getPrecomputedCache(s);
        if (!cache?.picks) continue;
        for (const p of cache.picks) {
          if (p.grade === "A" || p.grade === "B") {
            const ma = (p as Record<string, unknown>).modelAgreement;
            if (typeof ma === "number") {
              totalAgreement += ma;
              agreementCount++;
            }
          }
        }
      }
      const avgModelAgreement = agreementCount > 0 ? totalAgreement / agreementCount : null;

      const calibration = {
        hasData: tr.hasMinimumData,
        overallWinRate: tr.overallWinRate,
        settledPicks: tr.settledPicks,
        trend: tr.recentTrend.trend,
        last20WinRate: tr.recentTrend.last20WinRate,
        calibrationScore: tr.calibrationScore,
        avgModelAgreement,
        bySport: tr.bySport
          .filter(s => s.actualWinRate != null && s.settled >= 5)
          .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))
          .slice(0, 6),
        byGrade: tr.byGrade
          .filter(g => g.actualWinRate != null && g.settled >= 3)
          .sort((a, b) => a.grade.localeCompare(b.grade)),
      };

      res.json({ picks, calibration });
    } catch (err: any) {
      console.error("[AI Context] Error:", err.message);
      res.status(500).json({ error: "Context unavailable" });
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

  // ── GET /api/ai/recommendation ────────────────────────────────────────────
  // Contextual AI recommendation panel for user-facing pages.
  // Queries cached Intelligence Hub + Precomputed Predictions first (no new API calls).
  // Falls back to GPT-4o-mini only when cache is stale. Rate limited: 10 req/min/user.
  const recommendationCache = new Map<string, { data: any; cachedAt: number }>();
  const recommendationRateLimit = new Map<string, { count: number; windowStart: number }>();
  const RECOMMENDATION_CACHE_TTL = 3 * 60 * 1000;
  const RATE_LIMIT_WINDOW = 60 * 1000;
  const RATE_LIMIT_MAX = 10;

  const PAGE_CONTEXTS: Record<string, string> = {
    "dashboard": "Overall platform performance, top picks across all sports today",
    "daily-picks": "Daily parlay recommendations and top straight bets",
    "live": "Live games in progress, cashout opportunities, momentum plays",
    "player-props": "Player prop bets with sharpest edge today",
    "prop-parlay-builder": "Correlated prop parlay combinations, risk assessment",
    "odds-center": "Best odds across books, arbitrage and EV opportunities",
    "strategy-advisor": "Betting strategy optimization, Kelly sizing, bankroll allocation",
    "bankroll": "Stake sizing recommendations based on current confidence tiers",
    "my-bets": "Active bet performance, cashout timing, hedge opportunities",
    "watchlist": "Tracked games and picks requiring attention",
    "personalized-insights": "Personalized edge based on betting history",
    "results": "Recent performance trends, model calibration insights",
    "tools": "Analytical tool recommendations for current market conditions",
  };

  app.get("/api/ai/recommendation", requireAuth, async (req, res) => {
    const userId = req.session?.userId ?? "anonymous";
    const page = (req.query.page as string) || "dashboard";
    const sport = (req.query.sport as string) || "";
    const gameId = (req.query.gameId as string) || "";

    // Rate limiting
    const rlKey = userId;
    const now = Date.now();
    const rl = recommendationRateLimit.get(rlKey) || { count: 0, windowStart: now };
    if (now - rl.windowStart > RATE_LIMIT_WINDOW) {
      rl.count = 0;
      rl.windowStart = now;
    }
    rl.count++;
    recommendationRateLimit.set(rlKey, rl);
    if (rl.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: "Rate limit exceeded — please wait before refreshing" });
    }

    const cacheKey = `${page}-${sport}-${gameId}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && now - cached.cachedAt < RECOMMENDATION_CACHE_TTL) {
      return res.json({ ...cached.data, fromCache: true });
    }

    try {
      // Pull from in-memory caches first
      const allSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;
      const allPicks: any[] = [];
      for (const s of allSports) {
        if (sport && s !== sport.toUpperCase()) continue;
        const cache = getPrecomputedCache(s);
        if (cache?.picks?.length) {
          allPicks.push(...cache.picks.slice(0, 5));
        }
      }

      let feed: any = null;
      try {
        feed = await generateIntelligenceFeed();
      } catch { /* best-effort */ }

      const topPick = allPicks.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
      const liveGames = feed?.liveGames?.length || 0;
      const edgeAlerts = feed?.edgeAlerts?.slice(0, 3) || [];
      const topEdgeAlert = edgeAlerts[0];

      const pageContext = PAGE_CONTEXTS[page] || `${page} page`;

      let recommendation: any;

      // Build recommendation from cached data when possible
      if (topPick) {
        const confidence = topPick.confidence || 60;
        const tier =
          confidence >= 75 ? "LOCK" :
          confidence >= 65 ? "STRONG" :
          confidence >= 55 ? "LEAN" : "VALUE";

        const headline = page === "live" && liveGames > 0
          ? `${liveGames} game${liveGames !== 1 ? "s" : ""} live now — sharp signals active`
          : page === "player-props"
            ? `Sharpest prop edge today: ${topPick.game || "Top game"}`
            : page === "bankroll"
              ? `Stake sizing signal: ${tier} tier active (${confidence}% confidence)`
              : page === "prop-parlay-builder"
                ? topEdgeAlert ? `Correlated risk alert on ${topEdgeAlert.game || "top game"}` : `${allPicks.length} props available for parlay building`
                : `Top edge: ${topPick.game || "Today's top pick"} — ${confidence}% confidence`;

        const action = page === "bankroll"
          ? `Use ${tier === "LOCK" ? "1.5–2u" : tier === "STRONG" ? "1u" : "0.5u"} stake on ${tier} picks (quarter-Kelly)`
          : page === "live" && liveGames > 0
            ? "Check live momentum tracker for cashout opportunities"
            : page === "player-props"
              ? `Focus on ${topPick.sport || "top sport"} props with +EV edge today`
              : page === "prop-parlay-builder"
                ? "Avoid same-game props on high-correlation legs"
                : `Review ${topPick.pick || "top pick"} at ${topPick.odds > 0 ? "+" : ""}${topPick.odds || "-110"}`;

        recommendation = {
          headline,
          confidence,
          tier,
          action,
          deepLinkContext: {
            page,
            sport: topPick.sport || sport,
            pick: topPick.pick,
            game: topPick.game,
            context: pageContext,
          },
        };
      } else {
        // Fallback: use GPT-4o-mini for page-specific insight if no cached picks
        const openai = createOpenAIClient();
        if (!openai) {
          return res.status(503).json({ error: "AI unavailable" });
        }

        const prompt = `You are SORS Intelligence. Generate a contextual betting insight for the ${pageContext}.
Return ONLY JSON: {"headline":"<concise insight>","confidence":<50-75>,"tier":"<LOCK|STRONG|LEAN|VALUE>","action":"<one-line action prompt>"}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.6,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content || "{}";
        try {
          const parsed = JSON.parse(content);
          recommendation = {
            ...parsed,
            deepLinkContext: { page, sport, context: pageContext },
          };
        } catch {
          recommendation = {
            headline: "Analyzing current market conditions",
            confidence: 58,
            tier: "LEAN",
            action: "Check today's top picks for the best available edges",
            deepLinkContext: { page, sport, context: pageContext },
          };
        }
      }

      recommendationCache.set(cacheKey, { data: recommendation, cachedAt: now });
      res.json({ ...recommendation, fromCache: false });
    } catch (err: any) {
      console.error("[AI Recommendation] Error:", err.message);
      res.status(500).json({ error: "Recommendation unavailable" });
    }
  });

  // ── GET /api/ai/turbo-status ──────────────────────────────────────────────
  // Returns current Live Turbo Mode status for admin panel.
  app.get("/api/ai/turbo-status", requireAuth, async (_req, res) => {
    try {
      const { getTurboModeStatus } = await import("../liveTurboScheduler");
      const { getSSEBroadcastIntervalMs } = await import("../sseManager");
      const status = getTurboModeStatus();
      res.json({ ...status, sseBroadcastIntervalMs: getSSEBroadcastIntervalMs() });
    } catch (err: any) {
      res.status(500).json({ error: "Turbo status unavailable" });
    }
  });
}

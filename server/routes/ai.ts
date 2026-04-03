import type { Express } from "express";
import { requireAdmin, requireAuth } from "./helpers";
import { createOpenAIClient } from "../openaiClient";
import { generatePickExplanation, getPickExplanation, getCacheStats } from "../aiPickExplainer";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import { generateIntelligenceFeed } from "../unifiedIntelligenceHub";
import { buildAnalystContext, getActivePicks } from "../analystContextBuilder";
import { querySimulationAgent, isSimulationQuery, getNewSimulationFactors } from "../monteCarloVerticalAgent";
import { getOverdriveStatus, getSimulationDepthForGame, getSimulationTier, formatSimCount } from "../overdriveEngine";
import { stripeService } from "../stripeService";
import {
  checkAiUsageLimit,
  incrementAiUsage,
  upsertSessionContext,
  getSessionContext,
  TIER_DAILY_LIMITS,
} from "../aiUsageService";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

// ─── Tier capability descriptions for upgrade prompts ─────────────────────────
const NEXT_TIER_BENEFITS: Record<string, { tier: string; display: string; price: string; benefits: string[] }> = {
  free: {
    tier: "pro",
    display: "Sharp",
    price: "$49/mo",
    benefits: ["15 messages/day", "Pick context injected", "Live data summaries", "Kelly sizing advice"],
  },
  pro: {
    tier: "elite",
    display: "Edge",
    price: "$99/mo",
    benefits: ["50 messages/day", "Full analyst context", "Strategy tools", "Parlay math engine"],
  },
  elite: {
    tier: "whale",
    display: "Max",
    price: "$249/mo",
    benefits: ["Unlimited messages", "Monte Carlo output", "Sharp money signals", "Live game monitoring", "Proactive alerts"],
  },
};

// ─── Helper: get user tier from session ──────────────────────────────────────
async function getUserTier(req: any): Promise<{ tier: string; userId: number | null }> {
  if (req.session?.isAdmin) return { tier: "whale", userId: null };

  const username = req.session?.username;
  const userId = req.session?.userId ? parseInt(req.session.userId as string) : null;

  if (!username) return { tier: "free", userId: null };

  try {
    const sub = await stripeService.getUserSubscription(username);
    return { tier: sub?.subscriptionTier || "free", userId };
  } catch {
    return { tier: "free", userId };
  }
}

// ─── Helper: extract game IDs mentioned in a message ─────────────────────────
function extractGameRefs(text: string): string[] {
  const patterns = [
    /\b([A-Z][a-z]+ vs\.? [A-Z][a-z]+)\b/g,
    /game[_\s-]?id[:\s=]+([a-zA-Z0-9_-]+)/gi,
  ];
  const refs: string[] = [];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      refs.push(m[1]);
    }
  }
  return refs;
}

// ─── Build tier-differentiated system prompt ──────────────────────────────────
async function buildTieredSystemPrompt(
  tier: string,
  userId: number | null,
  messages: { role: string; content: string }[],
  sportFocus?: string,
): Promise<string> {
  const ctx = await buildAnalystContext(userId?.toString(), messages);

  const VALID_SPORTS = ["NFL", "NBA", "MLB", "NHL", "NCAAB", "NCAAF", "Soccer", "MMA"];
  const validatedSportFocus = sportFocus && VALID_SPORTS.find(s => s.toUpperCase() === sportFocus.toUpperCase());
  const sportFocusNote = validatedSportFocus
    ? `\n=== ACTIVE SPORT FOCUS ===\nThe user is currently focused on ${validatedSportFocus}. Prioritize ${validatedSportFocus}-related picks, analysis, and recommendations in your response unless the user asks about something else.\n`
    : "";

  const baseIdentity = `You are SORS Intelligence — the official AI analyst of Sors Maxima, a members-only sports betting intelligence platform. You speak directly to a member.

Your expertise:
- Sports betting: moneylines, spreads, totals, props, parlays (NBA, NFL, MLB, NHL, NCAAB, NCAAF, MMA, Soccer)
- Kelly criterion & fractional Kelly for bankroll sizing
- Expected Value (EV) calculation and interpretation
- Joint probability and parlay correlation risks (ALWAYS compute and warn)
- Line movement, closing line value (CLV), sharp money signals`;

  if (tier === "free") {
    return `${ctx.standardsContext}${sportFocusNote}

${baseIdentity}

You are operating in FREE tier mode. Provide general betting education only — no specific pick recommendations, no live data, no platform pick context. Focus on concepts, rules, and educational content.

Core rules you ALWAYS follow:
1. RESPONSIBLE GAMBLING: Always include: "Bet only what you can afford to lose. Help: 1-800-522-4700 (NCPG)."
2. SCOPE: Sports betting education only — explain concepts but do not reference live picks.
3. UPGRADE NUDGE: When relevant, mention that Sharp tier unlocks pick context and live data.
4. CONCISE: Be helpful and educational.`;
  }

  if (tier === "pro") {
    return `${ctx.standardsContext}${sportFocusNote}

${baseIdentity}
- Platform's 51-Factor Model: 51 risk/edge dimensions scored per pick

=== ACTIVE PICKS (TODAY) ===
${ctx.activePicsBlock}

=== USER BANKROLL PROFILE ===
${ctx.bankrollBlock}

Core rules you ALWAYS follow:
1. JOINT PROBABILITY: When a user asks about parlays, ALWAYS show the math.
2. KELLY SIZING: Always recommend quarter-Kelly (Kelly × 0.25) as the maximum.
3. RESPONSIBLE GAMBLING: "Bet only what you can afford to lose. Help: 1-800-522-4700 (NCPG)."
4. DATA GROUNDED: Reference actual picks from context above.
5. CONCISE: Be precise and data-rich.`;
  }

  if (tier === "elite") {
    return `${ctx.standardsContext}${sportFocusNote}

${baseIdentity}
- Platform's 51-Factor Model: 51 risk/edge dimensions scored per pick (46 original + 5 new: referee crew bias, micro-matchups, coach tendencies, sentiment, travel quality)
- Calibration: comparing model confidence to actual outcomes by sport and confidence tier
- Cashout engineering strategies (Sportsbook Sweat™, Lock & Roll™, Steam Exit™)

=== LIVE PLATFORM CALIBRATION ===
${ctx.calibrationBlock}

=== ACTIVE PICKS (TODAY) ===
${ctx.activePicsBlock}

=== USER BANKROLL PROFILE ===
${ctx.bankrollBlock}

Core rules you ALWAYS follow:
1. JOINT PROBABILITY: When a user asks about parlays, ALWAYS show the math. Example: 3 legs at 65% each = 0.65³ = 27.5%. Flag correlated legs as problematic.
2. KELLY SIZING: Always recommend quarter-Kelly (Kelly × 0.25) as the maximum. Reference the user's bankroll profile if set.
3. RESPONSIBLE GAMBLING: "Bet only what you can afford to lose. Help: 1-800-522-4700 (NCPG)."
4. DATA GROUNDED: Cite the actual calibration numbers and grade-specific win rates from the context above. Never fabricate stats.
5. SCOPE: Focus on sports betting analytics only.
6. CONCISE: Be precise and data-rich. Members are sophisticated bettors.`;
  }

  // whale (Max) tier — full vertical specialist
  let maxEngineData = "";
  try {
    const picks = getActivePicks(10);
    const sharpSignals = picks
      .filter(p => p.ev > 3)
      .map(p => `• ${p.pick} (${p.sport}) — EV: +${p.ev.toFixed(1)}%, Conf: ${p.confidence}%, Edge: +${p.edge.toFixed(1)}%`)
      .join("\n");
    if (sharpSignals) {
      maxEngineData += `\n=== SHARP MONEY SIGNALS (HIGH EV PICKS) ===\n${sharpSignals}`;
    }

    // Monte Carlo context (from precomputed picks)
    const mcData = picks
      .slice(0, 5)
      .map(p => {
        const decimal = p.odds > 0 ? 1 + p.odds / 100 : 1 + 100 / Math.abs(p.odds);
        const kelly = Math.max(0, (decimal * p.impliedProbability - (1 - p.impliedProbability)) / decimal);
        return `• ${p.pick}: Win prob ${(p.impliedProbability * 100).toFixed(1)}%, Kelly ${(kelly * 100).toFixed(2)}%, Grade ${p.grade}`;
      })
      .join("\n");
    if (mcData) {
      maxEngineData += `\n\n=== MONTE CARLO / MODEL OUTPUTS ===\n${mcData}`;
    }
  } catch { /* best-effort */ }

  return `${ctx.standardsContext}${sportFocusNote}

${baseIdentity}
- Platform's 51-Factor Model: 51 risk/edge dimensions scored per pick (46 original + 5 new: referee crew bias, micro-matchups, coach tendencies, sentiment, travel quality)
- Calibration: comparing model confidence to actual outcomes by sport and confidence tier
- Cashout engineering strategies (Sportsbook Sweat™, Lock & Roll™, Steam Exit™)
- Monte Carlo simulation outputs and custom model weights
- Simulation depth tiers: Good (10K+), Strong (100K+), Elite (500K+), Overdrive Elite (1M+)
- Sharp money flow tracking and line reversal signals
- Kelly Criterion calculation with fractional sizing

You are operating in MAX tier mode. You are a VERTICAL SPECIALIST. Before answering, identify the specific subject of the question:
- SPREAD BET → apply line movement analysis, sharp money, model lean
- PARLAY MATH → compute joint probability, correlation risks, Kelly sizing
- PLAYER PROP → check player trend data, model projections, market efficiency
- LIVE GAME → reference real-time scores/lines, momentum signals, cashout advice
- BANKROLL → apply Kelly criterion, risk-adjusted sizing, drawdown protection
- CASHOUT → use Sportsbook Sweat™ / Lock & Roll™ / Steam Exit™ frameworks
Then route your answer through the relevant engine(s) and reference actual platform data.

=== LIVE PLATFORM CALIBRATION ===
${ctx.calibrationBlock}

=== ACTIVE PICKS (TODAY) ===
${ctx.activePicsBlock}

=== USER BANKROLL PROFILE ===
${ctx.bankrollBlock}
${maxEngineData}

Core rules you ALWAYS follow:
1. VERTICAL ROUTING: Identify question type first, then answer as a domain specialist for that type.
2. JOINT PROBABILITY: For parlays, ALWAYS show the math. Example: 3 legs at 65% = 0.65³ = 27.5%.
3. KELLY SIZING: Quarter-Kelly (Kelly × 0.25) maximum. Reference user's bankroll profile.
4. RESPONSIBLE GAMBLING: "Bet only what you can afford to lose. Help: 1-800-522-4700 (NCPG)."
5. DATA GROUNDED: Cite actual calibration numbers and pick data. Never fabricate stats.
6. CONCISE: Be precise and data-rich. Max members are professional-level bettors.`;
}

// Internal AI routes — admin and system use only.
// These endpoints power backend intelligence, admin analysis, and system diagnostics.

export function registerAiRoutes(app: Express): void {

  // ── GET /api/ai/usage ──────────────────────────────────────────────────────
  // Returns the user's current daily AI usage and their tier limit.
  app.get("/api/ai/usage", requireAuth, async (req, res) => {
    const { tier, userId } = await getUserTier(req);

    if (!userId) {
      const limit = TIER_DAILY_LIMITS[tier] ?? 3;
      return res.json({ current: 0, limit, tier });
    }

    const { current, limit } = await checkAiUsageLimit(userId, tier);
    res.json({ current, limit, tier });
  });

  // ── POST /api/ai/analyst ───────────────────────────────────────────────────
  // Sports betting AI companion for ALL authenticated users.
  // Enforces per-tier daily limits and injects tier-differentiated context.
  app.post("/api/ai/analyst", requireAuth, async (req, res) => {
    const { messages, isOnboarding, sportFocus } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      isOnboarding?: boolean;
      sportFocus?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    const { tier, userId } = await getUserTier(req);

    // ── Enforce daily usage limits (admins + whale are exempt) ──────────────
    if (userId && !req.session?.isAdmin && tier !== "whale") {
      const usageCheck = await checkAiUsageLimit(userId, tier);
      if (!usageCheck.allowed) {
        const nextTier = NEXT_TIER_BENEFITS[tier];
        return res.status(429).json({
          error: "daily_limit_reached",
          message: `You've used all ${usageCheck.limit} messages for today on the ${tier === "free" ? "Free" : tier === "pro" ? "Sharp" : "Edge"} plan.`,
          current: usageCheck.current,
          limit: usageCheck.limit,
          tier,
          nextTier: nextTier || null,
          upgradeUrl: "/pricing",
        });
      }
    }

    // ── Route simulation queries to Simulation Specialist ────────────────────
    if (isSimulationQuery(messages[messages.length - 1]?.content || "")) {
      const simResponse = await querySimulationAgent(messages, userId?.toString());
      if (simResponse) {
        let newCount = 0;
        if (userId && !req.session?.isAdmin && tier !== "whale") {
          newCount = await incrementAiUsage(userId);
        }
        const limit = TIER_DAILY_LIMITS[tier];
        return res.json({
          response: simResponse.response,
          handledBy: simResponse.handledBy,
          usage: { current: newCount, limit, tier },
        });
      }
      // Fall through to main analyst if simulation agent unavailable
    }

    // ── Build tier-differentiated system prompt ──────────────────────────────
    const systemPrompt = await buildTieredSystemPrompt(tier, userId, messages, sportFocus);

    try {
      const maxTokens = tier === "whale" ? 900 : tier === "elite" ? 750 : tier === "pro" ? 650 : 500;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        max_tokens: maxTokens,
        temperature: 0.65,
      });

      const response = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

      // ── Increment usage (skip for whale/admin) ────────────────────────────
      let newCount = 0;
      if (userId && !req.session?.isAdmin && tier !== "whale") {
        newCount = await incrementAiUsage(userId);
      }

      // ── Track session context for live monitoring (Max tier) ─────────────
      if (tier === "whale" && userId) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        const gameRefs = extractGameRefs(lastUserMsg?.content ?? "");
        if (gameRefs.length > 0 || response.length > 100) {
          await upsertSessionContext(userId, gameRefs, {
            text: response.slice(0, 500),
            gameId: gameRefs[0],
            timestamp: new Date().toISOString(),
          });
        }
      }

      const limit = TIER_DAILY_LIMITS[tier];
      res.json({
        response,
        usage: {
          current: newCount,
          limit,
          tier,
        },
      });
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

  // ── POST /api/ai/onboarding-greeting ──────────────────────────────────────
  // Generates a personalized AI greeting for the onboarding "Meet Your AI" step.
  app.post("/api/ai/onboarding-greeting", requireAuth, async (req, res) => {
    const { sports, experience } = req.body as { sports?: string[]; experience?: string };

    const openai = createOpenAIClient();
    if (!openai) return res.status(503).json({ error: "AI service unavailable" });

    const { userId, tier } = await getUserTier(req);

    // Check daily usage limit
    if (userId && !req.session?.isAdmin && tier !== "whale") {
      const usageCheck = await checkAiUsageLimit(userId, tier);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          error: "daily_limit_reached",
          message: "Daily message limit reached.",
          tier,
        });
      }
    }

    const sportsStr = sports && sports.length > 0 ? sports.join(", ") : "sports betting";
    const expMap: Record<string, string> = {
      beginner: "you're new to betting",
      intermediate: "you bet recreationally",
      advanced: "you're an experienced sharp bettor",
      professional: "you're a professional-level bettor",
    };
    const expStr = expMap[experience || ""] || "you're interested in sports betting";

    const prompt = `You are SORS Intelligence, the official AI analyst of Sors Maxima. A new member just joined. Generate a warm, personalized greeting (2-3 sentences max) that:
1. Welcomes them by name (just say "Welcome")
2. References that they follow ${sportsStr} and that ${expStr}
3. Briefly mentions you can help them find edges, size bets correctly, and navigate the platform
Keep it conversational, data-focused, and under 60 words. Do not use emojis.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.7,
      });

      const greeting = completion.choices[0]?.message?.content ?? "Welcome to Sors Maxima. I'm SORS Intelligence — here to help you find edges, size your bets with Kelly criterion, and get the most from the platform. Ask me anything.";

      if (userId && !req.session?.isAdmin && tier !== "whale") {
        await incrementAiUsage(userId);
      }

      res.json({ greeting });
    } catch (err: any) {
      console.error("[AI Onboarding] Error:", err.message);
      res.json({ greeting: "Welcome to Sors Maxima. I'm SORS Intelligence — your AI analyst powered by live data, real calibration stats, and the 51-factor model. Ask me anything about today's picks, parlay math, or bankroll sizing." });
    }
  });

  // ── GET /api/ai/analyst/context ────────────────────────────────────────────
  // Returns current platform context for the AI Analyst page sidebar.
  app.get("/api/ai/analyst/context", requireAuth, async (req, res) => {
    try {
      const picks = getActivePicks(8);
      const { getTrackRecord } = await import("../calibrationEngine");
      const { getPrecomputedCache } = await import("../precomputedPredictionsEngine");
      const tr = getTrackRecord();

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
  app.get("/api/ai/status", async (_req, res) => {
    const { getAiAvailability } = await import("../aiErrorTracker");
    const status = getAiAvailability();
    res.json({
      ...status,
      explanationCache: getCacheStats(),
    });
  });

  // ── GET /api/ai/recommendation ────────────────────────────────────────────
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

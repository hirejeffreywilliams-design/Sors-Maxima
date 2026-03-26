import type { Express, Request, Response } from "express";
import { requireAuth, requireSubscription } from "./helpers";
import { getAllPreSimulated } from "../monteCarloEngine";
import { getTeamFormData } from "../teamHistoricalFormEngine";
import { generateMarketSnapshot } from "../marketSnapshotEngine";
import { getPrecomputedPredictions } from "../precomputedPredictionsEngine";
import type { Sport } from "@shared/schema";
import { db } from "../db";
import { sql } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PatternBadge {
  label: string;
  type: "sharp" | "value" | "fade" | "trend" | "caution" | "hot";
  detail: string;
}

interface GameStrategyCard {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime?: string;
  mcData: {
    homeWinProb: number;
    awayWinProb: number;
    predictedTotal: number;
    homeSpreadCoverProb: number;
    overProb: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
  };
  homeForm: {
    formScore: number;
    streakType: "W" | "L";
    streakLength: number;
    last10Wins: number;
    last10Losses: number;
    avgMargin: number;
  } | null;
  awayForm: {
    formScore: number;
    streakType: "W" | "L";
    streakLength: number;
    last10Wins: number;
    last10Losses: number;
    avgMargin: number;
  } | null;
  marketSignals: {
    hasSharpAction: boolean;
    sharpSide?: string;
    lineMovementVelocity?: string;
    valueSide?: string;
    homeEV: number;
    awayEV: number;
    spread?: number;
    total?: number;
    homeML?: number;
    awayML?: number;
  };
  patterns: PatternBadge[];
  topRecommendation: {
    market: string;
    side: string;
    rationale: string;
    confidenceLevel: "high" | "medium" | "low";
  };
  riskRating: "low" | "medium" | "high";
  edgeScore: number;
}

interface SessionPlan {
  date: string;
  edgeScore: number;
  bestSport: string;
  bestSportReason: string;
  parlayConditions: "excellent" | "good" | "fair" | "poor";
  parlayConditionsReason: string;
  stakeRecommendation: "aggressive" | "standard" | "conservative" | "minimal";
  stakeReason: string;
  activeSports: Array<{ sport: string; gameCount: number; avgEdge: number; topPick?: string }>;
  sessionInsights: string[];
  cautions: string[];
  optimalBetTypes: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildPatterns(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  mc: ReturnType<typeof getAllPreSimulated>[number],
  homeForm: GameStrategyCard["homeForm"],
  awayForm: GameStrategyCard["awayForm"],
  marketSignals: GameStrategyCard["marketSignals"]
): PatternBadge[] {
  const badges: PatternBadge[] = [];

  // Form divergence
  if (homeForm && awayForm) {
    const formGap = homeForm.formScore - awayForm.formScore;
    if (formGap >= 3) {
      badges.push({ label: "Form Edge", type: "trend", detail: `${homeTeam} outperforming by ${formGap.toFixed(1)} form points` });
    } else if (formGap <= -3) {
      badges.push({ label: "Form Edge", type: "trend", detail: `${awayTeam} outperforming by ${Math.abs(formGap).toFixed(1)} form points` });
    }
  }

  // Win streak
  if (homeForm?.streakType === "W" && homeForm.streakLength >= 4) {
    badges.push({ label: `${homeTeam} Hot Streak`, type: "hot", detail: `${homeForm.streakLength}-game win streak` });
  }
  if (awayForm?.streakType === "W" && awayForm.streakLength >= 4) {
    badges.push({ label: `${awayTeam} Hot Streak`, type: "hot", detail: `${awayForm.streakLength}-game win streak` });
  }
  if (homeForm?.streakType === "L" && homeForm.streakLength >= 3) {
    badges.push({ label: `${homeTeam} Cold`, type: "caution", detail: `${homeForm.streakLength}-game losing streak` });
  }

  // Sharp money
  if (marketSignals.hasSharpAction) {
    badges.push({ label: "Sharp Money", type: "sharp", detail: `Steam move detected on ${marketSignals.sharpSide ?? "this game"}` });
  }

  // Value side
  if (marketSignals.valueSide && marketSignals.valueSide !== "none") {
    const evTeam = marketSignals.valueSide === "home" ? homeTeam : awayTeam;
    badges.push({ label: "Market Value", type: "value", detail: `${evTeam} showing positive EV edge` });
  }

  // MC prob divergence from implied odds
  const mcHomeProb = mc.homeWinProb ?? 0.5;
  const homeML = marketSignals.homeML;
  if (homeML) {
    const impliedHome = homeML > 0 ? 100 / (100 + homeML) : Math.abs(homeML) / (Math.abs(homeML) + 100);
    const mcVsImplied = mcHomeProb - impliedHome;
    if (mcVsImplied >= 0.08) {
      badges.push({ label: "Model Edge", type: "value", detail: `MC model ${(mcVsImplied * 100).toFixed(0)}% above market on ${homeTeam}` });
    } else if (mcVsImplied <= -0.08) {
      badges.push({ label: "Model Edge", type: "value", detail: `MC model ${(Math.abs(mcVsImplied) * 100).toFixed(0)}% above market on ${awayTeam}` });
    }
  }

  // Over/under lean
  if ((mc.overProb ?? 0.5) >= 0.62) {
    badges.push({ label: "Over Lean", type: "trend", detail: `MC projects ${(mc.overProb! * 100).toFixed(0)}% over probability` });
  } else if ((mc.overProb ?? 0.5) <= 0.38) {
    badges.push({ label: "Under Lean", type: "trend", detail: `MC projects ${((1 - mc.overProb!) * 100).toFixed(0)}% under probability` });
  }

  // Sport-specific patterns
  if (sport === "NBA") {
    if ((mc.predictedTotal ?? 0) >= 230) badges.push({ label: "High Pace Game", type: "trend", detail: "Pace projects well above average — favor totals/props" });
    if ((mc.predictedTotal ?? 0) <= 205) badges.push({ label: "Defensive Battle", type: "caution", detail: "Low pace projected — unders may hold value" });
  }
  if (sport === "NFL" || sport === "NCAAF") {
    if (marketSignals.spread && Math.abs(marketSignals.spread) >= 10) {
      badges.push({ label: "Big Spread", type: "caution", detail: "Blowout scenario possible — 2H props and alt lines worth exploring" });
    }
  }
  if (sport === "MLB") {
    if ((mc.predictedTotal ?? 0) <= 7.5) badges.push({ label: "Pitcher Duel", type: "trend", detail: "Low total suggests ace matchup — first 5 innings markets apply" });
  }
  if (sport === "NHL") {
    if ((mc.predictedTotal ?? 0) <= 5.5) badges.push({ label: "Goalie Duel", type: "trend", detail: "Defensive game expected" });
  }

  // Public fade candidate: away team on losing streak vs dominant home
  if (awayForm?.streakType === "L" && awayForm.streakLength >= 3 && homeForm && homeForm.formScore >= 4) {
    badges.push({ label: "Fade Candidate", type: "fade", detail: `${awayTeam} struggling on road vs dominant home team` });
  }

  return badges.slice(0, 5);
}

function buildTopRecommendation(
  homeTeam: string,
  awayTeam: string,
  mc: ReturnType<typeof getAllPreSimulated>[number],
  homeForm: GameStrategyCard["homeForm"],
  awayForm: GameStrategyCard["awayForm"],
  marketSignals: GameStrategyCard["marketSignals"]
): GameStrategyCard["topRecommendation"] {
  const homeWinProb = mc.homeWinProb ?? 0.5;
  const overProb = mc.overProb ?? 0.5;
  const spreadCoverProb = mc.homeSpreadCoverProb ?? 0.5;

  // Highest confidence signal
  const signals: Array<{ market: string; side: string; prob: number; rationale: string }> = [
    { market: "Moneyline", side: homeWinProb > 0.5 ? homeTeam : awayTeam, prob: Math.max(homeWinProb, 1 - homeWinProb), rationale: `MC gives ${(Math.max(homeWinProb, 1 - homeWinProb) * 100).toFixed(0)}% win probability` },
    { market: "Spread", side: spreadCoverProb > 0.5 ? homeTeam : awayTeam, prob: Math.max(spreadCoverProb, 1 - spreadCoverProb), rationale: `Spread cover probability ${(Math.max(spreadCoverProb, 1 - spreadCoverProb) * 100).toFixed(0)}%` },
    { market: "Total", side: overProb > 0.5 ? "Over" : "Under", prob: Math.max(overProb, 1 - overProb), rationale: `MC projects ${(Math.max(overProb, 1 - overProb) * 100).toFixed(0)}% probability for ${overProb > 0.5 ? "Over" : "Under"}` },
  ];

  // Boost if market signals agree
  if (marketSignals.valueSide === "home" && homeWinProb > 0.5) signals[0].prob += 0.05;
  if (marketSignals.valueSide === "away" && homeWinProb < 0.5) signals[0].prob += 0.05;
  if (marketSignals.hasSharpAction) {
    const sharpSide = marketSignals.sharpSide ?? "";
    if (sharpSide.toLowerCase().includes("home") || sharpSide.toLowerCase().includes(homeTeam.toLowerCase())) signals[1].prob += 0.04;
  }

  // Form adds weight
  if (homeForm && awayForm) {
    if (homeForm.formScore > awayForm.formScore + 2 && homeWinProb > 0.5) signals[0].prob += 0.03;
  }

  const best = signals.reduce((a, b) => a.prob > b.prob ? a : b);
  const confidence: "high" | "medium" | "low" = best.prob >= 0.63 ? "high" : best.prob >= 0.56 ? "medium" : "low";

  return { market: best.market, side: best.side, rationale: best.rationale, confidenceLevel: confidence };
}

function calcEdgeScore(mc: ReturnType<typeof getAllPreSimulated>[number], marketSignals: GameStrategyCard["marketSignals"], homeForm: GameStrategyCard["homeForm"], awayForm: GameStrategyCard["awayForm"]): number {
  let score = 50;
  const homeWinProb = mc.homeWinProb ?? 0.5;
  const overProb = mc.overProb ?? 0.5;
  // MC conviction
  const mcMaxProb = Math.max(homeWinProb, 1 - homeWinProb);
  if (mcMaxProb >= 0.65) score += 15;
  else if (mcMaxProb >= 0.58) score += 8;
  // EV
  const maxEV = Math.max(marketSignals.homeEV, marketSignals.awayEV);
  if (maxEV >= 8) score += 15;
  else if (maxEV >= 4) score += 8;
  // Sharp action
  if (marketSignals.hasSharpAction) score += 8;
  // Form conviction
  if (homeForm && awayForm && Math.abs(homeForm.formScore - awayForm.formScore) >= 4) score += 8;
  // Totals conviction
  if (Math.max(overProb, 1 - overProb) >= 0.62) score += 6;
  return Math.min(100, score);
}

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerStrategyIntelligenceRoutes(app: Express): void {

  // ── GET /api/strategy/session ─────────────────────────────────────────────
  app.get("/api/strategy/session", requireSubscription, async (_req: Request, res: Response) => {
    try {
      const allSims = getAllPreSimulated();
      const sports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"] as Sport[];

      const sportEdges: Record<string, { gameCount: number; totalEdge: number; picks: string[] }> = {};

      for (const sim of allSims) {
        const sport = sim.sport ?? "NBA";
        if (!sportEdges[sport]) sportEdges[sport] = { gameCount: 0, totalEdge: 0, picks: [] };
        const mcMaxProb = Math.max(sim.homeWinProb ?? 0.5, 1 - (sim.homeWinProb ?? 0.5));
        const edgeScore = mcMaxProb >= 0.65 ? 80 : mcMaxProb >= 0.58 ? 65 : 50;
        sportEdges[sport].gameCount++;
        sportEdges[sport].totalEdge += edgeScore;
      }

      // Merge with precomputed predictions
      const predResults = await Promise.allSettled(
        sports.map(s => getPrecomputedPredictions(s).catch(() => null))
      );
      predResults.forEach((result, i) => {
        if (result.status === "fulfilled" && result.value) {
          const sport = sports[i];
          if (!sportEdges[sport]) sportEdges[sport] = { gameCount: 0, totalEdge: 0, picks: [] };
          const picks = result.value.picks ?? [];
          const highEv = picks.filter(p => (p.ev ?? 0) >= 5);
          sportEdges[sport].totalEdge += highEv.length * 10;
          if (picks[0]) sportEdges[sport].picks.push(picks[0].team ?? "");
        }
      });

      const activeSports = Object.entries(sportEdges)
        .filter(([, v]) => v.gameCount > 0 || v.picks.length > 0)
        .map(([sport, v]) => ({
          sport,
          gameCount: v.gameCount,
          avgEdge: v.gameCount > 0 ? Math.round(v.totalEdge / v.gameCount) : 55,
          topPick: v.picks[0],
        }))
        .sort((a, b) => b.avgEdge - a.avgEdge);

      const bestSport = activeSports[0]?.sport ?? "NBA";
      const sessionEdge = activeSports[0]?.avgEdge ?? 55;

      const totalGames = allSims.length;
      const highConfGames = allSims.filter(s => Math.max(s.homeWinProb ?? 0.5, 1 - (s.homeWinProb ?? 0.5)) >= 0.60).length;
      const parlayConditions: SessionPlan["parlayConditions"] =
        highConfGames >= 5 ? "excellent" :
        highConfGames >= 3 ? "good" :
        highConfGames >= 1 ? "fair" : "poor";

      const stakeRecommendation: SessionPlan["stakeRecommendation"] =
        sessionEdge >= 75 ? "aggressive" :
        sessionEdge >= 62 ? "standard" :
        sessionEdge >= 52 ? "conservative" : "minimal";

      const sessionInsights: string[] = [];
      if (highConfGames >= 4) sessionInsights.push(`${highConfGames} games show strong MC conviction — solid parlay base available`);
      if (bestSport === "NBA" && activeSports[0]?.avgEdge >= 65) sessionInsights.push("NBA showing strongest edge signal today — prioritize player props and totals");
      if (activeSports.length >= 4) sessionInsights.push(`Multi-sport day (${activeSports.length} active) — cross-sport diversification available`);
      if (parlayConditions === "excellent") sessionInsights.push("Excellent parlay conditions — 3-leg structure recommended for risk balance");
      if (parlayConditions === "poor") sessionInsights.push("Thin slate today — single-game bets and props offer better risk management");
      if (sessionInsights.length < 3) sessionInsights.push("Monitor line movement in the 2 hours before game time for sharp signals");

      const cautions: string[] = [];
      const lowConfGames = allSims.filter(s => Math.max(s.homeWinProb ?? 0.5, 1 - (s.homeWinProb ?? 0.5)) < 0.53).length;
      if (lowConfGames >= 3) cautions.push(`${lowConfGames} games show coin-flip probabilities — avoid forcing picks`);
      if (totalGames < 3) cautions.push("Limited active games today — be selective with bet volume");
      if (stakeRecommendation === "minimal" || stakeRecommendation === "conservative") cautions.push("Reduced edge conditions — stay at 1-2% of bankroll per bet");

      const optimalBetTypes = [
        ...(parlayConditions === "excellent" || parlayConditions === "good" ? ["2-3 Leg Parlay"] : []),
        ...(highConfGames >= 2 ? ["Straight Moneylines"] : []),
        "Player Props (high-confidence games)",
        ...(bestSport === "NBA" ? ["Game Totals", "Quarter Lines"] : []),
        ...(bestSport === "MLB" ? ["1st 5 Innings", "Strikeout Props"] : []),
        ...(bestSport === "NHL" ? ["Puck Line", "Period Props"] : []),
      ].slice(0, 4);

      const plan: SessionPlan = {
        date: new Date().toISOString().split("T")[0],
        edgeScore: sessionEdge,
        bestSport,
        bestSportReason: `${activeSports[0]?.gameCount ?? 0} game${activeSports[0]?.gameCount !== 1 ? "s" : ""} with avg model edge of ${sessionEdge}`,
        parlayConditions,
        parlayConditionsReason: `${highConfGames} of ${totalGames} games have ≥60% MC conviction`,
        stakeRecommendation,
        stakeReason: sessionEdge >= 70 ? "Strong edge signals across multiple games" : sessionEdge >= 60 ? "Moderate edge — standard unit sizing is appropriate" : "Thin edge conditions today — protect your bankroll",
        activeSports,
        sessionInsights,
        cautions,
        optimalBetTypes,
      };

      res.json(plan);
    } catch (err) {
      console.error("[strategy/session]", err);
      res.status(500).json({ error: "Failed to build session plan" });
    }
  });

  // ── GET /api/strategy/game-cards ─────────────────────────────────────────
  app.get("/api/strategy/game-cards", requireSubscription, async (req: Request, res: Response) => {
    try {
      const sportFilter = (req.query.sport as string | undefined)?.toUpperCase();
      const allSims = getAllPreSimulated();
      const filtered = sportFilter ? allSims.filter(s => s.sport === sportFilter) : allSims;

      // Get market snapshots for each unique sport in the sims
      const uniqueSports = [...new Set(filtered.map(s => s.sport ?? "NBA"))];
      const snapshotMap: Record<string, any> = {};
      await Promise.all(
        uniqueSports.map(async sport => {
          try {
            const snap = await generateMarketSnapshot(sport as Sport);
            snapshotMap[sport] = snap;
          } catch {
            // ignore
          }
        })
      );

      const cards: GameStrategyCard[] = await Promise.all(
        filtered.map(async (sim): Promise<GameStrategyCard> => {
          const sport = sim.sport ?? "NBA";
          const homeTeam = sim.homeTeam ?? "Home";
          const awayTeam = sim.awayTeam ?? "Away";

          // Team form
          const homeFormRaw = getTeamFormData(sport as Sport, homeTeam);
          const awayFormRaw = getTeamFormData(sport as Sport, awayTeam);
          const homeForm: GameStrategyCard["homeForm"] = homeFormRaw ? {
            formScore: homeFormRaw.formScore,
            streakType: homeFormRaw.recentStreak.type,
            streakLength: homeFormRaw.recentStreak.length,
            last10Wins: homeFormRaw.last10.wins,
            last10Losses: homeFormRaw.last10.losses,
            avgMargin: homeFormRaw.last10AvgMargin,
          } : null;
          const awayForm: GameStrategyCard["awayForm"] = awayFormRaw ? {
            formScore: awayFormRaw.formScore,
            streakType: awayFormRaw.recentStreak.type,
            streakLength: awayFormRaw.recentStreak.length,
            last10Wins: awayFormRaw.last10.wins,
            last10Losses: awayFormRaw.last10.losses,
            avgMargin: awayFormRaw.last10AvgMargin,
          } : null;

          // Market data
          const snap = snapshotMap[sport];
          const mGame = snap?.games?.find((g: any) =>
            g.id === sim.gameId ||
            g.homeTeam?.name?.toLowerCase().includes(homeTeam.toLowerCase()) ||
            g.awayTeam?.name?.toLowerCase().includes(awayTeam.toLowerCase())
          );

          const spreadLM = mGame?.lineMovement?.find((lm: any) => lm.market === "spread");
          const totalLM = mGame?.lineMovement?.find((lm: any) => lm.market === "total");
          const hasSharpAction = !!(spreadLM?.sharpAction || totalLM?.sharpAction);
          const sharpSide = hasSharpAction
            ? (spreadLM?.sharpAction ? (spreadLM.direction === "up" ? homeTeam : awayTeam) : (totalLM?.direction === "up" ? "Over" : "Under"))
            : undefined;

          const marketSignals: GameStrategyCard["marketSignals"] = {
            hasSharpAction,
            sharpSide,
            lineMovementVelocity: spreadLM?.velocity ?? totalLM?.velocity,
            valueSide: mGame?.edgeAnalysis?.valueSide,
            homeEV: mGame?.edgeAnalysis?.homeEV ?? 0,
            awayEV: mGame?.edgeAnalysis?.awayEV ?? 0,
            spread: mGame?.consensus?.spread,
            total: mGame?.consensus?.total,
            homeML: mGame?.consensus?.homeMoneyline,
            awayML: mGame?.consensus?.awayMoneyline,
          };

          const patterns = buildPatterns(homeTeam, awayTeam, sport, sim, homeForm, awayForm, marketSignals);
          const topRec = buildTopRecommendation(homeTeam, awayTeam, sim, homeForm, awayForm, marketSignals);
          const edgeScore = calcEdgeScore(sim, marketSignals, homeForm, awayForm);
          const riskRating: "low" | "medium" | "high" = edgeScore >= 72 ? "low" : edgeScore >= 58 ? "medium" : "high";

          return {
            gameId: sim.gameId,
            sport,
            homeTeam,
            awayTeam,
            gameTime: sim.gameTime ?? undefined,
            mcData: {
              homeWinProb: sim.homeWinProb ?? 0.5,
              awayWinProb: sim.awayWinProb ?? 0.5,
              predictedTotal: sim.predictedTotal ?? 0,
              homeSpreadCoverProb: sim.homeSpreadCoverProb ?? 0.5,
              overProb: sim.overProb ?? 0.5,
              predictedHomeScore: sim.predictedHomeScore ?? 0,
              predictedAwayScore: sim.predictedAwayScore ?? 0,
            },
            homeForm,
            awayForm,
            marketSignals,
            patterns,
            topRecommendation: topRec,
            riskRating,
            edgeScore,
          };
        })
      );

      // Sort by edge score desc
      cards.sort((a, b) => b.edgeScore - a.edgeScore);
      res.json({ cards, count: cards.length });
    } catch (err) {
      console.error("[strategy/game-cards]", err);
      res.status(500).json({ error: "Failed to build game strategy cards" });
    }
  });

  // ── POST /api/strategy/ai-brief ──────────────────────────────────────────
  app.post("/api/strategy/ai-brief", requireSubscription, async (req: Request, res: Response) => {
    try {
      const { gameId, homeTeam, awayTeam, sport, mcData, homeForm, awayForm, marketSignals, patterns, topRecommendation } = req.body;

      if (!homeTeam || !awayTeam) {
        return res.status(400).json({ error: "homeTeam and awayTeam required" });
      }

      const contextLines: string[] = [
        `Game: ${awayTeam} at ${homeTeam} (${sport})`,
        `MC Win Probabilities: ${homeTeam} ${((mcData?.homeWinProb ?? 0.5) * 100).toFixed(1)}% | ${awayTeam} ${((mcData?.awayWinProb ?? 0.5) * 100).toFixed(1)}%`,
        `Predicted Total: ${mcData?.predictedTotal?.toFixed(1) ?? "N/A"} (Over prob: ${((mcData?.overProb ?? 0.5) * 100).toFixed(0)}%)`,
        `Spread Cover Prob (${homeTeam}): ${((mcData?.homeSpreadCoverProb ?? 0.5) * 100).toFixed(0)}%`,
        homeForm ? `${homeTeam} Form: Score ${homeForm.formScore?.toFixed(1)} | ${homeForm.streakType}${homeForm.streakLength} | L10: ${homeForm.last10Wins}-${homeForm.last10Losses}` : `${homeTeam} form data unavailable`,
        awayForm ? `${awayTeam} Form: Score ${awayForm.formScore?.toFixed(1)} | ${awayForm.streakType}${awayForm.streakLength} | L10: ${awayForm.last10Wins}-${awayForm.last10Losses}` : `${awayTeam} form data unavailable`,
        marketSignals?.hasSharpAction ? `⚡ Sharp money detected on ${marketSignals.sharpSide}` : "No sharp action flagged",
        marketSignals?.valueSide && marketSignals.valueSide !== "none" ? `Value side: ${marketSignals.valueSide === "home" ? homeTeam : awayTeam}` : "No clear value side",
        patterns?.length > 0 ? `Patterns: ${patterns.map((p: PatternBadge) => p.label).join(", ")}` : "No notable patterns",
        topRecommendation ? `Top rec: ${topRecommendation.market} — ${topRecommendation.side} (${topRecommendation.confidenceLevel} confidence)` : "",
      ].filter(Boolean);

      const prompt = `You are SORS, a sharp sports betting intelligence AI. Generate a concise strategy brief for this game. Be direct, data-driven, and actionable. Write 3-4 sentences max. Focus on the key edge and how a sharp bettor should approach it. Do not be wishy-washy — pick a clear recommendation and explain why.\n\nGame Context:\n${contextLines.join("\n")}`;

      const { createOpenAIClient } = await import("../openaiClient");
      const openai = createOpenAIClient();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      const brief = completion.choices[0]?.message?.content?.trim() ?? "Unable to generate brief at this time.";

      // Extract key points (sentences split)
      const sentences = brief.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
      const keyPoints = sentences.slice(0, 3);

      res.json({ gameId, brief, keyPoints });
    } catch (err) {
      console.error("[strategy/ai-brief]", err);
      res.status(500).json({ error: "Failed to generate AI brief" });
    }
  });

  // ── GET /api/strategy/my-patterns ────────────────────────────────────────
  app.get("/api/strategy/my-patterns", requireAuth, async (req: Request, res: Response) => {
    try {
      const username = (req as any).user?.username;
      if (!username) return res.status(401).json({ error: "Unauthorized" });

      const result = await db.execute(sql`
        SELECT sport, bet_type, won, placed_at, odds_at_pick, stake
        FROM user_picks
        WHERE username = ${username} AND settled = true
        ORDER BY placed_at DESC
        LIMIT 500
      `);

      const rows = result.rows as Array<{
        sport: string;
        bet_type: string;
        won: boolean;
        placed_at: string;
        odds_at_pick: number;
        stake: number;
      }>;

      if (rows.length === 0) {
        return res.json({
          totalPicks: 0,
          winRate: 0,
          byBetType: [],
          bySport: [],
          byDayOfWeek: [],
          bestPattern: null,
          weakestPattern: null,
          insights: ["No settled picks yet. Start tracking your bets to see your patterns."],
        });
      }

      const totalPicks = rows.length;
      const totalWins = rows.filter(r => r.won).length;
      const overallWinRate = totalWins / totalPicks;

      // By bet type
      const betTypeMap: Record<string, { wins: number; total: number }> = {};
      for (const r of rows) {
        const bt = r.bet_type || "unknown";
        if (!betTypeMap[bt]) betTypeMap[bt] = { wins: 0, total: 0 };
        betTypeMap[bt].total++;
        if (r.won) betTypeMap[bt].wins++;
      }
      const byBetType = Object.entries(betTypeMap)
        .map(([type, v]) => ({ type, wins: v.wins, total: v.total, winRate: v.wins / v.total }))
        .sort((a, b) => b.winRate - a.winRate);

      // By sport
      const sportMap: Record<string, { wins: number; total: number }> = {};
      for (const r of rows) {
        const s = r.sport || "unknown";
        if (!sportMap[s]) sportMap[s] = { wins: 0, total: 0 };
        sportMap[s].total++;
        if (r.won) sportMap[s].wins++;
      }
      const bySport = Object.entries(sportMap)
        .map(([sport, v]) => ({ sport, wins: v.wins, total: v.total, winRate: v.wins / v.total }))
        .sort((a, b) => b.winRate - a.winRate);

      // By day of week
      const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dowMap: Record<number, { wins: number; total: number }> = {};
      for (const r of rows) {
        const d = new Date(r.placed_at).getDay();
        if (!dowMap[d]) dowMap[d] = { wins: 0, total: 0 };
        dowMap[d].total++;
        if (r.won) dowMap[d].wins++;
      }
      const byDayOfWeek = Object.entries(dowMap)
        .map(([d, v]) => ({ day: dowNames[Number(d)], wins: v.wins, total: v.total, winRate: v.wins / v.total }))
        .sort((a, b) => b.winRate - a.winRate);

      // Best and weakest
      const bestBetType = byBetType.find(b => b.total >= 3);
      const worstBetType = [...byBetType].reverse().find(b => b.total >= 3);
      const bestSport = bySport.find(b => b.total >= 3);

      const insights: string[] = [];
      if (bestBetType && bestBetType.winRate >= 0.55) {
        insights.push(`Your strongest market: ${bestBetType.type} at ${(bestBetType.winRate * 100).toFixed(0)}% win rate (${bestBetType.total} picks)`);
      }
      if (bestSport) {
        insights.push(`Best sport for you: ${bestSport.sport} — ${(bestSport.winRate * 100).toFixed(0)}% win rate across ${bestSport.total} picks`);
      }
      if (byDayOfWeek[0] && byDayOfWeek[0].total >= 2) {
        insights.push(`You perform best on ${byDayOfWeek[0].day}s (${(byDayOfWeek[0].winRate * 100).toFixed(0)}% win rate)`);
      }
      if (worstBetType && worstBetType.winRate <= 0.40 && worstBetType.total >= 3) {
        insights.push(`Consider avoiding ${worstBetType.type} — only ${(worstBetType.winRate * 100).toFixed(0)}% win rate across ${worstBetType.total} picks`);
      }
      if (overallWinRate >= 0.55) {
        insights.push(`You're hitting ${(overallWinRate * 100).toFixed(0)}% overall — above the break-even threshold for most bet types`);
      } else if (overallWinRate < 0.45) {
        insights.push(`Current win rate (${(overallWinRate * 100).toFixed(0)}%) is below break-even — review your process and be more selective`);
      }

      res.json({
        totalPicks,
        totalWins,
        winRate: overallWinRate,
        byBetType,
        bySport,
        byDayOfWeek,
        bestPattern: bestBetType ? `${bestBetType.type} bets` : null,
        weakestPattern: worstBetType && worstBetType !== bestBetType ? `${worstBetType.type} bets` : null,
        insights,
      });
    } catch (err) {
      console.error("[strategy/my-patterns]", err);
      res.status(500).json({ error: "Failed to load patterns" });
    }
  });
}

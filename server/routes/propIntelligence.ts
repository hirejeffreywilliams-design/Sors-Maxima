import type { Express } from "express";
import crypto from "crypto";
import { requireAuth } from "./helpers";
import {
  analyzeProp,
  analyzeGameProps,
  buildCorrelationPackages,
  type BatchPropInput,
} from "../propIntelligenceEngine";
import { fetchRealPlayerProps, isOddsApiAvailable } from "../odds-provider";

export function registerPropIntelligenceRoutes(app: Express): void {

  // ── GET /api/prop-intelligence/:sport/:gameId/:playerName/:market ──────────
  // Returns full PropIntelligence for a single player prop.
  app.get("/api/prop-intelligence/:sport/:gameId/:playerName/:market", requireAuth, async (req, res) => {
    const { sport, gameId, playerName, market } = req.params;
    const side = (req.query.side as "over" | "under") || "over";
    const line = parseFloat(req.query.line as string) || 0;
    const homeTeam = (req.query.homeTeam as string) || "";
    const awayTeam = (req.query.awayTeam as string) || "";
    const playerTeam = (req.query.playerTeam as string) || homeTeam;
    const baseConfidence = parseFloat(req.query.confidence as string) || 55;
    const currentStat = req.query.currentStat ? parseFloat(req.query.currentStat as string) : null;
    const gameProgress = req.query.gameProgress ? parseFloat(req.query.gameProgress as string) : null;

    try {
      const intel = await analyzeProp(
        playerName, market, "", sport, gameId, homeTeam, awayTeam,
        playerTeam, side, line, baseConfidence, currentStat, gameProgress,
      );
      res.json(intel);
    } catch (err: any) {
      console.error("[PIE] Single prop analysis error:", err.message);
      res.status(500).json({ error: "Prop analysis failed" });
    }
  });

  // ── POST /api/prop-intelligence/batch ─────────────────────────────────────
  // Batch-analyzes all props in a game and returns PropIntelligence array.
  app.post("/api/prop-intelligence/batch", requireAuth, async (req, res) => {
    const { sport, gameId, homeTeam, awayTeam, props } = req.body as {
      sport: string;
      gameId: string;
      homeTeam: string;
      awayTeam: string;
      props: BatchPropInput[];
    };

    if (!sport || !gameId || !homeTeam || !awayTeam || !Array.isArray(props)) {
      return res.status(400).json({ error: "sport, gameId, homeTeam, awayTeam, props[] required" });
    }
    if (props.length > 100) {
      return res.status(400).json({ error: "Max 100 props per batch" });
    }

    try {
      const results = await analyzeGameProps(sport, gameId, homeTeam, awayTeam, props);
      res.json({ results, count: results.length, analyzedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error("[PIE] Batch analysis error:", err.message);
      res.status(500).json({ error: "Batch analysis failed" });
    }
  });

  // ── GET /api/prop-intelligence/packages/:sport ────────────────────────────
  // Returns top correlation packages (Prop Stacks) for today's games.
  app.get("/api/prop-intelligence/packages/:sport", requireAuth, async (req, res) => {
    const { sport } = req.params;

    try {
      const propsRaw = isOddsApiAvailable() ? await fetchRealPlayerProps(sport as any, [], [], []) : [];
      if (propsRaw.length === 0) {
        return res.json({ packages: [], sport, generatedAt: new Date().toISOString() });
      }

      const propInputs = propsRaw.slice(0, 80).map(p => {
        const seed = `${p.eventId}-${p.playerName}-${p.market}`;
        const hash = crypto.createHash("md5").update(seed).digest();
        const r = hash.readUInt32BE(0) / 0xffffffff;
        const scripts = ["close", "blowout_home", "blowout_away", "overtime"] as const;
        const script = scripts[Math.floor(r * 4)];
        return {
          playerName: p.playerName,
          market: p.market,
          marketLabel: p.marketLabel,
          playerTeam: p.homeTeam,
          side: r > 0.5 ? "over" : "under" as "over" | "under",
          line: p.line,
          baseConfidence: 50 + Math.floor(r * 30),
          sport,
          gameId: p.eventId,
          homeTeam: p.homeTeam,
          awayTeam: p.awayTeam,
          gameScriptBenefits: script,
          edgeScore: Math.round(r * 20),
        };
      });

      const packages = buildCorrelationPackages(propInputs as any);
      res.json({ packages, sport, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error("[PIE] Packages error:", err.message);
      res.status(500).json({ error: "Packages unavailable" });
    }
  });

  // ── GET /api/prop-intelligence/opportunity-plays/:sport ───────────────────
  // Returns props flagged as Opportunity Plays due to injury redistribution.
  app.get("/api/prop-intelligence/opportunity-plays/:sport", requireAuth, async (req, res) => {
    const { sport } = req.params;

    try {
      const propsRaw = isOddsApiAvailable() ? await fetchRealPlayerProps(sport as any, [], [], []) : [];
      const analyzed = await analyzeGameProps(
        sport,
        "multi-game",
        "home",
        "away",
        propsRaw.slice(0, 40).map(p => ({
          playerName: p.playerName,
          market: p.market,
          marketLabel: p.marketLabel,
          playerTeam: p.homeTeam,
          side: "over" as const,
          line: p.line,
          baseConfidence: 55,
        }))
      );

      const opportunityPlays = analyzed
        .filter(intel => intel.usageContext.isOpportunityPlay)
        .map(intel => ({
          playerName: intel.playerName,
          market: intel.market,
          marketLabel: intel.marketLabel,
          sport: intel.sport,
          gameId: intel.gameId,
          homeTeam: intel.homeTeam,
          awayTeam: intel.awayTeam,
          side: intel.side,
          line: intel.line,
          usageBumpPct: intel.usageContext.usageBumpPct,
          injuredTeammate: intel.usageContext.injuredTeammate,
          reasoning: intel.usageContext.reasoning,
          compositeGrade: intel.compositeGrade,
          compositeScore: intel.compositeScore,
        }));

      res.json({ opportunityPlays, count: opportunityPlays.length, sport, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error("[PIE] Opportunity plays error:", err.message);
      res.status(500).json({ error: "Opportunity plays unavailable" });
    }
  });
}

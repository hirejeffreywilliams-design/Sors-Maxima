import type { Express } from "express";
import { requireAuth, requireTier } from "./helpers";
import { analyzeSlip } from "../correlationEngine";
import { getPrecomputedCache } from "../precomputedPredictionsEngine";
import type { PrecomputedPick } from "../precomputedPredictionsEngine";

const ALL_SPORTS = ["NBA", "NHL", "NCAAB", "NFL", "MLB", "NCAAF"] as const;
const GOOD_GRADES = ["A+", "A", "A-", "B+", "B", "B-"];
const ALL_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

function americanOddsStr(decimalOdds: number): string {
  const am = decimalOdds >= 2
    ? Math.round((decimalOdds - 1) * 100)
    : Math.round(-100 / (decimalOdds - 1));
  return am > 0 ? `+${am}` : `${am}`;
}

function dedupeById(picks: PrecomputedPick[]): PrecomputedPick[] {
  const seen = new Set<string>();
  return picks.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function getAllCachedPicks(): PrecomputedPick[] {
  const all: PrecomputedPick[] = [];
  for (const sport of ALL_SPORTS) {
    const cache = getPrecomputedCache(sport);
    if (cache?.picks) all.push(...cache.picks);
  }
  return dedupeById(all).filter(p => GOOD_GRADES.includes(p.grade));
}

function buildVariation(
  name: string,
  description: string,
  strategy: string,
  picks: PrecomputedPick[],
  count = 5
) {
  const selected = picks.slice(0, count);
  if (selected.length === 0) return null;

  const totalDecimalOdds = selected.reduce((acc, p) => {
    const dec = p.odds > 0 ? p.odds / 100 + 1 : 100 / Math.abs(p.odds) + 1;
    return acc * dec;
  }, 1);

  const sports = [...new Set(selected.map(p => p.sport))];
  const avgEV = selected.reduce((sum, p) => sum + Math.min(p.ev, 35), 0) / selected.length;
  const avgConf = selected.reduce((sum, p) => sum + p.confidence, 0) / selected.length;

  return {
    id: `${strategy}-${Date.now()}`,
    name,
    description,
    strategy,
    legs: selected.map(p => {
      const decOdds = p.odds > 0 ? p.odds / 100 + 1 : 100 / Math.abs(p.odds) + 1;
      return {
        id: p.id,
        sport: p.sport,
        game: p.game,
        pick: p.pick,
        betType: p.betType,
        americanOdds: p.odds,
        decimalOdds: parseFloat(decOdds.toFixed(4)),
        ev: Math.min(p.ev, 35),
        confidence: p.confidence,
        grade: p.grade,
        edge: p.edge,
        reasoning: p.reasoning,
        recommendation: p.recommendation,
        winProbability: p.winProbability,
        timing: p.timing,
        timingAdvice: p.timingAdvice,
        insights: p.insights ?? [],
        gameTime: p.gameTime,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        team: p.homeTeam,
        outcome: p.pick,
        market: p.betType,
        opponent: p.awayTeam,
        addedFrom: "variation-engine",
        addedAt: new Date().toISOString(),
        monteCarloData: p.monteCarloData,
        factors: p.factors,
        oddsSourceBook: p.oddsSourceBook,
        oddsBookCount: p.oddsBookCount,
        oddsApiSource: p.oddsApiSource,
        allBookOdds: p.allBookOdds,
      };
    }),
    totalDecimalOdds: parseFloat(totalDecimalOdds.toFixed(4)),
    americanOdds: americanOddsStr(totalDecimalOdds),
    legCount: selected.length,
    sports,
    averageEV: parseFloat(avgEV.toFixed(1)),
    averageConfidence: Math.round(avgConf),
  };
}

function generateVariations(seedLegs: any[]) {
  const allPicks = getAllCachedPicks();

  const seedGameIds = new Set(seedLegs.map(l => (l.game || "").toLowerCase().trim()));
  const excludeSeedGames = (p: PrecomputedPick) =>
    !seedGameIds.has(p.game.toLowerCase().trim());

  const freshPool = allPicks.filter(excludeSeedGames);
  const widePool = dedupeById(
    [...freshPool, ...allPicks].filter(p => ALL_GRADES.includes(p.grade))
  );

  // Strategy 1: Safe Locks — highest-grade, low-risk odds
  const safePicks = [...freshPool]
    .filter(p => ["A+", "A", "A-"].includes(p.grade) && p.confidence > 65 && Math.abs(p.odds) <= 180)
    .sort((a, b) => b.confidence - a.confidence);

  // Strategy 2: Balanced Value — A/B grades, mixed odds
  const balancedPicks = [...freshPool]
    .filter(p => GOOD_GRADES.includes(p.grade))
    .sort((a, b) => (b.ev + b.confidence * 0.3) - (a.ev + a.confidence * 0.3));

  // Strategy 3: EV Hunter — highest EV regardless of grade
  const evPicks = [...freshPool]
    .sort((a, b) => b.ev - a.ev);

  // Strategy 4: Sharp Money — steam_move/contrarian/line-movement spread picks
  const sharpPicks = [...freshPool]
    .filter(p => {
      const sc = (p as any).selectionCategory;
      return sc === "steam_move" || sc === "contrarian" || p.betType === "spread";
    })
    .sort((a, b) => b.ev - a.ev);

  // Strategy 5: Multi-Sport Flex — 1 from each sport
  const sportGroups = new Map<string, PrecomputedPick[]>();
  for (const p of freshPool) {
    if (!sportGroups.has(p.sport)) sportGroups.set(p.sport, []);
    sportGroups.get(p.sport)!.push(p);
  }
  const flexPicks: PrecomputedPick[] = [];
  for (const [, group] of sportGroups) {
    const best = group.sort((a, b) => b.confidence - a.confidence)[0];
    if (best) flexPicks.push(best);
  }
  flexPicks.sort((a, b) => b.ev - a.ev);

  // Strategy 6: Underdog Surge™ — positive odds +110 to +320, real upside value
  const underdogPicks = [...widePool]
    .filter(p => p.odds >= 110 && p.odds <= 320 && p.ev > 0)
    .sort((a, b) => (b.ev * 1.5 + b.confidence * 0.5) - (a.ev * 1.5 + a.confidence * 0.5));

  // Strategy 7: Correlated Stack™ — max picks from fewest games (same-game feel)
  const gamePickMap = new Map<string, PrecomputedPick[]>();
  for (const p of freshPool) {
    const key = p.game.toLowerCase().trim();
    if (!gamePickMap.has(key)) gamePickMap.set(key, []);
    gamePickMap.get(key)!.push(p);
  }
  const sortedGames = [...gamePickMap.entries()]
    .sort((a, b) => b[1].length - a[1].length);
  const correlatedPicks: PrecomputedPick[] = [];
  for (const [, picks] of sortedGames) {
    if (correlatedPicks.length >= 6) break;
    const best = picks.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
    best.forEach(p => { correlatedPicks.push(p); });
  }

  // Strategy 8: Player Prop Blitz™ — player props only, highest confidence
  const propPicks = [...widePool]
    .filter(p => p.betType?.includes("player") || p.betType?.includes("prop"))
    .sort((a, b) => (b.confidence + b.ev * 0.5) - (a.confidence + a.ev * 0.5));

  // Strategy 9: Momentum Fade™ — pure contrarian plays, fading overvalued public picks
  const momentumFadePicks = [...widePool]
    .filter(p => {
      const sc = (p as any).selectionCategory;
      const isContrarian = sc === "contrarian" || sc === "public_fade";
      const hasPublicBias = (p as any).publicMoneyPct !== undefined
        ? (p as any).publicMoneyPct > 60
        : false;
      return isContrarian || hasPublicBias || p.betType === "spread";
    })
    .sort((a, b) => b.ev - a.ev);

  // Strategy 10: Alt-Market Edge™ — non-moneyline bets (spreads, totals, alt lines)
  const altMarketPicks = [...widePool]
    .filter(p => p.betType !== "moneyline" && GOOD_GRADES.includes(p.grade))
    .sort((a, b) => (b.ev + b.confidence * 0.4) - (a.ev + a.confidence * 0.4));

  const fallback = (picks: PrecomputedPick[], min: number) =>
    picks.length >= min ? picks : balancedPicks;

  const variations = [
    buildVariation(
      "Safe Locks",
      "High-confidence A-grade picks with tight odds. Lower ceiling, much higher hit rate.",
      "safe",
      fallback(safePicks, 3),
      5
    ),
    buildVariation(
      "Balanced Value",
      "Optimal blend of grade quality and expected value. The sharpest all-around ticket.",
      "balanced",
      balancedPicks,
      5
    ),
    buildVariation(
      "EV Hunter",
      "Pure expected value maximization. These legs carry the highest mathematical edge in the model.",
      "high_ev",
      evPicks,
      5
    ),
    buildVariation(
      "Sharp Money",
      "Fades public money and tracks steam line movement. Contrarian plays where sharp bettors are acting.",
      "sharp",
      fallback(sharpPicks, 3),
      5
    ),
    buildVariation(
      "Multi-Sport Flex",
      "One strong pick from each available sport. Maximum diversification — no correlated loss risk.",
      "multi_sport",
      flexPicks,
      6
    ),
    buildVariation(
      "Underdog Surge™",
      "Positive-odds plays (+110 to +320) with genuine model edge. High EV underdogs the public is sleeping on.",
      "underdog_surge",
      fallback(underdogPicks, 3),
      5
    ),
    buildVariation(
      "Correlated Stack™",
      "Multiple picks from the same games. Mirrors same-game parlay structure — when one leg hits, others are primed.",
      "correlated_stack",
      fallback(correlatedPicks, 3),
      6
    ),
    buildVariation(
      "Player Prop Blitz™",
      "High-confidence individual player performance bets. The most predictable leg type in the 46-Factor model.",
      "prop_blitz",
      fallback(propPicks, 3),
      5
    ),
    buildVariation(
      "Momentum Fade™",
      "Contrarian plays against overhyped teams. Fades public darlings where the model sees hidden weakness.",
      "momentum_fade",
      fallback(momentumFadePicks, 3),
      5
    ),
    buildVariation(
      "Alt-Market Edge™",
      "Spreads, totals, and alternate lines where the model finds the most inefficiency vs. public pricing.",
      "alt_market",
      fallback(altMarketPicks, 3),
      5
    ),
  ].filter(Boolean);

  return variations;
}

export function registerTicketRoutes(app: Express) {
  app.post("/api/tickets/analyze", requireAuth, (req, res) => {
    try {
      const { legs } = req.body;
      if (!Array.isArray(legs)) {
        return res.status(400).json({ error: "legs must be an array" });
      }
      const analysis = analyzeSlip(legs);
      res.json(analysis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tickets/variations", requireAuth, requireTier("whale"), (req, res) => {
    try {
      const { seedLegs = [] } = req.body;
      const variations = generateVariations(seedLegs);
      res.json({ variations, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

/**
 * Signal Translation Layer (STL)
 *
 * Converts raw numeric signal values into threshold-driven natural language
 * narratives that update whenever the underlying variables change.
 * Used by ALL pick-generation paths so reasoning is consistent, reactive,
 * and reflects the actual current state of every signal.
 */

export interface SignalInput {
  sport: string;
  betType: string;
  pick: string;
  confidenceTier: string;
  confidence: number;
  sharpMoney: number;
  publicMoney?: number;
  modelAgreement: number;
  edge: number;
  expectedValue?: number;
  steamMove: boolean;
  reverseLineMove: boolean;
  trueProbability?: number;
  impliedProbability?: number;
  factors?: Array<{ name: string; description?: string; direction: string; impact: number; weight?: number }>;
  fusionInsights?: string[];
  homeTeam?: string;
  awayTeam?: string;
  homeRecord?: string;
  awayRecord?: string;
  mcSim?: {
    simulations?: number;
    predictedHomeScore?: number;
    predictedAwayScore?: number;
    homeWinProb?: number;
    awayWinProb?: number;
  };
  sitFactors?: {
    homeRestDays?: number;
    awayRestDays?: number;
    homeB2B?: boolean;
    awayB2B?: boolean;
    spotType?: string;
    spotDescription?: string;
  };
  injuryContext?: {
    homeStartersOut?: number;
    awayStartersOut?: number;
  };
  twoWayRiskNote?: string;
}

export interface TicketSignalInput {
  legs: Array<{
    pick: string;
    betType: string;
    sport: string;
    confidence: number;
    edge: number;
    ev?: number;
    factors?: Array<{ name: string; impact: number; direction: string }>;
    monteCarloData?: object;
    situationalData?: object;
    injuryData?: object;
    reasoning?: string;
  }>;
  riskLevel?: string;
}

// ── Signal Band Definitions ─────────────────────────────────────────────────

const SHARP_BANDS = [
  { min: 78, phrase: (n: number) => `Overwhelming sharp action — ${n}% of professional money is on this side. Institutions are extremely confident.` },
  { min: 70, phrase: (n: number) => `Heavy sharp consensus at ${n}% — professional bettors have clearly identified value on this side.` },
  { min: 63, phrase: (n: number) => `Strong sharp lean at ${n}% — above-average professional conviction indicating model alignment with market experts.` },
  { min: 56, phrase: (n: number) => `Sharp money leaning ${n}% — notable professional interest, worth taking seriously.` },
  { min: 50, phrase: (n: number) => `Slight professional interest at ${n}% — mild sharp attention, not yet decisive.` },
];

const MODEL_AGREEMENT_BANDS = [
  { min: 5, phrase: () => `All 5 independent prediction models agree — maximum multi-model consensus, a rare and high-conviction signal.` },
  { min: 4, phrase: (n: number) => `${n}/5 prediction models in agreement — strong multi-model consensus significantly boosts reliability.` },
  { min: 3, phrase: (n: number) => `${n}/5 models agree — solid consensus, the majority of the model suite is aligned.` },
  { min: 2, phrase: (n: number) => `${n}/5 models agree — mixed signals; some divergence in the model suite.` },
];

const EDGE_BANDS = [
  { min: 10, phrase: (e: number) => `Exceptional +${e}% positive EV edge — among the strongest opportunities in today's slate.` },
  { min: 7, phrase: (e: number) => `Very strong +${e}% edge over market — this pick offers substantial long-term value.` },
  { min: 4.5, phrase: (e: number) => `Solid +${e}% positive expected value — clear edge over the sportsbook's implied probability.` },
  { min: 2.5, phrase: (e: number) => `+${e}% positive edge detected — marginal but meaningful value versus market pricing.` },
  { min: 0, phrase: (e: number) => `+${e}% edge vs implied line — slight positive lean, proceed with standard conviction.` },
];

const SPORT_CONTEXT: Record<string, Record<string, string>> = {
  NBA: {
    moneyline: "In the NBA, home court and pace differentials are the primary moneyline drivers.",
    spread: "NBA spread covers are heavily influenced by recent rest, pace matchup, and three-point efficiency.",
    total: "NBA totals swing on pace tempo, defensive ratings, and back-to-back fatigue.",
  },
  MLB: {
    moneyline: "In baseball, starting pitcher matchup and bullpen depth are the dominant moneyline factors.",
    spread: "MLB run lines (–1.5/+1.5) require strong starting pitching or high run-scoring environments.",
    total: "MLB totals are driven by starter ERA differential, park factor, and wind conditions.",
  },
  NHL: {
    moneyline: "NHL moneylines favor teams with strong goaltender matchup advantages and recent form.",
    spread: "NHL puck lines (–1.5/+1.5) reward disciplined teams that can protect leads or overcome deficits.",
    total: "NHL totals are sensitive to goaltender form, power play efficiency, and pace of play.",
  },
  NFL: {
    moneyline: "NFL moneylines rely heavily on quarterback efficiency differential and turnover margin.",
    spread: "NFL spreads are driven by offensive line strength, defensive stop rate, and field position.",
    total: "NFL totals reflect pass-to-run ratio trends, defense DVOA, and weather conditions.",
  },
  NCAAB: {
    moneyline: "College basketball moneylines favor teams with dominant home court advantages and guard play.",
    spread: "NCAAB spreads require attention to bench depth, foul trouble tendencies, and conference familiarity.",
    total: "NCAAB totals are volatile — tempo variance between programs creates significant scoring range.",
  },
  NCAAF: {
    moneyline: "College football moneylines are dominated by talent gap and home field atmosphere.",
    spread: "NCAAF spreads often reflect talent disparities more than game-plan execution.",
    total: "NCAAF totals follow scoring trends but weather and pace adjustments are significant.",
  },
};

const BET_TYPE_CONTEXT: Record<string, (pick: string, edge: number, trueProbability?: number, impliedProbability?: number) => string> = {
  moneyline: (pick, edge, trueProb, impliedProb) => {
    if (trueProb && impliedProb && edge > 2) {
      return `46-Factor model assigns ${trueProb}% true probability vs the ${impliedProb}% implied by market odds — creating a +${edge}% model edge.`;
    }
    return `Model identifies mispriced probability in the moneyline — the implied odds do not reflect the true win likelihood.`;
  },
  spread: (pick, edge) => {
    if (edge > 3) return `Spread line is mispriced by an estimated ${edge}% — projected final margin diverges from the current number.`;
    return `Model projects the margin to land favorably relative to the current spread.`;
  },
  total: (pick) => {
    const isOver = pick.toLowerCase().includes("over");
    if (isOver) return `Pace, tempo, and scoring-environment analysis all align to push this game over the total.`;
    return `Defensive efficiency and tempo metrics suggest this game will stay under the posted total.`;
  },
};

// ── Utility ─────────────────────────────────────────────────────────────────

function pickBand<T extends { min: number; phrase: (...args: any[]) => string }>(
  bands: T[],
  value: number,
): T | undefined {
  return bands.find(b => value >= b.min);
}

function humanizeFactorName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\bHome Win Pct\b/gi, "Home Win Rate")
    .replace(/\bRpi\b/gi, "RPI Rating")
    .replace(/\bNetRtg\b/gi, "Net Rating")
    .replace(/\bOrtg\b/gi, "Offensive Rating")
    .replace(/\bDrtg\b/gi, "Defensive Rating")
    .replace(/^\s+/, "")
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
}

// ── Phase 1 Core: buildReasoning ─────────────────────────────────────────────

export function buildReasoning(input: SignalInput): string {
  const {
    sport,
    betType,
    pick,
    confidenceTier,
    confidence,
    sharpMoney,
    modelAgreement,
    edge,
    steamMove,
    reverseLineMove,
    trueProbability,
    impliedProbability,
    factors = [],
    fusionInsights = [],
    homeTeam,
    awayTeam,
    homeRecord,
    awayRecord,
    mcSim,
    sitFactors,
    injuryContext,
    twoWayRiskNote,
  } = input;

  const sentences: string[] = [];
  const usedSignals = new Set<string>();

  // ── 1. Records context ───────────────────────────────────────────────────
  if (homeTeam && awayTeam && homeRecord && awayRecord) {
    sentences.push(`${awayTeam} (${awayRecord}) travels to face ${homeTeam} (${homeRecord}).`);
  }

  // ── 2. Monte Carlo simulation ────────────────────────────────────────────
  if (mcSim && mcSim.predictedHomeScore !== undefined && mcSim.predictedAwayScore !== undefined) {
    const sims = mcSim.simulations || 10000;
    const simStr = sims >= 100000 ? `${(sims / 1000).toFixed(0)}K deep` : `${(sims / 1000).toFixed(0)}K`;
    sentences.push(
      `${simStr} Monte Carlo simulations project a ${Math.round(mcSim.predictedHomeScore)}–${Math.round(mcSim.predictedAwayScore)} final ` +
      `(${homeTeam || "Home"} wins ${(mcSim.homeWinProb || 0).toFixed(0)}% of simulations).`
    );
    usedSignals.add("mc");
  }

  // ── 3. Situational flags ─────────────────────────────────────────────────
  if (sitFactors) {
    const sitParts: string[] = [];
    if (sitFactors.homeB2B) sitParts.push(`${homeTeam || "Home"} is on a back-to-back`);
    if (sitFactors.awayB2B) sitParts.push(`${awayTeam || "Away"} is on a back-to-back`);
    if (!sitFactors.homeB2B && !sitFactors.awayB2B && homeTeam && awayTeam) {
      const homeDays = sitFactors.homeRestDays || 0;
      const awayDays = sitFactors.awayRestDays || 0;
      if (Math.abs(homeDays - awayDays) >= 2) {
        const rested = homeDays > awayDays ? homeTeam : awayTeam;
        const tired = homeDays > awayDays ? awayTeam : homeTeam;
        sitParts.push(`${rested} has a ${Math.abs(homeDays - awayDays)}-day rest advantage over ${tired}`);
      }
    }
    if (sitFactors.spotType && sitFactors.spotType !== "normal" && sitFactors.spotDescription) {
      sitParts.push(sitFactors.spotDescription);
    }
    if (sitParts.length > 0) {
      sentences.push(sitParts.join("; ") + ".");
    }
  }

  // ── 4. Injury context ────────────────────────────────────────────────────
  if (injuryContext) {
    const homeOut = injuryContext.homeStartersOut || 0;
    const awayOut = injuryContext.awayStartersOut || 0;
    if (awayOut >= 2 && awayOut > homeOut) {
      sentences.push(`${awayOut} starters absent for ${awayTeam || "Away"} create a clear matchup advantage.`);
    } else if (homeOut >= 2 && homeOut > awayOut) {
      sentences.push(`${homeOut} starters out for ${homeTeam || "Home"} shift the matchup dynamics.`);
    }
  }

  // ── 5. Steam move (highest-priority sharp signal) ────────────────────────
  if (steamMove) {
    sentences.push(`Steam move detected — rapid coordinated line movement across multiple books signals decisive sharp action.`);
    usedSignals.add("steam");
  } else if (reverseLineMove) {
    sentences.push(`Reverse line movement present — the line has moved against the grain of public betting, revealing sharp money on this side.`);
    usedSignals.add("rlm");
  }

  // ── 6. Sharp money band ──────────────────────────────────────────────────
  if (!usedSignals.has("steam") && sharpMoney >= 50) {
    const band = pickBand(SHARP_BANDS, sharpMoney);
    if (band) {
      sentences.push(band.phrase(sharpMoney));
      usedSignals.add("sharp");
    }
  } else if (usedSignals.has("steam") && sharpMoney >= 65) {
    const band = pickBand(SHARP_BANDS, sharpMoney);
    if (band) {
      sentences.push(band.phrase(sharpMoney));
      usedSignals.add("sharp");
    }
  }

  // ── 7. Model agreement band ──────────────────────────────────────────────
  if (modelAgreement >= 3) {
    const band = pickBand(MODEL_AGREEMENT_BANDS, modelAgreement);
    if (band) sentences.push(band.phrase(modelAgreement));
  }

  // ── 8. Bet-type specific probability / edge context ──────────────────────
  const betCtxFn = BET_TYPE_CONTEXT[betType] || BET_TYPE_CONTEXT["moneyline"];
  const betCtx = betCtxFn(pick, edge, trueProbability, impliedProbability);
  if (betCtx) sentences.push(betCtx);

  // ── 9. Edge band ─────────────────────────────────────────────────────────
  if (edge > 0) {
    const band = pickBand(EDGE_BANDS, edge);
    if (band) sentences.push(band.phrase(edge));
  }

  // ── 10. Top bullish factors ──────────────────────────────────────────────
  const bullishFactors = factors
    .filter(f => f.direction === "positive" || f.direction === "bullish")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 2);
  if (bullishFactors.length > 0) {
    const primary = bullishFactors[0];
    const secondary = bullishFactors[1];
    const primaryText = primary.description || humanizeFactorName(primary.name);
    const secondaryText = secondary ? ` and ${(secondary.description || humanizeFactorName(secondary.name)).toLowerCase()}` : "";
    sentences.push(`Key model drivers: ${primaryText}${secondaryText}.`);
  }

  // ── 11. Sport-specific context ───────────────────────────────────────────
  const sportCtxMap = SPORT_CONTEXT[sport.toUpperCase()];
  if (sportCtxMap && betType && sportCtxMap[betType.toLowerCase()]) {
    sentences.push(sportCtxMap[betType.toLowerCase()]);
  }

  // ── 12. Fusion insight (if not repetitive) ───────────────────────────────
  if (fusionInsights.length > 0) {
    const insight = fusionInsights[0];
    const isDuplicate = sentences.some(s => {
      const words = insight.split(" ").slice(0, 5).join(" ").toLowerCase();
      return s.toLowerCase().includes(words);
    });
    if (!isDuplicate && insight.length > 15) {
      sentences.push(insight);
    }
  }

  // ── 13. Two-way risk note ────────────────────────────────────────────────
  if (twoWayRiskNote) {
    sentences.push(twoWayRiskNote);
  }

  // ── 14. Confidence tier closing statement ────────────────────────────────
  const tierStatements: Record<string, string> = {
    LOCK: `This is a LOCK-tier pick — the model's highest conviction rating, reserved for picks where all major signals align simultaneously.`,
    STRONG: `STRONG rating: multiple independent signals are aligned, producing above-average model confidence.`,
    LEAN: `LEAN rating: positive expected value with moderate signal alignment — worth including at standard stake.`,
    VALUE: `VALUE play: edge exists but signal count is lower — size down and treat as a supplementary position.`,
  };
  if (tierStatements[confidenceTier]) {
    sentences.push(tierStatements[confidenceTier]);
  }

  return sentences.join(" ");
}

// ── Ticket-Level Reasoning ───────────────────────────────────────────────────

export function buildTicketReasoningFromSignals(input: TicketSignalInput): string {
  const { legs, riskLevel = "moderate" } = input;
  if (legs.length === 0) return "No legs provided.";

  const avgConf = Math.round(legs.reduce((s, l) => s + l.confidence, 0) / legs.length);
  const avgEV = Math.round((legs.reduce((s, l) => s + (l.ev || l.edge || 0), 0) / legs.length) * 10) / 10;
  const mcLegs = legs.filter(l => l.monteCarloData).length;
  const sitLegs = legs.filter(l => l.situationalData).length;
  const injLegs = legs.filter(l => l.injuryData).length;
  const highConfLegs = legs.filter(l => l.confidence >= 68).length;

  const parts: string[] = [];

  // Opening confidence statement
  if (avgConf >= 72) {
    parts.push(`High-conviction ${legs.length}-leg ticket — ${avgConf}% average model confidence, with ${highConfLegs} of ${legs.length} legs individually rated strong or above.`);
  } else if (avgConf >= 62) {
    parts.push(`Solid ${legs.length}-leg ticket averaging ${avgConf}% model confidence across all picks.`);
  } else {
    parts.push(`${legs.length}-leg ticket with ${avgConf}% average confidence — balanced risk profile at ${riskLevel} stake sizing.`);
  }

  // EV statement
  if (avgEV >= 5) {
    parts.push(`Combined expected value of +${avgEV}% — well above the market efficiency threshold.`);
  } else if (avgEV >= 2) {
    parts.push(`Positive combined edge at +${avgEV}% EV — each leg individually contributes value.`);
  } else if (avgEV > 0) {
    parts.push(`Slim but positive expected value at +${avgEV}%.`);
  }

  // Simulation coverage
  if (mcLegs === legs.length) {
    parts.push(`All ${mcLegs} legs backed by Monte Carlo simulations — projected outcomes validated across thousands of scenarios.`);
  } else if (mcLegs > 0) {
    parts.push(`${mcLegs}/${legs.length} legs validated by Monte Carlo simulation.`);
  }

  // Situational advantages
  const situationDescriptions: string[] = [];
  if (sitLegs > 0) situationDescriptions.push(`${sitLegs} matchup${sitLegs > 1 ? "s have" : " has"} situational advantages`);
  if (injLegs > 0) situationDescriptions.push(`${injLegs} game${injLegs > 1 ? "s include" : " includes"} injury analysis`);
  if (situationDescriptions.length > 0) parts.push(`${situationDescriptions.join("; ")}.`);

  // Top cross-leg factors
  const factorCounts = new Map<string, number>();
  for (const leg of legs) {
    for (const f of (leg.factors || []).slice(0, 2)) {
      const key = humanizeFactorName(f.name);
      factorCounts.set(key, (factorCounts.get(key) || 0) + Math.abs(f.impact));
    }
  }
  const topFactors = Array.from(factorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  if (topFactors.length > 0) {
    parts.push(`Recurring model drivers: ${topFactors.join(", ")}.`);
  }

  // Risk level note
  if (riskLevel === "aggressive") {
    parts.push(`Aggressive risk profile — higher volatility, sized for maximum payout potential.`);
  } else if (riskLevel === "conservative") {
    parts.push(`Conservative build — legs selected for consistency over ceiling, reducing variance.`);
  }

  return parts.join(" ");
}

// ── Signal Strength Translator ───────────────────────────────────────────────
// Returns a short summary label for quick display (used in badges/tooltips)

export interface SignalStrength {
  overall: "elite" | "strong" | "moderate" | "weak";
  label: string;
  description: string;
  keySignal: string;
}

export function translateSignalStrength(input: Pick<SignalInput,
  "steamMove" | "reverseLineMove" | "sharpMoney" | "modelAgreement" | "edge" | "confidenceTier"
>): SignalStrength {
  const { steamMove, reverseLineMove, sharpMoney, modelAgreement, edge, confidenceTier } = input;

  let score = 0;
  if (steamMove) score += 40;
  if (reverseLineMove) score += 25;
  if (sharpMoney >= 70) score += 30;
  else if (sharpMoney >= 60) score += 20;
  else if (sharpMoney >= 55) score += 10;
  if (modelAgreement >= 5) score += 25;
  else if (modelAgreement >= 4) score += 15;
  else if (modelAgreement >= 3) score += 8;
  if (edge >= 7) score += 20;
  else if (edge >= 4) score += 12;
  else if (edge >= 2) score += 6;
  if (confidenceTier === "LOCK") score += 15;
  else if (confidenceTier === "STRONG") score += 8;

  let keySignal = "Multi-factor alignment";
  if (steamMove) keySignal = "Steam move detected";
  else if (reverseLineMove) keySignal = "Reverse line movement";
  else if (sharpMoney >= 70) keySignal = `${sharpMoney}% sharp money`;
  else if (modelAgreement >= 5) keySignal = "5/5 model consensus";
  else if (edge >= 7) keySignal = `+${edge}% edge`;

  if (score >= 80) return { overall: "elite", label: "Elite Signal", description: "Multiple premium sharp indicators aligned — highest-confidence opportunity", keySignal };
  if (score >= 50) return { overall: "strong", label: "Strong Signal", description: "Above-average signal alignment across key indicators", keySignal };
  if (score >= 25) return { overall: "moderate", label: "Moderate Signal", description: "Positive lean with partial signal support", keySignal };
  return { overall: "weak", label: "Weak Signal", description: "Limited signal alignment — proceed cautiously", keySignal };
}

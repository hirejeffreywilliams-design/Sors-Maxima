import type { TicketLeg, GeneratedTicket } from './ticketOrchestrator';

export interface CorrelationAlert {
  type: "positive" | "negative";
  severity: "high" | "medium" | "low";
  legIds: string[];
  message: string;
  impactPercent: number;
}

export interface TicketGrade {
  grade: string;
  score: number;
  breakdown: { factor: string; score: number; weight: number; detail: string }[];
  strengths: string[];
  weaknesses: string[];
}

export interface SharpPublicSplit {
  sharpPercent: number;
  publicPercent: number;
  sharpSide: string;
  verdict: "sharp_agree" | "sharp_fade" | "neutral";
  insight: string;
}

export interface HedgeAdvice {
  shouldHedge: boolean;
  reason: string;
  hedgeBet: {
    description: string;
    stake: number;
    odds: number;
    potentialReturn: number;
  };
  guaranteedProfit: number;
  breakEvenOdds: number;
  riskReduction: number;
}

export interface CorrelationMatrixEntry {
  leg1Id: string;
  leg2Id: string;
  correlation: number;
  relationship: "positive" | "negative" | "neutral";
  explanation: string;
}

function isPlayerProp(market: string): boolean {
  return market.startsWith("player_") || market === "anytime_scorer";
}

function isTeamTotal(market: string): boolean {
  return market === "team_total";
}

function isTotal(market: string): boolean {
  return market === "total" || market === "first_half_total" || market === "first_quarter_total" || market === "alt_total";
}

function isSpread(market: string): boolean {
  return market === "spread" || market === "first_half_spread" || market === "first_quarter_spread" || market === "alt_spread";
}

function isMoneyline(market: string): boolean {
  return market === "moneyline";
}

function legsShareGame(a: TicketLeg, b: TicketLeg): boolean {
  return (a.team === b.team || a.team === b.opponent || a.opponent === b.team || a.opponent === b.opponent);
}

function legsShareTeam(a: TicketLeg, b: TicketLeg): boolean {
  return a.team === b.team;
}

function outcomeIsOver(outcome: string): boolean {
  return outcome.toLowerCase().includes("over");
}

function outcomeIsUnder(outcome: string): boolean {
  return outcome.toLowerCase().includes("under");
}

function isFavorite(americanOdds: number): boolean {
  return americanOdds < 0;
}

export function analyzeCorrelations(legs: TicketLeg[]): CorrelationAlert[] {
  const alerts: CorrelationAlert[] = [];

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i];
      const b = legs[j];

      if (!legsShareGame(a, b)) continue;

      if (isTeamTotal(a.market) && isPlayerProp(b.market) && legsShareTeam(a, b)) {
        if (outcomeIsUnder(a.outcome) && outcomeIsOver(b.outcome)) {
          alerts.push({
            type: "negative",
            severity: "high",
            legIds: [a.id, b.id],
            message: `Team total Under conflicts with ${b.playerName || "player"} Over from the same team — these outcomes work against each other.`,
            impactPercent: -15,
          });
        }
      }

      if (isTeamTotal(b.market) && isPlayerProp(a.market) && legsShareTeam(a, b)) {
        if (outcomeIsUnder(b.outcome) && outcomeIsOver(a.outcome)) {
          alerts.push({
            type: "negative",
            severity: "high",
            legIds: [a.id, b.id],
            message: `Team total Under conflicts with ${a.playerName || "player"} Over from the same team — these outcomes work against each other.`,
            impactPercent: -15,
          });
        }
      }

      if (isSpread(a.market) && isTotal(b.market)) {
        const spreadFavorsHighScoring = a.outcome.toLowerCase().includes("over") || (a.line !== undefined && a.line < 0);
        const totalIsOver = outcomeIsOver(b.outcome);
        if (spreadFavorsHighScoring && !totalIsOver) {
          alerts.push({
            type: "negative",
            severity: "medium",
            legIds: [a.id, b.id],
            message: `Spread direction suggests a blowout but total Under implies low scoring — potential conflict.`,
            impactPercent: -8,
          });
        }
      }

      if (isSpread(b.market) && isTotal(a.market)) {
        const spreadFavorsHighScoring = b.outcome.toLowerCase().includes("over") || (b.line !== undefined && b.line < 0);
        const totalIsOver = outcomeIsOver(a.outcome);
        if (spreadFavorsHighScoring && !totalIsOver) {
          alerts.push({
            type: "negative",
            severity: "medium",
            legIds: [a.id, b.id],
            message: `Spread direction suggests a blowout but total Under implies low scoring — potential conflict.`,
            impactPercent: -8,
          });
        }
      }

      if (isPlayerProp(a.market) && isPlayerProp(b.market) && legsShareGame(a, b)) {
        alerts.push({
          type: "positive",
          severity: "low",
          legIds: [a.id, b.id],
          message: `Two player props from the same game (${a.playerName || a.team} & ${b.playerName || b.team}) — mild positive correlation in game environment.`,
          impactPercent: 3,
        });
      }

      if (isMoneyline(a.market) && isTotal(b.market)) {
        if (isFavorite(a.americanOdds) && outcomeIsOver(b.outcome)) {
          alerts.push({
            type: "positive",
            severity: "medium",
            legIds: [a.id, b.id],
            message: `Moneyline favorite + game total Over — favorites in high-scoring games tend to correlate positively.`,
            impactPercent: 5,
          });
        }
      }

      if (isMoneyline(b.market) && isTotal(a.market)) {
        if (isFavorite(b.americanOdds) && outcomeIsOver(a.outcome)) {
          alerts.push({
            type: "positive",
            severity: "medium",
            legIds: [a.id, b.id],
            message: `Moneyline favorite + game total Over — favorites in high-scoring games tend to correlate positively.`,
            impactPercent: 5,
          });
        }
      }
    }
  }

  return alerts;
}

export function gradeTicket(ticket: {
  legs: any[];
  totalOdds: number;
  winProbability: number;
  expectedValue: number;
  confidenceScore: number;
  evPercent: number;
  riskRating: string;
}): TicketGrade {
  const breakdown: { factor: string; score: number; weight: number; detail: string }[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const evScore = Math.min(100, Math.max(0, 50 + ticket.evPercent * 5));
  breakdown.push({
    factor: "Expected Value",
    score: evScore,
    weight: 0.30,
    detail: `EV% of ${ticket.evPercent.toFixed(1)}% — ${evScore >= 70 ? "strong positive edge" : evScore >= 50 ? "marginal edge" : "negative expected value"}`,
  });
  if (evScore >= 70) strengths.push("Strong positive expected value");
  if (evScore < 40) weaknesses.push("Negative or weak expected value");

  const confScore = Math.min(100, Math.max(0, ticket.confidenceScore));
  breakdown.push({
    factor: "Confidence Score",
    score: confScore,
    weight: 0.25,
    detail: `Model confidence at ${confScore.toFixed(0)}% — ${confScore >= 70 ? "high conviction" : confScore >= 50 ? "moderate conviction" : "low conviction"}`,
  });
  if (confScore >= 75) strengths.push("High model confidence across legs");
  if (confScore < 45) weaknesses.push("Low model confidence — uncertain outcome");

  const impliedProb = 1 / ticket.totalOdds;
  const probDiff = (ticket.winProbability - impliedProb) * 100;
  const probScore = Math.min(100, Math.max(0, 50 + probDiff * 3));
  breakdown.push({
    factor: "Win Probability vs Implied",
    score: probScore,
    weight: 0.20,
    detail: `Model prob ${(ticket.winProbability * 100).toFixed(1)}% vs implied ${(impliedProb * 100).toFixed(1)}% — ${probDiff > 0 ? "+" : ""}${probDiff.toFixed(1)}% edge`,
  });
  if (probDiff > 5) strengths.push("Win probability exceeds market implied odds");
  if (probDiff < -5) weaknesses.push("Win probability below market implied odds");

  const correlationAlerts = ticket.legs.length > 1 ? analyzeCorrelations(ticket.legs as TicketLeg[]) : [];
  const negativeCorrelations = correlationAlerts.filter(a => a.type === "negative");
  const positiveCorrelations = correlationAlerts.filter(a => a.type === "positive");
  let correlationHealthScore = 70;
  correlationHealthScore -= negativeCorrelations.filter(a => a.severity === "high").length * 20;
  correlationHealthScore -= negativeCorrelations.filter(a => a.severity === "medium").length * 10;
  correlationHealthScore += positiveCorrelations.length * 5;
  correlationHealthScore = Math.min(100, Math.max(0, correlationHealthScore));
  breakdown.push({
    factor: "Correlation Health",
    score: correlationHealthScore,
    weight: 0.15,
    detail: `${negativeCorrelations.length} negative and ${positiveCorrelations.length} positive correlations detected`,
  });
  if (negativeCorrelations.length === 0 && positiveCorrelations.length > 0) strengths.push("Positive leg correlations boost parlay probability");
  if (negativeCorrelations.length > 0) weaknesses.push(`${negativeCorrelations.length} negative correlation(s) reduce effective probability`);

  const uniqueMarkets = new Set(ticket.legs.map((l: any) => l.market || "unknown"));
  const uniqueTeams = new Set(ticket.legs.map((l: any) => l.team || "unknown"));
  const marketDiversity = Math.min(1, uniqueMarkets.size / Math.max(1, ticket.legs.length));
  const teamDiversity = Math.min(1, uniqueTeams.size / Math.max(1, ticket.legs.length));
  const diversityScore = Math.min(100, Math.max(0, ((marketDiversity + teamDiversity) / 2) * 100));
  breakdown.push({
    factor: "Leg Diversity",
    score: diversityScore,
    weight: 0.10,
    detail: `${uniqueMarkets.size} unique markets, ${uniqueTeams.size} unique teams across ${ticket.legs.length} legs`,
  });
  if (diversityScore >= 80) strengths.push("Well-diversified across markets and teams");
  if (diversityScore < 40) weaknesses.push("Low diversity — concentrated risk in similar markets/teams");

  const totalScore = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0);

  let grade: string;
  if (totalScore >= 85) grade = "A";
  else if (totalScore >= 70) grade = "B";
  else if (totalScore >= 55) grade = "C";
  else if (totalScore >= 40) grade = "D";
  else grade = "F";

  return { grade, score: Math.round(totalScore * 10) / 10, breakdown, strengths, weaknesses };
}

export function calculateSharpPublicSplit(leg: {
  analysis: { sharpAction: boolean; publicPercent: number; lineMovement: string };
  winProbability: number;
  americanOdds: number;
}): SharpPublicSplit {
  const { sharpAction, publicPercent, lineMovement } = leg.analysis;

  let sharpPercent = 100 - publicPercent;

  if (lineMovement === "steam") {
    sharpPercent += 12;
  } else if (lineMovement === "reverse") {
    sharpPercent += 8;
  }

  if (sharpAction) {
    sharpPercent += 10;
  }

  sharpPercent = Math.min(95, Math.max(5, sharpPercent));
  const adjustedPublicPercent = 100 - sharpPercent;

  const sharpSide = sharpAction
    ? (leg.americanOdds < 0 ? "favorite" : "underdog")
    : (publicPercent > 60 ? "opposite of public" : "neutral");

  let verdict: "sharp_agree" | "sharp_fade" | "neutral";
  if (sharpAction && publicPercent > 55) {
    verdict = "sharp_fade";
  } else if (sharpAction && publicPercent <= 55) {
    verdict = "sharp_agree";
  } else {
    verdict = "neutral";
  }

  let insight: string;
  if (verdict === "sharp_fade") {
    insight = `Sharp money (${sharpPercent.toFixed(0)}%) is fading the public (${adjustedPublicPercent.toFixed(0)}% public). ${lineMovement === "steam" ? "Steam move detected — sharps are aggressively betting this side." : lineMovement === "reverse" ? "Reverse line movement confirms sharp action against public." : "Line is stable but sharp indicators are present."}`;
  } else if (verdict === "sharp_agree") {
    insight = `Sharp money aligns with this side at ${sharpPercent.toFixed(0)}%. ${lineMovement === "steam" ? "Steam move adds conviction." : "Moderate sharp interest detected."}`;
  } else {
    insight = `No strong sharp signal. Public is at ${adjustedPublicPercent.toFixed(0)}% with ${lineMovement} line movement. Consider other factors.`;
  }

  return {
    sharpPercent: Math.round(sharpPercent * 10) / 10,
    publicPercent: Math.round(adjustedPublicPercent * 10) / 10,
    sharpSide,
    verdict,
    insight,
  };
}

export function generateHedgeAdvice(ticket: {
  legs: any[];
  totalOdds: number;
  recommendedStake: number;
  potentialPayout: number;
  winProbability: number;
}): HedgeAdvice {
  const weakestLeg = ticket.legs.reduce((weakest: any, leg: any) => {
    const legProb = leg.winProbability ?? 0.5;
    const weakestProb = weakest.winProbability ?? 0.5;
    return legProb < weakestProb ? leg : weakest;
  }, ticket.legs[0]);

  const weakestProb = weakestLeg?.winProbability ?? 0.5;
  const hedgeImpliedProb = 1 - weakestProb;

  const hedgeDecimalOdds = 1 / hedgeImpliedProb;
  const hedgeStake = (ticket.potentialPayout * hedgeImpliedProb) / (1 + hedgeDecimalOdds);
  const hedgePotentialReturn = hedgeStake * hedgeDecimalOdds;

  const guaranteedProfit = Math.min(
    ticket.potentialPayout - ticket.recommendedStake - hedgeStake,
    hedgePotentialReturn - ticket.recommendedStake
  );

  const breakEvenOdds = ticket.potentialPayout / ticket.recommendedStake;

  const riskReduction = Math.min(100, Math.max(0, (1 - weakestProb) * 100));

  const shouldHedge = ticket.legs.length >= 3 && weakestProb < 0.45 && guaranteedProfit > 0;

  let reason: string;
  if (shouldHedge) {
    reason = `The weakest leg (${weakestLeg?.team || "unknown"} — ${weakestLeg?.outcome || "unknown"}) has only ${(weakestProb * 100).toFixed(1)}% win probability. Hedging can lock in a guaranteed profit of $${guaranteedProfit.toFixed(2)}.`;
  } else if (ticket.legs.length < 3) {
    reason = "Hedge not recommended for parlays with fewer than 3 legs — risk/reward ratio doesn't justify the cost.";
  } else if (weakestProb >= 0.45) {
    reason = "All legs have reasonable win probabilities. Hedging would reduce upside without sufficient risk justification.";
  } else {
    reason = "Hedge conditions not met — guaranteed profit is not positive after hedge cost.";
  }

  const hedgeAmericanOdds = hedgeDecimalOdds >= 2
    ? Math.round((hedgeDecimalOdds - 1) * 100)
    : Math.round(-100 / (hedgeDecimalOdds - 1));

  return {
    shouldHedge,
    reason,
    hedgeBet: {
      description: `Bet against ${weakestLeg?.team || "weakest leg"} (${weakestLeg?.outcome || "opposite side"})`,
      stake: Math.round(hedgeStake * 100) / 100,
      odds: hedgeAmericanOdds,
      potentialReturn: Math.round(hedgePotentialReturn * 100) / 100,
    },
    guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
    breakEvenOdds: Math.round(breakEvenOdds * 100) / 100,
    riskReduction: Math.round(riskReduction * 10) / 10,
  };
}

export function buildCorrelationMatrix(legs: TicketLeg[]): CorrelationMatrixEntry[] {
  const entries: CorrelationMatrixEntry[] = [];

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i];
      const b = legs[j];

      let correlation = 0;
      const explanations: string[] = [];

      if (legsShareTeam(a, b)) {
        correlation += 0.3;
        explanations.push("Same team (+0.3)");
      }

      if (legsShareGame(a, b) && !legsShareTeam(a, b)) {
        correlation += 0.2;
        explanations.push("Same game (+0.2)");
      }

      const opposingOutcomes =
        (outcomeIsOver(a.outcome) && outcomeIsUnder(b.outcome)) ||
        (outcomeIsUnder(a.outcome) && outcomeIsOver(b.outcome)) ||
        (isMoneyline(a.market) && isMoneyline(b.market) && legsShareGame(a, b) && a.team !== b.team);
      if (opposingOutcomes) {
        correlation -= 0.4;
        explanations.push("Opposing outcomes (-0.4)");
      }

      if (a.market === b.market) {
        correlation += 0.1;
        explanations.push("Same market type (+0.1)");
      }

      correlation = Math.max(-1, Math.min(1, Math.round(correlation * 100) / 100));

      let relationship: "positive" | "negative" | "neutral";
      if (correlation > 0.05) relationship = "positive";
      else if (correlation < -0.05) relationship = "negative";
      else relationship = "neutral";

      entries.push({
        leg1Id: a.id,
        leg2Id: b.id,
        correlation,
        relationship,
        explanation: explanations.length > 0 ? explanations.join(", ") : "No significant correlation factors detected",
      });
    }
  }

  return entries;
}

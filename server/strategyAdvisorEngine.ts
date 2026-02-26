import { getPrecomputedPredictions, type PrecomputedPick } from "./precomputedPredictionsEngine";

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "extreme";
  expectedLegs: number[];
  targetOdds: string;
  winRate: string;
  idealBetTypes: string[];
  approach: string[];
  example: string;
  bestFor: string;
  avoid: string;
}

export interface LegAnalysis {
  legId: string;
  outcome: string;
  team: string;
  market: string;
  grade: string;
  confidence: number;
  ev: number;
  issues: string[];
  strengths: string[];
  suggestion: string;
  shouldKeep: boolean;
  improvementOptions: ImprovementOption[];
}

export interface ImprovementOption {
  description: string;
  newOdds?: number;
  newConfidence?: number;
  reasoning: string;
  source: string;
}

export interface TicketAnalysis {
  overallGrade: string;
  overallScore: number;
  verdict: string;
  verdictType: "excellent" | "good" | "decent" | "weak" | "poor";
  strategyDetected: string;
  strategyMatch: number;
  riskLevel: string;
  combinedOdds: number;
  estimatedWinProb: number;
  expectedValue: number;
  legAnalyses: LegAnalysis[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  maxTips: string[];
  correlationWarnings: string[];
  diversificationScore: number;
  bestReplacementPicks: ReplacementPick[];
}

export interface ReplacementPick {
  pickId: string;
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  confidence: number;
  ev: number;
  reasoning: string;
  replaces?: string;
  whyBetter: string;
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "chalk_grinder",
    name: "Chalk Grinder",
    description: "Stack heavy favorites with high-confidence picks for consistent, lower-payout wins. The safest parlay approach.",
    riskLevel: "low",
    expectedLegs: [2, 3, 4],
    targetOdds: "+150 to +350",
    winRate: "45-60%",
    idealBetTypes: ["moneyline", "spread"],
    approach: [
      "Pick 2-4 heavy favorites (grade A or B+)",
      "Focus on moneylines and spreads with strong edges",
      "Avoid player props — stick to game outcomes",
      "Target games where one team is significantly better",
      "Look for back-to-back or fatigue spots on the opposing team"
    ],
    example: "3-leg parlay: OKC ML (-250) + BOS -3.5 (-110) + DET ML (-180) = ~+220",
    bestFor: "Consistent grinders who want steady returns with lower risk",
    avoid: "Adding long-shot legs just to boost odds — it kills the win rate"
  },
  {
    id: "value_hunter",
    name: "Value Hunter",
    description: "Find mispriced lines where our models show higher win probability than the odds imply. Positive expected value is king.",
    riskLevel: "medium",
    expectedLegs: [3, 4, 5],
    targetOdds: "+400 to +800",
    winRate: "25-40%",
    idealBetTypes: ["spread", "total", "moneyline"],
    approach: [
      "Prioritize picks with positive EV (expected value > 0%)",
      "Look for lines where our confidence exceeds implied probability by 5%+",
      "Mix spreads, totals, and moneylines for diversification",
      "Target games with sharp money disagreement from public",
      "Use Monte Carlo convergence scores to validate picks"
    ],
    example: "4-leg parlay: PHI +3.5 (+EV) + MIL/CHI Over 224 + ATL ML + MEM -1.5 = ~+650",
    bestFor: "Analytical bettors who understand expected value and can handle variance",
    avoid: "Ignoring negative EV picks just because the odds look good"
  },
  {
    id: "correlated_parlay",
    name: "Correlated Parlay",
    description: "Build tickets where legs are naturally correlated — when one hits, others are more likely to hit too.",
    riskLevel: "medium",
    expectedLegs: [3, 4, 5],
    targetOdds: "+350 to +700",
    winRate: "30-45%",
    idealBetTypes: ["spread", "total", "player_prop", "moneyline"],
    approach: [
      "Pair game totals with player props (high total + star player Over points)",
      "Combine moneylines with team-specific totals",
      "Stack same-game picks that move together",
      "Pair a team's spread with their star player performance",
      "Use situational analysis to find convergence opportunities"
    ],
    example: "4-leg SGP: LAL ML + Luka Over 30.5 pts + Game Over 225 + LAL -2.5 = ~+550",
    bestFor: "Bettors who understand game flow and want legs that support each other",
    avoid: "Mixing uncorrelated legs from different games — defeats the purpose"
  },
  {
    id: "prop_specialist",
    name: "Prop Specialist",
    description: "Focus exclusively on player props where statistical edges are most common. Season averages vs. lines create exploitable gaps.",
    riskLevel: "medium",
    expectedLegs: [4, 5, 6],
    targetOdds: "+500 to +1200",
    winRate: "20-35%",
    idealBetTypes: ["player_prop"],
    approach: [
      "Compare player season averages to prop lines — look for 8%+ gaps",
      "Factor in matchup difficulty (opponent defensive rating)",
      "Check injury reports — missing teammates can boost stats",
      "Focus on primary stats (points, rebounds, assists) over exotics",
      "Avoid players on minutes restrictions or coming off injury"
    ],
    example: "5-leg props: Jokic Over 28.5 pts + Edwards Over 5 rebs + Brunson Over 6 ast + Wemby Over 11 rebs + Cunningham Over 24 pts = ~+900",
    bestFor: "Bettors who follow individual players and understand statistical matchups",
    avoid: "3-pointers and exotic props with high variance — stick to core stats"
  },
  {
    id: "longshot_sniper",
    name: "Longshot Sniper",
    description: "High-risk, high-reward tickets targeting massive payouts. One big hit covers many losses.",
    riskLevel: "high",
    expectedLegs: [5, 6, 7, 8],
    targetOdds: "+1500 to +5000",
    winRate: "5-15%",
    idealBetTypes: ["moneyline", "spread", "total", "player_prop"],
    approach: [
      "Mix all bet types for maximum diversity",
      "Include 1-2 underdog moneylines with real upset potential",
      "Use small stakes — this is a volume play",
      "Look for situational underdogs (rest advantage, home court, revenge games)",
      "Target at least 60% of legs with grade B or higher"
    ],
    example: "6-leg parlay: 4 favorites + 2 underdogs = ~+2500 with $10 stake for $260 payout",
    bestFor: "Bettors with bankroll discipline who can handle losing streaks for big scores",
    avoid: "Betting rent money — only use 1-2% of bankroll per longshot ticket"
  },
  {
    id: "hedge_master",
    name: "Hedge Master",
    description: "Build primary tickets then add hedge positions to guarantee profit regardless of one outcome. Risk management first.",
    riskLevel: "low",
    expectedLegs: [2, 3],
    targetOdds: "+150 to +300",
    winRate: "50-65%",
    idealBetTypes: ["moneyline", "spread"],
    approach: [
      "Start with 2-3 legs of your highest-confidence picks",
      "Identify the weakest leg and calculate a hedge bet on the opposite side",
      "Your hedge should guarantee break-even or small profit if the weak leg loses",
      "Focus on picks where both sides have reasonable odds",
      "Use our ticket grading to find which leg needs hedging"
    ],
    example: "2-leg parlay: BOS ML + OKC ML at +180, then hedge the weaker leg with a single bet",
    bestFor: "Conservative bettors who prioritize protecting their bankroll",
    avoid: "Over-hedging — it eats into your profits. Only hedge the truly risky leg"
  }
];

function gradeToScore(grade: string): number {
  const map: Record<string, number> = { "A+": 10, "A": 9, "A-": 8.5, "B+": 8, "B": 7, "B-": 6.5, "C+": 6, "C": 5, "C-": 4.5, "D+": 4, "D": 3, "D-": 2, "F": 1 };
  return map[grade] ?? 5;
}

function scoreToGrade(score: number): string {
  if (score >= 9.5) return "A+";
  if (score >= 8.5) return "A";
  if (score >= 7.5) return "A-";
  if (score >= 7) return "B+";
  if (score >= 6) return "B";
  if (score >= 5.5) return "B-";
  if (score >= 5) return "C+";
  if (score >= 4.5) return "C";
  if (score >= 4) return "C-";
  if (score >= 3) return "D+";
  if (score >= 2) return "D";
  return "F";
}

function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

function detectStrategy(legs: AnalysisLeg[]): { strategy: string; match: number } {
  if (legs.length === 0) return { strategy: "No picks selected", match: 0 };

  const avgConf = legs.reduce((s, l) => s + (l.confidence ?? 50), 0) / legs.length;
  const propLegs = legs.filter(l => l.market?.includes("player") || l.market?.includes("prop"));
  const propRatio = propLegs.length / legs.length;
  const mlLegs = legs.filter(l => l.market === "moneyline");
  const spreadLegs = legs.filter(l => l.market === "spread");
  const totalLegs = legs.filter(l => l.market === "total");
  const favLegs = legs.filter(l => (l.americanOdds ?? 0) < -130);
  const dogLegs = legs.filter(l => (l.americanOdds ?? 0) > 130);
  const uniqueGames = new Set(legs.map(l => `${l.team}-${l.opponent}`));
  const sameGameCount = legs.length - uniqueGames.size;

  if (propRatio > 0.7) return { strategy: "Prop Specialist", match: 75 + Math.min(propRatio * 25, 25) };
  if (legs.length <= 3 && avgConf > 65 && favLegs.length >= legs.length * 0.6) return { strategy: "Chalk Grinder", match: 70 + Math.min(avgConf - 65, 30) };
  if (sameGameCount > 0 && legs.length >= 3) return { strategy: "Correlated Parlay", match: 60 + Math.min(sameGameCount * 15, 35) };
  if (legs.length >= 5 && dogLegs.length >= 2) return { strategy: "Longshot Sniper", match: 55 + Math.min(dogLegs.length * 10, 35) };
  if (legs.length <= 3 && avgConf > 55) return { strategy: "Hedge Master", match: 60 + Math.min((avgConf - 55) * 2, 30) };

  const avgEv = legs.reduce((s, l) => s + (l.evPercent ?? 0), 0) / legs.length;
  if (avgEv > 2) return { strategy: "Value Hunter", match: 60 + Math.min(avgEv * 5, 35) };

  return { strategy: "Mixed Strategy", match: 40 };
}

interface AnalysisLeg {
  id: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  americanOdds: number;
  decimalOdds: number;
  sport?: string;
  confidence?: number;
  evPercent?: number;
  grade?: string;
  reasoning?: string;
  playerName?: string;
  propLine?: number;
}

function analyzeSingleLeg(leg: AnalysisLeg, allLegs: AnalysisLeg[], availablePicks: PrecomputedPick[]): LegAnalysis {
  const issues: string[] = [];
  const strengths: string[] = [];
  const improvementOptions: ImprovementOption[] = [];

  const conf = leg.confidence ?? 50;
  const ev = leg.evPercent ?? 0;
  const grade = leg.grade ?? "C";
  const gScore = gradeToScore(grade);

  if (gScore >= 8) strengths.push(`Strong grade (${grade}) — our models are confident in this pick`);
  else if (gScore >= 6) strengths.push(`Solid grade (${grade}) — a reasonable selection`);
  else if (gScore < 5) issues.push(`Weak grade (${grade}) — our models show low confidence. Consider swapping.`);

  if (conf >= 70) strengths.push(`High confidence at ${conf}% — well-supported by data`);
  else if (conf >= 55) strengths.push(`Decent confidence at ${conf}%`);
  else if (conf < 45) issues.push(`Low confidence (${conf}%) — this leg is risky and could sink the ticket`);

  if (ev > 5) strengths.push(`Excellent value — ${ev.toFixed(1)}% positive EV`);
  else if (ev > 0) strengths.push(`Positive expected value (+${ev.toFixed(1)}%)`);
  else if (ev < -3) issues.push(`Negative EV (${ev.toFixed(1)}%) — the odds don't justify the risk`);

  const sameGame = allLegs.filter(l => l.id !== leg.id && ((l.team === leg.team && l.opponent === leg.opponent) || (l.team === leg.opponent && l.opponent === leg.team)));
  if (sameGame.length > 0) {
    const sameMarket = sameGame.filter(l => l.market === leg.market);
    if (sameMarket.length > 0) {
      issues.push(`Conflicting bet — you have another ${leg.market} pick on this same game`);
    } else {
      strengths.push("Correlated with another leg on the same game — good synergy potential");
    }
  }

  const matchingPicks = availablePicks.filter(p => {
    const sameTeams = (p.homeTeam === leg.team || p.awayTeam === leg.team) && (p.homeTeam === leg.opponent || p.awayTeam === leg.opponent);
    return sameTeams && p.betType === leg.market;
  });
  
  for (const betterPick of matchingPicks) {
    if (betterPick.confidence > conf + 5 || betterPick.ev > ev + 2) {
      improvementOptions.push({
        description: betterPick.pick,
        newOdds: betterPick.odds,
        newConfidence: betterPick.confidence,
        reasoning: betterPick.reasoning,
        source: "Precomputed Engine"
      });
    }
  }

  let suggestion = "";
  if (issues.length === 0) {
    suggestion = "This is a strong pick. Keep it in your ticket.";
  } else if (issues.length === 1 && strengths.length >= 2) {
    suggestion = "Solid pick with a minor concern. Worth keeping but monitor the situation.";
  } else if (issues.length >= 2) {
    suggestion = improvementOptions.length > 0
      ? "Consider swapping this leg — we have better alternatives available."
      : "This is the weakest leg on your ticket. Consider removing it to improve win probability.";
  } else {
    suggestion = "Acceptable pick. Check if there's a better option in the same game.";
  }

  return {
    legId: leg.id,
    outcome: leg.outcome,
    team: leg.team,
    market: leg.market,
    grade,
    confidence: conf,
    ev,
    issues,
    strengths,
    suggestion,
    shouldKeep: issues.length < 2 || gScore >= 6,
    improvementOptions
  };
}

function getCorrelationWarnings(legs: AnalysisLeg[]): string[] {
  const warnings: string[] = [];
  const sportCounts: Record<string, number> = {};
  const teamCounts: Record<string, number> = {};

  for (const leg of legs) {
    const sport = leg.sport ?? "unknown";
    sportCounts[sport] = (sportCounts[sport] ?? 0) + 1;
    teamCounts[leg.team] = (teamCounts[leg.team] ?? 0) + 1;
  }

  const sports = Object.keys(sportCounts);
  if (sports.length === 1 && legs.length >= 4) {
    warnings.push(`All ${legs.length} legs are from ${sports[0]} — consider diversifying across sports to reduce correlated losses`);
  }

  for (const [team, count] of Object.entries(teamCounts)) {
    if (count >= 3) {
      warnings.push(`${count} legs depend on ${team} — if they have a bad game, multiple legs fail simultaneously`);
    }
  }

  const totalLegs = legs.filter(l => l.market === "total");
  const mlLegs = legs.filter(l => l.market === "moneyline");
  if (totalLegs.length > 0 && mlLegs.length > 0) {
    for (const t of totalLegs) {
      const matchingMl = mlLegs.find(m => (m.team === t.team && m.opponent === t.opponent) || (m.team === t.opponent && m.opponent === t.team));
      if (matchingMl) {
        if (t.outcome.toLowerCase().includes("over") && (matchingMl.americanOdds ?? 0) > 130) {
          warnings.push(`Over total + underdog ML on ${t.team} vs ${t.opponent} — these can work together but adds risk`);
        }
      }
    }
  }

  return warnings;
}

function getDiversificationScore(legs: AnalysisLeg[]): number {
  if (legs.length <= 1) return 100;
  const sports = new Set(legs.map(l => l.sport ?? "unknown"));
  const markets = new Set(legs.map(l => l.market));
  const games = new Set(legs.map(l => `${l.team}-${l.opponent}`));

  const sportDiv = Math.min(sports.size / Math.min(legs.length, 4), 1) * 30;
  const marketDiv = Math.min(markets.size / Math.min(legs.length, 4), 1) * 30;
  const gameDiv = Math.min(games.size / legs.length, 1) * 40;

  return Math.round(sportDiv + marketDiv + gameDiv);
}

function getMaximizationTips(legs: AnalysisLeg[], analysis: Omit<TicketAnalysis, "maxTips">): string[] {
  const tips: string[] = [];

  if (analysis.estimatedWinProb > 0.5 && analysis.combinedOdds < 2) {
    tips.push("Your ticket has strong win probability but low payout. Consider adding one more leg to boost odds while keeping quality high.");
  }

  if (analysis.estimatedWinProb < 0.15 && legs.length >= 5) {
    tips.push("Win probability is low. Remove the weakest leg (lowest grade) to significantly improve your chances without losing much payout.");
  }

  const weakLegs = analysis.legAnalyses.filter(l => !l.shouldKeep);
  if (weakLegs.length > 0) {
    tips.push(`Swap out ${weakLegs.length} weak leg${weakLegs.length > 1 ? "s" : ""} for higher-graded alternatives to improve your ticket grade from ${analysis.overallGrade} without changing odds much.`);
  }

  if (analysis.diversificationScore < 40) {
    tips.push("Your ticket is concentrated. Spreading across different sports or bet types reduces the chance of a total wipeout.");
  }

  if (analysis.expectedValue < 0) {
    tips.push("This ticket has negative expected value. Focus on picks where our model confidence exceeds the odds-implied probability.");
  }

  const timingLegs = legs.filter(l => l.confidence && l.confidence > 60);
  if (timingLegs.length > 0 && timingLegs.length < legs.length) {
    tips.push("Some legs have much higher confidence than others. Consider building a smaller ticket using only your highest-confidence picks for a better win rate.");
  }

  if (legs.length >= 3 && analysis.overallScore >= 7) {
    tips.push("Strong ticket! Consider placing this as your main bet and creating a second smaller ticket with your backup picks.");
  }

  if (legs.length === 1) {
    tips.push("Single bets are the highest win-rate play. If you want to build a parlay, add 1-2 more high-confidence picks to boost the payout.");
  }

  return tips.slice(0, 4);
}

export function getStrategyTemplates(): StrategyTemplate[] {
  return STRATEGY_TEMPLATES;
}

export function getStrategyById(id: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find(t => t.id === id);
}

export async function analyzeTicket(legs: AnalysisLeg[]): Promise<TicketAnalysis> {
  if (legs.length === 0) {
    return {
      overallGrade: "N/A",
      overallScore: 0,
      verdict: "Add some picks to your ticket and we'll analyze them for you. Start with a strategy template above to guide your selections.",
      verdictType: "poor",
      strategyDetected: "No picks selected",
      strategyMatch: 0,
      riskLevel: "none",
      combinedOdds: 0,
      estimatedWinProb: 0,
      expectedValue: 0,
      legAnalyses: [],
      strengths: [],
      weaknesses: ["No picks added yet"],
      suggestions: ["Choose a strategy template above to get started", "Or add picks from Daily Picks, Generate, or Props pages"],
      maxTips: [],
      correlationWarnings: [],
      diversificationScore: 0,
      bestReplacementPicks: []
    };
  }

  let allPicks: PrecomputedPick[] = [];
  try {
    const sports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    for (const sport of sports) {
      const snapshot = getPrecomputedPredictions(sport);
      if (snapshot?.picks) allPicks.push(...snapshot.picks);
    }
  } catch {}

  const legAnalyses = legs.map(leg => analyzeSingleLeg(leg, legs, allPicks));

  const combinedDecimal = legs.reduce((acc, l) => acc * americanToDecimal(l.americanOdds), 1);
  const combinedOdds = combinedDecimal > 2
    ? Math.round((combinedDecimal - 1) * 100)
    : Math.round(-100 / (combinedDecimal - 1));

  const estimatedWinProb = legs.reduce((acc, l) => {
    const conf = (l.confidence ?? 50) / 100;
    return acc * conf;
  }, 1);

  const expectedValue = (estimatedWinProb * combinedDecimal - 1) * 100;

  const avgScore = legAnalyses.reduce((s, l) => s + gradeToScore(l.grade), 0) / legAnalyses.length;
  const weakLegPenalty = legAnalyses.filter(l => !l.shouldKeep).length * 0.5;
  const adjustedScore = Math.max(1, avgScore - weakLegPenalty);
  const overallGrade = scoreToGrade(adjustedScore);

  const { strategy: strategyDetected, match: strategyMatch } = detectStrategy(legs);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  const highGradeCount = legAnalyses.filter(l => gradeToScore(l.grade) >= 7).length;
  if (highGradeCount === legs.length) strengths.push("Every leg is graded B or higher — excellent ticket quality");
  else if (highGradeCount >= legs.length * 0.7) strengths.push(`${highGradeCount}/${legs.length} legs are B-grade or better`);

  const avgEv = legs.reduce((s, l) => s + (l.evPercent ?? 0), 0) / legs.length;
  if (avgEv > 3) strengths.push(`Strong positive expected value across the ticket (+${avgEv.toFixed(1)}%)`);
  else if (avgEv > 0) strengths.push(`Positive expected value (+${avgEv.toFixed(1)}% average)`);

  if (estimatedWinProb > 0.4 && legs.length >= 2) strengths.push(`High combined win probability (${(estimatedWinProb * 100).toFixed(0)}%)`);

  const avgConf = legs.reduce((s, l) => s + (l.confidence ?? 50), 0) / legs.length;
  if (avgConf > 65) strengths.push(`Strong average confidence across all legs (${avgConf.toFixed(0)}%)`);

  const weakCount = legAnalyses.filter(l => !l.shouldKeep).length;
  if (weakCount > 0) weaknesses.push(`${weakCount} leg${weakCount > 1 ? "s are" : " is"} dragging down the ticket quality`);
  if (avgEv < 0) weaknesses.push(`Negative expected value (${avgEv.toFixed(1)}%) — the odds are not in your favor`);
  if (estimatedWinProb < 0.1 && legs.length >= 4) weaknesses.push(`Very low combined win probability (${(estimatedWinProb * 100).toFixed(1)}%)`);
  if (legs.length > 7) weaknesses.push("Too many legs — each additional leg significantly reduces win probability");

  if (weakCount > 0) {
    const weakest = legAnalyses.filter(l => !l.shouldKeep).sort((a, b) => gradeToScore(a.grade) - gradeToScore(b.grade));
    suggestions.push(`Remove or replace: ${weakest[0].outcome} (${weakest[0].grade} grade, ${weakest[0].confidence}% confidence)`);
  }

  if (legs.length >= 6) {
    suggestions.push("Consider splitting into two smaller tickets — two 3-leg tickets have a better combined win rate than one 6-leg ticket");
  }

  if (avgConf < 50) {
    suggestions.push("Your average confidence is below 50%. Focus on higher-confidence picks from our A and B graded selections.");
  }

  const diversificationScore = getDiversificationScore(legs);
  if (diversificationScore < 30) {
    suggestions.push("Your ticket lacks diversification. Mix in picks from different sports or bet types.");
  }

  const correlationWarnings = getCorrelationWarnings(legs);

  let riskLevel: string;
  if (legs.length <= 2 && avgConf > 60) riskLevel = "Low";
  else if (legs.length <= 4 && avgConf > 50) riskLevel = "Medium";
  else if (legs.length <= 6) riskLevel = "High";
  else riskLevel = "Very High";

  let verdictType: TicketAnalysis["verdictType"];
  let verdict: string;
  if (adjustedScore >= 8) {
    verdictType = "excellent";
    verdict = "Outstanding ticket. Your picks are well-graded with strong data backing. This is exactly the kind of ticket our engines are designed to generate. Place with confidence.";
  } else if (adjustedScore >= 6.5) {
    verdictType = "good";
    verdict = "Solid ticket with good potential. Most of your picks are well-supported by our models. A few tweaks could push this into A-grade territory.";
  } else if (adjustedScore >= 5) {
    verdictType = "decent";
    verdict = "Decent ticket but there's room for improvement. Some legs are holding it back. Check our suggestions below to strengthen the weak spots.";
  } else if (adjustedScore >= 3.5) {
    verdictType = "weak";
    verdict = "This ticket needs work. Several picks are not well-supported by our data. We strongly recommend reviewing the weak legs and considering our replacement suggestions.";
  } else {
    verdictType = "poor";
    verdict = "We can't recommend this ticket in its current form. The data doesn't support these selections. Let us help — try our strategy templates above or use the Smart Generator for better picks.";
  }

  const bestReplacementPicks: ReplacementPick[] = [];
  const topPicks = allPicks
    .filter(p => p.grade.startsWith("A") || p.grade === "B+" || p.grade === "B")
    .filter(p => !legs.some(l => l.id === p.id))
    .sort((a, b) => (b.confidence + b.ev * 5) - (a.confidence + a.ev * 5))
    .slice(0, 5);

  for (const pick of topPicks) {
    const weakLeg = legAnalyses.find(la => !la.shouldKeep && la.market === pick.betType);
    bestReplacementPicks.push({
      pickId: pick.id,
      sport: pick.sport,
      game: pick.game,
      pick: pick.pick,
      betType: pick.betType,
      odds: pick.odds,
      grade: pick.grade,
      confidence: pick.confidence,
      ev: pick.ev,
      reasoning: pick.reasoning,
      replaces: weakLeg?.outcome,
      whyBetter: `Grade ${pick.grade} with ${pick.confidence}% confidence and ${pick.ev > 0 ? "+" : ""}${pick.ev.toFixed(1)}% EV`
    });
  }

  const partialAnalysis = {
    overallGrade,
    overallScore: adjustedScore,
    verdict,
    verdictType,
    strategyDetected,
    strategyMatch,
    riskLevel,
    combinedOdds,
    estimatedWinProb,
    expectedValue,
    legAnalyses,
    strengths,
    weaknesses,
    suggestions,
    correlationWarnings,
    diversificationScore,
    bestReplacementPicks
  };

  const maxTips = getMaximizationTips(legs, partialAnalysis);

  return { ...partialAnalysis, maxTips };
}

export async function getSmartSuggestions(currentLegs: AnalysisLeg[], strategy?: string): Promise<ReplacementPick[]> {
  let allPicks: PrecomputedPick[] = [];
  try {
    const sports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    for (const sport of sports) {
      const snapshot = getPrecomputedPredictions(sport);
      if (snapshot?.picks) allPicks.push(...snapshot.picks);
    }
  } catch {}

  const currentIds = new Set(currentLegs.map(l => l.id));
  let candidates = allPicks.filter(p => !currentIds.has(p.id) && p.confidence >= 50 && p.ev > 0);

  if (strategy) {
    const template = STRATEGY_TEMPLATES.find(t => t.id === strategy);
    if (template) {
      candidates = candidates.filter(p => template.idealBetTypes.includes(p.betType));
      if (template.riskLevel === "low") {
        candidates = candidates.filter(p => p.confidence >= 60);
      }
    }
  }

  return candidates
    .sort((a, b) => (b.confidence + b.ev * 5 + gradeToScore(b.grade) * 3) - (a.confidence + a.ev * 5 + gradeToScore(a.grade) * 3))
    .slice(0, 8)
    .map(pick => ({
      pickId: pick.id,
      sport: pick.sport,
      game: pick.game,
      pick: pick.pick,
      betType: pick.betType,
      odds: pick.odds,
      grade: pick.grade,
      confidence: pick.confidence,
      ev: pick.ev,
      reasoning: pick.reasoning,
      whyBetter: `${pick.grade} grade | ${pick.confidence}% confidence | +${pick.ev.toFixed(1)}% EV`
    }));
}

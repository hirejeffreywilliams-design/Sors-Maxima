import crypto from "crypto";
import { logInfo, logWarn } from "./errorLogger";
import { americanToDecimal } from "@shared/schema";
import {
  fetchRealPlayerProps,
  isOddsApiAvailable,
  getOddsForSportAsync,
  type RealPlayerProp,
} from "./odds-provider";
import { getInjuries } from "./espn-injury-provider";
import { getVenueWeather } from "./weather-provider";

export interface AnalyzedPropLeg {
  id: string;
  type: "player_prop" | "moneyline" | "spread" | "total";
  sport: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  description: string;
  selection: string;
  line?: number;
  americanOdds: number;
  decimalOdds: number;
  impliedProbability: number;
  modelProbability: number;
  edge: number;
  evRating: "strong" | "moderate" | "weak" | "negative";
  confidenceScore: number;
  confidenceGrade: "A" | "B" | "C" | "D" | "F";
  factors: {
    name: string;
    impact: number;
    detail: string;
  }[];
  playerName?: string;
  market?: string;
  marketLabel?: string;
  bookmaker?: string;
  bestOdds?: { bookmaker: string; odds: number };
  injuryImpact?: string;
  weatherImpact?: string;
  dataSource: string;
}

export interface ParlayRecommendation {
  id: string;
  name: string;
  legs: AnalyzedPropLeg[];
  totalOdds: number;
  totalAmericanOdds: number;
  impliedProbability: number;
  modelProbability: number;
  expectedValue: number;
  confidenceScore: number;
  confidenceGrade: "A" | "B" | "C" | "D" | "F";
  potentialPayout: number;
  correlations: {
    leg1Index: number;
    leg2Index: number;
    correlation: number;
    type: "positive" | "negative" | "neutral";
    explanation: string;
  }[];
  riskLevel: "conservative" | "moderate" | "aggressive";
  strategy: string;
}

export interface ParlayRequest {
  sports: string[];
  legCount: number;
  riskLevel: "conservative" | "moderate" | "aggressive";
  targetPayout?: number;
  includeProps: boolean;
  includeMoneylines: boolean;
  includeSpreads: boolean;
  includeTotals: boolean;
  stake?: number;
}

const CORRELATION_MAP: Record<string, Record<string, number>> = {
  "player_points|total_over": { correlation: 0.6, direction: 1 },
  "player_points|total_under": { correlation: 0.6, direction: -1 },
  "player_rebounds|total_over": { correlation: 0.3, direction: 1 },
  "player_assists|total_over": { correlation: 0.4, direction: 1 },
  "player_pass_yds|total_over": { correlation: 0.65, direction: 1 },
  "player_pass_tds|total_over": { correlation: 0.55, direction: 1 },
  "player_rush_yds|moneyline_fav": { correlation: 0.4, direction: 1 },
  "player_reception_yds|total_over": { correlation: 0.5, direction: 1 },
  "player_receptions|total_over": { correlation: 0.45, direction: 1 },
  "batter_hits|total_over": { correlation: 0.35, direction: 1 },
  "pitcher_strikeouts|total_under": { correlation: 0.3, direction: 1 },
  "player_anytime_td|total_over": { correlation: 0.5, direction: 1 },
  "player_threes|total_over": { correlation: 0.35, direction: 1 },
  "player_shots_on_goal|total_over": { correlation: 0.4, direction: 1 },
  "moneyline|spread_same": { correlation: 0.95, direction: 1 },
  "spread|total": { correlation: 0.1, direction: 0 },
};

function generateId(): string {
  return crypto.randomUUID() + Date.now().toString(36);
}

function calcEdge(modelProb: number, impliedProb: number): number {
  return modelProb > 0 ? (modelProb / impliedProb) - 1 : 0;
}

function gradeConfidence(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function evRatingFromEdge(edge: number): "strong" | "moderate" | "weak" | "negative" {
  if (edge > 0.08) return "strong";
  if (edge > 0.04) return "moderate";
  if (edge > 0.01) return "weak";
  return "negative";
}

function analyzePropLeg(prop: RealPlayerProp, side: "over" | "under", injuredPlayers: Map<string, string>, weatherImpacts: Map<string, string>): AnalyzedPropLeg {
  const odds = side === "over" ? prop.overOdds : prop.underOdds;
  const decimal = side === "over" ? prop.overDecimal : prop.underDecimal;
  const impliedProb = 1 / decimal;

  const factors: { name: string; impact: number; detail: string }[] = [];
  let modelProb = impliedProb;

  const bookCount = prop.allBookmakers.length;
  if (bookCount >= 3) {
    const bestOdds = side === "over" ? prop.bestOver.odds : prop.bestUnder.odds;
    const bestDecimal = americanToDecimal(bestOdds);
    const bestImplied = 1 / bestDecimal;
    const lineShopEdge = impliedProb - bestImplied;
    if (lineShopEdge > 0.02) {
      modelProb += lineShopEdge * 0.5;
      factors.push({ name: "Line Shopping", impact: lineShopEdge * 100, detail: `Best line at ${side === "over" ? prop.bestOver.bookmaker : prop.bestUnder.bookmaker} (${bestOdds > 0 ? "+" : ""}${bestOdds})` });
    }
    factors.push({ name: "Market Depth", impact: bookCount * 2, detail: `${bookCount} bookmakers offering this line` });
  }

  const overJuice = prop.overImpliedProb;
  const underJuice = prop.underImpliedProb;
  const totalJuice = overJuice + underJuice;
  const vig = totalJuice - 1;
  if (vig < 0.05) {
    modelProb += 0.01;
    factors.push({ name: "Low Vig", impact: 3, detail: `Only ${(vig * 100).toFixed(1)}% vig — sharp line` });
  }

  const normalizedOver = overJuice / totalJuice;
  const normalizedUnder = underJuice / totalJuice;
  const sideProb = side === "over" ? normalizedOver : normalizedUnder;
  if (sideProb < impliedProb) {
    const adjustment = (impliedProb - sideProb) * 0.3;
    modelProb += adjustment;
    factors.push({ name: "Vig-Adjusted Edge", impact: adjustment * 100, detail: `True probability ${(sideProb * 100).toFixed(1)}% vs implied ${(impliedProb * 100).toFixed(1)}%` });
  }

  const injuryKey = prop.playerName.toLowerCase();
  let injuryImpact: string | undefined;
  const injuredNames = Array.from(injuredPlayers.keys());
  for (const name of injuredNames) {
    if (name.includes(injuryKey) || injuryKey.includes(name)) {
      const status = injuredPlayers.get(name)!;
      injuryImpact = `${prop.playerName}: ${status}`;
      modelProb *= 0.7;
      factors.push({ name: "Injury Alert", impact: -15, detail: `Player listed as ${status}` });
      break;
    }
  }

  const teamKey = `${prop.homeTeam}|${prop.awayTeam}`;
  const weather = weatherImpacts.get(teamKey);
  let weatherImpactStr: string | undefined;
  if (weather && weather !== "none") {
    weatherImpactStr = weather;
    if (weather.includes("high") || weather.includes("extreme")) {
      const isOutdoor = !["NBA", "NCAAB", "NHL"].includes(prop.sportKey.toUpperCase());
      if (isOutdoor) {
        if (prop.market.includes("pass") || prop.market.includes("reception")) {
          modelProb *= 0.92;
          factors.push({ name: "Weather", impact: -5, detail: `${weather} — affects passing/receiving` });
        }
      }
    }
  }

  const edge = calcEdge(modelProb, impliedProb);
  const confidenceBase = Math.min(95, Math.max(20, 50 + edge * 200 + bookCount * 3));
  const confidenceScore = Math.round(confidenceBase);

  return {
    id: generateId(),
    type: "player_prop",
    sport: prop.sportKey,
    eventId: prop.eventId,
    homeTeam: prop.homeTeam,
    awayTeam: prop.awayTeam,
    commenceTime: prop.commenceTime,
    description: `${prop.playerName} ${prop.marketLabel}`,
    selection: `${side === "over" ? "Over" : "Under"} ${prop.line}`,
    line: prop.line,
    americanOdds: odds,
    decimalOdds: decimal,
    impliedProbability: impliedProb,
    modelProbability: Math.min(0.95, Math.max(0.05, modelProb)),
    edge,
    evRating: evRatingFromEdge(edge),
    confidenceScore,
    confidenceGrade: gradeConfidence(confidenceScore),
    factors,
    playerName: prop.playerName,
    market: prop.market,
    marketLabel: prop.marketLabel,
    bookmaker: prop.bookmaker,
    bestOdds: side === "over" ? prop.bestOver : prop.bestUnder,
    injuryImpact,
    weatherImpact: weatherImpactStr,
    dataSource: prop.dataSource,
  };
}

function analyzeGameLeg(
  type: "moneyline" | "spread" | "total",
  sport: string,
  eventId: string,
  homeTeam: string,
  awayTeam: string,
  startTime: string,
  description: string,
  selection: string,
  odds: number,
  line?: number,
  evAnalysis?: any
): AnalyzedPropLeg {
  const decimal = americanToDecimal(odds);
  const impliedProb = 1 / decimal;
  let modelProb = impliedProb;
  const factors: { name: string; impact: number; detail: string }[] = [];

  if (evAnalysis) {
    modelProb = evAnalysis.modelProbability || impliedProb;
    if (evAnalysis.edge > 0) {
      factors.push({ name: "Market EV", impact: evAnalysis.edge * 100, detail: `${evAnalysis.evRating} EV — ${(evAnalysis.edge * 100).toFixed(1)}% edge` });
    }
  }

  if (type === "moneyline" && odds < -200) {
    factors.push({ name: "Heavy Favorite", impact: 5, detail: `Strong implied probability ${(impliedProb * 100).toFixed(0)}%` });
  }

  if (type === "spread" && line !== undefined && Math.abs(line) <= 3) {
    factors.push({ name: "Key Number", impact: 3, detail: `Spread near key number ${line}` });
  }

  const edge = calcEdge(modelProb, impliedProb);
  const confidenceScore = Math.round(Math.min(95, Math.max(20, 50 + edge * 200)));

  return {
    id: generateId(),
    type,
    sport,
    eventId,
    homeTeam,
    awayTeam,
    commenceTime: startTime,
    description,
    selection,
    line,
    americanOdds: odds,
    decimalOdds: decimal,
    impliedProbability: impliedProb,
    modelProbability: Math.min(0.95, Math.max(0.05, modelProb)),
    edge,
    evRating: evRatingFromEdge(edge),
    confidenceScore,
    confidenceGrade: gradeConfidence(confidenceScore),
    factors,
    dataSource: evAnalysis ? "The Odds API (live)" : "ESPN-derived",
  };
}

function detectCorrelation(leg1: AnalyzedPropLeg, leg2: AnalyzedPropLeg): { correlation: number; type: "positive" | "negative" | "neutral"; explanation: string } | null {
  if (leg1.eventId === leg2.eventId) {
    if (leg1.type === "moneyline" && leg2.type === "spread") {
      return { correlation: 0.9, type: "negative", explanation: "ML and spread on same game are highly correlated — redundant" };
    }
    if (leg1.type === "player_prop" && leg2.type === "total") {
      const market = leg1.market || "";
      const totalSide = leg2.selection.toLowerCase().includes("over") ? "over" : "under";
      const propSide = leg1.selection.toLowerCase().includes("over") ? "over" : "under";
      const key = `${market}|total_${totalSide}`;
      const corr = CORRELATION_MAP[key];
      if (corr) {
        const sameDir = propSide === "over" && totalSide === "over";
        return {
          correlation: sameDir ? 0.5 : -0.3,
          type: sameDir ? "positive" : "negative",
          explanation: sameDir
            ? `${leg1.marketLabel} over correlates with game total over — good synergy`
            : `${leg1.marketLabel} ${propSide} and game total ${totalSide} can conflict`
        };
      }
    }
    if (leg1.type === "player_prop" && leg2.type === "player_prop") {
      const samePlayer = leg1.playerName === leg2.playerName;
      if (samePlayer) {
        return { correlation: 0.7, type: "positive", explanation: `Same player (${leg1.playerName}) — performances are correlated` };
      }
      const sameTeam = leg1.homeTeam === leg2.homeTeam || leg1.awayTeam === leg2.awayTeam;
      if (sameTeam) {
        return { correlation: 0.3, type: "positive", explanation: "Teammates' performances are moderately correlated" };
      }
    }
    if (leg1.type === "player_prop" && leg2.type === "moneyline") {
      const propSide = leg1.selection.toLowerCase().includes("over") ? "over" : "under";
      if (propSide === "over") {
        return { correlation: 0.3, type: "positive", explanation: `${leg1.playerName} over + team win often correlate` };
      }
    }
  }

  return null;
}

function buildParlayFromLegs(legs: AnalyzedPropLeg[], strategy: string, riskLevel: string, stake: number): ParlayRecommendation {
  const totalDecimalOdds = legs.reduce((acc, l) => acc * l.decimalOdds, 1);
  const impliedProb = 1 / totalDecimalOdds;
  const modelProb = legs.reduce((acc, l) => acc * l.modelProbability, 1);

  const correlations: ParlayRecommendation["correlations"] = [];
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const corr = detectCorrelation(legs[i], legs[j]);
      if (corr) {
        correlations.push({
          leg1Index: i,
          leg2Index: j,
          ...corr,
        });
      }
    }
  }

  let corrAdjustment = 0;
  for (const c of correlations) {
    if (c.type === "negative") corrAdjustment -= Math.abs(c.correlation) * 5;
    if (c.type === "positive") corrAdjustment += c.correlation * 2;
  }

  const avgConfidence = legs.reduce((s, l) => s + l.confidenceScore, 0) / legs.length;
  const finalConfidence = Math.round(Math.min(95, Math.max(10, avgConfidence + corrAdjustment)));
  const ev = (modelProb * totalDecimalOdds * stake) - stake;

  let americanOdds: number;
  if (totalDecimalOdds >= 2) {
    americanOdds = Math.round((totalDecimalOdds - 1) * 100);
  } else {
    americanOdds = Math.round(-100 / (totalDecimalOdds - 1));
  }

  return {
    id: generateId(),
    name: strategy,
    legs,
    totalOdds: totalDecimalOdds,
    totalAmericanOdds: americanOdds,
    impliedProbability: impliedProb,
    modelProbability: modelProb,
    expectedValue: ev,
    confidenceScore: finalConfidence,
    confidenceGrade: gradeConfidence(finalConfidence),
    potentialPayout: Math.round(stake * totalDecimalOdds * 100) / 100,
    correlations,
    riskLevel: riskLevel as any,
    strategy,
  };
}

export async function generatePropParlays(request: ParlayRequest): Promise<ParlayRecommendation[]> {
  const { sports, legCount, riskLevel, stake = 10, includeProps, includeMoneylines, includeSpreads, includeTotals } = request;

  const allLegs: AnalyzedPropLeg[] = [];
  const injuredPlayers = new Map<string, string>();
  const weatherImpacts = new Map<string, string>();

  for (const sport of sports) {
    try {
      const injuryReports = await getInjuries(sport.toUpperCase());
      if (injuryReports && Array.isArray(injuryReports)) {
        for (const report of injuryReports) {
          for (const inj of report.injuries) {
            injuredPlayers.set(inj.playerName.toLowerCase(), inj.status);
          }
        }
      }
    } catch (e) {}

    if (includeProps) {
      try {
        const realProps = await fetchRealPlayerProps(sport, 5);
        for (const prop of realProps) {
          const overLeg = analyzePropLeg(prop, "over", injuredPlayers, weatherImpacts);
          const underLeg = analyzePropLeg(prop, "under", injuredPlayers, weatherImpacts);
          allLegs.push(overLeg, underLeg);
        }
      } catch (e) {
        logWarn(`Failed to fetch real props for ${sport}: ${e}`);
      }
    }

    if (includeMoneylines || includeSpreads || includeTotals) {
      try {
        const events = await getOddsForSportAsync(sport as any);
        for (const event of events.slice(0, 8)) {
          for (const market of event.markets) {
            if (market.type === "moneyline" && includeMoneylines) {
              for (const outcome of market.outcomes) {
                allLegs.push(analyzeGameLeg(
                  "moneyline", sport, event.id, event.homeTeam, event.awayTeam,
                  event.startTime, `${outcome.name}`, outcome.name,
                  outcome.americanOdds, undefined, outcome.evAnalysis
                ));
              }
            }
            if (market.type === "spread" && includeSpreads) {
              for (const outcome of market.outcomes) {
                allLegs.push(analyzeGameLeg(
                  "spread", sport, event.id, event.homeTeam, event.awayTeam,
                  event.startTime, `${outcome.name}`, outcome.name,
                  outcome.americanOdds, outcome.line, outcome.evAnalysis
                ));
              }
            }
            if (market.type === "total" && includeTotals) {
              for (const outcome of market.outcomes) {
                allLegs.push(analyzeGameLeg(
                  "total", sport, event.id, event.homeTeam, event.awayTeam,
                  event.startTime, `${outcome.name}`, outcome.name,
                  outcome.americanOdds, outcome.line, outcome.evAnalysis
                ));
              }
            }
          }
        }
      } catch (e) {
        logWarn(`Failed to fetch game odds for ${sport}: ${e}`);
      }
    }
  }

  if (allLegs.length === 0) {
    return [];
  }

  const positiveEVLegs = allLegs
    .filter(l => l.edge > -0.02)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  const propLegs = positiveEVLegs.filter(l => l.type === "player_prop");
  const gameLegs = positiveEVLegs.filter(l => l.type !== "player_prop");

  const parlays: ParlayRecommendation[] = [];

  const confidenceThreshold = riskLevel === "conservative" ? 55 : riskLevel === "moderate" ? 40 : 25;
  const maxOddsPerLeg = riskLevel === "conservative" ? 2.0 : riskLevel === "moderate" ? 3.0 : 5.0;

  if (propLegs.length >= legCount) {
    const bestProps = propLegs
      .filter(l => l.confidenceScore >= confidenceThreshold && l.decimalOdds <= maxOddsPerLeg)
      .slice(0, legCount * 3);

    const selectedLegs = selectDiverseLegs(bestProps, legCount);
    if (selectedLegs.length >= Math.min(legCount, 2)) {
      parlays.push(buildParlayFromLegs(selectedLegs, "Prop Hunter", riskLevel, stake));
    }
  }

  if (includeProps && (includeMoneylines || includeSpreads || includeTotals)) {
    const propCount = Math.ceil(legCount / 2);
    const gameCount = legCount - propCount;

    const mixedProps = propLegs
      .filter(l => l.confidenceScore >= confidenceThreshold && l.decimalOdds <= maxOddsPerLeg)
      .slice(0, propCount * 2);
    const mixedGames = gameLegs
      .filter(l => l.confidenceScore >= confidenceThreshold && l.decimalOdds <= maxOddsPerLeg)
      .slice(0, gameCount * 2);

    const selectedProps = selectDiverseLegs(mixedProps, propCount);
    const selectedGames = selectDiverseLegs(mixedGames, gameCount);
    const mixedLegs = [...selectedProps, ...selectedGames];

    if (mixedLegs.length >= Math.min(legCount, 2)) {
      parlays.push(buildParlayFromLegs(mixedLegs, "Balanced Attack", riskLevel, stake));
    }
  }

  if (gameLegs.length >= legCount) {
    const bestGames = gameLegs
      .filter(l => l.confidenceScore >= confidenceThreshold && l.decimalOdds <= maxOddsPerLeg)
      .slice(0, legCount * 3);

    const selectedLegs = selectDiverseLegs(bestGames, legCount);
    if (selectedLegs.length >= Math.min(legCount, 2)) {
      parlays.push(buildParlayFromLegs(selectedLegs, "Game Master", riskLevel, stake));
    }
  }

  const highEVLegs = positiveEVLegs
    .filter(l => l.edge > 0.03)
    .sort((a, b) => b.edge - a.edge)
    .slice(0, legCount * 3);

  if (highEVLegs.length >= Math.min(legCount, 2)) {
    const selectedLegs = selectDiverseLegs(highEVLegs, legCount);
    if (selectedLegs.length >= 2) {
      parlays.push(buildParlayFromLegs(selectedLegs, "Value Play", riskLevel, stake));
    }
  }

  if (riskLevel === "aggressive") {
    const longshots = positiveEVLegs
      .filter(l => l.decimalOdds >= 2.5 && l.edge > -0.05)
      .sort((a, b) => b.decimalOdds - a.decimalOdds)
      .slice(0, legCount * 2);

    if (longshots.length >= Math.min(legCount, 2)) {
      const selectedLegs = selectDiverseLegs(longshots, legCount);
      if (selectedLegs.length >= 2) {
        parlays.push(buildParlayFromLegs(selectedLegs, "Longshot Special", riskLevel, stake));
      }
    }
  }

  parlays.sort((a, b) => b.confidenceScore - a.confidenceScore);

  logInfo(`[PropParlay] Generated ${parlays.length} parlay recommendations from ${allLegs.length} candidate legs`);
  return parlays.slice(0, 5);
}

function selectDiverseLegs(candidates: AnalyzedPropLeg[], count: number): AnalyzedPropLeg[] {
  if (candidates.length <= count) return candidates;

  const selected: AnalyzedPropLeg[] = [];
  const usedEvents = new Set<string>();
  const usedPlayers = new Set<string>();

  for (const leg of candidates) {
    if (selected.length >= count) break;

    if (usedEvents.has(leg.eventId) && selected.length < count - 1) {
      const sameEventCount = selected.filter(s => s.eventId === leg.eventId).length;
      if (sameEventCount >= 2) continue;
    }

    if (leg.playerName && usedPlayers.has(leg.playerName)) continue;

    selected.push(leg);
    usedEvents.add(leg.eventId);
    if (leg.playerName) usedPlayers.add(leg.playerName);
  }

  if (selected.length < count) {
    for (const leg of candidates) {
      if (selected.length >= count) break;
      if (!selected.includes(leg)) {
        selected.push(leg);
      }
    }
  }

  return selected.slice(0, count);
}

export async function getAvailableLegs(sport: string): Promise<{
  props: AnalyzedPropLeg[];
  moneylines: AnalyzedPropLeg[];
  spreads: AnalyzedPropLeg[];
  totals: AnalyzedPropLeg[];
  totalCount: number;
  dataSource: string;
}> {
  const injuredPlayers = new Map<string, string>();
  const weatherImpacts = new Map<string, string>();

  try {
    const injuryReports = await getInjuries(sport.toUpperCase());
    if (injuryReports && Array.isArray(injuryReports)) {
      for (const report of injuryReports) {
        for (const inj of report.injuries) {
          injuredPlayers.set(inj.playerName.toLowerCase(), inj.status);
        }
      }
    }
  } catch (e) {}

  const props: AnalyzedPropLeg[] = [];
  const moneylines: AnalyzedPropLeg[] = [];
  const spreads: AnalyzedPropLeg[] = [];
  const totals: AnalyzedPropLeg[] = [];

  try {
    const realProps = await fetchRealPlayerProps(sport, 5);
    for (const prop of realProps) {
      props.push(analyzePropLeg(prop, "over", injuredPlayers, weatherImpacts));
      props.push(analyzePropLeg(prop, "under", injuredPlayers, weatherImpacts));
    }
  } catch (e) {}

  try {
    const events = await getOddsForSportAsync(sport as any);
    for (const event of events.slice(0, 8)) {
      for (const market of event.markets) {
        if (market.type === "moneyline") {
          for (const o of market.outcomes) {
            moneylines.push(analyzeGameLeg("moneyline", sport, event.id, event.homeTeam, event.awayTeam, event.startTime, o.name, o.name, o.americanOdds, undefined, o.evAnalysis));
          }
        }
        if (market.type === "spread") {
          for (const o of market.outcomes) {
            spreads.push(analyzeGameLeg("spread", sport, event.id, event.homeTeam, event.awayTeam, event.startTime, o.name, o.name, o.americanOdds, o.line, o.evAnalysis));
          }
        }
        if (market.type === "total") {
          for (const o of market.outcomes) {
            totals.push(analyzeGameLeg("total", sport, event.id, event.homeTeam, event.awayTeam, event.startTime, o.name, o.name, o.americanOdds, o.line, o.evAnalysis));
          }
        }
      }
    }
  } catch (e) {}

  const hasRealProps = props.some(p => p.dataSource.includes("Odds API"));
  const hasRealOdds = moneylines.some(m => m.dataSource.includes("Odds API"));

  return {
    props: props.sort((a, b) => b.confidenceScore - a.confidenceScore),
    moneylines: moneylines.sort((a, b) => b.confidenceScore - a.confidenceScore),
    spreads: spreads.sort((a, b) => b.confidenceScore - a.confidenceScore),
    totals: totals.sort((a, b) => b.confidenceScore - a.confidenceScore),
    totalCount: props.length + moneylines.length + spreads.length + totals.length,
    dataSource: hasRealProps || hasRealOdds ? "The Odds API (live)" : "ESPN-derived",
  };
}

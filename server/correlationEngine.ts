interface SlipLeg {
  id: string;
  game?: string;
  team?: string;
  opponent?: string;
  outcome?: string;
  market?: string;
  betType?: string;
  sport?: string;
  americanOdds?: number;
  decimalOdds?: number;
  evPercent?: number;
  confidence?: number;
  grade?: string;
  edge?: number;
  [key: string]: unknown;
}
type ParlaySlipLeg = SlipLeg;

export interface CorrelationAnalysis {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  color: "green" | "yellow" | "red";
  warnings: string[];
  suggestions: string[];
  sameGameGroups: { game: string; count: number; verdict: "correlated" | "conflict" | "ok" }[];
  sportConcentration: { sport: string; count: number; pct: number }[];
  averageGrade: string;
  averageEV: number;
  averageConfidence: number;
  riskyLegIds: string[];
  legCount: number;
}

const GRADE_ORDER: Record<string, number> = {
  "A+": 7, "A": 6, "A-": 5, "B+": 4, "B": 3, "B-": 2, "C+": 1, "C": 0, "C-": -1, "D": -2, "F": -3,
};

function gradeAverage(grades: string[]): string {
  if (!grades.length) return "N/A";
  const avg = grades.reduce((sum, g) => sum + (GRADE_ORDER[g] ?? 0), 0) / grades.length;
  if (avg >= 6.5) return "A+";
  if (avg >= 5.5) return "A";
  if (avg >= 4.5) return "A-";
  if (avg >= 3.5) return "B+";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "B-";
  if (avg >= 0.5) return "C+";
  if (avg >= -0.5) return "C";
  return "C-";
}

export function analyzeSlip(legs: ParlaySlipLeg[]): CorrelationAnalysis {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const riskyLegIds: string[] = [];
  let score = 100;

  if (!legs.length) {
    return {
      score: 0, grade: "F", label: "Empty Slip", color: "red",
      warnings: [], suggestions: ["Add at least 2 legs to analyze correlation."],
      sameGameGroups: [], sportConcentration: [],
      averageGrade: "N/A", averageEV: 0, averageConfidence: 0,
      riskyLegIds: [], legCount: 0,
    };
  }

  const averageEV = legs.reduce((sum, l) => sum + (l.evPercent ?? 0), 0) / legs.length;
  const averageConfidence = legs.reduce((sum, l) => sum + (l.confidence ?? 50), 0) / legs.length;
  const avgGrade = gradeAverage(legs.map(l => l.grade ?? "B").filter(Boolean));

  // ── Same-game detection ────────────────────────────────────────────────────
  const gameMap = new Map<string, ParlaySlipLeg[]>();
  for (const leg of legs) {
    if (!leg.game) continue;
    const key = leg.game.toLowerCase().trim();
    if (!gameMap.has(key)) gameMap.set(key, []);
    gameMap.get(key)!.push(leg);
  }

  const sameGameGroups: CorrelationAnalysis["sameGameGroups"] = [];
  for (const [game, group] of gameMap.entries()) {
    if (group.length < 2) continue;
    const displayGame = group[0].game || game;
    const markets = group.map(l => l.market ?? "");
    const hasBothSides = markets.some(m => m === "moneyline") && markets.some(m => m === "spread");
    const hasConflict = (() => {
      const outcomes = group.map(l => (l.outcome || "").toLowerCase());
      const homeTeam = group[0].team?.toLowerCase() || "";
      const picksSameTeam = outcomes.every(o => o.includes(homeTeam));
      return !picksSameTeam && group.length >= 2;
    })();

    if (hasConflict) {
      sameGameGroups.push({ game: displayGame, count: group.length, verdict: "conflict" });
      score -= 20;
      warnings.push(`Potential conflict in ${displayGame} — two legs may work against each other.`);
      group.forEach(l => riskyLegIds.push(l.id));
    } else if (hasBothSides) {
      sameGameGroups.push({ game: displayGame, count: group.length, verdict: "correlated" });
      warnings.push(`${displayGame} has correlated legs (ML + spread). A win amplifies both — but so does a loss.`);
      score -= 5;
    } else {
      sameGameGroups.push({ game: displayGame, count: group.length, verdict: "ok" });
    }
  }

  // ── Sport concentration ────────────────────────────────────────────────────
  const sportMap = new Map<string, number>();
  for (const leg of legs) {
    if (!leg.sport) continue;
    sportMap.set(leg.sport, (sportMap.get(leg.sport) ?? 0) + 1);
  }
  const sportConcentration = [...sportMap.entries()]
    .map(([sport, count]) => ({ sport, count, pct: Math.round((count / legs.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  const maxConcentration = sportConcentration[0];
  if (maxConcentration && maxConcentration.pct > 60 && legs.length >= 3) {
    score -= 10;
    warnings.push(`${maxConcentration.pct}% of your legs are ${maxConcentration.sport} — consider adding variety to reduce correlated loss risk.`);
    suggestions.push(`Swap 1 ${maxConcentration.sport} leg for a pick from a different sport.`);
  }

  // ── Grade quality ──────────────────────────────────────────────────────────
  const lowGradeLegs = legs.filter(l => {
    const g = l.grade ?? "B";
    return (GRADE_ORDER[g] ?? 3) < 2; // Below B-
  });
  if (lowGradeLegs.length > 0) {
    score -= lowGradeLegs.length * 8;
    lowGradeLegs.forEach(l => riskyLegIds.push(l.id));
    warnings.push(`${lowGradeLegs.length} leg${lowGradeLegs.length > 1 ? "s" : ""} below B- grade — weakest links in the chain.`);
    suggestions.push(`Replace low-grade legs with A or B rated picks for a stronger ticket.`);
  }

  // ── EV check ──────────────────────────────────────────────────────────────
  const negEvLegs = legs.filter(l => (l.evPercent ?? 0) < 0);
  if (negEvLegs.length > 0) {
    score -= negEvLegs.length * 5;
    negEvLegs.forEach(l => { if (!riskyLegIds.includes(l.id)) riskyLegIds.push(l.id); });
    warnings.push(`${negEvLegs.length} leg${negEvLegs.length > 1 ? "s" : ""} with negative expected value — mathematically working against you.`);
    suggestions.push(`Swap negative-EV legs for picks with at least +1% EV to tilt the edge in your favor.`);
  }

  // ── Parlay length check ────────────────────────────────────────────────────
  if (legs.length > 8) {
    score -= 10;
    warnings.push(`${legs.length}-leg parlay is high risk — each additional leg compounds the difficulty.`);
    suggestions.push(`Consider splitting into two smaller parlays of 4–5 legs to improve hit probability.`);
  }

  // ── Positive suggestions if clean ─────────────────────────────────────────
  if (warnings.length === 0 && legs.length >= 2) {
    suggestions.push(`Solid ticket — no correlation conflicts detected. Multi-sport spread gives good independence.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: CorrelationAnalysis["grade"];
  let label: string;
  let color: CorrelationAnalysis["color"];
  if (score >= 85) { grade = "A"; label = "Strong Ticket"; color = "green"; }
  else if (score >= 70) { grade = "B"; label = "Good Ticket"; color = "green"; }
  else if (score >= 55) { grade = "C"; label = "Review Advised"; color = "yellow"; }
  else if (score >= 35) { grade = "D"; label = "High Risk"; color = "red"; }
  else { grade = "F"; label = "Conflict Detected"; color = "red"; }

  return {
    score, grade, label, color,
    warnings, suggestions,
    sameGameGroups, sportConcentration,
    averageGrade: avgGrade,
    averageEV: Math.round(averageEV * 10) / 10,
    averageConfidence: Math.round(averageConfidence),
    riskyLegIds: [...new Set(riskyLegIds)],
    legCount: legs.length,
  };
}

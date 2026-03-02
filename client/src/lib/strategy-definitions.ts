export interface StrategyViolation {
  reason: string;
  severity: "warn" | "strong";
}

export interface StrategyCheckLeg {
  market?: string;
  americanOdds?: number;
  odds?: number;
  evPercent?: number;
  confidence?: number;
  grade?: string;
}

export interface BettingStrategy {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  rules: string[];
  check: (leg: StrategyCheckLeg, slipLength: number) => StrategyViolation | null;
}

function getOdds(leg: StrategyCheckLeg): number {
  return leg.americanOdds ?? leg.odds ?? -110;
}

function gradeRank(grade?: string): number {
  const map: Record<string, number> = { "A+": 6, "A": 5, "A-": 4, "B+": 3, "B": 2, "B-": 1, "C+": 0, "C": -1, "D": -2 };
  return grade ? (map[grade] ?? -3) : -3;
}

export const BETTING_STRATEGIES: BettingStrategy[] = [
  {
    id: "value_hunter",
    name: "Value Hunter",
    tagline: "EV+ picks only",
    description: "Only takes bets where the model finds positive expected value above 5%. Ignores picks that don't pay more than what the risk warrants.",
    icon: "🎯",
    color: "text-emerald-500",
    rules: ["EV must be +5% or higher", "Skips zero-edge or negative EV plays"],
    check: (leg) => {
      const ev = leg.evPercent ?? 0;
      if (ev < 5) return { reason: `EV is only ${ev > 0 ? "+" : ""}${ev.toFixed(1)}% — your strategy requires +5% or higher`, severity: "strong" };
      return null;
    },
  },
  {
    id: "grade_a_only",
    name: "Grade A Only",
    tagline: "A-grade picks exclusively",
    description: "Plays only picks graded A-, A, or A+ by the model. Cuts out B and C-tier picks that lower long-term win rate.",
    icon: "🏆",
    color: "text-yellow-500",
    rules: ["Grade must be A-, A, or A+", "B+ and below are skipped"],
    check: (leg) => {
      if (gradeRank(leg.grade) < 4) return { reason: `Grade ${leg.grade || "unknown"} doesn't meet your A-grade standard`, severity: "strong" };
      return null;
    },
  },
  {
    id: "favorites_only",
    name: "Favorites Only",
    tagline: "Bet only on favorites",
    description: "Sticks to teams/sides priced as favorites. Avoids underdogs and pick'ems to build consistent smaller wins.",
    icon: "⭐",
    color: "text-blue-500",
    rules: ["Odds must be -110 or shorter (more negative)", "No underdogs or pick'ems"],
    check: (leg) => {
      const o = getOdds(leg);
      if (o > -110) return { reason: `Odds of ${o > 0 ? "+" : ""}${o} — your strategy only allows favorites (-110 or shorter)`, severity: "strong" };
      return null;
    },
  },
  {
    id: "underdog_specialist",
    name: "Underdog Specialist",
    tagline: "Only plus-money plays",
    description: "Exclusively targets underdogs at +100 or better. Built for bettors who want explosive upside and are comfortable with lower hit rates.",
    icon: "🐶",
    color: "text-purple-500",
    rules: ["Odds must be +100 or longer (positive)", "No favorites allowed"],
    check: (leg) => {
      const o = getOdds(leg);
      if (o < 100) return { reason: `Odds of ${o > 0 ? "+" : ""}${o} — your strategy only allows underdogs (+100 or longer)`, severity: "strong" };
      return null;
    },
  },
  {
    id: "conservative_edge",
    name: "Conservative Edge",
    tagline: "High-confidence, safe odds",
    description: "Only takes high-confidence picks in a safe odds range. Designed for steady, disciplined bettors who grow their bankroll slowly and safely.",
    icon: "🛡️",
    color: "text-sky-500",
    rules: ["Confidence must be 68% or higher", "Odds between -250 and +150"],
    check: (leg) => {
      const o = getOdds(leg);
      const conf = leg.confidence ?? 0;
      if (conf < 68) return { reason: `Confidence is ${conf}% — your strategy requires 68%+`, severity: "strong" };
      if (o < -250) return { reason: `Odds of ${o} are too heavy — max -250 for your strategy`, severity: "warn" };
      if (o > 150) return { reason: `Odds of +${o} are too risky — max +150 for your strategy`, severity: "warn" };
      return null;
    },
  },
  {
    id: "spread_specialist",
    name: "Spread Specialist",
    tagline: "Spread bets only",
    description: "Lives and dies by the spread. Avoids moneylines, totals, and props to focus on the most researched and predictable bet type.",
    icon: "📏",
    color: "text-orange-500",
    rules: ["Only spread bets accepted", "No moneylines, totals, or props"],
    check: (leg) => {
      const m = leg.market ?? "";
      if (!m.includes("spread") && m !== "spread") return { reason: `Market "${m}" — your strategy only takes spread bets`, severity: "strong" };
      return null;
    },
  },
  {
    id: "totals_mastery",
    name: "Totals Mastery",
    tagline: "Overs & unders only",
    description: "Focuses entirely on game totals and team totals. Avoids betting on which team wins to reduce bias and focus on pace and scoring patterns.",
    icon: "📊",
    color: "text-indigo-500",
    rules: ["Only total and team total bets", "No moneylines or spreads"],
    check: (leg) => {
      const m = leg.market ?? "";
      if (!m.includes("total")) return { reason: `Market "${m}" — your strategy only takes totals (over/under)`, severity: "strong" };
      return null;
    },
  },
  {
    id: "sharp_lines",
    name: "Sharp Lines",
    tagline: "Only model-certified picks",
    description: "Only plays picks the model rates at 72%+ confidence. A disciplined approach that waits for the clearest edges instead of forcing action.",
    icon: "⚡",
    color: "text-red-500",
    rules: ["Confidence must be 72% or higher", "Lower-confidence plays are skipped"],
    check: (leg) => {
      const conf = leg.confidence ?? 0;
      if (conf < 72) return { reason: `Confidence is ${conf}% — your strategy only takes 72%+ rated picks`, severity: "strong" };
      return null;
    },
  },
  {
    id: "max_3_legs",
    name: "3-Leg Max",
    tagline: "Parlays capped at 3 legs",
    description: "Never builds a parlay with more than 3 legs. Keeps payout odds realistic and win rate significantly higher than long-shot parlays.",
    icon: "3️⃣",
    color: "text-teal-500",
    rules: ["Maximum 3 legs per parlay", "No 4+ leg parlays allowed"],
    check: (_leg, slipLength) => {
      if (slipLength >= 3) return { reason: `Your parlay already has ${slipLength} leg${slipLength > 1 ? "s" : ""} — your strategy caps at 3`, severity: "strong" };
      return null;
    },
  },
];

export function getStrategy(id: string): BettingStrategy | undefined {
  return BETTING_STRATEGIES.find(s => s.id === id);
}

export function checkPickAgainstStrategy(
  strategy: BettingStrategy | null | undefined,
  leg: StrategyCheckLeg,
  currentSlipLength: number
): StrategyViolation | null {
  if (!strategy) return null;
  return strategy.check(leg, currentSlipLength);
}

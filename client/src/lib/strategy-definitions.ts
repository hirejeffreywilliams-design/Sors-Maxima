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
  sport?: string;
  sharpMoneyPct?: number;
  publicMoneyPct?: number;
  reverseLineMove?: boolean;
  steamMove?: boolean;
}

export interface BettingStrategy {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  rules: string[];
  tier?: "free" | "edge" | "max";
  sportFilter?: string;
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
  {
    id: "vegas_prediction",
    name: "Vegas Prediction™",
    tagline: "Bet like the house bets",
    description: "Mirrors exactly how Las Vegas sportsbooks position themselves against the betting public. Books consistently profit by taking the side that's light on public action — especially when the line moves against the crowd (Reverse Line Movement). When 65%+ of bets are on one team but the line moves the other way, sharp professional money is driving it. That's the Vegas tell. This strategy only accepts picks confirmed by sharp money flow, reverse line movement, or a strong model edge over the market.",
    icon: "🎰",
    color: "text-amber-500",
    tier: "edge",
    rules: [
      "Sharp money % must be ≥55% — OR — reverse line movement detected — OR — steam move confirmed",
      "When sharp data unavailable: EV ≥5% AND confidence ≥62% (model's edge over market serves as proxy)",
      "Flags picks where 70%+ public money is stacked without sharp backing",
      "Max odds +250 — Vegas doesn't take uncapped long shots without purpose",
    ],
    check: (leg) => {
      const ev = leg.evPercent ?? 0;
      const conf = leg.confidence ?? 0;
      const sharp = leg.sharpMoneyPct;
      const pub = leg.publicMoneyPct;
      const rlm = leg.reverseLineMove ?? false;
      const steam = leg.steamMove ?? false;
      const o = getOdds(leg);

      if (o > 250) {
        return { reason: `Odds of +${o} — Vegas Prediction caps at +250 (books don't chase uncapped long shots)`, severity: "warn" };
      }

      if (sharp !== undefined && pub !== undefined) {
        if (pub > 70 && sharp < 45 && !rlm && !steam) {
          return {
            reason: `${pub}% public money on this side with only ${sharp}% sharp backing — Vegas would fade this crowd favorite`,
            severity: "strong",
          };
        }
        if (sharp >= 55 || rlm || steam) return null;
        if (pub > 65 && !rlm) {
          return {
            reason: `Heavy public action (${pub}%) without sharp confirmation — not a Vegas-style play`,
            severity: "warn",
          };
        }
        return null;
      }

      if (rlm || steam) return null;

      if (ev < 5) {
        return {
          reason: `EV ${ev > 0 ? "+" : ""}${ev.toFixed(1)}% is below the 5% threshold — Vegas Prediction needs a real model edge over the market`,
          severity: "strong",
        };
      }
      if (conf < 62) {
        return {
          reason: `Confidence ${conf}% is below 62% — Vegas Prediction requires the model to strongly favor this side`,
          severity: "warn",
        };
      }

      return null;
    },
  },
  {
    id: "public_fade",
    name: "Public Fade™",
    tagline: "Bet against the crowd, every time",
    description: "The purest form of contrarian betting. The public loses long-term because books set lines to exploit popular bias — favorites, primetime teams, and big-market clubs get inflated. This strategy only takes picks where the public is on the other side, or where the model finds a meaningful edge that the crowd is missing.",
    icon: "🔄",
    color: "text-rose-500",
    tier: "edge",
    rules: [
      "Public money % must be ≤40% on this pick — OR — reverse line movement detected",
      "When public data unavailable: EV ≥7% required (market is undervaluing this side)",
      "Automatically blocks any pick where 65%+ of public bets are on the same side as you",
    ],
    check: (leg) => {
      const ev = leg.evPercent ?? 0;
      const pub = leg.publicMoneyPct;
      const rlm = leg.reverseLineMove ?? false;

      if (rlm) return null;

      if (pub !== undefined) {
        if (pub > 65) {
          return {
            reason: `${pub}% of bets are on this side — Public Fade strategy only plays the side the public is NOT piling onto`,
            severity: "strong",
          };
        }
        if (pub <= 40) return null;
        return {
          reason: `${pub}% public money on this side — ideally ≤40% for a true contrarian play`,
          severity: "warn",
        };
      }

      if (ev < 7) {
        return {
          reason: `EV ${ev > 0 ? "+" : ""}${ev.toFixed(1)}% — Public Fade needs ≥7% edge when public data isn't available (model must clearly see something the crowd doesn't)`,
          severity: "strong",
        };
      }

      return null;
    },
  },
  {
    id: "nba_back_to_back",
    name: "NBA Back-to-Back Fade",
    tagline: "Target tired legs in the NBA",
    description: "Systematically fades teams playing their second game in two nights when the model identifies a clear spread edge.",
    icon: "🏀",
    color: "text-orange-500",
    sportFilter: "NBA",
    rules: ["NBA games only", "Spread bets only", "Confidence 55% or higher"],
    check: (leg) => {
      if (leg.sport !== "NBA") return { reason: "NBA Back-to-Back strategy is only for NBA games", severity: "strong" };
      const m = leg.market ?? "";
      if (!m.includes("spread") && m !== "spread") return { reason: "Strategy only applies to spread bets", severity: "strong" };
      const conf = leg.confidence ?? 0;
      if (conf < 55) return { reason: `Confidence ${conf}% is below the 55% threshold`, severity: "strong" };
      return null;
    },
  },
  {
    id: "nfl_situational",
    name: "NFL Situational Spots",
    tagline: "High-value NFL edges",
    description: "Focuses on NFL games with significant situational edges, requiring both high confidence and positive expected value.",
    icon: "🏈",
    color: "text-blue-600",
    sportFilter: "NFL",
    rules: ["NFL games only", "Confidence 60% or higher", "EV 3% or higher"],
    check: (leg) => {
      if (leg.sport !== "NFL") return { reason: "NFL Situational strategy is only for NFL games", severity: "strong" };
      const conf = leg.confidence ?? 0;
      const ev = leg.evPercent ?? 0;
      if (conf < 60) return { reason: `Confidence ${conf}% is below the 60% threshold`, severity: "strong" };
      if (ev < 3) return { reason: `EV ${ev}% is below the 3% threshold`, severity: "strong" };
      return null;
    },
  },
  {
    id: "nhl_goalie_edge",
    name: "NHL Goaltender Edge",
    tagline: "Target goalie mismatches",
    description: "Capitalizes on confirmed goaltender mismatches where the model finds a strong edge on the moneyline or puck line.",
    icon: "🏒",
    color: "text-cyan-500",
    sportFilter: "NHL",
    rules: ["NHL games only", "Moneyline or Spread only", "Confidence 62% or higher"],
    check: (leg) => {
      if (leg.sport !== "NHL") return { reason: "NHL Goaltender Edge is only for NHL games", severity: "strong" };
      const m = (leg.market ?? "").toLowerCase();
      const isML = m.includes("moneyline") || m === "ml";
      const isSpread = m.includes("spread") || m.includes("puck line");
      if (!isML && !isSpread) return { reason: "Strategy only applies to Moneyline or Spread/Puck Line", severity: "strong" };
      const conf = leg.confidence ?? 0;
      if (conf < 62) return { reason: `Confidence ${conf}% is below the 62% threshold`, severity: "strong" };
      return null;
    },
  },
  {
    id: "mlb_pitcher_duel",
    name: "MLB Pitcher Duel",
    tagline: "Low-scoring pitching battles",
    description: "Targets games with elite starting pitching matchups, focusing on unders and moneyline value.",
    icon: "⚾",
    color: "text-red-600",
    sportFilter: "MLB",
    rules: ["MLB games only", "Confidence 60% or higher", "Targets totals under or moneylines"],
    check: (leg) => {
      if (leg.sport !== "MLB") return { reason: "MLB Pitcher Duel is only for MLB games", severity: "strong" };
      const conf = leg.confidence ?? 0;
      if (conf < 60) return { reason: `Confidence ${conf}% is below the 60% threshold`, severity: "strong" };
      return null;
    },
  },
  {
    id: "ncaab_home_court",
    name: "NCAAB Home Court",
    tagline: "NCAA Home Favorites/Dogs",
    description: "Leverages home court advantage data in college basketball to identify undervalued spread opportunities.",
    icon: "🏀",
    color: "text-purple-700",
    tier: "edge",
    sportFilter: "NCAAB",
    rules: ["NCAAB games only", "Spread bets only", "Confidence 65% or higher"],
    check: (leg) => {
      if (leg.sport !== "NCAAB") return { reason: "NCAAB Home Court strategy is only for college basketball", severity: "strong" };
      const m = leg.market ?? "";
      if (!m.includes("spread") && m !== "spread") return { reason: "Strategy only applies to spread bets", severity: "strong" };
      const conf = leg.confidence ?? 0;
      if (conf < 65) return { reason: `Confidence ${conf}% is below the 65% threshold`, severity: "strong" };
      return null;
    },
  },
];

export function getStrategy(id: string): BettingStrategy | undefined {
  const lookupId = id === "vegas_signal" ? "vegas_prediction" : id;
  return BETTING_STRATEGIES.find(s => s.id === lookupId);
}

export function checkPickAgainstStrategy(
  strategy: BettingStrategy | null | undefined,
  leg: StrategyCheckLeg,
  currentSlipLength: number
): StrategyViolation | null {
  if (!strategy) return null;
  return strategy.check(leg, currentSlipLength);
}

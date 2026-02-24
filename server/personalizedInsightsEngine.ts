import { getBets, getBetStats, getStreakData, type BetRecord } from "./userDataEngine";
import { generateIntelligenceFeed, type TopPick } from "./unifiedIntelligenceHub";

export interface BettingDNA {
  favoriteSport: string | null;
  favoriteMarket: string | null;
  preferredOddsRange: { min: number; max: number } | null;
  riskProfile: "conservative" | "moderate" | "aggressive" | "unknown";
  bettingStyle: string;
  strengths: string[];
  weaknesses: string[];
}

export interface PerformanceTrend {
  label: string;
  direction: "improving" | "declining" | "stable";
  detail: string;
}

export interface PersonalizedRecommendation {
  id: string;
  type: "game_match" | "strategy" | "warning" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  sport?: string;
  actionLabel?: string;
  actionRoute?: string;
  relatedPick?: TopPick;
}

export interface SportBreakdown {
  sport: string;
  bets: number;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  profit: number;
  avgOdds: number;
  isStrength: boolean;
}

export interface MarketBreakdown {
  market: string;
  bets: number;
  wins: number;
  winRate: number;
  roi: number;
  isStrength: boolean;
}

export interface PersonalizedInsights {
  hasBettingHistory: boolean;
  totalBets: number;
  bettingDNA: BettingDNA;
  sportBreakdowns: SportBreakdown[];
  marketBreakdowns: MarketBreakdown[];
  performanceTrends: PerformanceTrend[];
  recommendations: PersonalizedRecommendation[];
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    totalDaysActive: number;
  };
  overallStats: {
    winRate: number;
    roi: number;
    totalProfit: number;
    totalStaked: number;
    avgOdds: number;
  };
  generatedAt: string;
}

function classifyRiskProfile(bets: BetRecord[]): "conservative" | "moderate" | "aggressive" | "unknown" {
  if (bets.length < 3) return "unknown";
  const avgLegs = bets.reduce((sum, b) => sum + b.legs.length, 0) / bets.length;
  const avgOdds = bets.reduce((sum, b) => sum + (b.legs[0]?.odds || 0), 0) / bets.length;
  const avgStake = bets.reduce((sum, b) => sum + b.stake, 0) / bets.length;

  let score = 0;
  if (avgLegs > 3) score += 2;
  else if (avgLegs > 1.5) score += 1;
  if (Math.abs(avgOdds) > 200 || avgOdds > 200) score += 1;
  if (avgStake > 50) score += 1;
  if (bets.some(b => b.legs.length >= 5)) score += 1;

  if (score >= 4) return "aggressive";
  if (score >= 2) return "moderate";
  return "conservative";
}

function describeBettingStyle(bets: BetRecord[], riskProfile: string): string {
  if (bets.length === 0) return "New bettor — start tracking bets to unlock personalized insights.";
  const avgLegs = bets.reduce((sum, b) => sum + b.legs.length, 0) / bets.length;
  const sportsArr = Array.from(new Set(bets.map(b => b.sport)));
  const parlayPct = bets.filter(b => b.legs.length > 1).length / bets.length * 100;

  const parts: string[] = [];
  if (riskProfile === "aggressive") parts.push("High-risk bettor");
  else if (riskProfile === "moderate") parts.push("Balanced bettor");
  else if (riskProfile === "conservative") parts.push("Value-focused bettor");
  else parts.push("Developing bettor");

  if (sportsArr.length >= 4) parts.push("with broad multi-sport coverage");
  else if (sportsArr.length >= 2) parts.push(`covering ${sportsArr.length} sports`);
  else if (sportsArr.length === 1) parts.push(`specializing in ${sportsArr[0]}`);

  if (parlayPct > 60) parts.push("who favors parlays");
  else if (parlayPct > 30) parts.push("who mixes straight bets and parlays");
  else parts.push("who prefers straight bets");

  if (avgLegs > 3) parts.push(`(avg ${avgLegs.toFixed(1)} legs per ticket)`);

  return parts.join(" ") + ".";
}

function identifyStrengths(sportBreakdowns: SportBreakdown[], marketBreakdowns: MarketBreakdown[]): string[] {
  const strengths: string[] = [];
  for (const s of sportBreakdowns) {
    if (s.bets >= 5 && s.winRate > 55) {
      strengths.push(`Strong ${s.sport} record (${s.winRate.toFixed(0)}% win rate)`);
    }
    if (s.bets >= 5 && s.roi > 5) {
      strengths.push(`Profitable in ${s.sport} (+${s.roi.toFixed(1)}% ROI)`);
    }
  }
  for (const m of marketBreakdowns) {
    if (m.bets >= 5 && m.winRate > 55) {
      strengths.push(`Good at ${m.market} bets (${m.winRate.toFixed(0)}% hit rate)`);
    }
  }
  if (strengths.length === 0) strengths.push("Building your track record — keep logging bets");
  return strengths.slice(0, 4);
}

function identifyWeaknesses(sportBreakdowns: SportBreakdown[], marketBreakdowns: MarketBreakdown[]): string[] {
  const weaknesses: string[] = [];
  for (const s of sportBreakdowns) {
    if (s.bets >= 5 && s.winRate < 40) {
      weaknesses.push(`${s.sport} underperforming (${s.winRate.toFixed(0)}% win rate)`);
    }
    if (s.bets >= 5 && s.roi < -15) {
      weaknesses.push(`${s.sport} losing money (${s.roi.toFixed(1)}% ROI)`);
    }
  }
  for (const m of marketBreakdowns) {
    if (m.bets >= 5 && m.winRate < 40) {
      weaknesses.push(`${m.market} bets struggling (${m.winRate.toFixed(0)}% hit rate)`);
    }
  }
  if (weaknesses.length === 0) weaknesses.push("No major weaknesses identified yet");
  return weaknesses.slice(0, 4);
}

function analyzePerformanceTrends(bets: BetRecord[]): PerformanceTrend[] {
  const trends: PerformanceTrend[] = [];
  const resolved = bets.filter(b => b.result !== "pending").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (resolved.length < 6) {
    trends.push({ label: "Data Volume", direction: "stable", detail: "Need more bets to identify trends. Keep tracking." });
    return trends;
  }

  const half = Math.floor(resolved.length / 2);
  const firstHalf = resolved.slice(0, half);
  const secondHalf = resolved.slice(half);

  const firstWinRate = firstHalf.filter(b => b.result === "won").length / firstHalf.length * 100;
  const secondWinRate = secondHalf.filter(b => b.result === "won").length / secondHalf.length * 100;
  const winRateDiff = secondWinRate - firstWinRate;

  if (winRateDiff > 5) trends.push({ label: "Win Rate", direction: "improving", detail: `Up ${winRateDiff.toFixed(1)}pp in recent bets (${secondWinRate.toFixed(0)}% vs ${firstWinRate.toFixed(0)}%)` });
  else if (winRateDiff < -5) trends.push({ label: "Win Rate", direction: "declining", detail: `Down ${Math.abs(winRateDiff).toFixed(1)}pp in recent bets (${secondWinRate.toFixed(0)}% vs ${firstWinRate.toFixed(0)}%)` });
  else trends.push({ label: "Win Rate", direction: "stable", detail: `Consistent around ${((firstWinRate + secondWinRate) / 2).toFixed(0)}%` });

  const firstROI = firstHalf.reduce((s, b) => s + b.profit, 0) / Math.max(firstHalf.reduce((s, b) => s + b.stake, 0), 1) * 100;
  const secondROI = secondHalf.reduce((s, b) => s + b.profit, 0) / Math.max(secondHalf.reduce((s, b) => s + b.stake, 0), 1) * 100;
  const roiDiff = secondROI - firstROI;

  if (roiDiff > 3) trends.push({ label: "ROI", direction: "improving", detail: `Profitability trending up (+${roiDiff.toFixed(1)}pp)` });
  else if (roiDiff < -3) trends.push({ label: "ROI", direction: "declining", detail: `Profitability trending down (${roiDiff.toFixed(1)}pp)` });
  else trends.push({ label: "ROI", direction: "stable", detail: "Profitability holding steady" });

  const last10 = resolved.slice(-10);
  const last10WinRate = last10.filter(b => b.result === "won").length / last10.length * 100;
  if (last10WinRate >= 60) trends.push({ label: "Recent Form", direction: "improving", detail: `Hot streak — ${last10WinRate.toFixed(0)}% in last 10 bets` });
  else if (last10WinRate <= 30) trends.push({ label: "Recent Form", direction: "declining", detail: `Cold streak — ${last10WinRate.toFixed(0)}% in last 10 bets` });
  else trends.push({ label: "Recent Form", direction: "stable", detail: `Steady — ${last10WinRate.toFixed(0)}% in last 10 bets` });

  return trends;
}

function buildSportBreakdowns(bets: BetRecord[]): SportBreakdown[] {
  const resolved = bets.filter(b => b.result !== "pending");
  const map = new Map<string, { bets: number; wins: number; losses: number; profit: number; staked: number; oddsSum: number }>();
  for (const bet of resolved) {
    const entry = map.get(bet.sport) || { bets: 0, wins: 0, losses: 0, profit: 0, staked: 0, oddsSum: 0 };
    entry.bets++;
    if (bet.result === "won") entry.wins++;
    else if (bet.result === "lost") entry.losses++;
    entry.profit += bet.profit;
    entry.staked += bet.stake;
    entry.oddsSum += (bet.legs[0]?.odds || 0);
    map.set(bet.sport, entry);
  }
  return Array.from(map.entries()).map(([sport, s]) => ({
    sport,
    bets: s.bets,
    wins: s.wins,
    losses: s.losses,
    winRate: s.bets > 0 ? (s.wins / s.bets) * 100 : 0,
    roi: s.staked > 0 ? (s.profit / s.staked) * 100 : 0,
    profit: Math.round(s.profit * 100) / 100,
    avgOdds: s.bets > 0 ? Math.round(s.oddsSum / s.bets) : 0,
    isStrength: s.bets >= 5 && (s.wins / Math.max(s.bets, 1)) > 0.52,
  })).sort((a, b) => b.bets - a.bets);
}

function buildMarketBreakdowns(bets: BetRecord[]): MarketBreakdown[] {
  const resolved = bets.filter(b => b.result !== "pending");
  const map = new Map<string, { bets: number; wins: number; profit: number; staked: number }>();
  for (const bet of resolved) {
    const market = bet.legs[0]?.market || "other";
    const entry = map.get(market) || { bets: 0, wins: 0, profit: 0, staked: 0 };
    entry.bets++;
    if (bet.result === "won") entry.wins++;
    entry.profit += bet.profit;
    entry.staked += bet.stake;
    map.set(market, entry);
  }
  return Array.from(map.entries()).map(([market, m]) => ({
    market,
    bets: m.bets,
    wins: m.wins,
    winRate: m.bets > 0 ? (m.wins / m.bets) * 100 : 0,
    roi: m.staked > 0 ? (m.profit / m.staked) * 100 : 0,
    isStrength: m.bets >= 5 && (m.wins / Math.max(m.bets, 1)) > 0.52,
  })).sort((a, b) => b.bets - a.bets);
}

async function generateRecommendations(
  bets: BetRecord[],
  dna: BettingDNA,
  sportBreakdowns: SportBreakdown[],
): Promise<PersonalizedRecommendation[]> {
  const recs: PersonalizedRecommendation[] = [];
  let recId = 0;

  try {
    const feed = await generateIntelligenceFeed();

    if (dna.favoriteSport && feed.topPicks.length > 0) {
      const matchingPicks = feed.topPicks.filter(p => p.sport === dna.favoriteSport);
      for (const pick of matchingPicks.slice(0, 2)) {
        recs.push({
          id: `rec-${recId++}`,
          type: "game_match",
          priority: "high",
          title: `${pick.sport} Pick for You: ${pick.game}`,
          description: `Based on your ${dna.favoriteSport} focus — ${pick.pick} (${pick.grade} grade, ${pick.confidence}% confidence). ${pick.reasoning}`,
          sport: pick.sport,
          actionLabel: "View Pick",
          actionRoute: "/daily-picks",
          relatedPick: pick,
        });
      }
    }

    const strongSports = sportBreakdowns.filter(s => s.isStrength).map(s => s.sport);
    for (const sport of strongSports) {
      const picks = feed.topPicks.filter(p => p.sport === sport && p.sport !== dna.favoriteSport);
      if (picks.length > 0) {
        const pick = picks[0];
        recs.push({
          id: `rec-${recId++}`,
          type: "game_match",
          priority: "medium",
          title: `Play to Your Strength: ${sport}`,
          description: `You have a strong ${sport} record. Today's top pick: ${pick.pick} on ${pick.game} (${pick.grade} grade).`,
          sport,
          actionLabel: "See Details",
          actionRoute: "/daily-picks",
          relatedPick: pick,
        });
      }
    }

    const weakSports = sportBreakdowns.filter(s => s.bets >= 5 && !s.isStrength && s.roi < -10);
    for (const weak of weakSports.slice(0, 1)) {
      recs.push({
        id: `rec-${recId++}`,
        type: "warning",
        priority: "medium",
        title: `Consider Reducing ${weak.sport} Exposure`,
        description: `Your ${weak.sport} ROI is ${weak.roi.toFixed(1)}% over ${weak.bets} bets. Consider smaller stakes or focusing on sports where you're profitable.`,
        sport: weak.sport,
      });
    }

    const highEvPicks = feed.topPicks.filter(p => p.ev > 3 && !strongSports.includes(p.sport) && p.sport !== dna.favoriteSport);
    for (const pick of highEvPicks.slice(0, 1)) {
      recs.push({
        id: `rec-${recId++}`,
        type: "opportunity",
        priority: "medium",
        title: `High-Value Opportunity: ${pick.game}`,
        description: `${pick.pick} has +${pick.ev.toFixed(1)}% expected value. Even outside your usual sports, this edge is worth considering.`,
        sport: pick.sport,
        actionLabel: "Explore",
        actionRoute: "/daily-picks",
        relatedPick: pick,
      });
    }

    for (const alert of feed.edgeAlerts.filter(a => a.severity === "critical").slice(0, 1)) {
      const alertSportMatch = strongSports.includes(alert.sport) || alert.sport === dna.favoriteSport;
      if (alertSportMatch) {
        recs.push({
          id: `rec-${recId++}`,
          type: "opportunity",
          priority: "high",
          title: alert.title,
          description: `${alert.description} — This is in your wheelhouse.`,
          sport: alert.sport,
          actionLabel: "Check It Out",
          actionRoute: "/",
        });
      }
    }
  } catch {}

  if (dna.riskProfile === "aggressive" && bets.length >= 10) {
    const resolved = bets.filter(b => b.result !== "pending");
    const roi = resolved.reduce((s, b) => s + b.profit, 0) / Math.max(resolved.reduce((s, b) => s + b.stake, 0), 1) * 100;
    if (roi < -10) {
      recs.push({
        id: `rec-${recId++}`,
        type: "strategy",
        priority: "high",
        title: "Consider Lowering Risk",
        description: `Your aggressive style with ${roi.toFixed(1)}% ROI suggests reducing parlay legs or stake sizes. Try more straight bets or 2-leg parlays for steadier returns.`,
        actionLabel: "Bankroll Tools",
        actionRoute: "/bankroll",
      });
    }
  }

  if (bets.length === 0) {
    recs.push({
      id: `rec-${recId++}`,
      type: "strategy",
      priority: "high",
      title: "Start Tracking Your Bets",
      description: "Log your first bet to unlock personalized insights, trend analysis, and tailored game recommendations based on your betting patterns.",
      actionLabel: "Log a Bet",
      actionRoute: "/bet-tracker",
    });
    recs.push({
      id: `rec-${recId++}`,
      type: "opportunity",
      priority: "medium",
      title: "Explore Today's Top Picks",
      description: "Check the Command Center for today's highest-confidence picks across all sports while you build your profile.",
      actionLabel: "Command Center",
      actionRoute: "/",
    });
  }

  return recs.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export async function getPersonalizedInsights(sessionId?: string): Promise<PersonalizedInsights> {
  const bets = getBets(sessionId);
  const stats = getBetStats(sessionId);
  const streak = getStreakData(sessionId);

  const sportBreakdowns = buildSportBreakdowns(bets);
  const marketBreakdowns = buildMarketBreakdowns(bets);

  const resolved = bets.filter(b => b.result !== "pending");
  const favSport = sportBreakdowns.length > 0 ? sportBreakdowns[0].sport : null;
  const favMarket = marketBreakdowns.length > 0 ? marketBreakdowns[0].market : null;

  let oddsRange: { min: number; max: number } | null = null;
  if (resolved.length >= 3) {
    const allOdds = resolved.map(b => b.legs[0]?.odds || 0).filter(o => o !== 0);
    if (allOdds.length > 0) {
      oddsRange = { min: Math.min(...allOdds), max: Math.max(...allOdds) };
    }
  }

  const riskProfile = classifyRiskProfile(bets);

  const dna: BettingDNA = {
    favoriteSport: favSport,
    favoriteMarket: favMarket,
    preferredOddsRange: oddsRange,
    riskProfile,
    bettingStyle: describeBettingStyle(bets, riskProfile),
    strengths: identifyStrengths(sportBreakdowns, marketBreakdowns),
    weaknesses: identifyWeaknesses(sportBreakdowns, marketBreakdowns),
  };

  const performanceTrends = analyzePerformanceTrends(bets);
  const recommendations = await generateRecommendations(bets, dna, sportBreakdowns);

  return {
    hasBettingHistory: bets.length > 0,
    totalBets: bets.length,
    bettingDNA: dna,
    sportBreakdowns,
    marketBreakdowns,
    performanceTrends,
    recommendations,
    streakInfo: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDaysActive: streak.totalDaysActive,
    },
    overallStats: {
      winRate: stats.winRate,
      roi: stats.roi,
      totalProfit: stats.totalProfit,
      totalStaked: stats.totalStaked,
      avgOdds: stats.avgOdds,
    },
    generatedAt: new Date().toISOString(),
  };
}

import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "pick-outcomes-data.json");

export interface CalibrationTier {
  label: string;
  minConfidence: number;
  maxConfidence: number;
  total: number;
  settled: number;
  won: number;
  lost: number;
  push: number;
  modelAvgConfidence: number;
  actualWinRate: number | null;
  calibrationGap: number | null;
}

export interface GradeAccuracy {
  grade: string;
  total: number;
  settled: number;
  won: number;
  lost: number;
  actualWinRate: number | null;
}

export interface SportAccuracy {
  sport: string;
  total: number;
  settled: number;
  won: number;
  lost: number;
  actualWinRate: number | null;
}

export interface BetTypeAccuracy {
  betType: string;
  total: number;
  settled: number;
  won: number;
  lost: number;
  actualWinRate: number | null;
}

export interface TrackRecord {
  generatedAt: string;
  totalPicks: number;
  settledPicks: number;
  pendingPicks: number;
  wonPicks: number;
  lostPicks: number;
  pushPicks: number;
  overallWinRate: number | null;
  hasMinimumData: boolean;
  minimumPicksRequired: number;
  picksUntilValidated: number;
  calibrationScore: number | null;
  calibrationTiers: CalibrationTier[];
  byGrade: GradeAccuracy[];
  bySport: SportAccuracy[];
  byBetType: BetTypeAccuracy[];
  recentTrend: {
    last20WinRate: number | null;
    last50WinRate: number | null;
    trend: "improving" | "declining" | "stable" | "insufficient";
  };
  dataIntegrity: {
    realDataSources: string[];
    estimatedFactors: string[];
    lastUpdated: string;
  };
}

const MINIMUM_PICKS_FOR_VALIDATION = 100;

function loadData(): { pending: any[]; settled: any[] } {
  try {
    if (!fs.existsSync(DATA_FILE)) return { pending: [], settled: [] };
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { pending: [], settled: [] };
  }
}

export function computeCalibration(): TrackRecord {
  const { pending, settled } = loadData();

  const won = settled.filter((p) => p.result === "won");
  const lost = settled.filter((p) => p.result === "lost");
  const push = settled.filter((p) => p.result === "push");
  const totalSettled = settled.length;
  const winLossTotal = won.length + lost.length;
  const overallWinRate = winLossTotal > 0 ? (won.length / winLossTotal) * 100 : null;

  const TIERS = [
    { label: "50–59%", min: 50, max: 59 },
    { label: "60–69%", min: 60, max: 69 },
    { label: "70–79%", min: 70, max: 79 },
    { label: "80–89%", min: 80, max: 89 },
    { label: "90%+", min: 90, max: 100 },
  ];

  const allPicks = [...pending, ...settled];

  const calibrationTiers: CalibrationTier[] = TIERS.map((tier) => {
    const tierAll = allPicks.filter((p) => p.confidence >= tier.min && p.confidence <= tier.max);
    const tierSettled = settled.filter((p) => p.confidence >= tier.min && p.confidence <= tier.max);
    const tierWon = tierSettled.filter((p) => p.result === "won").length;
    const tierLost = tierSettled.filter((p) => p.result === "lost").length;
    const tierPush = tierSettled.filter((p) => p.result === "push").length;
    const avgConf =
      tierAll.length > 0 ? tierAll.reduce((s, p) => s + (p.confidence || 0), 0) / tierAll.length : 0;
    const wl = tierWon + tierLost;
    const actualWinRate = wl > 0 ? (tierWon / wl) * 100 : null;
    const calibrationGap = actualWinRate !== null ? actualWinRate - avgConf : null;
    return {
      label: tier.label,
      minConfidence: tier.min,
      maxConfidence: tier.max,
      total: tierAll.length,
      settled: tierSettled.length,
      won: tierWon,
      lost: tierLost,
      push: tierPush,
      modelAvgConfidence: Math.round(avgConf * 10) / 10,
      actualWinRate: actualWinRate !== null ? Math.round(actualWinRate * 10) / 10 : null,
      calibrationGap: calibrationGap !== null ? Math.round(calibrationGap * 10) / 10 : null,
    };
  });

  const grades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D"];
  const byGrade: GradeAccuracy[] = grades
    .map((grade) => {
      const gradeAll = allPicks.filter((p) => p.grade === grade);
      const gradeSettled = settled.filter((p) => p.grade === grade);
      const w = gradeSettled.filter((p) => p.result === "won").length;
      const l = gradeSettled.filter((p) => p.result === "lost").length;
      const wl = w + l;
      return {
        grade,
        total: gradeAll.length,
        settled: gradeSettled.length,
        won: w,
        lost: l,
        actualWinRate: wl > 0 ? Math.round((w / wl) * 1000) / 10 : null,
      };
    })
    .filter((g) => g.total > 0);

  const sports = [...new Set(allPicks.map((p) => p.sport).filter(Boolean))];
  const bySport: SportAccuracy[] = sports.map((sport) => {
    const sAll = allPicks.filter((p) => p.sport === sport);
    const sSettled = settled.filter((p) => p.sport === sport);
    const w = sSettled.filter((p) => p.result === "won").length;
    const l = sSettled.filter((p) => p.result === "lost").length;
    return {
      sport,
      total: sAll.length,
      settled: sSettled.length,
      won: w,
      lost: l,
      actualWinRate: w + l > 0 ? Math.round((w / (w + l)) * 1000) / 10 : null,
    };
  });

  function normalizeBetType(bt: string): string {
    const t = bt.toLowerCase();
    if (t === "spread") return "Spread";
    if (t === "total") return "Total";
    if (t === "moneyline" || t === "h2h") return "Moneyline";
    if (t === "team_total") return "Team Total";
    if (t.includes("first_half") || t.includes("1h")) return "1H";
    if (t.startsWith("player_")) return "Player Props";
    return bt;
  }
  const betTypeMap = new Map<string, { total: number; settled: number; won: number; lost: number }>();
  for (const p of allPicks) {
    if (!p.betType) continue;
    const key = normalizeBetType(p.betType);
    if (!betTypeMap.has(key)) betTypeMap.set(key, { total: 0, settled: 0, won: 0, lost: 0 });
    betTypeMap.get(key)!.total++;
  }
  for (const p of settled) {
    if (!p.betType) continue;
    const key = normalizeBetType(p.betType);
    if (!betTypeMap.has(key)) betTypeMap.set(key, { total: 0, settled: 0, won: 0, lost: 0 });
    const entry = betTypeMap.get(key)!;
    entry.settled++;
    if (p.result === "won") entry.won++;
    else if (p.result === "lost") entry.lost++;
  }
  const byBetType: BetTypeAccuracy[] = Array.from(betTypeMap.entries()).map(([betType, counts]) => ({
    betType,
    total: counts.total,
    settled: counts.settled,
    won: counts.won,
    lost: counts.lost,
    actualWinRate: counts.won + counts.lost > 0
      ? Math.round((counts.won / (counts.won + counts.lost)) * 1000) / 10
      : null,
  })).sort((a, b) => b.total - a.total);

  const recentSettled = [...settled].sort(
    (a, b) => new Date(b.settledAt || b.savedAt).getTime() - new Date(a.settledAt || a.savedAt).getTime()
  );
  const last20 = recentSettled.slice(0, 20);
  const last50 = recentSettled.slice(0, 50);
  const calcRate = (picks: any[]) => {
    const w = picks.filter((p) => p.result === "won").length;
    const l = picks.filter((p) => p.result === "lost").length;
    return w + l > 0 ? Math.round((w / (w + l)) * 1000) / 10 : null;
  };
  const last20Rate = calcRate(last20);
  const last50Rate = calcRate(last50);
  let trend: "improving" | "declining" | "stable" | "insufficient" = "insufficient";
  if (last20Rate !== null && last50Rate !== null) {
    const diff = last20Rate - last50Rate;
    if (diff > 3) trend = "improving";
    else if (diff < -3) trend = "declining";
    else trend = "stable";
  }

  const tiersWithData = calibrationTiers.filter((t) => t.settled >= 10);
  let calibrationScore: number | null = null;
  if (tiersWithData.length >= 2) {
    const gaps = tiersWithData.map((t) => Math.abs(t.calibrationGap || 0));
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    calibrationScore = Math.max(0, Math.round(100 - avgGap * 2));
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPicks: allPicks.length,
    settledPicks: totalSettled,
    pendingPicks: pending.length,
    wonPicks: won.length,
    lostPicks: lost.length,
    pushPicks: push.length,
    overallWinRate,
    hasMinimumData: totalSettled >= MINIMUM_PICKS_FOR_VALIDATION,
    minimumPicksRequired: MINIMUM_PICKS_FOR_VALIDATION,
    picksUntilValidated: Math.max(0, MINIMUM_PICKS_FOR_VALIDATION - totalSettled),
    calibrationScore,
    calibrationTiers,
    byGrade,
    bySport,
    byBetType,
    recentTrend: { last20WinRate: last20Rate, last50WinRate: last50Rate, trend },
    dataIntegrity: {
      realDataSources: [
        "ESPN API (live game data, injuries, schedules, team records)",
        "The Odds API (DraftKings, FanDuel, BetMGM, Caesars, BetRivers live lines)",
        "BallDontLie (NBA team stats, standings, ratings, pace, efficiency)",
        "Open-Meteo (live weather at venue)",
      ],
      estimatedFactors: [
        "conditioning_trend (estimated from schedule density)",
        "availability_pattern (estimated from injury history)",
        "roster_depth (estimated from roster data)",
        "matchup_efficiency (estimated from box scores)",
        "usage_patterns (estimated from recent minutes)",
        "film_tendency (estimated from historical trends)",
        "team_investment (estimated from net rating trend)",
        "salary_dynamics (not directly measured)",
        "field_conditions (estimated from weather/venue)",
        "temperature_impact (estimated from weather)",
        "media_impact (estimated from game context)",
      ],
      lastUpdated: new Date().toISOString(),
    },
  };
}

const calibrationCorrections = new Map<string, number>();

export interface CalibrationReport {
  tiers: {
    label: string;
    predicted: number;
    actual: number;
    gap: number;
    correction: number;
  }[];
}

export async function runCalibrationCheck(): Promise<CalibrationReport> {
  const stats = computeCalibration();
  const report: CalibrationReport = { tiers: [] };

  for (const tier of stats.calibrationTiers) {
    if (tier.settled < 10) continue;

    const predicted = tier.modelAvgConfidence;
    const actual = tier.actualWinRate || 0;
    const gap = actual - predicted;

    let correction = 1.0;
    if (Math.abs(gap) > 10) {
      console.warn(`[Calibration] ${tier.label} tier: predicted ${predicted}%, actual ${actual}%, gap ${gap}% — applying correction`);
      // Simple correction: if actual is 40 and predicted is 60, gap is -20.
      // We want to scale predicted towards actual.
      correction = actual / predicted;
    }
    
    calibrationCorrections.set(tier.label, correction);
    report.tiers.push({
      label: tier.label,
      predicted,
      actual,
      gap,
      correction
    });
  }

  return report;
}

export function getCalibrationCorrection(confidence: number): number {
  const tier = confidence >= 90 ? "90%+" :
               confidence >= 80 ? "80–89%" :
               confidence >= 70 ? "70–79%" :
               confidence >= 60 ? "60–69%" :
               confidence >= 50 ? "50–59%" : null;
  
  if (!tier) return 1.0;
  return calibrationCorrections.get(tier) || 1.0;
}

let cached: { data: TrackRecord; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export function getTrackRecord(): TrackRecord {
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  const data = computeCalibration();
  cached = { data, ts: Date.now() };
  return data;
}

export function invalidateCalibrationCache(): void {
  cached = null;
}

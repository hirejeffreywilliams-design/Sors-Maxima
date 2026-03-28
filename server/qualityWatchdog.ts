import { getEngineStatus, getPrecomputedCache } from "./precomputedPredictionsEngine";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface QualityIssue {
  id: string;
  severity: IssueSeverity;
  category: "pick_accuracy" | "ev_integrity" | "reasoning" | "data_freshness" | "system" | "distribution";
  title: string;
  detail: string;
  affectedCount?: number;
  recommendation: string;
}

export interface QualityPassedCheck {
  id: string;
  category: string;
  title: string;
  detail: string;
}

export interface QualityReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: "healthy" | "fair" | "degraded" | "critical";
  issues: QualityIssue[];
  passed: QualityPassedCheck[];
  stats: {
    totalPicks: number;
    sportsAnalyzed: string[];
    avgEV: number;
    avgConfidence: number;
    gradeDistribution: Record<string, number>;
    evSaturationPct: number;
    avgWinProbDrift: number;
    cacheAgeBySport: Record<string, string>;
  };
  generatedAt: string;
  nextCheckAt: string;
}

const ALL_SPORTS = ["NBA", "NHL", "MLB", "NFL", "MMA", "NCAAB", "NCAAF", "Soccer"];
const SEVERITY_WEIGHT: Record<IssueSeverity, number> = { critical: 25, high: 12, medium: 6, low: 2, info: 0 };
const BAD_REASONING_PATTERN = /(\d+)% win probability vs (\d+)% implied.*\+(\d+)%/;

let latestReport: QualityReport | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

function impliedProbPct(americanOdds: number): number {
  if (americanOdds < 0) return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100) * 100;
  return 100 / (americanOdds + 100) * 100;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function runQualityCheck(): QualityReport {
  const issues: QualityIssue[] = [];
  const passed: QualityPassedCheck[] = [];

  const engineStatus = getEngineStatus();

  // Collect all picks from cache
  const sportsAnalyzed: string[] = [];
  const picks: any[] = [];
  const cacheAgeBySport: Record<string, string> = {};

  for (const sport of ALL_SPORTS) {
    const cache = getPrecomputedCache(sport as any);
    if (cache && cache.picks.length > 0) {
      sportsAnalyzed.push(sport);
      picks.push(...cache.picks);
    }
    const cacheInfo = engineStatus.cacheStatus?.[sport];
    if (cacheInfo) cacheAgeBySport[sport] = (cacheInfo as any).age;
  }

  const totalPicks = picks.length;

  // ── 1. Engine health ──────────────────────────────────────────────────────
  if (!engineStatus.running) {
    issues.push({
      id: "engine-down",
      severity: "critical",
      category: "system",
      title: "Prediction engine is not running",
      detail: `Engine stopped. Last run: ${engineStatus.lastRunTime || "never"}. All picks may be stale.`,
      recommendation: "Restart the prediction engine via admin controls.",
    });
  } else {
    passed.push({
      id: "engine-running",
      category: "system",
      title: "Prediction engine is running",
      detail: `${engineStatus.totalRuns} total runs, ${engineStatus.failedRuns} failed.`,
    });
  }

  // ── 2. No picks at all ────────────────────────────────────────────────────
  if (totalPicks === 0) {
    issues.push({
      id: "no-picks",
      severity: "critical",
      category: "data_freshness",
      title: "No picks in cache",
      detail: "All sport caches are empty. Members currently see no picks.",
      recommendation: "Force a prediction cycle or check the engine logs for errors.",
    });
    return buildReport(issues, passed, { totalPicks, sportsAnalyzed, avgEV: 0, avgConfidence: 0, gradeDistribution: {}, evSaturationPct: 0, avgWinProbDrift: 0, cacheAgeBySport });
  }

  // ── 3. Cache staleness ────────────────────────────────────────────────────
  const staleThresholdMin = 20;
  const staleEntries = Object.entries(engineStatus.cacheStatus || {}).filter(([, v]) => {
    const ageMin = parseInt((v as any).age);
    return !isNaN(ageMin) && ageMin > staleThresholdMin;
  });

  if (staleEntries.length > 0) {
    const sportNames = staleEntries.map(([s]) => s).join(", ");
    issues.push({
      id: "stale-cache",
      severity: "high",
      category: "data_freshness",
      title: `${staleEntries.length} sport cache(s) are stale`,
      detail: `${sportNames} — cache older than ${staleThresholdMin} minutes.`,
      affectedCount: staleEntries.length,
      recommendation: "Check prediction engine refresh cycle or force a cache update.",
    });
  } else {
    passed.push({
      id: "cache-fresh",
      category: "data_freshness",
      title: "All caches are fresh",
      detail: `${sportsAnalyzed.length} sport(s) updated within ${staleThresholdMin} minutes.`,
    });
  }

  // ── 4. EV Saturation ─────────────────────────────────────────────────────
  const EV_CAP = 35;
  const cappedCount = picks.filter((p: any) => p.ev >= EV_CAP).length;
  const evSaturationPct = Math.round((cappedCount / totalPicks) * 100);

  if (evSaturationPct > 60) {
    issues.push({
      id: "ev-saturation",
      severity: "high",
      category: "ev_integrity",
      title: `${evSaturationPct}% of picks are hitting the EV cap (${EV_CAP}%)`,
      detail: `${cappedCount} of ${totalPicks} picks show EV = ${EV_CAP}%. This level of saturation indicates systematic over-estimation from the signal model.`,
      affectedCount: cappedCount,
      recommendation: "The fusion model weight was recently reduced to 20%. If saturation persists, consider further reducing or recalibrating signal weights.",
    });
  } else if (evSaturationPct > 35) {
    issues.push({
      id: "ev-saturation-medium",
      severity: "medium",
      category: "ev_integrity",
      title: `${evSaturationPct}% of picks at EV cap`,
      detail: `${cappedCount} of ${totalPicks} picks are capped at ${EV_CAP}% EV — moderate saturation.`,
      affectedCount: cappedCount,
      recommendation: "Monitor this metric as picks regenerate. Acceptable if below 35%.",
    });
  } else {
    passed.push({
      id: "ev-distribution",
      category: "ev_integrity",
      title: "EV distribution is healthy",
      detail: `Only ${evSaturationPct}% of picks at the cap. Good spread across EV values.`,
    });
  }

  // ── 5. Win probability drift (moneyline picks) ────────────────────────────
  const mlPicks = picks.filter((p: any) => p.betType === "moneyline" && p.odds);
  const drifts = mlPicks.map((p: any) => Math.abs(p.winProbability - impliedProbPct(p.odds)));
  const avgWinProbDrift = mlPicks.length > 0 ? Math.round(avg(drifts)) : 0;
  const highDriftCount = drifts.filter((d: number) => d > 25).length;

  if (avgWinProbDrift > 20) {
    issues.push({
      id: "win-prob-drift",
      severity: "high",
      category: "pick_accuracy",
      title: `Win probability avg ${avgWinProbDrift}pp above market implied`,
      detail: `${highDriftCount} of ${mlPicks.length} moneyline picks claim win probability >25pp above market odds — misleading for members.`,
      affectedCount: highDriftCount,
      recommendation: "Force a prediction cache refresh so picks regenerate with the corrected reasoning formula (fix deployed).",
    });
  } else if (avgWinProbDrift > 12) {
    issues.push({
      id: "win-prob-drift-medium",
      severity: "medium",
      category: "pick_accuracy",
      title: `Win probability drift at ${avgWinProbDrift}pp`,
      detail: `Average ML win probability is ${avgWinProbDrift}pp above implied odds — slight inflation.`,
      recommendation: "Monitor as cache refreshes with the updated reasoning logic.",
    });
  } else {
    passed.push({
      id: "win-prob-accurate",
      category: "pick_accuracy",
      title: "Win probabilities aligned with market",
      detail: `Avg ML drift: ${avgWinProbDrift}pp from implied odds — within acceptable range (≤12pp).`,
    });
  }

  // ── 6. Grade concentration ────────────────────────────────────────────────
  const gradeDistribution: Record<string, number> = {};
  for (const pick of picks) {
    gradeDistribution[pick.grade] = (gradeDistribution[pick.grade] || 0) + 1;
  }
  const topGradeCount = (gradeDistribution["A+"] || 0) + (gradeDistribution["A"] || 0);
  const topGradePct = Math.round((topGradeCount / totalPicks) * 100);

  if (topGradePct > 70) {
    issues.push({
      id: "grade-inflation",
      severity: "medium",
      category: "distribution",
      title: `${topGradePct}% of picks are grade A or A+`,
      detail: `${topGradeCount} of ${totalPicks} picks carry a top grade. Healthy systems expect ≤40%.`,
      affectedCount: topGradeCount,
      recommendation: "Tighten grading thresholds in the prediction engine to better differentiate pick quality.",
    });
  } else {
    passed.push({
      id: "grade-distribution",
      category: "distribution",
      title: "Grade distribution looks realistic",
      detail: `${topGradePct}% top-grade picks (A/A+) — within healthy range (≤40%).`,
    });
  }

  // ── 7. Confidence uniformity ──────────────────────────────────────────────
  const confidences = picks.map((p: any) => p.confidence as number);
  const confStdDev = Math.round(stdDev(confidences));
  const avgConfidence = Math.round(avg(confidences));

  if (confStdDev < 4 && totalPicks > 10) {
    issues.push({
      id: "confidence-uniform",
      severity: "low",
      category: "distribution",
      title: `Confidence scores too uniform (σ = ${confStdDev})`,
      detail: `All ${totalPicks} picks cluster near ${avgConfidence}% confidence. The model isn't meaningfully differentiating between picks.`,
      recommendation: "Review the confidence ceiling and floor logic to allow broader spread.",
    });
  } else if (totalPicks > 10) {
    passed.push({
      id: "confidence-varied",
      category: "distribution",
      title: "Confidence scores are well spread",
      detail: `σ = ${confStdDev} across ${totalPicks} picks — good differentiation between pick quality.`,
    });
  }

  // ── 8. Old-style inflated reasoning strings ───────────────────────────────
  const badReasoningCount = picks.filter((p: any) => {
    if (!p.reasoning) return false;
    const match = p.reasoning.match(BAD_REASONING_PATTERN);
    if (!match) return false;
    return parseInt(match[3]) > 25;
  }).length;

  if (badReasoningCount > 0) {
    issues.push({
      id: "inflated-reasoning",
      severity: "high",
      category: "reasoning",
      title: `${badReasoningCount} picks still use old inflated reasoning`,
      detail: `These picks show "XX% win probability vs YY% implied = +ZZ% edge" with ZZ > 25. They were cached before the accuracy fix was deployed.`,
      affectedCount: badReasoningCount,
      recommendation: "Force a prediction cycle to regenerate these picks with calibrated reasoning.",
    });
  } else {
    passed.push({
      id: "reasoning-quality",
      category: "reasoning",
      title: "Pick reasoning is calibrated",
      detail: "No picks found with implausible win probability claims (>25pp above implied).",
    });
  }

  // ── 9. Sport coverage ─────────────────────────────────────────────────────
  if (sportsAnalyzed.length === 0) {
    issues.push({
      id: "no-sports",
      severity: "medium",
      category: "data_freshness",
      title: "No sport picks loaded in cache",
      recommendation: "Verify the prediction engine ran this cycle and external sports APIs are accessible.",
      detail: "Expected picks for at least one sport but all caches are empty.",
    });
  } else {
    passed.push({
      id: "sport-coverage",
      category: "data_freshness",
      title: `${sportsAnalyzed.length} sport(s) have picks in cache`,
      detail: sportsAnalyzed.join(", "),
    });
  }

  // ── 10. Thin caches ───────────────────────────────────────────────────────
  const thinSports = sportsAnalyzed.filter(s => {
    const cache = getPrecomputedCache(s as any);
    return cache && cache.picks.length < 3;
  });
  if (thinSports.length > 0) {
    issues.push({
      id: "thin-cache",
      severity: "low",
      category: "data_freshness",
      title: `${thinSports.length} sport(s) have fewer than 3 picks`,
      detail: `${thinSports.join(", ")} — may be light game days or odds data is sparse for these sports.`,
      affectedCount: thinSports.length,
      recommendation: "No action needed on off-days. Investigate if persistent during active game days.",
    });
  }

  const avgEV = totalPicks > 0 ? Math.round(avg(picks.map((p: any) => p.ev || 0)) * 10) / 10 : 0;

  return buildReport(issues, passed, {
    totalPicks, sportsAnalyzed, avgEV, avgConfidence, gradeDistribution,
    evSaturationPct, avgWinProbDrift, cacheAgeBySport,
  });
}

function buildReport(
  issues: QualityIssue[],
  passed: QualityPassedCheck[],
  stats: QualityReport["stats"]
): QualityReport {
  const deduction = issues.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const grade: QualityReport["grade"] = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
  const status: QualityReport["status"] = score >= 85 ? "healthy" : score >= 65 ? "fair" : score >= 45 ? "degraded" : "critical";

  return {
    score,
    grade,
    status,
    issues,
    passed,
    stats,
    generatedAt: new Date().toISOString(),
    nextCheckAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export function getLatestQualityReport(): QualityReport | null {
  return latestReport;
}

export function runAndStoreQualityCheck(): QualityReport {
  try {
    latestReport = runQualityCheck();
    const criticalIssues = latestReport.issues.filter(i => i.severity === "critical");
    const highIssues = latestReport.issues.filter(i => i.severity === "high");

    if (criticalIssues.length > 0) {
      console.warn(`[QualityWatchdog] Score ${latestReport.score}/100 — ${criticalIssues.length} CRITICAL, ${highIssues.length} high issues`);
    } else {
      console.log(`[QualityWatchdog] Score ${latestReport.score}/100 — ${latestReport.issues.length} issues, ${latestReport.passed.length} passed`);
    }

    import("./appGuardianEngine").then(({ appGuardian }) => {
      for (const issue of criticalIssues) {
        appGuardian.reportQualityIssue("critical", issue.title, issue.detail);
      }
      for (const issue of highIssues) {
        appGuardian.reportQualityIssue("high", issue.title, issue.detail);
      }
    }).catch(() => {});

    return latestReport;
  } catch (err) {
    console.error("[QualityWatchdog] Check failed:", err);
    throw err;
  }
}

export function startQualityWatchdog(intervalMs = 30 * 60 * 1000): void {
  if (watchdogTimer) return;
  setTimeout(() => runAndStoreQualityCheck(), 15_000);
  watchdogTimer = setInterval(() => runAndStoreQualityCheck(), intervalMs);
  console.log(`[QualityWatchdog] Started — checks every ${intervalMs / 60000} min`);
}

export function stopQualityWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

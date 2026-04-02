// ═══════════════════════════════════════════════════════════════════════════
// SORS MAXIMA — AI ANALYST CONTEXT BUILDER
// Assembles a token-budgeted context object for the /api/ai/analyst endpoint.
// Includes: calibration by sport + confidence tier, today's top picks with
// edge/EV/Kelly/confidence, track record, bankroll profile, and platform standards.
// ═══════════════════════════════════════════════════════════════════════════

import { getTrackRecord } from "./calibrationEngine";
import { getPrecomputedCache } from "./precomputedPredictionsEngine";
import { getAIStandardsContext } from "./companyStandards";
import { db } from "./db";
import { sql } from "drizzle-orm";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;

export interface AnalystContextResult {
  standardsContext: string;
  calibrationBlock: string;
  activePicsBlock: string;
  bankrollBlock: string;
  totalChars: number;
}

export interface ActivePick {
  pick: string;
  sport: string;
  grade: string;
  odds: number;
  confidence: number;
  ev: number | null;
  kellyFraction: number | null;
  edge: number | null;
  betType: string;
  impliedProbability: number | null;
}

// ── Joint Probability ───────────────────────────────────────────────────────

/**
 * Given N leg win probabilities (0–1), returns joint probability (assuming independence)
 * and a formatted warning string.
 */
export function computeJointProbability(winProbabilities: number[]): {
  joint: number;
  formattedWarning: string;
} {
  const joint = winProbabilities.reduce((acc, p) => acc * p, 1);
  const pcts = winProbabilities.map(p => `${(p * 100).toFixed(0)}%`).join(" × ");
  const formattedWarning =
    `Joint probability (assuming independence): ${pcts} = ${(joint * 100).toFixed(1)}%.\n` +
    `Even correlated legs compound risk. For a ${winProbabilities.length}-leg parlay, each ` +
    `leg failure cascades — this combined probability is the realistic win rate, not an individual leg's chance.`;
  return { joint, formattedWarning };
}

/**
 * Detect if a user message is asking about a parlay and extract any numeric leg count.
 */
export function detectParlayQuery(messages: { role: string; content: string }[]): {
  isParlay: boolean;
  legCount: number | null;
} {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return { isParlay: false, legCount: null };

  const lc = lastUser.content.toLowerCase();
  const isParlay = /parlay|teaser|accumulator|multi-leg|multi leg|same game|sgp/.test(lc);
  if (!isParlay) return { isParlay: false, legCount: null };

  const legMatch = lc.match(/(\d+)[- ]leg/);
  const legCount = legMatch ? parseInt(legMatch[1]) : null;
  return { isParlay: true, legCount };
}

// ── Bankroll fetcher ────────────────────────────────────────────────────────

export async function fetchUserBankroll(userId: string | undefined): Promise<{
  bankroll: number | null;
  kellyFraction: number | null;
  riskProfile: string;
}> {
  if (!userId) return { bankroll: null, kellyFraction: null, riskProfile: "balanced" };
  try {
    const rows = await db.execute(sql`
      SELECT bankroll, kelly_fraction
      FROM user_betting_profile
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    const row = (rows as any[])[0];
    if (!row) return { bankroll: null, kellyFraction: null, riskProfile: "balanced" };
    return {
      bankroll: row.bankroll ? Number(row.bankroll) : null,
      kellyFraction: row.kelly_fraction ? Number(row.kelly_fraction) : null,
      riskProfile: "balanced",
    };
  } catch {
    return { bankroll: null, kellyFraction: null, riskProfile: "balanced" };
  }
}

// ── Active picks ─────────────────────────────────────────────────────────────

export function getActivePicks(maxPicks = 10): ActivePick[] {
  const allPicks: ActivePick[] = [];
  for (const sport of SPORTS) {
    try {
      const cache = getPrecomputedCache(sport as any);
      if (!cache?.picks) continue;
      const topForSport = cache.picks
        .filter((p: any) => p.grade === "A" || p.grade === "B")
        .slice(0, 3)
        .map((p: any) => ({
          pick: p.pick ?? "Unknown",
          sport: p.sport ?? sport,
          grade: p.grade ?? "C",
          odds: Number(p.odds ?? 0),
          confidence: Number(p.confidence ?? 0),
          ev: p.ev != null ? Number(p.ev) : null,
          kellyFraction: p.kellyFraction != null ? Number(p.kellyFraction) : null,
          edge: p.edge != null ? Number(p.edge) : null,
          betType: p.betType ?? "moneyline",
          impliedProbability: p.odds ? (
            p.odds > 0
              ? 100 / (Number(p.odds) + 100)
              : Math.abs(Number(p.odds)) / (Math.abs(Number(p.odds)) + 100)
          ) : null,
        }));
      allPicks.push(...topForSport);
    } catch { /* skip sport */ }
  }
  return allPicks.slice(0, maxPicks);
}

// ── Main context builder ──────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 8000;

export async function buildAnalystContext(
  userId: string | undefined,
  messages: { role: string; content: string }[],
): Promise<AnalystContextResult> {

  // 1. Standards context (platform rules and terminology)
  const standardsContext = getAIStandardsContext();

  // 2. Calibration block (sport accuracy + confidence tiers + trend)
  let calibrationBlock = "Calibration data: Initializing — insufficient settled picks to report.";
  try {
    const tr = getTrackRecord();
    const lines: string[] = [];

    if (tr.hasMinimumData && tr.overallWinRate != null) {
      lines.push(`Overall win rate: ${tr.overallWinRate.toFixed(1)}% (${tr.wonPicks}W / ${tr.lostPicks}L / ${tr.pushPicks}P across ${tr.settledPicks} settled picks)`);
      lines.push(`Trend (last 20): ${tr.recentTrend.last20WinRate != null ? tr.recentTrend.last20WinRate.toFixed(1) + "%" : "N/A"} — ${tr.recentTrend.trend}`);
      lines.push(`Calibration score: ${tr.calibrationScore ?? "N/A"}/100`);

      const sportLines = tr.bySport
        .filter(s => s.actualWinRate != null && s.settled >= 5)
        .sort((a, b) => (b.actualWinRate ?? 0) - (a.actualWinRate ?? 0))
        .map(s => `  ${s.sport}: ${(s.actualWinRate ?? 0).toFixed(1)}% (${s.settled} settled, ${s.won}W/${s.lost}L)`)
        .join("\n");
      if (sportLines) lines.push("Win rate by sport:\n" + sportLines);

      const gradeLines = tr.byGrade
        .filter(g => g.actualWinRate != null && g.settled >= 3)
        .sort((a, b) => a.grade.localeCompare(b.grade))
        .map(g => {
          const roi = g.roi != null ? ` | ROI: ${g.roi > 0 ? "+" : ""}${g.roi.toFixed(1)}%` : "";
          const beRate = g.breakEvenRate != null ? ` | Break-even: ${g.breakEvenRate.toFixed(1)}%` : "";
          return `  Grade ${g.grade}: ${(g.actualWinRate ?? 0).toFixed(1)}% win rate (${g.settled} settled${roi}${beRate})`;
        })
        .join("\n");
      if (gradeLines) lines.push("Win rate by grade:\n" + gradeLines);

      const tierLines = tr.calibrationTiers
        .filter(t => t.settled >= 5 && t.actualWinRate != null)
        .map(t => {
          const gap = t.calibrationGap != null ? ` | Gap: ${t.calibrationGap > 0 ? "+" : ""}${t.calibrationGap.toFixed(1)}pp` : "";
          return `  Confidence ${t.label}: Model avg ${t.modelAvgConfidence.toFixed(0)}% → Actual ${(t.actualWinRate ?? 0).toFixed(1)}%${gap}`;
        })
        .join("\n");
      if (tierLines) lines.push("Confidence tier calibration:\n" + tierLines);
    } else {
      lines.push(`Track record building: ${tr.settledPicks} of ${tr.minimumPicksRequired} minimum settled picks required for validation.`);
    }

    calibrationBlock = lines.join("\n");
  } catch { /* use default */ }

  // 3. Active picks block (top graded picks with EV / Kelly / confidence)
  let activePicsBlock = "No picks loaded in current prediction cycle.";
  try {
    const picks = getActivePicks(10);
    if (picks.length > 0) {
      const lines = picks.map(p => {
        const ev = p.ev != null ? ` | EV: ${p.ev > 0 ? "+" : ""}${p.ev.toFixed(1)}%` : "";
        const kelly = p.kellyFraction != null ? ` | Quarter-Kelly stake: ${(p.kellyFraction * 0.25 * 100).toFixed(2)}%` : "";
        const edge = p.edge != null ? ` | Edge: ${p.edge > 0 ? "+" : ""}${p.edge.toFixed(1)}%` : "";
        const impliedProb = p.impliedProbability != null ? ` | Implied: ${(p.impliedProbability * 100).toFixed(1)}%` : "";
        const conf = ` | Conf: ${p.confidence}%`;
        const odds = `${p.odds > 0 ? "+" : ""}${p.odds}`;
        return `• [${p.grade}] ${p.pick} (${p.sport}, ${p.betType}, ${odds}${conf}${ev}${edge}${kelly}${impliedProb})`;
      });
      activePicsBlock = "Today's top-graded active picks (A/B grade only):\n" + lines.join("\n");
    }
  } catch { /* use default */ }

  // 4. Bankroll block
  let bankrollBlock = "Bankroll profile: Not set. Recommend using Quarter-Kelly (≤2.5% of bankroll per bet) as default sizing.";
  try {
    const { bankroll, kellyFraction } = await fetchUserBankroll(userId);
    if (bankroll != null) {
      const qKellyPct = kellyFraction != null ? (kellyFraction * 0.25 * 100).toFixed(2) : "≤2.5";
      const quarterKellyDollar = bankroll * (kellyFraction != null ? kellyFraction * 0.25 : 0.025);
      bankrollBlock =
        `User bankroll: $${bankroll.toFixed(0)}. ` +
        `Kelly fraction: ${kellyFraction != null ? (kellyFraction * 100).toFixed(2) : "default"}%. ` +
        `Quarter-Kelly stake recommendation: ${qKellyPct}% = $${quarterKellyDollar.toFixed(2)} per bet. ` +
        `Never exceed 2–3% of bankroll on any single bet.`;
    }
  } catch { /* use default */ }

  // 5. Parlay joint probability injection
  const { isParlay, legCount } = detectParlayQuery(messages);
  if (isParlay && legCount && legCount >= 2) {
    const picks = getActivePicks(legCount);
    if (picks.length >= legCount) {
      const probs = picks.slice(0, legCount).map(p =>
        p.impliedProbability ?? (p.confidence / 100)
      );
      const { formattedWarning } = computeJointProbability(probs);
      activePicsBlock += `\n\nParlay joint probability warning:\n${formattedWarning}`;
    } else {
      // Generic parlay warning when we can't compute from specific picks
      const defaultProb = 0.65; // typical model confidence for A/B picks
      const probs = Array(legCount).fill(defaultProb);
      const { formattedWarning } = computeJointProbability(probs);
      activePicsBlock += `\n\nParlay joint probability warning (assuming ~65% per leg):\n${formattedWarning}`;
    }
  }

  const totalChars = standardsContext.length + calibrationBlock.length + activePicsBlock.length + bankrollBlock.length;

  return { standardsContext, calibrationBlock, activePicsBlock, bankrollBlock, totalChars };
}

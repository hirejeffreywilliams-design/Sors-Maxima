// ═══════════════════════════════════════════════════════════════════════════
// SORS MAXIMA — AI ANALYST CONTEXT BUILDER
// Assembles a token-budgeted context object for the /api/ai/analyst endpoint.
// Includes: calibration by sport + confidence tier, today's top picks with
// edge/EV/computed-Kelly/confidence, track record, bankroll profile, and platform standards.
// ═══════════════════════════════════════════════════════════════════════════

import { getTrackRecord } from "./calibrationEngine";
import { getPrecomputedCache, type PrecomputedPick } from "./precomputedPredictionsEngine";
import { getAIStandardsContext } from "./companyStandards";
import { db } from "./db";
import { sql } from "drizzle-orm";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAB"] as const;
type Sport = typeof SPORTS[number];

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
  ev: number;
  kellyFraction: number;
  edge: number;
  betType: string;
  impliedProbability: number;
}

// Drizzle execute() rows shape
interface BankrollRow {
  bankroll: string | number | null;
  kelly_fraction: string | number | null;
}

// ── Kelly criterion helper ────────────────────────────────────────────────

function americanOddsToDecimal(americanOdds: number): number {
  return americanOdds > 0 ? 1 + americanOdds / 100 : 1 + 100 / Math.abs(americanOdds);
}

function computeKellyFromPick(p: PrecomputedPick): number {
  const b = americanOddsToDecimal(p.odds) - 1;
  const q = 1 - p.winProbability;
  const kelly = (b * p.winProbability - q) / b;
  return Math.max(0, kelly);
}

// ── Joint Probability ───────────────────────────────────────────────────────

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

export function detectParlayQuery(messages: { role: string; content: string }[]): {
  isParlay: boolean;
  legCount: number | null;
} {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return { isParlay: false, legCount: null };

  const lc = lastUser.content.toLowerCase();
  const isParlay = /parlay|teaser|accumulator|multi.?leg|same.?game|sgp/.test(lc);
  if (!isParlay) return { isParlay: false, legCount: null };

  const legMatch = lc.match(/(\d+).{0,5}leg/);
  const legCount = legMatch ? parseInt(legMatch[1]) : null;
  return { isParlay: true, legCount };
}

// ── Bankroll fetcher ────────────────────────────────────────────────────────

export async function fetchUserBankroll(userId: string | undefined): Promise<{
  bankroll: number | null;
  kellyFraction: number | null;
}> {
  if (!userId) return { bankroll: null, kellyFraction: null };
  try {
    const result = await db.execute(sql`
      SELECT bankroll, kelly_fraction
      FROM user_betting_profile
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    const rows = (result.rows ?? result) as BankrollRow[];
    const row = rows[0];
    if (!row) return { bankroll: null, kellyFraction: null };
    return {
      bankroll: row.bankroll != null ? Number(row.bankroll) : null,
      kellyFraction: row.kelly_fraction != null ? Number(row.kelly_fraction) : null,
    };
  } catch {
    return { bankroll: null, kellyFraction: null };
  }
}

// ── Active picks ─────────────────────────────────────────────────────────────

export function getActivePicks(maxPicks = 10): ActivePick[] {
  const allPicks: ActivePick[] = [];
  for (const sport of SPORTS) {
    try {
      const cache = getPrecomputedCache(sport as Sport);
      if (!cache?.picks) continue;
      const topForSport = (cache.picks as PrecomputedPick[])
        .filter(p => p.grade === "A" || p.grade === "B")
        .slice(0, 3)
        .map(p => {
          const impliedProbability = p.odds > 0
            ? 100 / (p.odds + 100)
            : Math.abs(p.odds) / (Math.abs(p.odds) + 100);
          const kellyFraction = computeKellyFromPick(p);
          return {
            pick: p.pick,
            sport: p.sport,
            grade: p.grade,
            odds: p.odds,
            confidence: p.confidence,
            ev: p.ev,
            kellyFraction,
            edge: p.edge,
            betType: p.betType,
            impliedProbability,
          };
        });
      allPicks.push(...topForSport);
    } catch { /* skip sport on error */ }
  }
  return allPicks.slice(0, maxPicks);
}

// ── Main context builder ──────────────────────────────────────────────────────

export async function buildAnalystContext(
  userId: string | undefined,
  messages: { role: string; content: string }[],
): Promise<AnalystContextResult> {

  // 1. Standards context
  const standardsContext = getAIStandardsContext();

  // 2. Calibration block (sport accuracy + confidence tiers + trend)
  let calibrationBlock = "Calibration data: Initializing — insufficient settled picks to report.";
  try {
    const tr = getTrackRecord();
    const lines: string[] = [];

    if (tr.hasMinimumData && tr.overallWinRate != null) {
      lines.push(
        `Overall win rate: ${tr.overallWinRate.toFixed(1)}% ` +
        `(${tr.wonPicks}W / ${tr.lostPicks}L / ${tr.pushPicks}P across ${tr.settledPicks} settled picks)`
      );
      const last20 = tr.recentTrend.last20WinRate != null
        ? `${tr.recentTrend.last20WinRate.toFixed(1)}%` : "N/A";
      lines.push(`Trend (last 20): ${last20} — ${tr.recentTrend.trend}`);
      if (tr.calibrationScore != null) lines.push(`Calibration score: ${tr.calibrationScore}/100`);

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
          const be = g.breakEvenRate != null ? ` | Break-even: ${g.breakEvenRate.toFixed(1)}%` : "";
          return `  Grade ${g.grade}: ${(g.actualWinRate ?? 0).toFixed(1)}% win rate (${g.settled} settled${roi}${be})`;
        })
        .join("\n");
      if (gradeLines) lines.push("Win rate by grade:\n" + gradeLines);

      const tierLines = tr.calibrationTiers
        .filter(t => t.settled >= 5 && t.actualWinRate != null)
        .map(t => {
          const gap = t.calibrationGap != null
            ? ` | Gap: ${t.calibrationGap > 0 ? "+" : ""}${t.calibrationGap.toFixed(1)}pp` : "";
          return (
            `  Confidence ${t.label}: Model avg ${t.modelAvgConfidence.toFixed(0)}% ` +
            `→ Actual ${(t.actualWinRate ?? 0).toFixed(1)}%${gap}`
          );
        })
        .join("\n");
      if (tierLines) lines.push("Confidence tier calibration:\n" + tierLines);

    } else {
      lines.push(
        `Track record building: ${tr.settledPicks} of ${tr.minimumPicksRequired} ` +
        `minimum settled picks required for validation.`
      );
    }
    calibrationBlock = lines.join("\n");
  } catch { /* use default */ }

  // 3. Active picks block
  let activePicsBlock = "No picks loaded in current prediction cycle.";
  try {
    const picks = getActivePicks(10);
    if (picks.length > 0) {
      const lines = picks.map(p => {
        const oddsStr = `${p.odds > 0 ? "+" : ""}${p.odds}`;
        const ev = `EV: ${p.ev > 0 ? "+" : ""}${p.ev.toFixed(1)}%`;
        const kelly = `Quarter-Kelly stake: ${(p.kellyFraction * 0.25 * 100).toFixed(2)}%`;
        const edge = `Edge: ${p.edge > 0 ? "+" : ""}${p.edge.toFixed(1)}%`;
        const impliedProb = `Implied: ${(p.impliedProbability * 100).toFixed(1)}%`;
        const conf = `Conf: ${p.confidence}%`;
        return `• [${p.grade}] ${p.pick} (${p.sport}, ${p.betType}, ${oddsStr} | ${conf} | ${ev} | ${edge} | ${kelly} | ${impliedProb})`;
      });
      activePicsBlock = "Today's top-graded active picks (A/B grade only):\n" + lines.join("\n");
    }
  } catch { /* use default */ }

  // 4. Parlay joint probability injection — triggered for ANY parlay query
  const { isParlay, legCount } = detectParlayQuery(messages);
  if (isParlay) {
    const picks = getActivePicks(legCount ?? 3);
    const resolvedLegCount = legCount ?? 3;
    const usablePicks = picks.slice(0, resolvedLegCount);

    if (usablePicks.length >= resolvedLegCount) {
      const probs = usablePicks.map(p => p.impliedProbability);
      const { formattedWarning } = computeJointProbability(probs);
      activePicsBlock += `\n\nParlay joint probability warning:\n${formattedWarning}`;
    } else {
      // Generic warning when picks are fewer than requested legs
      const defaultProb = 0.63;
      const probs = Array(resolvedLegCount).fill(defaultProb);
      const { formattedWarning } = computeJointProbability(probs);
      activePicsBlock += `\n\nParlay joint probability warning (using ~63% per leg as default):\n${formattedWarning}`;
    }
  }

  // 5. Bankroll block
  let bankrollBlock =
    "Bankroll profile: Not set. Default sizing: Quarter-Kelly (≤2.5% of bankroll per bet).";
  try {
    const { bankroll, kellyFraction } = await fetchUserBankroll(userId);
    if (bankroll != null) {
      const kf = kellyFraction ?? 0.1;
      const qKellyPct = (kf * 0.25 * 100).toFixed(2);
      const qKellyDollar = (bankroll * kf * 0.25).toFixed(2);
      bankrollBlock =
        `User bankroll: $${bankroll.toFixed(0)}. ` +
        `Kelly fraction setting: ${(kf * 100).toFixed(2)}%. ` +
        `Quarter-Kelly recommendation: ${qKellyPct}% = $${qKellyDollar} per bet. ` +
        `Never exceed 2–3% of bankroll on any single bet.`;
    }
  } catch { /* use default */ }

  // 6. Token budget enforcement
  // GPT-4o: ~4 chars per token. Hard cap at 6000 chars for the dynamic blocks
  // (excludes standardsContext which is always included).
  const DYNAMIC_CHAR_BUDGET = 6000;
  const charCount = calibrationBlock.length + activePicsBlock.length + bankrollBlock.length;
  if (charCount > DYNAMIC_CHAR_BUDGET) {
    // Truncate activePicsBlock first (most verbose), then calibration
    const overrun = charCount - DYNAMIC_CHAR_BUDGET;
    if (activePicsBlock.length > overrun + 200) {
      activePicsBlock = activePicsBlock.slice(0, activePicsBlock.length - overrun) + "\n[...context truncated for token budget]";
    } else {
      activePicsBlock = activePicsBlock.slice(0, Math.max(200, activePicsBlock.length - overrun));
      calibrationBlock = calibrationBlock.slice(0, Math.max(200, calibrationBlock.length - 200));
    }
  }

  const totalChars = standardsContext.length + calibrationBlock.length +
    activePicsBlock.length + bankrollBlock.length;

  return { standardsContext, calibrationBlock, activePicsBlock, bankrollBlock, totalChars };
}

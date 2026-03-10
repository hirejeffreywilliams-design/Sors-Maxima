/**
 * Smart Retention Sequence Engine™
 *
 * Runs hourly and automatically fires the right email at the right time
 * to maximize trial conversion, reduce churn, and recover cancelled members.
 *
 * Sequences:
 *   TRIAL_DAY_3   → "You're ahead of 90% of bettors" — feature education
 *   TRIAL_DAY_5   → "2 days left — here's what you'd be leaving behind"
 *   TRIAL_DAY_7   → "Last chance — trial expires today"
 *   WIN_BACK      → 30-day post-cancellation with promo code
 *   UPGRADE_NUDGE → Sharp → Edge upgrade offer after 90 days
 */

import { stripeService } from "./stripeService";
import {
  sendTrialDay3Email,
  sendTrialDay5Email,
  sendTrialLastDayEmail,
  sendWinBackEmail,
  sendUpgradeNudgeEmail,
} from "./emailService";
import { logInfo, logWarn } from "./errorLogger";
import { pool } from "./db";

// ── State tracking (in-memory, no DB schema changes) ─────────────────────────
// Tracks which sequences have been sent to avoid duplicates across cycles
const sentSequences = new Set<string>(); // Format: `${username}:${sequenceType}`
let totalEmailsSent  = 0;
let totalTrialConverts = 0;
let lastRunAt: string | null = null;

// ── Campaign launch log (for admin one-click tracking) ───────────────────────
export interface CampaignLaunchRecord {
  id: string;
  type: string;
  label: string;
  targetCount: number;
  sentCount: number;
  launchedAt: string;
  launchedBy: string;
  status: "completed" | "partial" | "failed";
}
const campaignLog: CampaignLaunchRecord[] = [];

export function getCampaignLog(): CampaignLaunchRecord[] {
  return campaignLog.slice().reverse();
}

function logCampaign(record: CampaignLaunchRecord): void {
  campaignLog.push(record);
  if (campaignLog.length > 50) campaignLog.shift();
}

// ── Sequence key builder ──────────────────────────────────────────────────────
function seqKey(username: string, type: string): string {
  return `${username}:${type}`;
}
function sent(username: string, type: string): boolean {
  return sentSequences.has(seqKey(username, type));
}
function markSent(username: string, type: string): void {
  sentSequences.add(seqKey(username, type));
}

// ── Helper: days since a timestamp ───────────────────────────────────────────
function daysSince(isoDate: string | null): number {
  if (!isoDate) return -1;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function daysRemaining(isoDate: string | null): number {
  if (!isoDate) return -1;
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Helper: get user email from DB ────────────────────────────────────────────
async function getUserEmail(username: string): Promise<string | null> {
  try {
    const result = await pool.query("SELECT email FROM users WHERE username = $1", [username]);
    return result.rows[0]?.email || null;
  } catch { return null; }
}

// ── Main cycle ────────────────────────────────────────────────────────────────
async function runRetentionCycle(): Promise<void> {
  try {
    const allSubs = await stripeService.getAllSubscriptions();
    let emailsSentThisCycle = 0;

    for (const sub of allSubs) {
      const { username } = sub;
      const email = await getUserEmail(username);
      if (!email) continue;

      // ── Trial Sequences ────────────────────────────────────────────────────
      if (sub.subscriptionStatus === "trialing" && sub.trialEndDate) {
        const daysLeft = daysRemaining(sub.trialEndDate);
        const daysIn   = daysSince(sub.trialStartDate);

        // Day 3 check-in (days 2-4 in trial, not yet sent)
        if (daysIn >= 2 && daysIn <= 4 && !sent(username, "trial_day3")) {
          const ok = await sendTrialDay3Email(email, username);
          if (ok) { markSent(username, "trial_day3"); emailsSentThisCycle++; totalEmailsSent++; }
        }

        // Day 5 urgency (2 days left, not yet sent)
        if (daysLeft <= 2 && daysLeft > 1 && !sent(username, "trial_day5")) {
          const ok = await sendTrialDay5Email(email, username);
          if (ok) { markSent(username, "trial_day5"); emailsSentThisCycle++; totalEmailsSent++; }
        }

        // Last day (≤1 day left, not yet sent)
        if (daysLeft <= 1 && daysLeft >= 0 && !sent(username, "trial_last_day")) {
          const ok = await sendTrialLastDayEmail(email, username);
          if (ok) { markSent(username, "trial_last_day"); emailsSentThisCycle++; totalEmailsSent++; }
        }
      }

      // ── Win-Back Sequence ──────────────────────────────────────────────────
      if (sub.subscriptionStatus === "cancelled") {
        // Use registeredAt as a proxy (we don't have cancellation date in the interface)
        const daysSinceRegister = daysSince(sub.registeredAt);
        if (daysSinceRegister >= 25 && !sent(username, "win_back")) {
          const promoCode = `BACK${username.toUpperCase().slice(0, 4)}30`;
          const ok = await sendWinBackEmail(email, username, promoCode);
          if (ok) { markSent(username, "win_back"); emailsSentThisCycle++; totalEmailsSent++; }
        }
      }

      // ── Upgrade Nudge: Sharp → Edge ────────────────────────────────────────
      if (sub.subscriptionTier === "pro" && sub.subscriptionStatus === "active") {
        const daysOnSharp = daysSince(sub.registeredAt || null);
        if (daysOnSharp >= 90 && !sent(username, "upgrade_nudge")) {
          const ok = await sendUpgradeNudgeEmail(email, username);
          if (ok) { markSent(username, "upgrade_nudge"); emailsSentThisCycle++; totalEmailsSent++; }
        }
      }
    }

    lastRunAt = new Date().toISOString();
    if (emailsSentThisCycle > 0) {
      logInfo(`[RetentionEngine] Cycle complete — ${emailsSentThisCycle} emails sent (${totalEmailsSent} total)`);
    }
  } catch (err) {
    logWarn(`[RetentionEngine] Cycle error: ${String(err)}`);
  }
}

// ── Admin-triggered one-click campaigns ──────────────────────────────────────

export async function launchTrialEndingCampaign(launchedBy: string): Promise<CampaignLaunchRecord> {
  const allSubs = await stripeService.getAllSubscriptions();
  const targets = allSubs.filter(s => s.subscriptionStatus === "trialing" && daysRemaining(s.trialEndDate) <= 3);
  let sent_count = 0;
  for (const sub of targets) {
    const email = await getUserEmail(sub.username);
    if (!email) continue;
    const daysLeft = daysRemaining(sub.trialEndDate);
    const ok = daysLeft <= 1
      ? await sendTrialLastDayEmail(email, sub.username)
      : await sendTrialDay5Email(email, sub.username);
    if (ok) sent_count++;
  }
  const record: CampaignLaunchRecord = {
    id: crypto.randomUUID(), type: "trial_ending", label: "Trial Ending Reminder",
    targetCount: targets.length, sentCount: sent_count, launchedAt: new Date().toISOString(),
    launchedBy, status: sent_count === targets.length ? "completed" : sent_count > 0 ? "partial" : "failed",
  };
  logCampaign(record);
  return record;
}

export async function launchWinBackCampaign(launchedBy: string): Promise<CampaignLaunchRecord> {
  const allSubs = await stripeService.getAllSubscriptions();
  const targets = allSubs.filter(s => s.subscriptionStatus === "cancelled");
  let sent_count = 0;
  for (const sub of targets) {
    const email = await getUserEmail(sub.username);
    if (!email) continue;
    const promoCode = `BACK${sub.username.toUpperCase().slice(0, 4)}30`;
    const ok = await sendWinBackEmail(email, sub.username, promoCode);
    if (ok) sent_count++;
  }
  const record: CampaignLaunchRecord = {
    id: crypto.randomUUID(), type: "win_back", label: "Win-Back Campaign (30% off)",
    targetCount: targets.length, sentCount: sent_count, launchedAt: new Date().toISOString(),
    launchedBy, status: sent_count === targets.length ? "completed" : sent_count > 0 ? "partial" : "failed",
  };
  logCampaign(record);
  return record;
}

export async function launchUpgradeNudgeCampaign(launchedBy: string): Promise<CampaignLaunchRecord> {
  const allSubs = await stripeService.getAllSubscriptions();
  const targets = allSubs.filter(s => s.subscriptionTier === "pro" && s.subscriptionStatus === "active");
  let sent_count = 0;
  for (const sub of targets) {
    const email = await getUserEmail(sub.username);
    if (!email) continue;
    const ok = await sendUpgradeNudgeEmail(email, sub.username);
    if (ok) sent_count++;
  }
  const record: CampaignLaunchRecord = {
    id: crypto.randomUUID(), type: "upgrade_nudge", label: "Sharp → Edge Upgrade Nudge",
    targetCount: targets.length, sentCount: sent_count, launchedAt: new Date().toISOString(),
    launchedBy, status: sent_count === targets.length ? "completed" : sent_count > 0 ? "partial" : "failed",
  };
  logCampaign(record);
  return record;
}

export async function launchWelcomeCampaign(launchedBy: string): Promise<CampaignLaunchRecord> {
  const { sendWelcomeEmail } = await import("./emailService");
  const allSubs = await stripeService.getAllSubscriptions();
  const targets = allSubs.filter(s => s.subscriptionStatus === "trialing");
  let sent_count = 0;
  for (const sub of targets) {
    const email = await getUserEmail(sub.username);
    if (!email) continue;
    const ok = await sendWelcomeEmail(email, sub.username, "Edge");
    if (ok) sent_count++;
  }
  const record: CampaignLaunchRecord = {
    id: crypto.randomUUID(), type: "welcome", label: "Welcome Sequence (Trial Users)",
    targetCount: targets.length, sentCount: sent_count, launchedAt: new Date().toISOString(),
    launchedBy, status: sent_count === targets.length ? "completed" : sent_count > 0 ? "partial" : "failed",
  };
  logCampaign(record);
  return record;
}

// ── Status export ─────────────────────────────────────────────────────────────
export function getRetentionEngineStatus() {
  return {
    totalEmailsSent,
    sequencesSent: sentSequences.size,
    lastRunAt,
    campaignLog: getCampaignLog().slice(0, 10),
  };
}

// ── Startup ───────────────────────────────────────────────────────────────────
let _started = false;
export function startRetentionSequenceEngine(): void {
  if (_started) return;
  _started = true;
  // First run after 2 minutes to avoid startup contention
  setTimeout(() => {
    runRetentionCycle();
    setInterval(runRetentionCycle, 60 * 60 * 1000); // every 1 hour
  }, 2 * 60 * 1000);
  logInfo("[RetentionEngine] Smart Retention Sequence Engine™ started — hourly cycle active");
}

/**
 * Pick Snapshot Store
 *
 * Phase 2: Tracks first-seen metric values for each pick (by ID + date),
 * computing confidence deltas, edge deltas, and sharp money shifts.
 *
 * Phase 3: Detects tier upgrades/downgrades between the first-seen snapshot
 * and the current state, producing upgrade badges and explanatory reasons.
 *
 * All snapshots reset daily (date-keyed) so metrics don't carry over
 * to the next day's picks.
 */

export interface PickMetrics {
  confidence: number;
  confidenceTier: string;
  sharpMoney: number;
  edge: number;
  modelAgreement: number;
  timestamp: number;
}

export interface PickDeltas {
  confidenceDelta: number;
  edgeDelta: number;
  sharpMoneyDelta: number;
  modelAgreementDelta: number;
  tierChanged: boolean;
  wasUpgraded: boolean;
  wasDowngraded: boolean;
  upgradeReason: string | null;
  downgradeReason: string | null;
  signalStrengthened: boolean;
  minutesSinceFirstSeen: number;
}

// ── Tier Ordering ────────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = {
  VALUE: 1,
  LEAN: 2,
  STRONG: 3,
  LOCK: 4,
};

function tierRank(tier: string): number {
  return TIER_ORDER[tier] ?? 0;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const snapshots = new Map<string, PickMetrics>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function snapshotKey(pickId: string): string {
  return `${pickId}::${today()}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record the first-seen snapshot for a pick. Subsequent calls for the same
 * pick on the same calendar day are no-ops — we preserve the original state.
 */
export function recordSnapshot(pickId: string, metrics: PickMetrics): void {
  const key = snapshotKey(pickId);
  if (!snapshots.has(key)) {
    snapshots.set(key, { ...metrics });
  }
}

/**
 * Retrieve the stored snapshot for a pick (today only).
 * Returns undefined if the pick has not been seen before today.
 */
export function getSnapshot(pickId: string): PickMetrics | undefined {
  return snapshots.get(snapshotKey(pickId));
}

/**
 * Compute deltas between the current metrics and the first-seen snapshot.
 * Returns null if there is no prior snapshot (pick is being seen for the
 * first time — nothing to compare against yet).
 */
export function computeDeltas(pickId: string, current: PickMetrics): PickDeltas | null {
  const snapshot = snapshots.get(snapshotKey(pickId));
  if (!snapshot) return null;

  const confidenceDelta = Math.round((current.confidence - snapshot.confidence) * 10) / 10;
  const edgeDelta = Math.round((current.edge - snapshot.edge) * 10) / 10;
  const sharpMoneyDelta = Math.round(current.sharpMoney - snapshot.sharpMoney);
  const modelAgreementDelta = current.modelAgreement - snapshot.modelAgreement;
  const currentTierRank = tierRank(current.confidenceTier);
  const snapshotTierRank = tierRank(snapshot.confidenceTier);
  const tierChanged = current.confidenceTier !== snapshot.confidenceTier;
  const wasUpgraded = currentTierRank > snapshotTierRank;
  const wasDowngraded = currentTierRank < snapshotTierRank;
  const minutesSinceFirstSeen = Math.round((current.timestamp - snapshot.timestamp) / 60000);

  // Signal strengthened = confidence improved significantly without a full tier change
  const signalStrengthened = !wasUpgraded && (
    confidenceDelta >= 5 ||
    edgeDelta >= 2 ||
    sharpMoneyDelta >= 8
  );

  // Build upgrade reason
  let upgradeReason: string | null = null;
  if (wasUpgraded) {
    const reasons: string[] = [];
    if (confidenceDelta >= 5) reasons.push(`confidence up ${confidenceDelta}%`);
    if (sharpMoneyDelta >= 6) reasons.push(`sharp money increased ${sharpMoneyDelta}%`);
    if (edgeDelta >= 1.5) reasons.push(`edge grew +${edgeDelta}%`);
    if (modelAgreementDelta >= 1) reasons.push(`${modelAgreementDelta} more model${modelAgreementDelta > 1 ? "s" : ""} now agree`);
    upgradeReason = reasons.length > 0
      ? `Upgraded ${snapshot.confidenceTier} → ${current.confidenceTier}: ${reasons.join(", ")}`
      : `Upgraded ${snapshot.confidenceTier} → ${current.confidenceTier}`;
  } else if (signalStrengthened) {
    const reasons: string[] = [];
    if (confidenceDelta >= 5) reasons.push(`confidence +${confidenceDelta}%`);
    if (sharpMoneyDelta >= 8) reasons.push(`sharp money +${sharpMoneyDelta}%`);
    if (edgeDelta >= 2) reasons.push(`edge +${edgeDelta}%`);
    upgradeReason = `Signal strengthened: ${reasons.join(", ")}`;
  }

  // Build downgrade reason
  let downgradeReason: string | null = null;
  if (wasDowngraded) {
    const reasons: string[] = [];
    if (confidenceDelta <= -5) reasons.push(`confidence down ${Math.abs(confidenceDelta)}%`);
    if (sharpMoneyDelta <= -6) reasons.push(`sharp money dropped ${Math.abs(sharpMoneyDelta)}%`);
    if (edgeDelta <= -1.5) reasons.push(`edge shrank ${Math.abs(edgeDelta)}%`);
    downgradeReason = reasons.length > 0
      ? `Revised down ${snapshot.confidenceTier} → ${current.confidenceTier}: ${reasons.join(", ")}`
      : `Revised down ${snapshot.confidenceTier} → ${current.confidenceTier}`;
  }

  return {
    confidenceDelta,
    edgeDelta,
    sharpMoneyDelta,
    modelAgreementDelta,
    tierChanged,
    wasUpgraded,
    wasDowngraded,
    upgradeReason,
    downgradeReason,
    signalStrengthened,
    minutesSinceFirstSeen,
  };
}

/**
 * Record + immediately compute deltas in one call.
 * If the pick is new (first seen), records and returns null.
 * If already seen today, returns the delta object.
 */
export function trackAndDiff(pickId: string, current: PickMetrics): PickDeltas | null {
  const existing = snapshots.get(snapshotKey(pickId));
  if (!existing) {
    recordSnapshot(pickId, current);
    return null;
  }
  return computeDeltas(pickId, current);
}

/**
 * Clear stale snapshots from previous calendar days to prevent memory bloat.
 * Call this once on server startup or via a daily cron.
 */
export function purgeStaleSnapshots(): number {
  const prefix = today();
  let removed = 0;
  for (const key of snapshots.keys()) {
    if (!key.endsWith(`::${prefix}`)) {
      snapshots.delete(key);
      removed++;
    }
  }
  return removed;
}

// Purge stale snapshots on module load
purgeStaleSnapshots();

import crypto from "crypto";

interface TailRecord {
  username: string;
  tailedAt: string;
  tier: string;
}

interface PickTailData {
  pickId: string;
  tails: TailRecord[];
  createdAt: string;
}

const pickTails = new Map<string, PickTailData>();

const CAPACITY_BY_TIER: Record<string, number> = {
  whale: Infinity,
  elite: 200,
  pro: 100,
  free: 50,
};

const PICK_VISIBILITY_BY_TIER: Record<string, number> = {
  whale: 1.0,
  elite: 0.8,
  pro: 0.6,
  free: 0.15,
};

const RELEASE_DELAY_MINUTES: Record<string, number> = {
  whale: 0,
  elite: 15,
  pro: 30,
  free: 60,
};

export function getCapacityStatus(pickId: string, userTier: string): {
  tailCount: number;
  capacityStatus: "available" | "filling" | "diminished";
  tailersRemaining: number;
  capacityLimit: number;
} {
  const data = pickTails.get(pickId);
  const totalTails = data?.tails.length || 0;
  const cap = CAPACITY_BY_TIER[userTier] || CAPACITY_BY_TIER.free;

  let capacityStatus: "available" | "filling" | "diminished" = "available";
  if (totalTails >= cap) {
    capacityStatus = "diminished";
  } else if (totalTails >= cap * 0.7) {
    capacityStatus = "filling";
  }

  return {
    tailCount: totalTails,
    capacityStatus,
    tailersRemaining: Math.max(0, cap - totalTails),
    capacityLimit: cap === Infinity ? -1 : cap,
  };
}

export function recordTail(pickId: string, username: string, tier: string): {
  success: boolean;
  message: string;
  capacityStatus: "available" | "filling" | "diminished";
} {
  if (!pickTails.has(pickId)) {
    pickTails.set(pickId, { pickId, tails: [], createdAt: new Date().toISOString() });
  }

  const data = pickTails.get(pickId)!;
  const already = data.tails.find(t => t.username === username);
  if (already) {
    return { success: true, message: "Already tailed", capacityStatus: getCapacityStatus(pickId, tier).capacityStatus };
  }

  const cap = CAPACITY_BY_TIER[tier] || CAPACITY_BY_TIER.free;
  if (data.tails.length >= cap) {
    return { success: false, message: "Pick capacity reached for your tier", capacityStatus: "diminished" };
  }

  data.tails.push({ username, tailedAt: new Date().toISOString(), tier });
  const status = getCapacityStatus(pickId, tier);
  console.log(`[PickProtection] ${username} tailed pick ${pickId} (${data.tails.length} total tails)`);
  return { success: true, message: "Tail recorded", capacityStatus: status.capacityStatus };
}

export function getReleaseDelayMinutes(tier: string): number {
  return RELEASE_DELAY_MINUTES[tier] ?? RELEASE_DELAY_MINUTES.free;
}

export function getVisibilityRatio(tier: string): number {
  return PICK_VISIBILITY_BY_TIER[tier] ?? PICK_VISIBILITY_BY_TIER.free;
}

export function isPickReleasedForTier(generatedAt: string, tier: string): boolean {
  const genTime = new Date(generatedAt).getTime();
  const delayMs = getReleaseDelayMinutes(tier) * 60 * 1000;
  return Date.now() >= genTime + delayMs;
}

export function getPickReleaseTime(generatedAt: string, tier: string): string {
  const genTime = new Date(generatedAt).getTime();
  const delayMs = getReleaseDelayMinutes(tier) * 60 * 1000;
  return new Date(genTime + delayMs).toISOString();
}

export function diversifyPicksForUser(
  picks: any[],
  username: string,
  tier: string,
): any[] {
  const ratio = getVisibilityRatio(tier);

  if (ratio >= 1.0) return picks;

  const targetCount = Math.max(3, Math.ceil(picks.length * ratio));
  if (picks.length <= targetCount) return picks;

  const dateKey = new Date().toISOString().split("T")[0];
  const seed = hashString(`${username}-${dateKey}`);

  const indexed = picks.map((p, i) => ({ pick: p, originalIndex: i, score: deterministicScore(seed, i) }));
  indexed.sort((a, b) => {
    const aIsTop = a.originalIndex < 3 ? 1 : 0;
    const bIsTop = b.originalIndex < 3 ? 1 : 0;
    if (aIsTop !== bIsTop) return bIsTop - aIsTop;
    return b.score - a.score;
  });

  return indexed.slice(0, targetCount).sort((a, b) => a.originalIndex - b.originalIndex).map(x => x.pick);
}

function hashString(str: string): number {
  const hash = crypto.createHash("md5").update(str).digest();
  return hash.readUInt32BE(0);
}

function deterministicScore(seed: number, index: number): number {
  const combined = seed ^ (index * 2654435761);
  return ((combined >>> 0) % 10000) / 10000;
}

export function isExclusivePick(pick: { confidence: number; edge: number; grade: string }): boolean {
  return pick.confidence > 85 && pick.edge > 5 && pick.grade.startsWith("A");
}

export function cleanupOldTails(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [pickId, data] of pickTails.entries()) {
    if (new Date(data.createdAt).getTime() < cutoff) {
      pickTails.delete(pickId);
    }
  }
}

setInterval(cleanupOldTails, 60 * 60 * 1000);

export function getProtectionStats(): {
  trackedPicks: number;
  totalTails: number;
  avgTailsPerPick: number;
} {
  let totalTails = 0;
  for (const data of pickTails.values()) {
    totalTails += data.tails.length;
  }
  return {
    trackedPicks: pickTails.size,
    totalTails,
    avgTailsPerPick: pickTails.size > 0 ? Math.round(totalTails / pickTails.size) : 0,
  };
}

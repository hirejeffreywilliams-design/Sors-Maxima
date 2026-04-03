import { db } from "./db";
import { aiUsage, aiSessionContext } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── Tier quota constants ─────────────────────────────────────────────────────
export const TIER_DAILY_LIMITS: Record<string, number | null> = {
  free: 3,
  pro: 15,
  elite: 50,
  whale: null,
};

export function getTierDailyLimit(tier: string): number | null {
  return TIER_DAILY_LIMITS[tier] ?? 3;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Get today's usage count for a user ──────────────────────────────────────
export async function getAiUsageToday(userId: number): Promise<number> {
  try {
    const today = todayStr();
    const rows = await db
      .select({ messageCount: aiUsage.messageCount })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.date, today)))
      .limit(1);
    return rows[0]?.messageCount ?? 0;
  } catch {
    return 0;
  }
}

// ─── Increment usage count for a user ────────────────────────────────────────
export async function incrementAiUsage(userId: number): Promise<number> {
  try {
    const today = todayStr();
    const existing = await db
      .select({ id: aiUsage.id, messageCount: aiUsage.messageCount })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.date, today)))
      .limit(1);

    if (existing.length > 0) {
      const newCount = (existing[0].messageCount ?? 0) + 1;
      await db
        .update(aiUsage)
        .set({ messageCount: newCount, updatedAt: new Date() })
        .where(eq(aiUsage.id, existing[0].id));
      return newCount;
    } else {
      await db.insert(aiUsage).values({
        userId,
        date: today,
        messageCount: 1,
      });
      return 1;
    }
  } catch {
    return 0;
  }
}

// ─── Check if user is within their daily limit ───────────────────────────────
export async function checkAiUsageLimit(userId: number, tier: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  tier: string;
}> {
  const limit = getTierDailyLimit(tier);
  const current = await getAiUsageToday(userId);

  if (limit === null) {
    return { allowed: true, current, limit: null, tier };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    tier,
  };
}

// ─── Session context: upsert recommendations and game IDs ────────────────────
export async function upsertSessionContext(
  userId: number,
  gameIds: string[],
  recommendation: { text: string; gameId?: string; timestamp: string }
): Promise<void> {
  try {
    const today = todayStr();
    const existing = await db
      .select()
      .from(aiSessionContext)
      .where(and(eq(aiSessionContext.userId, userId), eq(aiSessionContext.sessionDate, today)))
      .limit(1);

    const newGameIds = Array.from(new Set([
      ...(existing[0]?.gameIds ?? []),
      ...gameIds,
    ]));

    const existingRecs = (existing[0]?.recommendations as any[]) ?? [];
    const newRecs = [...existingRecs, recommendation].slice(-20);

    if (existing.length > 0) {
      await db
        .update(aiSessionContext)
        .set({
          gameIds: newGameIds,
          recommendations: newRecs,
          lastUpdated: new Date(),
        })
        .where(eq(aiSessionContext.id, existing[0].id));
    } else {
      await db.insert(aiSessionContext).values({
        userId,
        sessionDate: today,
        gameIds: newGameIds,
        recommendations: newRecs,
      });
    }
  } catch {
    // non-critical, don't throw
  }
}

// ─── Get session context for a user (today) ──────────────────────────────────
export async function getSessionContext(userId: number): Promise<{
  gameIds: string[];
  recommendations: any[];
} | null> {
  try {
    const today = todayStr();
    const rows = await db
      .select()
      .from(aiSessionContext)
      .where(and(eq(aiSessionContext.userId, userId), eq(aiSessionContext.sessionDate, today)))
      .limit(1);

    if (!rows[0]) return null;
    return {
      gameIds: rows[0].gameIds ?? [],
      recommendations: (rows[0].recommendations as any[]) ?? [],
    };
  } catch {
    return null;
  }
}

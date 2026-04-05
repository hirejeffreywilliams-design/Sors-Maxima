/**
 * Momentum Multiplier — Social Prediction Chains
 *
 * Users create chains and invite others to make sequential predictions.
 * Consecutive correct predictions multiply the chain's score:
 *   1x → 1.5x → 2x → 3x → 5x
 * A wrong prediction breaks the streak. Reaching 5+ consecutive correct
 * predictions earns a "Resonance Badge".
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  predictionChains,
  chainMembers,
  chainPredictions,
  chainStreaks,
  resonanceBadges,
} from "../dbSchema";

// Multiplier tiers for consecutive correct predictions
const MULTIPLIER_TIERS: Record<number, number> = {
  0: 1,
  1: 1.5,
  2: 2,
  3: 3,
  4: 5,
};

export function getMultiplier(streak: number): number {
  if (streak >= 4) return 5;
  return MULTIPLIER_TIERS[streak] ?? 1;
}

const RESONANCE_THRESHOLD = 5;

export interface CreateChainInput {
  name: string;
  creatorId: number;
  sport: string;
  maxMembers?: number;
}

export interface SubmitPredictionInput {
  chainId: number;
  memberId: number;
  prediction: string;
}

export interface ChainStatus {
  id: number;
  name: string;
  sport: string;
  status: string;
  currentMultiplier: number;
  streakCount: number;
  members: Array<{ userId: number; position: number; joinedAt: Date }>;
  predictions: Array<{
    memberId: number;
    prediction: string;
    result: string | null;
    multiplierAtTime: number;
    createdAt: Date;
  }>;
}

export async function createChain(input: CreateChainInput) {
  const { name, creatorId, sport, maxMembers = 10 } = input;

  const [chain] = await db
    .insert(predictionChains)
    .values({
      name,
      creatorId,
      sport,
      status: "open",
      currentMultiplier: 1,
      streakCount: 0,
      maxMembers,
    })
    .returning();

  // Creator joins as position 1
  await db.insert(chainMembers).values({
    chainId: chain.id,
    userId: creatorId,
    position: 1,
  });

  return chain;
}

export async function listChains(filter?: "open" | "active" | "completed") {
  if (filter) {
    return db
      .select()
      .from(predictionChains)
      .where(sql`${predictionChains.status} = ${filter}`)
      .orderBy(sql`${predictionChains.createdAt} DESC`)
      .limit(100);
  }

  return db
    .select()
    .from(predictionChains)
    .orderBy(sql`${predictionChains.createdAt} DESC`)
    .limit(100);
}

export async function joinChain(chainId: number, userId: number) {
  // Check chain exists and is open
  const [chain] = await db
    .select()
    .from(predictionChains)
    .where(sql`${predictionChains.id} = ${chainId}`);

  if (!chain) throw new Error("Chain not found");
  if (chain.status !== "open") throw new Error("Chain is not open for joining");

  // Check membership count
  const members = await db
    .select()
    .from(chainMembers)
    .where(sql`${chainMembers.chainId} = ${chainId}`);

  if (members.length >= chain.maxMembers) {
    throw new Error("Chain is full");
  }

  // Check not already a member
  const existing = members.find((m) => m.userId === userId);
  if (existing) throw new Error("Already a member of this chain");

  const position = members.length + 1;

  const [member] = await db
    .insert(chainMembers)
    .values({ chainId, userId, position })
    .returning();

  return member;
}

export async function submitPrediction(
  chainId: number,
  userId: number,
  prediction: string
) {
  // Verify membership
  const [member] = await db
    .select()
    .from(chainMembers)
    .where(
      sql`${chainMembers.chainId} = ${chainId} AND ${chainMembers.userId} = ${userId}`
    );

  if (!member) throw new Error("Not a member of this chain");

  // Get chain state
  const [chain] = await db
    .select()
    .from(predictionChains)
    .where(sql`${predictionChains.id} = ${chainId}`);

  if (!chain) throw new Error("Chain not found");
  if (chain.status === "completed") throw new Error("Chain is completed");

  // Activate chain if still open
  if (chain.status === "open") {
    await db
      .execute(
        sql`UPDATE prediction_chains SET status = 'active' WHERE id = ${chainId}`
      );
  }

  const multiplierAtTime = getMultiplier(chain.streakCount);

  const [pred] = await db
    .insert(chainPredictions)
    .values({
      chainId,
      memberId: member.id,
      prediction,
      result: "pending",
      multiplierAtTime,
    })
    .returning();

  return pred;
}

export async function resolvePrediction(
  predictionId: number,
  correct: boolean
) {
  // Get prediction
  const [pred] = await db
    .select()
    .from(chainPredictions)
    .where(sql`${chainPredictions.id} = ${predictionId}`);

  if (!pred) throw new Error("Prediction not found");

  const result = correct ? "correct" : "incorrect";

  await db.execute(
    sql`UPDATE chain_predictions SET result = ${result} WHERE id = ${predictionId}`
  );

  // Get chain
  const [chain] = await db
    .select()
    .from(predictionChains)
    .where(sql`${predictionChains.id} = ${pred.chainId}`);

  if (!chain) throw new Error("Chain not found");

  if (correct) {
    const newStreak = chain.streakCount + 1;
    const newMultiplier = getMultiplier(newStreak);

    await db.execute(
      sql`UPDATE prediction_chains SET streak_count = ${newStreak}, current_multiplier = ${newMultiplier} WHERE id = ${chain.id}`
    );

    // Award resonance badge if threshold reached
    if (newStreak >= RESONANCE_THRESHOLD) {
      const [member] = await db
        .select()
        .from(chainMembers)
        .where(sql`${chainMembers.id} = ${pred.memberId}`);

      if (member) {
        await db.insert(resonanceBadges).values({
          userId: member.userId,
          chainId: chain.id,
          streakLength: newStreak,
        });
      }
    }

    // Record streak
    await db.insert(chainStreaks).values({
      chainId: chain.id,
      length: chain.streakCount + 1,
      startedAt: new Date(),
    });

    return { streakCount: newStreak, multiplier: newMultiplier, broken: false };
  } else {
    // Break the streak
    // End current streak record
    await db.execute(
      sql`UPDATE chain_streaks SET ended_at = NOW() WHERE chain_id = ${chain.id} AND ended_at IS NULL`
    );

    await db.execute(
      sql`UPDATE prediction_chains SET streak_count = 0, current_multiplier = 1 WHERE id = ${chain.id}`
    );

    return { streakCount: 0, multiplier: 1, broken: true };
  }
}

export async function getChainStatus(chainId: number): Promise<ChainStatus> {
  const [chain] = await db
    .select()
    .from(predictionChains)
    .where(sql`${predictionChains.id} = ${chainId}`);

  if (!chain) throw new Error("Chain not found");

  const members = await db
    .select()
    .from(chainMembers)
    .where(sql`${chainMembers.chainId} = ${chainId}`)
    .orderBy(sql`${chainMembers.position} ASC`);

  const predictions = await db
    .select()
    .from(chainPredictions)
    .where(sql`${chainPredictions.chainId} = ${chainId}`)
    .orderBy(sql`${chainPredictions.createdAt} ASC`);

  return {
    id: chain.id,
    name: chain.name,
    sport: chain.sport,
    status: chain.status,
    currentMultiplier: chain.currentMultiplier,
    streakCount: chain.streakCount,
    members: members.map((m) => ({
      userId: m.userId,
      position: m.position,
      joinedAt: m.joinedAt!,
    })),
    predictions: predictions.map((p) => ({
      memberId: p.memberId,
      prediction: p.prediction,
      result: p.result,
      multiplierAtTime: p.multiplierAtTime,
      createdAt: p.createdAt!,
    })),
  };
}

export async function getLeaderboard(limit = 20) {
  const results = await db.execute(
    sql`SELECT pc.id, pc.name, pc.sport, pc.current_multiplier, pc.streak_count,
               pc.creator_id, pc.status,
               COALESCE(MAX(cs.length), 0) as best_streak,
               COUNT(DISTINCT cm.id) as member_count,
               COUNT(DISTINCT rb.id) as badge_count
        FROM prediction_chains pc
        LEFT JOIN chain_streaks cs ON cs.chain_id = pc.id
        LEFT JOIN chain_members cm ON cm.chain_id = pc.id
        LEFT JOIN resonance_badges rb ON rb.chain_id = pc.id
        GROUP BY pc.id
        ORDER BY COALESCE(MAX(cs.length), 0) DESC, pc.current_multiplier DESC
        LIMIT ${limit}`
  );

  return results.rows;
}

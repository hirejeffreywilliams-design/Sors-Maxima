import { db } from "./db";
import { sql } from "drizzle-orm";
import { logInfo, logWarn } from "./errorLogger";

let snapshotCounter = 0;

export async function recordModelSnapshot(params: {
  engine: string;
  weights: Record<string, unknown>;
  metrics: Record<string, unknown>;
  trigger: string;
  sport?: string;
  marketType?: string;
  predictionsSinceLast?: number;
  accuracyAtSnapshot?: number;
}): Promise<string> {
  snapshotCounter++;
  const version = `v${Date.now()}-${snapshotCounter}`;

  try {
    await db.execute(sql`
      INSERT INTO model_snapshots (version, engine, weights, metrics, trigger, sport, market_type, predictions_since_last, accuracy_at_snapshot)
      VALUES (
        ${version},
        ${params.engine},
        ${JSON.stringify(params.weights)}::jsonb,
        ${JSON.stringify(params.metrics)}::jsonb,
        ${params.trigger},
        ${params.sport ?? null},
        ${params.marketType ?? null},
        ${params.predictionsSinceLast ?? 0},
        ${params.accuracyAtSnapshot ?? null}
      )
    `);
    logInfo(`[ModelSnapshot] Recorded snapshot ${version} for engine=${params.engine} trigger=${params.trigger}`);
    return version;
  } catch (err: any) {
    logWarn(`[ModelSnapshot] Failed to record snapshot: ${err.message}`);
    return version;
  }
}

export async function getLatestSnapshots(engine?: string, limit = 20): Promise<any[]> {
  try {
    if (engine) {
      const result = await db.execute(sql`
        SELECT id, version, engine, weights, metrics, trigger, sport, market_type, predictions_since_last, accuracy_at_snapshot, created_at
        FROM model_snapshots
        WHERE engine = ${engine}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      return result.rows as any[];
    }
    const result = await db.execute(sql`
      SELECT id, version, engine, weights, metrics, trigger, sport, market_type, predictions_since_last, accuracy_at_snapshot, created_at
      FROM model_snapshots
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows as any[];
  } catch (err: any) {
    logWarn(`[ModelSnapshot] Failed to fetch snapshots: ${err.message}`);
    return [];
  }
}

export async function getSnapshotSummary(): Promise<{
  totalSnapshots: number;
  engines: { engine: string; count: number; latest: string | null }[];
  recentTriggers: { trigger: string; count: number }[];
  avgAccuracy: number | null;
}> {
  try {
    const totalResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM model_snapshots`);
    const totalSnapshots = parseInt((totalResult.rows[0] as any)?.cnt || "0");

    const enginesResult = await db.execute(sql`
      SELECT engine, COUNT(*) as cnt, MAX(created_at) as latest
      FROM model_snapshots GROUP BY engine ORDER BY cnt DESC
    `);
    const engines = (enginesResult.rows as any[]).map(r => ({
      engine: r.engine,
      count: parseInt(r.cnt),
      latest: r.latest,
    }));

    const triggersResult = await db.execute(sql`
      SELECT trigger, COUNT(*) as cnt
      FROM model_snapshots GROUP BY trigger ORDER BY cnt DESC
    `);
    const recentTriggers = (triggersResult.rows as any[]).map(r => ({
      trigger: r.trigger,
      count: parseInt(r.cnt),
    }));

    const accResult = await db.execute(sql`
      SELECT ROUND(AVG(accuracy_at_snapshot)::numeric, 2) as avg_acc
      FROM model_snapshots WHERE accuracy_at_snapshot IS NOT NULL
    `);
    const avgAccuracy = accResult.rows[0] ? parseFloat((accResult.rows[0] as any).avg_acc) || null : null;

    return { totalSnapshots, engines, recentTriggers, avgAccuracy };
  } catch (err: any) {
    logWarn(`[ModelSnapshot] Summary query failed: ${err.message}`);
    return { totalSnapshots: 0, engines: [], recentTriggers: [], avgAccuracy: null };
  }
}

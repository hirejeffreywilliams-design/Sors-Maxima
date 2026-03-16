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
  label?: string;
  notes?: string;
  accuracy?: number;
  brierScore?: number;
  homeWinRate?: number;
  spreadCoverRate?: number;
}): Promise<string> {
  snapshotCounter++;
  const version = `v${Date.now()}-${snapshotCounter}`;

  try {
    await db.execute(sql`
      INSERT INTO model_snapshots (
        version, engine, weights, metrics, trigger, sport, market_type,
        predictions_since_last, accuracy_at_snapshot, label, notes,
        accuracy, brier_score, home_win_rate, spread_cover_rate
      )
      VALUES (
        ${version},
        ${params.engine},
        ${JSON.stringify(params.weights)}::jsonb,
        ${JSON.stringify(params.metrics)}::jsonb,
        ${params.trigger},
        ${params.sport ?? null},
        ${params.marketType ?? null},
        ${params.predictionsSinceLast ?? 0},
        ${params.accuracyAtSnapshot ?? null},
        ${params.label ?? null},
        ${params.notes ?? null},
        ${params.accuracy ?? params.accuracyAtSnapshot ?? null},
        ${params.brierScore ?? null},
        ${params.homeWinRate ?? null},
        ${params.spreadCoverRate ?? null}
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
  const cols = `id, version, engine, weights, metrics, trigger, sport, market_type,
    predictions_since_last, accuracy_at_snapshot, label, notes,
    accuracy, brier_score, home_win_rate, spread_cover_rate, created_at`;
  try {
    if (engine) {
      const result = await db.execute(sql`
        SELECT ${sql.raw(cols)}
        FROM model_snapshots
        WHERE engine = ${engine}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      return result.rows as any[];
    }
    const result = await db.execute(sql`
      SELECT ${sql.raw(cols)}
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

export async function getSnapshotDeltas(engine?: string, limit = 10): Promise<any[]> {
  try {
    const engineFilter = engine ? sql`WHERE engine = ${engine}` : sql``;
    const result = await db.execute(sql`
      SELECT s1.version, s1.engine, s1.accuracy_at_snapshot as current_accuracy,
             s2.accuracy_at_snapshot as prev_accuracy,
             CASE WHEN s2.accuracy_at_snapshot IS NOT NULL AND s1.accuracy_at_snapshot IS NOT NULL
               THEN ROUND((s1.accuracy_at_snapshot - s2.accuracy_at_snapshot)::numeric, 4)
               ELSE NULL
             END as accuracy_delta,
             s1.created_at
      FROM model_snapshots s1
      LEFT JOIN LATERAL (
        SELECT accuracy_at_snapshot FROM model_snapshots s2
        WHERE s2.engine = s1.engine AND s2.created_at < s1.created_at
        ORDER BY s2.created_at DESC LIMIT 1
      ) s2 ON true
      ${engineFilter}
      ORDER BY s1.created_at DESC
      LIMIT ${limit}
    `);
    return result.rows as any[];
  } catch (err: any) {
    logWarn(`[ModelSnapshot] Delta query failed: ${err.message}`);
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

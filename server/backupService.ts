/**
 * Backup Service
 *
 * Runs a scheduled daily pg_dump and uploads the result to Replit Object
 * Storage, keeping the last 7 days of backups (auto-rotation).
 *
 * Schedule:  daily at 03:00 UTC (configurable via BACKUP_HOUR_UTC env var)
 * Retention: 7 backups (configurable via BACKUP_RETAIN_COUNT)
 * Storage:   Replit Object Storage bucket key  backups/sors-maxima-YYYY-MM-DD.sql
 *
 * Requirements:
 *   - DATABASE_URL env var must be set (standard Replit PostgreSQL format)
 *   - pg_dump must be available in the container (it is on Replit)
 *   - Replit Object Storage integration must be enabled
 *
 * Manual trigger:
 *   curl -X POST /api/admin/backup/run   (admin-only route — see admin.ts)
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Client } from "@replit/object-storage";

const execAsync = promisify(exec);

const BACKUP_HOUR_UTC    = parseInt(process.env.BACKUP_HOUR_UTC    ?? "3",  10);
const BACKUP_RETAIN_COUNT = parseInt(process.env.BACKUP_RETAIN_COUNT ?? "7", 10);
const BACKUP_PREFIX       = "backups/sors-maxima-";

let schedulerHandle: NodeJS.Timeout | null = null;

// ── Core dump + upload ────────────────────────────────────────────────────

export async function runBackup(): Promise<{ success: boolean; key?: string; sizeBytes?: number; error?: string }> {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key     = `${BACKUP_PREFIX}${dateStr}.sql`;

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    console.log(`[Backup] Starting pg_dump → ${key}`);

    const { stdout, stderr } = await execAsync(
      `pg_dump --no-password --clean --if-exists "${dbUrl}"`,
      { maxBuffer: 256 * 1024 * 1024 } // 256 MB max
    );

    if (stderr && !stderr.includes("WARNING")) {
      console.warn("[Backup] pg_dump stderr:", stderr.slice(0, 500));
    }

    const sqlBuffer = Buffer.from(stdout, "utf8");

    // Upload to Replit Object Storage
    const client = new Client();
    await client.uploadFromBytes(key, sqlBuffer);

    console.log(`[Backup] Uploaded ${key} (${(sqlBuffer.byteLength / 1024).toFixed(0)} KB)`);

    // Rotate old backups
    await rotateOldBackups(client, dateStr);

    return { success: true, key, sizeBytes: sqlBuffer.byteLength };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Backup] Backup failed:", message);
    return { success: false, error: message };
  }
}

// ── Rotation ──────────────────────────────────────────────────────────────

async function rotateOldBackups(client: Client, currentDate: string): Promise<void> {
  try {
    const list = await client.list({ prefix: BACKUP_PREFIX });
    const keys: string[] = (list.objects ?? [])
      .map((o: any) => o.key as string)
      .filter((k: string) => k !== `${BACKUP_PREFIX}${currentDate}.sql`)
      .sort()
      .reverse(); // newest first

    const toDelete = keys.slice(BACKUP_RETAIN_COUNT - 1); // keep N-1 old + 1 new = N total
    for (const oldKey of toDelete) {
      await client.delete(oldKey);
      console.log(`[Backup] Rotated (deleted) old backup: ${oldKey}`);
    }
  } catch (err: unknown) {
    console.warn("[Backup] Rotation warning (non-fatal):", err instanceof Error ? err.message : String(err));
  }
}

// ── List stored backups (for admin dashboard) ─────────────────────────────

export async function listBackups(): Promise<{ key: string; date: string; sizeBytes?: number }[]> {
  try {
    const client = new Client();
    const list   = await client.list({ prefix: BACKUP_PREFIX });
    return ((list.objects ?? []) as any[])
      .map((o) => ({
        key:       o.key as string,
        date:      (o.key as string).replace(BACKUP_PREFIX, "").replace(".sql", ""),
        sizeBytes: o.size as number | undefined,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────

function msUntilNextBackup(): number {
  const now  = new Date();
  const next = new Date(now);
  next.setUTCHours(BACKUP_HOUR_UTC, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export function startBackupScheduler(): void {
  if (schedulerHandle) return;

  const delayMs = msUntilNextBackup();
  const nextRun = new Date(Date.now() + delayMs).toISOString();

  console.log(`[Backup] Daily backup scheduler armed — next run at ${nextRun} UTC`);

  // First fire at the correct hour, then every 24 h
  schedulerHandle = setTimeout(async () => {
    await runBackup();
    schedulerHandle = setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, delayMs);
}

export function stopBackupScheduler(): void {
  if (schedulerHandle) {
    clearTimeout(schedulerHandle);
    clearInterval(schedulerHandle as any);
    schedulerHandle = null;
  }
}

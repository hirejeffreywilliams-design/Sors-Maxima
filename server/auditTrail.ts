import crypto from 'crypto';
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logWarn } from "./errorLogger";

interface AuditDbRow {
  audit_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ActionCountRow { action: string; cnt: string }
interface StatsRow { total: string; unique_users: string; oldest: string | null; newest: string | null }

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

type AuditAction =
  | "ticket_generated"
  | "ticket_accepted"
  | "ticket_rejected"
  | "ticket_edited"
  | "bet_placed"
  | "bet_cancelled"
  | "settings_changed"
  | "stake_modified"
  | "community_action"
  | "login"
  | "logout"
  | "profile_update"
  | "subscription_change"
  | "feedback_submitted"
  | "data_export"
  | "account_deletion"
  | "password_change"
  | "session_revoked"
  | "consent_updated"
  | "intervention_created"
  | "intervention_resolved"
  | "support_chat"
  | "support_escalate"
  | "support_close"
  | "support_feedback"
  | "support_admin_respond"
  | "support_admin_resolve"
  | "pick_feedback";

class AuditTrail {
  private memoryBuffer: AuditEntry[] = [];
  private maxBuffer = 200;
  private flushTimer: NodeJS.Timeout | null = null;

  private generateId(): string {
    return `audit_${crypto.randomUUID()}`;
  }

  record(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    options?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      ip?: string;
      userAgent?: string;
    }
  ): string {
    const id = this.generateId();
    const entry: AuditEntry = {
      id,
      timestamp: new Date().toISOString(),
      userId,
      action,
      entityType,
      entityId,
      ...options,
    };

    this.persistEntry(entry);

    this.memoryBuffer.unshift(entry);
    if (this.memoryBuffer.length > this.maxBuffer) {
      this.memoryBuffer = this.memoryBuffer.slice(0, this.maxBuffer);
    }

    return id;
  }

  private async persistEntry(entry: AuditEntry): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO audit_trail (audit_id, user_id, action, entity_type, entity_id, before_state, after_state, metadata, ip, user_agent, created_at)
        VALUES (
          ${entry.id},
          ${entry.userId},
          ${entry.action},
          ${entry.entityType},
          ${entry.entityId},
          ${entry.before ? JSON.stringify(entry.before) : null}::jsonb,
          ${entry.after ? JSON.stringify(entry.after) : null}::jsonb,
          ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
          ${entry.ip || null},
          ${entry.userAgent || null},
          ${entry.timestamp}
        )
        ON CONFLICT (audit_id) DO NOTHING
      `);
    } catch (err: unknown) {
      logWarn(`[AuditTrail] Failed to persist entry ${entry.id}: ${(err as Error).message}`);
    }
  }

  async getEntries(options?: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    limit?: number;
    since?: string;
  }): Promise<AuditEntry[]> {
    try {
      const conditions = [sql`1=1`];
      if (options?.userId) conditions.push(sql`user_id = ${options.userId}`);
      if (options?.action) conditions.push(sql`action = ${options.action}`);
      if (options?.entityType) conditions.push(sql`entity_type = ${options.entityType}`);
      if (options?.entityId) conditions.push(sql`entity_id = ${options.entityId}`);
      if (options?.since) conditions.push(sql`created_at >= ${options.since}`);

      const lim = Math.min(options?.limit || 100, 500);
      const whereClause = sql.join(conditions, sql` AND `);

      const result = await db.execute(sql`
        SELECT audit_id, user_id, action, entity_type, entity_id, before_state, after_state, metadata, ip, user_agent, created_at
        FROM audit_trail WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${lim}
      `);

      return (result.rows as AuditDbRow[]).map(r => ({
        id: r.audit_id,
        timestamp: r.created_at,
        userId: r.user_id,
        action: r.action as AuditAction,
        entityType: r.entity_type,
        entityId: r.entity_id,
        before: r.before_state || undefined,
        after: r.after_state || undefined,
        metadata: r.metadata || undefined,
        ip: r.ip || undefined,
        userAgent: r.user_agent || undefined,
      }));
    } catch (err: unknown) {
      logWarn(`[AuditTrail] DB query failed, falling back to memory: ${(err as Error).message}`);
      let result = [...this.memoryBuffer];
      if (options?.userId) result = result.filter(e => e.userId === options.userId);
      if (options?.action) result = result.filter(e => e.action === options.action);
      if (options?.entityType) result = result.filter(e => e.entityType === options.entityType);
      if (options?.entityId) result = result.filter(e => e.entityId === options.entityId);
      if (options?.since) {
        const sinceDate = new Date(options.since);
        result = result.filter(e => new Date(e.timestamp) >= sinceDate);
      }
      return result.slice(0, options?.limit || 100);
    }
  }

  async getEntry(id: string): Promise<AuditEntry | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT audit_id, user_id, action, entity_type, entity_id, before_state, after_state, metadata, ip, user_agent, created_at
        FROM audit_trail WHERE audit_id = ${id} LIMIT 1
      `);
      const r = result.rows[0] as AuditDbRow | undefined;
      if (!r) return undefined;
      return {
        id: r.audit_id,
        timestamp: r.created_at,
        userId: r.user_id,
        action: r.action as AuditAction,
        entityType: r.entity_type,
        entityId: r.entity_id,
        before: r.before_state || undefined,
        after: r.after_state || undefined,
        metadata: r.metadata || undefined,
        ip: r.ip || undefined,
        userAgent: r.user_agent || undefined,
      };
    } catch {
      return this.memoryBuffer.find(e => e.id === id);
    }
  }

  async getUserHistory(userId: string, limit = 50): Promise<AuditEntry[]> {
    return this.getEntries({ userId, limit });
  }

  async getTicketHistory(ticketId: string): Promise<AuditEntry[]> {
    return this.getEntries({ entityType: "ticket", entityId: ticketId });
  }

  async getStats(options?: { userId?: string; since?: string }) {
    try {
      const conditions = [sql`1=1`];
      if (options?.userId) conditions.push(sql`user_id = ${options.userId}`);
      if (options?.since) conditions.push(sql`created_at >= ${options.since}`);
      const whereClause = sql.join(conditions, sql` AND `);

      const result = await db.execute(sql`
        SELECT action, COUNT(*) as cnt FROM audit_trail WHERE ${whereClause} GROUP BY action
      `);
      const totalResult = await db.execute(sql`
        SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_users,
                MIN(created_at) as oldest, MAX(created_at) as newest
         FROM audit_trail WHERE ${whereClause}
      `);

      const actionCounts: Record<string, number> = {};
      for (const row of result.rows as ActionCountRow[]) {
        actionCounts[row.action] = parseInt(row.cnt);
      }
      const stats = totalResult.rows[0] as StatsRow | undefined;

      return {
        total: parseInt(stats?.total || "0"),
        actionCounts,
        uniqueUsers: parseInt(stats?.unique_users || "0"),
        timeRange: {
          oldest: stats?.oldest || null,
          newest: stats?.newest || null,
        },
      };
    } catch (err: unknown) {
      logWarn(`[AuditTrail] Stats query failed: ${(err as Error).message}`);
      return { total: 0, actionCounts: {}, uniqueUsers: 0, timeRange: { oldest: null, newest: null } };
    }
  }
}

export const auditTrail = new AuditTrail();
export type { AuditEntry, AuditAction };

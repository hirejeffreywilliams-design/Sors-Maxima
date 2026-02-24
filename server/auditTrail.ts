import crypto from 'crypto';

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
  | "support_admin_resolve";

class AuditTrail {
  private entries: AuditEntry[] = [];
  private maxEntries = 10000;

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

    this.entries.unshift(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    return id;
  }

  getEntries(options?: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    limit?: number;
    since?: string;
  }): AuditEntry[] {
    let result = [...this.entries];

    if (options?.userId) {
      result = result.filter((e) => e.userId === options.userId);
    }
    if (options?.action) {
      result = result.filter((e) => e.action === options.action);
    }
    if (options?.entityType) {
      result = result.filter((e) => e.entityType === options.entityType);
    }
    if (options?.entityId) {
      result = result.filter((e) => e.entityId === options.entityId);
    }
    if (options?.since) {
      const sinceDate = new Date(options.since);
      result = result.filter((e) => new Date(e.timestamp) >= sinceDate);
    }

    return result.slice(0, options?.limit || 100);
  }

  getEntry(id: string): AuditEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  getUserHistory(userId: string, limit = 50): AuditEntry[] {
    return this.getEntries({ userId, limit });
  }

  getTicketHistory(ticketId: string): AuditEntry[] {
    return this.getEntries({ entityType: "ticket", entityId: ticketId });
  }

  getStats(options?: { userId?: string; since?: string }) {
    const filtered = this.getEntries(options);
    const actionCounts: Record<string, number> = {};

    filtered.forEach((entry) => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    });

    return {
      total: filtered.length,
      actionCounts,
      uniqueUsers: new Set(filtered.map((e) => e.userId)).size,
      timeRange: {
        oldest: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null,
        newest: filtered.length > 0 ? filtered[0].timestamp : null,
      },
    };
  }

  clear() {
    this.entries = [];
  }
}

export const auditTrail = new AuditTrail();
export type { AuditEntry, AuditAction };

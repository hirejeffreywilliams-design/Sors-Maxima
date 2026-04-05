import { db } from "./db";
import { sql } from "drizzle-orm";
import type { Request } from "express";

interface AuditLogEntry {
  userId?: string;
  username?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_log (user_id, username, action, resource_type, resource_id, ip_address, user_agent, details, severity)
      VALUES (
        ${entry.userId || null},
        ${entry.username || null},
        ${entry.action},
        ${entry.resourceType},
        ${entry.resourceId || null},
        ${entry.ip || null},
        ${entry.userAgent || null},
        ${JSON.stringify(entry.details || {})}::jsonb,
        ${entry.severity || 'info'}
      )
    `);
  } catch (err: any) {
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

export function logAuditFromRequest(
  req: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  severity: "info" | "warning" | "critical" = "info"
): void {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";

  logAuditEvent({
    userId: req.session?.userId,
    username: req.session?.username,
    action,
    resourceType,
    resourceId,
    ip,
    userAgent: req.headers["user-agent"],
    details,
    severity,
  });
}

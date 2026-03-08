/**
 * Community Integrity Engine
 * Detects and prevents fraud in the Community Discord operator system:
 * - Card verification velocity abuse (fake cards being spread)
 * - Credential sharing (multiple people on one account)
 * - Tier bypass attempts (lower-tier accounts accessing community features)
 * - Fake card image circulation (verification failures = someone made a fake)
 * - Discord webhook abuse (one operator, multiple unauthorized servers)
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { logError } from "./errorLogger";

export type FraudAlertType =
  | "card_velocity_abuse"
  | "fake_card_circulation"
  | "credential_sharing"
  | "tier_bypass_attempt"
  | "webhook_abuse"
  | "ip_anomaly"
  | "mass_verification_attempt";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface IntegrityAlert {
  id: number;
  alertType: FraudAlertType;
  severity: AlertSeverity;
  userId: number | null;
  username: string | null;
  collectionId: number | null;
  details: Record<string, any>;
  ipAddress: string | null;
  autoActioned: boolean;
  actionTaken: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationLogEntry {
  id: number;
  collectionId: number;
  cardId: string;
  verifierIp: string;
  result: string;
  verifiedAt: string;
}

export interface DiscordBinding {
  id: number;
  userId: number;
  discordUserId: string | null;
  discordUsername: string | null;
  discordServerId: string | null;
  discordServerName: string | null;
  discordMemberCount: number | null;
  webhookUrl: string | null;
  verified: boolean;
  status: string;
  suspensionReason: string | null;
  postsSent: number;
  lastPostAt: string | null;
  createdAt: string;
}

// ── Thresholds ─────────────────────────────────────────────────────────────────
const CARD_VELOCITY_THRESHOLD = 20;  // Same card verified 20+ times in 24h = alert
const FAKE_CARD_WINDOW_MS = 60 * 60 * 1000;  // 1 hour window for fake card detection
const FAKE_CARD_ATTEMPTS_THRESHOLD = 3;  // 3 failed verifications from same IP = alert
const CREDENTIAL_SHARE_THRESHOLD = 5;  // 5+ distinct IPs in 24h on same account = alert
const TIER_BYPASS_REPEAT_THRESHOLD = 5;  // 5+ bypass attempts from same user = escalate
const MASS_VERIFY_THRESHOLD = 50;  // 50 verifications from same IP in 1 hour = bot

// ── Card Verification Logging ─────────────────────────────────────────────────
export async function logCardVerification(params: {
  collectionId: number;
  cardId: string;
  issuedToUserId: number | null;
  verifierIp: string;
  verifierUserAgent: string | null;
  result: "authentic" | "not_found" | "tampered" | "error";
}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO card_verification_log
        (collection_id, card_id, issued_to_user_id, verifier_ip, verifier_user_agent, result)
      VALUES
        (${params.collectionId}, ${params.cardId}, ${params.issuedToUserId},
         ${params.verifierIp}, ${params.verifierUserAgent}, ${params.result})
    `);

    // Run fraud detection on insert (async, non-blocking)
    setImmediate(() => {
      detectCardVelocityAbuse(params.collectionId).catch(() => {});
      if (params.result === "not_found" || params.result === "tampered") {
        detectFakeCardCirculation(params.verifierIp).catch(() => {});
      }
      detectMassVerificationAttempt(params.verifierIp).catch(() => {});
    });
  } catch (err) {
    logError("[CommunityIntegrity] Failed to log card verification", { error: String(err) });
  }
}

// ── Tier Bypass Logging ────────────────────────────────────────────────────────
export async function logTierBypassAttempt(params: {
  userId: number | null;
  username: string | null;
  userTier: string;
  requiredTier: string;
  route: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO tier_bypass_log
        (user_id, username, user_tier, required_tier, route, ip_address, user_agent)
      VALUES
        (${params.userId}, ${params.username}, ${params.userTier},
         ${params.requiredTier}, ${params.route}, ${params.ipAddress}, ${params.userAgent})
    `);

    // If same user has many bypass attempts, raise alert
    if (params.userId) {
      const [row] = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM tier_bypass_log
        WHERE user_id = ${params.userId}
        AND attempted_at > NOW() - INTERVAL '24 hours'
      `) as any;
      const count = parseInt(row?.rows?.[0]?.cnt || "0");
      if (count >= TIER_BYPASS_REPEAT_THRESHOLD) {
        await raiseAlert({
          alertType: "tier_bypass_attempt",
          severity: count >= 10 ? "high" : "medium",
          userId: params.userId,
          username: params.username,
          collectionId: null,
          details: {
            count,
            latestRoute: params.route,
            userTier: params.userTier,
            requiredTier: params.requiredTier,
          },
          ipAddress: params.ipAddress,
        });
      }
    }
  } catch (err) {
    logError("[CommunityIntegrity] Failed to log tier bypass", { error: String(err) });
  }
}

// ── Detection: Card Velocity Abuse ────────────────────────────────────────────
async function detectCardVelocityAbuse(collectionId: number): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt, COUNT(DISTINCT verifier_ip) as unique_ips
      FROM card_verification_log
      WHERE collection_id = ${collectionId}
      AND verified_at > NOW() - INTERVAL '24 hours'
    `) as any;
    const row = result?.rows?.[0];
    if (!row) return;
    const total = parseInt(row.cnt || "0");
    const uniqueIps = parseInt(row.unique_ips || "0");
    if (total >= CARD_VELOCITY_THRESHOLD) {
      // Get card owner for context
      const ownerResult = await db.execute(sql`
        SELECT ucc.user_id, u.username, ucc.card_id
        FROM user_card_collections ucc
        JOIN users u ON ucc.user_id = u.id
        WHERE ucc.id = ${collectionId}
      `) as any;
      const owner = ownerResult?.rows?.[0];
      await raiseAlert({
        alertType: "card_velocity_abuse",
        severity: total > 100 ? "critical" : total > 50 ? "high" : "medium",
        userId: owner?.user_id ? parseInt(owner.user_id) : null,
        username: owner?.username || null,
        collectionId,
        details: {
          verificationCount: total,
          uniqueIps,
          window: "24 hours",
          cardId: owner?.card_id,
          note: "Card is being verified at an unusually high rate — possibly being shared virally or a fake is circulating",
        },
        ipAddress: null,
      });
    }
  } catch (err) {
    logError("[CommunityIntegrity] Card velocity check failed", { error: String(err) });
  }
}

// ── Detection: Fake Card Circulation ─────────────────────────────────────────
async function detectFakeCardCirculation(verifierIp: string): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM card_verification_log
      WHERE verifier_ip = ${verifierIp}
      AND result IN ('not_found', 'tampered')
      AND verified_at > NOW() - INTERVAL '1 hour'
    `) as any;
    const count = parseInt(result?.rows?.[0]?.cnt || "0");
    if (count >= FAKE_CARD_ATTEMPTS_THRESHOLD) {
      await raiseAlert({
        alertType: "fake_card_circulation",
        severity: count >= 10 ? "critical" : count >= 5 ? "high" : "medium",
        userId: null,
        username: null,
        collectionId: null,
        details: {
          failedVerifications: count,
          window: "1 hour",
          note: "IP address has repeatedly tried to verify non-existent or tampered cards. A fake Sors card may be circulating.",
        },
        ipAddress: verifierIp,
      });
    }
  } catch (err) {
    logError("[CommunityIntegrity] Fake card detection failed", { error: String(err) });
  }
}

// ── Detection: Mass Verification (Bot) ───────────────────────────────────────
async function detectMassVerificationAttempt(verifierIp: string): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt, COUNT(DISTINCT collection_id) as unique_cards
      FROM card_verification_log
      WHERE verifier_ip = ${verifierIp}
      AND verified_at > NOW() - INTERVAL '1 hour'
    `) as any;
    const row = result?.rows?.[0];
    const total = parseInt(row?.cnt || "0");
    const uniqueCards = parseInt(row?.unique_cards || "0");
    if (total >= MASS_VERIFY_THRESHOLD) {
      await raiseAlert({
        alertType: "mass_verification_attempt",
        severity: total > 200 ? "critical" : "high",
        userId: null,
        username: null,
        collectionId: null,
        details: {
          totalRequests: total,
          uniqueCards,
          window: "1 hour",
          note: "IP is scraping card verification endpoints — possible bot or competitor intelligence gathering",
        },
        ipAddress: verifierIp,
      });
    }
  } catch (err) {
    logError("[CommunityIntegrity] Mass verification detection failed", { error: String(err) });
  }
}

// ── Detection: Credential Sharing (run on auth events) ───────────────────────
export async function checkCredentialSharing(userId: number, ip: string): Promise<void> {
  try {
    // We use tier_bypass_log as a proxy for auth events — or hook into sessions
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT ip_address) as distinct_ips
      FROM tier_bypass_log
      WHERE user_id = ${userId}
      AND attempted_at > NOW() - INTERVAL '24 hours'
    `) as any;
    const distinctIps = parseInt(result?.rows?.[0]?.distinct_ips || "0");
    if (distinctIps >= CREDENTIAL_SHARE_THRESHOLD) {
      const userResult = await db.execute(sql`
        SELECT username FROM users WHERE id = ${userId}
      `) as any;
      const username = userResult?.rows?.[0]?.username || null;
      await raiseAlert({
        alertType: "credential_sharing",
        severity: distinctIps >= 10 ? "critical" : distinctIps >= 7 ? "high" : "medium",
        userId,
        username,
        collectionId: null,
        details: {
          distinctIps,
          window: "24 hours",
          currentIp: ip,
          note: "Account accessed from many distinct IPs — possible credential sharing or account compromise",
        },
        ipAddress: ip,
      });
    }
  } catch (err) {
    logError("[CommunityIntegrity] Credential sharing check failed", { error: String(err) });
  }
}

// ── Alert Deduplication & Persistence ────────────────────────────────────────
const recentAlerts = new Map<string, number>(); // key → timestamp
const ALERT_DEDUP_WINDOW = 30 * 60 * 1000; // 30 minutes

async function raiseAlert(params: {
  alertType: FraudAlertType;
  severity: AlertSeverity;
  userId: number | null;
  username: string | null;
  collectionId: number | null;
  details: Record<string, any>;
  ipAddress: string | null;
}): Promise<void> {
  const key = `${params.alertType}:${params.userId || params.ipAddress || "anon"}:${params.collectionId || ""}`;
  const lastSeen = recentAlerts.get(key);
  if (lastSeen && Date.now() - lastSeen < ALERT_DEDUP_WINDOW) return;
  recentAlerts.set(key, Date.now());

  try {
    await db.execute(sql`
      INSERT INTO community_fraud_alerts
        (alert_type, severity, user_id, username, collection_id, details, ip_address, auto_actioned, action_taken)
      VALUES
        (${params.alertType}, ${params.severity}, ${params.userId}, ${params.username},
         ${params.collectionId}, ${JSON.stringify(params.details)}, ${params.ipAddress},
         ${false}, ${null})
    `);
    console.log(`[CommunityIntegrity] Alert raised: ${params.alertType} (${params.severity}) — user=${params.username || "anon"}`);
  } catch (err) {
    logError("[CommunityIntegrity] Failed to persist alert", { error: String(err) });
  }
}

// ── Admin Query Functions ─────────────────────────────────────────────────────
export async function getIntegrityAlerts(opts?: {
  severity?: AlertSeverity;
  alertType?: FraudAlertType;
  reviewed?: boolean;
  limit?: number;
}): Promise<IntegrityAlert[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM community_fraud_alerts
      ORDER BY created_at DESC
      LIMIT ${opts?.limit ?? 100}
    `) as any;
    return (result?.rows || []).map((r: any) => ({
      id: r.id,
      alertType: r.alert_type,
      severity: r.severity,
      userId: r.user_id,
      username: r.username,
      collectionId: r.collection_id,
      details: r.details || {},
      ipAddress: r.ip_address,
      autoActioned: r.auto_actioned,
      actionTaken: r.action_taken,
      reviewed: r.reviewed,
      reviewedBy: r.reviewed_by,
      reviewNotes: r.review_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    logError("[CommunityIntegrity] Failed to fetch alerts", { error: String(err) });
    return [];
  }
}

export async function getVerificationStats(): Promise<{
  totalVerifications: number;
  last24h: number;
  failureRate: number;
  topVerifiedCards: Array<{ collectionId: number; count: number; uniqueIps: number }>;
  topAbusiveIps: Array<{ ip: string; failureCount: number }>;
}> {
  try {
    const [totalRes, last24hRes, failureRes, topCardsRes, topIpsRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM card_verification_log`) as any,
      db.execute(sql`SELECT COUNT(*) as cnt FROM card_verification_log WHERE verified_at > NOW() - INTERVAL '24 hours'`) as any,
      db.execute(sql`SELECT COUNT(*) as cnt FROM card_verification_log WHERE result IN ('not_found','tampered')`) as any,
      db.execute(sql`
        SELECT collection_id, COUNT(*) as cnt, COUNT(DISTINCT verifier_ip) as unique_ips
        FROM card_verification_log
        WHERE verified_at > NOW() - INTERVAL '24 hours'
        GROUP BY collection_id
        ORDER BY cnt DESC
        LIMIT 10
      `) as any,
      db.execute(sql`
        SELECT verifier_ip as ip, COUNT(*) as failure_count
        FROM card_verification_log
        WHERE result IN ('not_found','tampered')
        AND verified_at > NOW() - INTERVAL '24 hours'
        GROUP BY verifier_ip
        ORDER BY failure_count DESC
        LIMIT 10
      `) as any,
    ]);
    const total = parseInt(totalRes?.rows?.[0]?.cnt || "0");
    const failures = parseInt(failureRes?.rows?.[0]?.cnt || "0");
    return {
      totalVerifications: total,
      last24h: parseInt(last24hRes?.rows?.[0]?.cnt || "0"),
      failureRate: total > 0 ? Math.round((failures / total) * 100 * 10) / 10 : 0,
      topVerifiedCards: (topCardsRes?.rows || []).map((r: any) => ({
        collectionId: r.collection_id,
        count: parseInt(r.cnt),
        uniqueIps: parseInt(r.unique_ips),
      })),
      topAbusiveIps: (topIpsRes?.rows || []).map((r: any) => ({
        ip: r.ip,
        failureCount: parseInt(r.failure_count),
      })),
    };
  } catch (err) {
    logError("[CommunityIntegrity] Failed to get verification stats", { error: String(err) });
    return { totalVerifications: 0, last24h: 0, failureRate: 0, topVerifiedCards: [], topAbusiveIps: [] };
  }
}

export async function getDiscordBindings(): Promise<DiscordBinding[]> {
  try {
    const result = await db.execute(sql`
      SELECT dob.*, u.username
      FROM discord_operator_bindings dob
      JOIN users u ON dob.user_id = u.id
      ORDER BY dob.created_at DESC
      LIMIT 100
    `) as any;
    return (result?.rows || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      discordUserId: r.discord_user_id,
      discordUsername: r.discord_username,
      discordServerId: r.discord_server_id,
      discordServerName: r.discord_server_name,
      discordMemberCount: r.discord_member_count,
      webhookUrl: r.webhook_url ? "***REDACTED***" : null,
      verified: r.verified,
      status: r.status,
      suspensionReason: r.suspension_reason,
      postsSent: r.posts_sent,
      lastPostAt: r.last_post_at,
      createdAt: r.created_at,
    }));
  } catch (err) {
    logError("[CommunityIntegrity] Failed to fetch Discord bindings", { error: String(err) });
    return [];
  }
}

export async function getTierBypassStats(): Promise<{
  total24h: number;
  byUser: Array<{ userId: number; username: string; count: number; latestRoute: string }>;
  byRoute: Array<{ route: string; count: number }>;
}> {
  try {
    const [totalRes, byUserRes, byRouteRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM tier_bypass_log WHERE attempted_at > NOW() - INTERVAL '24 hours'`) as any,
      db.execute(sql`
        SELECT user_id, username, COUNT(*) as cnt, MAX(route) as latest_route
        FROM tier_bypass_log
        WHERE attempted_at > NOW() - INTERVAL '24 hours'
        AND user_id IS NOT NULL
        GROUP BY user_id, username
        ORDER BY cnt DESC
        LIMIT 20
      `) as any,
      db.execute(sql`
        SELECT route, COUNT(*) as cnt
        FROM tier_bypass_log
        WHERE attempted_at > NOW() - INTERVAL '24 hours'
        GROUP BY route
        ORDER BY cnt DESC
        LIMIT 20
      `) as any,
    ]);
    return {
      total24h: parseInt(totalRes?.rows?.[0]?.cnt || "0"),
      byUser: (byUserRes?.rows || []).map((r: any) => ({
        userId: r.user_id,
        username: r.username,
        count: parseInt(r.cnt),
        latestRoute: r.latest_route,
      })),
      byRoute: (byRouteRes?.rows || []).map((r: any) => ({
        route: r.route,
        count: parseInt(r.cnt),
      })),
    };
  } catch (err) {
    logError("[CommunityIntegrity] Failed to get bypass stats", { error: String(err) });
    return { total24h: 0, byUser: [], byRoute: [] };
  }
}

export async function resolveAlert(alertId: number, reviewedBy: string, notes: string, actionTaken?: string): Promise<void> {
  await db.execute(sql`
    UPDATE community_fraud_alerts
    SET reviewed = true, reviewed_by = ${reviewedBy}, review_notes = ${notes},
        action_taken = ${actionTaken || null}, updated_at = NOW()
    WHERE id = ${alertId}
  `);
}

export async function suspendDiscordBinding(userId: number, reason: string): Promise<void> {
  await db.execute(sql`
    UPDATE discord_operator_bindings
    SET status = 'suspended', suspension_reason = ${reason}, updated_at = NOW()
    WHERE user_id = ${userId}
  `);
}

export async function registerDiscordBinding(params: {
  userId: number;
  discordServerId: string;
  discordServerName: string;
  discordMemberCount: number;
  webhookUrl: string;
}): Promise<void> {
  const webhookSecret = require("crypto").randomBytes(32).toString("hex");
  await db.execute(sql`
    INSERT INTO discord_operator_bindings
      (user_id, discord_server_id, discord_server_name, discord_member_count, webhook_url, webhook_secret, status)
    VALUES
      (${params.userId}, ${params.discordServerId}, ${params.discordServerName},
       ${params.discordMemberCount}, ${params.webhookUrl}, ${webhookSecret}, 'active')
    ON CONFLICT (user_id)
    DO UPDATE SET
      discord_server_id = EXCLUDED.discord_server_id,
      discord_server_name = EXCLUDED.discord_server_name,
      discord_member_count = EXCLUDED.discord_member_count,
      webhook_url = EXCLUDED.webhook_url,
      webhook_secret = EXCLUDED.webhook_secret,
      status = 'active',
      updated_at = NOW()
  `);
}

/**
 * 4D-OS Client SDK — OmniDLOS Bridge Integration
 *
 * Registers Sors Maxima with 4everacy's OmniDLOS Bridge via OAuth2
 * client credentials flow. Sends prediction events, receives enriched
 * user context (emotional state, momentum score), and caches context locally.
 */

import { pool } from "../db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OmniDLOSConfig {
  bridgeUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface OAuthToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export type EcosystemEventType =
  | "prediction_made"
  | "winning_streak"
  | "risk_tolerance_change"
  | "achievement_unlocked";

export interface EcosystemEvent {
  type: EcosystemEventType;
  userId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface UserContext {
  emotionalState: string;
  momentumScore: number;
  confidenceLevel: number;
  recentActivity: string[];
  lastUpdated: string;
}

export interface MomentumBoost {
  sportContribution: number;
  streakBonus: number;
  accuracyMultiplier: number;
  totalBoost: number;
  lifeMomentumDelta: number;
}

// ─── Client ─────────────────────────────────────────────────────────────────

class OmniDLOSClient {
  private config: OmniDLOSConfig;
  private token: OAuthToken | null = null;
  private contextCache: Map<string, { data: UserContext; expiresAt: number }> = new Map();

  constructor() {
    this.config = {
      bridgeUrl: process.env.OMNIDLOS_BRIDGE_URL || "https://bridge.4everacy.io/v1",
      clientId: process.env.OMNIDLOS_CLIENT_ID || "",
      clientSecret: process.env.OMNIDLOS_CLIENT_SECRET || "",
      scopes: ["ecosystem.read", "ecosystem.write", "context.read", "achievements.sync"],
    };
  }

  /**
   * OAuth2 Client Credentials flow — obtain access token from OmniDLOS bridge.
   */
  async authenticate(): Promise<OAuthToken> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      // Return a stub token for development / unconfigured environments
      this.token = { accessToken: "dev-stub-token", expiresAt: Date.now() + 3_600_000 };
      return this.token;
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scopes.join(" "),
    });

    const res = await fetch(`${this.config.bridgeUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`OmniDLOS auth failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      accessToken: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
    return this.token;
  }

  /**
   * Register Sors Maxima with the OmniDLOS Bridge.
   */
  async registerApp(): Promise<{ registered: boolean; appId: string }> {
    const token = await this.authenticate();

    if (token.accessToken === "dev-stub-token") {
      return { registered: true, appId: "sors-maxima-dev" };
    }

    const res = await fetch(`${this.config.bridgeUrl}/apps/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appName: "Sors Maxima",
        category: "sports_intelligence",
        capabilities: ["predictions", "analytics", "achievements"],
      }),
    });

    if (!res.ok) {
      throw new Error(`OmniDLOS registration failed: ${res.status}`);
    }

    return (await res.json()) as { registered: boolean; appId: string };
  }

  /**
   * Send an event to the OmniDLOS bridge (prediction made, winning streak, etc.).
   */
  async sendEvent(event: EcosystemEvent): Promise<void> {
    const token = await this.authenticate();

    if (token.accessToken === "dev-stub-token") {
      console.log(`[OmniDLOS] Dev-mode event: ${event.type} for user ${event.userId}`);
      return;
    }

    const res = await fetch(`${this.config.bridgeUrl}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error(`[OmniDLOS] Failed to send event ${event.type}: ${res.status}`);
    }
  }

  /**
   * Fetch enriched user context from OmniDLOS (emotional state, momentum score).
   * Results are cached locally for 5 minutes and persisted to enriched_context_cache.
   */
  async getUserContext(userId: string, externalUserId: string): Promise<UserContext> {
    // Check in-memory cache first
    const cached = this.contextCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check DB cache
    const dbCached = await pool.query(
      `SELECT context_data FROM enriched_context_cache
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY fetched_at DESC LIMIT 1`,
      [userId]
    );

    if (dbCached.rows.length > 0) {
      const ctx = dbCached.rows[0].context_data as UserContext;
      this.contextCache.set(userId, { data: ctx, expiresAt: Date.now() + 300_000 });
      return ctx;
    }

    // Fetch from bridge
    const token = await this.authenticate();
    let context: UserContext;

    if (token.accessToken === "dev-stub-token") {
      context = {
        emotionalState: "focused",
        momentumScore: 72,
        confidenceLevel: 0.78,
        recentActivity: ["login", "prediction_viewed"],
        lastUpdated: new Date().toISOString(),
      };
    } else {
      const res = await fetch(
        `${this.config.bridgeUrl}/users/${externalUserId}/context`,
        {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        }
      );
      if (!res.ok) {
        throw new Error(`OmniDLOS context fetch failed: ${res.status}`);
      }
      context = (await res.json()) as UserContext;
    }

    // Cache in memory
    this.contextCache.set(userId, { data: context, expiresAt: Date.now() + 300_000 });

    // Persist to DB
    const expiresAt = new Date(Date.now() + 300_000);
    await pool.query(
      `INSERT INTO enriched_context_cache (user_id, context_data, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, JSON.stringify(context), expiresAt]
    );

    return context;
  }

  /**
   * Link a 4everacy account to a Sors Maxima user.
   */
  async linkAccount(
    userId: string,
    externalUserId: string,
    platform: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<{ linked: boolean }> {
    await pool.query(
      `INSERT INTO ecosystem_links (user_id, external_user_id, platform, access_token_encrypted, refresh_token_encrypted)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [userId, externalUserId, platform, accessToken, refreshToken || null]
    );
    return { linked: true };
  }

  /**
   * Push achievements to 4everacy's OmniDLOS bridge.
   */
  async syncAchievements(userId: string): Promise<{ synced: number }> {
    const unsynced = await pool.query(
      `SELECT id, achievement_type, data FROM synced_achievements
       WHERE user_id = $1 AND synced = false`,
      [userId]
    );

    if (unsynced.rows.length === 0) {
      return { synced: 0 };
    }

    const token = await this.authenticate();

    for (const row of unsynced.rows) {
      if (token.accessToken !== "dev-stub-token") {
        await fetch(`${this.config.bridgeUrl}/achievements/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            achievementType: row.achievement_type,
            data: row.data,
          }),
        });
      }

      await pool.query(
        `UPDATE synced_achievements SET synced = true, synced_at = NOW() WHERE id = $1`,
        [row.id]
      );
    }

    return { synced: unsynced.rows.length };
  }

  /**
   * Calculate sports contribution to Life Momentum score.
   */
  async calculateMomentumBoost(userId: string): Promise<MomentumBoost> {
    // Fetch recent prediction performance
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE actual_result = 'win') AS wins,
         COUNT(*) FILTER (WHERE actual_result IS NOT NULL) AS total,
         COUNT(*) FILTER (WHERE actual_result = 'win' AND settled_at > NOW() - INTERVAL '7 days') AS recent_wins
       FROM predictions WHERE user_id = $1`,
      [userId]
    );

    const { wins, total, recent_wins } = stats.rows[0] || { wins: 0, total: 0, recent_wins: 0 };
    const winRate = total > 0 ? Number(wins) / Number(total) : 0;
    const streakBonus = Math.min(Number(recent_wins) * 2, 20);
    const accuracyMultiplier = 1 + winRate * 0.5;
    const sportContribution = Math.round(winRate * 100 * accuracyMultiplier);
    const totalBoost = sportContribution + streakBonus;
    const lifeMomentumDelta = Math.round(totalBoost * 0.15);

    return {
      sportContribution,
      streakBonus,
      accuracyMultiplier: Math.round(accuracyMultiplier * 100) / 100,
      totalBoost,
      lifeMomentumDelta,
    };
  }
}

export const omnidlosClient = new OmniDLOSClient();

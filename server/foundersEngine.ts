import { db } from "./db";
import { sql } from "drizzle-orm";
import { pool } from "./db";
import { sendFounderWelcomeEmail, sendEnterpriseFounderWelcomeEmail, sendFounderAnnouncementEmail } from "./emailService";

export interface FounderProgramStatus {
  isActive: boolean;
  launchedAt: string | null;
  memberSpotsTotal: number;
  memberSpotsClaimed: number;
  memberSpotsRemaining: number;
  enterpriseSpotsTotal: number;
  enterpriseSpotsClaimed: number;
  enterpriseSpotsRemaining: number;
}

export interface PublicFounder {
  founderNumber: number;
  founderType: "member" | "enterprise";
  username: string;
  displayName: string;
  joinedAt: string;
  tier: string;
}

const TIER_PRICE_CENTS: Record<string, number> = {
  pro: 4900,
  elite: 9900,
  whale: 24900,
};

function generateReferralCode(founderNumber: number, type: "member" | "enterprise"): string {
  const prefix = type === "enterprise" ? "SORS-E" : "SORS-F";
  return `${prefix}${String(founderNumber).padStart(3, "0")}`;
}

async function ensureProgramRow(): Promise<void> {
  await pool.query(`
    INSERT INTO founders_program (
      id, is_active, member_spots_total, member_spots_claimed,
      enterprise_spots_total, enterprise_spots_claimed,
      next_member_number, next_enterprise_number
    )
    VALUES (1, false, 500, 0, 5, 0, 1, 1)
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function getProgramStatus(): Promise<FounderProgramStatus> {
  await ensureProgramRow();
  const result = await pool.query(`SELECT * FROM founders_program WHERE id = 1`);
  const row = result.rows[0];
  if (!row) {
    return {
      isActive: false,
      launchedAt: null,
      memberSpotsTotal: 500,
      memberSpotsClaimed: 0,
      memberSpotsRemaining: 500,
      enterpriseSpotsTotal: 5,
      enterpriseSpotsClaimed: 0,
      enterpriseSpotsRemaining: 5,
    };
  }
  return {
    isActive: row.is_active,
    launchedAt: row.launched_at ? new Date(row.launched_at).toISOString() : null,
    memberSpotsTotal: row.member_spots_total,
    memberSpotsClaimed: row.member_spots_claimed,
    memberSpotsRemaining: row.member_spots_total - row.member_spots_claimed,
    enterpriseSpotsTotal: row.enterprise_spots_total,
    enterpriseSpotsClaimed: row.enterprise_spots_claimed,
    enterpriseSpotsRemaining: row.enterprise_spots_total - row.enterprise_spots_claimed,
  };
}

export async function launchProgram(adminUserId: number): Promise<FounderProgramStatus> {
  await ensureProgramRow();

  const existing = await pool.query(`SELECT is_active FROM founders_program WHERE id = 1`);
  if (existing.rows[0]?.is_active) {
    throw new Error("Founders Program is already active");
  }

  await pool.query(`
    UPDATE founders_program
    SET is_active = true, launched_at = NOW(), launched_by_user_id = $1, updated_at = NOW()
  `, [adminUserId]);

  console.log(`[FOUNDERS] Program launched by admin userId ${adminUserId}`);

  sendAnnouncementEmails().catch(err =>
    console.error("[FOUNDERS] Announcement email dispatch failed:", err)
  );

  return getProgramStatus();
}

async function sendAnnouncementEmails(): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT us.username, u.email
      FROM user_subscriptions us
      JOIN users u ON u.username = us.username
      WHERE us.subscription_status = 'active'
        AND us.subscription_tier IN ('pro', 'elite', 'whale')
      LIMIT 2000
    `);

    let sent = 0;
    for (const row of result.rows) {
      try {
        await sendFounderAnnouncementEmail(row.email, row.username);
        sent++;
      } catch (_) {}
    }

    await pool.query(`
      UPDATE founders_program SET announcement_email_sent_at = NOW(), updated_at = NOW()
    `);

    console.log(`[FOUNDERS] Announcement emails sent to ${sent} members`);
  } catch (err) {
    console.error("[FOUNDERS] sendAnnouncementEmails error:", err);
  }
}

/**
 * Auto-grant triggered by Stripe webhook on new active subscription.
 * ALWAYS grants "member" founder type — enterprise is an admin-only manual arrangement
 * (co-founder deal, revenue share, white-label) and is never auto-granted.
 */
export async function autoGrantOnSubscription(
  userId: number,
  username: string,
  email: string,
  tier: "pro" | "elite" | "whale"
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fpRow = await client.query(
      `SELECT is_active, member_spots_total, member_spots_claimed, next_member_number
       FROM founders_program WHERE id = 1 FOR UPDATE`
    );
    if (!fpRow.rows[0] || !fpRow.rows[0].is_active) {
      await client.query("ROLLBACK");
      return false;
    }
    const { member_spots_total, member_spots_claimed, next_member_number } = fpRow.rows[0];
    if (member_spots_claimed >= member_spots_total) {
      await client.query("ROLLBACK");
      return false;
    }

    const userRow = await client.query(
      `SELECT is_founder FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRow.rows[0]?.is_founder) {
      await client.query("ROLLBACK");
      return false;
    }

    const founderNumber = next_member_number;
    const referralCode = generateReferralCode(founderNumber, "member");
    const priceLockAmount = TIER_PRICE_CENTS[tier] || 4900;

    await client.query(`
      UPDATE users
      SET is_founder = true,
          founder_number = $1,
          founder_type = 'member',
          founder_joined_at = NOW(),
          founder_price_locked_tier = $2,
          founder_price_locked_amount = $3,
          founder_referral_code = $4,
          founder_referral_count = 0,
          founder_credits_earned = 0
      WHERE id = $5
    `, [founderNumber, tier, priceLockAmount, referralCode, userId]);

    await client.query(`
      UPDATE founders_program
      SET member_spots_claimed = member_spots_claimed + 1,
          next_member_number = next_member_number + 1,
          updated_at = NOW()
    `);

    await client.query("COMMIT");

    console.log(`[FOUNDERS] Auto-granted Founder #${founderNumber} to ${username} (${tier})`);

    sendFounderWelcomeEmail(email, username, founderNumber, tier, referralCode).catch(err =>
      console.error("[FOUNDERS] Welcome email failed:", err)
    );

    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[FOUNDERS] autoGrantOnSubscription error:", err);
    return false;
  } finally {
    client.release();
  }
}

export async function manualGrant(
  userId: number,
  founderType: "member" | "enterprise",
  adminUserId: number
): Promise<{ success: boolean; founderNumber?: number; referralCode?: string; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fpRow = await client.query(
      `SELECT is_active,
              member_spots_total, member_spots_claimed, next_member_number,
              enterprise_spots_total, enterprise_spots_claimed, next_enterprise_number
       FROM founders_program WHERE id = 1 FOR UPDATE`
    );
    if (!fpRow.rows[0] || !fpRow.rows[0].is_active) {
      await client.query("ROLLBACK");
      return { success: false, error: "Founders Program is not active yet" };
    }

    const {
      member_spots_total, member_spots_claimed, next_member_number,
      enterprise_spots_total, enterprise_spots_claimed, next_enterprise_number,
    } = fpRow.rows[0];

    const userRow = await client.query(
      `SELECT is_founder, username, email FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (!userRow.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "User not found" };
    }
    if (userRow.rows[0].is_founder) {
      await client.query("ROLLBACK");
      return { success: false, error: "User is already a Founder" };
    }

    const { username, email } = userRow.rows[0];

    let founderNumber: number;
    if (founderType === "enterprise") {
      if (enterprise_spots_claimed >= enterprise_spots_total) {
        await client.query("ROLLBACK");
        return { success: false, error: "All Enterprise Founder spots are claimed" };
      }
      founderNumber = next_enterprise_number;
    } else {
      if (member_spots_claimed >= member_spots_total) {
        await client.query("ROLLBACK");
        return { success: false, error: "All Member Founder spots are claimed" };
      }
      founderNumber = next_member_number;
    }

    const tierRow = await client.query(
      `SELECT subscription_tier FROM user_subscriptions WHERE username = $1`,
      [username]
    );
    const tier = tierRow.rows[0]?.subscription_tier || "pro";
    const referralCode = generateReferralCode(founderNumber, founderType);
    const priceLockAmount = founderType === "enterprise" ? 0 : (TIER_PRICE_CENTS[tier] || 4900);

    await client.query(`
      UPDATE users
      SET is_founder = true,
          founder_number = $1,
          founder_type = $2,
          founder_joined_at = NOW(),
          founder_price_locked_tier = $3,
          founder_price_locked_amount = $4,
          founder_referral_code = $5,
          founder_referral_count = 0,
          founder_credits_earned = 0
      WHERE id = $6
    `, [founderNumber, founderType, tier, priceLockAmount, referralCode, userId]);

    if (founderType === "enterprise") {
      await client.query(`
        UPDATE founders_program
        SET enterprise_spots_claimed = enterprise_spots_claimed + 1,
            next_enterprise_number = next_enterprise_number + 1,
            updated_at = NOW()
      `);
    } else {
      await client.query(`
        UPDATE founders_program
        SET member_spots_claimed = member_spots_claimed + 1,
            next_member_number = next_member_number + 1,
            updated_at = NOW()
      `);
    }

    await client.query("COMMIT");

    console.log(`[FOUNDERS] Manual grant — Founder #${founderNumber} (${founderType}) to userId ${userId} by admin ${adminUserId}`);

    if (founderType === "enterprise") {
      sendEnterpriseFounderWelcomeEmail(email, username, founderNumber, referralCode).catch(() => {});
    } else {
      sendFounderWelcomeEmail(email, username, founderNumber, tier, referralCode).catch(() => {});
    }

    return { success: true, founderNumber, referralCode };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[FOUNDERS] manualGrant error:", err);
    return { success: false, error: "Internal error during grant" };
  } finally {
    client.release();
  }
}

export async function revokeFounder(
  userId: number,
  adminUserId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRow = await pool.query(
      `SELECT is_founder, founder_type, username FROM users WHERE id = $1`,
      [userId]
    );
    if (!userRow.rows[0]) return { success: false, error: "User not found" };
    if (!userRow.rows[0].is_founder) return { success: false, error: "User is not a Founder" };

    const founderType = userRow.rows[0].founder_type;

    await pool.query(`
      UPDATE users
      SET is_founder = false,
          founder_number = NULL,
          founder_type = NULL,
          founder_joined_at = NULL,
          founder_price_locked_tier = NULL,
          founder_price_locked_amount = NULL,
          founder_referral_code = NULL,
          founder_referral_count = 0,
          founder_credits_earned = 0
      WHERE id = $1
    `, [userId]);

    if (founderType === "enterprise") {
      await pool.query(`
        UPDATE founders_program
        SET enterprise_spots_claimed = GREATEST(enterprise_spots_claimed - 1, 0), updated_at = NOW()
      `);
    } else {
      await pool.query(`
        UPDATE founders_program
        SET member_spots_claimed = GREATEST(member_spots_claimed - 1, 0), updated_at = NOW()
      `);
    }

    console.log(`[FOUNDERS] Revoked founder status from userId ${userId} by admin ${adminUserId}`);
    return { success: true };
  } catch (err) {
    console.error("[FOUNDERS] revokeFounder error:", err);
    return { success: false, error: "Internal error during revocation" };
  }
}

export async function getFoundersForWall(): Promise<PublicFounder[]> {
  try {
    const result = await pool.query(`
      SELECT
        u.founder_number,
        u.founder_type,
        u.username,
        u.founder_joined_at,
        COALESCE(us.subscription_tier, 'pro') AS tier
      FROM users u
      LEFT JOIN user_subscriptions us ON us.username = u.username
      WHERE u.is_founder = true
      ORDER BY u.founder_number ASC
    `);

    return result.rows.map(row => ({
      founderNumber: row.founder_number,
      founderType: row.founder_type as "member" | "enterprise",
      username: row.username,
      displayName: row.username,
      joinedAt: row.founder_joined_at ? new Date(row.founder_joined_at).toISOString() : new Date().toISOString(),
      tier: row.tier,
    }));
  } catch (err) {
    console.error("[FOUNDERS] getFoundersForWall error:", err);
    return [];
  }
}

export async function getFounderData(username: string): Promise<{
  isFounder: boolean;
  founderNumber: number | null;
  founderType: string | null;
  founderReferralCode: string | null;
  founderCreditsEarned: number;
  founderPriceLockedTier: string | null;
  founderPriceLockedAmount: number | null;
} | null> {
  try {
    const result = await pool.query(`
      SELECT is_founder, founder_number, founder_type, founder_referral_code,
             founder_credits_earned, founder_price_locked_tier, founder_price_locked_amount
      FROM users WHERE username = $1
    `, [username]);

    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      isFounder: r.is_founder || false,
      founderNumber: r.founder_number || null,
      founderType: r.founder_type || null,
      founderReferralCode: r.founder_referral_code || null,
      founderCreditsEarned: r.founder_credits_earned || 0,
      founderPriceLockedTier: r.founder_price_locked_tier || null,
      founderPriceLockedAmount: r.founder_price_locked_amount || null,
    };
  } catch (err) {
    console.error("[FOUNDERS] getFounderData error:", err);
    return null;
  }
}

/**
 * Returns the effective tier a founder should receive based on their founder status.
 * Member founder boost: Sharp→Edge, Edge→Max, Max→Max+ (reserved for future tier above Max)
 * Enterprise founders receive Max + all enterprise co-founder privileges.
 * "max+" is not a billing tier — it flags that the user auto-qualifies for any future tier
 * created above Max, per the Founding 500 benefit spec.
 */
export function getTierBoost(
  tier: string,
  isFounder: boolean,
  founderType: string | null
): string {
  if (!isFounder) return tier;
  if (founderType === "enterprise") return "whale";
  const boostMap: Record<string, string> = {
    pro: "elite",
    elite: "whale",
    whale: "max+",
    free: "pro",
  };
  return boostMap[tier] || tier;
}

export function checkEarlyAccessWindow(
  pickGeneratedAt: Date,
  isFounder: boolean
): boolean {
  if (!isFounder) {
    const releaseTime = new Date(pickGeneratedAt.getTime() + 15 * 60 * 1000);
    return new Date() >= releaseTime;
  }
  return true;
}

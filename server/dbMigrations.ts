import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runMigrations(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_picks (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        sport TEXT NOT NULL DEFAULT 'unknown',
        game_id TEXT NOT NULL DEFAULT 'unknown',
        game TEXT,
        pick TEXT NOT NULL,
        bet_type TEXT NOT NULL,
        odds_at_pick NUMERIC NOT NULL DEFAULT -110,
        placed_at TIMESTAMP DEFAULT NOW(),
        settled BOOLEAN DEFAULT FALSE,
        won BOOLEAN,
        closing_odds NUMERIC,
        clv_result NUMERIC
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        sport TEXT NOT NULL DEFAULT 'unknown',
        game_name TEXT NOT NULL DEFAULT 'unknown',
        alert_game_start BOOLEAN DEFAULT TRUE,
        alert_score_change BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(game_id, user_id)
      )
    `);

    await db.execute(sql`
      ALTER TABLE model_weights
      ADD COLUMN IF NOT EXISTS market_type VARCHAR(20) DEFAULT 'all'
    `);

    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `);

    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS stake NUMERIC DEFAULT 100`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS sportsbook TEXT DEFAULT 'Unknown'`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS legs JSONB DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS notes TEXT`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_betting_profile (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        risk_tolerance TEXT NOT NULL DEFAULT 'moderate',
        preferred_bet_types TEXT[] DEFAULT '{}',
        bankroll_strategy TEXT NOT NULL DEFAULT 'flat',
        bet_frequency TEXT DEFAULT '1-2',
        favorite_teams TEXT[] DEFAULT '{}',
        favorite_leagues TEXT[] DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('team', 'game', 'player')),
        item_name VARCHAR(255) NOT NULL,
        sport VARCHAR(20) NOT NULL,
        details TEXT DEFAULT '',
        alerts BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON user_watchlist(user_id)
    `);

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(12)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_credits (
        id SERIAL PRIMARY KEY,
        referrer_username TEXT NOT NULL,
        referred_username TEXT NOT NULL,
        referred_at TIMESTAMP DEFAULT NOW(),
        credit_applied BOOLEAN DEFAULT FALSE,
        credit_applied_at TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_strategies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        strategy_id VARCHAR(50) NOT NULL,
        strategy_name VARCHAR(100) NOT NULL,
        constraints JSONB NOT NULL DEFAULT '{}',
        notes TEXT,
        override_count INTEGER NOT NULL DEFAULT 0,
        set_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id ON user_strategies(user_id)
    `);

    await db.execute(sql`
      ALTER TABLE user_betting_profile ADD COLUMN IF NOT EXISTS preferred_sportsbooks TEXT[] NOT NULL DEFAULT '{}'
    `);

    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS early_settlement BOOLEAN DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS closing_line_captured_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS sharp_signal BOOLEAN DEFAULT FALSE`);

    await db.execute(sql`ALTER TABLE user_betting_profile ADD COLUMN IF NOT EXISTS bankroll NUMERIC DEFAULT 1000`);
    await db.execute(sql`ALTER TABLE user_betting_profile ADD COLUMN IF NOT EXISTS kelly_fraction NUMERIC DEFAULT 0.25`);
    await db.execute(sql`ALTER TABLE user_betting_profile ADD COLUMN IF NOT EXISTS daily_cap_pct NUMERIC DEFAULT 5`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_onboarding (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        sports TEXT[] NOT NULL DEFAULT '{}',
        experience TEXT NOT NULL DEFAULT '',
        bet_types TEXT[] NOT NULL DEFAULT '{}',
        bankroll_size TEXT NOT NULL DEFAULT '',
        sportsbooks TEXT[] NOT NULL DEFAULT '{}',
        onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trading_cards (
        id VARCHAR(50) PRIMARY KEY,
        pick_id TEXT,
        sport TEXT NOT NULL,
        pick TEXT NOT NULL,
        grade TEXT NOT NULL,
        bet_type TEXT NOT NULL,
        odds NUMERIC NOT NULL,
        confidence NUMERIC NOT NULL,
        ev NUMERIC NOT NULL,
        game TEXT NOT NULL,
        game_time TIMESTAMP NOT NULL,
        max_copies INTEGER NOT NULL,
        copies_issued INTEGER NOT NULL DEFAULT 0,
        settled_result TEXT DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_card_collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id VARCHAR(50) NOT NULL REFERENCES trading_cards(id) ON DELETE CASCADE,
        instance_number INTEGER NOT NULL,
        acquired_via TEXT NOT NULL,
        acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_showcase BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS card_trades (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        offered_collection_ids JSONB NOT NULL DEFAULT '[]',
        requested_card_id VARCHAR(50) REFERENCES trading_cards(id) ON DELETE SET NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // ── Community Integrity Tables ──────────────────────────────────────────
    await db.execute(sql`
      ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS card_signature TEXT
    `);
    await db.execute(sql`
      ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS is_public_showcase BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS card_verification_log (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER NOT NULL,
        card_id VARCHAR(50) NOT NULL,
        issued_to_user_id INTEGER,
        verifier_ip TEXT NOT NULL,
        verifier_user_agent TEXT,
        result TEXT NOT NULL CHECK (result IN ('authentic', 'not_found', 'tampered', 'error')),
        verified_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cvl_collection_id ON card_verification_log(collection_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cvl_verifier_ip ON card_verification_log(verifier_ip)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cvl_verified_at ON card_verification_log(verified_at)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS discord_operator_bindings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discord_user_id TEXT,
        discord_username TEXT,
        discord_server_id TEXT,
        discord_server_name TEXT,
        discord_member_count INTEGER,
        webhook_url TEXT,
        webhook_secret TEXT,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
        suspension_reason TEXT,
        posts_sent INTEGER NOT NULL DEFAULT 0,
        last_post_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_dob_user_id ON discord_operator_bindings(user_id)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS community_fraud_alerts (
        id SERIAL PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        user_id INTEGER,
        username TEXT,
        collection_id INTEGER,
        details JSONB NOT NULL DEFAULT '{}',
        ip_address TEXT,
        auto_actioned BOOLEAN NOT NULL DEFAULT FALSE,
        action_taken TEXT,
        reviewed BOOLEAN NOT NULL DEFAULT FALSE,
        reviewed_by TEXT,
        review_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cfa_alert_type ON community_fraud_alerts(alert_type)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cfa_severity ON community_fraud_alerts(severity)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_cfa_reviewed ON community_fraud_alerts(reviewed)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tier_bypass_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username TEXT,
        user_tier TEXT NOT NULL DEFAULT 'none',
        required_tier TEXT NOT NULL,
        route TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tbl_user_id ON tier_bypass_log(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tbl_attempted_at ON tier_bypass_log(attempted_at)
    `);

    console.log("[Migrations] All startup migrations applied successfully");
  } catch (err: any) {
    console.error("[Migrations] Migration error (non-fatal):", err.message);
  }
}

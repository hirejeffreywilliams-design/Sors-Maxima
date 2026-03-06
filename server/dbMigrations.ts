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

    console.log("[Migrations] All startup migrations applied successfully");
  } catch (err: any) {
    console.error("[Migrations] Migration error (non-fatal):", err.message);
  }
}

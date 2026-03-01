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

    console.log("[Migrations] All startup migrations applied successfully");
  } catch (err: any) {
    console.error("[Migrations] Migration error (non-fatal):", err.message);
  }
}

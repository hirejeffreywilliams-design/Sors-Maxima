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

    // ── Research Notes ────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS research_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL DEFAULT 'Untitled Note',
        content TEXT NOT NULL DEFAULT '',
        note_type VARCHAR(30) NOT NULL DEFAULT 'general',
        sport VARCHAR(20),
        related_game TEXT,
        related_pick TEXT,
        related_team TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_rn_user_id ON research_notes(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_rn_updated_at ON research_notes(updated_at)
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

    // Card system: type, freeze, revoke columns
    await db.execute(sql`ALTER TABLE trading_cards ADD COLUMN IF NOT EXISTS card_type TEXT NOT NULL DEFAULT 'member'`);
    await db.execute(sql`ALTER TABLE trading_cards ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE trading_cards ADD COLUMN IF NOT EXISTS frozen_reason TEXT`);
    await db.execute(sql`ALTER TABLE trading_cards ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE trading_cards ADD COLUMN IF NOT EXISTS frozen_by INTEGER`);

    await db.execute(sql`ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS revoked_reason TEXT`);
    await db.execute(sql`ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE user_card_collections ADD COLUMN IF NOT EXISTS revoked_by INTEGER`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS card_audit_log (
        id SERIAL PRIMARY KEY,
        action_type TEXT NOT NULL,
        card_id TEXT,
        collection_id INTEGER,
        target_user_id INTEGER,
        admin_id INTEGER,
        reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cal_action_type ON card_audit_log(action_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cal_card_id ON card_audit_log(card_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cal_created_at ON card_audit_log(created_at)`);

    // ── Life-Changing Ticket Log ────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS life_changer_log (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        ticket_id TEXT NOT NULL,
        legs JSONB NOT NULL DEFAULT '[]',
        total_legs INTEGER NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL DEFAULT 'pending',
        won_legs INTEGER NOT NULL DEFAULT 0,
        settled_at TIMESTAMPTZ,
        minted_card_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lcl_date ON life_changer_log(date)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lcl_outcome ON life_changer_log(outcome)`);

    // ── Platform Rules (Guidelines) ─────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_rules (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        rule_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pr_category ON platform_rules(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pr_is_active ON platform_rules(is_active)`);

    // Seed default platform rules if table is empty
    const existingRules = await db.execute(sql`SELECT COUNT(*) as cnt FROM platform_rules`);
    const ruleCount = Number((existingRules.rows[0] as any)?.cnt ?? 0);
    if (ruleCount === 0) {
      const defaultRules = [
        { category: "Community Conduct", title: "Zero Tolerance for Harassment", body: "Bullying, threats, targeted harassment, or hate speech of any kind will result in immediate and permanent account termination. Treat every member with respect.", rule_order: 1 },
        { category: "Community Conduct", title: "No Tip Selling or Solicitation", body: "Soliciting payments, gifts, or other compensation from members in exchange for picks, advice, or predictions is strictly prohibited within the platform.", rule_order: 2 },
        { category: "Community Conduct", title: "Respect Member Privacy", body: "Sharing, distributing, or discussing another member's personal information, betting data, or account details without their explicit consent is a serious violation.", rule_order: 3 },
        { category: "Card & Collectibles Policy", title: "Verified Cards Only", body: "Only display cryptographically signed Sors Intelligence Cards as proof of winning picks. Cards without a valid SORS CERTIFIED signature are not recognized as authentic.", rule_order: 1 },
        { category: "Card & Collectibles Policy", title: "No Card Tampering or Forgery", body: "Attempting to alter, duplicate, or forge card data, signatures, or credentials is grounds for immediate permanent ban and possible legal action.", rule_order: 2 },
        { category: "Card & Collectibles Policy", title: "Fair Trading Standards", body: "All card trades must be voluntary and free from coercion, deception, or misrepresentation. Fraudulent trade practices will result in account suspension.", rule_order: 3 },
        { category: "Responsible Gambling & Legal", title: "18+ Requirement", body: "You must be at least 18 years of age (21+ in applicable jurisdictions) to access Sors Maxima's intelligence tools. It is your responsibility to comply with local laws and regulations regarding sports betting.", rule_order: 1 },
        { category: "Responsible Gambling & Legal", title: "Not Financial Advice", body: "All analytical picks, predictions, and intelligence data provided by Sors Maxima are for educational and research purposes only. They do not constitute financial advice, guaranteed outcomes, or investment recommendations.", rule_order: 2 },
        { category: "Responsible Gambling & Legal", title: "Set Your Limits", body: "We strongly encourage all members to set daily, weekly, and monthly loss limits. Never wager money you cannot afford to lose. If gambling is affecting your quality of life, seek help at ncpgambling.org or 1-800-GAMBLER.", rule_order: 3 },
        { category: "Account Policy", title: "One Account Per Person", body: "Each individual is permitted one active account. Creating multiple accounts to circumvent bans, tier restrictions, or referral systems is prohibited.", rule_order: 1 },
        { category: "Account Policy", title: "Keep Credentials Secure", body: "Never share your login credentials, API access, or member-tier content with others. Credential sharing is detected automatically and will result in account suspension.", rule_order: 2 },
        { category: "Account Policy", title: "Subscription Compliance", body: "Member-only content, picks, Intelligence Cards, and analysis tools are licensed to you individually. Redistribution, resale, or public sharing of subscription content is strictly prohibited.", rule_order: 3 },
        { category: "Betting Intelligence Standards", title: "Accuracy Is Never Guaranteed", body: "No prediction system, model, or algorithm — regardless of sophistication — can guarantee winning outcomes. Past performance of the Sors 46-Factor Model does not guarantee future results.", rule_order: 1 },
        { category: "Betting Intelligence Standards", title: "Use Responsible Bankroll Management", body: "Always apply Kelly Criterion principles and use the bankroll tools provided. Chasing losses by exceeding your daily cap is a path to financial harm.", rule_order: 2 },
        { category: "Betting Intelligence Standards", title: "Data Is for Research Only", body: "All odds data, line movement insights, and predictive outputs are provided for analytical research. Always verify information with your licensed sportsbook before placing any wager.", rule_order: 3 },
      ];
      for (const rule of defaultRules) {
        await db.execute(sql`
          INSERT INTO platform_rules (category, title, body, rule_order, is_active)
          VALUES (${rule.category}, ${rule.title}, ${rule.body}, ${rule.rule_order}, TRUE)
        `);
      }
      console.log("[Migrations] Seeded 15 default platform rules");
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pick_feedback (
        id SERIAL PRIMARY KEY,
        pick_id TEXT NOT NULL,
        user_id INTEGER,
        username TEXT NOT NULL DEFAULT 'anonymous',
        vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
        sport TEXT,
        bet_type TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(pick_id, user_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pf_pick_id ON pick_feedback(pick_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pf_user_id ON pick_feedback(user_id)`);
    await db.execute(sql`ALTER TABLE pick_feedback ADD COLUMN IF NOT EXISTS grade TEXT`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pf_grade ON pick_feedback(grade)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        audit_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_state JSONB,
        after_state JSONB,
        metadata JSONB,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_at_user_id ON audit_trail(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_at_action ON audit_trail(action)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_at_entity ON audit_trail(entity_type, entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_at_created ON audit_trail(created_at DESC)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS model_snapshots (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        engine TEXT NOT NULL,
        weights JSONB NOT NULL DEFAULT '{}',
        metrics JSONB NOT NULL DEFAULT '{}',
        trigger TEXT NOT NULL DEFAULT 'scheduled',
        sport TEXT,
        market_type TEXT,
        predictions_since_last INTEGER DEFAULT 0,
        accuracy_at_snapshot REAL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ms_engine ON model_snapshots(engine)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ms_created ON model_snapshots(created_at DESC)`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS label TEXT`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS notes TEXT`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS accuracy REAL`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS brier_score REAL`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS home_win_rate REAL`);
    await db.execute(sql`ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS spread_cover_rate REAL`);

    // ── user_picks performance indexes ────────────────────────────────────────
    // These are the most-queried columns: every user's bet history page,
    // settlement engine, and CLV reports hit user_picks hard. Without indexes
    // the DB does full table scans as pick count grows.
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_username       ON user_picks(username)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_settled        ON user_picks(settled)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_placed_at      ON user_picks(placed_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_sport          ON user_picks(sport)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_username_settled ON user_picks(username, settled)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_up_username_placed  ON user_picks(username, placed_at DESC)`);

    // ── prop_track_records ─────────────────────────────────────────────────────
    // Stores every model-recommended player prop pick for track record + learning.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS prop_track_records (
        id              SERIAL PRIMARY KEY,
        player_name     TEXT NOT NULL,
        sport           TEXT NOT NULL,
        market          TEXT NOT NULL,
        market_label    TEXT NOT NULL,
        line            REAL NOT NULL,
        selection       TEXT NOT NULL,
        american_odds   INTEGER NOT NULL,
        home_team       TEXT NOT NULL DEFAULT '',
        away_team       TEXT NOT NULL DEFAULT '',
        confidence_score INTEGER NOT NULL DEFAULT 0,
        confidence_grade TEXT NOT NULL DEFAULT 'B',
        edge            REAL NOT NULL DEFAULT 0,
        model_probability REAL NOT NULL DEFAULT 0.5,
        implied_probability REAL NOT NULL DEFAULT 0.5,
        factors         JSONB NOT NULL DEFAULT '[]',
        bookmaker       TEXT,
        data_source     TEXT NOT NULL DEFAULT 'model',
        outcome         TEXT NOT NULL DEFAULT 'pending',
        actual_result   REAL,
        generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        settled_at      TIMESTAMPTZ
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ptr_sport    ON prop_track_records(sport)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ptr_outcome  ON prop_track_records(outcome)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ptr_gen_at   ON prop_track_records(generated_at DESC)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_ptr_dedup ON prop_track_records(player_name, market, selection, DATE(generated_at))`);

    console.log("[Migrations] All startup migrations applied successfully");
  } catch (err: any) {
    console.error("[Migrations] Migration error (non-fatal):", err.message);
  }
}

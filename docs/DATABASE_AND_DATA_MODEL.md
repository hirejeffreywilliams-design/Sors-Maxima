# Database & Data Model Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

Sors Maxima uses a PostgreSQL database managed by Replit. The database stores all persistent platform data — users, subscriptions, picks, bets, cards, and community data. This document explains what's stored, where, and how it's organized.

---

## Database Technology

- **Database:** PostgreSQL (Replit-managed, auto-backed-up)
- **ORM:** Drizzle ORM (type-safe TypeScript query builder)
- **Schema file:** `server/dbSchema.ts`
- **Migrations:** Applied automatically on startup
- **Connection:** Via `DATABASE_URL` environment variable

---

## Core Database Tables

### `users`
The main user accounts table. Every registered member is a row here.

| Column | Type | Description |
|---|---|---|
| id | integer | Auto-generated primary key |
| username | varchar | Unique username |
| email | varchar | Unique email address |
| passwordHash | varchar | Bcrypt-hashed password (never stored in plain text) |
| tier | varchar | Subscription tier: `free`, `sharp`, `edge`, `max` |
| stripeCustomerId | varchar | Stripe customer ID for billing |
| stripeSubscriptionId | varchar | Active Stripe subscription ID |
| subscriptionStatus | varchar | `active`, `canceled`, `past_due`, `trialing` |
| emailVerified | boolean | Whether email has been confirmed |
| createdAt | timestamp | Account creation date |
| lastLoginAt | timestamp | Last login timestamp |
| isAdmin | boolean | Admin flag (only owner) |
| onboardingCompleted | boolean | Whether onboarding flow is done |

### `picks`
Every prediction the engine generates is stored here.

| Column | Type | Description |
|---|---|---|
| id | integer | Auto-generated primary key |
| sport | varchar | NBA, NFL, NHL, MLB, etc. |
| game | varchar | "Team A vs Team B" |
| pick | text | The actual recommendation |
| grade | varchar | A+, A, B, C, D, F |
| confidence | real | 0–100 confidence percentage |
| odds | integer | American odds (e.g., -110) |
| predictedOutcome | varchar | win/loss/push after settlement |
| actualOutcome | varchar | Actual result after settlement |
| settled | boolean | Whether the game has completed |
| settledAt | timestamp | When the pick was settled |
| createdAt | timestamp | When the pick was generated |
| factors | jsonb | The 46 factor scores for this pick |
| reasoning | text | AI-generated explanation |

### `userBets`
Members' recorded bets (either from paper trading or manual entry).

| Column | Type | Description |
|---|---|---|
| id | integer | Primary key |
| userId | integer | Foreign key to users |
| pickId | integer | Foreign key to picks (if using platform pick) |
| sport | varchar | Sport |
| betType | varchar | spread, moneyline, total, prop |
| stake | real | Amount wagered |
| odds | integer | American odds at time of bet |
| outcome | varchar | pending, win, loss, push |
| profit | real | Profit/loss amount |
| isPaperBet | boolean | Real or simulated bet |
| createdAt | timestamp | When bet was recorded |

### `tradingCards`
The Intelligence Card NFT-like objects that members collect.

| Column | Type | Description |
|---|---|---|
| id | varchar | Unique card ID |
| pickId | text | The pick this card commemorates |
| sport | text | Sport |
| pick | text | The pick description |
| grade | text | Card grade (mirrors pick grade) |
| betType | text | Bet type |
| game | text | Game description |
| gameTime | timestamp | When the game was played |
| maxCopies | integer | How many of this card can exist |
| copiesIssued | integer | How many have been minted so far |
| settledResult | text | win/loss/push/pending |
| cardType | text | member, admin, legendary, etc. |
| isFrozen | boolean | Whether card is frozen (fraud) |
| frozenReason | text | Why card was frozen if applicable |
| createdAt | timestamp | When card was minted |

### `userCardCollections`
Which cards each member owns.

| Column | Type | Description |
|---|---|---|
| id | integer | Primary key |
| userId | integer | Owner's user ID |
| cardId | varchar | Card ID |
| instanceNumber | integer | This member's copy number (e.g., copy #47 of 100) |
| acquiredVia | text | How they got it: earned, traded, admin-granted |
| acquiredAt | timestamp | When they got it |
| isShowcase | boolean | Whether displayed in profile |
| isPublicShowcase | boolean | Whether visible to other members |
| isFeatured | boolean | Featured in profile header |
| isRevoked | boolean | Whether card was revoked (fraud) |
| revokedReason | text | Reason for revocation |

### `cardTrades`
Trade requests between members.

| Column | Type | Description |
|---|---|---|
| id | integer | Primary key |
| fromUserId | integer | User initiating trade |
| toUserId | integer | User receiving trade request |
| offeredCardId | varchar | Card being offered |
| requestedCardId | varchar | Card being requested |
| message | text | Trade message |
| status | text | pending, accepted, rejected, cancelled |
| createdAt | timestamp | When trade was proposed |

### `cardAuditLog`
Immutable audit trail for all card actions (minting, freezing, revoking, trading).

| Column | Type | Description |
|---|---|---|
| id | integer | Primary key |
| actionType | text | minted, frozen, revoked, traded, granted |
| cardId | text | Which card |
| collectionId | integer | Which collection instance |
| targetUserId | integer | Which user was affected |
| adminId | integer | Which admin took action (if applicable) |
| reason | text | Why the action was taken |
| metadata | jsonb | Additional context |
| createdAt | timestamp | When the action occurred |

### `applications`
Membership applications / waitlist entries.

| Column | Type | Description |
|---|---|---|
| id | integer | Primary key |
| userId | integer | User ID if they already have an account |
| email | varchar | Applicant email |
| username | varchar | Desired username |
| tier | varchar | Tier they're applying for |
| experience | varchar | Their betting experience level |
| goals | text | What they want to achieve |
| status | varchar | pending, approved, rejected |
| adminNotes | text | Your private notes on this application |
| createdAt | timestamp | Application date |

---

## Data Stored Outside the Database

Not everything is in PostgreSQL. Some data is stored in files for performance:

| Data Type | Storage Location | Description |
|---|---|---|
| Platform intelligence | `server/platform-intelligence-data.json` | Aggregated win rates, team records, prediction stats |
| Precomputed picks cache | `server/picks-cache/*.json` | Latest picks per sport (fast retrieval) |
| ML calibration data | `server/calibration-data.json` | Factor weights and model calibration state |
| Monte Carlo results | `server/monte-carlo-cache.json` | Pre-simulated game probabilities |
| Team form data | `server/team-form-cache.json` | Recent form metrics for all teams |
| AI assistant history | In-memory (session-based) | Resets on server restart |
| Pick training dataset | `server/pipeline-history/*.json` | Historical picks with outcomes for ML training |

---

## Data Backup Strategy

**Automatic backups:** Replit manages PostgreSQL backups automatically. Snapshots are taken periodically.

**What's not backed up automatically:**
- JSON cache files (can be rebuilt from APIs)
- Training data files (important — back these up manually periodically)

**Manual backup recommendation:** Monthly export of:
1. All user data (from `/api/account/export` endpoint per user)
2. All picks and outcomes (from admin data export)
3. Training history files

---

## Data Privacy Notes

- Passwords are **never stored in plain text** — always bcrypt-hashed
- Payment information is **never stored** — all billing data lives in Stripe
- PII (personally identifiable information) is minimized — the `piiMinimization.ts` service scrubs sensitive data before it enters logs
- Card numbers, CVVs — never touched by the platform
- GDPR/CCPA: Users can request account deletion via settings (data deletion is supported)

---

## Database Access

The database is accessed exclusively through the Drizzle ORM layer in `server/storage.ts`. Direct SQL queries are avoided except in migrations. This ensures:
- Type safety (TypeScript catches schema mismatches at compile time)
- SQL injection protection (parameterized queries)
- Consistent data validation (Zod schemas on all inputs)

To inspect the database directly (for debugging only), use the database admin tool in Replit's workspace panel.

---

## OMNISCRIPT INTEGRATION

> © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

### OmniScript Powers Sors Maxima Sports Betting Intelligence Platform

**Sors Maxima Sports Betting Intelligence Platform** is implemented in **OmniScript** — the proprietary domain-specific language (file extension `.omni`) of the OmniDLOS / Omnivex ecosystem. OmniScript is the Cognitive Layer of the Four-Dimensional Operating System, designed to express computation, emotional intelligence, dimensional architecture, and temporal awareness in a single unified language.

#### OmniScript Constructs in Sors Maxima Sports Betting Intelligence Platform

The platform's core architecture is declared within the **`SportsIntelligenceUniverse`** — an OmniScript `universe` block operating at `Dimension.TEMPORAL`:

- **Primary Engine:** `BettingPredictionEngine` — registered in the OmniVault package registry
- **Supporting Engines:** `MonteCarloSimulationEngine`, `OddsArbitrageEngine`, `LifeChangerTicketEngine`
- **Services:** `FactorModelService`, `OddsAggregationService`, `IntelligenceCardService`
- **Nexus Points:** All external interfaces declared as typed OmniScript `portal` Nexus Points
- **Vaults:** All persistent data archived via `Nova.Vault` with Guardian Layer protection
- **Cross-Dimensional Bus:** `Nova.Bus` enables real-time Signal exchange with all 13 OmniDLOS platforms

#### OmniScript Code Sample

```omni
// Sors Maxima — 46-Factor Betting Prediction Engine
universe SportsIntelligenceUniverse {
  dimension: Dimension.TEMPORAL
  vibe: Vibe.PRECISION

  forge FACTOR_COUNT: Integer = 46
  forge SIMULATION_RUNS: Integer = 10_000
  forge MIN_EV_THRESHOLD: Float = 3.5
  forge CALIBRATION_WINDOW: Integer = 90  // days

  engine BettingPredictionEngine implements Intelligent {
    manifest flow analyzMatchup(homeTeam: Text, awayTeam: Text, market: Text): flow<Prediction> {
      forge factors    = sync FactorModelService.computeAll(homeTeam, awayTeam, FACTOR_COUNT)
      forge simulation = sync MonteCarloSimulationEngine.run(factors, runs: SIMULATION_RUNS)
      forge odds       = sync OddsAggregationService.fetch(homeTeam, awayTeam, market)

      forge ev: Float = simulation.expectedValue(odds)
      forge confidence: Probability = simulation.confidenceInterval(0.95)

      when (ev >= MIN_EV_THRESHOLD) {
        Nova.Bus.emit("pick.high-ev", { matchup: `${homeTeam} vs ${awayTeam}`, ev, confidence })
      }

      propagate Prediction { factors, simulation, odds, ev, confidence }
    }

    manifest flow generateLifeChangerTicket(date: Chronicle): flow<ParlayTicket> {
      forge picks = sync BettingPredictionEngine.getDailyBestPicks(date, minOdds: 1000)
      forge ticket = sync LifeChangerTicketEngine.compose(picks)
      Nova.Vault.archive("life-changer-ticket", ticket)
      propagate ticket
    }
  }
}
```

#### OmniDLOS Terminology Reference

| OmniDLOS Term | Meaning in Sors Maxima Sports Betting Intelligence Platform |
|---|---|
| **Nexus Point** | Any API or integration interface declared in OmniScript `portal` syntax |
| **Vault** | The encrypted, immutable data repository storing all platform state |
| **Guardian Layer** | The `@Guardian(level: N)` access control system protecting sensitive Engine operations |
| **Pulse** | The real-time scoring type used for all algorithmic outputs |
| **Signal** | A typed event propagated via `Nova.Bus` to the Inter-Dimensional Bus |
| **Chronicle** | The OmniScript temporal type — dates with legacy and historical awareness |
| **Constellation** | The OmniScript collection type — dimensional arrays with typed membership |
| **Universe** | The `SportsIntelligenceUniverse` namespace — the dimensional scope of the platform |

© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

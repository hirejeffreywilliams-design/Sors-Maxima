# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to enhance sports betting parlays. It integrates real-time ESPN game data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge through data-driven decision-making, emphasizing transparent and live data sourcing, with the goal of becoming a leader in the sports betting intelligence market.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application features a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing.

**Route Module Architecture**: The backend routes are organized into focused modules in `server/routes/` for authentication, administration, betting, account management, community features, intelligence, notifications, and shared middleware.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: A central data pipeline (`server/unifiedIntelligenceHub.ts`) aggregates all data sources (ESPN, The Odds API, Open-Meteo) on a 60-second cycle, providing a unified `IntelligenceFeed` to all consuming engines and the frontend.
- **Command Center**: The primary dashboard (`/`) offers an at-a-glance view of intelligence, including opportunity scores, top picks, live game tracking, edge alerts, and data source health, refreshing every 30 seconds.
- **Intelligent Ticket Generation**: Includes a Smart Ticket Generator and Visual Parlay Builder for automated and visual construction of betting tickets with real-time data and suggestions.
- **Advanced Analytics & Predictive Engines**: Incorporates a Continuous Learning Engine, Quantum Fusion Engine (integrating 46 factors), Scheme Recognition Engine, and Monte Carlo simulations with advanced statistical methods for optimal stake sizing using an advanced Kelly Criterion implementation.
- **Advanced Monte Carlo Engine**: A dedicated simulation engine (`server/monteCarloEngine.ts`) uses advanced RNG and sampling methods to model game outcomes, running 10k matchup and 50k parlay simulations. It features self-learning via Bayesian updating, risk analytics, and integrates with other engines.
- **Pick Protection & Monetization System**: A comprehensive line protection engine (`server/pickProtectionEngine.ts`) prevents concentrated user action from moving betting lines. Features: (1) Staggered pick release by tier — Max gets picks immediately, Edge 15min later, Sharp 30min, Free 60min; (2) Pick capacity limits — tail tracking with tier-based caps (whale unlimited, elite 200, pro 100, free 50); (3) Diversified pick distribution — deterministic username-seeded subsets prevent all users seeing identical picks (whale 100%, elite 80%, pro 60%, free 15%); (4) Exclusive whale-only picks — high-confidence (>85%) + high-edge (>5%) + A-grade picks visible only to Max tier; (5) Frontend UI with capacity bars, exclusive/early-access badges, countdown timers for pending releases, and upgrade CTAs.
- **Precomputed Predictions Engine**: Runs every 5 minutes across in-season sports, combining Quantum Fusion analysis with Vegas engine predictions, displayed on Daily Picks and the Command Center. Each pick includes specific game-context reasoning (team records, Monte Carlo projections, injury impact, rest/situational analysis) and market timing signals (bet_now/wait/line_locked).
- **Situational Analysis Engine**: A real-time engine (`server/situationalEngine.ts`) calculates actual rest days, back-to-back detection, schedule spot classification (letdown/look-ahead/trap/revenge), and travel factors from live ESPN schedule data. Feeds directly into Quantum Fusion analysis.
- **CLV Tracker**: User picks are stored in `user_picks` PostgreSQL table with odds at placement time. Closing odds are updated during settlement. CLV (Closing Line Value) summary endpoint tracks CLV+ rate, average CLV, and streaks — the gold standard metric for sharp betting.
- **Line Movement Intelligence**: Edge alerts now include contextual reasoning explaining WHY lines moved (injury news, sharp money, weather changes) and market timing signals (early_value/settled/steam).
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" profile, performance trends, and personalized game recommendations from the Intelligence Feed.
- **Unified Tools & Analytics Page**: A single `/tools` page consolidates all betting analysis tools: correlation engine, SGP optimizer, ML prop projections, matchup analyzer, bankroll simulator, and 30+ other modules organized by category. The `/pro-tools` route redirects to `/tools`.
- **Consolidated Odds Center**: `/odds-center` combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings as tabs sharing a single `/api/market-snapshot` data query. Old routes `/ev-heatmap`, `/line-movement`, `/power-rankings` redirect here.
- **Consolidated Profile**: `/profile` combines Account Profile, Betting DNA, and Bet History as tabs. Old routes `/betting-profile`, `/bet-history`, `/ticket-history` redirect here.
- **Consolidated Community**: `/community` combines Feed, Tipster Groups, and Shared Tickets as tabs. Old routes `/tipster-communities`, `/shared-tickets` redirect here.
- **Consolidated Bet Builder**: `/builder` combines Parlay Builder, Straight Bets, Same Game Parlay, Teasers, and Round Robin as tabs. Old routes `/straight-bets`, `/sgp`, `/teasers`, `/round-robin` redirect here.
- **Engine Consolidation**: Learning engine's 1-second interval merged into orchestrator's retraining cycle. SSE broadcast reduced from 15s to 30s. Monte Carlo pre-simulation reduced from 2min to 5min. Monte Carlo caches limited to 200 entries with LRU eviction.
- **Comprehensive Pro Tools**: Offers real-time odds comparison, ML prop projections, correlation engine, same-game parlay optimizer, bankroll simulator, Cashout Maximizer, and Live Hedge Calculator.
- **Server-Sent Events (SSE) Live Updates**: Real-time push updates via `server/sseManager.ts` for intelligence, live scores, and edge alerts, with frontend integration for automatic cache invalidation and connection management.
- **Custom Notification Engine**: A real-time notification system (`server/notificationEngine.ts`) monitors ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE. Game subscriptions are persisted to `notification_subscriptions` PostgreSQL table, surviving server restarts.
- **Real-Time Data Infrastructure**: Implements a 60-second refresh cycle for ESPN live scores and game states, integrating market odds from The Odds API for live EV analysis.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware in `server/routes/helpers.ts`. Tiers: Free, Pro/Sharp ($49/mo), Elite/Edge ($99/mo), Whale/Max ($249/mo). Admins bypass all tier checks. Routes are gated across `betting.ts`, `intelligence.ts`, and `account.ts`.
- **Persistent Watchlist**: User watchlists are stored in the `user_watchlist` PostgreSQL table (not in-memory), surviving server restarts. Routes in `server/routes/account.ts` use Drizzle raw SQL queries.
- **Persistent Onboarding**: User onboarding preferences (sports, experience level, bet types, bankroll) are stored in `user_onboarding` PostgreSQL table, surviving server restarts.
- **Persistent Stripe Subscriptions**: Subscription data (tier, status, trial dates, Stripe IDs) stored in `user_subscriptions` PostgreSQL table, surviving server restarts. Webhook handlers for `subscription.created`, `subscription.updated`, `subscription.deleted`, and `invoice.payment_failed`. No more in-memory Maps.
- **Persistent Community Data**: Communities, members, picks, and tips stored in PostgreSQL tables (`communities`, `community_members`, `community_picks`, `community_tips`). Platform fee calculations (15%) and creator earnings persist across restarts.
- **Dynamic Vegas Power Ratings**: The Vegas engine (`server/vegas-engine.ts`) now computes power ratings dynamically from `platformIntelligenceEngine` team stats (win%, points for/against) instead of static hardcoded values. Falls back to static ratings only when no live data available. Sharp money data sourced from Intelligence Hub edge alerts.
- **No Free Trial**: New users start on the Free tier with no trial period. This is an exclusive, members-only platform — users must subscribe via Stripe to access any premium features. Legacy trialing users are auto-converted to Free tier.
- **Onboarding Guard**: New users are automatically redirected to `/onboarding` after registration. The `OnboardingGuard` component in `App.tsx` checks `GET /api/user/onboarding` and redirects until `onboardingCompleted` is true.
- **Persistent Ticket History**: User ticket history is stored in the `ticket_history` PostgreSQL table (not localStorage), surviving device switches and restarts. Full CRUD via `/api/user/ticket-history` endpoints.
- **Persistent Betting Profile**: User betting preferences (risk tolerance, bet types, strategy, favorites) stored in `user_betting_profile` PostgreSQL table with upsert logic.
- **Smart Sport Tabs**: Daily Picks page dynamically shows only in-season sports using `GET /api/sports/in-season` endpoint backed by `sportSeasons.ts`. Off-season sports are hidden entirely.
- **Prediction Accuracy Pipeline**: `platformIntelligenceEngine.ts` exposes `recordGameOutcome()` which is called by `continuousLearningOrchestrator.ts` after auto-settlement, persisting prediction accuracy data to `platform-intelligence-data.json`.
- **Tier-Based Rate Limiting**: Expensive endpoints (ticket generation, parlay generation, evaluation, grading) are protected by `rateLimitByTier()` middleware in `server/routes/helpers.ts`. Limits are per-tier per-hour (e.g., Sharp: 25 ticket generations/hr, Elite: 100/hr, Whale: 500/hr). No credit system — all tiers have unlimited daily usage within rate limits.
- **Security Architecture**: A multi-layered security framework includes security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures for tickets. Session secrets and algorithm protection keys auto-generate via `crypto.randomBytes()` when env vars are not set (no hardcoded fallbacks).
- **Automated Operations**: A Continuous Learning Orchestrator manages auto-settlement, model retraining, data freshness, and calibration drift detection.
- **Unified Market Data API**: A `GET /api/market-snapshot` endpoint merges live ESPN scoreboard data with multi-bookmaker Odds API pricing for consensus pricing, best lines, and edge analysis.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generates structured admin reports with prioritized tasks via OpenAI analysis of live platform data.
- **Hidden Analytics Agent**: A real-time, server-side analytics agent (`server/analyticsAgentEngine.ts`) continuously ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: A self-growing data engine (`server/platformIntelligenceEngine.ts`) accumulates game outcomes, prediction accuracy, odds snapshots, and community consensus, persisting data for continuous learning.
- **App Guardian Engine**: A continuous health monitoring system (`server/appGuardianEngine.ts`) performs health checks, service monitoring, error analysis, auto-healing, and AI diagnostics across critical services.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
- **Sports Data**: ESPN
- **Odds Data**: The Odds API
- **Soccer Data**: API-Football
- **Injury Data**: ESPN free injury API
- **Weather Data**: Open-Meteo free weather API
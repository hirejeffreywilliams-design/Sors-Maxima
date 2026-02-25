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
- **Precomputed Predictions Engine**: Runs every 5 minutes across in-season sports, combining Quantum Fusion analysis with Vegas engine predictions, displayed on Daily Picks and the Command Center. Each pick includes specific game-context reasoning (team records, Monte Carlo projections, injury impact, rest/situational analysis) and market timing signals (bet_now/wait/line_locked).
- **Situational Analysis Engine**: A real-time engine (`server/situationalEngine.ts`) calculates actual rest days, back-to-back detection, schedule spot classification (letdown/look-ahead/trap/revenge), and travel factors from live ESPN schedule data. Feeds directly into Quantum Fusion analysis.
- **CLV Tracker**: User picks are stored in `user_picks` PostgreSQL table with odds at placement time. Closing odds are updated during settlement. CLV (Closing Line Value) summary endpoint tracks CLV+ rate, average CLV, and streaks — the gold standard metric for sharp betting.
- **Line Movement Intelligence**: Edge alerts now include contextual reasoning explaining WHY lines moved (injury news, sharp money, weather changes) and market timing signals (early_value/settled/steam).
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" profile, performance trends, and personalized game recommendations from the Intelligence Feed.
- **Comprehensive Pro Tools**: Offers real-time odds comparison, ML prop projections, correlation engine, same-game parlay optimizer, bankroll simulator, Cashout Maximizer, and Live Hedge Calculator.
- **Server-Sent Events (SSE) Live Updates**: Real-time push updates via `server/sseManager.ts` for intelligence, live scores, and edge alerts, with frontend integration for automatic cache invalidation and connection management.
- **Custom Notification Engine**: A real-time notification system (`server/notificationEngine.ts`) monitors ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE.
- **Real-Time Data Infrastructure**: Implements a 60-second refresh cycle for ESPN live scores and game states, integrating market odds from The Odds API for live EV analysis.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware in `server/routes/helpers.ts`. Tiers: Free, Pro/Sharp ($49/mo), Elite/Edge ($99/mo), Whale/Max ($249/mo). Admins bypass all tier checks. Routes are gated across `betting.ts`, `intelligence.ts`, and `account.ts`.
- **Persistent Watchlist**: User watchlists are stored in the `user_watchlist` PostgreSQL table (not in-memory), surviving server restarts. Routes in `server/routes/account.ts` use Drizzle raw SQL queries.
- **Prediction Accuracy Pipeline**: `platformIntelligenceEngine.ts` exposes `recordGameOutcome()` which is called by `continuousLearningOrchestrator.ts` after auto-settlement, persisting prediction accuracy data to `platform-intelligence-data.json`.
- **Tier-Based Rate Limiting**: Expensive endpoints (ticket generation, parlay generation, evaluation, grading) are protected by `rateLimitByTier()` middleware in `server/routes/helpers.ts`. Limits are per-tier per-hour (e.g., Sharp: 25 ticket generations/hr, Elite: 100/hr, Whale: 500/hr). No credit system — all tiers have unlimited daily usage within rate limits.
- **Security Architecture**: A multi-layered security framework includes security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures for tickets.
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
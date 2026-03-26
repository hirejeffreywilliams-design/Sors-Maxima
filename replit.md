# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a members-only sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge in the sports betting market by emphasizing transparent and live data sourcing, helping users make more informed betting decisions. The project's ambition is to revolutionize sports betting through an AI-powered, data-driven approach, offering personalized insights and tools for both individual bettors and community operators.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. The system is designed around a unified intelligence hub that aggregates real-time data for analysis and personalized insights. The frontend is pre-built and served as static files by the backend.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **AI-Powered Betting Tools**: Includes a Daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, Matchup Ticket Builder, and a Ticket Variation Engine, powered by advanced analytics and predictive engines.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, Strategy Advisor, and an AI Pick Edge Insight Engine using GPT-4o-mini.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Real-time Data and Analytics**: Features a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker with Server-Sent Events (SSE) for live updates. SSE on `/api/sse/stream` broadcasts intelligence, live scores, odds, and sharp signals every 30 seconds.
- **Live Odds Integration**: `POST /api/odds/live-legs` resolves current market odds for parlay legs, polling every 30 seconds and refreshing on SSE `odds-update` events.
- **Cashout Advisor**: Includes a dedicated `/api/cashout-advisor/all` route for live game analysis and features like StructureFeedback, Progressive Cashout Calculator (Lock & Roll™), and Line Movement Exit Calculator (Steam Exit™).
- **User Engagement & Personalization**: Offers Personalized Betting Insights, a Consolidated Odds Center, and a persistent bet slip with multi-slip management.
- **Sors Books Intelligence Hub**: Allows users to manage sportsbooks, track balances, and compare live odds.
- **Intelligence Cards™**: A trading card system with `system`, `member`, and `admin_seeded` card types, visual effects, and strategy inference on card backs, officially displayed as "Intelligence Cards™".
- **Research Notes**: Personal notebook functionality for users to save pick analysis.
- **Platform Guidelines System**: Admin-managed rules for community conduct, card policies, and responsible gambling.
- **Admin Operational Tools**: Includes Platform Broadcasts, Emergency Controls, User Detail Panel, and Force Tier Change.
- **Life-Changing Ticket (LCT) Track Record**: Daily LCTs are logged, settled by admin, and winning LCTs mint `S+` grade system cards.
- **Community Integrity Engine**: An anti-fraud system to detect card velocity abuse and credential sharing.
- **Monetization & Tiered Features**: Implements Stripe for subscriptions (Sharp, Edge, Max tiers) and a Referral System, with features gated by subscription, including a 7-day free trial for the Edge tier.
- **Smart Retention Sequence Engine™**: Runs hourly to send targeted emails for trial education, urgency, win-back, and upgrade nudges.
- **Revenue Intelligence Dashboard**: `GET /api/admin/revenue/intelligence` computes live MRR, ARR, LTV, trial conversion, churn, and revenue at risk, displayed on the `/admin/marketing` page and auto-refreshes every 60 seconds.
- **One-Click Campaign Launcher**: Provides instant campaign buttons on `/admin/marketing` to launch targeted email campaigns.
- **Proprietary Branding & Lexicon**: Uses "Sors" branding and a proprietary terminology framework (Sors Lexicon™).
- **Global Visual Redesign**: Utilizes a glassmorphism, gradient-based design system with a premium three-color palette.
- **Persistent Data Storage**: Uses PostgreSQL for storing user data, watchlists, preferences, and betting profiles.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and an Autonomous App Intelligence Engine.
- **Mobile UX Enhancements**: Includes Swipe Mode for picks and a Mobile Card Stack Deck.
- **Code Splitting**: All pages use `React.lazy` with `Suspense` for faster initial load times.
- **Onboarding Flow**: Guided first-time experience at `/onboarding`.
- **Odds Source Attribution**: Every precomputed pick card shows which sportsbook offers the best odds, with attribution from "The Odds API" or "ESPN-derived".
- **Favorites & Watchlist**: DB-backed watchlist at `/watchlist` with add/remove teams and games.
- **Data Freshness Indicator**: Displays last-updated timestamps and source labels across data views.
- **Company Standards System**: `server/companyStandards.ts` acts as a single source of truth for grade thresholds, prohibited phrases, brand voice, tier standards, and AI compliance context.
- **Admin Policy & Standards Page**: Full CRUD interface at `/admin/policy-standards` for managing policies, procedures, and AI brand standards.
- **Responsible Gambling Notice**: Provides 3 variants (banner/compact/footer) with localStorage dismissal and helpline information.
- **Background Prefetch Scheduler**: `server/prefetchScheduler.ts` proactively warms odds, scoreboard, and player props caches on intervals (3m, 2m, 10m). Respects budget optimizer throttling. Starts 8+ min after boot via `safeStart`.
- **Player Props Tier Gating**: `/api/game-player-props/:sport`, `/api/top-props/:sport`, `/api/real-player-props/:sport`, and `/api/tools/player-props/:sport` all require `elite` or `whale` tier. Lower-tier users see a branded upgrade teaser on the Player Props page.
- **System Control Room**: Admin-only tab in `/admin` with 7 quick-action buttons (clear response cache, flush disk cache, force prefetch, rotate API key, resume budget optimizer, force refresh picks, restart autonomous monitor), real-time API key quota status, prefetch task monitoring, and a rolling 20-entry action log. Backend endpoints at `/api/admin/control-room/*`.
- **SSE Authentication**: `/api/sse/stream` is protected by `requireAuth` middleware.
- **TBD Team Filtering**: All ticket builders and the unified intelligence hub filter out picks where `homeTeam === "TBD"` or `awayTeam === "TBD"`.
- **Adaptive Engine Scheduling**: `precomputedPredictionsEngine.ts` uses a self-scheduling `setTimeout` pattern with an adaptive interval based on game proximity.
- **Game Window Scheduler**: `server/gameWindowScheduler.ts` exports `isGameWindowActive()`, `getGameWindowInfo()`, `msUntilNextGameWindow()`. Detects active windows: 90-min pre-game, in-progress, 60-min post-game cooldown. Sharp Signal Detector and Monte Carlo Engine skip Odds API calls when idle, saving ~780+ calls/day overnight. Intelligence Hub uses 120s refresh when active vs 5-min when idle. Market snapshot TTL extends from 22→45 min off-peak. Admin visibility at `/api/admin/game-window` and on the System Health page.
- **Admin System Health Page**: Live dashboard at `/admin/system-health` showing system metrics, engine status, and Odds API quota. Enhanced `/api/admin/system-health` endpoint aggregates engine manifest, API key quotas, SSE counts, pipeline health, quality watchdog, and feature flags.
- **Engine Startup Manifest**: `server/index.ts` tracks all `safeStart` engine registrations with status (pending/running/failed). Prints a formatted manifest table after all engines have started. Async failures are captured via promise chaining. `getEngineManifest()` is exported for the system-health endpoint.
- **Admin Nervous System Tab**: `/admin` tab with auto-refreshing (10s) engine grid showing: heap usage, uptime, engine manifest, SSE clients, data pipeline sources, quality grade, prediction engine status, API keys, and feature flags.
- **Hardened Intelligence Hub Startup**: `server/unifiedIntelligenceHub.ts` uses sequential per-sport initialization with explicit degraded mode logging instead of parallel `Promise.allSettled`.
- **Memory Pressure Guard**: `precomputedPredictionsEngine.ts` skips prediction cycles and serves stale cache if heap memory usage exceeds 80%, broadcasting a `system-alert` SSE event. `sseManager.ts` also proactively monitors memory.
- **Stale Cache Age Badge**: Displays a badge on pick cards indicating data age when `dataSource !== "live"` and data is older than 10 minutes.
- **Player Prop Track Record**: `prop_track_records` PostgreSQL table stores high-confidence prop recommendations for tracking and analysis.
- **Enhanced Prop Intelligence Engine**: Upgraded with public over-bias correction, sharp signal detection, and historical learning feedback from `prop_track_records`.
- **Calibration Engine Fix (ALR-002)**: `predictionPipelineEngine.ts` calls `getCalibrationReport()` from `monteCarloEngine.ts` for real-data calibration error computation.
- **API Budget Optimizer Correction**: Corrected `apifootball` budget and implemented throttle-aware cache TTL in `odds-provider.ts`.
- **LCT Auto-Expiry**: `/api/life-changer-ticket` route automatically expires pending LCT tickets older than 3 days.
- **SSE track-record-update Event**: Broadcasts `track-record-update` SSE event on every LCT settlement and track record invalidation, updating relevant frontend pages.
- **Member Feedback System**: Full feedback pipeline with `user_feedback` PostgreSQL table. Members submit via a 3-step floating widget (category cards → star rating + message → NPS score). Feedback history visible at `/feedback` with admin reply display. Admin manages all submissions at `/admin/feedback` with filters, reply functionality, and status management (open/reviewed/resolved/closed). Routes at `POST /api/feedback`, `GET /api/feedback/my` (auth required), `GET/PATCH/DELETE /api/admin/feedback` (admin required).
- **Learning System Improvements (Task #10)**: Per-pick thumbs-up/down feedback (`pick_feedback` table), persistent DB-backed audit trail (`audit_trail` table replacing in-memory), model version snapshots (`model_snapshots` table), and admin learning metrics dashboard at `/admin/learning` with 3 tabs (Pick Feedback, Model Snapshots, Audit Trail). Pick feedback API at `/api/picks/:pickId/feedback`. All queries use parameterized SQL (no string interpolation). Orchestrator snapshot failures are logged via `logWarn`.
- **Advanced Strategy Intelligence System**: `server/routes/strategy-intelligence.ts` adds 4 new endpoints: `GET /api/strategy/session` (daily session planner using Monte Carlo + precomputed picks — returns edgeScore, bestSport, parlayConditions, stakeRecommendation, insights), `GET /api/strategy/game-cards` (per-game strategy cards synthesizing MC simulation + team form + market data + sport-specific pattern detection), `POST /api/strategy/ai-brief` (GPT-4o strategy brief per game with key insight points), `GET /api/strategy/my-patterns` (personal win pattern analytics from user_picks — win rates by sport/bet type/day of week). Frontend `strategy-advisor.tsx` enhanced with: Session Banner (today's session plan with edge score + optimal bet types), horizontal scrollable Game Strategy Cards strip (win probability bars, pattern badges, AI brief expandable per card), and My Patterns tab (personal analytics dashboard with win rate breakdown).

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API, The Odds API
- **AI/ML**: OpenAI (GPT-4o-mini, GPT-5)
- **Email**: Resend
- **Database**: PostgreSQL
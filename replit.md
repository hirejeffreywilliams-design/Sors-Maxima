# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time ESPN game data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge and become a leader in the sports betting intelligence market by emphasizing transparent and live data sourcing.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **Command Center (Ticket-First)**: Primary dashboard featuring "Today's Best Tickets" and a daily `Life Changer Ticket` generator.
- **Intelligent Ticket Generation**: Includes Smart Ticket Generator, Visual Parlay Builder, and Matchup Ticket Builder.
- **Persistent Bet Slip Sidebar**: Fixed sidebar for managing parlay legs, dynamic payout calculation, and one-tap copy/share.
- **Consolidated Navigation**: Streamlined navigation for desktop and mobile.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine (46 data-backed factors), Scheme Recognition, Monte Carlo simulations with Kelly Criterion, and a Strategy Advisor.
- **Team Historical Form Engine**: `server/teamHistoricalFormEngine.ts` — pulls 60 days of ESPN free historical scoreboard data for NBA/NHL/MLB/NCAAB, calculates real per-team metrics (last-10 W/L, avg scoring margin, home/road splits, current streak, blowout rate, form score -10 to +10). Caches to `team-form-cache.json` with 22h TTL, refreshes daily. Replaces all estimated/fabricated home-road stats in prediction engine with real historical data. ESPN also now returns actual home/road split records (captured in `homeRecord`/`roadRecord` fields on ESPNScoreboardGame). 225 teams tracked (32 NBA, 32 NHL, 30 MLB, 131 NCAAB). Admin endpoint: `/api/admin/team-form-status`.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining 46-Factor Model analysis with Vegas engine predictions. Pick quality improvements (March 2026): restricted to 3 core bet types (moneyline/spread/full-game total only), requires real Odds API bookmaker data per game (no estimated-line picks), sharp money detected via steam moves boosts confidence cap to 75 (vs 70), no-signal games get -3 confidence penalty, minimum EV threshold raised to 2% for eligible picks. Reduces pick volume by ~60% while concentrating on highest-quality opportunities.
- **Situational Analysis Engine**: Calculates rest days, back-to-back detection, schedule spot classification, and travel factors from live ESPN schedule data.
- **CLV Tracker**: Stores user picks with odds at placement and tracks Closing Line Value (CLV+).
- **Personalized Betting Insights**: Analyzes user betting history to generate "Betting DNA" and recommendations.
- **Unified Tools & Analytics Page**: Consolidates all betting analysis tools.
- **Consolidated Odds Center**: Combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings.
- **Server-Sent Events (SSE) Live Updates**: Provides real-time push updates for intelligence, live scores, and edge alerts.
- **Custom Notification Engine**: Real-time system monitoring ESPN data for game subscriptions and parlay watches.
- **Tier-Based Feature Gating**: API routes protected by `requireAuth` and `requireTier` middleware with rate limits.
- **Persistent Data Storage**: User watchlists, onboarding preferences, subscriptions, community data, ticket history, and betting profiles stored in PostgreSQL.
- **Dynamic Vegas Power Ratings**: Computes power ratings from `platformIntelligenceEngine` team stats and BallDontLie data.
- **Prediction Accuracy Pipeline**: Records game outcomes and prediction accuracy for continuous learning.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures.
- **Automated Operations**: Continuous Learning Orchestrator manages auto-settlement, model retraining, and data freshness.
- **AI-Powered Admin Assistant**: Operational intelligence dashboard generates structured admin reports via OpenAI analysis.
- **Hidden Analytics Agent**: Real-time, server-side agent ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: Self-growing data engine accumulating game outcomes, prediction accuracy, and community consensus for continuous learning.
- **App Guardian Engine**: Continuous health monitoring system performing health checks, service monitoring, stale picks detection, error analysis, and auto-healing.
- **MMA/UFC Picks Engine**: Fetches live fight odds, calculates EV, and assigns grades.
- **March Madness Championship Futures**: Generates NCAAB championship future odds and tiers teams.
- **Player Props Analyzer**: Dedicated page for real-time over/under prop lines with recommendations.
- **Unified Stacking Meta-Learner (USML)**: Ensemble meta-layer dynamically reweighting six expert sources per sport and bet type.
- **MC Stacked Learner**: 3-layer Monte Carlo confidence adjustment after USML ensemble blend.
- **Admin Intelligence Health Dashboard**: "Intelligence" tab in admin UI for engine status and performance.
- **Autonomous Admin Intelligence Engine**: `server/autonomousAdminIntelligence.ts` — fully autonomous monitoring system. Runs lightweight quick checks every 30 minutes (zero AI cost) monitoring win rate, Odds API budget, system health, memory, hub freshness, and AI circuit breaker. Runs GPT-4o-mini deep analysis every 6 hours generating prioritized P1/P2/P3 tasks, risk alerts, and daily/weekly ops checklists. Auto-persists state to `autonomous-admin-state.json`. Alerts auto-resolve when conditions clear. Admin UI at `/admin/autonomous`.
- **Launch Control Center**: Admin page with pre-launch checklist, maintenance mode toggle, API budget monitor, and **Live Data Pipeline panel**.
- **Owner's Playbook**: Admin-only strategic business guide at `/admin/owner-playbook` with 5 tabs: Launch Plan (interactive 3-phase checklist with localStorage persistence), Daily Operations (daily/weekly/monthly task schedules), Growth Strategy (6 acquisition channels + retention tactics), Key Metrics (6 SaaS health metrics with formulas + interactive revenue calculator), and Legal & Risk (compliance reminders for first-time app owners).
- **Data Pipeline Health Monitor**: Real-time status panel for all 6 data sources (The Odds API, ESPN, BallDontLie, NHL Stats API, MLB Stats API, API-Football).
- **Auto-Settlement Engine**: Fetches completed game scores and updates pick trackers.
- **User Bet Tracking**: Allows authenticated users to save slip picks for automatic settlement and validated stats.
- **Email Verification System**: 6-digit code verification via Resend.
- **Historical Backtest Engine**: Fetches 45 days of completed ESPN games for backtesting.
- **Referral System**: Unique 8-character referral codes with tracking.
- **Email Scheduler**: Hourly scheduler for admin daily summaries and weekly digests.
- **PWA Support**: Full Progressive Web App functionality.
- **International Sports Engine**: Fetches fixtures and odds from API-Football for 16 major soccer leagues.
- **AI Pick Edge Insight Engine**: Async, non-blocking enrichment layer generating 1-2 sentence sharp edge insights for top picks using GPT-4o-mini.
- **AI Routes — Backend/Admin Only**: All AI routes restricted to admin access.
- **Smart Leg Selector UX**: `MatchupTicketCard` includes per-leg checkboxes, quick actions, and correlated leg warnings.
- **Bet Slip Auto-Open**: Desktop sidebar and mobile sheet auto-open when the first leg is added.
- **Stripe Payment Integration**: Handles subscriptions and checkout flow for Sharp, Edge, and Max tiers.
- **Strategy Accountability System**: Users can choose from 9 preset betting strategies with per-leg violation tracking.
- **Two-Way Contract Intelligence Engine**: Fetches NBA team rosters, identifies two-way contract players, calculates roster stability, and integrates "Two-Way Roster Risk" factor into NBA predictions.
- **Secure Password Reset Flow**: Two-step email-token-based reset: user submits email → receives link to `/reset-password?token=xxx` → sets new password. Token expires in 1 hour, single-use (consumed on redemption). Never reveals whether email exists.
- **Email Verification Banner**: Persistent amber banner shown to unverified authenticated users with inline "Resend code" and "Verify now" actions. Non-blocking (soft enforcement) — replaces previous hard redirect.
- **By-Application Membership Gate**: /apply page with multi-step form for Edge/Max tier applications. Admin review panel at /admin/applications. sendApplicationConfirmation/Approved/Rejected emails via Resend.
- **Landing Page**: Testimonials section, trust signals row, "How It Works" 3-step guide, proper tier CTAs (Sharp → /pricing, Edge/Max → /apply?tier=...). No ROI calculator.
- **AI Circuit Breaker**: pick-insight-engine.ts checks getAiAvailability() before AND inside generation loop. aiErrorTracker.ts persists quota error state to /tmp/ai-error-state.json with 12-hour recovery window for 429 errors. Circuit breaker survives server restarts.
- **Email Sequence (Day 2 & Day 7)**: sendDay2Email and sendDay7Email in emailService.ts. Hourly scheduler in index.ts sends sequenced emails based on user.createdAt. DB columns email_sequence_day2_sent / email_sequence_day7_sent.
- **Subscription Management UI**: Settings → Membership card shows current tier badge, billing status, upgrade buttons, and Manage Billing (→ Stripe Customer Portal).
- **NFL Offseason Panel**: OffseasonPanel component at client/src/components/offseason-panel.tsx shown in command-center.tsx when NFL tab has no upcoming games.
- **Admin Update Planner**: Tool at `/admin/update-planner` for tracking bugs, feature requests, and ideas. Stored in localStorage. Includes copy-to-AI-chat prompt generator.
- **API Budget Optimizer**: Admin tool at `/admin/api-budget` that tracks monthly API quota usage per service (The Odds API, BallDontLie, API-Football, OpenAI, ESPN). Computes optimal polling intervals, detects over-pace burn rate, scales recommendations by active user count, projects end-of-month usage, and shows per-key status. Hooks into odds-provider.ts, balldontlie-provider.ts, and api-football-provider.ts to auto-track usage from response headers. Persists state to api-budget-state.json. Includes season-aware auto-suspension: each service has defined active season months (BallDontLie: Oct-Jun NBA; API-Football: Aug-May soccer; others year-round). Admin can enable auto-suspend per service so calls stop automatically during off-season and restart alerts are sent when season begins. Manual suspend/resume available with confirmation dialog. isSuspended() guard added to all three live providers.
- **Model Integrity & Audit Report**: Admin page at `/admin/model-integrity` showing live ROI, Brier Score, Max Drawdown, Sharpe Ratio, calibration reliability curves, home/away bias detection, market-type ROI breakdown, adjudication rules, and anti-leakage guarantees. All metrics computed from real settled picks in `pickOutcomeTracker.ts`.
- **Enhanced Pick Accuracy Stats**: `pickOutcomeTracker.ts` now computes ROI per market type, Brier Score (calibration metric), Max Drawdown, Sharpe Ratio, calibration buckets (confidence vs actual win rate), and home/away bias tracking from real settled pick data.

## Performance Architecture
- **HTTP Compression**: gzip enabled via `compression` middleware (level 6, threshold 1KB). All API responses and pages are compressed. Intelligence feed JSON reduced ~70% on the wire.
- **Static Asset Caching**: Content-hashed JS/CSS assets served with `Cache-Control: public, max-age=31536000, immutable`. Browser caches files for 1 year. HTML served with `no-cache` so deploys are instant.
- **Response Cache**: `server/responseCache.ts` — lightweight in-memory cache for hot API endpoints. ETag + `If-None-Match` support for 304 responses. Cache TTLs: intelligence feed (60s), optimal-tickets (60s), matchup-tickets (60s), life-changer-ticket (60s), model-health (60s), track-record (120s). Cache stats + clear at `/api/admin/cache-stats`.
- **Payload Trimming**: Intelligence feed limited to top 40 picks (was 80+), 5 factors per pick (was 15), 15 edge alerts, 12 live games. Reduces JSON payload by ~50%.
- **Startup Warmup**: At 50s post-startup, all critical in-process caches are pre-warmed (intelligence hub, precomputed picks, life-changer ticket, track record). First user after a deploy gets instant data.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API
- **Odds Data**: The Odds API
- **AI/ML**: OpenAI
- **Email**: Resend
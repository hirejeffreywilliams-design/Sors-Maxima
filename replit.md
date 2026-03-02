# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time ESPN game data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge and become a leader in the sports betting intelligence market by emphasizing transparent and live data sourcing, ultimately providing a competitive edge in the sports betting market.

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
- **Command Center (Ticket-First)**: The primary dashboard, featuring "Today's Best Tickets" (pre-assembled parlays) and a `Life Changer Ticket` daily cross-sport underdog parlay generator.
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator, Visual Parlay Builder, and Matchup Ticket Builder for automated and visual construction of betting tickets.
- **Persistent Bet Slip Sidebar**: A fixed, always-visible sidebar/drawer for managing parlay legs, dynamic payout calculation, and one-tap copy/share.
- **Consolidated Navigation**: Streamlined navigation for desktop and mobile, emphasizing key functionalities.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine (46 data-backed factors), Scheme Recognition, Monte Carlo simulations with advanced Kelly Criterion, and a Strategy Advisor. Enhanced with BDL data for NBA and official stats for NHL/MLB.
- **Official Sports Stats Providers**: Integrations for NHL (`api.nhle.com`) and MLB (`statsapi.mlb.com`) to fetch per-team season stats.
- **BallDontLie Integration**: Primary source for NFL team stats and aggregated MLB team stats, wired into Scheme Recognition and Predictions Engines. Expanded API-Football for 16 soccer leagues.
- **Pick Protection & Monetization System**: Prevents line movement through staggered pick releases and capacity limits.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining 46-Factor Model analysis with Vegas engine predictions.
- **Situational Analysis Engine**: Calculates rest days, back-to-back detection, schedule spot classification, and travel factors from live ESPN schedule data.
- **CLV Tracker**: Stores user picks with odds at placement, updates closing odds, and tracks Closing Line Value (CLV+).
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" and personalized recommendations.
- **Unified Tools & Analytics Page**: Consolidates all betting analysis tools under a single route.
- **Consolidated Odds Center**: Combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings as tabs.
- **Server-Sent Events (SSE) Live Updates**: Provides real-time push updates for intelligence, live scores, and edge alerts.
- **Custom Notification Engine**: Real-time system monitoring ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware, with specific rate limits per paid subscription tier.
- **Persistent Data Storage**: User watchlists, onboarding preferences, subscriptions, community data, ticket history, and betting profiles are stored in PostgreSQL.
- **Dynamic Vegas Power Ratings**: Computes power ratings from `platformIntelligenceEngine` team stats and BallDontLie data.
- **Onboarding Guard**: New users are redirected to `/onboarding` after registration.
- **Prediction Accuracy Pipeline**: Records game outcomes and prediction accuracy data for continuous learning.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures.
- **Automated Operations**: A Continuous Learning Orchestrator manages auto-settlement, model retraining, data freshness, and calibration drift detection.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generates structured admin reports with prioritized tasks via OpenAI analysis.
- **Hidden Analytics Agent**: A real-time, server-side agent continuously ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: A self-growing data engine accumulates game outcomes, prediction accuracy, odds snapshots, and community consensus for continuous learning.
- **App Guardian Engine**: A continuous health monitoring system performing health checks, service monitoring, stale picks detection, error analysis, and auto-healing, broadcasting `guardian-alert` SSE events.
- **Stale Game Detection**: Displays "Game In Progress" badges and warning banners for picks involving games that have already started.
- **MMA/UFC Picks Engine**: `server/mma-engine.ts` — fetches live fight odds from `mma_mixed_martial_arts` Odds API key. Per fight: collects moneyline odds from DraftKings/FanDuel/BetMGM/Caesars, averages implied probabilities across books, removes vig to produce true win probability, calculates EV and consensus strength, assigns grade A–D. Route: `GET /api/mma/picks`. Frontend: `client/src/pages/mma.tsx` — fight cards grouped by event day (VS layout), stats grid (confidence/EV/true prob/consensus), collapsible reasoning, filter tabs, Add to Slip. Accessible via Markets → MMA/UFC.
- **March Madness Championship Futures**: `server/mma-engine.ts` `generateNCAABFutures()` — fetches `basketball_ncaab_championship_winner` outrights, tiers teams as elite/contender/darkhorse/longshot. Route: `GET /api/picks/futures/ncaab`. Embedded as `MarchMadnessFutures` collapsible component on the `/daily` page showing top 8 teams with odds, true win probability, and tier badges.
- **Player Props Analyzer**: A dedicated page for real-time over/under prop lines with recommendations.
- **Expanded 1H Odds Pipeline**: Integrates first-half market odds for accurate calculations.
- **Enhanced Learning Engine**: Upgraded with momentum tracking, weight decay, and confidence-weighted updates.
- **Unified Stacking Meta-Learner (USML)**: An ensemble meta-layer treating six weighted expert sources, dynamically reweighting each source per sport and bet type. Integrated into precomputed picks with settlement feedback.
- **MC Stacked Learner**: A 3-layer Monte Carlo confidence adjustment applied after the USML ensemble blend.
- **Admin Intelligence Health Dashboard**: A comprehensive "Intelligence" tab in the admin UI showing engine status and performance.
- **Launch Control Center**: Admin page (`/admin/launch-control`) with pre-launch checklist, maintenance mode toggle, API budget monitor, quick actions, and **Live Data Pipeline panel**. `server/launch-control.ts` runs health checks for DB, predictions engine, Odds API budget, frontend build age, session store, BDL availability, and all env secrets. Routes: `GET /api/admin/launch-check`, `POST /api/admin/maintenance/toggle`, `POST /api/admin/actions/clear-prediction-cache`, `POST /api/admin/actions/force-engine-run`, `GET /api/admin/data-pipeline-health`. Maintenance mode gates all non-admin API routes with 503 when enabled.
- **Data Pipeline Health Monitor**: `server/data-pipeline-health.ts` — real-time status panel for all 6 data sources: The Odds API, ESPN (free), BallDontLie (NBA/NFL/MLB), NHL Stats API (free), MLB Stats API (free), API-Football (soccer). Each source reports status (live/cached/degraded/offline/unknown), last success time, data points, key configuration, and active sports. `server/api-usage-tracker.ts` provides per-source call tracking wired into ESPN scoreboard, API-Football, BDL, NHL, and MLB providers. Auto-refreshes every 30s on the Launch Control page.
- **BDL NFL Stats**: `getNFLTeamStatsBDL()` uses `/nfl/v1/team_season_stats` (batch of 10 teams) to fetch 32 teams with passing/rushing/scoring/turnover stats. Wired into scheme engine (Air Raid, Power Run Game etc.) and predictions engine (Scoring Differential, Turnover Edge, Passing Game Edge factors).
- **BDL MLB Stats**: `getMLBTeamStatsBDL()` paginates `/mlb/v1/season_stats` and aggregates by team — batting avg, OPS, ERA, WHIP, K/9. Wired into predictions engine (ERA Edge factor) and MLB stats provider fallback chain.
- **Auto-Settlement Engine**: Fetches completed game scores, matches against pending picks, and updates pick trackers.
- **User Bet Tracking**: Allows authenticated users to save slip picks for automatic settlement and validated stats.
- **Email Verification System**: 6-digit code verification via Resend.
- **Historical Backtest Engine**: Fetches 45 days of completed ESPN games and generates retroactive picks for backtesting.
- **Referral System**: Unique 8-character referral codes with tracking.
- **Email Scheduler**: Hourly scheduler for admin daily summaries and weekly digests.
- **PWA Support**: Full Progressive Web App functionality.
- **International Sports Engine**: Fetches fixtures and odds from API-Football for 16 major soccer leagues.
- **Model Health Monitoring**: A `ModelHealthChip` component displays status and performance metrics.
- **Transparent Branding**: Uses "46-Factor Model Analysis" and "Multi-Factor Engine" for user-facing display.
- **AI Pick Edge Insight Engine**: `server/pick-insight-engine.ts` — async, non-blocking enrichment layer that runs after each prediction cycle. Generates a 1-2 sentence sharp edge insight for top picks (grade A+/A/A-/B+, confidence ≥62%) using GPT-4o-mini. Max 10 per cycle, 300ms throttle. Insights cached by pick ID, injected into picks when served. Displayed on pick cards with a Sparkles icon. Admin dashboard Systems tab shows insight cache count.
- **AI Routes — Backend/Admin Only**: All AI routes are restricted to admin access via `requireAdmin` middleware. OpenAI is used for system intelligence, admin assistant, app guardian, and the async pick edge insight engine.
- **Smart Leg Selector UX**: MatchupTicketCard includes per-leg checkboxes, quick actions, live combined odds, correlated leg warnings, and an "Add N Selected Legs" button.
- **Bet Slip Auto-Open**: Desktop sidebar and mobile sheet auto-open when the first leg is added.
- **Mobile Slip Bottom Nav Button**: Dedicated "Slip" button in the mobile bottom navigation with a Ticket icon and leg count badge.
- **Settings Mobile Overflow Fix**: On mobile, a Select dropdown replaces horizontal TabsList for settings.
- **CLV-Gated Learning Engine**: Weight updates apply category multipliers based on CLV+ status and win/loss outcome.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
- **Sports Data**: ESPN, BallDontLie API, API-Football
- **Odds Data**: The Odds API
- **Weather Data**: Open-Meteo
- **AI/ML**: OpenAI (for Admin Assistant and system intelligence only)
- **Email**: Resend (transactional emails)
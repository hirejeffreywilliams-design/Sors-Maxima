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
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. Backend routes are organized into focused modules.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: A central data pipeline aggregates data from various sources (ESPN, The Odds API, Open-Meteo) on a 60-second cycle, providing a unified `IntelligenceFeed`.
- **Command Center (Ticket-First)**: The primary dashboard focuses on "Today's Best Tickets" – pre-assembled parlays from highest-graded precomputed picks, showing combined grade, total odds, Kelly-optimized stake, payout, and engine convergence indicators.
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator and Visual Parlay Builder for automated and visual construction of betting tickets with real-time data and suggestions.
- **Persistent Bet Slip Sidebar**: The bet slip is a fixed, always-visible right sidebar on desktop, and a bottom sheet drawer with a floating trigger button on mobile. It supports unlimited legs, stake input, dynamic payout calculation, branded sportsbook buttons, and one-tap copy/share functionality.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, Multi-Factor Intelligence Engine (38 data-backed factors), Scheme Recognition, Monte Carlo simulations with advanced Kelly Criterion, and a Strategy Advisor.
- **Pick Protection & Monetization System**: A comprehensive line protection engine prevents concentrated user action from moving betting lines through staggered pick releases, capacity limits, diversified pick distribution, and exclusive whale-only picks.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining Quantum Fusion analysis with Vegas engine predictions, including game-context reasoning and market timing signals.
- **Situational Analysis Engine**: Calculates real rest days, back-to-back detection, schedule spot classification, and travel factors from live ESPN schedule data, feeding into Quantum Fusion analysis.
- **CLV Tracker**: Stores user picks with odds at placement, updates closing odds, and tracks Closing Line Value (CLV+) rate, average CLV, and streaks.
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" profile, performance trends, and personalized game recommendations.
- **Unified Tools & Analytics Page**: Consolidates all betting analysis tools under a single `/tools` route.
- **Consolidated Odds Center**: Combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings as tabs under `/odds-center`.
- **Server-Sent Events (SSE) Live Updates**: Provides real-time push updates for intelligence, live scores, and edge alerts with frontend integration.
- **Custom Notification Engine**: A real-time system monitoring ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE, with subscriptions persisted in PostgreSQL. Also tracks player prop line movements and triggers sharp money alerts.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware, with specific rate limits per tier.
- **Persistent Data Storage**: User watchlists, onboarding preferences, Stripe subscriptions, community data, ticket history, and betting profiles are stored persistently in PostgreSQL.
- **Dynamic Vegas Power Ratings**: The Vegas engine dynamically computes power ratings from `platformIntelligenceEngine` team stats and BallDontLie data, falling back to static ratings when live data is unavailable.
- **Onboarding Guard**: New users are automatically redirected to `/onboarding` after registration until onboarding is completed, with an admin bypass.
- **Prediction Accuracy Pipeline**: `platformIntelligenceEngine.ts` records game outcomes and prediction accuracy data for continuous learning.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures.
- **Automated Operations**: A Continuous Learning Orchestrator manages auto-settlement, model retraining, data freshness, and calibration drift detection.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generates structured admin reports with prioritized tasks via OpenAI analysis.
- **Hidden Analytics Agent**: A real-time, server-side agent continuously ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: A self-growing data engine accumulates game outcomes, prediction accuracy, odds snapshots, and community consensus for continuous learning.
- **App Guardian Engine**: A continuous health monitoring system performs health checks, service monitoring, error analysis, auto-healing, and AI diagnostics. Includes crash guard and memory safeguards.
- **Player Props Analyzer**: A dedicated `/player-props` page shows real-time over/under prop lines, with recommendations and confidence levels and a "Top Props Engine".
- **Expanded 1H Odds Pipeline**: The odds provider now returns first-half markets from The Odds API for more accurate calculations.
- **Matchup Ticket Builder**: Generates full game matchup parlays (10-20 legs) from precomputed predictions, grouped by game and market type.
- **BDL-Enhanced Monte Carlo**: The Monte Carlo simulation engine runs 1,500 simulations per game matchup with advanced sampling and BDL data for NBA. It includes bivariate correlated scoring and pace-scaled variance.
- **Enhanced Learning Engine**: Upgraded with momentum tracking, weight decay, and confidence-weighted updates for improved learning.
- **Admin Intelligence Health Dashboard**: A comprehensive "Intelligence" tab in the admin UI shows at-a-glance summary of engine status, orchestrator stats, learning engine factor weights, data pipeline breakdown, prop line movement tracking, and alerts.
- **Auto-Settlement Engine**: A focused engine that runs every 5 minutes and on startup for backfill, fetching completed game scores, matching against pending picks, calculating outcomes, and updating pick trackers.
- **User Bet Tracking**: Allows authenticated users to save slip picks to the database for automatic settlement.
- **Live Settlement Stats (Validated)**: The Track Record page shows real validated data on pick settlement and win rates.
- **Monetization**: All access requires a paid subscription with three tiers: Sharp, Edge, and Max.
- **Matchup Ticket Builder (Command Center)**: `buildMatchupTickets()` groups precomputed picks by game matchup and builds 10-20 leg parlays. Served at `GET /api/matchup-tickets`.
- **Admin userId Safety**: `server/routes/account.ts` uses a `numericUserId(req)` helper that returns `null` for admin sessions (userId="admin"), preventing NaN database queries.
- **Subscription Gate**: Free-tier users (`subscriptionTier='free'`) are blocked from the app and shown the Pricing page. Backend `requireSubscription` middleware blocks free users from intelligence/predictions API routes (402 response).
- **Email Verification System**: After registration, a 6-digit code is sent via Resend for email verification. Users are gated until verification is complete.
- **Settings Mobile Dropdown**: On mobile screens, the 7-tab settings page shows a shadcn `<Select>` dropdown instead of an overflowing horizontal tab list.
- **Historical Backtest Engine**: `server/backtestEngine.ts` fetches 45 days of completed ESPN games and generates retroactive picks (spread and total) against actual final scores. Runs on startup if no backtest data exists.
- **CLV-Gated Learning Engine**: Learning engine categorizes settled picks into 4 buckets by CLV result and applies different weight multipliers. Separate factor weights per market type with fallback to unified weights under 30 samples. Weekly calibration check detects confidence tier drift and applies correction factors.
- **Smart Leg Selector UX**: `MatchupTicketCard` in command center now has individual leg checkboxes, defaulting to the top 3 legs by EV×grade score. Quick action bar: "Best 3", "All", "None" buttons. Live combined odds display updates as legs are toggled. Correlated leg warning appears when multiple positive-correlation legs are selected.
- **Model Health Chip**: `ModelHealthChip` component on Command Center shows status (calibrated/building/recalibrating) with colored dot. Clicking opens a popover with settled count, win rate, live vs backtest split, last updated. Fetches from `GET /api/model-health`.
- **Transparent Branding**: User-facing display text updated to use "46-Factor Model Analysis", "Multi-Factor Engine", and "Model Agreement".
- **SSE picks-settled Integration**: `use-sse.ts` now handles `picks-settled` event type. `BetTracker` subscribes and auto-invalidates relevant queries when picks settle, showing toast notifications.
- **CLV Performance Card in BetTracker**: Overview tab shows a "Closing Line Value (CLV) Performance" card when settled picks exist, displaying CLV+ Rate, Avg CLV (basis points), and current CLV streak.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
- **Sports Data**: ESPN, BallDontLie API
- **Odds Data**: The Odds API
- **Weather Data**: Open-Meteo
- **AI/ML**: OpenAI (for Admin Assistant)
- **Email**: Resend (transactional email for verification, welcome, and weekly digest)
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
- **Team Historical Form Engine**: Pulls 60 days of ESPN free historical scoreboard data for NBA/NHL/MLB/NCAAB, calculates real per-team metrics, and caches data.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining 46-Factor Model analysis with Vegas engine predictions, focusing on high-quality picks.
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
- **Simplified Admin Dashboard**: Consolidated admin UI for system health, members, applications, and picks.
- **Autonomous Admin Intelligence Engine**: Fully autonomous monitoring system with quick checks and deep analysis (GPT-4o-mini) generating prioritized tasks and risk alerts.
- **Launch Control Center**: Admin page with pre-launch checklist, maintenance mode toggle, API budget monitor, and live data pipeline panel.
- **Owner's Playbook**: Admin-only strategic business guide with launch plan, daily operations, growth strategy, key metrics, and legal/risk information.
- **Data Pipeline Health Monitor**: Real-time status panel for all 6 data sources.
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
- **Secure Password Reset Flow**: Two-step email-token-based reset.
- **Email Verification Banner**: Persistent amber banner for unverified authenticated users with inline actions.
- **By-Application Membership Gate**: `/apply` page for Edge/Max tier applications with admin review.
- **Landing Page**: Testimonials, trust signals, "How It Works" guide, and proper tier CTAs.
- **AI Circuit Breaker**: Checks AI availability and persists quota error state to `ai-error-state.json` with 12-hour recovery window for 429 errors.
- **Email Sequence (Day 2 & Day 7)**: Sends sequenced emails based on user creation date.
- **Subscription Management UI**: Settings → Membership card shows current tier, billing status, upgrade options, and Stripe Customer Portal access.
- **NFL Offseason Panel**: Component shown when NFL tab has no upcoming games.
- **Admin Update Planner**: Tool for tracking bugs, feature requests, and ideas, stored in `localStorage`.
- **API Budget Optimizer**: Admin tool tracking monthly API quota usage, computing optimal polling intervals, detecting over-pace burn rate, and providing season-aware auto-suspension.
- **Model Integrity & Audit Report**: Admin page showing live ROI, Brier Score, Max Drawdown, Sharpe Ratio, calibration reliability curves, and bias detection.
- **Enhanced Pick Accuracy Stats**: Computes ROI per market type, Brier Score, Max Drawdown, Sharpe Ratio, calibration buckets, and home/away bias tracking from real settled pick data.

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
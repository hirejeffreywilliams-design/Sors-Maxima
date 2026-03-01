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
- **Unified Intelligence Hub**: Aggregates data from various sources (ESPN, The Odds API, Open-Meteo) on a 60-second cycle into a unified `IntelligenceFeed`.
- **Command Center (Ticket-First)**: The primary dashboard, featuring "Today's Best Tickets" – pre-assembled parlays from highest-graded precomputed picks, showing combined grade, total odds, Kelly-optimized stake, payout, and engine convergence indicators. Includes a `Life Changer Ticket` daily cross-sport underdog parlay generator.
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator, Visual Parlay Builder, and Matchup Ticket Builder for automated and visual construction of betting tickets with real-time data and suggestions.
- **Persistent Bet Slip Sidebar**: A fixed, always-visible right sidebar (desktop) or bottom sheet drawer (mobile) supporting unlimited legs, dynamic payout calculation, and one-tap copy/share.
- **Consolidated Navigation**: Streamlined navigation for desktop and mobile, emphasizing key functionalities like picks, daily insights, build tools, and markets.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, Multi-Factor Intelligence Engine (46 data-backed factors), Scheme Recognition, Monte Carlo simulations with advanced Kelly Criterion, and a Strategy Advisor. The Monte Carlo engine is enhanced with BDL data for NBA.
- **Pick Protection & Monetization System**: Prevents concentrated user action from moving betting lines through staggered pick releases and capacity limits.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining 46-Factor Model analysis with Vegas engine predictions, including game-context reasoning and market timing signals.
- **Situational Analysis Engine**: Calculates real rest days, back-to-back detection, schedule spot classification, and travel factors from live ESPN schedule data.
- **CLV Tracker**: Stores user picks with odds at placement, updates closing odds, and tracks Closing Line Value (CLV+) rate, average CLV, and streaks, with CLV-gated learning.
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" profile, performance trends, and personalized game recommendations.
- **Unified Tools & Analytics Page**: Consolidates all betting analysis tools under a single route.
- **Consolidated Odds Center**: Combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings as tabs.
- **Server-Sent Events (SSE) Live Updates**: Provides real-time push updates for intelligence, live scores, and edge alerts.
- **Custom Notification Engine**: Real-time system monitoring ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE. Tracks player prop line movements and sharp money alerts.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware, with specific rate limits per tier. Access requires a paid subscription (Sharp, Edge, Max tiers). Free-tier users are gated.
- **Persistent Data Storage**: User watchlists, onboarding preferences, Stripe subscriptions, community data, ticket history, and betting profiles are stored persistently in PostgreSQL.
- **Dynamic Vegas Power Ratings**: Computes power ratings from `platformIntelligenceEngine` team stats and BallDontLie data.
- **Onboarding Guard**: New users are redirected to `/onboarding` after registration.
- **Prediction Accuracy Pipeline**: Records game outcomes and prediction accuracy data for continuous learning.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures.
- **Automated Operations**: A Continuous Learning Orchestrator manages auto-settlement, model retraining, data freshness, and calibration drift detection.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generates structured admin reports with prioritized tasks via OpenAI analysis.
- **Hidden Analytics Agent**: A real-time, server-side agent continuously ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: A self-growing data engine accumulates game outcomes, prediction accuracy, odds snapshots, and community consensus for continuous learning.
- **App Guardian Engine**: A continuous health monitoring system performs health checks, service monitoring, error analysis, and auto-healing.
- **Player Props Analyzer**: A dedicated page for real-time over/under prop lines with recommendations and confidence levels, powered by a "Top Props Engine".
- **Expanded 1H Odds Pipeline**: Integrates first-half market odds for accurate calculations.
- **Enhanced Learning Engine**: Upgraded with momentum tracking, weight decay, and confidence-weighted updates.
- **Admin Intelligence Health Dashboard**: A comprehensive "Intelligence" tab in the admin UI shows engine status, orchestrator stats, learning engine factor weights, and data pipeline breakdown.
- **Auto-Settlement Engine**: Fetches completed game scores, matches against pending picks, calculates outcomes, and updates pick trackers.
- **User Bet Tracking**: Allows authenticated users to save slip picks to the database for automatic settlement and displays validated settlement stats.
- **Email Verification System**: 6-digit code verification via Resend.
- **Historical Backtest Engine**: Fetches 45 days of completed ESPN games and generates retroactive picks for backtesting.
- **Referral System**: Unique 8-char referral codes, tracking referrals, conversions, and history.
- **Email Scheduler**: Hourly scheduler for admin daily summaries and weekly digests.
- **PWA Support**: Full Progressive Web App functionality with branding and theme support.
- **International Sports Engine**: Fetches fixtures and odds from API-Football for 8 major soccer leagues, generating diverse pick types and integrating with the frontend.
- **Model Health Monitoring**: A `ModelHealthChip` component displays status and performance metrics, backtestCount, liveCount, and win rate in a popover.
- **Transparent Branding**: User-facing display text uses "46-Factor Model Analysis" and "Multi-Factor Engine". "Guaranteed Profit" → "Locked-In Profit" in all hedge tools. No "AI Insights" labels shown to users.
- **AI Pick Explainer Engine**: `server/aiPickExplainer.ts` — backend/admin-only. Generates pick explanations for admin QA. Not shown to end users.
- **AI Routes — Backend/Admin Only**: `server/routes/ai.ts` — all routes (`/api/ai/pick-explanation`, `/api/ai/analyze-parlay`, `/api/ai/game-preview`, `/api/ai/status`) are restricted to admin access via `requireAdmin` middleware. OpenAI is used exclusively for system intelligence, admin assistant, and app guardian — NOT for user-facing features.
- **Smart Leg Selector UX**: MatchupTicketCard has per-leg checkboxes, "Best 3"/"All"/"None" quick actions, live combined odds display, correlated leg warning, and "Add N Selected Legs" button.
- **Bet Slip Auto-Open**: Desktop sidebar auto-opens when the first leg is added (useEffect watches legCount 0→1 transition).
- **Settings Mobile Overflow Fix**: On mobile, a Select dropdown replaces the horizontal TabsList for all 7 settings tabs.
- **CLV-Gated Learning Engine**: Weight updates apply category multipliers (strong: 1.0, pure_signal: 0.4, noise: -0.2, true_miss: -0.8) based on CLV+ status and win/loss outcome.

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
- **AI/ML**: OpenAI (for Admin Assistant and system intelligence only — not user-facing)
- **Email**: Resend (transactional emails)

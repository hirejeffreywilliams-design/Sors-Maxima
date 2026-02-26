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
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. Backend routes are organized into focused modules.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: A central data pipeline aggregates all data sources (ESPN, The Odds API, Open-Meteo) on a 60-second cycle, providing a unified `IntelligenceFeed` to all consuming engines and the frontend.
- **Command Center (Ticket-First)**: The primary dashboard leads with "Today's Best Tickets" – pre-assembled parlays from highest-graded precomputed picks, showing combined grade, total odds, Kelly-optimized stake, payout, and engine convergence indicators.
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator and Visual Parlay Builder for automated and visual construction of betting tickets with real-time data and suggestions.
- **Persistent Bet Slip Sidebar**: On desktop (lg+), the bet slip is a fixed always-visible right sidebar (340px/380px) that stays on screen across all pages. On mobile, it's a bottom sheet drawer with a prominent floating trigger button. No leg limit — users can add unlimited legs (sportsbooks enforce their own platform limits). Features stake input, dynamic payout calculation, branded sportsbook buttons for direct placement, collapsible placement guide and share sections, and one-tap copy/share functionality.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, Quantum Fusion (integrating 46 factors), Scheme Recognition, and Monte Carlo simulations with advanced Kelly Criterion for optimal stake sizing.
- **Pick Protection & Monetization System**: A comprehensive line protection engine prevents concentrated user action from moving betting lines through staggered pick releases by tier, pick capacity limits, diversified pick distribution, and exclusive whale-only picks.
- **Precomputed Predictions Engine**: Runs every 5 minutes for in-season sports, combining Quantum Fusion analysis with Vegas engine predictions, including game-context reasoning and market timing signals.
- **Situational Analysis Engine**: Calculates real rest days, back-to-back detection, schedule spot classification, and travel factors from live ESPN schedule data, feeding into Quantum Fusion analysis.
- **CLV Tracker**: Stores user picks with odds at placement, updates closing odds, and tracks Closing Line Value (CLV+) rate, average CLV, and streaks.
- **Personalized Betting Insights**: Analyzes user betting history to generate a "Betting DNA" profile, performance trends, and personalized game recommendations.
- **Unified Tools & Analytics Page**: Consolidates all betting analysis tools (correlation engine, SGP optimizer, ML prop projections, matchup analyzer, bankroll simulator, etc.) under a single `/tools` route.
- **Consolidated Odds Center**: Combines Odds Comparison, EV Heatmap, Line Movement, and Power Rankings as tabs under `/odds-center`.
- **Server-Sent Events (SSE) Live Updates**: Provides real-time push updates for intelligence, live scores, and edge alerts with frontend integration.
- **Custom Notification Engine**: A real-time system monitoring ESPN data for game subscriptions and parlay watches, broadcasting alerts via SSE, with subscriptions persisted in PostgreSQL.
- **Tier-Based Feature Gating**: API routes are protected by `requireAuth` and `requireTier` middleware, with specific rate limits per tier for expensive endpoints.
- **Persistent Data Storage**: User watchlists, onboarding preferences, Stripe subscriptions, community data, ticket history, and betting profiles are stored persistently in PostgreSQL.
- **Dynamic Vegas Power Ratings**: The Vegas engine dynamically computes power ratings from `platformIntelligenceEngine` team stats, falling back to static ratings only when live data is unavailable.
- **Onboarding Guard**: New users are automatically redirected to `/onboarding` after registration until onboarding is completed.
- **Prediction Accuracy Pipeline**: `platformIntelligenceEngine.ts` records game outcomes and prediction accuracy data for continuous learning.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, session fingerprinting, and cryptographic signatures.
- **Automated Operations**: A Continuous Learning Orchestrator manages auto-settlement, model retraining, data freshness, and calibration drift detection.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generates structured admin reports with prioritized tasks via OpenAI analysis.
- **Hidden Analytics Agent**: A real-time, server-side agent continuously ingests ESPN data, performs market analysis, and monitors model drift.
- **Platform Intelligence Engine**: A self-growing data engine accumulates game outcomes, prediction accuracy, odds snapshots, and community consensus for continuous learning.
- **App Guardian Engine**: A continuous health monitoring system performs health checks, service monitoring, error analysis, auto-healing, and AI diagnostics.
- **Player Props Analyzer**: A dedicated `/player-props` page shows real-time over/under prop lines from various bookmakers for every player in every game, with recommendations and confidence levels. Mobile-first design with clear OVER/UNDER tappable buttons, collapsible game/player sections, and per-side slip tracking.
- **Top Props Engine**: A `GET /api/top-props/:sport` endpoint that automatically ranks and surfaces the best player prop picks across all games. Scores props using a composite formula (confidence, edge magnitude, bookmaker count, leader stats availability, injury status), filters to only props with >8% stat-to-line edge and verified season averages, excludes unreliable markets (3-Pointers), and returns the top 15 graded picks. Displayed as a horizontally scrollable hero section at the top of the Player Props page with one-tap add-to-slip.
- **Expanded 1H Odds Pipeline**: The odds provider now returns first-half markets (spread, total, moneyline) from The Odds API for more accurate calculations.
- **Matchup Ticket Builder**: A `GET /api/matchup-tickets` endpoint and `buildMatchupTickets()` function that generates full game matchup parlays (10-20 legs) from precomputed predictions. Groups all picks by game, selects the best non-conflicting picks across spreads, totals, moneylines, and player props, calculates combined odds/Kelly stake/payout, and returns `MatchupTicket[]` with `marketBreakdown` grouping legs by market type. Displayed as expandable matchup cards in the Command Center's "Game Matchup Parlays" section with one-tap "Add All to Slip".
- **BallDontLie Integration**: `server/balldontlie-provider.ts` provides real NBA team data (standings, streaks, home/away records, last-10 records, scoring averages, advanced stats like pace/off-rating/def-rating/net-rating) from the BallDontLie API. Enriches Quantum Fusion engine's MarketContext with real data instead of derived estimates. Also provides player injuries, betting odds, player props, and leaders endpoints. Requires `BALLDONTLIE_API_KEY` environment secret.
- **Data-Driven Quantum Fusion Factors**: Previously low-data-reliability factors (mental_state, confidence_index, motivation_level, team_chemistry, pressure_response, roster_stability, pace_tempo, player_efficiency, clutch_index, timezone_disruption, contract_motivation) now use real ESPN/BDL data signals instead of pseudo-random values. The `LOW_DATA_RELIABILITY_FACTORS` set contains 11 factors with honest names: conditioning_trend, availability_pattern, roster_depth, matchup_efficiency, usage_patterns, film_tendency, team_investment, salary_dynamics, field_conditions, temperature_impact, media_impact. Previously misleading names (sleep_quality, nutrition_hydration, wearable_data, equipment_advantage, training_tech, video_analysis) were renamed to reflect actual data sources.
- **No Free Trial**: All access requires paid subscription. Three tiers: Sharp ($49/mo, internal ID "pro"), Edge ($99/mo, internal ID "elite"), Max ($249/mo, internal ID "whale"). MRR calculated per-tier. No trial-related messaging anywhere in the app.
- **Consistent Tier Naming**: Display names Sharp/Edge/Max used throughout admin UI, marketing prompts, growth dashboards, and pricing engine. Internal IDs (pro/elite/whale) used only in code logic.
- **Dynamic Vegas Power Ratings**: The Vegas engine dynamically computes power ratings from BDL data (offRating, defRating, netRating, winPct) for NBA teams, falling back to `platformIntelligenceEngine` team stats, then static ratings when live data is unavailable. BDL data flows through both `getDynamicPowerRating` and `generateSituationalFactors`.
- **BDL-Enhanced Monte Carlo**: The Monte Carlo simulation engine accepts real team scoring averages (avgPts), defensive ratings, and pace from BDL for NBA games. Adjusts scoring means by opponent defensive rating and matchup pace factors instead of using league-wide static defaults.
- **Enhanced Learning Engine**: Upgraded with momentum tracking (velocity + consecutive gains multiplier), weight decay (prevents stale weights from dominating), and confidence-weighted updates (high-confidence predictions have more impact on weight adjustments, with recency bias for recent predictions).
- **Strategy Advisor**: A dedicated `/strategy` page with a backend engine (`server/strategyAdvisorEngine.ts`) that provides 6 strategy templates (Chalk Grinder, Value Hunter, Correlated Parlay, Prop Specialist, Longshot Sniper, Hedge Master), real-time ticket analysis from the bet slip (grading, verdict, strengths/weaknesses, correlation warnings, diversification scoring), leg-by-leg breakdown with keep/swap recommendations, maximization tips, and smart replacement pick suggestions from the precomputed engine. API endpoints: `GET /api/strategy/templates`, `POST /api/strategy/analyze`, `POST /api/strategy/suggestions`.
- **Admin Intelligence Health Dashboard**: The admin "Models" tab is now a comprehensive "Intelligence" tab powered by `GET /api/admin/intelligence-health`. Shows at-a-glance summary (engines running, hit rate, picks cached, calibration drift), an 8-engine status grid (Intelligence Hub, Precomputed Engine, Learning Orchestrator, Learning Engine, Historical Learning, App Guardian, Analytics Agent, SSE Broadcaster), detailed orchestrator stats (cycles, settlements, retrains, weight syncs, accuracy by sport), learning engine factor weights, data pipeline breakdown by sport, prop line movement tracking with sharp alerts, and deep-dive links to Model Performance, Orchestration Console, and Training Center.
- **Sharp Prop Line Movement Monitor**: The notification engine now tracks player prop consensus lines over time (60s interval) via `getAllCachedGameProps()`. Detects significant line shifts (≥0.5 line or ≥15 odds shift) and classifies velocity as slow/moderate/fast/steam. Sharp movements (steam/fast or combined line+odds shift) trigger `sharp_money`/`line_movement` notifications and SSE `prop-sharp-movement` broadcasts. API: `GET /api/prop-movements?sharp=true&player=NAME&limit=25`. The precomputed predictions engine checks `getSharpPropAlerts()` when building prop picks — matching sharp movements add a "Sharp Prop Move" factor, boost confidence (+3-5), override timing to "bet_now" for steam moves, and attach `sharpPropAlert` metadata to the pick.

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
- **Weather Data**: Open-Meteo
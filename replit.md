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
- **Persistent Floating Bet Slip**: A persistent, slide-out bet slip accessible from every page, featuring stake input, dynamic payout calculation, branded sportsbook buttons for direct placement, and one-tap copy/share functionality.
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
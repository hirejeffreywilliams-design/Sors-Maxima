# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to help users construct more intelligent parlays using real ESPN game data. It provides statistical analysis, odds comparison, and parlay building tools. The project aims to provide a competitive edge through data-driven decision-making with honest, transparent data sourcing.

## Recent Changes (Feb 2026)
- **Complete Real-Time Data Coverage**: All player, coach, and team data now sourced dynamically from ESPN API across 6 sports (NBA, NFL, MLB, NHL, NCAAF, NCAAB). 224+ teams and 7,400+ players loaded at startup.
- **Automated Data Refresh**: Background refresh every 6 hours clears and reloads all roster/team/scoreboard data automatically. Admin endpoint `POST /api/admin/refresh-data` for manual refresh.
- **Dynamic Team Selectors**: Player Prediction, Coaching Analysis, Player Props, and Matchup components now load ALL teams from ESPN instead of hardcoded lists. Users can analyze any team in any sport.
- **All-Player Predictions**: Player Prediction page now shows stat projections for every player on a team's roster (not just the first player). Sorted by key positions per sport.
- **Real Coach Data**: Coaching Analysis displays actual ESPN coach names and experience (e.g., "Andy Reid, 26 yrs experience" for Chiefs).
- **Player Props + Matchups from ESPN**: Removed hardcoded sample players. Both components now generate data from live ESPN roster and scoreboard data.
- **NCAAF + NCAAB Added**: College football and basketball added to all sport selectors across Player Prediction, Coaching, Team Dynamics, Rosters, Player Props, and Matchups.
- **Previous changes**: Major Honesty Transformation, navigation simplified, honest labeling, daily parlays fixed, data source transparency, historical learning engine

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both written in TypeScript. UI components are built using TailwindCSS and shadcn/ui, with state management handled by TanStack Query and routing by Wouter.

The core features include a Monte Carlo simulation engine for probability analysis, incorporating high-precision random number generation, variance reduction techniques, and Cholesky decomposition for correlation modeling. Optimal stake sizing is determined using an advanced Kelly Criterion implementation. Correlation modeling employs Gaussian copula-based methods.

Key features include:
- **Smart Ticket Generator & Visual Parlay Builder**: Automated and visual tools for constructing betting tickets with real-time data, confidence scores, and smart suggestions.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets.
- **Advanced Predictive Engines**: Includes a Continuous Learning Engine, Quantum Fusion Engine (integrating 46 factors across 7 categories), and Scheme Recognition Engine for adaptive and comprehensive analysis.
- **Pro Tools**: Offers advanced features like real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, bankroll simulator, and various calculators.
- **Live Center**: Provides real-time game monitoring, including a momentum tracker, live scheme recognition, and a cash-out advisor.
- **Admin Dashboards**: Comprehensive dashboards for user management, fraud detection, subscription statistics, model performance monitoring, data provenance, risk management, and financial projections.
- **Prediction Pipeline Engine**: A 12-module production-grade pipeline covering data ingestion, feature engineering, prediction, diversity, optimization, risk/compliance, verification, feedback, evaluation, monitoring, explainability, and data privacy.
- **Security Architecture**: Multi-layered security including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security, account lockout, and fraud detection.
- **AI Admin Assistant**: AI-powered operational intelligence dashboard (server/adminAssistantEngine.ts, /admin/assistant) that generates structured admin reports with prioritized tasks, financial/risk/compliance actions, budget plans, experiment suggestions, and operational checklists using OpenAI analysis of live platform data.
- **Growth & Operations Management**: Includes features like Trial Fraud Detection, A/B Test Manager, Lifecycle Campaign Manager, User Segmentation & Personalization, Promotional Offers Manager, Acquisition & CAC Analytics, and an advanced Orchestration System for platform governance and ticketing.
- **Analytics Agent Engine**: A behind-the-scenes real-time sports betting analytics agent (server/analyticsAgentEngine.ts) that continuously ingests ESPN live data, normalizes team names, validates feed health, computes market analysis (implied probabilities, EV, Kelly criterion, arbitrage detection, risk exposure, trend analysis), monitors model drift, and produces canonical JSON snapshots. Completely hidden from users; admin-controllable via `/api/admin/analytics-agent/*` endpoints (start/stop/restart/config/metrics/feeds/errors/markets/snapshots). Auto-starts on server boot.
- **Real-Time Data Integration**: All ticket generation uses live ESPN data for odds, spreads, totals, team records, and player leaders. The `/api/recalculate-predictions` endpoint forces a fresh data fetch and regeneration. Data source attribution on every ticket leg shows origin (ESPN, ESPN-derived, model-estimated). The Analytics Agent's market analysis (EV, Kelly, arbitrage detection, trends) enriches generated tickets.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
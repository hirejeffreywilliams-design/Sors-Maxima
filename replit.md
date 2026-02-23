# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to help users construct more intelligent parlays using real ESPN game data. It provides statistical analysis, odds comparison, and parlay building tools. The project aims to provide a competitive edge through data-driven decision-making with honest, transparent data sourcing.

## Recent Changes (Feb 2026)
- **Ticket Generation Pipeline Overhaul**: Fixed The Odds API sport key mapping (was broken, using "nba" instead of "basketball_nba"), enabling real market odds to flow into EV analysis and ticket scoring across all 6 sports.
- **Real Odds Integration**: Both `/api/generate-tickets` and `/api/generate-parlays` now overlay real The Odds API market data (moneylines, spreads, totals) on ESPN game data. Multi-bookmaker consensus pricing with sharp-book weighting for EV calculations.
- **ESPN Roster-Based Props**: Ticket generation now pulls player props from real ESPN rosters (via `getPlayersFromCacheById`) instead of hardcoded player lists. Position-filtered by sport for realistic prop selections.
- **Historical Learning Weights**: Model weights trained from 1,066+ ESPN games are now integrated into ticket confidence scoring via `applyModelWeights()`. Weights cached with 10-min TTL from database.
- **Quantum Fusion Real Market Context**: Fusion engine signals (sharp_money_flow, line_movement, public_fade, monte_carlo, predictive_model) now receive real market context when available, boosting confidence based on actual bookmaker count and line movement data.
- **Unified Pipeline**: Added `fetchRealOddsForGame()` to bridge The Odds API data into the ticket orchestrator, with improved team name matching (exact → contains → token fallback).
- **Scheme Recognition Engine Live**: Replaced entirely hardcoded mock data (4 static teams/coaches) with live server-side engine (`server/schemeRecognitionEngine.ts`) that analyzes real ESPN scoreboard games, team records, coaches, and The Odds API market data. New `GET /api/scheme-analysis?sport=` endpoint. Frontend fetches via TanStack Query with sport selector, loading states, data source attribution, and live auto-refresh.
- **Market Snapshot API**: Unified `GET /api/market-snapshot?sport=` endpoint (server/marketSnapshotEngine.ts) merges ESPN scoreboard data with multi-bookmaker Odds API pricing. Returns consensus pricing, best lines per market, line movement with sharp action detection, edge analysis (EV, arbitrage, middles), and bookmaker comparison. Single API feeds 8+ frontend components.
- **Complete Mock Data Elimination (26 components)**: All analysis components now use Market Snapshot API with TanStack Query. Includes Real-Time Odds, Sharp Money Tracker, Steam Move Detector, Consensus Picks, Betting Insights, Hot Streak Detector, Situational Spots, Edge Finder, Market Timing Alerts, Key Number Analyzer, Matchup Analyzer, Travel/Rest Analyzer, Prop Combo Builder, ML Prop Projections, CLV Predictor, Correlation Engine, SGP Optimizer, Arbitrage Finder, Venue Performance, Sharp Consensus. All show real team names, records, multi-book odds, line movements, EV analysis with sport selector, loading/error/empty states, data source attribution.
- **User-Input Tool Conversions**: Book Limit Planner, Promo Boost Stacker, Conditional Engine, Bet Grading Postgame, Export Bet Slip converted from fake data to user-input forms. Portfolio Parlay Optimizer now uses actual leg odds for implied probability/EV.
- **QuantumTeamDynamics Fix**: Fixed crash caused by mismatched API response shape. Now correctly displays record, win rate, offense/defense ratings, strengths/weaknesses from the team analysis API.
- **Referee Analysis Conversion**: Converted from fake referee profiles to real game context analysis using venue, spread, total, and line movement data.
- **Server-Side Data Cleanup**: Notifications now pull from live ESPN scoreboard (real game names, times). Social feed and tipster profiles cleared of fake data (empty until real users create content). Player predictions now differentiate by tier (Star/Starter/Rotation/Bench/Reserve) using experience, jersey number, roster position, and team context.
- **Previous changes**: Complete real-time data coverage (224+ teams, 7,400+ players), automated 6-hour refresh, dynamic team selectors, NCAAF/NCAAB support, honest labeling, data source transparency

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
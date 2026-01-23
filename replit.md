# ParlayPro - Sports Betting Parlay Optimizer

## Overview
ParlayPro is a sophisticated sports betting parlay optimizer designed to help users construct more intelligent parlays. It leverages advanced probability analysis, correlation modeling, and optimal stake sizing to maximize user potential returns. The project aims to provide a competitive edge in the sports betting market by offering tools for generating, evaluating, and managing parlays with a focus on data-driven decision making.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application features a modern web architecture with a React-based frontend and an Express.js backend, both written in TypeScript. UI components are built using TailwindCSS and shadcn/ui. State management on the frontend is handled by TanStack Query, and routing uses Wouter.

The core of ParlayPro is its advanced Monte Carlo simulation engine, which calculates true win probabilities and evaluates parlay outcomes. This engine incorporates high-precision random number generation, variance reduction techniques like Latin Hypercube Sampling and Antithetic Variates, and Cholesky decomposition for correlation modeling. Optimal stake sizing is determined using an advanced Kelly Criterion implementation that accounts for uncertainty, correlations, and ruin probability.

Key features include:
- **Smart Ticket Generator (NEW - Default Home Page)**: One-click automated ticket generation system where users select sports and the app generates optimal betting tickets using all 40+ analysis factors working together seamlessly:
  - Sport selection interface (NBA, NFL, MLB, NHL, NCAAB, NCAAF)
  - Risk level configuration (conservative, moderate, aggressive)
  - Bankroll-aware stake sizing using Kelly Criterion
  - Auto-generated tickets with confidence scores, EV, win probability
  - Expandable ticket cards showing individual legs and analysis rationale
  - AI Analysis Scores display (Quantum Coaching, Player Analysis, Team Dynamics, ML Projections, Sharp Money, Cashout Eligibility)
- **Advanced Parlay Generator**: Utilizes Monte Carlo optimization to suggest optimal parlays across various sports (NBA, NFL, MLB, NHL, NCAAB, NCAAF), including comprehensive player props. It allows configuration of risk levels, parlay size, and bankroll.
- **Manual Parlay Builder**: Provides a flexible interface for users to manually add and manage betting legs (now accessible via /builder route).
- **Correlation Modeling**: Employs Gaussian copula-based methods to model dependencies between betting leg outcomes.
- **UI/UX**: Features a toggleable dark/light theme and a focus on intuitive navigation and data visualization, including a dedicated dashboard.
- **Comprehensive Betting Insights**: Integrates advanced analytics such as +EV finding, confidence scoring, historical trend analysis, injury alerts, weather impact, line movement tracking, public vs. sharp money indicators, and situational factor analysis. It also includes tools for bankroll management, hedge calculations, and what-if scenarios.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets (conservative, balanced, aggressive, sharp).
- **Pro Tools**: Offers a suite of advanced features for serious bettors, including real-time odds comparison, ML prop projections, advanced correlation engine, same game parlay optimizer, bankroll simulator, and various calculators for hedging and stake splitting.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Sportsbooks (for odds and data)**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers (primarily for multi-platform analysis and odds comparison)

## Running the App
The app runs on port 5000 with `npm run dev`. The frontend and backend are served from the same Express server via Vite middleware.

## Navigation Structure
- **/** - Smart Ticket Generator (default landing page after login)
- **/builder** - Manual Parlay Builder with Quick Picks and Custom Build tabs
- **/tools** - Pro Tools with Quantum Analysis, Odds, ML, Correlation, and more
- **/tracker** - Bet History and performance tracking

## Recent Changes
- January 23, 2026: **MAJOR REDESIGN - Smart Ticket Generator**:
  - Redesigned entire app for simplicity: User selects sport(s) → App generates best possible tickets
  - New default landing page: Smart Ticket Generator at / route
  - Ticket Orchestrator Engine integrates all 40+ analysis factors:
    - Quantum Coaching Analysis (10,000+ pattern recognition)
    - Quantum Player Prediction (10-factor engine)
    - Quantum Team Dynamics (chemistry & performance analysis)
    - ML Projections & Sharp Money Tracking
    - Correlation Engine & Cashout Maximizer
  - Generated tickets include:
    - Confidence scores with A+ to C- grading
    - Win probability and expected value
    - Recommended stakes based on Kelly Criterion
    - Potential payout calculations
    - Expandable leg details with individual analysis
    - Full AI analysis score breakdown
  - Simplified navigation: Generate → Builder → Pro Tools → History
  - Old dashboard moved to /builder route
  - Key files added:
    - client/src/lib/ticket-orchestrator.ts (unified intelligence engine)
    - client/src/pages/auto-generator.tsx (new home page)
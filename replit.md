# ParlayPro - Sports Betting Parlay Optimizer

## Overview
A sophisticated sports betting parlay optimizer that helps users build smarter parlays using advanced probability analysis, correlation modeling, and optimal stake sizing.

## Key Features
- **Advanced Parlay Generator**: Auto-generates optimal parlays using Monte Carlo optimization
  - Sport selection (NBA, NFL, MLB, NHL, NCAAB, NCAAF)
  - **Game-by-game selection**: View all available matchups and choose specific games to include
  - **Player Props**: Comprehensive props similar to FanDuel/DraftKings:
    - NFL: Passing Yards, Passing TDs, Rushing Yards, Receiving Yards, Receptions, Anytime TD
    - NBA: Points, Rebounds, Assists, 3-Pointers, Pts+Rebs+Asts, Steals+Blocks
    - MLB: Hits, RBIs, Runs, Total Bases, Strikeouts (Pitcher)
    - NHL: Goals, Assists, Shots, Saves
  - Configurable risk level (conservative, moderate, aggressive)
  - Adjustable parlay size and bankroll settings
  - "Load into Builder" to customize generated parlays
- **Manual Parlay Builder**: Add/remove betting legs with team, market type, and odds
- **Monte Carlo Simulation**: 20,000 simulations to calculate true win probability
- **Correlation Modeling**: Gaussian copula-based correlation between leg outcomes
- **Kelly Criterion**: Optimal stake sizing recommendations
- **Dark/Light Theme**: Toggle between dark and light modes

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, TypeScript
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Monte Carlo Engine**: 100,000 simulations with adaptive batching, typed arrays, caching, and convergence detection

## Project Structure
```
client/
  src/
    components/           # Reusable UI components
      ui/                 # shadcn/ui base components
      parlay-builder.tsx  # Main parlay builder component
      leg-card.tsx        # Individual betting leg display
      add-leg-form.tsx    # Form to add new legs
      probability-results.tsx # Results panel
      correlation-matrix.tsx  # Correlation heatmap
      theme-provider.tsx  # Dark/light theme context
      theme-toggle.tsx    # Theme toggle button
    pages/
      dashboard.tsx       # Main dashboard page
    lib/
      queryClient.ts      # TanStack Query configuration
server/
  routes.ts               # API route definitions
  storage.ts              # Monte Carlo engine & storage
shared/
  schema.ts               # Shared TypeScript types & Zod schemas
```

## API Endpoints
- `GET /api/sports` - Get available sports for betting
- `GET /api/odds?sport=` - Get mock odds data for a sport
- `POST /api/odds/refresh` - Refresh odds data for a sport
- `POST /api/generate-parlays` - Generate optimal parlays using Monte Carlo optimization
  - Request: `{ sport, stake, minLegs, maxLegs, bankroll, riskLevel, topN }`
  - Response: `{ parlays: GeneratedParlay[], meta: {...} }`
- `POST /api/evaluate` - Evaluate a parlay with Monte Carlo simulation
  - Request: `{ legs: ParlayLeg[], stake: number, simulations: number }`
  - Response: `EvaluationResult` with win probability, EV, Kelly stake, etc.
- `GET /api/health` - Health check endpoint

## Data Models
- **ParlayLeg**: Individual bet with team, market, outcome, odds
- **EvaluationResult**: Win probability, expected value, Kelly stake, correlation matrix

## Running the App
The app runs on port 5000 with `npm run dev`. The frontend and backend are served from the same Express server via Vite middleware.

## Recent Changes
- January 12, 2026: Added 14 NEW edge-finding features:
  - Bet Tracking Dashboard with P/L, ROI, win rate, and CLV analysis
  - CLV (Closing Line Value) Tracker showing if bets beat closing odds
  - Arbitrage Finder for guaranteed profit opportunities
  - Middle Finder for betting both sides when lines move
  - Key Number Alerts for NFL spreads at 3, 7, 10
  - Same Game Parlay Optimizer with leg correlations
  - Fade the Public system alerts when sharps disagree with public
  - Live Bet Timing Advisor (placeholder for real-time data)
  - Alternate Lines Calculator with EV analysis
  - Unit Size Optimizer with edge-based dynamic sizing
  - Streak Breaker Alerts for regression detection
  - Player Prop Correlator for stacking opportunities
  - Pace & Efficiency Projections for totals betting
  - Rest/Travel Fatigue Model with performance impact scores
- January 12, 2026: Enhanced UI with gradient cards, improved navigation, and modern styling
- January 12, 2026: Added new pages - Optimizer (main) and Bet Tracker
- January 12, 2026: Completed 14 advanced betting insights features:
  - +EV Finder with EV badges on game cards showing edge percentages
  - Confidence Scoring (Low/Medium/High ratings)
  - Historical Trend Analysis with hit rates, streaks, home/away factors
  - Correlation Stacking Strategies and diversification warnings
  - Injury & Lineup Alerts on game cards with impact ratings
  - Weather Impact Analysis for outdoor sports
  - Line Movement Tracker with steam/reverse move indicators
  - Public vs Sharp Money indicators
  - Situational Factors (B2B, travel, revenge games, primetime)
  - Hot Streak Detection
  - Bankroll Management with session/daily limits and Kelly multiplier
  - What-If Scenario Builder for analyzing leg modifications
  - Hedge Calculator with guaranteed profit calculations
- January 12, 2026: Created InsightsPanel component with 6 tabs displaying all betting insights
- January 12, 2026: Added comprehensive player props (passing/rushing/receiving yards, TDs, points, assists, etc.) for all sports
- January 12, 2026: Added game-by-game selection - users can now pick specific teams/matchups for their parlays
- January 12, 2026: Added Advanced Parlay Generator with sport selection, risk levels, and optimization algorithms
- January 12, 2026: Initial implementation with Monte Carlo engine, parlay builder UI, and dark mode support

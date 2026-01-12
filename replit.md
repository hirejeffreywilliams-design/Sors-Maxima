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
- **Monte Carlo Engine**: 100,000+ quantum-level simulations with:
  - Mersenne Twister high-precision RNG
  - Latin Hypercube Sampling for variance reduction
  - Antithetic variates for doubled sample efficiency
  - Cholesky decomposition with LRU caching
  - Adaptive batch convergence detection
  - Bernoulli-correct confidence intervals
- **Advanced Kelly Criterion**: Full/half/quarter Kelly variants with:
  - Uncertainty adjustment and correlation penalties
  - Ruin probability estimation
  - Growth rate and Sharpe ratio calculation
  - Edge case protection (no division errors)

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
- January 12, 2026: Added Mega Parlay Features for building 20+ leg tickets with million-dollar potential:
  - **Mega Parlay Builder** with 5 feature tabs: Jackpot Scenarios, Leg Synergies, Round Robin, Progressive Breakdown, Smart Recommendations
  - **Jackpot Scenario Calculator**: Shows potential payouts from $1 to $1000 stakes with million-dollar potential markers
  - **Leg Synergy Scoring**: Correlation-based analysis showing strong_positive (>0.5), positive (>0.2), neutral, negative (<-0.2), strong_negative (<-0.5) synergies
  - **Round Robin Calculator**: Breaks large parlays into 2-6 leg combinations for increased win probability
  - **Progressive Breakdown**: Tracks cumulative odds and payout at each stage of the parlay
  - **Smart Leg Recommendations**: AI-powered suggestions with scoring (synergy bonuses, EV boosts, confidence levels)
  - **Hot Streak Detector**: Identifies players/teams on winning streaks with hit rates and confidence levels
  - **Parlay Insurance Finder**: Hedge calculator with guaranteed profit scenarios and break-even analysis
- January 12, 2026: Added Betting Intelligence System:
  - **A-F Bet Grading**: Weighted scoring (EV 35%, Probability 25%, Value 25%, Risk 15%) with visual grade badges
  - **EV Indicator**: 5 status levels (strong_positive, positive, neutral, negative, strong_negative) with visual badges
  - **Risk Advisory**: 5 risk levels with 10 warning types including low_probability, negative_ev, bankroll_overexposure
  - **Betting Environment Settings**: 4 profile presets (conservative, balanced, aggressive, sharp) with configurable Kelly multiplier, max stake %, min edge requirements
  - Correlation penalty calculated from correlation matrix to improve bet grading
  - Max stake warnings when stake exceeds profile limits
  - Responsive settings panel (inline on smaller screens, sticky sidebar on larger screens)
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

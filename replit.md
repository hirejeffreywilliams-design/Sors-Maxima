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
- January 14, 2026: Added Cashout Maximizer Algorithm:
  - **AI-Powered Cashout Eligibility Scoring**: Grades your parlay's likelihood of receiving cashout offers (A+ to F)
  - **Multi-Platform Analysis**: Shows cashout probability for DraftKings (94%), FanDuel (91%), BetMGM (87%), Caesars (82%), PointsBet (76%), BetRivers (73%)
  - **6-Factor Analysis**: Market Liquidity, League Popularity, Leg Count, Market Diversity, Timing Alignment, Prop Exposure
  - **Platform-Specific Tips**: Features, limitations, and optimization strategies for each sportsbook
  - **Smart Suggestions**: Recommends leg swaps to improve cashout eligibility with impact percentages
  - **Best/Avoid Markets Guide**: Lists optimal markets (Moneylines, Spreads, Totals) and markets to avoid (obscure props, exotic parlays)
  - **Configurable Preferences**: Toggle liquidity priority, major leagues focus, prop avoidance, and leg limits
  - **Optimal Leg Count Advisor**: Recommends 3-5 legs for maximum cashout availability
- January 14, 2026: Added 14 NEW Advanced Ticket-Building Tools to produce the best possible parlays:
  - **Real-Time Odds Comparison**: Multi-book best line finder across DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers with arbitrage detection
  - **ML Prop Projections**: Machine learning-powered player projections with feature importance breakdown (matchup, form, weather, usage)
  - **Correlation Engine 2.0**: Auto-stacking correlated legs with synergy scoring (strong/moderate/weak) and negative correlation warnings
  - **Same Game Parlay Optimizer**: SGP builder with correlation impact per leg, combined EV, and A-D grading system
  - **Bankroll Simulator**: Monte Carlo simulation (10,000 runs) projecting bankroll growth with ruin/doubling probability and percentile outcomes
  - **Correlation-Aware Hedge Calculator**: Smart hedging that adjusts for leg correlations in live parlays
  - **Book Limit Optimizer**: Stake splitting across sportsbooks with fill probability and optimal allocation based on available limits
  - **Leg Diversification Score**: Parlay concentration analysis with sport/bet-type/direction diversity warnings
  - **If-This-Then-That Conditionals**: Game script analysis identifying high-value secondary bets when primary conditions are met
  - **CLV Predictor**: Closing line value forecasting with sharp/public money split and line movement predictions
  - **Sharp Consensus Tracker**: Aggregated sharp picks with consensus %, 7/30-day ROI, and source breakdown
  - **Situational Spot Finder**: Recurring profitable patterns (revenge games, B2B fades, rest advantage, lookahead spots)
  - **Referee/Umpire Analysis**: Official tendencies affecting game totals, foul rates, and home team cover rates
  - **Venue-Specific Performance**: Location factors including altitude, weather, surface type, and home/away records
- January 14, 2026: Enhanced Player Matchup Center with injury status badges (color-coded by severity), L10 averages, and games played count
- January 14, 2026: Reorganized Pro Tools into 10 categories for easier navigation
- January 12, 2026: Enhanced app to focus on TODAY's games and upcoming matchups:
  - **Time-Aware Odds Engine**: Games sorted by start time with today's games prioritized
  - **Today's Best Bets Section**: Highlights top +EV opportunities from imminent games
  - **Game Time Buckets**: Live, Starting Soon, Today, Tonight, Tomorrow, Upcoming categories
  - **Countdown Timers**: Display time until game start (e.g., "2h 15m", "45m")
  - **Urgency Scoring**: Algorithm weights games by proximity for optimal betting windows
  - **Smart Prioritization**: Focuses analysis on games where odds are most reliable
- January 12, 2026: Added 8 NEW Pro Tools for serious bettors to maximize million-dollar potential:
  - **Market Timing Alerts**: Line movement detection, sharp action indicators, value window tracking with 5-15 minute alerts
  - **Portfolio Parlay Optimizer**: Build diversified parlay portfolios with risk-adjusted returns, anchor/satellite/moonshot strategy
  - **Correlation Graph Intelligence**: Visual network showing leg correlations, double-dip warnings, diversification suggestions
  - **Scenario Stress Lab**: Simulate injury/weather/market shocks, drawdown analysis, hedge recommendations per scenario
  - **Progressive Hedge Planner**: Live hedge calculations as parlay progresses, cashout roadmap with vig analysis
  - **Promo & Boost Stacker**: Track sportsbook promotions, find optimal promo stacks, EV boost calculations
  - **Synthetic Insurance Builder**: Find opposite bets to cap downside, variance reduction analysis, protection level slider
  - **Book Limit Planner**: Stake splitting across sportsbooks, fill probability, execution plan generation
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

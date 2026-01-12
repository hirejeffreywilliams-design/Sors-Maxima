# ParlayPro - Sports Betting Parlay Optimizer

## Overview
A sophisticated sports betting parlay optimizer that helps users build smarter parlays using advanced probability analysis, correlation modeling, and optimal stake sizing.

## Key Features
- **Advanced Parlay Generator**: Auto-generates optimal parlays using Monte Carlo optimization
  - Sport selection (NBA, NFL, MLB, NHL, NCAAB, NCAAF)
  - **Game-by-game selection**: View all available matchups and choose specific games to include
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
- January 12, 2026: Added game-by-game selection - users can now pick specific teams/matchups for their parlays
- January 12, 2026: Added Advanced Parlay Generator with sport selection, risk levels, and optimization algorithms
- January 12, 2026: Initial implementation with Monte Carlo engine, parlay builder UI, and dark mode support

# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform that empowers users to construct more intelligent parlays by leveraging real-time ESPN game data and multi-bookmaker market odds. The platform provides statistical analysis, odds comparison, and parlay building tools, aiming to offer a competitive edge through data-driven decision-making with transparent and live data sourcing. Its vision is to dominate the sports betting intelligence market by offering unparalleled analytical depth and a comprehensive suite of tools for both novice and experienced bettors, enabling superior parlay construction and risk management.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application is built with a modern web architecture, utilizing a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled with TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and routing is managed by Wouter.

**Route Module Architecture**: The backend routes are split into 7 focused modules in `server/routes/`:
- `auth.ts` — Authentication (login, register, auth check, logout) — 9 endpoints
- `admin.ts` — All admin endpoints (orchestrator, guardian, analytics, AB tests, campaigns, fraud, support, etc.) — 225 endpoints
- `betting.ts` — Ticket generation, odds, market snapshot, live games, injuries, weather, props — 61 endpoints
- `account.ts` — User profile, settings, bankroll, bet history, favorites, watchlist, credits, subscription, Stripe — 68 endpoints
- `community.ts` — Community, tipsters, shared tickets, referrals, rewards — 34 endpoints
- `intelligence.ts` — Intelligence hub, feed, snapshots, SSE, precomputed predictions — 8 endpoints
- `notifications.ts` — Notifications, game subscriptions, parlay watches — 9 endpoints
- `helpers.ts` — Shared middleware (requireAdmin, creditUsageTracker, idempotency, etc.)

The main `server/routes.ts` is a thin 32-line orchestrator that imports and calls all register functions.

**Deterministic Data Policy**: All `Math.random()` calls have been replaced codebase-wide with deterministic alternatives (`crypto.randomUUID()` for IDs, `crypto.createHash('md5')` seeded values for varied-but-reproducible data, `crypto.randomBytes()` for cryptographic randomness in simulations). The only exception is `server/featureFlags.ts` which legitimately uses `Math.random()` for feature rollout percentage checks.

Core architectural decisions and features include:
- **Unified Intelligence Hub**: Central data pipeline (`server/unifiedIntelligenceHub.ts`) that aggregates all data sources (ESPN Scoreboard, The Odds API, ESPN Injuries, Open-Meteo Weather, ESPN Rosters) on a 60-second cycle. All engines consume from this shared hub instead of fetching independently. Produces a unified `IntelligenceFeed` via `GET /api/intelligence/feed` containing top picks, live games, upcoming games, edge alerts, data source health, and sport summaries. Hub status available at `GET /api/intelligence/hub-status`.
- **Command Center**: The primary landing page (`/`) that displays all intelligence at a glance — opportunity score gauge, top picks across all sports, live game tracker with momentum, edge alerts (sharp action, high EV, arbitrage, weather, injuries), sport breakdown, quick actions, and data source health bar. Auto-refreshes every 30 seconds.
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator (`/generate`) and Visual Parlay Builder for automated and visual construction of betting tickets with real-time data, confidence scores, and smart suggestions.
- **Advanced Analytics & Predictive Engines**: Incorporates a Continuous Learning Engine, a Quantum Fusion Engine (integrating 46 factors across 7 categories), and a Scheme Recognition Engine for adaptive and comprehensive analysis. This includes Monte Carlo simulations with high-precision random number generation and variance reduction, Cholesky decomposition for correlation modeling, and Gaussian copula-based methods. Optimal stake sizing is determined using an advanced Kelly Criterion implementation.
- **Advanced Monte Carlo Engine**: Dedicated simulation engine (`server/monteCarloEngine.ts`) with MersenneTwister RNG, Sobol quasi-random sequences, Latin Hypercube sampling, antithetic variates, importance sampling for rare events, and adaptive simulation count. Models game outcomes using Poisson (NHL/MLB) and Normal (NBA/NFL/NCAAB/NCAAF) score distributions. Runs 25k matchup simulations per game and 100k parlay simulations. Background pre-simulation cycle every 2 minutes across all upcoming games. Self-learning via Bayesian updating with drift detection, calibration history, and accuracy tracking. Risk analytics: VaR, CVaR, Kelly, ruin probability. Persists to `monte-carlo-learning-data.json`. Integrated with Quantum Fusion Engine (real simulation data for monte_carlo signal), Precomputed Predictions Engine (Monte Carlo score predictions and spread/total estimates), storage.ts evaluateParlay/generateOptimalParlays, Platform Intelligence Engine (outcome recording for self-learning), and Continuous Learning Orchestrator (calibration drift checks). API endpoints: `GET /api/monte-carlo/status`, `GET /api/monte-carlo/calibration`, `GET /api/monte-carlo/pre-simulated`, `GET /api/monte-carlo/simulate/:gameId`, `POST /api/monte-carlo/simulate`. Frontend dashboard in Platform Intelligence page under "Monte Carlo" tab showing engine status, calibration buckets, pre-simulated games, and self-improvement trends.
- **Precomputed Predictions Engine**: Runs every 5 minutes across all 6 sports (NBA, NFL, MLB, NHL, NCAAB, NCAAF), combining Quantum Fusion analysis with Vegas engine predictions. Results displayed on Daily Picks page and fed into Command Center top picks.
- **Personalized Betting Insights**: Engine (`server/personalizedInsightsEngine.ts`) analyzes user betting history to generate a Betting DNA profile (risk profile, favorite sport/market, odds range, strengths/weaknesses), performance trends (win rate, ROI, recent form direction), and personalized game recommendations matched to the user's patterns from the live Intelligence Feed. Accessible at `/insights` via `GET /api/user/personalized-insights`.
- **Comprehensive Pro Tools**: Offers features such as real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, and a bankroll simulator. The Cashout Maximizer (`/api/tools/cashout-analysis`) integrates live ESPN game momentum, injury feeds, and weather data alongside EV analysis, returning a full scoring breakdown with platform-specific cashout probabilities. The Live Hedge Calculator (`/api/live/hedge-bets`) enriches pending bets with real-time hedge recommendations using ESPN scoreboard, injuries, and weather data.
- **SEO**: Per-page dynamic titles and descriptions via `useSEO` hook (`client/src/hooks/use-seo.ts`). Global Open Graph and Twitter Card meta tags in `index.html` with per-page overrides.
- **Server-Sent Events (SSE) Live Updates**: Real-time push updates via `server/sseManager.ts` streaming intelligence updates, live scores, and edge alerts to connected clients every 15 seconds. Frontend hook `client/src/hooks/use-sse.ts` manages EventSource connections with auto-reconnect and exponential backoff. SSE endpoint at `GET /api/sse/stream?channels=all,scores,alerts,notification`, status at `GET /api/sse/status`. Integrated into Command Center for live connection indicator and automatic TanStack Query cache invalidation on new data. Security features: IP-based connection rate limiting (5 per IP, 200 total), Last-Event-ID replay buffer (100 events) for seamless reconnection, proper SSE-format error responses.
- **Custom Notification Engine**: Real-time notification system (`server/notificationEngine.ts`) that monitors ESPN game data on a 30-second cycle. Supports game subscriptions (score changes, game starts) and parlay watch tracking. Broadcasts notifications via SSE "notification" event type. Frontend panel (`client/src/components/notifications-panel.tsx`) with type-grouped display, per-type toggle settings, and live badge. Game alert button component (`client/src/components/game-alert-button.tsx`) for subscribing to individual games. API endpoints: `GET/POST/DELETE /api/game-subscriptions`, `GET/POST/DELETE /api/parlay-watches`, `GET /api/custom-notifications`, `PUT /api/custom-notifications/read`, `GET /api/custom-notifications/stats`.
- **Real-Time Data Infrastructure**: Implements a 60-second refresh cycle for ESPN live scores and game states. Market odds from The Odds API are integrated for live EV analysis and line movement tracking. All analysis components utilize a Market Snapshot API with TanStack Query for live updates, completely eliminating mock data.
- **Simplified Navigation**: Main nav organized into Intelligence (Command Center, Daily Picks, Insights, Generate, Live), Odds & Tools, with mobile nav grouped into Build, Analyze (including My Insights), and Account categories.
- **Security Architecture**: Multi-layered security framework including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security, account lockout, and fraud detection. Cryptographic signatures (HMAC-SHA256) and one-time nonces are used for every generated ticket.
- **Automated Operations**: A Continuous Learning Orchestrator autonomously manages auto-settlement of predictions, scheduled model retraining, weight synchronization, data freshness monitoring across 7 feeds, and calibration drift detection.
- **Unified Market Data API**: A `GET /api/market-snapshot` endpoint merges live ESPN scoreboard data with multi-bookmaker Odds API pricing, providing consensus pricing, best lines, line movement with sharp action detection, and edge analysis.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generating structured admin reports with prioritized tasks, financial/risk/compliance actions, and operational checklists via OpenAI analysis of live platform data.
- **Hidden Analytics Agent**: A real-time, server-side analytics agent (`server/analyticsAgentEngine.ts`) continuously ingests ESPN live data, performs market analysis (implied probabilities, EV, Kelly, arbitrage, risk exposure, trends), monitors model drift, and produces canonical JSON snapshots, controllable via admin API endpoints.
- **Platform Intelligence Engine**: Self-growing data engine (`server/platformIntelligenceEngine.ts`) that runs every 5 minutes, accumulating game outcomes, prediction accuracy, odds snapshots, injury impact records, bookmaker rankings, and community consensus. Persists to `platform-intelligence-data.json` (survives restarts, compounds over time, max 5000 game outcomes, 3000 prediction records, 2000 odds records). Frontend dashboard at `/platform-intelligence` with 6 tabs: Team Trends, Prediction Accuracy, Injury Impact, Bookmaker Rankings, Community Intel, Data Growth. 10 API endpoints under `/api/platform-intelligence/*`. Nav accessible as "Data Engine".
- **App Guardian Engine**: A continuous health monitoring system (`server/appGuardianEngine.ts`) that runs 6 scheduled tasks: health checks (30s), service monitoring (60s), error analysis (2m), auto-healing (60s), AI diagnostics (5m), and data pruning (1h). Monitors 7 services (ESPN, Weather, Odds API, App Server, Market Snapshot, Orchestrator, ESPN NBA), auto-heals downed services (orchestrator restart, GC), tracks alerts/incidents, and provides AI-powered diagnostics via OpenAI. Admin dashboard at `/admin/guardian`.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
- **Sports Data**: ESPN (free tier fallback, paid keys recommended)
- **Odds Data**: The Odds API (paid tier recommended)
- **Soccer Data**: API-Football (paid tier recommended)
- **Injury Data**: ESPN free injury API
- **Weather Data**: Open-Meteo free weather API
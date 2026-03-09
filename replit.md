# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a members-only sports betting intelligence platform that enhances sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge in the sports betting market by emphasizing transparent and live data sourcing, helping users make more informed betting decisions. The project's ambition is to revolutionize sports betting through an AI-powered, data-driven approach, offering personalized insights and tools for both individual bettors and community operators.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. The system is designed around a unified intelligence hub that aggregates real-time data for analysis and personalized insights.

The frontend is pre-built (`npx vite build`) and served as static files from `dist/public/`. The backend serves the built frontend directly.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **AI-Powered Betting Tools**: Includes a Daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, Matchup Ticket Builder, and a Ticket Variation Engine.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, Strategy Advisor, and an AI Pick Edge Insight Engine using GPT-4o-mini.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Real-time Data and Analytics**: Features a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker with Server-Sent Events (SSE) for live updates.
- **SSE Live Updates**: Server-Sent Events on `/api/sse/stream` broadcast intelligence updates, live scores, odds alerts, and sharp signals every 30 seconds, invalidating React Query cache.
- **Live Odds in Bet Slip**: `POST /api/odds/live-legs` resolves current market odds for all legs in the parlay slip, polling every 30 seconds and refreshing on SSE `odds-update` events.
- **Live Center Redesign**: Consolidated into 6 focused tabs: Scores | Cashout | Hedge | Momentum | Analytics | Assistant, with a Quick Actions bar.
- **Cashout Advisor /all endpoint**: New `/api/cashout-advisor/all` route provides live game analysis without requiring user picks.
- **Cashout Smart Alerts**: Features like StructureFeedback, Progressive Cashout Calculator (Lock & Roll™), and Line Movement Exit Calculator (Steam Exit™) provide contextual cashout advice.
- **User Engagement & Personalization**: Offers Personalized Betting Insights, a Consolidated Odds Center, and a persistent bet slip with multi-slip management.
- **Sors Books Intelligence Hub**: Allows users to manage sportsbooks, track balances, and compare live odds.
- **Collectible Intelligence Cards**: A trading card system with `system`, `member`, and `admin_seeded` card types, visual effects, and strategy inference on card backs.
- **Research Notes**: Personal notebook functionality for users to save pick analysis.
- **Platform Guidelines System**: Admin-managed rules for community conduct, card policies, and responsible gambling.
- **Admin Operational Tools**: Includes Platform Broadcasts, Emergency Controls (Force Refresh Picks, Push SSE, Clear Intelligence Cache), User Detail Panel, and Force Tier Change.
- **Life-Changing Ticket (LCT) Track Record**: Daily LCTs are logged, settled by admin, and winning LCTs mint `S+` grade system cards.
- **Community Integrity Engine**: An anti-fraud system to detect card velocity abuse and credential sharing.
- **Cashout Engineering™**: Three proprietary cashout strategies: Sportsbook Sweat™, Lock & Roll™, and Steam Exit™.
- **Monetization & Tiered Features**: Implements Stripe for subscriptions (Sharp, Edge, Max tiers) and a Referral System, with features gated by subscription.
- **Proprietary Branding & Lexicon**: Uses "Sors" branding and a proprietary terminology framework (Sors Lexicon™).
- **Global Visual Redesign**: Utilizes a glassmorphism, gradient-based design system with a premium three-color palette.
- **Persistent Data Storage**: Uses PostgreSQL for storing user data, watchlists, preferences, and betting profiles.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and an Autonomous App Intelligence Engine.
- **Mobile UX Enhancements**: Includes Swipe Mode for picks and a Mobile Card Stack Deck.
- **React.lazy Code Splitting**: All pages use `React.lazy` with `Suspense` for faster initial load times — including NotFound, LoginPage, and LandingPage.
- **Onboarding Flow**: Guided first-time experience at `/onboarding`.
- **Odds Source Attribution**: Every precomputed pick card shows which sportsbook offers the best odds, with attribution from "The Odds API" or "ESPN-derived".
- **Favorites & Watchlist**: DB-backed watchlist at `/watchlist` with add/remove teams and games, persisted to PostgreSQL.
- **Data Freshness Indicator**: `client/src/components/data-freshness.tsx` — displays last-updated timestamps and source labels across data views.
- **Company Standards System**: `server/companyStandards.ts` — single source of truth for grade thresholds (A+ through C), prohibited phrases, brand voice, tier standards, and AI compliance context. All AI engines inject `getAIStandardsContext()` and validate output with `validateAIContent()`. Exposed via `GET /api/admin/company-standards/metadata`.
- **Admin Policy & Standards Page**: Full CRUD interface at `/admin/policy-standards` — 4 tabs (Company Policies, Operational Procedures, Model & Grade Standards, AI Brand Standards). Grade thresholds and prohibited phrases auto-populated from the server-side standards module, not hardcoded. 19 default entries seeded to `platform_rules` table.
- **Responsible Gambling Notice**: `client/src/components/responsible-gambling-notice.tsx` — 3 variants (banner/compact/footer), localStorage dismissal, helpline 1-800-522-4700. Compact variant shown on Parlay Builder page.
- **SSE Authentication**: `/api/sse/stream` is protected by `requireAuth` middleware — unauthenticated connections return 401.
- **TBD Team Filtering**: All ticket builders (`buildOptimalTickets`, `buildMatchupTickets`, `buildLifeChangerTicket`) and `gatherTopPicks` in `unifiedIntelligenceHub.ts` filter out picks where `homeTeam === "TBD"` or `awayTeam === "TBD"` — prevents unresolved tournament bracket opponents (ESPN returns `displayName: "TBD"`) from appearing in any ticket or intelligence feed. Final safety filter also applied in the `/api/intelligence/feed` route.
- **Adaptive Engine Scheduling**: `precomputedPredictionsEngine.ts` uses a self-scheduling `setTimeout` pattern instead of a fixed `setInterval`. After each cycle, `getAdaptiveInterval()` recalculates the next delay: 2 min when games start within 15 min, 5 min within 1 hour, 10 min within 2 hours, 20 min idle daytime, 30 min off-peak (1–7am). Cycle duration is tracked via `lastCycleDurationMs`.
- **Admin System Health Page**: New page at `/admin/system-health` — live dashboard showing heap memory usage %, engine cycle status (last run, next run countdown, adaptive interval label), per-sport cache status table, and Odds API quota remaining. Auto-refreshes every 30 seconds. Backend: `GET /api/admin/system-health` in `server/routes/admin.ts`.
- **Memory Pressure Guard**: `server/precomputedPredictionsEngine.ts` — skips prediction cycle and serves stale cache if heap > 80%. Broadcasts `system-alert` SSE event when triggered.
- **SSE Memory Monitor**: `server/sseManager.ts` exports `startMemoryMonitor()` — proactive 60-second heap checker that broadcasts `system-alert` when heap > 80% (5-min cooldown). Started at Phase 4.5 (15s) during server startup.
- **SSE `system-alert` Event**: Added listener in `client/src/hooks/use-sse.ts` — dispatches `system-alert` events through the existing SSE pipeline. Admin System Health page subscribes via `useSSE({ onEvent })` and fires a destructive toast with 5-min client-side debounce + triggers immediate health data refresh.
- **Stale Cache Age Badge**: `client/src/pages/daily-parlays.tsx` — `formatCacheAge(generatedAt)` helper shows a small `Clock` icon + age label ("20m old", "2h old") on pick cards when `dataSource !== "live"` and data is older than 10 minutes. Fresh data (<10 min) and live data show no badge (live shows the existing green pulse badge instead).

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API, The Odds API
- **AI/ML**: OpenAI (GPT-4o-mini, GPT-5)
- **Email**: Resend
- **Database**: PostgreSQL
# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a members-only sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge and become a leader in the sports betting intelligence market by emphasizing transparent and live data sourcing, ultimately helping users make more informed betting decisions. The project's ambition is to revolutionize sports betting through an AI-powered, data-driven approach, offering personalized insights and tools for both individual bettors and community operators.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application utilizes a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. The system is designed around a unified intelligence hub that aggregates real-time data for analysis and personalized insights.

The frontend is pre-built (`npx vite build`) and served as static files from `dist/public/`. After any frontend changes you MUST run `npx vite build` then restart the "Start application" workflow. The backend serves the built frontend directly.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **AI-Powered Betting Tools**: Includes a Daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, Matchup Ticket Builder, and a Ticket Variation Engine.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, Strategy Advisor, and an AI Pick Edge Insight Engine using GPT-4o-mini.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Real-time Data and Analytics**: Features a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker with Server-Sent Events (SSE) for live updates.
- **SSE Live Updates**: Server-Sent Events on `/api/sse/stream` broadcast intelligence updates, live scores, odds alerts, and sharp signals every 30 seconds. The `SSEProvider` context invalidates React Query cache on every event — including `/api/cashout-advisor` and `/api/live/hedge-bets` on live-scores events. Client hook (`use-sse.ts`) has exponential backoff reconnect. Live Center → Scores tab shows the full SSE dashboard: connection status, Sors Opportunity Score™ (0-100), live game cards, edge alerts, and data source health.
- **Live Center Redesign**: Reduced from 10 tabs to 6 focused tabs: Scores | Cashout | Hedge | Momentum | Analytics | Assistant. Added a **Quick Actions** bar below the hero allowing instant tab navigation. LiveGamesStrip now visible to all users. Analytics tab consolidates CLV, Sharp, Factors, and Patterns as sub-tabs. Cashout tab defaults to Live Advice first.
- **Cashout Advisor /all endpoint**: New `/api/cashout-advisor/all` route serves live game analysis without requiring user picks. Pulls current live/upcoming games from ESPN, runs momentum/injury analysis, marks matching slip legs as "Your Pick", always returns data. SSE live-scores events now invalidate this endpoint's cache.
- **Cashout Smart Alerts**: SweatBuilder has live StructureFeedback component showing contextual tips on leg order/odds quality. Lock & Roll™ has interactive Progressive Cashout Calculator. Steam Exit™ has Line Movement Exit Calculator with CLV edge tracking.
- **User Engagement & Personalization**: Offers Personalized Betting Insights, a Consolidated Odds Center, and a persistent bet slip with multi-slip management.
- **Sors Books Intelligence Hub**: Full sportsbook management for users to register books, track balances, view P&L, and compare live odds.
- **Collectible Intelligence Cards**: A trading card system with `system`, `member`, and `admin_seeded` card types, visual effects, and a dedicated "Cards" page with "System Track Record", "My Collection", and "Community Showcase" tabs. Card backs feature a **STRATEGY SECTION** that automatically infers the betting strategy used (Long Shot Sleeper / Steam Move Detected / Underdog Value / Alt-Market Edge / High Conviction / Contrarian Fade) based on odds/EV/confidence, plus a 46-Factor seal and $1/$10/$100 win value display. Cards flip on hover.
- **Research Notes**: Personal notebook functionality for users to save pick analysis, team notes, and parlay builds, accessible via a dedicated page.
- **Platform Guidelines System**: Admin-managed rules covering community conduct, card policies, responsible gambling, and account rules. Users view them at `/guidelines` (public, collapsible categories). Admin manages rules (create/edit/delete/toggle) at `/admin/guidelines`.
- **Life-Changing Ticket (LCT) Track Record**: Daily LCT is auto-logged to `life_changer_log` DB table on first generation. Admin settles (WON/LOST) at `/admin/guidelines` LCT Settlement tab. On WIN, a `S+` grade system card is auto-minted and featured in Community Showcase. Full hit-rate history visible in the System Track Record tab of the Cards page.
- **Community Integrity Engine**: An anti-fraud system to detect card velocity abuse, fake card circulation, mass verification bots, and credential sharing.
- **Cashout Engineering™** (major proprietary feature — Max tier differentiator): Three branded cashout strategies accessed via Live Center → Cashout tab:
  1. **Sportsbook Sweat™**: Front-load 2 heavy favorites ("anchor legs" at -130 to -200), add underdogs last ("pressure legs" at +120 to +250). When anchors win, the book's cashout offer spikes due to growing liability. Cash out at peak book nervousness for 40-80% ROI whether underdogs win or not. Interactive Sweat Builder shows a live Cashout Ladder and Sportsbook Nervousness Score™ (0-100) at each stage.
  2. **Lock & Roll™**: Progressive partial cashouts — 30% after leg 1, 25% after leg 2 (guaranteed no-loss from this point), remaining legs = pure upside. Zero-loss guarantee on any parlay.
  3. **Steam Exit™**: Build on sharp-money line-movement picks. When remaining leg lines move 5+ points in your favor, cash out to capture CLV profit without needing the full ticket to win.
  - UI: `client/src/components/live/cashout-strategies-engine.tsx` — default tab in Live Center → Cashout.
  - AI Awareness: The Betting Assistant, Admin Assistant, App Intelligence Engine, and all OpenAI system prompts fully understand these strategies and can explain/recommend them.
- **Monetization & Tiered Features**: Implements Stripe for subscriptions with Sharp, Edge, and Max tiers, and a Referral System. Features are gated by user subscription tiers, including specialized plans for Community Operators ($499/mo) and Enterprise (~$1,200+/mo).
- **Proprietary Branding & Lexicon**: Replaces generic terms with "Sors" branding and a full proprietary terminology framework (Sors Lexicon™). The 46-Factor Model is the member-facing brand for the prediction engine.
- **Global Visual Redesign**: Utilizes a glassmorphism, gradient-based design system with a premium three-color palette (money green, 24k gold, emerald).
- **Persistent Data Storage**: Uses PostgreSQL for storing user data, watchlists, preferences, and betting profiles.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and an Autonomous App Intelligence Engine for self-discovery and health insights. An Advanced Admin Card Vault (`/admin/cards`) provides comprehensive management for the card system.
- **Mobile UX Enhancements**: Includes Swipe Mode for picks and a Mobile Card Stack Deck for ticket/pick grids.
- **React.lazy Code Splitting**: All pages in `client/src/App.tsx` use `React.lazy` with `Suspense` for faster initial load times.
- **Onboarding Flow**: Guided first-time experience with step-by-step walkthrough at `/onboarding`.
- **Odds Source Attribution**: Every precomputed pick card shows which sportsbook offers the best odds for that specific bet. The `OddsAttribution` component (`client/src/components/ui/odds-attribution.tsx`) renders compact book badges (DK, FD, MGM, CZR, etc.) with expandable "where to place this bet" breakdown. Source is "The Odds API" when live book data is available, or "ESPN-derived" as fallback. Backend `/api/odds-source` endpoint accepts sport/homeTeam/awayTeam/betType/pickSide params and returns full book breakdown. `precomputedPredictionsEngine.ts` enriches picks with `oddsSourceBook`, `oddsBookCount`, `oddsApiSource`, and `allBookOdds` fields.

## Critical Dev Rules
- **NEVER run `npm run db:push`** — it drops 8 tables. Use raw SQL `ADD COLUMN IF NOT EXISTS` only.
- **Do NOT modify `shared/schema.ts`**.
- **After ANY frontend change**: run `npx vite build` THEN restart the "Start application" workflow.
- **Button hover rule**: Never add `hover:bg-*` to buttons. Use `hover-elevate` / `active-elevate-2`.
- **OpenAI**: Use `max_completion_tokens` not `max_tokens`. Use `createOpenAIClient()`. GPT-5 for admin assistant, gpt-4o-mini for real-time features.
- **apiRequest** returns `Promise<Response>` — must call `.then(r => r.json())`.
- **Admin auth**: `process.env.ADMIN_USERNAME` / `process.env.ADMIN_PASSWORD`. Username: "jeffreywilliams".
- **Daily picks route**: `/daily`. Tier mapping: internal `pro`=Sharp, `elite`=Edge, `whale`=Max.

## AI System Files
All OpenAI system prompts are kept current with full platform knowledge:
- `server/sorsKnowledge.ts` — **Centralized knowledge base**: import `SORS_PLATFORM_KNOWLEDGE` or `SORS_CASHOUT_KNOWLEDGE` into any AI system prompt. Always update this file when new features are built.
- `server/routes/betting.ts` (line ~2274) — `/api/live/assistant` Betting Assistant: keyword-routed responses including cashout (`isCashout`) keyword detection for all 3 strategies.
- `server/adminAssistantEngine.ts` — Admin Assistant (`buildSystemPrompt()`): full platform knowledge, cashout strategies, all admin pages, SSE system, card system, LCT.
- `server/appIntelligenceEngine.ts` — App Intelligence Engine: knows full platform feature set.
- `server/routes/intelligence.ts` — Track record analyzer.
- `server/routes/admin.ts` — Marketing generator, diagnostic AI, strategy AI.
- `server/predictionPipelineEngine.ts` — Pick pipeline.
- `server/autonomousAdminIntelligence.ts` — Autonomous platform analysis.

## Card System Grades
- S+ = Life Changer (fuchsia/magenta) — rarest, only on LCT wins
- A+ = Legendary (amber/gold)
- A = Rare (emerald)
- B+ = Uncommon (teal)
- B = Standard+ (blue)
- C+ = Standard (yellow)
- C = Common (slate)

## Card Back Strategy Inference Logic
- odds >= +300: "LONG SHOT SLEEPER" (gold)
- EV >= 15% AND odds > +100: "STEAM MOVE DETECTED" (orange)
- odds +110 to +299: "UNDERDOG VALUE" (purple)
- Non-moneyline bet type: "ALT-MARKET EDGE" (teal)
- confidence >= 72%: "HIGH CONVICTION" (green)
- Default: "CONTRARIAN FADE" (blue)

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API, The Odds API
- **AI/ML**: OpenAI (GPT-4o-mini for real-time features, GPT-5 for admin assistant)
- **Email**: Resend
- **Database**: PostgreSQL

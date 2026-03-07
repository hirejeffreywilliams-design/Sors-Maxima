# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge and become a leader in the sports betting intelligence market by emphasizing transparent and live data sourcing, ultimately helping users make more informed betting decisions.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application utilizes a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. The system is designed around a unified intelligence hub that aggregates real-time data for analysis and personalized insights.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle for comprehensive analysis.
- **Command Center & Intelligent Ticket Generation**: Features a primary dashboard ("Today's Best Tickets"), a daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, and Matchup Ticket Builder.
- **Persistent Bet Slip & Multi-Slip Manager**: A fixed sidebar for managing parlay legs, dynamic payout calculation, and one-tap copy/share. Edge/Max tier users can manage up to 5 independent bet slips with state persistence to localStorage.
- **Correlation Intelligence Panel**: Provides inline analysis for bet slips, detecting conflicts, sport concentration, low-grade legs, and negative EV.
- **HITL Smart Pick Review Queue**: A page for reviewing risk-scored picks, categorizing them as Auto-Approved, Review Needed, or Skip, with model probabilities, market probabilities, edge, Kelly criterion recommendations, and risk flags.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Ticket Variation Engine**: Generates strategic alternative parlay blueprints (e.g., Safe Locks, EV Hunter) based on the user's current slip for premium users.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, and a Strategy Advisor for sophisticated predictions.
- **Intelligence Acceleration System**: A suite of five interconnected engines (Early Settlement Engine, BallDontLie Live Boxscore integration, Micro-Learning Cycles, CLV Auto-Capture, Sharp Signal Detector) designed to speed up prediction-to-learning cycles and provide real-time updates.
- **Real-time Data and Analytics**: Includes a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker.
- **User Engagement & Personalization**: Features Personalized Betting Insights, a Unified Tools & Analytics Page, and a Consolidated Odds Center (Odds Comparison, EV Heatmap, Line Movement, Power Rankings).
- **Real-time Updates & Notifications**: Utilizes Server-Sent Events (SSE) for live updates and a Custom Notification Engine for game subscriptions and parlay watches.
- **Tier-Based Feature Gating**: Protects API routes and features based on user subscription tiers (Sharp, Edge, Max).
- **Sports Ticker with Speed Control**: Ticker shows only in-season sports (filtered by actual game presence). Speed cycles Slow (1×) / Normal (2×) / Fast (4×), stored in localStorage `sors_ticker_speed`.
- **Swipe Mode (Mobile Picks)**: Tinder-style swipe-right-to-add, swipe-left-to-skip card interface for picks on mobile. `SwipePickCards` component in `client/src/components/swipe-pick-cards.tsx`. Uses pointer events (works touch + mouse). Activated by "Swipe" button in command center header (hidden on sm+ screens).
- **Customizable Bottom Nav**: Users choose up to 4 shortcut icons for the bottom mobile nav (12 options). Stored in localStorage `sors_bottom_nav_items`. Default: Picks/Daily/Tickets/Books. Configure via "Customize Shortcuts" in the More side menu. Hook: `client/src/hooks/use-bottom-nav-prefs.ts`. NavCustomizerSheet in App.tsx.
- **Sors Books Intelligence Hub**: Full sportsbook management at `/sorsbooks`. Users register their books (10 supported: DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, PointsBet, BetRivers, Bet365, Unibet, Fanatics), track balances, see per-book P&L from bet history, and compare live odds via The Odds API. Routes: GET/POST/PUT/DELETE `/api/sportsbooks`, GET `/api/sorsbooks/catalog`, GET `/api/sorsbooks/stats`, GET `/api/sorsbooks/best-lines`.
- **Command Center Layout**: Stats/performance cards ("Your Performance" section) moved below the sport picks tabs so picks appear first.
- **Persistent Data Storage**: Uses PostgreSQL for storing user watchlists, preferences, subscriptions, ticket history, and betting profiles.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine for continuous learning, an App Guardian Engine for health monitoring, an AI-Powered Admin Assistant for reports, and an Autonomous Admin Intelligence Engine for monitoring and task prioritization.
- **Specialized Pick Engines**: Dedicated engines for MMA/UFC Picks, March Madness Championship Futures, and Player Props Analyzer.
- **Ensemble Learning Models**: Employs a Unified Stacking Meta-Learner (USML) and an MC Stacked Learner for enhanced prediction accuracy.
- **Enhanced UX**: Features Smart Leg Selector UX, Leg Swap UX on Daily Edge Parlay, and Bet Slip Auto-Open functionality.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Membership & Monetization**: Includes Stripe Payment Integration for subscriptions, a Referral System, and an Email Verification System.
- **International Sports Coverage**: Integrates data for 16 major soccer leagues via API-Football.
- **AI Pick Edge Insight Engine**: Generates sharp edge insights for top picks using GPT-4o-mini.
- **Strategy Accountability System**: Allows users to choose from preset betting strategies with per-leg violation tracking.
- **AI Circuit Breaker**: Manages AI API quotas and error states.
- **Pick Hall of Fame**: Premium ambient-glow "trading card" style pick showcase on `/track-record` page. Horizontal scroll row (won = green glow "CALLED IT", lost = red glow "MISSED"). Each card shows grade, confidence/EV bars, and "Sors Intelligence Report" bullets. Backend: `/api/pick-highlights` (3-min cache). Component: `client/src/components/pick-highlight-cards.tsx`.
- **Performance Highlights Card**: Stats card on `/track-record` showing All-Time Wins, Top Grade win rate, Top Sport win rate, and Overall — computed dynamically from track record data.
- **Share Winning Ticket**: Share button on winning cards in Ticket Showcase opens `ShareProofModal` (branded green overlay). Copy (clipboard) + Share (Web Share API, mobile). Component inline in `client/src/components/ticket-showcase.tsx`.
- **Prediction Engine Calibration**: Outcome-calibrated adjustments in `server/precomputedPredictionsEngine.ts`: Totals -3% confidence, Home team +2%, Away team -2%, NBA/NHL -2%, NCAAB +1%. Quality gate: skips picks with confidence < 52 (C-grade and below historically ≤44% win rate).
- **AI Analysis moved to Admin**: AI Analysis button/panel removed from user-facing `/track-record` page. Now lives in Admin → Model Performance → "AI Analysis" tab. Keeps technical calibration language out of user view.
- **Profile Page Performance Aura**: Profile hero section shows a full ambient glow background that shifts color based on user's actual betting performance: green (win rate ≥55% or ROI ≥5%), yellow (45–55%), red (<45%), indigo (no data yet). Includes animated SVG performance ring, tier badge, bettor archetype, streak, record, ROI, and bankroll at a glance.
- **Cookie Consent Auto-Accept**: Authenticated users are automatically granted cookie consent on login/signup (implied by T&C agreement). Banner only shows to logged-out visitors. Cookie preferences are visible and manageable in Profile → Account → Data & Privacy.

## Proprietary Branding Notes
- All user-visible "Monte Carlo" references replaced with "Sors Simulation" (parlay slip, command center, daily parlays, help, pricing, odds-center, platform-intelligence, intelligence-pipeline, admin pages)
- All user-visible "Quantum" references replaced with "Sors Edge" / "Sors Intelligence" / "Sors 46-Factor Engine" (quantum-analysis-badge.tsx labels — component names kept internal)
- "Quantum Top Picks" → "Sors Top Picks" (precomputed-picks.tsx)
- `quantum-analysis-badge.tsx` exports kept (QuantumBadge, QuantumAnalysisIndicator) but UI labels rebranded. `generateQuantumScore` renamed to `generateSorsScore` internally.
- Ticker user picks endpoint: `/api/ticker/my-picks` — requires auth, returns personalized ticker items from user's tracked picks (live game cross-reference, win/loss updates)
- Ticker sport filter: stored in `localStorage sors_ticker_sports`. Button: data-testid="button-ticker-filter". Popover with per-sport toggles + "Show All".
- Bankroll-aware stake: `SlipContent` in `parlay-slip-drawer.tsx` fetches `/api/settings/bankroll`, computes suggested stake (kellyFraction × 5% of bankroll), pre-fills stake on first load. Preset buttons show 1%/2%/5%/10% of bankroll if set, else $10/$25/$50/$100. Shows "X% of your $Y bankroll" context label.
- SmartAlerts enhanced: 11 alert types, quick-add recommended alerts (7 presets), custom create form with type selector, sport selector, team, title, message. Located at /community → Alerts tab.

## Technical Notes & Critical Fixes
- **AuthState tier propagation**: `AuthState` interface includes `tier` field. `AppContent` sets `authState.tier` from `authData.tier` in its `useEffect`. Use `authState.tier` inside `AuthenticatedApp` — never reference `authData` (scoped to `AppContent` only).
- **Sports Ticker**: `client/src/components/sports-ticker.tsx` — sticky bar `top-14 z-40` below header, only visible in `AuthenticatedApp` (paid subscribers). Backend at `/api/ticker` (public, no auth). 45s refetch interval.
- **SSE System**: Backend `server/sseManager.ts` — lazy-start broadcaster (30s interval), 200 client limit (in-memory). For horizontal scaling, Redis Pub/Sub would be needed. Frontend: `use-sse.ts` + `sse-provider.tsx`. Integrated via `<SSEProvider>` wrapping `AuthenticatedApp`.
- **user_onboarding table**: Created in `server/dbMigrations.ts`. Stores per-user onboarding state. `OnboardingGuard` in `App.tsx` redirects to `/onboarding` if `onboarding_completed = false` and path is not in `skipPaths`.
- **Frontend build**: After ANY frontend change, run `npx vite build` from project root. Built output goes to `dist/public/`.
- **Tier mapping**: DB `pro` = Sharp ($49), `elite` = Edge ($99), `whale` = Max ($249), `free` = unsubscribed.
- **Admin userId**: Session stores `userId = 'admin'` (string). Check `rawUid !== 'admin'` before `parseInt` in routes needing numeric user IDs.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API
- **Odds Data**: The Odds API
- **AI/ML**: OpenAI
- **Email**: Resend
# Sors Maxima - Quantum Sports Betting Intelligence

## Overview
Sors Maxima (formerly ParlayPro) is a sophisticated quantum-powered sports betting intelligence platform designed to help users construct more intelligent parlays. Every feature in the app is enhanced with Quantum Analysis, providing coherence scores, pattern recognition, and quantum-optimized predictions. It leverages advanced probability analysis, correlation modeling, and optimal stake sizing to maximize user potential returns. The project aims to provide a competitive edge in the sports betting market by offering tools for generating, evaluating, and managing parlays with a focus on data-driven decision making.

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
- **/live** - Live Center with Momentum Tracker, Hedge Calculator, AI Assistant, CLV Tracker, Public vs Sharp
- **/tools** - Pro Tools with Quantum Analysis, Odds, ML, Correlation, and more
- **/community** - Social features: Leaderboard, Follow Bettors, Bet Sharing, Smart Alerts
- **/rewards** - Gamification: Daily Challenges, Achievements, Streaks, Paper Trading
- **/bankroll** - Financial Tools: Multi-Book Tracker, ROI Dashboard, Tax Export
- **/analytics** - Personal Analytics: ROI, Win Rate, Streaks, Best Performing Areas, Grade Accuracy
- **/tracker** - Bet History and performance tracking
- **/settings** - User Settings: Notification Preferences, Sportsbook Accounts, Responsible Gaming, Backup & Export
- **/builder** - Manual Parlay Builder with Quick Picks and Custom Build tabs
- **/pricing** - Subscription pricing page (Free, Pro $29, Elite $99, Whale $499)
- **/legal** - Legal compliance (Terms of Service, Privacy Policy, Gambling Disclaimer) - PUBLIC, no auth required

## Monetization (Stripe Integration)
The platform uses a tiered subscription model powered by Stripe:
- **Free**: 3 tickets/day, 2 sports, basic features
- **Pro ($29/mo)**: Unlimited tickets, all 40+ factors, 6 sports, basic alerts
- **Elite ($99/mo)**: All Pro + real-time alerts, AI assistant, CLV tracking, ML projections
- **Whale ($499/mo)**: All Elite + VIP picks, 1-on-1 coaching, priority support

Key files:
- `server/stripeClient.ts` - Stripe API client initialization
- `server/stripeService.ts` - Subscription management service
- `server/seed-products.ts` - Product creation script (run with npx tsx)
- `client/src/pages/pricing.tsx` - Pricing/upgrade page

To set up Stripe products, run: `npx tsx server/seed-products.ts`

## Recent Changes
- January 23, 2026: **SETTINGS & ANALYTICS PAGES**:
  - Added comprehensive Settings page (/settings) with 4 tabs:
    - Notifications: Toggle preferences for alerts (line movement, injury, steam moves, sharp money, bankroll)
    - Accounts: Multi-sportsbook account management with balance tracking
    - Responsible Gaming: Deposit limits, bet limits, cool-off periods, self-exclusion
    - Backup & Export: Manual/auto bet backups, restore functionality, tax export by year
  - Added Analytics page (/analytics) with performance metrics:
    - Performance Overview: Total Bets, ROI, Win Rate, Current Streak
    - Win/Loss Analysis: Breakdown of wins, losses, pushes
    - Best Performing Areas: By sport, bet type, and time of day
    - Grade Accuracy: Prediction performance tracking
  - Database schema expanded with 11 new tables:
    - bankroll_alerts, bet_history, user_analytics, notification_preferences
    - sportsbook_accounts, responsible_gaming, bet_backups, odds_snapshots, tax_records
  - 45 prediction factors in continuous learning engine (expanded from 20)
  - Key files: settings.tsx, analytics.tsx, featuresService.ts, shared/schema.ts

- January 23, 2026: **STRIPE MONETIZATION**:
  - Added 4-tier subscription system: Free, Pro ($29), Elite ($99), Whale ($499)
  - Integrated Stripe for payment processing with checkout and customer portal
  - Created pricing page with monthly/yearly toggle (17% savings for annual)
  - Added subscription tracking for feature gating
  - Key files: stripeClient.ts, stripeService.ts, pricing.tsx

- January 23, 2026: **MASSIVE FEATURE EXPANSION**:
  - Added Social/Community features: Leaderboard, Follow Bettors, Bet Sharing
  - Added Smart Alerts: Line movement, injury, steam move, weather, sharp money alerts
  - Added AI Betting Assistant: Conversational AI for parlay building and analysis
  - Added Advanced Analytics: CLV Tracker, Public vs Sharp Money breakdown
  - Added Gamification: Achievements, Daily Challenges, Streak Tracker, Paper Trading
  - Added Financial Tools: Multi-Book Tracker, ROI Dashboard, Tax Export
  - Added Live Betting: Momentum Tracker, Live Hedge Calculator
  - New pages: /live, /community, /rewards, /bankroll
  - Updated navigation with 7 main sections

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

- January 23, 2026: **CONTINUOUS LEARNING ENGINE & LEGAL COMPLIANCE**:
  - Added Quantum Learning Engine that runs every second, analyzing prediction outcomes
  - 20 analysis factors tracked with adaptive weight adjustments (0.05 learning rate)
  - Learning stats APIs: /api/learning/stats (admin only), /api/learning/weights (public)
  - Added Legal page (/legal) - publicly accessible without authentication
    - Terms of Service, Privacy Policy, Gambling Disclaimer tabs
    - Age 21+ requirement, responsible gaming resources
    - National Problem Gambling Helpline: 1-800-522-4700
  - Enhanced error logging with helper functions (logError, logWarn, logInfo)
  - Key files:
    - server/learningEngine.ts (continuous learning engine)
    - server/errorLogger.ts (enhanced error logging)
    - client/src/pages/legal.tsx (legal compliance pages)
# Sors Maxima - Quantum Sports Betting Intelligence

## Overview
Sors Maxima is a quantum-powered sports betting intelligence platform designed to help users construct more intelligent parlays. It provides coherence scores, pattern recognition, and quantum-optimized predictions using advanced probability analysis, correlation modeling, and optimal stake sizing. The project aims to provide a competitive edge in the sports betting market through data-driven decision-making.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both written in TypeScript. UI components are built using TailwindCSS and shadcn/ui, with state management handled by TanStack Query and routing by Wouter.

The core features include a Monte Carlo simulation engine for probability analysis, incorporating high-precision random number generation, variance reduction techniques, and Cholesky decomposition for correlation modeling. Optimal stake sizing is determined using an advanced Kelly Criterion implementation.

Key features include:
- **Smart Ticket Generator**: Automated ticket generation based on user-selected sports and risk levels, providing optimal betting tickets with confidence scores, EV, and win probability. Includes AI analysis scores (Quantum Coaching, Player Analysis, Team Dynamics, ML Projections, Sharp Money, Cashout Eligibility). This is the default home page.
- **Advanced Parlay Generator**: Utilizes Monte Carlo optimization to suggest optimal parlays across various sports and player props.
- **Visual Parlay Builder**: Advanced drag-and-drop interface for building betting tickets visually from real ESPN games. Features include:
  - Leg-level edge/confidence badges (+EV, ~EV, -EV) with color coding
  - Real-time line movement indicators (steam/reverse arrows) and sharp action signals
  - Same-Game Parlay (SGP) detection with correlation warnings when multiple legs share the same game
  - Smart Suggestions panel recommending complementary high-value legs based on current selections
  - Quick filters (time window, edge threshold, market type) for efficient game browsing
  - What-If/Parlay Insurance calculator showing payout impact if each leg loses, identifying the weakest link
  - Collapsible market sections per game card to reduce clutter while showing all available options
  - Full player props access with "Show All" expansion (no longer limited to 4)
  - 8-step interactive onboarding tutorial for first-time users (localStorage persisted)
  - Persistent symbol key/legend panel explaining all icons and badges
- **Manual Parlay Builder**: A flexible interface for users to manually add and manage betting legs.
- **Live Team Rosters**: Real-time roster data from ESPN's free API covering NBA (30), NFL (32), MLB (30), NHL (32) teams with player details, coaching staff, injury status, and background cache preloading. Located at /rosters.
- **Correlation Modeling**: Employs Gaussian copula-based methods to model dependencies between betting leg outcomes.
- **UI/UX**: Features a toggleable dark/light theme, intuitive navigation, and data visualization.
- **Comprehensive Betting Insights**: Integrates advanced analytics such as +EV finding, confidence scoring, historical trend analysis, injury alerts, weather impact, line movement tracking, public vs. sharp money indicators, and situational factor analysis. Includes bankroll management, hedge calculations, and what-if scenarios.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets.
- **Pro Tools**: Offers advanced features like real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, bankroll simulator, and various calculators.
- **Continuous Learning Engine**: Analyzes prediction outcomes and adapts weights of 46 analysis factors to improve accuracy.
- **Quantum Fusion Engine**: Unified algorithm that integrates 46 contributing factors across 7 categories with synergy detection and self-learning weight optimization:
  - **Core Betting Analysis (12)**: Scheme mismatch, coaching tendency, sharp money flow, public fade, line movement, momentum, situational spot, historical H2H, rest advantage, home field, tipster consensus, Monte Carlo simulations
  - **Advanced Analytics (8)**: Predictive models, player efficiency, scouting data, pace/tempo, clutch index, strength of schedule, point differential, win probability
  - **Psychological Factors (6)**: Mental state, confidence index, pressure response, motivation level, team chemistry, media impact
  - **Physical & Health (6)**: Injury adjustment, biomechanical fatigue, recovery status, nutrition/hydration, sleep quality, load management
  - **Technology & Equipment (4)**: Wearable data, equipment advantage, training tech, video analysis
  - **Environmental (6)**: Weather impact, field conditions, travel fatigue, altitude adjustment, temperature impact, timezone disruption
  - **Financial & Regulatory (4)**: Salary dynamics, contract motivation, roster stability, team investment
- **Algorithm Training Center**: Backtesting system that runs predictions against simulated historical data, tracks accuracy, generates report cards with grades (A+ to F), and determines launch readiness with confidence scores.
- **Tipster Communities**: Allows users to create or join communities, share picks, and monetize their insights (platform takes 15% of earnings).
- **Gamification**: Includes daily challenges, achievements, streaks, and paper trading.
- **Financial Tools**: Multi-book tracker, ROI dashboard, and tax export.
- **Scheme Recognition Engine**: AI-powered analysis of team offensive/defensive schemes and coaching patterns from historical data. Identifies scheme mismatches, coaching tendencies (risk tolerance, tempo, aggression), and situational patterns (home/away, primetime, underdog/favorite) that affect betting outcomes. Available in both pre-game and live modes.
- **Push Notifications**: Real-time alerts for line movement, injury reports, sharp money flow, and game starts with notification preferences and unread count badge in header.
- **Cash-Out Advisor**: AI-powered recommendations on when to hold, partial cash out, or full cash out based on momentum, time remaining, injury risk, and weather factors. Located in Live Center.
- **Live Chat**: Real-time game discussion chat within the Live Center with auto-scroll and simulated incoming messages.
- **Social Feed**: Timeline for sharing wins, analysis, and hot takes with likes and comments. Located in Community page.
- **Copy Betting**: Follow and mirror top tipsters' picks with stats tracking (win rate, ROI, streak). Located in Community page.
- **Pick Competitions**: Weekly/monthly accuracy contests with leaderboards, entry tracking, and prize pools. Located in Rewards page.
- **Player Prop Lab**: Deep-dive player performance analysis with stat tabs, prop lines, trend indicators, and matchup data. Located in Pro Tools.
- **Arbitrage Finder**: Cross-sportsbook scanner for guaranteed profit opportunities with stake calculator and status indicators. Located in Pro Tools.
- **Bet Grading Post-Game**: Detailed post-game analysis of completed bets with factor breakdowns, accuracy percentages, and grade history. Located in Pro Tools.
- **Custom Model Builder**: User-adjustable weights for all 46 analysis factors across 7 categories with save/load and model testing. Located in Pro Tools.
- **AI Credits System**: Tiered daily AI credit allocation (Free: 5, Pro: 50, Elite: 200, Whale: Unlimited) with usage tracking on pricing page.
- **Daily Free Pick**: One high-confidence pick per day available to all users with confidence score and EV indicator.
- **Referral Program**: Referral code/link sharing with $10 credit per successful referral, stats tracking, and conversion history. Located in Settings.
- **Multi-Language Support**: Language selector supporting 8 languages (EN, ES, FR, DE, PT, JA, ZH, KO) with localStorage persistence. Located in Settings.
- **Export to Sportsbook**: Generate formatted bet slips for 6 major sportsbooks (DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers) with copy-to-clipboard and deep linking. Located in Pro Tools.
- **Live Center**: Features a momentum tracker, scheme recognition (live mode), hedge calculator, AI assistant, CLV tracker, public vs. sharp money insights, cash-out advisor, and live chat.
- **Admin Dashboards**: For user management, fraud detection, subscription stats, AI-powered quantum diagnostics, and AI marketing tools.
- **Cookie Consent Banner**: GDPR/CCPA compliant cookie consent with localStorage persistence and privacy policy link.
- **Command Palette**: Global search (Ctrl/Cmd+K) indexing all pages, tools, and features with keyboard shortcut access.
- **Help Center**: Searchable FAQ page with 20+ categorized questions covering all platform features. Publicly accessible.
- **User Profile Page**: Account management with data export (GDPR), account deletion, password change, and active session management.
- **What's New / Changelog**: Version history page showing all platform updates. Publicly accessible.
- **Feedback Widget**: In-app floating feedback button for submitting feature requests, bug reports, and general feedback.
- **Session Management**: View and revoke active login sessions from the Profile page.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers (for multi-platform analysis and odds comparison)

## Navigation Structure (Consolidated - 8 main items + admin)
Main navigation items:
1. **Generate** (/) - Smart Ticket Generator (default home page)
2. **Live** (/live) - Live Center with Momentum Tracker, Hedge Calculator, AI Assistant, Cash-Out Advisor, Live Chat
3. **Tools** (/tools) - Pro Tools with Quantum Analysis, Odds, ML, Correlation, Player Props, Arbitrage, Bet Grading, Custom Model, Export
4. **Rosters** (/rosters) - Live team rosters from ESPN API (NBA, NFL, MLB, NHL) with players, coaches, injury status
5. **Community** (/community) - Unified community page with 2 main tabs:
   - Social: Leaderboard, Follow Bettors, Bet Sharing, Smart Alerts, Social Feed, Copy Betting
   - Tipsters: Discover communities, create your own, earn from tips/subscriptions (15% platform fee)
5. **Rewards** (/rewards) - Gamification: Daily Challenges, Achievements, Streaks, Paper Trading, Pick Competitions
6. **Finance** (/bankroll) - All financial tools in 5 tabs:
   - Bets: Bet history and tracking
   - Books: Multi-sportsbook balance tracker
   - Stats: Performance analytics
   - ROI: Return on investment dashboard
   - Tax: Tax export and reports
7. **Settings** (/settings) - User Settings (3 tabs): Notifications, Responsible Gaming, Backup, Referral Program, Multi-Language Support
8. **Upgrade** (/pricing) - Subscription pricing page

Admin-only pages:
- /admin - Admin Dashboard for user management, fraud detection, subscription stats
- /admin/diagnostics - AI-Powered Quantum Diagnostics
- /admin/marketing - AI Marketing Tools for content generation and growth analytics
- /admin/security - Error & Security Center: system health, error tracking with codes/categories/fixes, security event monitoring, IP blocking, debug tools
- /training - Algorithm Training Center for backtesting and evaluation before launch

## Security Architecture
The application implements multi-layered security for handling user financial data:
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **IP Blocking**: Automatic + manual IP blocking with admin controls
- **Input Sanitization**: XSS and SQL injection detection on all API requests
- **Rate Limiting**: 100 req/min general API, 10 req/min on sensitive routes (auth, payments)
- **Session Fingerprinting**: Browser fingerprint validation to detect session hijacking
- **Password Security**: scrypt hashing with random salt, timing-safe comparison
- **Account Lockout**: 5 failed attempts triggers 30-minute lockout
- **Fraud Detection**: Multi-account detection, IP hopping tracking, risk scoring
- **PII Minimization**: Data masking for emails, IPs, usernames in logs
- **Idempotency**: Duplicate request prevention for payment operations
- **Audit Trail**: All sensitive actions logged with user, IP, timestamp
- **Error Code System**: 25+ categorized error codes with admin troubleshooting guides
- **Health Monitoring**: Automated checks for database, memory, error rate, feature flags

Other routes (accessible but not in main nav):
- /builder - Manual Parlay Builder
- /legal - Legal compliance (Terms, Privacy, Gambling Disclaimer) - PUBLIC
- /help - Help Center with searchable FAQ - PUBLIC
- /profile - User Profile with account management, data export, session control
- /changelog - What's New / version history - PUBLIC

## Running the App
The app runs on port 5000 with `npm run dev`. The frontend and backend are served from the same Express server via Vite middleware.
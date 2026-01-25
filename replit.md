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
- **Manual Parlay Builder**: A flexible interface for users to manually add and manage betting legs.
- **Correlation Modeling**: Employs Gaussian copula-based methods to model dependencies between betting leg outcomes.
- **UI/UX**: Features a toggleable dark/light theme, intuitive navigation, and data visualization.
- **Comprehensive Betting Insights**: Integrates advanced analytics such as +EV finding, confidence scoring, historical trend analysis, injury alerts, weather impact, line movement tracking, public vs. sharp money indicators, and situational factor analysis. Includes bankroll management, hedge calculations, and what-if scenarios.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets.
- **Pro Tools**: Offers advanced features like real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, bankroll simulator, and various calculators.
- **Continuous Learning Engine**: Analyzes prediction outcomes and adapts weights of 45 analysis factors to improve accuracy.
- **Tipster Communities**: Allows users to create or join communities, share picks, and monetize their insights (platform takes 15% of earnings).
- **Gamification**: Includes daily challenges, achievements, streaks, and paper trading.
- **Financial Tools**: Multi-book tracker, ROI dashboard, and tax export.
- **Live Center**: Features a momentum tracker, hedge calculator, AI assistant, CLV tracker, and public vs. sharp money insights.
- **Admin Dashboards**: For user management, fraud detection, subscription stats, AI-powered quantum diagnostics, and AI marketing tools.

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
2. **Live** (/live) - Live Center with Momentum Tracker, Hedge Calculator, AI Assistant
3. **Tools** (/tools) - Pro Tools with Quantum Analysis, Odds, ML, Correlation
4. **Community** (/community) - Unified community page with 2 main tabs:
   - Social: Leaderboard, Follow Bettors, Bet Sharing, Smart Alerts
   - Tipsters: Discover communities, create your own, earn from tips/subscriptions (15% platform fee)
5. **Rewards** (/rewards) - Gamification: Daily Challenges, Achievements, Streaks, Paper Trading
6. **Finance** (/bankroll) - All financial tools in 5 tabs:
   - Bets: Bet history and tracking
   - Books: Multi-sportsbook balance tracker
   - Stats: Performance analytics
   - ROI: Return on investment dashboard
   - Tax: Tax export and reports
7. **Settings** (/settings) - User Settings (3 tabs): Notifications, Responsible Gaming, Backup
8. **Upgrade** (/pricing) - Subscription pricing page

Admin-only pages:
- /admin - Admin Dashboard for user management, fraud detection, subscription stats
- /admin/diagnostics - AI-Powered Quantum Diagnostics
- /admin/marketing - AI Marketing Tools for content generation and growth analytics

Other routes (accessible but not in main nav):
- /builder - Manual Parlay Builder
- /legal - Legal compliance (Terms, Privacy, Gambling Disclaimer) - PUBLIC

## Running the App
The app runs on port 5000 with `npm run dev`. The frontend and backend are served from the same Express server via Vite middleware.
# Sors Maxima - Quantum Sports Betting Intelligence

## Overview
Sors Maxima is a quantum-powered sports betting intelligence platform designed to help users construct more intelligent parlays. It provides coherence scores, pattern recognition, and quantum-optimized predictions using advanced probability analysis, correlation modeling, and optimal stake sizing. The project aims to provide a competitive edge in the sports betting market through data-driven decision-making, offering a competitive edge in the sports betting market through data-driven decision-making.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both written in TypeScript. UI components are built using TailwindCSS and shadcn/ui, with state management handled by TanStack Query and routing by Wouter.

The core features include a Monte Carlo simulation engine for probability analysis, incorporating high-precision random number generation, variance reduction techniques, and Cholesky decomposition for correlation modeling. Optimal stake sizing is determined using an advanced Kelly Criterion implementation. Correlation modeling employs Gaussian copula-based methods to model dependencies between betting leg outcomes.

Key features include:
- **Smart Ticket Generator**: Automated ticket generation based on user-selected sports and risk levels, providing optimal betting tickets with confidence scores, EV, and win probability. This is the default home page.
- **Visual Parlay Builder**: Advanced drag-and-drop interface for building betting tickets visually from real ESPN games with leg-level edge/confidence badges, real-time line movement indicators, Same-Game Parlay (SGP) detection, and smart suggestions.
- **Manual Parlay Builder**: A flexible interface for users to manually add and manage betting legs.
- **Live Team Rosters**: Real-time roster data from ESPN's free API covering major sports.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets.
- **Pro Tools**: Offers advanced features like real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, bankroll simulator, and various calculators.
- **Continuous Learning Engine**: Analyzes prediction outcomes and adapts weights of 46 analysis factors to improve accuracy.
- **Quantum Fusion Engine**: Unified algorithm that integrates 46 contributing factors across 7 categories (Core Betting Analysis, Advanced Analytics, Psychological Factors, Physical & Health, Technology & Equipment, Environmental, Financial & Regulatory) with synergy detection and self-learning weight optimization.
- **Scheme Recognition Engine**: AI-powered analysis of team offensive/defensive schemes and coaching patterns from historical data.
- **Push Notifications**: Real-time alerts for line movement, injury reports, sharp money flow, and game starts.
- **Cash-Out Advisor**: AI-powered recommendations on when to hold, partial cash out, or full cash out.
- **Live Center**: Features a momentum tracker, scheme recognition (live mode), hedge calculator, AI assistant, CLV tracker, public vs. sharp money insights, and cash-out advisor.
- **AI Credits System**: Tiered daily AI credit allocation with usage tracking.
- **Export to Sportsbook**: Generate formatted bet slips for major sportsbooks with copy-to-clipboard and deep linking.
- **Admin Dashboards**: For user management, fraud detection, subscription stats, AI-powered quantum diagnostics, AI marketing tools, model performance monitoring, data provenance/lineage, risk register with SOPs, and financial projections.
- **Model Performance Dashboard**: Admin page for tracking prediction accuracy, calibration curves, concept drift monitoring, model version comparison, EV realized, and adversarial detection stats.
- **Data Provenance & Lineage**: Admin dashboard showing data sources, pipeline health, data contracts, quality scores, and freshness monitoring for all integrated data feeds.
- **Risk Register & SOPs**: Operational risk tracking with mitigation strategies, likelihood/impact assessment, and standard operating procedures for incident response, model deployment, partner onboarding, and more.
- **Financial Projections**: Bull/baseline/bear scenario projections with unit economics (CAC, LTV, ARPU, payback), capital allocation strategy, and MRR growth forecasting.
- **Age Verification Gate**: Legal compliance age verification (21+) with DOB capture, session-based verification state, and access denial for underage users.
- **ROI Uplift Calculator**: User-facing tool showing expected value improvement from subscription tiers, including hit rate boost, monthly/annual uplift, and ROI multiple.
- **Public Roadmap**: Multi-horizon product roadmap (near-term, mid-term, long-term, ultra-long-term) for community transparency.
- **Security Architecture**: Multi-layered security including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security (scrypt), account lockout, and fraud detection.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers (for multi-platform analysis and odds comparison)
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
- **User Experience Health Monitor**: AI-driven system that tracks user signals (errors, payment failures, session drops, negative feedback), computes risk scores per user, and enables proactive intervention to prevent churn.
- **Error Recovery Interceptor**: Frontend component that detects repeated server errors and network failures, showing contextual recovery modal with retry, help center, and feedback options.
- **Admin User Health Dashboard**: Admin page showing at-risk users with risk scores, event timelines, intervention history, suggested actions, and one-click intervention tools.
- **AI Support Chat System**: In-app AI-powered support chatbot with 30-entry knowledge base, intent classification, confidence scoring (>0.85 auto-resolve, 0.6-0.85 confirm, <0.6 escalate), ticket creation/tracking, and feedback collection. Covers account, billing, features, responsible gaming, security, and community topics. Refund/fraud requests always escalate to humans.
- **Admin Support Dashboard**: Ticket queue management with status/priority filtering, escalation view, admin reply system, resolution workflow, and AI automation analytics (automation rate, confidence scores, category/status/priority breakdowns).
- **Sport Factor Analysis Engine**: Comprehensive sport-specific factor system covering 14 sports (NBA, NFL, MLB, NHL, NCAAB, NCAAF, Soccer, Tennis, Cricket, Golf, Horse Racing, Motorsport, Boxing/MMA, Esports) with 46-63 factors per sport across 10-12 categories. Sport-aware signal modifiers enhance the Quantum Fusion Engine with sport-specific weight adjustments. Includes Sport Explorer, Real-Time Analysis, Fusion Deep Dive, and Factor Database views.
- **Frontend Admin Route Guards**: All admin routes (/admin/*) protected with AdminGuard component that shows 404 to non-admin users, preventing unauthorized URL navigation.
- **Trial Fraud Detection & Prevention System**: Privacy-compliant fraud engine (server/trialFraudEngine.ts) that detects trial abuse via email normalization (Gmail dot trick, plus aliases, disposable domain detection), device fingerprinting (canvas, WebGL, fonts, screen, timezone), IP velocity tracking, identity graph with salted hashes, composite risk scoring (18 weighted signals, thresholds: <20 allow, 45-69 verify, 70+ block). Integrated into registration flow via dbAuthService.ts. Auto-upgrades users to Whale tier when 7-day trial expires. Admin fraud review dashboard at /admin/fraud with case management, signal analysis, identity graph visualization, and risk distribution charts.
- **A/B Test Manager**: Admin dashboard (server/abTestEngine.ts, /admin/ab-tests) for creating, tracking, and managing growth experiments with hypothesis definition, variant comparison, confidence scoring, uplift measurement, and statistical significance tracking across 6 categories (acquisition, onboarding, activation, retention, monetization, referral).
- **Lifecycle Campaign Manager**: Admin system (server/lifecycleCampaignEngine.ts, /admin/lifecycle-campaigns) for managing automated user lifecycle campaigns across onboarding, activation, retention, reactivation, monetization, and win/loss categories. Multi-step flows with email, push, in-app, and SMS channels. Tracks sent/opened/clicked/converted metrics per step.
- **User Segmentation & Personalization Engine**: Admin dashboard (server/segmentationEngine.ts, /admin/segmentation) for behavioral, demographic, value, and lifecycle user segments with rule-based targeting, dynamic offers (discount, free bet, boost, cashback, tier upgrade), and personalization rules with trigger-based actions and conversion tracking.
- **Promotional Offers Manager**: Admin system (server/promoOffersEngine.ts, /admin/promos) for managing welcome bonuses, deposit matches, free bets, odds boosts, cashback, loyalty rewards, time-limited promotions, and referral bonuses. Tracks claims, redemptions, cost, revenue, ROI, and wagering requirements.
- **Acquisition & CAC Analytics**: Admin dashboard (server/acquisitionAnalyticsEngine.ts, /admin/acquisition) with channel performance tracking (Meta, Google, TikTok, YouTube, affiliates, influencers, organic), 30/60/90-day KPI forecasts, cohort LTV heatmap analysis, campaign attribution, blended CAC/ROAS, and LTV:CAC ratio monitoring.
- **Analytics Dashboard**: Comprehensive admin analytics surface (server/analyticsDashboardEngine.ts, /admin/analytics-dashboard) with 15 KPIs (DAU/MAU, retention, conversion, ARPU, MRR, churn, LTV, error rate, latency, crash-free), acquisition funnel visualization (7-step install→retain), cohort retention heatmap (D1/D3/D7/D14/D30/D60/D90), revenue tracking (daily MRR, ARPU, LTV), real-time health monitoring (CPU, memory, active users, request rate, error rate, cache hit rate), error log with severity classification, endpoint performance metrics (P50/P95/P99), payment analytics (success rate, chargebacks, refunds), 6 SLO definitions with error budgets, 10 configurable alert rules with escalation chains, 10 data quality checks (schema validation, completeness, freshness, anomaly detection, PII scanning), and 8 incident response playbooks with step-by-step runbooks.
- **Security Architecture**: Multi-layered security including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security (scrypt), account lockout, fraud detection, admin route guards (frontend + backend), and requireAdmin middleware on all sensitive endpoints.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers (for multi-platform analysis and odds comparison)
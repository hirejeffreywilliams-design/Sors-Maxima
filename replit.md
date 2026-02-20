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

The core features include a Monte Carlo simulation engine for probability analysis, incorporating high-precision random number generation, variance reduction techniques, and Cholesky decomposition for correlation modeling. Optimal stake sizing is determined using an advanced Kelly Criterion implementation. Correlation modeling employs Gaussian copula-based methods.

Key features include:
- **Smart Ticket Generator & Visual Parlay Builder**: Automated and visual tools for constructing betting tickets with real-time data, confidence scores, and smart suggestions.
- **Betting Intelligence System**: Provides A-F grading for bets, EV indicators, risk advisories, and configurable betting environment presets.
- **Advanced Predictive Engines**: Includes a Continuous Learning Engine, Quantum Fusion Engine (integrating 46 factors across 7 categories), and Scheme Recognition Engine for adaptive and comprehensive analysis.
- **Pro Tools**: Offers advanced features like real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, bankroll simulator, and various calculators.
- **Live Center**: Provides real-time game monitoring, including a momentum tracker, live scheme recognition, and a cash-out advisor.
- **Admin Dashboards**: Comprehensive dashboards for user management, fraud detection, subscription statistics, model performance monitoring, data provenance, risk management, and financial projections.
- **Prediction Pipeline Engine**: A 12-module production-grade pipeline covering data ingestion, feature engineering, prediction, diversity, optimization, risk/compliance, verification, feedback, evaluation, monitoring, explainability, and data privacy.
- **Security Architecture**: Multi-layered security including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security, account lockout, and fraud detection.
- **Growth & Operations Management**: Includes features like Trial Fraud Detection, A/B Test Manager, Lifecycle Campaign Manager, User Segmentation & Personalization, Promotional Offers Manager, Acquisition & CAC Analytics, and an advanced Orchestration System for platform governance and ticketing.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sportsbook Data**: DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
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

Core architectural decisions and features include:
- **Intelligent Ticket Generation**: Features a Smart Ticket Generator and Visual Parlay Builder for automated and visual construction of betting tickets with real-time data, confidence scores, and smart suggestions.
- **Advanced Analytics & Predictive Engines**: Incorporates a Continuous Learning Engine, a Quantum Fusion Engine (integrating 46 factors across 7 categories), and a Scheme Recognition Engine for adaptive and comprehensive analysis. This includes Monte Carlo simulations with high-precision random number generation and variance reduction, Cholesky decomposition for correlation modeling, and Gaussian copula-based methods. Optimal stake sizing is determined using an advanced Kelly Criterion implementation.
- **Comprehensive Pro Tools**: Offers features such as real-time odds comparison, ML prop projections, an advanced correlation engine, same-game parlay optimizer, and a bankroll simulator.
- **Real-Time Data Infrastructure**: Implements a 60-second refresh cycle for ESPN live scores and game states. Market odds from The Odds API are integrated for live EV analysis and line movement tracking. All analysis components utilize a Market Snapshot API with TanStack Query for live updates, completely eliminating mock data.
- **Security Architecture**: Multi-layered security framework including security headers, IP blocking, input sanitization, rate limiting, session fingerprinting, password security, account lockout, and fraud detection. Cryptographic signatures (HMAC-SHA256) and one-time nonces are used for every generated ticket.
- **Automated Operations**: A Continuous Learning Orchestrator autonomously manages auto-settlement of predictions, scheduled model retraining, weight synchronization, data freshness monitoring across 7 feeds, and calibration drift detection.
- **Unified Market Data API**: A `GET /api/market-snapshot` endpoint merges live ESPN scoreboard data with multi-bookmaker Odds API pricing, providing consensus pricing, best lines, line movement with sharp action detection, and edge analysis.
- **AI-Powered Admin Assistant**: An operational intelligence dashboard generating structured admin reports with prioritized tasks, financial/risk/compliance actions, and operational checklists via OpenAI analysis of live platform data.
- **Hidden Analytics Agent**: A real-time, server-side analytics agent (`server/analyticsAgentEngine.ts`) continuously ingests ESPN live data, performs market analysis (implied probabilities, EV, Kelly, arbitrage, risk exposure, trends), monitors model drift, and produces canonical JSON snapshots, controllable via admin API endpoints.

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
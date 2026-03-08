# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge and become a leader in the sports betting intelligence market by emphasizing transparent and live data sourcing, ultimately helping users make more informed betting decisions. The project's ambition is to revolutionize sports betting through an AI-powered, data-driven approach, offering personalized insights and tools for both individual bettors and community operators.

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
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **AI-Powered Betting Tools**: Includes a Daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, Matchup Ticket Builder, and a Ticket Variation Engine.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, Strategy Advisor, and an AI Pick Edge Insight Engine using GPT-4o-mini.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Real-time Data and Analytics**: Features a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker with Server-Sent Events (SSE) for live updates.
- **User Engagement & Personalization**: Offers Personalized Betting Insights, a Consolidated Odds Center, and a persistent bet slip with multi-slip management.
- **Sors Books Intelligence Hub**: Full sportsbook management for users to register books, track balances, view P&L, and compare live odds.
- **Collectible Intelligence Cards**: A trading card system with `system`, `member`, and `admin_seeded` card types, visual effects, and a dedicated "Cards" page with "System Track Record", "My Collection", and "Community Showcase" tabs.
- **Research Notes**: Personal notebook functionality for users to save pick analysis, team notes, and parlay builds, accessible via a dedicated page.
- **Platform Guidelines System**: Admin-managed rules covering community conduct, card policies, responsible gambling, and account rules. Users view them at `/guidelines` (public, collapsible categories). Admin manages rules (create/edit/delete/toggle) at `/admin/guidelines`.
- **Life-Changing Ticket (LCT) Track Record**: Daily LCT is auto-logged to `life_changer_log` DB table on first generation. Admin settles (WON/LOST) at `/admin/guidelines` LCT Settlement tab. On WIN, a `S+` grade system card is auto-minted and featured in Community Showcase. Full hit-rate history visible in the System Track Record tab of the Cards page.
- **Community Integrity Engine**: An anti-fraud system to detect card velocity abuse, fake card circulation, mass verification bots, and credential sharing.
- **Monetization & Tiered Features**: Implements Stripe for subscriptions with Sharp, Edge, and Max tiers, and a Referral System. Features are gated by user subscription tiers, including specialized plans for Community Operators and Enterprise clients.
- **Proprietary Branding & Lexicon**: Replaces generic terms with "Sors" branding and a full proprietary terminology framework (Sors Lexicon™).
- **Global Visual Redesign**: Utilizes a glassmorphism, gradient-based design system with a premium three-color palette (money green, 24k gold, emerald).
- **Persistent Data Storage**: Uses PostgreSQL for storing user data, watchlists, preferences, and betting profiles.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and an Autonomous App Intelligence Engine for self-discovery and health insights. An Advanced Admin Card Vault (`/admin/cards`) provides comprehensive management for the card system.
- **Mobile UX Enhancements**: Includes Swipe Mode for picks and a Mobile Card Stack Deck for ticket/pick grids.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API, The Odds API
- **AI/ML**: OpenAI (GPT-4o-mini)
- **Email**: Resend
- **Database**: PostgreSQL
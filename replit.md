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
- **Persistent Bet Slip & Multi-Slip Manager**: A fixed sidebar for managing parlay legs, dynamic payout calculation, and one-tap copy/share. Edge/Max tier users can manage up to 5 independent bet slips with state persistence.
- **Correlation Intelligence Panel**: Provides inline analysis for bet slips, detecting conflicts, sport concentration, low-grade legs, and negative EV.
- **HITL Smart Pick Review Queue**: A page for reviewing risk-scored picks with model probabilities, market probabilities, edge, Kelly criterion recommendations, and risk flags.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Ticket Variation Engine**: Generates strategic alternative parlay blueprints (e.g., Safe Locks, EV Hunter) based on the user's current slip for premium users.
- **Strategy Intelligence System**: A complete strategy system with universal and new sport-specific strategies, including an "Active Mode" for filtered picks, an "Auto-Parlay Builder", and "Strategy Backtest" functionality.
- **Autonomous Learning Engine**: Bootstraps the Sors Simulation Engine (MC engine) and Stacking Meta-Learner from historical settled picks, with hourly learning cycles to keep models current.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, and a Strategy Advisor.
- **Intelligence Acceleration System**: A suite of five interconnected engines designed to speed up prediction-to-learning cycles and provide real-time updates.
- **Real-time Data and Analytics**: Includes a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker.
- **User Engagement & Personalization**: Features Personalized Betting Insights, a Unified Tools & Analytics Page, and a Consolidated Odds Center.
- **Real-time Updates & Notifications**: Utilizes Server-Sent Events (SSE) for live updates and a Custom Notification Engine.
- **Tier-Based Feature Gating**: Protects API routes and features based on user subscription tiers (Sharp, Edge, Max).
- **Sports Ticker with Speed Control**: Displays only in-season sports with adjustable speed settings.
- **Swipe Mode (Mobile Picks)**: A Tinder-style swipe interface for picks on mobile devices.
- **Customizable Bottom Nav**: Allows users to choose up to 4 shortcut icons for the mobile navigation.
- **Sors Books Intelligence Hub**: Full sportsbook management where users register books, track balances, view P&L, and compare live odds.
- **Persistent Data Storage**: Uses PostgreSQL for storing user watchlists, preferences, subscriptions, ticket history, and betting profiles.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and Autonomous Admin Intelligence Engine.
- **Specialized Pick Engines**: Dedicated engines for MMA/UFC Picks, March Madness Championship Futures, and Player Props Analyzer.
- **Ensemble Learning Models**: Employs a Unified Stacking Meta-Learner (USML) and an MC Stacked Learner for enhanced prediction accuracy.
- **Enhanced UX**: Features Smart Leg Selector UX, Leg Swap UX on Daily Edge Parlay, and Bet Slip Auto-Open functionality.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Membership & Monetization**: Includes Stripe Payment Integration for subscriptions, a Referral System, and an Email Verification System.
- **International Sports Coverage**: Integrates data for 16 major soccer leagues.
- **AI Pick Edge Insight Engine**: Generates sharp edge insights for top picks using GPT-4o-mini.
- **Strategy Accountability System**: Allows users to choose from preset betting strategies with per-leg violation tracking.
- **AI Circuit Breaker**: Manages AI API quotas and error states.
- **Grade Ambient Glow System**: Pick and ticket cards display a grade-matched ambient box-shadow glow and animated shimmer for high grades.
- **Sors Intelligence Cards**: A collectible trading card system with prominent multi-layer rainbow holographic shimmer (A+ = full rainbow foil, A/B+ = colored shimmer), sport-specific background patterns (court lines, ice rink, baseball diamond, yard markers), event labels (March Madness, Playoffs, Stanley Cup, etc.), rarity labels (LEGENDARY/RARE/UNCOMMON/COMMON), 3D tilt hover, grade-matched glow borders, and "CALLED IT/MISSED" stamps. Admin-only "Showcase Preview" tab in the Cards page displays all pick cards from showcase tickets.
- **Edge Alerts Collapsible**: Edge Alerts section in Command Center moved to a collapsed Collapsible dropdown by default — shows an amber trigger button with alert count badge; expands on tap.
- **Pick Hall of Fame**: A premium showcase of winning/losing picks on the track-record page.
- **Performance Highlights Card**: Displays key performance statistics on the track-record page.
- **Share Winning Ticket**: Allows users to share winning tickets with branding.
- **Prediction Engine Calibration**: Outcome-calibrated adjustments are applied to confidence scores for various pick types and teams.
- **Profile Page Performance Aura**: The profile hero section features a dynamic ambient glow background reflecting the user's betting performance.
- **Cookie Consent Auto-Accept**: Authenticated users automatically consent to cookies, with management options in their profile.
- **Proprietary Branding**: All user-visible "Monte Carlo" references are replaced with "Sors Simulation," and "Quantum" references with "Sors Edge" / "Sors Intelligence" / "Sors 46-Factor Engine."
- **Sors Lexicon™**: Full proprietary terminology framework replacing industry-standard betting terms throughout the UI: Intelligence Edge™, Sors Signal™, Market Drift™, Sors Conviction Score™, Intelligence Closing Value™ (ICV), Market Gap™, Sors Rating™, Intelligence Consensus™, Sors Drift Alert™, Leg Correlation Score™.
- **Admin IP Registry & Business Intelligence**: Page at `/admin/ip-registry` with 5 tabs — Platform Vitals (401,795 LOC), IP Registry (18 proprietary assets with REGISTERED badges), Sors Lexicon table, Mission & Vision, and full Business Plan ($3.3M ARR 24-month target).
- **Marketing Command Center**: Admin page at `/admin/marketing` renamed to "Marketing Command Center" with a new "Promo Ads" tab as the default. Contains pre-built tier-specific ready-to-post ad copy (Sharp $49, Edge $99, Max $249, All Members) across Twitter/X, Instagram, Email, Push/SMS formats (4 campaigns per tier = 16 ready ads), plus AI Tier Ad Generator that generates 3-platform ad sets per request.
- **SSE Live Updates Complete**: Server-Sent Events infrastructure fully wired — sseManager broadcasts `intelligence-update`, `live-scores`, `edge-alerts`, `picks-update` (from PrecomputedEngine cycle), `sharp-signal`, `early-settlement`, `picks-settled`, `notification`, `guardian-alert`. SSE provider invalidates prediction caches (`/api/predictions/*`) on `picks-update`, odds caches on `odds-update`. Bet Builder page (`/builder`) shows a live SSE status indicator (pulsing green dot with last-update timestamp). Vegas Prediction™ and Public Fade™ strategies live on Edge tier.
- **Mobile Card Stack Deck**: `MobileTicketDeck` component (`mobile-ticket-deck.tsx`) — on mobile viewports, converts ticket/pick grids into a swipeable playing-card stack sorted A+ → F, with peek-behind cards, prev/next arrows, touch swipe, and grade badge. Desktop grid layout unchanged.
- **Single-Color Grade Glow Fix**: Ticket cards now show a single cohesive glow color (driven by computed combined grade). Per-leg grade badges inside cards use neutral muted styling so internal badges don't create a multicolored background. `ticket-showcase.tsx` uses `computeTicketGrade()` for consistent card-level color.

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
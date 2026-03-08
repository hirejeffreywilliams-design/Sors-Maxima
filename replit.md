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
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle.
- **Command Center & Intelligent Ticket Generation**: Features a primary dashboard ("Today's Best Tickets"), a daily `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, and Matchup Ticket Builder.
- **Persistent Bet Slip & Multi-Slip Manager**: A fixed sidebar for managing parlay legs, dynamic payout calculation, and multi-slip management for premium users.
- **Correlation Intelligence Panel**: Provides inline analysis for bet slips, detecting conflicts, sport concentration, low-grade legs, and negative EV.
- **HITL Smart Pick Review Queue**: A page for reviewing risk-scored picks with model probabilities, market probabilities, edge, Kelly criterion recommendations, and risk flags.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Ticket Variation Engine**: Generates strategic alternative parlay blueprints (e.g., Safe Locks, EV Hunter) for premium users.
- **Strategy Intelligence System**: A complete strategy system with universal and new sport-specific strategies, including an "Active Mode" for filtered picks, an "Auto-Parlay Builder", and "Strategy Backtest" functionality.
- **Autonomous Learning Engine**: Bootstraps the Sors Simulation Engine (MC engine) and Stacking Meta-Learner from historical settled picks, with hourly learning cycles.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, and a Strategy Advisor.
- **Intelligence Acceleration System**: A suite of five interconnected engines designed to speed up prediction-to-learning cycles and provide real-time updates.
- **Real-time Data and Analytics**: Includes a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker.
- **User Engagement & Personalization**: Features Personalized Betting Insights, a Unified Tools & Analytics Page, and a Consolidated Odds Center.
- **Real-time Updates & Notifications**: Utilizes Server-Sent Events (SSE) for live updates and a Custom Notification Engine.
- **Tier-Based Feature Gating**: Protects API routes and features based on user subscription tiers. Sharp ($49): core picks, parlay builder, track record. Edge ($99): Intelligence Cards, Strategy Advisor, MMA/UFC, Sors Books Hub. Max ($249): Life Changer™ Ticket, Smart Pick Review Queue, Ticket Variation Engine, Card Verification & Discord proof links, Live Cashout/CLV/Hedge tools, Custom Model Builder.
- **Sports Ticker**: Displays only in-season sports with adjustable speed settings.
- **Mobile UX Enhancements**: Includes Swipe Mode for picks and customizable bottom navigation.
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
- **Autonomous App Intelligence Engine**: An hourly self-discovery system that scans client pages, server engines, and route groups to auto-detect new features, generating actionable health/growth insights.
- **Enhanced Admin Pipeline Map**: Provides a visual representation of the system pipeline with live metrics, colored status, and animated flow particles.
- **Proprietary Branding Sweep**: Replaces all user-visible vendor name references with "Sors" branding throughout the platform.
- **Card Security & Anti-Fraud System**: Implements SHA-256 cryptographic signatures for issued cards, displayed with a "SORS CERTIFIED ✓" badge.
- **Pack Rip Animation**: A full-screen, Pokémon-style pack opening experience for revealing cards.
- **Community Cards Feed**: Integrates Intelligence Cards into the Community page with sharing functionality.
- **Sors Intelligence Cards**: A collectible trading card system with visual effects (rainbow holographic shimmer, sport-specific backgrounds, rarity labels, 3D tilt hover, grade-matched glow borders, "CALLED IT/MISSED" stamps).
- **Edge Alerts Collapsible**: Edge Alerts section in Command Center is collapsed by default, expanding on tap.
- **Pick Hall of Fame & Performance Highlights**: Premium showcase of picks and key performance statistics on the track-record page.
- **Share Winning Ticket**: Allows users to share winning tickets with branding.
- **Prediction Engine Calibration**: Outcome-calibrated adjustments applied to confidence scores for various pick types and teams.
- **Profile Page Performance Aura**: Dynamic ambient glow background on the profile hero section reflecting user's betting performance.
- **Cookie Consent Auto-Accept**: Authenticated users automatically consent to cookies.
- **Proprietary Branding**: Replaces "Monte Carlo" with "Sors Simulation," and "Quantum" with "Sors Edge" / "Sors Intelligence" / "Sors 46-Factor Engine."
- **Sors Lexicon™**: Full proprietary terminology framework replacing industry-standard betting terms throughout the UI.
- **Admin IP Registry & Business Intelligence**: Admin page with platform vitals, IP registry, Sors Lexicon table, mission & vision, and business plan.
- **Marketing Command Center**: Admin page for marketing with pre-built tier-specific ad copy and an AI Tier Ad Generator.
- **SSE Live Updates Complete**: Server-Sent Events infrastructure fully wired for various live updates.
- **Mobile Card Stack Deck**: On mobile, converts ticket/pick grids into a swipeable playing-card stack.
- **Single-Color Grade Glow Fix**: Ticket cards show a single cohesive glow color based on combined grade.
- **Global Visual Redesign (Glass/Gradient System)**: Complete redesign across the application using glassmorphism, gradient backgrounds, and specific color palettes.
- **Three-Color Premium Design System**: Utilizes a primary money green, 24k gold, and emerald depth for profit/win indicators.

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
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
- **Persistent Bet Slip & Multi-Slip Manager**: A fixed sidebar for managing parlay legs, dynamic payout calculation, and one-tap copy/share. Edge/Max tier users can manage up to 5 independent bet slips with state persistence to localStorage.
- **Correlation Intelligence Panel**: Provides inline analysis for bet slips, detecting conflicts, sport concentration, low-grade legs, and negative EV.
- **HITL Smart Pick Review Queue**: A page for reviewing risk-scored picks, categorizing them as Auto-Approved, Review Needed, or Skip, with model probabilities, market probabilities, edge, Kelly criterion recommendations, and risk flags.
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly fraction, and daily caps for personalized stake recommendations.
- **Ticket Variation Engine**: Generates strategic alternative parlay blueprints (e.g., Safe Locks, EV Hunter) based on the user's current slip for premium users.
- **Advanced Analytics & Predictive Engines**: Incorporates Continuous Learning, a Multi-Factor Intelligence Engine, Scheme Recognition, Monte Carlo simulations with Kelly Criterion, and a Strategy Advisor for sophisticated predictions.
- **Intelligence Acceleration System**: A suite of five interconnected engines (Early Settlement Engine, BallDontLie Live Boxscore integration, Micro-Learning Cycles, CLV Auto-Capture, Sharp Signal Detector) designed to speed up prediction-to-learning cycles and provide real-time updates.
- **Real-time Data and Analytics**: Includes a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker.
- **User Engagement & Personalization**: Features Personalized Betting Insights, a Unified Tools & Analytics Page, and a Consolidated Odds Center (Odds Comparison, EV Heatmap, Line Movement, Power Rankings).
- **Real-time Updates & Notifications**: Utilizes Server-Sent Events (SSE) for live updates and a Custom Notification Engine for game subscriptions and parlay watches.
- **Tier-Based Feature Gating**: Protects API routes and features based on user subscription tiers (Sharp, Edge, Max).
- **Persistent Data Storage**: Uses PostgreSQL for storing user watchlists, preferences, subscriptions, ticket history, and betting profiles.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine for continuous learning, an App Guardian Engine for health monitoring, an AI-Powered Admin Assistant for reports, and an Autonomous Admin Intelligence Engine for monitoring and task prioritization.
- **Specialized Pick Engines**: Dedicated engines for MMA/UFC Picks, March Madness Championship Futures, and Player Props Analyzer.
- **Ensemble Learning Models**: Employs a Unified Stacking Meta-Learner (USML) and an MC Stacked Learner for enhanced prediction accuracy.
- **Enhanced UX**: Features Smart Leg Selector UX, Leg Swap UX on Daily Edge Parlay, and Bet Slip Auto-Open functionality.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Membership & Monetization**: Includes Stripe Payment Integration for subscriptions, a Referral System, and an Email Verification System.
- **International Sports Coverage**: Integrates data for 16 major soccer leagues via API-Football.
- **AI Pick Edge Insight Engine**: Generates sharp edge insights for top picks using GPT-4o-mini.
- **Strategy Accountability System**: Allows users to choose from preset betting strategies with per-leg violation tracking.
- **AI Circuit Breaker**: Manages AI API quotas and error states.

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
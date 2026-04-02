# Sors Maxima - Sports Betting Intelligence

## Overview
Sors Maxima is a members-only sports betting intelligence platform designed to enhance sports betting parlays through data-driven decision-making. It integrates real-time sports data and multi-bookmaker odds to provide statistical analysis, odds comparison, and parlay building tools. The platform aims to offer a competitive edge in the sports betting market by emphasizing transparent and live data sourcing, helping users make more informed betting decisions. The project's ambition is to revolutionize sports betting through an AI-powered, data-driven approach, offering personalized insights and tools for both individual bettors and community operators. It includes features for personalized bankroll management, real-time data and analytics, and user engagement, driving monetization through tiered subscriptions and a referral system.

## User Preferences
I want iterative development.
I prefer detailed explanations.
Ask before making major changes.
Do not make changes to the folder `shared/`.
Do not make changes to the file `client/src/theme-provider.tsx`.
Do not make changes to the file `client/src/theme-toggle.tsx`.

## System Architecture
The application uses a modern web architecture with a React-based frontend and an Express.js backend, both developed in TypeScript. UI components are styled using TailwindCSS and shadcn/ui, state management is handled by TanStack Query, and Wouter manages routing. The system is designed around a unified intelligence hub that aggregates real-time data for analysis and personalized insights. The frontend is pre-built and served as static files by the backend.

**Core Architectural Decisions and Features**:
- **Unified Intelligence Hub**: Aggregates data from various sources into a unified `IntelligenceFeed` on a 60-second cycle, supporting real-time analytics and predictions.
- **AI-Powered Betting Tools**: Features a `Life Changer Ticket` generator, Smart Ticket Generator, Visual Parlay Builder, Matchup Ticket Builder, and Ticket Variation Engine, driven by advanced analytics and predictive engines (e.g., Monte Carlo simulations, AI Pick Edge Insight Engine).
- **Personalized Bankroll Management**: Integrates user-defined bankroll settings, Kelly criterion, and daily caps for stake recommendations.
- **Real-time Data and Analytics**: Includes a Team Historical Form Engine, Precomputed Predictions Engine, Situational Analysis Engine, and CLV Tracker with Server-Sent Events (SSE) for live updates of intelligence, scores, odds, and sharp signals.
- **Live Odds Integration**: Resolves current market odds for parlay legs and refreshes on SSE `odds-update` events.
- **Cashout Advisor**: Provides live game analysis and features like StructureFeedback, Progressive Cashout Calculator (Lock & Roll™), and Line Movement Exit Calculator (Steam Exit™.
- **User Engagement & Personalization**: Offers Personalized Betting Insights, a Consolidated Odds Center, a persistent bet slip, and a Sors Books Intelligence Hub for managing sportsbooks and comparing odds.
- **Intelligence Cards™**: A system for displaying system-generated, member-generated, and admin-seeded strategy cards with visual effects.
- **Admin & Operational Tools**: Includes Platform Broadcasts, Emergency Controls, User Detail Panel, Force Tier Change, LCT Track Record management, and a Community Integrity Engine for fraud detection.
- **Monetization & Tiered Features**: Implements Stripe for subscriptions (Sharp, Edge, Max tiers) and a Referral System, with features gated by subscription, supported by a Smart Retention Sequence Engine™ and a Revenue Intelligence Dashboard.
- **Proprietary Branding & Lexicon**: Uses "Sors" branding and a proprietary terminology framework (Sors Lexicon™) with a glassmorphism, gradient-based design system.
- **Persistent Data Storage**: PostgreSQL is used for user data, watchlists, preferences, and betting profiles.
- **Security Architecture**: Multi-layered security framework including headers, IP blocking, input sanitization, rate limiting, and session fingerprinting.
- **Autonomous Intelligence & Admin Tools**: Includes a Platform Intelligence Engine, App Guardian Engine, AI-Powered Admin Assistant, and an Autonomous App Intelligence Engine with an Admin System Health Page and Control Room.
- **Reactive Reasoning System**: Employs a Signal Translation Layer and Pick Snapshot Store to track pick value changes and display upgrade/revision badges.
- **Founders Program**: Backend support for managing founder statuses, tier boosts, and referral tracking, integrated with Stripe webhooks.
- **Member Feedback System**: Comprehensive feedback pipeline from user submission to admin management, including pick-specific feedback.
- **Learning System Improvements**: Incorporates per-pick feedback, a DB-backed audit trail, model version snapshots, and an admin learning metrics dashboard.
- **Advanced Strategy Intelligence System**: Provides a daily session planner, game-specific strategy cards, AI-generated strategy briefs, and personal win pattern analytics.
- **SORS Intelligence AI Companion (Task #14)**: A floating sports-themed avatar (`SorsCompanion` at `client/src/components/ai/sors-companion.tsx`) visible to ALL authenticated users in the bottom-right corner. Click to open a slide-in chat panel powered by `/api/ai/analyst` (POST, `requireAuth` — no tier gate). Also has a full-page view at `/ai-analyst` (`client/src/pages/ai-analyst.tsx`). The AI is grounded in live platform data: calibration stats, today's A/B-grade picks, EV, Kelly sizing, and joint probability warnings. System prompt references the 46-Factor Model, calibration track record, and responsible gambling guardrails.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: TailwindCSS, shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Backend Framework**: Express.js
- **Data Validation**: Zod
- **Payment Processing**: Stripe
- **Sports Data**: ESPN, BallDontLie API, API-Football, NHL Stats API, MLB Stats API, The Odds API
- **AI/ML**: OpenAI (GPT-4o-mini, GPT-5)
- **Email**: Resend
- **Database**: PostgreSQL
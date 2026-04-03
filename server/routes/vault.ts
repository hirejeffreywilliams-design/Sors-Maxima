import type { Express } from "express";
import { requireAdmin } from "./helpers";
import { db } from "../db";
import { vaultDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const INITIAL_VAULT_CONTENT: Array<{ sectionKey: string; title: string; content: string }> = [
  {
    sectionKey: "founder-story",
    title: "Founder Story",
    content: `# The Story Behind Sors Maxima

## Who I Am

I built Sors Maxima alone — every line of code, every engine, every page. I am a full-stack engineer with a deep background in statistical modeling, machine learning, and sports betting markets. I have spent years studying how professional sharp bettors and institutional investors approach wagering — not as gambling, but as a data problem.

The name Sors Maxima comes from Latin — "sors" meaning fate, fortune, and lot; "maxima" meaning the greatest. It is not about luck. It is about giving serious people the analytical tools to make informed decisions in a market that has historically only rewarded those with access to institutional-grade intelligence.

## The Moment That Made It Real

For most of my adult life, I watched friends lose money betting sports. Not because they were reckless. Not because they did not care. But because the tools available to them were shallow, dishonest, or outright scams. They would pay for pick services from "experts" who published their hits and buried their losses. They would follow Twitter accounts that claimed 80% win rates backed by no data. They would make decisions based on gut feelings dressed up as analysis.

One night, a close friend called me. He had lost significant money — money he could not afford to lose — following the advice of a picks service that had promised consistent profits. He was not an irresponsible person. He was a smart person who had been given bad information by people who did not care about his outcomes. He was one of several friends I had watched make the same mistake, for the same reasons.

That call changed things for me. I had spent years building data systems. I knew how to build models that are honest about their uncertainty. I knew that the sports betting market — unlike the stock market — has structural inefficiencies that can be identified with the right depth of analysis. I knew that the tools serious bettors needed existed in theory but had never been built in a form that everyday people could access.

## The Decision to Build

I decided to build what I would want to use myself. Not a picks service. Not a tout. A genuine intelligence platform — one that treats bettors as intelligent adults capable of handling real data, real confidence percentages, and honest expected value analysis.

I started with the most important constraint: the model must be honest about what it does not know. Every pick would show its confidence percentage. Every pick would show its expected value. Picks below a statistical quality threshold would be suppressed rather than published with a disclaimer. The platform would only show members what it actually believed in.

## How Sors Maxima Was Built

I built the platform in full-stack TypeScript — React on the frontend, Express and PostgreSQL on the backend. I built the 46-Factor Model Analysis engine from scratch, incorporating factors I had studied across thousands of betting market observations: sharp money flow, line movement patterns, Monte Carlo probability distributions, situational spot analysis, psychological factors, physical health data, environmental conditions, and market dynamics.

I built the Monte Carlo simulation engine to run 10,000 probability simulations per matchup during normal operation and 100,000 simulations in the overnight deep cycle. I built a continuous learning system that uses settled pick outcomes to self-calibrate the model's factor weights over a 90-day rolling window. I built over 50 autonomous background engines that schedule themselves, heal themselves, and alert me when something goes wrong.

I built the Intelligence Cards™ collectible system — a gamification layer that rewards members for winning picks, platform milestones, and Life Changer Ticket victories. I built the Life Changer Ticket — a daily AI-curated high-odds parlay with documented grade minimums that creates an appointment-viewing ritual for members every morning. I built the Betting DNA profile system that builds a personalized statistical portrait of each member based on their wagering history and preferences.

I built the Smart Retention Sequence Engine™ — an automated email lifecycle system that sends the right message to every member at the right moment in their subscription journey, from trial welcome through annual renewal. I built 40+ admin dashboards covering financial projections, pricing intelligence, model integrity, system health, fraud detection, and responsible gambling compliance.

I built all of it alone. It took the kind of focused, sustained engineering effort that most platforms would require a full team and 18–24 months to replicate.

## The Mission

Sors Maxima exists to give serious sports bettors access to the same depth of analytical intelligence that has always been available to professional sharps and institutional investors — and to do it honestly. No guaranteed wins. No false promises. Confidence scores and expected value on every pick. A model that suppresses its own output when it does not meet statistical quality thresholds.

The platform is not designed for casual bettors or people looking for entertainment. It is designed for people who take this seriously, who want to make better-informed decisions, and who deserve tools that are as rigorous as they are.

That is what I built. That is why I built it. And that is the standard it will be held to — by me, and by every member who chooses to trust it with their wagering decisions.`
  },
  {
    sectionKey: "ip-registry",
    title: "Intellectual Property & Proprietary Assets",
    content: `# Intellectual Property & Proprietary Assets Registry

*Classification: Confidential — Owner Use Only*
*Last Updated: April 2026*

---

## Brand Assets

| Asset | Description | Protection Type | Recommended Action |
|-------|-------------|----------------|-------------------|
| **Sors Maxima** | Primary platform name. Derived from Latin for "greatest fortune through pattern analysis." | Common law trademark (in use) | USPTO registration — HIGH PRIORITY |
| **Life Changer Ticket (LCT)** | Daily AI-curated high-odds parlay product. Signature member ritual. | Common law trademark (in use) | USPTO registration — HIGH PRIORITY |
| **Intelligence Cards™** | Collectible gamification card system tied to pick grades and platform milestones. | Common law trademark (in use) | USPTO registration — MEDIUM PRIORITY |
| **Sors Lexicon™** | Proprietary terminology framework used throughout the platform. | Common law trademark (in use) | USPTO registration — MEDIUM PRIORITY |
| **Lock & Roll™** | Progressive cashout advisory feature brand. | Common law trademark (in use) | Consolidate under Cashout Engineering™ umbrella |
| **Steam Exit™** | Line movement exit timing feature brand. | Common law trademark (in use) | Consolidate under Cashout Engineering™ umbrella |
| **Sportsbook Sweat™** | Early cashout advisory feature brand. | Common law trademark (in use) | Consolidate under Cashout Engineering™ umbrella |
| **Cashout Engineering™** | Master brand for the three-part cashout advisory system. | Common law trademark (in use) | USPTO registration — MEDIUM PRIORITY |
| **Smart Retention Sequence Engine™** | Email lifecycle automation system brand. | Common law trademark (in use) | Trade secret + common law TM |
| **46-Factor Model Analysis™** | Core prediction engine brand name. | Common law trademark (in use) | USPTO registration — HIGH PRIORITY |
| **S+ Grade** | Highest collectible card tier, earned exclusively by winning Life Changer Tickets. | Proprietary grading mark | Document as proprietary grading standard |
| **Betting DNA** | Personalized member statistical profile system name. | Common law trademark | USPTO registration — MEDIUM PRIORITY |

---

## Core Intelligence Systems

### 46-Factor Model Analysis™
**What it is:** The prediction engine at the heart of the platform. Scores every active sports matchup across 46 independently weighted factors organized into 8 categories: Core Betting Analysis (12 factors), Advanced Analytics (9 factors), Psychological Factors (6 factors), Physical & Health (4 factors), Performance Metrics (1 factor), Environmental (4 factors), Market Dynamics (8 factors), and Financial & Regulatory (2 factors).

**Why it's proprietary:** The specific factor selection, weighting architecture, and calibration methodology are original work. No publicly available competitor operates at this factor depth. The model self-calibrates using a 90-day rolling accuracy window, which itself is a proprietary methodology.

**Recommended protection:** Trade secret for model weights and factor values. Common law trademark for the "46-Factor Model Analysis™" name. USPTO trademark filing recommended.

---

### Quantum Fusion Engine
**What it is:** Advanced signal fusion layer that takes the outputs of all 46 factors and combines them into a single final confidence score. Applies non-linear weighting and sport-specific calibration adjustments before producing the final pick grade.

**Why it's proprietary:** The fusion methodology — how factor signals are combined, normalized, and weighted against each other — is an original analytical approach. It is the "secret sauce" layer that sits between raw factor scores and published pick grades.

**Recommended protection:** Trade secret. Document the methodology in internal records with dated timestamps. Restrict access to this engine's weights and logic to owner only.

---

### Monte Carlo Stack
**What it is:** Three-layer Monte Carlo simulation system. Standard mode: 10,000 simulations per matchup every 5 minutes during active games. Morning pre-simulation: 10,000 simulations daily at 7 AM ET. Deep overnight cycle: 100,000 simulations per matchup at midnight, producing the highest-accuracy pre-game picks for the following day.

**Why it's proprietary:** The combination of simulation depth (100,000 overnight), scheduling architecture, and integration with the 46-Factor Model creates a composite Monte Carlo stack that no publicly available sports betting tool has replicated.

**Recommended protection:** Trade secret for the simulation architecture and integration methodology. Copyright on the codebase.

---

### Continuous Learning Orchestrator
**What it is:** Master coordinator of all model learning pipelines. Runs automatically every time a pick settles. Manages the Historical Learning Engine, Autonomous Learning Engine, and Backtest Engine in coordinated sequence to continuously improve factor weights.

**Why it's proprietary:** Self-improving prediction systems in sports betting are rare and valuable. The specific orchestration architecture — how learning cycles are triggered, sequenced, and applied to live factor weights — is original work.

**Recommended protection:** Trade secret. Copyright on codebase.

---

### Calibration Engine
**What it is:** Monitors and corrects model accuracy drift over a rolling 90-day window. Computes Brier Scores to measure prediction calibration quality. Automatically flags model anomalies and triggers recalibration when accuracy degrades.

**Why it's proprietary:** The 90-day rolling calibration window with Brier Score monitoring applied to a sports prediction model is a specific, original implementation. No competitor publicly describes this level of model self-governance.

**Recommended protection:** Trade secret.

---

### Sharp Signal Detector
**What it is:** Real-time detection system that identifies professional (sharp) money movements in betting markets. Detects steam moves, reverse line movement, and early sharp action by monitoring odds changes across 6+ sportsbooks simultaneously.

**Why it's proprietary:** The specific detection logic — thresholds, timing windows, multi-book correlation analysis — is original work developed from market observation.

**Recommended protection:** Trade secret. Copyright on codebase.

---

## Member Engagement Systems

### Intelligence Cards™ System
**What it is:** A collectible card system in which every published pick generates a digital card. Cards have visual tiers (S+, A, B, C, D) tied to pick grades and outcomes. The S+ card is the rarest — earned only by winning a Life Changer Ticket (all legs correct). Members collect cards, showcase them in profiles, and trade them with other members.

**Why it's proprietary:** The gamification design — tying collectible card rarity to prediction quality grades and Life Changer Ticket outcomes — is an original product mechanic with no market equivalent. The S+ card as a "win the entire AI parlay" reward is unique.

**Recommended protection:** USPTO trademark for "Intelligence Cards™." Copyright on the visual card designs. Trade secret for the minting algorithm and rarity distribution logic.

---

### Life Changer Ticket (LCT)
**What it is:** A daily AI-curated high-odds parlay (4–6 legs, minimum +1000 combined odds) generated each morning by the prediction engine. Every leg must meet documented grade minimums. Members check it daily, creating a habitual engagement ritual.

**Why it's proprietary:** The daily AI-curated parlay with documented grade minimums and a fixed morning publication schedule is an original product design. No competitor has built this specific engagement ritual.

**Recommended protection:** USPTO trademark for "Life Changer Ticket." Copyright on the LCT format and visual presentation.

---

### Betting DNA Profile
**What it is:** A personalized statistical profile built from each member's wagering history, preferred sports, bet types, and win rates. Displayed as a visual "Betting DNA" card with sport-by-sport analysis.

**Why it's proprietary:** The combination of data points used to construct the profile and the visual presentation format are original product design.

**Recommended protection:** Copyright on the visual design. Trade secret for the profile-building algorithm.

---

### Smart Retention Sequence Engine™
**What it is:** An automated email lifecycle system that manages the complete member journey — trial welcome, Day 3 accuracy milestone, Day 5 urgency nudge, Day 6 last-chance offer, post-conversion engagement, upgrade triggers, win-back campaigns, and annual renewal reminders. Runs hourly.

**Why it's proprietary:** The specific sequence logic — timing, triggers, message content, and behavioral conditions — is original work designed for sports betting member psychology.

**Recommended protection:** Common law trademark. Trade secret for the sequence logic and behavioral triggers.

---

## Data Assets

| Asset | Description | Value |
|-------|-------------|-------|
| **Pick History Database** | Full record of every published pick, grade, odds, and outcome. Foundation of the verified track record. | Grows in value every day; critical for investor credibility |
| **Calibration Data** | 90-day rolling accuracy window per sport, per grade. Model self-correction dataset. | Required for model integrity claims |
| **Monte Carlo Cache** | Pre-simulated probability distributions for active matchups. | Time-sensitive but valuable at any moment |
| **Training Dataset** | Historical picks with outcomes used for model retraining. | Irreplaceable if lost — back up monthly |
| **Member Betting DNA Profiles** | Personalized statistical profiles per member. | Cannot be reconstructed |
| **Factor Weight Archive** | Historical snapshots of model factor weights and calibration state. | Documents model evolution for IP purposes |

---

## Software Copyright

The complete codebase — React/TypeScript frontend, Express.js backend, PostgreSQL schema, all 50+ background engines, API routes, and admin systems — is original work product protected by copyright under U.S. law. Copyright vests automatically upon creation.

**Recommended action:** Register copyright with the U.S. Copyright Office. Registration is not required for protection but is required to sue for statutory damages and attorney's fees in infringement cases.

---

## Formal IP Protection Priority List

| Priority | Action | Estimated Cost | Why |
|----------|--------|---------------|-----|
| HIGH | USPTO trademark — "Sors Maxima" | $350–$450 per class | Brand name is the most valuable long-term asset |
| HIGH | USPTO trademark — "Life Changer Ticket" | $350–$450 per class | Signature product with commercial visibility |
| HIGH | USPTO trademark — "46-Factor Model Analysis™" | $350–$450 per class | Core engine brand with marketing value |
| HIGH | Trade secret documentation for model weights | $0 (internal) | Factor weights and calibration values must be formally designated as trade secrets before any hiring |
| MEDIUM | USPTO trademark — "Intelligence Cards™" | $350–$450 per class | Growing brand with collectible market potential |
| MEDIUM | Copyright registration for codebase | $65 (group registration) | Strengthens enforcement rights |
| MEDIUM | USPTO trademark — "Cashout Engineering™" | $350–$450 per class | Branded advisory system |
| MEDIUM | Attorney review of Terms of Service IP clauses | $500–$1,500 | Ensure member IP and non-disclosure clauses are enforceable |`
  },
  {
    sectionKey: "technical-architecture",
    title: "Technical Architecture",
    content: `# Technical Architecture Documentation

*Classification: Confidential — Owner Use Only*
*Last Updated: April 2026*

---

## Overview

Sors Maxima is a full-stack TypeScript application with a React frontend, Express.js backend, PostgreSQL database, and 50+ autonomous background engines. The platform is hosted on Replit with Stripe handling all billing and OpenAI powering natural language features.

---

## Frontend Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI component framework with concurrent rendering |
| **TypeScript** | Type-safe development across all frontend code |
| **Tailwind CSS** | Utility-first CSS with glassmorphism design system |
| **shadcn/ui** | Component library (Card, Button, Badge, Dialog, etc.) |
| **TanStack Query v5** | Server state management with caching and invalidation |
| **Framer Motion** | Animations for cards, transitions, and microinteractions |
| **wouter** | Lightweight client-side routing |
| **Server-Sent Events (SSE)** | Real-time push updates for Edge/Max members — picks appear live without page refresh |
| **React Hook Form** | Controlled form management with Zod validation |
| **Recharts** | Data visualization for analytics and dashboards |
| **Vite** | Frontend build tool with code splitting and HMR |

**Frontend Architecture Notes:**
- 88+ pages with React.lazy() code splitting — initial load is fast regardless of app size
- Dark mode with localStorage persistence, togglable from any page
- Mobile-optimized with Swipe Mode for pick review and Card Stack Deck for Intelligence Cards
- All interactive elements include data-testid attributes for automated testing
- SSE context provider wraps the entire app, maintaining a single persistent connection

---

## Backend Stack

| Technology | Purpose |
|-----------|---------|
| **Express.js** | HTTP server and API routing |
| **TypeScript** | Type-safe server code |
| **PostgreSQL** | Primary database (Replit-managed with auto-backups) |
| **Drizzle ORM** | Type-safe database query builder with migration support |
| **Passport.js** | Session-based authentication |
| **express-session** | Session management with PostgreSQL store |
| **Stripe** | Subscription billing, webhooks, trial management |
| **OpenAI API** | AI pick explanations, AI Analyst Companion, content generation |
| **Resend** | Transactional email delivery |
| **The Odds API** | Real-time odds from 6+ sportsbooks |
| **ESPN** | Live scores, game states, injury reports, rosters |
| **BallDontLie** | NBA player statistics |
| **MLB Stats API** | Baseball player and game data |
| **API-Football** | International soccer data |
| **Open-Meteo** | Weather data for outdoor sports |
| **bcrypt** | Password hashing |
| **zod** | Schema validation for all API inputs |

---

## Data Flow Architecture

### The Intelligence Pipeline

\`\`\`
External Data Sources
        │
        ├── ESPN (scores, injuries, rosters) — refreshed every 60s–6h
        ├── The Odds API (live odds from 6+ books) — refreshed every 5min
        ├── BallDontLie (NBA player stats) — on-demand
        ├── MLB Stats API (baseball data) — on-demand
        ├── API-Football (soccer data) — refreshed per league schedule
        ├── Open-Meteo (weather) — refreshed every 30min
        └── OpenAI API (AI explanations and analysis) — on-demand
                │
                ▼
    ┌─────────────────────────────┐
    │   Unified Intelligence Hub   │
    │   (master data coordinator)  │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │   46-Factor Model Analysis™  │
    │   (46 weighted factors)      │
    │   + Quantum Fusion Engine    │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │   Monte Carlo Stack          │
    │   10,000–100,000 simulations │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │   Confidence Engine          │
    │   + EV Gate (≥50% / ≥5% EV) │
    │   + Grade Assignment         │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │   Quality Watchdog           │
    │   (grade distribution check) │
    └─────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────┐
    │   PostgreSQL Database        │
    │   (picks table)              │
    └─────────────────────────────┘
                │
          ┌─────┴──────┐
          ▼            ▼
    SSE Push       Pick History
    (live members) (track record)
\`\`\`

### Subscription and Tier Gating

All API routes that return premium content check the user's session tier before responding. The tier hierarchy is: free → sharp → edge → max. Admin bypasses all tier checks. Edge members receive real-time SSE updates. Max members receive unlimited AI analysis and custom model weight access.

---

## The 50+ Background Engines

### Core Intelligence
| Engine | Purpose |
|--------|---------|
| Unified Intelligence Hub | Master coordinator for all data feeds |
| 46-Factor Model Analysis™ | Core prediction — scores every matchup across 46 factors |
| Quantum Fusion Engine | Signal fusion — combines factor outputs into final confidence score |
| Monte Carlo Engine | Runs 10K–100K probability simulations per matchup |
| Prediction Pipeline Engine | Orchestrates the full 46-factor analysis cycle |
| Precomputed Predictions Engine | Pre-computes picks with adaptive scheduling |
| Confidence Engine | Normalizes and computes model confidence scores |
| Calibration Engine | Monitors and corrects accuracy drift over 90-day window |
| Sharp Signal Detector | Detects professional sharp money movements in real time |

### Learning & Adaptation
| Engine | Purpose |
|--------|---------|
| Continuous Learning Orchestrator | Coordinates all learning pipelines after pick settlement |
| Historical Learning Engine | Learns from past outcomes to improve future predictions |
| Autonomous Learning Engine | Self-directed learning that identifies model blind spots |
| Backtest Engine | Backtests model performance against historical outcomes |
| MC Stacked Learner | Monte Carlo simulation-based training system |

### Data & Market
| Engine | Purpose |
|--------|---------|
| Market Snapshot Engine | Captures odds and market state at intervals |
| Pick Insight Engine | Generates contextual intelligence layered on raw picks |
| Game Window Scheduler | Pauses unnecessary API calls during off-peak hours (saves 780+ calls/day) |
| Prefetch Scheduler | Warms data caches before game windows open |
| AI Pick Explainer | Generates GPT-powered natural language explanations for every pick |

### Member Engagement
| Engine | Purpose |
|--------|---------|
| Smart Retention Sequence Engine™ | Automated hourly email lifecycle management |
| Personalized Insights Engine | Builds Betting DNA profiles per member |
| Lifecycle Campaign Engine | Multi-channel campaign management |
| Notification Engine | Push and email alerts for picks, wins, and milestones |
| Promo Offers Engine | Dynamic promotional offer generation and targeting |
| Analytics Agent Engine | Behavioral analytics and engagement scoring per member |

### Analytics & Business Intelligence
| Engine | Purpose |
|--------|---------|
| Platform Intelligence Engine | Platform-wide KPI tracking and executive reporting |
| Acquisition Analytics Engine | Tracks acquisition channels and conversion funnels |
| Live Analytics Engine | Real-time analytics during active game events |
| Analytics Dashboard Engine | Aggregates all analytics for admin dashboards |
| A/B Test Engine | Experimentation framework for UI and pricing tests |
| Accelerated Pattern Engine | Identifies accelerating betting patterns and steam moves |
| Pricing Intelligence Engine | Live pricing analysis, wealth projections, upsell opportunities |
| Revenue Intelligence Dashboard | Computes MRR, ARR, LTV, churn, and trial conversion in real time |

### System Health & Security
| Engine | Purpose |
|--------|---------|
| App Guardian Engine | Silent failure detection and system health monitoring |
| Autonomous App Intelligence Engine | Self-healing monitoring with admin alerting |
| Community Integrity Engine | Anti-fraud system detecting credential sharing and card abuse |
| Community Loss Pattern Engine | Flags problematic betting loss patterns (responsible gambling) |
| Quality Watchdog | Monitors pick grade distribution and flags model anomalies |
| Algorithm Protection System | Protects proprietary model weights from reverse engineering |
| PII Minimization Engine | Enforces GDPR/CCPA-compliant data minimization |

### Specialty Systems
| Engine | Purpose |
|--------|---------|
| Prop Parlay Engine | Player proposition bet parlay building and optimization |
| Early Settlement Engine | Detects optimal cashout timing during live games |
| Correlation Engine | Prevents same-game correlated legs in parlay construction |
| Pro Tools Engine | Advanced tools exclusive to Max-tier members |
| Pick Outcome Tracker | Records all pick results for model calibration and track record |
| Pick Protection Engine | Prevents unauthorized override of published picks |
| Idempotency Engine | Prevents duplicate processing of financial and pick events |

---

## Database Schema Summary

**Core tables:** users, subscriptions, picks, userBets, tradingCards, userCardCollections, cardTrades, cardAuditLog, applications

**Analytics tables:** userAnalytics, betHistory, bankrollAlerts, oddsSnapshots, taxRecords

**Operations tables:** modelWeights, learningLogs, predictions, notificationPreferences, sportsbookAccounts, responsibleGaming, betBackups, tokenStore, vaultDocuments

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Single Express process for all 50+ engines | Adequate for 0–1,000 members; simpler than microservices at this scale |
| Server-Sent Events over WebSockets | SSE is simpler, stateless-compatible, and sufficient for one-way push |
| Drizzle ORM over raw SQL | Type-safety catches schema mismatches at compile time |
| Session-based auth over JWT | Simpler session revocation; no token management complexity |
| PostgreSQL over NoSQL | Relational data model is natural fit for pick/user/subscription relationships |
| Replit hosting | Rapid iteration without infrastructure management overhead |

---

## What Needs Hardening Before Scale (1,000+ Members)

1. Load testing under concurrent SSE connections (current: untested beyond ~50)
2. Database query optimization for large pick history tables
3. Dedicated Redis cache for high-frequency reads
4. CDN for static assets
5. Horizontal scaling (separate web and engine processes)
6. External monitoring (PagerDuty, Datadog, or similar)
7. Formal CI/CD pipeline enforcing server test suites`
  },
  {
    sectionKey: "business-structure",
    title: "Business Structure & Recommendations",
    content: `# Business Structure & Legal Recommendations

*Classification: Confidential — Owner Use Only*
*Last Updated: April 2026*

---

## Recommended Legal Entity

**Form a Single-Member LLC in Delaware or Wyoming.**

**Why Delaware:**
- Most established corporate law in the U.S.; courts have the most precedent for business disputes
- Preferred by investors and acquirers — they expect Delaware entities
- Flexible operating agreement structure
- Strong asset protection for single-member LLCs

**Why Wyoming (alternative):**
- Lower ongoing costs than Delaware
- No state income tax
- Strong privacy protections for LLC members
- Simpler annual compliance requirements
- Good choice if you do not anticipate institutional investment in the near term

**Recommendation:** If you expect to raise institutional capital or sell to a corporate acquirer in the next 3–5 years, form in Delaware. If you expect to operate independently for the foreseeable future and want lower compliance costs, form in Wyoming.

**Entity name:** "Sors Maxima LLC" (reserve this name in your chosen state immediately if you have not already done so).

---

## Operating Structure

### How the Business Should Be Structured

The LLC operating agreement should specify:
- **100% membership interest** held by the founder
- **Manager-managed structure** (you are the sole manager)
- **IP assignment clause** — all intellectual property created in connection with the business is assigned to and owned by the LLC
- **Non-competition and non-solicitation clauses** for any future contractors or employees
- **Decision-making authority** — sole manager has authority over all business decisions without member vote

### Key Operating Accounts

1. **Business bank account** — Open a dedicated business checking account immediately. Do not commingle business and personal funds. This is essential for LLC liability protection.
2. **Stripe account** — Should be connected to the business entity, not a personal account
3. **Business credit card** — Optional but useful for tracking business expenses

---

## Regulatory Positioning

**Sors Maxima is an information and analytics platform. It is not a sportsbook.**

This distinction is critical and must be maintained consistently across all public-facing materials, marketing, and member communications.

| What Sors Maxima IS | What Sors Maxima IS NOT |
|---------------------|------------------------|
| A sports information service | A sportsbook or gambling operator |
| A statistical analysis platform | A financial advisor |
| A members-only intelligence tool | A guaranteed picks service |
| A data-driven decision support tool | A money manager |

**Regulatory basis:** Sports information services are generally regulated as businesses, not as gambling operators, in the United States. The platform does not accept bets, hold funds, or guarantee outcomes. It sells information and analytical tools.

**Key risk:** Some states have laws that could be interpreted to require licenses for "sports consultants" or "handicappers." Before marketing aggressively in any specific state, consult with a sports gaming attorney familiar with that state's regulations.

**Action required:** Retain a sports gaming attorney for a one-time regulatory review before accepting your first paid members. Cost estimate: $2,000–$5,000. This is the most important legal expense you will incur.

---

## Advisor and Board Setup

As a pre-revenue solo operation, a formal board of directors is not necessary. However, an informal advisory network is valuable. Consider identifying:

1. **A sports gaming attorney** — for regulatory review, IP filings, and Terms of Service
2. **A CPA or tax advisor** with experience in digital subscription businesses — for entity structure, quarterly estimated taxes, and business expense tracking
3. **A growth advisor** — ideally someone with experience scaling a subscription SaaS product, ideally in media or sports
4. **A sports betting domain expert** — a professional sharp or analyst who can validate the model's outputs and serve as a credible reference

Advisors at this stage typically receive equity (0.25%–1.0%) or a nominal cash retainer. A formal advisory agreement should be drafted for each advisor.

---

## Terms of Service and Privacy Policy

Your Terms of Service and Privacy Policy must be reviewed by a qualified attorney before accepting paid members. Key clauses to address:

1. **IP ownership** — Members acknowledge that all platform IP, pick methodologies, and analytical frameworks belong to Sors Maxima LLC
2. **No financial advice disclaimer** — Platform outputs are statistical analysis, not financial advice
3. **No guarantee clause** — Explicit statement that past model performance does not guarantee future results
4. **Acceptable use** — Members may not redistribute picks, analysis, or platform outputs outside the platform
5. **Responsible gambling statement** — Acknowledgment of gambling risks and access to problem gambling resources
6. **GDPR/CCPA compliance** — Data collection, use, and deletion rights
7. **Arbitration clause** — Require disputes to be resolved through arbitration rather than class action litigation
8. **Governing law** — Specify your LLC's state of formation

---

## Acquisition Readiness Checklist

When preparing for a strategic acquisition conversation, you will need:

- [ ] Formal LLC entity with clean operating agreement
- [ ] USPTO trademark filings (or applications filed) for primary brand assets
- [ ] Copyright registration for the codebase
- [ ] Trade secret documentation for model weights and factor values
- [ ] Clean business bank account history (no personal fund commingling)
- [ ] 90-day verified pick track record with documented outcomes
- [ ] Stripe dashboard showing MRR, subscriber count, and growth trend
- [ ] Data room with: financials, IP inventory, user metrics, technical architecture doc
- [ ] Formal engagement letter from a business attorney to represent you in the transaction
- [ ] Valuation analysis from an independent appraiser (optional but strengthens your position)

---

## Near-Term Action Items (Prioritized)

1. **TODAY:** Consult a business attorney about LLC formation. Get a quote.
2. **THIS WEEK:** Reserve "Sors Maxima LLC" as a business name in your target state.
3. **THIS MONTH:** File USPTO trademark application for "Sors Maxima" (primary brand).
4. **THIS MONTH:** Open a dedicated business bank account.
5. **BEFORE FIRST MEMBER:** Have a sports gaming attorney review your Terms of Service.
6. **BEFORE FIRST HIRE:** Document model weights as trade secrets in a formal internal policy.
7. **AT $10K MRR:** Engage a CPA with SaaS experience for quarterly tax planning.`
  },
  {
    sectionKey: "valuation-projections",
    title: "Future Projections & Valuation",
    content: `# Future Projections & Valuation Analysis

*Classification: Confidential — Owner Use Only*
*Last Updated: April 2026*
*Note: All projections are speculative estimates. Actual results will depend on execution, market conditions, and pick model accuracy.*

---

## Platform Value Summary (Current State)

| Dimension | Score | Assessment |
|-----------|-------|-----------|
| Technology Readiness | 9.0/10 | Very Strong |
| Feature Completeness | 8.5/10 | Strong |
| Operations Readiness | 8.0/10 | Strong |
| Financial Infrastructure | 7.5/10 | Good |
| Market Readiness | 4.5/10 | Early |
| Brand & Track Record | 2.0/10 | Pre-Launch |
| **Composite Score** | **6.6/10** | Technology-Complete, Market-Unproven |

The platform's technology is estimated to be 2–3 years ahead of its commercial maturity. The AI Companion, Founders Program, and Intelligence Cards system are all built and operational, increasing feature completeness and member engagement potential above the baseline assessment.

---

## Unit Economics

**Weighted ARPU (Average Revenue Per User):** $119/month

| Tier | Price | Est. Mix | Contribution |
|------|-------|---------|-------------|
| Sharp | $49 | 45% | $22.05 |
| Edge | $99 | 35% | $34.65 |
| Max | $249 | 15% | $37.35 |
| Operator | $499 | 5% | $24.95 |
| **Weighted ARPU** | — | 100% | **$119.00** |

**Gross margin at scale:** 84%–87%

**Break-even:** ~10 total members

---

## 5-Year Revenue Projections

*Assumptions: $119 ARPU, 70% paid rate, industry-standard cost scaling. AI Companion integration increases expected retention and ARPU vs. earlier projections.*

| Year | Total Members | Paid Members | Monthly Revenue | Annual Revenue (ARR) | Annual Take-Home (after 35% tax) |
|------|:------------:|:------------:|:--------------:|:-------------------:|:--------------------------------:|
| Year 1 | 200 | 140 | $16,660 | $199,920 | ~$130K |
| Year 2 | 500 | 350 | $41,650 | $499,800 | ~$325K |
| Year 3 | 1,000 | 700 | $83,300 | $999,600 | ~$650K |
| Year 4 | 2,500 | 1,750 | $208,250 | $2,499,000 | ~$1.6M |
| Year 5 | 5,000 | 3,500 | $416,500 | $4,998,000 | ~$3.2M |

**Baseline Year 5 scenario (800 members):** $800K ARR — valued at $3.2M–$5.6M (4–7x revenue multiple)

**Bull case Year 5 (2,500 members):** $2.5M ARR — valued at $12.5M–$25M (5–10x multiple)

---

## Scenario Modeling

### Conservative Scenario (Year 5)
- **Members:** 800 total, 560 paid
- **ARR:** ~$800K
- **Gross Margin:** 84%
- **Valuation:** $3.2M–$5.6M at 4–7x ARR
- **Trigger:** Slow organic growth, 8–12% monthly churn

### Base Scenario (Year 5)
- **Members:** 2,000 total, 1,400 paid
- **ARR:** ~$2.0M
- **Gross Margin:** 85%
- **Valuation:** $10M–$20M at 5–10x ARR
- **Trigger:** Moderate organic growth, 5–7% monthly churn, successful referral program

### Bull Scenario (Year 5)
- **Members:** 5,000 total, 3,500 paid
- **ARR:** ~$5.0M
- **Gross Margin:** 86%
- **Valuation:** $25M–$60M at 5–12x ARR
- **Trigger:** Strong content/social growth, AI Companion as conversion driver, Operator tier adoption, <5% monthly churn

---

## Comparable Acquisition Multiples

| Company | Outcome | ARR at Sale | Multiple | Notes |
|---------|---------|:-----------:|:--------:|-------|
| Action Network | Acquired by Better Collective (2023, ~$240M) | ~$40M | ~6x | Media brand, not AI platform |
| OddsJam | Private, growing | $10M+ (est.) | N/A | +EV and arbitrage tools |
| Unabated | Private, growing | $5M+ (est.) | N/A | CLV tools for sharps |
| The Athletic | Acquired by NYT (2022, $550M) | ~$65M | ~8.5x | Sports media subscription |
| Sportradar | Public (2021 IPO, $8B valuation) | ~$500M | ~16x | Data provider, not intelligence |

**Key insight:** Action Network, the most comparable exit, sold at ~6x ARR in 2023 — and they were a media brand without AI modeling. Sors Maxima is a technology platform with proprietary AI engines and self-calibrating prediction. A premium multiple (8–12x) is defensible at scale if the model performs.

---

## Impact of Recent Feature Additions on Valuation

### AI Analyst Companion
The AI Analyst Companion adds a conversation-based matchup analysis tool that members can query for any game. This feature directly increases:
- **ARPU** — AI features command premium pricing; Max tier value prop strengthens
- **Retention** — Members with a personal AI tool churn less
- **Differentiation** — No competitor offers an on-demand AI analyst trained on 46 factors
- **Valuation multiple** — AI-powered products command higher multiples in 2025–2026 markets

Estimated valuation premium from AI Companion: **+10–20% on acquisition conversations**

### Founders Program
The Founders Program creates a tier of committed early members who have made a long-term financial commitment to the platform. Benefits to valuation:
- **Lower churn signal** — Founders are pre-committed; reduces churn uncertainty for acquirers
- **Social proof** — A Founders Wall demonstrates that paying members exist and believe in the platform
- **Community anchor** — Founders create a community core that attracts subsequent members

### Intelligence Cards™ System
The collectible card system creates a unique retention mechanism that competitors cannot easily replicate:
- **Daily active engagement** — Card collection drives daily logins beyond pick checking
- **Network effect potential** — Card trading creates member-to-member connections
- **Unique IP** — The S+ card mechanic (winning a Life Changer Ticket) is a product design with no market equivalent

---

## Acquisition Target Range

| Scenario | ARR | Recommended Acquisition Price | Strategic Premium |
|----------|-----|-------------------------------|------------------|
| Pre-track-record (current) | $0 | $500K–$1.5M | Platform acquisition; technology asset |
| 90-day track record, 100 members | $100K | $1M–$3M | Proven model with initial traction |
| 1-year track record, 500 members | $500K | $3M–$8M | Demonstrated growth and model accuracy |
| 2-year track record, 1,500 members | $1.5M | $10M–$20M | Scaling subscription business |
| 3-year track record, 3,000 members | $3M | $20M–$45M | Comparable to Action Network early stage |
| Strategic exit, 5,000+ members | $5M+ | $40M–$100M+ | Full strategic acquisition |

**Target acquirer profiles:**
1. **Sports media companies** (ESPN, The Athletic, Bleacher Report) — want premium intelligence as subscriber product
2. **Sportsbooks** (DraftKings, FanDuel, BetMGM) — want AI intelligence to differentiate user experience
3. **Data providers** (Sportradar, Stats Perform) — want to add consumer-facing AI layer to data business
4. **Private equity** — rolling up sports media/analytics platforms

---

## What Increases Valuation Most

In order of impact:

1. **90-day verified pick track record** — The single most important variable. Unverified technology is worth $500K–$1.5M. Technology with a 90-day verified record showing >52.4% accuracy is worth $3M–$8M at equivalent scale.
2. **First 100 paying members** — Proves product-market fit; eliminates the largest single risk flag for any acquirer
3. **Monthly churn below 8%** — Shows retention mechanics (LCT, Intelligence Cards) are working
4. **$50K+ MRR for 3+ months** — Demonstrates repeatable revenue, not a spike
5. **USPTO trademark filings filed** — Signals IP seriousness and increases defensibility
6. **AI Companion usage metrics** — Active AI usage data shows member engagement depth
7. **Enterprise or Operator tier clients** — A single enterprise client at $1,200+/mo dramatically increases B2B credibility`
  }
];

export function registerVaultRoutes(app: Express) {
  app.get("/api/vault/documents", requireAdmin, async (_req, res) => {
    try {
      const docs = await db.select().from(vaultDocuments).orderBy(vaultDocuments.id);
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/vault/documents/:sectionKey", requireAdmin, async (req, res) => {
    try {
      const [doc] = await db
        .select()
        .from(vaultDocuments)
        .where(eq(vaultDocuments.sectionKey, req.params.sectionKey));
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/vault/documents/:sectionKey", requireAdmin, async (req, res) => {
    try {
      const patchSchema = z.object({
        content: z.string().min(1),
        title: z.string().min(1).optional(),
      });
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const updateData: { content: string; title?: string; updatedAt: Date } = {
        content: parsed.data.content,
        updatedAt: new Date(),
      };
      if (parsed.data.title) updateData.title = parsed.data.title;

      const [updated] = await db
        .update(vaultDocuments)
        .set(updateData)
        .where(eq(vaultDocuments.sectionKey, req.params.sectionKey))
        .returning();

      if (!updated) return res.status(404).json({ error: "Document not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/vault/seed", requireAdmin, async (_req, res) => {
    try {
      for (const doc of INITIAL_VAULT_CONTENT) {
        const existing = await db
          .select()
          .from(vaultDocuments)
          .where(eq(vaultDocuments.sectionKey, doc.sectionKey));
        if (existing.length === 0) {
          await db.insert(vaultDocuments).values(doc);
        }
      }
      res.json({ success: true, message: "Vault seeded successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

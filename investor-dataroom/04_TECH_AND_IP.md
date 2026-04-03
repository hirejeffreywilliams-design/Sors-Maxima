# SORS MAXIMA — Technical Architecture & IP Catalog
### STRICTLY CONFIDENTIAL

---

## SECTION 1: SYSTEM ARCHITECTURE

### 1.1 Overview

SORS MAXIMA is a full-stack TypeScript web application with a React frontend and Express.js backend, served on a single unified server. The architecture is monolithic by design for rapid iteration but structured for easy horizontal scaling and microservice extraction.

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React + TypeScript + TailwindCSS + shadcn/ui            │
│  TanStack Query (server state) · Wouter (routing)        │
│  94 page components · 50+ shared components              │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────┐
│                   API LAYER (Express.js)                  │
│  REST API · Server-Sent Events · Stripe Webhooks          │
│  Auth middleware · Rate limiting · Input sanitization     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│               INTELLIGENCE ENGINE LAYER                   │
│  Monte Carlo Engine · Quantum Fusion Engine™              │
│  Overdrive Engine · Monte Carlo Vertical Agent            │
│  Situational Analysis · CLV Tracker                       │
│  AI Analyst (OpenAI GPT-4o) · Pick Explainer             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   DATA LAYER                              │
│  PostgreSQL · The Odds API · ESPN API                     │
│  BallDontLie · API-Football · NHL Stats · MLB Stats       │
│  Stripe · Resend · OpenAI API                             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Backend Module Inventory (131 Files)

**Core Engines (Proprietary Intelligence)**

| Module | Purpose |
|--------|---------|
| `monteCarloEngine.ts` | 51-factor Monte Carlo simulation core |
| `monteCarloVerticalAgent.ts` | Specialist AI agent for simulation queries |
| `overdriveEngine.ts` | 3-wave pre-game simulation cascade (250K/500K/1M+) |
| `overdriveInputBuilder.ts` | Enriched simulation input constructor (all 51 factors) |
| `quantumFusionEngine.ts` | Fusion layer — combines all signals into grade + EV |
| `aiPickExplainer.ts` | GPT-powered pick explanation generator |
| `analystContextBuilder.ts` | Live data context builder for AI Analyst companion |
| `situationalAnalysisEngine.ts` | Trap game, revenge spot, schedule fatigue detection |
| `precomputedPredictionsEngine.ts` | Batch pick generation and storage |
| `pickSnapshotStore.ts` | Track pick value changes over time |
| `signalTranslationLayer.ts` | Reactive pick update and badge system |

**Data Providers**

| Module | Purpose |
|--------|---------|
| `oddsProvider.ts` | The Odds API integration — live multi-book odds |
| `espnProvider.ts` | ESPN data aggregation |
| `api-football-provider.ts` | Soccer league data |
| `ballDontLieProvider.ts` | NBA stats and player data |
| `clvTracker.ts` | Closing Line Value tracking and storage |

**Operations & Intelligence**

| Module | Purpose |
|--------|---------|
| `appGuardianEngine.ts` | Autonomous health monitoring and anomaly detection |
| `appIntelligenceEngine.ts` | Platform-wide intelligence aggregator |
| `autonomousAdminIntelligence.ts` | AI-powered admin assistant engine |
| `analyticsAgentEngine.ts` | User behavior analytics |
| `acquisitionAnalyticsEngine.ts` | Marketing funnel and CAC analytics |
| `acceleratedPatternEngine.ts` | Fast pattern matching for signal detection |
| `retentionEngine.ts` | Smart Retention Sequence™ — lifecycle automation |
| `communityIntegrityEngine.ts` | Fraud and abuse detection |
| `algorithmProtection.ts` | IP protection and obfuscation layer |

**Monetization & Admin**

| Module | Purpose |
|--------|---------|
| `stripeService.ts` | Full Stripe subscription lifecycle management |
| `authService.ts` | Auth, session management, tier enforcement |
| `adminAssistantEngine.ts` | AI-powered internal admin chat |
| `abTestEngine.ts` | A/B experiment management |
| `apiBudgetOptimizer.ts` | OpenAI API cost management |
| `apiKeyManager.ts` | External API key rotation and management |
| `auditTrail.ts` | Full DB-backed pick and action audit log |
| `dbMigrations.ts` | Safe schema migration engine (ALTER TABLE pattern) |

---

## SECTION 2: FRONTEND ARCHITECTURE

### 2.1 Page Inventory (94 Pages)

**User-Facing Pages**

| Page | Route | Description |
|------|-------|-------------|
| Command Center | `/` | Primary intelligence dashboard |
| Daily Parlays | `/daily` | Sport-filtered parlay generator |
| Player Props | `/props` | Multi-book player prop intelligence |
| Odds Center | `/odds` | Multi-book odds comparison hub |
| Live Center | `/live` | Live game intelligence |
| Track Record | `/track-record` | Full pick history and calibration |
| AI Analyst | `/ai-analyst` | Full-page AI companion view |
| Tools | `/tools` | Cashout Advisor, Session Planner, Win Patterns |
| Account | `/account` | Subscription, bankroll, preferences |
| Settings | `/settings` | User configuration |

**Admin Pages (35+ Pages)**

| Page | Route | Description |
|------|-------|-------------|
| Admin Hub | `/admin` | Master control center |
| Financial Projections | `/admin/financial-projections` | Revenue modeling dashboard |
| Owner Playbook | `/admin/owner-playbook` | Launch and growth checklist |
| Revenue Intelligence | `/admin/monetization` | MRR, ARR, tier analytics |
| Growth Analytics | `/admin/growth` | Acquisition funnel |
| User Management | `/admin/users` | User detail, tier control |
| Model Performance | `/admin/model-performance` | Pick accuracy and calibration |
| Learning Metrics | `/admin/learning` | Feedback loop analytics |
| A/B Tests | `/admin/ab-tests` | Experiment management |
| Feature Flags | `/admin/feature-flags` | Controlled rollout |
| Fraud Detection | `/admin/fraud` | Abuse pattern dashboard |
| Community Integrity | `/admin/community-integrity` | Moderation tools |
| API Budget | `/admin/api-budget` | OpenAI cost tracker |
| Data Provenance | `/admin/data-provenance` | Data source integrity |
| Lifecycle Campaigns | `/admin/lifecycle-campaigns` | Retention email management |
| Marketing | `/admin/marketing` | Campaign analytics |
| Acquisitions | `/admin/acquisitions` | User acquisition analysis |
| App Intelligence | `/admin/app-intelligence` | Autonomous health platform |
| App Guardian | `/admin/guardian` | Anomaly alerts |
| Diagnostics | `/admin/diagnostics` | System health |
| Orchestration | `/admin/orchestration` | Engine coordination |
| Model Integrity | `/admin/model-integrity` | Pick accuracy audit |
| IP Registry | `/admin/ip-registry` | Proprietary IP tracking |
| Founders | `/admin/founders` | Founder program management |
| Broadcasts | `/admin/broadcasts` | Platform-wide messages |
| Launch Control | `/admin/launch-control` | Go-live checklist |

---

## SECTION 3: PROPRIETARY IP CATALOG

### 3.1 Named Systems & Proprietary Technology

| Name | Type | Description |
|------|------|-------------|
| **Quantum Fusion Engine™** | Core System | Multi-signal fusion engine combining Monte Carlo, CLV, sharp signals, and situational analysis into a single grade |
| **Monte Carlo Vertical Agent** | AI System | Specialized AI agent for simulation queries — routes automatically from the AI Analyst companion |
| **Pre-Game Overdrive Engine™** | Simulation System | 3-wave cascade simulation system (Wave 1: 250K sims @24h, Wave 2: 500K @12h, Wave 3: 1M+ @2-3h) |
| **Life Changer Ticket™** | Product Feature | AI-assembled high-leg underdog parlay with EV optimization and Kelly sizing |
| **Intelligence Cards™** | Content System | Layered strategy card system (admin-seeded, member-generated, AI-generated) with visual effects |
| **Sors Lexicon™** | Brand System | Proprietary terminology framework replacing generic betting language |
| **Lock & Roll™** | Tool | Progressive Cashout Calculator — models optimal cashout timing |
| **Steam Exit™** | Tool | Line Movement Exit Calculator — models when to exit based on steam |
| **Smart Retention Sequence Engine™** | Operations | Automated lifecycle email sequences triggered by usage signals |
| **SimulationDepthIndicator** | UI Component | Real-time simulation count and tier display (Good/Strong/Elite/Overdrive Elite) |
| **Reliability Diagram** | Analytics Component | SVG confidence-vs-actual-win-rate scatter plot — unique calibration visualization |
| **App Guardian Engine** | Operations | Autonomous platform health monitoring with anomaly detection |

### 3.2 The 51-Factor Model

The simulation engine's 51-factor input model is a core differentiator. Key factor categories:

**Original 46 Factors (Established)**
- Home/away performance splits
- Days of rest differential
- Back-to-back schedule flags
- Travel distance and time zone changes
- Historical head-to-head matchup
- Current win streak momentum
- Key player availability / injury impact
- Starting lineup confirmation status
- Pace differential (sport-specific)
- Pythagorean expectation divergence
- DVOA / RAPM / advanced analytics (sport-specific)
- Market consensus odds vs. model
- Reverse line movement indicators
- Sharp-money percentage signals
- Steam move detection
- Public betting percentage
- Over/under market efficiency signals
- Weather and environmental conditions
- Venue-specific factors
- Referee/umpire historical bias
- Divisional/conference familiarity
- Playoff / elimination game indicators
- Revenge game flags
- Schedule trap detection
- Altitude impact (NBA/NFL)
- Prime-time performance patterns
- *[...and 20 additional statistical factors]*

**5 New AI-Discovered Factors (Tasks #26)**
- **Referee Crew Bias** — Measured foul/penalty rate delta by crew assignment; proportional impact coefficient
- **Player Micro-Matchups** — Per-player positional matchup quality score
- **Coach Tactical Tendencies** — Coaching style (pace/physical/defensive) against opponent profile
- **Sentiment Insider Signal** — Proprietary early-warning composite from insider-adjacent data signals
- **Travel Quality Scoring** — Charter vs. commercial, hotel quality rating impact on performance

### 3.3 Data Architecture IP

| Component | IP Value |
|-----------|----------|
| Pick Snapshot Store | Time-series pick value tracking — enables "value change" badge system |
| Signal Translation Layer | Converts raw simulation outputs into human-readable confidence signals |
| Overdrive DB Schema | Welford moment accumulation across simulation waves — statistically rigorous |
| CLV Computation Model | Custom closing line value algorithm with multi-book normalization |
| Algorithm Protection Layer | Obfuscation and rate limiting to protect engine outputs from scraping |

### 3.4 Brand & Trademark Assets

| Asset | Status |
|-------|--------|
| SORS MAXIMA (brand name) | In use; registrable as trademark |
| Quantum Fusion Engine™ | In use with ™ notation |
| Life Changer Ticket™ | In use with ™ notation |
| Sors Lexicon™ | In use with ™ notation |
| Lock & Roll™ | In use with ™ notation |
| Steam Exit™ | In use with ™ notation |
| Smart Retention Sequence Engine™ | In use with ™ notation |

*Recommendation to owner: File USPTO trademark applications for all ™ marks before listing. Cost: ~$350 per mark via TEAS Plus. This significantly increases IP value in any acquisition.*

### 3.5 Domain & Digital Assets

| Asset | Notes |
|-------|-------|
| Domain | [Owner to confirm domain registered] |
| Social handles | Secure @sorsmaxima on X, Instagram, TikTok |
| GitHub repository | Source code; transfer as part of deal |
| Replit project | Platform currently hosted; easily migrated |

---

## SECTION 4: TECHNOLOGY SCALABILITY ASSESSMENT

### 4.1 Current Capacity

| Dimension | Current Capability |
|-----------|-------------------|
| Concurrent users | 500–2,000 |
| Simulation throughput | 1M sims per game, sequential |
| API request handling | Standard Express + rate limiting |
| Database | PostgreSQL (single node) |
| Data freshness | Live odds: 30–60s refresh via SSE |

### 4.2 Scale-Up Roadmap (for Acquirer Reference)

| Phase | Subscriber Target | Infrastructure Changes | Estimated Cost |
|-------|------------------|----------------------|---------------|
| Phase 1 | 0–1,000 | Current setup (no changes) | $0 |
| Phase 2 | 1,000–5,000 | Migrate DB to RDS, add CDN | $400/mo |
| Phase 3 | 5,000–20,000 | ECS containerization, load balancer, Redis cache | $2,000/mo |
| Phase 4 | 20,000+ | Monte Carlo parallelization (worker threads/microservice), read replicas | $8,000/mo + 6 wks dev |

### 4.3 Migration Effort (Off Replit)

Estimated effort to migrate off Replit to AWS / GCP / Railway:

| Task | Estimated Time |
|------|---------------|
| Containerize Express app (Dockerfile) | 4 hours |
| Set up RDS PostgreSQL + migrate data | 8 hours |
| Configure CI/CD pipeline | 8 hours |
| Update environment variables | 2 hours |
| DNS + SSL | 2 hours |
| **Total migration effort** | **~24 hours** |

---

## SECTION 5: SECURITY ARCHITECTURE

| Layer | Implementation |
|-------|---------------|
| Authentication | Session-based auth with fingerprinting |
| Rate Limiting | Per-IP and per-user request throttling |
| Input Sanitization | Zod schema validation on all API inputs |
| Security Headers | Helmet.js (CSP, HSTS, X-Frame-Options) |
| IP Blocking | Admin-controlled IP blocklist with auto-flagging |
| Payment Security | Stripe handles all card data — PCI compliant by design |
| API Key Management | Server-side only; no keys exposed to client |
| Algorithm Protection | Engine outputs obfuscated; scraping detection |
| Audit Trail | Full DB-backed log of all admin and pick actions |

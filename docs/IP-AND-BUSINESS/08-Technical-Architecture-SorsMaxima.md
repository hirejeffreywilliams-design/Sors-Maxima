# TECHNICAL ARCHITECTURE DOCUMENT

**Title:** Technical Architecture — Sors Maxima Sports Button (46-Factor Quantum Fusion Engine)

**Owner:** Jeffrey W. Williams LLC
**OmniDLOS Holdings Ecosystem**
**Date:** April 4, 2026
**Classification:** CONFIDENTIAL — Owner Eyes Only

© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

## OVERVIEW

The Sors Maxima Sports Button is a comprehensive AI sports intelligence and prediction platform implementing a 46-Factor Quantum Fusion Engine. The platform contains 229,746 lines of production code organized into 60+ specialized server engine modules, a React web client, and a PostgreSQL database layer accessed through Drizzle ORM. The Express.js server hosts all engine logic and serves a comprehensive REST API.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌───────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                  │
│    ┌────────────────────────────────────────────────────────────┐     │
│    │     React Web Application (Vite build)                     │     │
│    │  Dashboard | Picks | Analytics | Trends | Community | Admin│     │
│    └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼────────────────────────────────────────┐
│                          API SERVER LAYER                              │
│                    TypeScript / Express.js                             │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     API Route Handlers                           │ │
│  │  /picks  /games  /analytics  /community  /admin  /auth  /api    │ │
│  └──────────────────────┬───────────────────────────────────────────┘ │
│                         │                                              │
│  ┌──────────────────────▼───────────────────────────────────────────┐ │
│  │               CORE ENGINE LAYER (60+ modules)                   │ │
│  │                                                                  │ │
│  │  ┌────────────────────────┐   ┌──────────────────────────────┐  │ │
│  │  │   QUANTUM FUSION       │   │   LEARNING & CALIBRATION     │  │ │
│  │  │   quantumFusionEngine  │   │   autonomousLearningEngine   │  │ │
│  │  │   bettingMomentumEng   │   │   continuousLearningOrch     │  │ │
│  │  │   confidenceEngine     │   │   calibrationEngine          │  │ │
│  │  │   correlationEngine    │   │   backtestEngine             │  │ │
│  │  │   earlySettlementEng   │   │   abTestEngine               │  │ │
│  │  └────────────────────────┘   └──────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌────────────────────────┐   ┌──────────────────────────────┐  │ │
│  │  │   AI & INTELLIGENCE    │   │   DATA PIPELINE              │  │ │
│  │  │   aiPickExplainer      │   │   espn-scoreboard-provider   │  │ │
│  │  │   analystContextBuilder│   │   espn-injury-provider       │  │ │
│  │  │   analyticsAgentEngine │   │   espn-roster-provider       │  │ │
│  │  │   appIntelligenceEngine│   │   balldontlie-provider       │  │ │
│  │  │   acceleratedPatternEng│   │   api-football-provider      │  │ │
│  │  └────────────────────────┘   │   data-pipeline-health       │  │ │
│  │                                │   api-usage-tracker          │  │ │
│  │  ┌────────────────────────┐   │   apiBudgetOptimizer         │  │ │
│  │  │   ADMIN & OPERATIONS   │   │   apiKeyManager              │  │ │
│  │  │   autonomousAdminInt   │   └──────────────────────────────┘  │ │
│  │  │   adminAssistantEngine │                                      │ │
│  │  │   analyticsEventSvc    │   ┌──────────────────────────────┐  │ │
│  │  │   appGuardianEngine    │   │   COMMUNITY & INTEGRITY      │  │ │
│  │  │   featureRegistryEng   │   │   communityIntegrityEngine   │  │ │
│  │  └────────────────────────┘   │   communityLossPatternEngine │  │ │
│  │                                │   communityService           │  │ │
│  │  ┌────────────────────────┐   │   algorithmProtection        │  │ │
│  │  │   ANALYTICS & REPORTING│   │   auditTrail                 │  │ │
│  │  │   analyticsDashboardEng│   └──────────────────────────────┘  │ │
│  │  │   acquisitionAnalytics │                                      │ │
│  │  │   aiUsageService       │                                      │ │
│  │  │   aiErrorTracker       │                                      │ │
│  │  └────────────────────────┘                                      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────────┐
│                          DATA LAYER                                    │
│              PostgreSQL 15 + Drizzle ORM                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  Games &     │ │  Picks &     │ │  User &      │ │  Analytics & │ │
│  │  Schedules   │ │  Predictions │ │  Community   │ │  Calibration │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## TECHNOLOGY STACK

### Backend

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20+ LTS | Server runtime |
| Language | TypeScript | 5.x | Type-safe server code |
| Web Framework | Express.js | 4.x | API server framework |
| ORM | Drizzle ORM | Latest | Type-safe PostgreSQL access |
| Database | PostgreSQL | 15+ | Primary data store |
| AI Integration | OpenAI API | GPT-4 | AI Pick Explainer text generation |
| Authentication | JWT | Standard | User session management |
| Scheduling | Node cron | Standard | Monte Carlo simulation scheduling |
| Email | Custom emailService.ts | — | User notifications |

### Frontend

| Component | Technology | Purpose |
|---|---|---|
| Framework | React | Web client application |
| Build Tool | Vite | Fast development and production builds |
| Language | TypeScript | Type-safe component code |
| Styling | CSS/Tailwind | Component styling |
| State Management | React Query + hooks | Server state management |

---

## ENGINE MODULE CATALOG

### Core Prediction Engines

**quantumFusionEngine.ts** — The central prediction engine. Implements the 46-factor computation pipeline, factor interaction modeling, sport-specific weight application, graceful degradation for unavailable factors, Monte Carlo integration, and composite prediction score generation.

**bettingMomentumEngine.ts** — Tracks real-time line movement velocity, direction, and momentum. Provides the Line Movement (Factor 4), Momentum Score (Factor 5), and Early/Late Money (Factors 43-44) inputs to the Quantum Fusion Engine.

**confidenceEngine.ts** — Integrates raw Quantum Fusion Engine scores with Monte Carlo probability estimates and calibration adjustments to produce calibrated confidence percentages and confidence tier classifications.

**correlationEngine.ts** — Analyzes historical correlations between prediction factors to identify high-value factor interaction pairs and implements interaction term computation for the Quantum Fusion Engine's factor interaction modeling.

**earlySettlementEngine.ts** — Detects when game outcomes can be predicted with high confidence early in the game (for live betting applications) and triggers early settlement signals.

### Learning and Calibration Engines

**autonomousLearningEngine.ts** — Core autonomous model improvement system. Retrieves settled pick records, performs factor contribution attribution analysis, computes error signals, updates sport-specific factor weights, and monitors Brier Score trends.

**continuousLearningOrchestrator.ts** — Manages the complete learning lifecycle. Schedules Monte Carlo simulation runs (10K real-time, 10K morning, 100K nightly), coordinates the Autonomous Learning Engine's weight update cycles, and manages ML model retraining jobs.

**calibrationEngine.ts** — Computes Brier Score calibration metrics over rolling evaluation windows. Generates calibration reports comparing prediction confidence percentages to actual win rates across confidence bins. Triggers automatic recalibration when Brier Score exceeds degradation threshold (>0.30).

**backtestEngine.ts** — Retrospectively applies current Quantum Fusion Engine parameters to historical game data. Generates backtest performance reports including win rate, ROI, and Brier Score for the backtested period. Enables validation of new factor configurations before production deployment.

**abTestEngine.ts** — Manages simultaneous testing of alternative Quantum Fusion Engine factor weight configurations. Implements random game assignment to A/B variants, collects variant performance metrics, applies statistical significance testing, and promotes superior variants to production.

### AI and Intelligence Engines

**aiPickExplainer.ts** — Generates natural language explanations for each Quantum Fusion Engine prediction. Identifies top-weighted factors, describes their directional contributions, summarizes market dynamics context, and produces the human-readable pick narrative displayed to users.

**analystContextBuilder.ts** — Constructs contextual analysis packages for each game comprising team situation narratives, recent form summaries, injury context, and historical H2H analysis, providing contextual depth for the AI Pick Explainer.

**analyticsAgentEngine.ts** — An AI agent that monitors platform-wide prediction performance trends, identifies systematic prediction biases by sport or game type, and generates analytical insights for administrative review.

**appIntelligenceEngine.ts** — Monitors overall platform health, user engagement patterns, and prediction performance trends. Generates intelligence reports for the administrative dashboard.

**acceleratedPatternEngine.ts** — High-velocity pattern recognition against the full historical picks database. Identifies situational patterns, market patterns, and team tendency patterns with statistical significance scoring. Filters patterns by minimum significance thresholds before incorporating into the Quantum Fusion Engine.

### Data Pipeline Modules

**espn-scoreboard-provider.ts** — Real-time game score ingestion from ESPN's Scoreboard API. Refresh interval: 60 seconds. Provides live game state for Factor 6 (Situational Spot) and real-time updates during active games.

**espn-injury-provider.ts** — Player injury status ingestion from ESPN's injury reporting API. Refresh interval: 15 minutes. Provides injury data for Factor 28 (Injury Impact), Factor 29 (Load Management), and Factor 31 (Roster Depth).

**espn-roster-provider.ts** — Team roster composition ingestion from ESPN's roster API. Refresh interval: 6 hours. Provides roster depth data for Factor 31 and player identification for efficiency calculations.

**balldontlie-provider.ts** — NBA player statistics ingestion from BallDontLie API. On-demand refresh for player efficiency calculations (Factor 14 — Player Efficiency) and True Shooting percentage (Factor 32).

**api-football-provider.ts** — Soccer statistics ingestion from API-Football. Covers EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, and UEFA Champions League. Provides all soccer-specific factor data.

**data-pipeline-health.ts** — Continuous health monitoring for all data provider modules. Tracks availability, latency, data freshness, schema validation pass rates, and API quota consumption. Dashboard at `/admin/pipeline`.

**api-usage-tracker.ts** — Tracks external API call volumes and costs across all providers.

**apiBudgetOptimizer.ts** — Optimizes API call scheduling to minimize costs while maintaining required data freshness for each factor. Implements intelligent caching to reduce redundant API calls.

**apiKeyManager.ts** — Manages API credentials for all external data providers. Implements key rotation, rate limit monitoring, and automatic failover to backup keys.

### Community and Integrity Modules

**communityIntegrityEngine.ts** — Monitors community prediction features for manipulation. Detects coordinated pick copying, leaderboard manipulation, and systematic gaming of community integrity scoring systems.

**communityLossPatternEngine.ts** — Analyzes community prediction patterns to identify systematic biases (the crowd's consistent wrong-way lean on certain bet types or game scenarios). Generates contrarian signals from identified community biases.

**communityService.ts** — Core community feature management: user pick submissions, community consensus tracking, tailing system, and community leaderboard management.

**algorithmProtection.ts** — Implements protection against reverse-engineering of the Quantum Fusion Engine's factor weights. Rate limiting, response noise injection, anomalous request detection, and audit logging of API access patterns.

**auditTrail.ts** — Maintains a comprehensive, tamper-evident audit log of all prediction generations, factor weight states at generation time, outcome settlements, and system configuration changes.

### Administrative Intelligence Modules

**autonomousAdminIntelligence.ts** — An AI-powered administrative intelligence system that monitors all platform metrics, identifies anomalies, generates automated recommendations for system improvements, and provides real-time platform health intelligence.

**adminAssistantEngine.ts** — Natural language interface for administrative operations. Enables administrators to query platform performance, trigger recalibrations, review factor weight configurations, and manage system settings through conversational AI commands.

**analyticsDashboardEngine.ts** — Powers the administrative analytics dashboard. Computes and serves platform KPIs including win rate by sport, confidence tier performance, user engagement, and revenue metrics.

**acquisitionAnalyticsEngine.ts** — Tracks user acquisition performance including CAC by channel, conversion rates, retention cohorts, and lifetime value estimates.

**analyticsEventService.ts** — Client-side event tracking service recording user interactions for product analytics and behavioral analysis.

**featureFlags.ts / featureRegistryEngine.ts** — Feature flag management enabling gradual rollout of new features, A/B testing of product changes, and tier-gated feature access.

**appGuardianEngine.ts** — System health monitoring and automated alerting. Monitors CPU, memory, database connections, API latency, and error rates. Triggers automated alerts when metrics exceed configured thresholds.

---

## DATABASE SCHEMA — CORE TABLES

### Games Table

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(50) NOT NULL,
  league VARCHAR(100),
  home_team VARCHAR(200) NOT NULL,
  away_team VARCHAR(200) NOT NULL,
  game_time TIMESTAMPTZ NOT NULL,
  venue VARCHAR(300),
  surface_type VARCHAR(50),
  weather_conditions JSONB,
  altitude_adjustment BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, live, completed, cancelled
  final_score_home SMALLINT,
  final_score_away SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Quantum Fusion Picks Table

```sql
CREATE TABLE quantum_fusion_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  composite_score DECIMAL(5,4),
  confidence_percentage DECIMAL(5,2),
  confidence_tier VARCHAR(50),  -- high, medium, low, speculative
  predicted_winner VARCHAR(200),
  predicted_cover BOOLEAN,
  predicted_total_direction VARCHAR(10),  -- over, under
  monte_carlo_probability DECIMAL(5,4),
  monte_carlo_simulations INTEGER,
  factor_scores JSONB,     -- all 46 factor scores at generation time
  factor_weights JSONB,    -- all 46 factor weights at generation time
  available_factors INTEGER,   -- count of factors with data (may be <46)
  ai_explanation TEXT,
  top_factors JSONB,
  market_dynamics_summary JSONB,
  sport VARCHAR(50),
  settlement_status VARCHAR(50) DEFAULT 'pending',  -- pending, won, lost, push
  settled_at TIMESTAMPTZ,
  actual_outcome VARCHAR(50)
);
```

### Factor Weight History Table

```sql
CREATE TABLE factor_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(50) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  factor_weights JSONB NOT NULL,   -- all 46 weights for this sport
  brier_score DECIMAL(6,5),
  win_rate DECIMAL(5,4),
  sample_size INTEGER,
  update_trigger VARCHAR(100),    -- 'autonomous_learning', 'manual', 'recalibration'
  notes TEXT
);
```

### Calibration Metrics Table

```sql
CREATE TABLE calibration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(50),
  evaluation_date DATE,
  brier_score DECIMAL(6,5),
  win_rate_60_70pct_confidence DECIMAL(5,4),
  win_rate_70_80pct_confidence DECIMAL(5,4),
  win_rate_80_90pct_confidence DECIMAL(5,4),
  win_rate_90plus_confidence DECIMAL(5,4),
  total_picks_evaluated INTEGER,
  rolling_window_days INTEGER,
  calibration_status VARCHAR(50)  -- excellent, good, average, poor, recalibrating
);
```

### Monte Carlo Simulation Results Table

```sql
CREATE TABLE monte_carlo_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  simulation_type VARCHAR(50),    -- standard, morning, nightly_deep
  simulations_run INTEGER,
  run_completed_at TIMESTAMPTZ,
  home_win_probability DECIMAL(5,4),
  away_win_probability DECIMAL(5,4),
  push_probability DECIMAL(5,4),
  home_cover_probability DECIMAL(5,4),
  over_probability DECIMAL(5,4),
  score_distribution JSONB,
  margin_distribution JSONB
);
```

---

## 46-FACTOR DATA PIPELINE MAPPING

| Factor | Factor Name | Primary Data Source | Data Type | Refresh |
|---|---|---|---|---|
| 1 | Scheme Mismatch | ESPN + Custom analysis | Categorical | Pre-game |
| 2 | Sharp Money Flow | The Odds API + momentum engine | Percentage | 5 min |
| 3 | Public Fade | The Odds API | Percentage | 5 min |
| 4 | Line Movement | The Odds API | Decimal (odds) | 5 min |
| 5 | Momentum Score | ESPN + Historical | Computed | Daily |
| 6 | Situational Spot | Custom schedule analysis | Categorical | Daily |
| 7 | Historical H2H | Historical DB | Percentage | Per-season |
| 8 | Rest Advantage | ESPN schedule | Integer (days) | 6 hours |
| 9 | Home Field | Historical DB + venue data | Decimal | Per-season |
| 10 | Monte Carlo | Monte Carlo engine | Probability | 5 min |
| 11 | Home/Road Split | Historical DB | Percentage | Daily |
| 12 | Market Implied Edge | The Odds API + model | Decimal | 5 min |
| 13 | Predictive Model | ML model ensemble | Probability | Daily |
| 14 | Player Efficiency | BallDontLie / MLB Stats | Rating | On-demand |
| 15 | Pace/Tempo | BallDontLie / custom | Decimal | Daily |
| 16 | Clutch Index | Historical DB | Percentage | Per-season |
| 17 | Strength of Schedule | Historical DB | Rating | Daily |
| 18 | Point Differential | Historical DB | Decimal | Daily |
| 19 | Win Probability | ML model | Probability | Daily |
| 20 | Scoring Efficiency Gap | Historical + BallDontLie | Decimal | Daily |
| 21 | Recent Form | Historical DB | Decimal | Daily |
| 22 | Mental State | Custom analysis | Categorical | Daily |
| 23 | Confidence Index | Historical DB | Decimal | Daily |
| 24 | Pressure Response | Historical DB | Percentage | Per-season |
| 25 | Motivation Level | Schedule context | Categorical | Daily |
| 26 | Team Chemistry | Roster API + transaction data | Decimal | Weekly |
| 27 | Rivalry Intensity | Historical DB | Decimal | Per-matchup |
| 28 | Injury Impact | ESPN injuries | Severity score | 15 min |
| 29 | Load Management | ESPN injuries + rosters | Boolean + score | 15 min |
| 30 | Travel Fatigue | Schedule + geography | Distance/zones | Daily |
| 31 | Roster Depth | ESPN rosters | Quality score | 6 hours |
| 32 | True Shooting % | BallDontLie (NBA) | Percentage | Daily |
| 33 | Weather Impact | Open-Meteo | Multi-factor | 30 min |
| 34 | Altitude | Venue data | Boolean + adj | Static |
| 35 | Surface Type | Venue data | Categorical | Static |
| 36 | Game Time | Schedule data | Categorical | Static |
| 37 | Market Efficiency | The Odds API + analysis | Decimal | Daily |
| 38 | Bookmaker Consensus | The Odds API | Decimal | 5 min |
| 39 | CLV Projection | The Odds API + model | Decimal | 5 min |
| 40 | Steam Detection | Betting momentum engine | Boolean + score | 5 min |
| 41 | Reverse Line Movement | Betting momentum engine | Boolean + score | 5 min |
| 42 | Market Maker Position | The Odds API + analysis | Inferred | 5 min |
| 43 | Early Money | The Odds API + history | Direction | Static (game open) |
| 44 | Late Money | The Odds API + momentum | Direction + score | 5 min |
| 45 | Referee Tendency | Historical DB | Decimal | Per-official |
| 46 | Scheduling Equity | Schedule analysis | Boolean + score | Daily |

---

## MONTE CARLO ENGINE SCHEDULING

```
┌─────────────────────────────────────────────────────┐
│              MONTE CARLO SCHEDULE                    │
│                                                     │
│  7:00 AM ET Daily    ──►  Morning Pre-Game Run      │
│  (10,000 simulations per next-24h game)             │
│                                                     │
│  Every 5 minutes     ──►  Real-Time Update Run      │
│  (during active games, 10,000 sims per game)        │
│                                                     │
│  12:00 AM ET Daily   ──►  Nightly Deep Sim Run      │
│  (100,000 simulations per next-day game)            │
└─────────────────────────────────────────────────────┘
```

---

## SECURITY ARCHITECTURE

- JWT authentication with 15-minute access tokens and 7-day refresh tokens
- Rate limiting per API endpoint (configurable by tier)
- Algorithm protection via response noise injection for prediction API calls
- HTTPS/TLS 1.3 for all client-server communication
- Database connection pooling with max connection limits
- Audit trail for all administrative actions and prediction API access
- Environment variables for all API keys (never in codebase)

---

## ADMINISTRATIVE INTERFACE

Key administrative routes:

| Route | Function |
|---|---|
| `/admin/pipeline` | Real-time data provider health status |
| `/admin/training` | Trigger manual model recalibration |
| `/admin/model-integrity` | Brier Score calibration dashboard |
| `/admin/sport-analysis` | Sport-specific factor weight configuration |
| `/admin/a-b-tests` | A/B test management and results |
| `/admin/backtest` | Backtest engine interface |
| `/admin/community` | Community integrity monitoring |
| `/admin/algorithm-protection` | API probe detection and rate limit management |
| `/admin/picks` | Pick history, settlement, and performance |
| `/admin/data-provenance` | Data source attribution for each factor |

---

*© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.*
*CONFIDENTIAL — Owner Eyes Only*
*OmniDLOS Holdings Ecosystem*

# SORS MAXIMA — Complete Platform Overview & Business Plan

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Market Opportunity](#3-market-opportunity)
4. [Platform Architecture](#4-platform-architecture)
5. [Feature Inventory](#5-feature-inventory)
6. [Data Infrastructure](#6-data-infrastructure)
7. [Revenue Model & Pricing](#7-revenue-model--pricing)
8. [Go-To-Market Strategy](#8-go-to-market-strategy)
9. [Competitive Analysis](#9-competitive-analysis)
10. [Growth Strategy](#10-growth-strategy)
11. [Financial Projections](#11-financial-projections)
12. [Operational Roadmap](#12-operational-roadmap)
13. [Risk Analysis & Mitigation](#13-risk-analysis--mitigation)
14. [Team & Organizational Needs](#14-team--organizational-needs)
15. [Key Metrics & KPIs](#15-key-metrics--kpis)
16. [Legal & Compliance](#16-legal--compliance)
17. [Technical Specifications](#17-technical-specifications)

---

## 1. EXECUTIVE SUMMARY

**Company Name:** Sors Maxima
**Tagline:** "Intelligence. Edge. Victory."
**Category:** Sports Betting Intelligence & Analytics SaaS

**What It Is:**
Sors Maxima is a members-only sports betting intelligence platform that gives bettors a data-driven competitive edge. It ingests real-time data from ESPN, The Odds API, Open-Meteo Weather, and API-Football to deliver actionable betting intelligence — automated pick generation, odds comparison across 6+ sportsbooks, expected value analysis, parlay optimization, and live game monitoring — all powered by a 46-factor Quantum Fusion prediction engine with continuous machine learning.

**The Problem:**
- The average sports bettor loses money because they rely on gut feel, popular opinion, and incomplete information
- Existing tools are fragmented: odds on one site, injury reports on another, weather on another
- No platform unifies ALL relevant data into actionable, confidence-scored recommendations
- Professional-grade analytics are locked behind expensive, institutional-only services

**The Solution:**
A unified intelligence platform that does the work of an entire analytics team — aggregating data from 5+ sources every 60 seconds, running 46-factor analysis on every game, and delivering clear, graded recommendations (A through D) with expected value calculations, optimal stake sizing, and risk-adjusted confidence scores.

**Key Differentiators:**
1. Real-time data only — zero mock data, zero hardcoded values
2. 46-factor Quantum Fusion Engine with continuous machine learning
3. Multi-bookmaker odds comparison (DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers)
4. Automated parlay construction with correlation awareness
5. Live SSE streaming for instant score/odds/alert updates
6. Full transparency — every prediction shows its data sources and confidence breakdown

**Revenue Model:** Three-tier SaaS subscription ($49/$99/$249 per month) with 7-day free trial

**Target Market:** 45+ million active sports bettors in the United States

---

## 2. PRODUCT OVERVIEW

### 2.1 Core Value Proposition

Sors Maxima answers one question for every bettor: **"What should I bet on right now, and why?"**

Instead of spending hours researching games, comparing odds, checking injuries, and crunching numbers, users open the Command Center and see:
- Top picks ranked by confidence and expected value
- Live games with real-time momentum tracking
- Edge alerts when lines move or sharp money hits
- Automated parlay suggestions optimized for correlation and value

### 2.2 Sports Covered

| Sport | League | Season Coverage | Data Sources |
|-------|--------|----------------|--------------|
| Basketball | NBA | Oct - Jun | ESPN + Odds API |
| Basketball | NCAAB | Nov - Apr | ESPN + Odds API |
| Football | NFL | Sep - Feb | ESPN + Odds API + Weather |
| Football | NCAAF | Aug - Jan | ESPN + Odds API + Weather |
| Baseball | MLB | Mar - Oct | ESPN + Odds API + Weather |
| Hockey | NHL | Oct - Jun | ESPN + Odds API |
| Soccer | EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, UCL | Year-round | API-Football + ESPN + Odds API |

### 2.3 User Experience Flow

```
Sign Up → 7-Day Free Trial (Pro Access) → Command Center
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              View Top Picks           Watch Live Games         Get Edge Alerts
                    │                         │                         │
              Build Parlay            Subscribe to Game         Act on Alert
                    │                         │                         │
            Review Confidence         Get Score Notifications    Place Bet
                    │                         │                         │
            Export to Sportsbook      Track Parlay Watch         Track Result
```

---

## 3. MARKET OPPORTUNITY

### 3.1 Market Size

| Metric | Value | Source |
|--------|-------|--------|
| US Sports Betting Market (2024) | $10.9 billion | American Gaming Association |
| Projected US Market (2028) | $22+ billion | Grand View Research |
| CAGR | 15-20% | Multiple sources |
| Active US Sports Bettors | 45+ million | AGA Survey |
| States with Legal Betting | 38+ states | As of 2024 |
| Average Monthly Spend per Bettor | $150-$300 | Industry estimates |

### 3.2 Target Segments

**Primary: "The Informed Bettor" (60% of focus)**
- Ages 25-45, mostly male, tech-savvy
- Bets 3-5 times per week
- Currently uses 2-3 different tools/sites
- Willing to pay for an edge
- Annual betting volume: $5,000-$50,000

**Secondary: "The Casual Optimizer" (25% of focus)**
- Ages 21-35, social bettor
- Bets on weekends and big games
- Wants guidance, not complexity
- Price-sensitive, needs value proof
- Annual betting volume: $500-$5,000

**Tertiary: "The Professional" (15% of focus)**
- Full-time or semi-pro bettors
- Needs advanced tools, APIs, custom models
- Willing to pay premium ($249+/mo)
- Values speed, data depth, and customization
- Annual betting volume: $50,000+

### 3.3 Market Trends Favoring Sors Maxima

1. **State-by-state legalization** continues to expand the addressable market
2. **Parlay popularity** is exploding — sportsbooks aggressively push parlays (higher margins for them, worse odds for bettors)
3. **Data literacy** among bettors is increasing — they want tools, not tips
4. **Subscription fatigue** for bad tools creates opportunity for a premium, unified solution
5. **AI/ML adoption** in sports analytics is mainstream — bettors expect data-driven insights

---

## 4. PLATFORM ARCHITECTURE

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│  ESPN Scoreboard · The Odds API · Open-Meteo · API-Football     │
│  ESPN Injuries · ESPN Rosters                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (60-second cycle)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  UNIFIED INTELLIGENCE HUB                        │
│  Central data aggregation layer — single source of truth         │
│  Produces UnifiedSnapshot per sport every 60 seconds             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Quantum     │  │  Precomputed │  │  Market      │
│  Fusion      │  │  Predictions │  │  Snapshot    │
│  Engine      │  │  Engine      │  │  Engine      │
│  (46 factors)│  │  (5-min cycle)│  │  (3-min cache)│
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────────┬┘─────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE FEED API                          │
│  GET /api/intelligence/feed                                      │
│  Top Picks · Live Games · Edge Alerts · Sport Summaries          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SSE Live    │  │  Notification│  │  REST API    │
│  Stream      │  │  Engine      │  │  Endpoints   │
│  (real-time) │  │  (30s cycle) │  │  (on-demand) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────────┬┘─────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                               │
│  Command Center · Daily Picks · Parlay Builder · Live Center     │
│  Odds Center · Pro Tools · Insights · Notifications              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | UI rendering |
| UI Components | shadcn/ui + TailwindCSS | Design system |
| State Management | TanStack Query v5 | Server state, caching, auto-refresh |
| Routing | Wouter | Client-side navigation |
| Backend Framework | Express.js + TypeScript | API server |
| Database | PostgreSQL | Persistent storage |
| ORM | Drizzle ORM | Database queries |
| Validation | Zod + drizzle-zod | Schema validation |
| Payments | Stripe | Subscriptions & billing |
| Real-Time | Server-Sent Events (SSE) | Live data streaming |
| AI/ML | OpenAI API | AI assistant, diagnostics |
| Hosting | Replit | Cloud deployment |

### 4.3 Backend Engine Inventory

The platform runs **51 backend engines and services**, including:

| Engine | Cycle | Purpose |
|--------|-------|---------|
| Unified Intelligence Hub | 60 seconds | Central data aggregation |
| Continuous Learning Engine | 1 second | Statistical model updates |
| Analytics Agent | 15 seconds | Real-time market analysis |
| Precomputed Predictions | 5 minutes | Pre-generated picks for all sports |
| Notification Engine | 30 seconds | Game monitoring & alerts |
| App Guardian | 30 seconds | Health monitoring & auto-healing |
| Learning Orchestrator | 5 min / 24 hr | Auto-settlement, retraining, calibration |
| Quantum Fusion Engine | On-demand | 46-factor prediction scoring |
| Market Snapshot Engine | 3-minute cache | Multi-bookmaker odds analysis |
| Vegas Engine | On-demand | Historical analytics predictions |
| SSE Manager | Event-driven | Real-time data broadcasting |
| Ticket Intelligence | On-demand | Correlation & grading analysis |
| Prediction Pipeline | On-demand | 12-stage prediction lifecycle |

---

## 5. FEATURE INVENTORY

### 5.1 User-Facing Features (34 Pages)

#### Intelligence Hub
| Feature | Route | Description |
|---------|-------|-------------|
| Command Center | `/` | Main dashboard — top picks, live games, edge alerts, opportunity score |
| Daily Picks | `/daily` | Pre-generated predictions for all 6 sports, graded A-D |
| Personalized Insights | `/insights` | Betting DNA profile, win rates, ROI trends, recommendations |
| Live Center | `/live` | Real-time game monitoring with momentum indicators |
| Smart Generator | `/generate` | Automated ticket generation with confidence scores |

#### Parlay Building
| Feature | Route | Description |
|---------|-------|-------------|
| Visual Parlay Builder | `/builder` | Drag-and-drop parlay construction |
| Prop Parlay Builder | `/prop-parlay-builder` | Player prop-focused parlays |
| Same-Game Parlay (SGP) | `/sgp` | Single-game multi-leg builder |
| Teaser Generator | `/teasers` | Point-adjusted teaser builder |
| Round Robin | `/round-robin` | Round robin combination generator |
| Straight Bets | `/straight-bets` | Single bet analysis and placement |

#### Analysis Tools
| Feature | Route | Description |
|---------|-------|-------------|
| Odds Center | `/odds-center` | Multi-bookmaker odds comparison |
| Line Movement | `/line-movement` | Historical line movement tracking |
| EV Heatmap | `/ev-heatmap` | Expected value visualization |
| Power Rankings | `/power-rankings` | Data-driven team rankings |
| Pro Tools | `/pro-tools` | Advanced analytics suite |
| Rosters & Injuries | `/rosters` | Team roster and injury data |

#### Account & Community
| Feature | Route | Description |
|---------|-------|-------------|
| Bankroll Manager | `/bankroll` | Track and manage betting bankroll |
| Bet History | `/ticket-history` | Historical bet tracking and analysis |
| Betting Profile | `/betting-profile` | Personal betting statistics |
| Watchlist | `/watchlist` | Favorite teams and games |
| Community | `/community` | Social features and leaderboards |
| Tipster Communities | `/tipster-communities` | Follow expert bettors |
| Shared Tickets | `/shared-tickets` | Share and view community tickets |
| Rewards | `/rewards` | Loyalty and referral rewards |
| Profile | `/profile` | Account settings |
| Settings | `/settings` | App preferences |
| Onboarding | `/onboarding` | First-time user walkthrough |

### 5.2 Admin Dashboard (26 Admin Pages)

| Feature | Route | Description |
|---------|-------|-------------|
| Admin Dashboard | `/admin` | Operational overview |
| System Diagnostics | `/admin/diagnostics` | Server health and metrics |
| Marketing Dashboard | `/admin/marketing` | Campaign management |
| Security Center | `/admin/security` | Security monitoring |
| Growth Analytics | `/admin/growth` | User growth metrics |
| Feature Flags | `/admin/feature-flags` | Feature rollout control |
| Model Performance | `/admin/model-performance` | Prediction accuracy tracking |
| Data Provenance | `/admin/data-provenance` | Data source auditing |
| Risk Register | `/admin/risk-register` | Risk management |
| Financial Projections | `/admin/financial-projections` | Revenue forecasting |
| User Health | `/admin/user-health` | User engagement monitoring |
| Support Dashboard | `/admin/support` | Customer support management |
| Fraud Detection | `/admin/fraud` | Fraud monitoring and prevention |
| A/B Testing | `/admin/ab-tests` | Experiment management |
| Lifecycle Campaigns | `/admin/lifecycle-campaigns` | Automated campaigns |
| User Segmentation | `/admin/segmentation` | Behavioral segmentation |
| Promotional Offers | `/admin/promos` | Offer management |
| Acquisition Analytics | `/admin/acquisition` | Funnel analytics |
| Analytics Dashboard | `/admin/analytics-dashboard` | Platform analytics |
| System Orchestration | `/admin/orchestration` | Engine management |
| AI Assistant | `/admin/assistant` | AI-powered admin reports |
| App Guardian | `/admin/guardian` | System health monitoring |
| Training Center | `/admin/training` | Model training management |
| Prediction Pipeline | `/admin/pipeline` | Pipeline monitoring |
| Sport Factor Analysis | `/admin/sport-analysis` | Factor performance analysis |
| Correlation Matrix | `/admin/correlation-matrix` | Factor correlation visualization |

### 5.3 Real-Time Features

| Feature | Technology | Update Frequency |
|---------|-----------|-----------------|
| Live Scores | SSE + ESPN | 60 seconds |
| Odds Updates | SSE + Odds API | 5 minutes |
| Edge Alerts | SSE + Hub | 60 seconds |
| Score Change Notifications | Notification Engine | 30 seconds |
| Game Start Alerts | Notification Engine | 30 seconds |
| Parlay Watch Tracking | Notification Engine | 30 seconds |
| Connection Status | SSE Heartbeat | Continuous |

---

## 6. DATA INFRASTRUCTURE

### 6.1 External Data Sources

| Source | Type | Endpoints | Cost | Refresh Rate |
|--------|------|-----------|------|-------------|
| ESPN Scoreboard | Live scores, schedules, odds | 6 sport endpoints | Free | 60 seconds (live), 5 min (pre) |
| ESPN Injuries | Player injury reports | 6 sport endpoints | Free | 15 minutes |
| ESPN Rosters | Team rosters, player data | Teams + per-team roster | Free | 6 hours |
| The Odds API | Multi-bookmaker odds | Sports + Events + Props | Freemium (500 req/mo free) | 5 minutes |
| Open-Meteo | Weather forecasts | Forecast endpoint | Free | 30 minutes |
| API-Football | Soccer fixtures & data | Fixtures endpoint | Freemium | 5 minutes |
| OpenAI | AI analysis & diagnostics | Chat completions | Pay-per-use | On-demand |

### 6.2 Internal Data Pipeline

```
Data Sources → Unified Hub (60s) → Snapshot Cache → Analysis Engines → Intelligence Feed → SSE → Frontend
```

**Data freshness guarantees:**
- Live game scores: Updated every 60 seconds
- Betting odds: Updated every 5 minutes
- Injury reports: Updated every 15 minutes
- Weather data: Updated every 30 minutes
- Predictions: Regenerated every 5 minutes
- Model weights: Retrained every 24 hours

### 6.3 Machine Learning Pipeline

```
Historical ESPN Data (45 days, 6 sports)
        │
        ▼
  Feature Extraction (17 training factors)
        │
        ▼
  Weight Training (blended: 30% old + 70% new)
        │
        ▼
  Quantum Fusion Engine (46 factors, 7 categories)
        │
        ▼
  Prediction Generation (confidence + EV + Kelly)
        │
        ▼
  Auto-Settlement (ESPN outcomes comparison)
        │
        ▼
  Calibration Check (drift detection > 15%)
        │
        ▼
  Retraining Trigger (if needed)
```

**Factor Categories (46 total):**
1. Core Betting (odds, spreads, totals)
2. Advanced Analytics (pace, efficiency, ratings)
3. Psychological (momentum, rivalry, rest days)
4. Physical (injuries, travel, altitude)
5. Technology (model confidence, historical accuracy)
6. Environmental (weather, venue, crowd)
7. Financial (line value, sharp money, public %)

---

## 7. REVENUE MODEL & PRICING

### 7.1 Subscription Tiers

| Tier | Name | Monthly | Yearly (20% off) | AI Credits/Day |
|------|------|---------|-------------------|---------------|
| Free | Starter | $0 | $0 | 5 |
| Pro | Sharp | $49 | $468/yr ($39/mo) | 50 |
| Elite | Edge | $99 | $948/yr ($79/mo) | 300 |
| Whale | Max | $249 | $2,388/yr ($199/mo) | Unlimited |

### 7.2 Feature Gating by Tier

| Feature | Free | Sharp ($49) | Edge ($99) | Max ($249) |
|---------|------|-------------|------------|------------|
| Command Center | Limited | Full | Full | Full |
| Daily Picks | 2/day | 25/day | Unlimited | Unlimited |
| 46-Factor Engine | Basic | Full | Full | Full + Custom Weights |
| +EV Finder | No | Yes | Yes | Yes |
| Bet Grading (A-F) | No | Yes | Yes | Yes |
| ROI Dashboard | No | Yes | Yes | Yes |
| Paper Trading | No | Yes | Yes | Yes |
| AI Betting Assistant | No | No | Unlimited | Unlimited |
| ML Prop Projections | No | No | Yes | Yes |
| Line Movement Alerts | No | No | Real-time | Real-time |
| SGP Optimizer | No | No | Yes | Yes |
| Arbitrage Scanner | No | No | Yes | Yes |
| Correlation Engine | No | No | Yes | Yes |
| Multi-Book Bankroll | No | No | Yes | Yes |
| Deep-Scan Analysis | No | No | No | 2x depth |
| Custom Model Builder | No | No | No | Yes |
| Hedge Calculator | No | No | No | Yes |
| Monte Carlo Bankroll Sim | No | No | No | Yes |
| Export to Sportsbooks | No | No | No | 6 books |
| Pattern Recognition | No | No | No | Yes |
| CLV Tracking | No | No | No | Yes |
| Priority Processing | No | No | No | Yes |
| Early Access / Beta | No | No | No | Yes |
| Tax Export Reports | No | No | No | Yes |

### 7.3 Revenue Streams

**Primary:** Subscription revenue (90% of projected revenue)

**Secondary:**
- **Affiliate Partnerships** (sportsbook referrals): $50-$200 CPA per new depositor
- **Data Licensing** (anonymized, aggregated betting patterns): Enterprise tier
- **Premium Content** (expert analysis, video breakdowns): Add-on content packs
- **API Access** (for advanced users/developers): Enterprise tier

### 7.4 Trial & Conversion Strategy

- **7-day free trial** with Pro (Sharp) tier access
- No credit card required to start trial
- In-app upsell prompts when users hit feature gates
- Automated email campaigns during trial:
  - Day 1: Welcome + quick-start guide
  - Day 3: "Here's what you've found so far" personalized insights
  - Day 5: "2 days left" with best picks they would have hit
  - Day 7: Conversion offer with annual discount

---

## 8. GO-TO-MARKET STRATEGY

### 8.1 Launch Phases

**Phase 1: Closed Beta (Months 1-2)**
- 500 invited users from sports betting communities
- Focus on core features: Command Center, Daily Picks, Parlay Builder
- Collect feedback, fix issues, validate value proposition
- Goal: 60%+ trial-to-paid conversion rate

**Phase 2: Public Beta (Months 3-4)**
- Open registration with waitlist
- Referral program (1 month free for each referral)
- Content marketing launch (blog, social media, YouTube)
- Goal: 2,000 paid subscribers

**Phase 3: Full Launch (Months 5-6)**
- Remove beta label
- Launch affiliate partnerships with sportsbooks
- Paid advertising (Google, social media, podcasts)
- PR push (sports media, tech press)
- Goal: 5,000 paid subscribers

**Phase 4: Scale (Months 7-12)**
- Expand sports coverage (add tennis, golf, MMA)
- Launch mobile app (React Native)
- API access for enterprise/developer tier
- International expansion (UK, Canada, Australia)
- Goal: 15,000 paid subscribers

### 8.2 Marketing Channels

| Channel | Strategy | Budget % | Expected CAC |
|---------|----------|----------|-------------|
| Content Marketing | Blog posts, YouTube tutorials, Twitter | 25% | $15-25 |
| Paid Social | Instagram, Twitter, Reddit ads | 20% | $30-50 |
| Podcast Sponsorships | Sports betting podcasts | 15% | $25-40 |
| Affiliate/Referral | User referral program | 15% | $20-30 |
| SEO | Organic search optimization | 10% | $10-15 |
| Influencer Partnerships | Sports betting influencers | 10% | $35-60 |
| Sportsbook Partnerships | Cross-promotion deals | 5% | $20-35 |

### 8.3 Content Strategy

**Blog Topics:**
- "How to Find +EV Bets Every Day"
- "Why Most Parlays Lose (And How to Build Better Ones)"
- "Understanding Line Movement: A Complete Guide"
- "The Weather Factor: How Wind and Rain Affect NFL Totals"
- Sport-specific weekly previews with real Sors Maxima data

**Social Media:**
- Daily top picks (with results tracking)
- Live game alerts and edge notifications
- Weekly P&L transparency reports
- Educational threads on betting concepts
- Community picks and leaderboard updates

**YouTube:**
- Platform walkthrough tutorials
- Weekly pick analysis videos
- "How the Algorithm Works" explainer series
- Live streaming during major sporting events

---

## 9. COMPETITIVE ANALYSIS

### 9.1 Competitor Landscape

| Competitor | Price | Strengths | Weaknesses | Sors Maxima Advantage |
|-----------|-------|-----------|------------|----------------------|
| Action Network | $9-35/mo | Large user base, good content | Basic analytics, no ML | 46-factor engine, deeper analysis |
| OddsJam | $39-199/mo | Good arbitrage tools | Complex UI, narrow focus | Unified platform, better UX |
| BettingPros | Free-$20/mo | Good for beginners | Very basic, no personalization | Advanced tools, AI assistant |
| SharpSide | $29-99/mo | Sharp money tracking | Limited sports, no parlay tools | Full parlay suite, more sports |
| Unabated | $49-249/mo | Professional-grade | Very complex, steep learning curve | Approachable + powerful |
| PrizePicks Props | Free | Easy props platform | DFS only, not sports betting | Full betting intelligence |
| ESPN Bet Tools | Free | Brand trust, huge audience | Very basic analytics | 100x deeper analysis |

### 9.2 Competitive Moats

1. **Data Integration Depth**: No competitor aggregates ESPN + Odds API + Weather + Injuries + Rosters into a single intelligence feed
2. **Continuous Learning**: Self-improving model that retrains on outcomes — accuracy improves over time
3. **46-Factor Analysis**: Most tools use 5-10 factors; our Quantum Fusion Engine uses 46
4. **Real-Time Architecture**: 60-second data cycles with SSE streaming — faster than any competitor
5. **Full-Stack Parlay Intelligence**: Correlation-aware parlay building with SGP, teasers, and round robin
6. **Transparency**: Every prediction shows its data sources, confidence breakdown, and historical accuracy

---

## 10. GROWTH STRATEGY

### 10.1 User Acquisition Funnel

```
Awareness (Content, Ads, Social)
    │ 10,000 visitors/month
    ▼
Interest (Landing Page, Free Tools)
    │ 2,000 signups/month (20% conversion)
    ▼
Trial (7-Day Free Trial)
    │ 1,400 trial starts/month (70% of signups)
    ▼
Activation (First Pick Viewed, First Parlay Built)
    │ 1,000 activated/month (71% of trials)
    ▼
Conversion (Paid Subscription)
    │ 350 conversions/month (35% of activated)
    ▼
Retention (Monthly Renewal)
    │ 85% monthly retention
    ▼
Expansion (Upgrade Tier)
    │ 15% upgrade within 3 months
    ▼
Referral (Invite Friends)
    │ 20% refer 1+ friends
```

### 10.2 Retention Strategies

1. **Daily Value Delivery**: Fresh picks every day, personalized to user's sports and preferences
2. **Performance Tracking**: Users see their ROI improving with Sors Maxima data
3. **Community & Social**: Leaderboards, shared tickets, tipster following
4. **Personalized Insights**: Betting DNA profile evolves with every bet
5. **Notifications**: Score alerts, line movements, and parlay tracking keep users engaged
6. **Gamification**: Rewards program, streak bonuses, achievement badges

### 10.3 Expansion Strategy

**Year 1:** US market, 6 major sports + soccer
**Year 2:** Add tennis, golf, MMA, boxing; launch mobile app; UK/Canada expansion
**Year 3:** API/enterprise tier; international markets (Australia, Europe); white-label partnerships

---

## 11. FINANCIAL PROJECTIONS

### 11.1 Revenue Projections (Year 1-3)

**Assumptions:**
- Average Revenue Per User (ARPU): $89/month (blended across tiers)
- Monthly churn rate: 8% (stabilizing to 5% by Year 2)
- Customer Acquisition Cost (CAC): $35 average
- LTV:CAC ratio target: 8:1+

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| End-of-Year Subscribers | 3,500 | 12,000 | 30,000 |
| Monthly ARPU | $89 | $95 | $105 |
| Annual Revenue | $1.87M | $8.55M | $24.57M |
| Annual Growth | — | 357% | 187% |

### 11.2 Revenue by Tier (Year 1 Projection)

| Tier | % of Users | Users | Monthly Rev | Annual Rev |
|------|-----------|-------|-------------|------------|
| Sharp ($49) | 55% | 1,925 | $94,325 | $1,131,900 |
| Edge ($99) | 30% | 1,050 | $103,950 | $1,247,400 |
| Max ($249) | 15% | 525 | $130,725 | $1,568,700 |
| **Total** | **100%** | **3,500** | **$329,000** | **$3,948,000** |

*Note: Blended ARPU higher than initial projection due to tier mix*

### 11.3 Cost Structure (Year 1)

| Category | Monthly | Annual | % of Revenue |
|----------|---------|--------|-------------|
| Infrastructure (hosting, APIs) | $8,000 | $96,000 | 5.1% |
| Data Costs (Odds API, OpenAI) | $5,000 | $60,000 | 3.2% |
| Payment Processing (Stripe ~3%) | $9,870 | $118,440 | 3.0% |
| Marketing & Acquisition | $25,000 | $300,000 | 16.0% |
| Engineering (salaries) | $50,000 | $600,000 | 32.1% |
| Operations & Support | $10,000 | $120,000 | 6.4% |
| Legal & Compliance | $5,000 | $60,000 | 3.2% |
| **Total Costs** | **$112,870** | **$1,354,440** | **69.0%** |
| **Net Margin** | **$216,130** | **$2,593,560** | **31.0%** |

### 11.4 Key Financial Metrics

| Metric | Target |
|--------|--------|
| Gross Margin | 85%+ |
| Net Margin (Year 1) | 25-35% |
| LTV (12-month) | $890 |
| CAC | $35 |
| LTV:CAC Ratio | 25:1 |
| Payback Period | < 1 month |
| Monthly Churn | < 8% (Year 1), < 5% (Year 2) |
| NPS Score | 50+ |

---

## 12. OPERATIONAL ROADMAP

### 12.1 Current State (Completed)

- [x] Full-stack web application deployed
- [x] 6 major US sports + soccer coverage
- [x] Unified Intelligence Hub (60-second data cycles)
- [x] 46-factor Quantum Fusion Engine
- [x] Continuous machine learning with auto-retraining
- [x] Multi-bookmaker odds comparison (6 sportsbooks)
- [x] Command Center with real-time intelligence
- [x] Precomputed predictions engine (5-minute cycles)
- [x] SSE live streaming (scores, odds, alerts)
- [x] Custom notification system (game alerts, parlay watches)
- [x] Visual parlay builder + SGP + teasers + round robin
- [x] Personalized insights engine (Betting DNA)
- [x] Stripe subscription billing (3 tiers + trial)
- [x] 26-page admin dashboard
- [x] App Guardian auto-healing system
- [x] Security framework (rate limiting, fraud detection, encryption)

### 12.2 Near-Term Roadmap (Next 3 Months)

- [ ] Mobile-responsive optimization pass
- [ ] Push notifications (web + mobile)
- [ ] Email notification digests (daily picks email)
- [ ] Sportsbook deep-linking (open bet slip at DraftKings/FanDuel)
- [ ] Enhanced AI betting assistant with conversation memory
- [ ] Historical performance dashboard (track all predictions vs outcomes)
- [ ] Social sharing cards (share picks to Twitter/Instagram)
- [ ] Onboarding optimization (reduce time-to-value)

### 12.3 Medium-Term Roadmap (3-6 Months)

- [ ] React Native mobile app (iOS + Android)
- [ ] Add sports: Tennis, Golf, MMA/UFC, Boxing
- [ ] Live betting recommendations (in-game picks)
- [ ] Advanced bankroll simulator with Monte Carlo
- [ ] Custom model builder UI (adjust all 46 weights)
- [ ] API access for developer/enterprise tier
- [ ] Referral program with tracking dashboard
- [ ] Multi-language support (Spanish, French)

### 12.4 Long-Term Roadmap (6-12 Months)

- [ ] International expansion (UK, Canada, Australia)
- [ ] White-label solution for sportsbook partners
- [ ] Real-time odds feed via WebSocket
- [ ] Computer vision for injury assessment (video analysis)
- [ ] Voice assistant integration (Alexa, Google Home)
- [ ] Crypto payment support
- [ ] Enterprise API with SLA guarantees
- [ ] Machine learning model marketplace (community models)

---

## 13. RISK ANALYSIS & MITIGATION

### 13.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Regulatory changes restrict tools | Medium | High | Legal counsel, compliance-first design, multi-state awareness |
| API data source goes down/changes pricing | Medium | High | Multiple fallback sources, caching, ESPN free tier always available |
| Model accuracy underperforms | Low | High | Continuous learning, calibration monitoring, transparent accuracy reporting |
| Competition copies features | High | Medium | Speed of execution, data moat, community lock-in |
| Sportsbook partnerships block integration | Low | Medium | No direct sportsbook dependency; we provide analysis, not placement |
| User data breach | Low | Critical | PII minimization, encryption, security middleware, audit trails |
| High churn in early months | Medium | Medium | Daily value delivery, personalization, community features |
| The Odds API rate limits | Medium | Low | ESPN-derived fallback odds, caching, request optimization |
| Server costs scale faster than revenue | Low | Medium | Efficient architecture, caching, shared data hub reduces API calls |

### 13.2 Legal Risks

- **Not a Sportsbook**: Sors Maxima provides information and analysis only; it does not accept bets, hold funds, or facilitate gambling transactions
- **No Guaranteed Outcomes**: All predictions are clearly labeled as statistical analysis, not guarantees
- **Responsible Gambling**: Built-in bankroll management tools, loss limits, and responsible gambling resources
- **Data Privacy**: GDPR-compliant design, PII minimization, user data deletion on request
- **Terms of Service**: Clear disclaimers about the nature of predictions and user responsibility

---

## 14. TEAM & ORGANIZATIONAL NEEDS

### 14.1 Current State
- Solo founder/developer with full-stack platform built

### 14.2 Hiring Plan

**Immediate Needs (Pre-Launch):**
| Role | Priority | Salary Range | Responsibility |
|------|----------|-------------|---------------|
| Co-Founder / CTO | Critical | Equity | Technical leadership, architecture |
| Full-Stack Developer | High | $120-160K | Feature development, bug fixes |
| Data Scientist / ML Engineer | High | $130-170K | Model optimization, new factors |
| Product Designer (UI/UX) | High | $100-140K | User experience, mobile design |

**Growth Hires (Post-Launch):**
| Role | Priority | Salary Range | Responsibility |
|------|----------|-------------|---------------|
| Growth Marketing Manager | High | $90-130K | Acquisition, content, partnerships |
| Customer Success Manager | Medium | $70-100K | Onboarding, retention, support |
| DevOps Engineer | Medium | $120-160K | Infrastructure, scaling, monitoring |
| Content Creator | Medium | $60-90K | Blog, social media, video |
| Mobile Developer | Medium | $120-160K | React Native app |

### 14.3 Advisory Board (Ideal)

- **Sports Betting Industry Expert**: Someone with experience at DraftKings, FanDuel, or similar
- **SaaS Growth Advisor**: Proven track record scaling subscription businesses
- **Legal/Regulatory Advisor**: Gaming law expertise
- **Data Science Advisor**: ML/AI in sports analytics

---

## 15. KEY METRICS & KPIs

### 15.1 Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users (DAU) | 40% of subscribers | Login + action |
| Weekly Active Users (WAU) | 70% of subscribers | Login + action |
| Command Center Views / Day | 3+ per user | Page views |
| Picks Viewed / Session | 5+ | Click tracking |
| Parlays Built / Week | 2+ per user | Build actions |
| Time to First Value | < 2 minutes | Onboarding → first pick view |
| Feature Adoption Rate | 60%+ for core features | Feature usage tracking |

### 15.2 Business Metrics

| Metric | Target | Frequency |
|--------|--------|-----------|
| Monthly Recurring Revenue (MRR) | Growing 15%+ MoM | Monthly |
| Trial-to-Paid Conversion | 35%+ | Weekly |
| Monthly Churn Rate | < 8% Year 1, < 5% Year 2 | Monthly |
| Customer Acquisition Cost (CAC) | < $40 | Monthly |
| Lifetime Value (LTV) | > $500 | Quarterly |
| Net Promoter Score (NPS) | > 50 | Quarterly |
| Revenue per Employee | > $200K | Annually |

### 15.3 Technical Metrics

| Metric | Target | Monitoring |
|--------|--------|-----------|
| API Response Time (p95) | < 500ms | App Guardian |
| Data Freshness (ESPN) | < 90 seconds | Hub Status |
| Model Accuracy (overall) | > 55% | Orchestrator |
| System Uptime | 99.5%+ | App Guardian |
| SSE Connection Success | > 95% | SSE Manager |
| Error Rate | < 0.5% | Error Logger |

---

## 16. LEGAL & COMPLIANCE

### 16.1 Regulatory Position

Sors Maxima is an **information and analytics service**, not a sportsbook. This classification is important:

- **No gambling license required** in most jurisdictions (we don't accept bets or handle funds)
- **Not subject to state gaming commission oversight** (we provide analysis, not wagering)
- **Comparable to financial research tools** (similar to how Bloomberg provides analysis but doesn't execute trades)

### 16.2 Compliance Measures Built Into Platform

| Measure | Implementation |
|---------|---------------|
| Age Verification | Required at signup (21+ in US) |
| Responsible Gambling | Bankroll limits, loss tracking, self-exclusion option |
| Data Privacy | PII minimization engine, data deletion on request |
| Terms of Service | Clear disclaimers on prediction nature |
| No Guaranteed Outcomes | All picks labeled as "analysis" not "guarantees" |
| Audit Trail | Full logging of all system actions |
| Fraud Detection | Trial fraud engine, device fingerprinting |
| Security | HMAC-SHA256 ticket signatures, rate limiting, input sanitization |
| Payment Compliance | Stripe handles PCI DSS compliance |

### 16.3 Recommended Legal Actions

1. Form LLC or C-Corp for liability protection
2. Engage gaming law attorney for state-by-state compliance review
3. Draft comprehensive Terms of Service and Privacy Policy
4. Obtain E&O (Errors and Omissions) insurance
5. Register trademarks for "Sors Maxima" and key product names
6. Implement CCPA/GDPR data subject request handling

---

## 17. TECHNICAL SPECIFICATIONS

### 17.1 API Endpoint Inventory

The platform exposes 100+ API endpoints. Key categories:

**Intelligence & Data:**
- `GET /api/intelligence/feed` — Unified intelligence feed
- `GET /api/intelligence/hub-status` — Hub health status
- `GET /api/intelligence/snapshot/:sport` — Per-sport data snapshot
- `GET /api/market-snapshot` — Multi-bookmaker market data
- `GET /api/precomputed-predictions/:sport` — Pre-generated picks
- `GET /api/sse/stream` — Server-Sent Events live stream

**Notifications:**
- `GET /api/custom-notifications` — User notifications
- `PUT /api/custom-notifications/read` — Mark notifications read
- `GET /api/custom-notifications/stats` — Notification statistics
- `POST /api/game-subscriptions` — Subscribe to game alerts
- `DELETE /api/game-subscriptions/:gameId` — Unsubscribe
- `POST /api/parlay-watches` — Watch a parlay

**Betting Tools:**
- `POST /api/generate-ticket` — Generate betting ticket
- `POST /api/generate-ticket-v2` — Enhanced ticket generation
- `GET /api/odds/:sport` — Sport odds
- `GET /api/live-games` — Live game data
- `GET /api/injuries/:sport` — Injury reports
- `GET /api/weather/:sport` — Weather data

**Account & Billing:**
- `POST /api/stripe/checkout` — Start subscription
- `POST /api/stripe/portal` — Manage subscription
- `GET /api/subscription` — Current subscription status
- `GET /api/trial/status` — Trial information
- `GET /api/credits` — AI credit usage

### 17.2 Data Refresh Schedule

| Data | Source | Interval | Cache TTL |
|------|--------|----------|-----------|
| Live Scores | ESPN | 60 seconds | 60 seconds |
| Pre-Game Data | ESPN | 5 minutes | 5 minutes |
| Betting Odds | The Odds API | 5 minutes | 5 minutes |
| Player Props | The Odds API | 5 minutes | 5 minutes |
| Injury Reports | ESPN | 15 minutes | 15 minutes |
| Weather | Open-Meteo | 30 minutes | 30 minutes |
| Team Rosters | ESPN | 6 hours | 30 minutes |
| Predictions | Internal | 5 minutes | 5 minutes |
| Model Weights | Internal | 24 hours | N/A |
| Intelligence Feed | Internal | 30 seconds (client) | 60 seconds |

### 17.3 Security Architecture

| Layer | Implementation |
|-------|---------------|
| Transport | HTTPS/TLS |
| Authentication | Session-based with fingerprinting |
| Authorization | Tier-based feature gating |
| Input Validation | Zod schema validation on all inputs |
| Rate Limiting | Per-endpoint rate limits |
| CSRF Protection | Token-based CSRF prevention |
| XSS Prevention | Input sanitization middleware |
| IP Blocking | Automated ban on abuse detection |
| Ticket Integrity | HMAC-SHA256 signatures + one-time nonces |
| Password Security | Bcrypt hashing with account lockout |
| Fraud Detection | Device fingerprinting, trial abuse detection |
| Audit Logging | Full action logging for compliance |
| PII Minimization | Minimal data collection policy |

---

## APPENDIX A: GLOSSARY

| Term | Definition |
|------|-----------|
| EV (Expected Value) | The statistical advantage or disadvantage of a bet, expressed as a percentage |
| CLV (Closing Line Value) | How a bettor's odds compare to the final line before game start |
| Kelly Criterion | A formula for optimal bet sizing based on edge and bankroll |
| Sharp Money | Bets placed by professional/informed bettors that move lines |
| Parlay | A multi-leg bet where all selections must win |
| SGP | Same-Game Parlay — multiple bets within a single game |
| Teaser | A parlay where point spreads are adjusted in the bettor's favor |
| Round Robin | Multiple smaller parlays created from a larger set of picks |
| Moneyline | A bet on which team will win outright |
| Spread | A bet on the margin of victory |
| Total (Over/Under) | A bet on the combined score of both teams |
| Arbitrage | Placing bets on all outcomes across different books for guaranteed profit |
| Middle | Betting both sides of a spread when lines differ enough to win both |
| Quantum Fusion | Sors Maxima's proprietary 46-factor analysis algorithm |

---

## APPENDIX B: CONTACT & NEXT STEPS

**To launch Sors Maxima successfully, prioritize:**

1. **Legal entity formation** — LLC or C-Corp, gaming law review
2. **Domain & branding** — Secure sorsmaxima.com, social handles, brand guidelines
3. **Beta recruitment** — Build waitlist via landing page + sports betting communities
4. **Content pipeline** — Begin blog, social media, and video content 4 weeks before launch
5. **Sportsbook partnerships** — Reach out to affiliate programs at DraftKings, FanDuel, BetMGM
6. **Funding** (if needed) — Seed round deck based on this business plan; target $500K-$1M
7. **Mobile development** — Begin React Native app for iOS/Android
8. **Hire first team members** — Full-stack developer + growth marketer

---

*This document was generated from the live Sors Maxima platform. All feature descriptions reflect actual implemented functionality as of February 2026.*

# Admin Tools Complete Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

The admin dashboard is accessed at `/admin` and is only available to the owner account (`jeffreywilliams`). It contains 40+ specialized tools organized into six categories. This document explains what every tool does, when to use it, and what actions it gives you.

---

## How to Access Admin

1. Go to `/login`
2. Username: stored in env var `ADMIN_USERNAME`
3. Password: stored in env var `ADMIN_PASSWORD`
4. Once logged in, navigate to `/admin`

The admin area is completely separate from the member experience. You can switch between them using the "User App" and "Admin" buttons in the header.

---

## Category 1: Intelligence & Business

### Revenue Intelligence (`/admin/monetization`)
Your full monetization command center. Shows all active and planned revenue streams — subscriptions, affiliate programs, data licensing, API access, and white-label opportunities. Use this to track MRR, see tier breakdown, and execute revenue expansion actions.

### Marketing Command Center (`/admin/marketing`)
Create and launch marketing campaigns. Includes an AI ad generator that writes copy for you, campaign scheduling, promo code generation, and launch buttons for automated email sequences (welcome, upgrade nudges, win-back, VIP unlock, trial-ending).

### Growth Analytics (`/admin/growth`)
Revenue trends, LTV/CAC ratios, subscriber growth charts, churn rate tracking, and cohort analysis. Your primary dashboard for understanding whether the business is growing or shrinking.

### Intelligence Pipeline (`/admin/pipeline`)
A live node map showing every data engine in the system and its current health status. Shows where data flows from external APIs through prediction engines to users. Use this if pick quality degrades — it will pinpoint which node is failing.

### App Intelligence (`/admin/app-intelligence`)
AI-generated insights about how the app is performing. Identifies underused features, suggests improvements, and tracks feature adoption rates across tiers.

### Quality Watchdog (`/admin/quality-watchdog`)
Monitors pick accuracy, expected value integrity, and model output quality in real time. Alerts you if the prediction engine starts producing picks below acceptable quality thresholds.

### Autonomous Monitor (`/admin/autonomous`)
A 24/7 AI health watcher that runs continuously. Generates alerts and reports without you doing anything. Check this daily — it flags issues before they become user-facing problems.

### AI Assistant (`/admin/assistant`)
A GPT-4o-powered admin chatbot that knows your platform. Ask it anything — "Why are picks wrong for NBA today?", "What's causing high churn?", "Draft me a win-back email campaign." It has full context of your system state.

---

## Category 2: Analytics & Growth

### Acquisition Analytics (`/admin/acquisition`)
Tracks how users are finding the platform — which channels convert best, what the cost per acquisition is per channel, and which landing pages convert. Essential for deciding where to spend marketing budget.

### Promo Manager (`/admin/promos`)
Create, manage, and deactivate promotional offers. Set discount codes, trial extensions, and special pricing. All promos integrate with Stripe.

### A/B Tests (`/admin/ab-tests`)
Run split tests on anything — landing pages, email copy, pricing display, feature placements. Track results and pick winners.

### Lifecycle Campaigns (`/admin/lifecycle-campaigns`)
Email automation sequences triggered by user actions. Manage the logic for: onboarding sequences, upgrade nudges at day 3/7/14, win-back campaigns for churned users, and VIP unlock flows for high-engagement free users.

### User Segmentation (`/admin/segmentation`)
Slice your user base by behavior, tier, engagement score, risk of churn, sports preference, or any custom criteria. Use segments to target campaigns precisely.

### Analytics Dashboard (`/admin/analytics-dashboard`)
A consolidated overview of all platform KPIs in one place — DAU, MAU, retention curves, payment analytics, funnel performance, and SLO health.

---

## Category 3: User Management

### User Health (`/admin/user-health`)
Shows engagement scores, churn risk ratings, and predicted LTV for every user. Color-coded by risk level. Use this to proactively reach out to users who are about to cancel.

### Applications (`/admin/applications`)
Manage the platform application/waitlist queue. Review, approve, or reject applications from prospective members. Add admin notes.

### Support Dashboard (`/admin/support`)
All open support tickets from members. Respond directly from here, escalate tickets, or mark them resolved. Integrates with the chat support system.

### Member Feedback (`/admin/feedback`)
Every feedback submission from users — ratings, NPS scores, written comments, feature requests. Search and filter by type, date, or sentiment.

### Fraud Dashboard (`/admin/fraud`)
Flags suspicious activity — multiple accounts from same IP, trial abuse patterns, card testing, VPN/proxy usage. Take action directly from here (ban, suspend, restrict).

---

## Category 4: Intelligence & Models

### Quality Watchdog (`/admin/quality-watchdog`)
Real-time pick quality monitoring. Shows EV integrity scores, accuracy tracking by sport, and model drift detection.

### Model Integrity (`/admin/model-integrity`)
Deep model health metrics — ROI over time, Brier score (calibration quality), confidence vs. actual win rate. This is where you know if the AI is actually good.

### Model Performance (`/admin/model-performance`)
Historical performance charts by sport, bet type, and confidence tier. Track which factors are contributing most to prediction accuracy.

### Training Center (`/admin/training`)
Manual controls for retraining the ML models. Trigger recalibration, feed new outcome data, and view training history.

### Data Provenance (`/admin/data-provenance`)
Tracks where every piece of data comes from — which API, when it was fetched, and whether it was used in predictions. Audit trail for data quality.

### Correlation Matrix (`/admin/correlation-matrix`)
Visual map of how different factors correlate with each other and with outcomes. Use this to spot redundant factors or discover new predictive patterns.

### Sport Factor Analysis (`/admin/sport-analysis`)
Deep dive into how each of the 46 factors performs by sport. Which factors are strongest predictors for NBA vs. NFL vs. NHL, etc.

---

## Category 5: Platform & Security

### Security Center (`/admin/security`)
Real-time threat monitoring — blocked IPs, active session anomalies, failed login attempts, and suspicious request patterns. Block IPs and revoke sessions directly from here.

### Policy & Standards (`/admin/policy-standards`)
Company policies, AI model ethics guidelines, pick grading standards (A–F), and compliance checklists.

### Community Integrity (`/admin/community-integrity`)
Monitors for card fraud (trading card exploit attempts), Discord abuse, and members trying to access tier-locked features they haven't paid for.

### Feature Flags (`/admin/feature-flags`)
Toggle any platform feature on or off per tier in real time — no code deployment needed. This is how you control what Free/Sharp/Edge/Max users can see. Emergency kill switch for any feature that's causing problems.

### API Budget (`/admin/api-budget`)
Track your API usage and costs across all external providers — The Odds API, OpenAI, ESPN, weather. See burn rate, remaining quota, and projected monthly cost. Alert thresholds configurable.

### System Health (`/admin/system-health`)
Server memory usage, CPU, engine cycle times, cache hit rates, and database connection health. See at a glance if the platform is running efficiently.

---

## Category 6: Strategy & Business

### Financial Projections (`/admin/financial-projections`)
Revenue forecasting model — project MRR, ARR, and margin at different subscriber counts and tier mixes. Useful for investor conversations or planning marketing spend.

### Pricing Intelligence (`/admin/pricing-intelligence`)
Competitor price benchmarking updated regularly. Shows where Sors Maxima sits relative to OddsJam, Action Network, Unabated, etc. Helps inform pricing decisions.

### Risk Register (`/admin/risk-register`)
Documented business risks with severity ratings and mitigation plans. Covers technical, legal, competitive, and financial risks.

### Orchestration (`/admin/orchestration`)
Manual controls for the continuous learning system. Trigger engine calibration, start/stop the orchestrator, force prediction re-computation, and view recommendation outcomes.

### Platform Intelligence (`/admin/platform-intelligence`)
Aggregated data on platform usage patterns — which features are most used, at what times, by which tier. Informs product roadmap decisions.

### Intelligence Acceleration (`/admin/launch-control`)
Emergency controls: force-refresh all picks, clear intelligence cache, push SSE updates to all connected users. Use when data gets stale or predictions need immediate refresh.

### Owner Playbook (`/admin/owner-playbook`)
Step-by-step operational checklist for running the platform day-to-day. Covers daily, weekly, and monthly tasks.

### Diagnostics (`/admin/diagnostics`)
Run automated health scans of the entire system. Returns a report on any misconfigured, broken, or degraded components. Run this first if anything seems wrong.

### Owner Vault (`/admin/owner-docs`)
This document and all other confidential owner documents. Read-only access to all platform documentation.

---

## Quick Action Reference

| Situation | Tool to Use |
|---|---|
| Pick quality has dropped | Quality Watchdog → Pipeline |
| A user is abusing trials | Fraud Dashboard |
| Want to run a promo | Promo Manager |
| Server feels slow | System Health |
| API costs spiking | API Budget |
| User is about to churn | User Health |
| Need to kill a feature fast | Feature Flags |
| Something is broken, don't know what | Diagnostics |
| Want to grow revenue | Monetization + Marketing |
| Competitor launched new feature | App Intelligence |
| Model accuracy dropped | Model Integrity → Training Center |

---

## Admin-Only Emergency Controls

These are destructive/impactful actions available in the admin:

| Action | Location | Effect |
|---|---|---|
| Force-refresh all picks | Launch Control | Clears prediction cache, recomputes all picks |
| Clear intelligence cache | Launch Control | Wipes and rebuilds all engine caches |
| Block IP address | Security Center | Immediately blocks all requests from that IP |
| Kill switch any feature | Feature Flags | Disables feature for all users instantly |
| Run settlement backfill | Orchestration | Re-settles picks that were missed |
| Ban a user | Fraud Dashboard | Immediately locks account |
| Trigger model recalibration | Training Center | Retrains ML weights with latest data |

---

## OMNISCRIPT INTEGRATION

> © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

### OmniScript Powers Sors Maxima Sports Betting Intelligence Platform

**Sors Maxima Sports Betting Intelligence Platform** is implemented in **OmniScript** — the proprietary domain-specific language (file extension `.omni`) of the OmniDLOS / Omnivex ecosystem. OmniScript is the Cognitive Layer of the Four-Dimensional Operating System, designed to express computation, emotional intelligence, dimensional architecture, and temporal awareness in a single unified language.

#### OmniScript Constructs in Sors Maxima Sports Betting Intelligence Platform

The platform's core architecture is declared within the **`SportsIntelligenceUniverse`** — an OmniScript `universe` block operating at `Dimension.TEMPORAL`:

- **Primary Engine:** `BettingPredictionEngine` — registered in the OmniVault package registry
- **Supporting Engines:** `MonteCarloSimulationEngine`, `OddsArbitrageEngine`, `LifeChangerTicketEngine`
- **Services:** `FactorModelService`, `OddsAggregationService`, `IntelligenceCardService`
- **Nexus Points:** All external interfaces declared as typed OmniScript `portal` Nexus Points
- **Vaults:** All persistent data archived via `Nova.Vault` with Guardian Layer protection
- **Cross-Dimensional Bus:** `Nova.Bus` enables real-time Signal exchange with all 13 OmniDLOS platforms

#### OmniScript Code Sample

```omni
// Sors Maxima — 46-Factor Betting Prediction Engine
universe SportsIntelligenceUniverse {
  dimension: Dimension.TEMPORAL
  vibe: Vibe.PRECISION

  forge FACTOR_COUNT: Integer = 46
  forge SIMULATION_RUNS: Integer = 10_000
  forge MIN_EV_THRESHOLD: Float = 3.5
  forge CALIBRATION_WINDOW: Integer = 90  // days

  engine BettingPredictionEngine implements Intelligent {
    manifest flow analyzMatchup(homeTeam: Text, awayTeam: Text, market: Text): flow<Prediction> {
      forge factors    = sync FactorModelService.computeAll(homeTeam, awayTeam, FACTOR_COUNT)
      forge simulation = sync MonteCarloSimulationEngine.run(factors, runs: SIMULATION_RUNS)
      forge odds       = sync OddsAggregationService.fetch(homeTeam, awayTeam, market)

      forge ev: Float = simulation.expectedValue(odds)
      forge confidence: Probability = simulation.confidenceInterval(0.95)

      when (ev >= MIN_EV_THRESHOLD) {
        Nova.Bus.emit("pick.high-ev", { matchup: `${homeTeam} vs ${awayTeam}`, ev, confidence })
      }

      propagate Prediction { factors, simulation, odds, ev, confidence }
    }

    manifest flow generateLifeChangerTicket(date: Chronicle): flow<ParlayTicket> {
      forge picks = sync BettingPredictionEngine.getDailyBestPicks(date, minOdds: 1000)
      forge ticket = sync LifeChangerTicketEngine.compose(picks)
      Nova.Vault.archive("life-changer-ticket", ticket)
      propagate ticket
    }
  }
}
```

#### OmniDLOS Terminology Reference

| OmniDLOS Term | Meaning in Sors Maxima Sports Betting Intelligence Platform |
|---|---|
| **Nexus Point** | Any API or integration interface declared in OmniScript `portal` syntax |
| **Vault** | The encrypted, immutable data repository storing all platform state |
| **Guardian Layer** | The `@Guardian(level: N)` access control system protecting sensitive Engine operations |
| **Pulse** | The real-time scoring type used for all algorithmic outputs |
| **Signal** | A typed event propagated via `Nova.Bus` to the Inter-Dimensional Bus |
| **Chronicle** | The OmniScript temporal type — dates with legacy and historical awareness |
| **Constellation** | The OmniScript collection type — dimensional arrays with typed membership |
| **Universe** | The `SportsIntelligenceUniverse` namespace — the dimensional scope of the platform |

© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

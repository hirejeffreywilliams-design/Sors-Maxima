# User-Facing Features Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

This document maps every user-facing page and feature in the platform, what it does, which tier can access it, and how it creates value (and stickiness) for members.

---

## Core Navigation Pages

### Command Center (`/`) — The Home Page
The main intelligence feed. Displays:
- **Best Tickets** — Top 3 picks of the day with grades (A–F), confidence %, and full reasoning
- **Matchup Parlays** — Pre-built correlated parlay suggestions
- **Daily Edge Parlay** — One high-confidence multi-leg parlay per day
- **Live Game Alerts** — Real-time alerts as odds move or game situations change
- **Market Pulse** — Summary of where sharp money is flowing across all sports

This is the first thing members see every day. Designed to deliver immediate value in under 60 seconds.

**Tier Access:** Free gets 2 picks/day. Sharp gets 25/day. Edge and Max get unlimited.

---

### Auto Generator (`/generate`)
Generates custom parlays based on user-selected parameters:
- Sport, number of legs, risk level, bet type (spread/total/ML)
- Applies correlation engine to avoid legs that move together
- Outputs picks with EV calculations and grade

**Tier Access:** Sharp and above.

---

### Strategy Advisor (`/strategy`)
An AI-powered betting strategy coach. Users describe their bankroll, goals, and risk tolerance. The system produces:
- Recommended bet sizing (Kelly Criterion)
- Sport and bet type allocation
- Seasonal adjustments
- Specific strategy playbooks (fade the public, sharp fade, etc.)

**Tier Access:** Edge and Max.

---

### Visual Parlay Builder (`/builder`)
A drag-and-drop parlay construction tool. Users:
1. Browse picks across all sports
2. Drag legs into a parlay slip
3. See real-time correlation warnings (e.g., don't stack two QBs from the same game)
4. Get an overall EV and confidence score for the parlay
5. Export to any connected sportsbook

**Tier Access:** Sharp and above. Export feature: Max only.

---

### Daily Parlays (`/daily`)
Pre-built daily parlay suggestions organized by:
- Risk level (Safe / Moderate / Aggressive)
- Sport type
- Leg count (2-leg, 3-leg, 4-leg)

Each parlay includes full reasoning, historical hit rate for similar structures, and a grade.

**Tier Access:** Sharp and above.

---

### Pro Tools (`/tools`)
A suite of analytical tools:
- **ROI Calculator** — Projects returns across different bankroll strategies
- **Hedge Calculator** — Calculates optimal hedge bets for in-progress parlays
- **CLV Tracker** — Tracks closing line value to measure long-term betting skill
- **Sharp Money Tracker** — Shows where professional bettors are placing money
- **Arbitrage Scanner** — Finds guaranteed-profit opportunities across sportsbooks

**Tier Access:** Arbitrage and Hedge: Edge and above. CLV and Sharp Money: Max only.

---

### Live Center (`/live`)
Real-time game tracking during live events:
- Live scores updated every 30 seconds
- Live odds movement visualization
- In-game pick suggestions based on current game state
- Cash-out advisor (AI recommends when to cash out open parlays)
- Live SSE push updates (no page refresh needed)

**Tier Access:** All tiers can view live scores. Cash-out advisor: Edge and above.

---

### Odds Center (`/odds-center`)
A multi-sportsbook odds comparison hub:
- Side-by-side odds from DraftKings, FanDuel, BetMGM, Caesars, PointsBet, BetRivers
- Line movement charts showing how odds have moved since open
- +EV highlighting (lines where Sors Maxima's model disagrees with the market)
- Best-line finder — automatically shows which book has the best price for each bet

**Tier Access:** +EV and best-line: Sharp and above. Line movement charts: Edge and above.

---

### International Sports (`/international`)
Coverage of global soccer leagues:
- EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS
- UEFA Champions League and Europa League
- Major international competitions
- Same 46-factor analysis applied to soccer matchups

**Tier Access:** Edge and above.

---

### MMA (`/mma`)
UFC and Bellator fight analysis:
- Fighter stats and recent form
- Strike accuracy, takedown defense, finish rate
- Fight picks with confidence scores
- Prop picks (method of victory, round betting)

**Tier Access:** Sharp and above.

---

### Player Props (`/player-props`)
ML-powered player proposition picks:
- NBA: points, rebounds, assists, 3-pointers
- NFL: passing yards, rushing yards, receiving yards, TDs
- MLB: strikeouts, hits, RBIs, home runs
- NHL: goals, assists, shots on goal

Includes historical hit rates for each prop market and cross-book comparison.

**Tier Access:** Edge and above.

---

### Prop Parlay Builder (`/prop-parlay-builder`)
Build parlays from player prop picks specifically. Applies same-game parlay (SGP) correlation rules to find props that genuinely correlate (e.g., QB passing yards + WR receiving yards in the same game).

**Tier Access:** Edge and above.

---

### Bankroll Management (`/bankroll`)
A complete bankroll tracking and management system:
- Track all bets placed (wins, losses, ROI over time)
- Kelly Criterion bet sizing recommendations
- Bankroll health score
- Paper trading mode (simulated bets without real money)
- Multi-book bankroll allocation across up to 6 sportsbooks

**Tier Access:** Basic tracking: Sharp. Paper trading: Sharp. Multi-book allocation: Max.

---

### My Bets (`/my-bets`)
Personal betting history and performance dashboard:
- All recorded bets with outcomes
- Win/loss/push breakdown
- ROI by sport, bet type, and time period
- Streak tracking
- Export to CSV (tax purposes)

**Tier Access:** All tiers. Tax export: Max only.

---

### Track Record (`/track-record`)
The platform's public prediction track record:
- Overall win rate by sport and bet type
- ROI on published picks (auditable history)
- Confidence tier accuracy (how accurate A-grade vs. B-grade picks are)
- Comparative benchmark vs. Vegas lines

This builds trust with prospective members. The transparency is a sales tool.

**Tier Access:** Public (no login required).

---

### Research Notes (`/research-notes`)
Access to weekly deep-dive research reports on:
- Team trends
- Referee and officiating tendencies
- Injury impact analyses
- Scheduling spot analysis (fatigue situations)

**Tier Access:** Edge and above.

---

### Personalized Insights (`/insights`)
AI-generated insights personalized to each user's betting history:
- "You're 71% on NBA unders but only 44% on NFL spreads — consider shifting your focus"
- Optimal bet timing recommendations based on line movement patterns
- Sport-specific tips based on personal results

**Tier Access:** Edge and above.

---

### Sors Books (`/sorsbooks`)
The affiliate sportsbook directory. Lists recommended sportsbooks with:
- Sign-up bonus comparison
- Odds quality ratings
- Deposit/withdrawal speed ratings
- Direct signup links (with affiliate tracking once configured)

**Tier Access:** All tiers (this is the affiliate revenue page).

---

### Community (`/community`)
Member social features:
- Community picks feed (members sharing their picks)
- Discord integration
- Leaderboard of top-performing community members
- Copy betting from top performers (planned feature)

**Tier Access:** Basic: all tiers. Copy betting: Max only (planned).

---

### Intelligence Cards (`/cards`)
A gamification system built into the platform. Members collect digital "Intelligence Cards" for:
- Verified winning picks
- Streak milestones
- Subscription anniversaries
- Community contributions

Cards have rarity tiers (Common, Rare, Epic, Legendary) and limited edition counts per card. Members can trade cards with each other. The Admin Cards Vault (`/admin/cards`) lets you mint new cards, freeze fraudulent ones, and view all collections.

**Tier Access:** All tiers earn cards. Trading: all tiers.

---

### Rewards (`/rewards`)
A loyalty points system:
- Points earned for daily logins, using picks, winning streaks
- Redeemable for: subscription discounts, pick packs, feature unlocks
- VIP tier progression based on points

**Tier Access:** All tiers.

---

### Roadmap (`/roadmap`)
Public product roadmap showing planned features and their status. Builds community engagement and reduces churn by showing the platform is actively improving.

**Tier Access:** Public.

---

### Help Center (`/help`)
Self-serve documentation covering:
- Platform tutorials
- Feature explanations
- FAQ
- How to read picks and grades

**Tier Access:** Public.

---

### Settings (`/settings`)
Account settings including:
- Notification preferences (email, push)
- Sport preferences (personalize the experience)
- Subscription management (upgrade, downgrade, cancel via Stripe Customer Portal)
- Privacy settings
- Linked sportsbooks (for future auto-bet feature)

**Tier Access:** All tiers.

---

### Profile (`/profile`)
Public-facing member profile:
- Betting stats and record
- Card collection showcase
- Pick history (optional public display)

**Tier Access:** All tiers.

---

## Pick Grading System (A–F)

Every pick the platform generates receives a letter grade:

| Grade | Meaning | Confidence Range |
|---|---|---|
| A+ | Elite edge — extremely rare | 90%+ |
| A | Strong edge — high conviction | 80–89% |
| B | Good edge — solid play | 65–79% |
| C | Slight edge — situational | 55–64% |
| D | Marginal — informational only | 50–54% |
| F | No edge — avoid | Below 50% |

Members only ever see A and B grades in the main feed. C and below are shown only in the analytics tools for educational purposes.

---

## The Subscription Upgrade Flow

When a free user tries to access a locked feature, they see:
1. A feature preview (blurred content)
2. The exact tier that unlocks it
3. A direct upgrade CTA linking to `/pricing`
4. The Stripe Checkout flow

This "tease and upgrade" pattern is the primary conversion mechanism.

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

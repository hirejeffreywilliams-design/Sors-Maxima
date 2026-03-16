# Feature Flags & Tier Gating Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

The Feature Flag system gives you real-time control over every feature on the platform — no code deployment needed. You can turn features on or off per tier, run gradual rollouts, and kill any feature instantly if something goes wrong.

**Access:** `/admin/feature-flags`

---

## All Feature Flags (Current)

### Core Platform Features

| Flag ID | Feature Name | Default | Description |
|---|---|---|---|
| `live_odds` | Live Odds Feed | ON | Real-time odds from The Odds API |
| `quantum_fusion` | Sors Prediction Engine | ON | The 46-factor analysis engine |
| `ai_assistant` | AI Betting Assistant | ON | GPT-4o chat for betting analysis |
| `stripe_payments` | Stripe Payments | ON | Subscription billing |
| `advanced_command_center` | Advanced Command Center | ON | Best Tickets, Matchup Parlays, Daily Edge Parlay sections |

### Sports Features

| Flag ID | Feature Name | Default | Auto-activates |
|---|---|---|---|
| `international_soccer` | International Soccer Leagues | ON | Always |
| `nfl_player_props` | NFL Player Props | OFF | August (NFL preseason) |
| `mlb_player_props` | MLB Player Props | OFF | April (MLB opening day) |
| `ncaaf_player_props` | NCAAF Player Props | OFF | August (college football) |

### Intelligence Features

| Flag ID | Feature Name | Default | Description |
|---|---|---|---|
| `ml_projections` | ML Prop Projections | ON | Machine learning prop picks |
| `advanced_correlations` | Advanced Correlation Engine | ON | Parlay correlation modeling |
| `scheme_recognition` | Scheme Recognition | ON | AI coaching scheme analysis |
| `bankroll_simulator` | Bankroll Simulator | ON | AI bankroll simulation |
| `sharp_money_tracker` | Sharp Money Tracker | OFF | Track professional bettor money flows |
| `paper_trading` | Paper Trading | ON | Risk-free practice betting mode |

### Experimental / Planned Features

| Flag ID | Feature Name | Default | Status |
|---|---|---|---|
| `live_cashout_advisor` | Live Cash-Out Advisor | OFF | In development |
| `auto_bet_placement` | Auto Bet Placement | OFF | Future feature |
| `social_copy_betting` | Social Copy Betting | OFF | Future feature |
| `live_streaming_odds` | Live Streaming Odds | OFF | Future feature |
| `tipster_communities` | Tipster Communities | ON | Enabled |

---

## Tier Gating — What Each Tier Can Access

### Free (Starter) Tier
- Command Center: 2 picks per day (blurred after limit)
- Track Record page (public)
- Help Center (public)
- Roadmap (public)
- Basic bankroll tracking
- Intelligence Cards (earn and view)
- Community (basic access)

### Sharp ($49/month)
Everything in Free, plus:
- 25 picks per day
- Full Command Center (Best Tickets, Matchup Parlays, Daily Edge Parlay)
- Visual Parlay Builder
- Daily Parlays
- Auto Generator
- +EV Finder in Odds Center
- Basic Pro Tools (ROI Calculator)
- Paper trading mode
- My Bets tracking
- MMA picks
- Player props (basic)
- Bet grading (A–F) access
- ROI Dashboard

### Edge ($99/month)
Everything in Sharp, plus:
- Unlimited daily picks
- Strategy Advisor
- International Soccer
- Player Props (all sports)
- Prop Parlay Builder (SGP)
- Advanced Odds Center (line movement, best-line finder)
- AI Betting Assistant (unlimited)
- Advanced Pro Tools (Hedge Calculator, Arbitrage Scanner)
- Cash-out Advisor (live games)
- Personalized Insights
- Multi-book bankroll tracking
- Research Notes
- Line Movement Alerts (real-time)

### Max ($249/month)
Everything in Edge, plus:
- Monte Carlo Simulator access
- Custom Model Builder
- Deep-scan analysis (2x depth)
- Export to 6 sportsbooks
- CLV Tracking
- Sharp Money Tracker
- Pattern Recognition
- Tax Export Reports
- Priority processing (picks computed first)
- Early Access to beta features
- Hedge Calculator
- Multi-book bankroll (up to 6 books)
- AI Assistant at deep analysis level

---

## How to Change Feature Access

### Turning a Feature On or Off Globally
1. Go to `/admin/feature-flags`
2. Find the feature flag
3. Toggle it on or off — changes take effect immediately for all users

### Enabling a Feature for One Tier Only
1. Go to `/admin/feature-flags`
2. Select the flag
3. Set tier restrictions (e.g., "Edge and above only")
4. Save — changes apply in real time

### Emergency Kill Switch
If a feature is causing issues (AI assistant sending bad responses, odds showing wrong data, etc.):
1. Go to `/admin/feature-flags`
2. Find the flag for that feature
3. Click the red Kill Switch button
4. Feature is immediately disabled for ALL users
5. Fix the issue, then re-enable

This is much faster than a code deployment.

---

## Feature Rollout Strategy (Recommended)

When launching a new feature:

1. **Start with Max tier only** — your highest-value, most tolerant users
2. **Monitor for 1 week** — check error logs, user feedback, model impact
3. **Expand to Edge** — if no issues, open to Edge users
4. **Final rollout to Sharp** — after another week of stability
5. **Consider free-tier access** — only if it's a hook feature (drives upgrades)

This "waterfall rollout" protects you from exposing bugs to your entire user base.

---

## Feature Flags and Seasonal Features

Some features activate automatically by season:

| Feature | Activation | Deactivation |
|---|---|---|
| NFL Player Props | August (preseason) | February (after Super Bowl) |
| NCAAF Player Props | August | January (after CFP) |
| MLB Player Props | April (opening day) | October |
| NHL features | October | June |

You can override seasonal activation at any time from the feature flags panel. If a sport's season runs long (playoffs), the flag stays active until you manually turn it off or the system detects no more games.

---

## Feature Flags as a Sales Tool

Strategic use of feature flags for conversion:

1. **Tease before enabling** — Show locked features with a blurred preview to Free users before enabling them for paid tiers. The "you're so close" effect drives upgrades.

2. **Trial unlocks** — Temporarily enable a Max-tier feature for a Sharp user who's been a member for 30 days. They experience the value, then get asked to upgrade. Configure this from `/admin/lifecycle-campaigns`.

3. **Referral unlocks** — Enable a premium feature as a referral reward. When user A refers user B, unlock a locked feature for user A for 30 days.

4. **Promotional windows** — Enable all features for free during March Madness weekend or Super Bowl week to drive sign-ups. Then re-gate after the event.

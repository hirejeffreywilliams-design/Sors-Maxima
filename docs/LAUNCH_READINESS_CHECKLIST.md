# Launch Readiness Checklist — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

This is your pre-launch checklist. Every item here needs to be done before you start marketing the platform to real users. Some are already done, some need your action.

---

## Section 1: Technical Infrastructure ✅ Complete

- [x] Platform deployed on Replit (production mode)
- [x] PostgreSQL database configured and connected
- [x] All backend engines running on startup
- [x] Stripe payment integration active
- [x] Stripe subscription tiers configured (Sharp $49, Edge $99, Max $249)
- [x] Stripe webhook endpoint configured
- [x] OpenAI API integrated (AI assistant, pick explanations)
- [x] ESPN real-time data integrated (all sports)
- [x] The Odds API integrated (live odds)
- [x] Email service (Resend) integrated
- [x] Continuous learning engine active
- [x] Monte Carlo simulation engine active
- [x] Admin dashboard complete (40+ tools)
- [x] Feature flag system operational
- [x] Lifecycle email campaigns built
- [x] Error monitoring (Sentry) integration available
- [x] Security middleware active (rate limiting, IP blocking)
- [x] User authentication (register, login, email verification)
- [x] Password reset flow working
- [x] Subscription upgrade/downgrade via Stripe Customer Portal

---

## Section 2: Business Setup — Action Required

### Legal & Compliance
- [ ] **Terms of Service** — Have an attorney review before launch. Template is at `/legal` but needs legal review.
- [ ] **Privacy Policy** — Same — review with attorney.
- [ ] **Responsible Gambling Disclaimer** — Ensure it's prominent on all pick pages. Already in footer.
- [ ] **State Restrictions** — Research whether there are any states where offering this service requires licensing. (Generally: you're providing analysis/education, not acting as a sportsbook, so licensing requirements are minimal — but verify with an attorney.)
- [ ] **Age Verification** — The platform has age verification built in (must confirm 21+). Ensure this is enforced.

### Financial
- [ ] **Business Bank Account** — Open a business checking account separate from personal finances.
- [ ] **Business Entity** — Consider forming an LLC to protect personal assets (if not done already).
- [ ] **Stripe Account Verification** — Ensure Stripe account is fully verified for payouts.
- [ ] **Tax Setup** — Speak with an accountant about platform revenue taxation (SaaS subscriptions are taxable in most states).

### Sportsbook Affiliates (Revenue Unlock)
- [ ] **Apply to DraftKings Affiliate Program** — affiliate.draftkings.com
- [ ] **Apply to FanDuel Affiliate Program** — fanduel.com/affiliates
- [ ] **Apply to BetMGM Affiliate Program** — partners.betmgm.com
- [ ] **Apply to Caesars Affiliate Program** — caesars.com/affiliates
- [ ] **Integrate affiliate links** — Once approved, add tracking links to the Sors Books page and odds display
- [ ] **Expected revenue:** $50–$200 per depositor referred

---

## Section 3: Marketing Setup — Action Required

### Brand Assets
- [ ] **Social media accounts** — Create @SorsMaxima (or chosen handle) on Twitter/X, Instagram, TikTok
- [ ] **Logo files** — Export high-res versions for marketing use
- [ ] **Email domain** — Configure a custom sending domain in Resend (e.g., picks@sorsmaxima.com)
- [ ] **Track Record page** — Ensure pick history is populated before showing to users (you need at least 2–4 weeks of logged picks before the track record is meaningful)

### Pre-Launch
- [ ] **Seed the Track Record** — Run the platform for 2–4 weeks before public launch. Log picks and outcomes. You want 50+ settled picks before advertising your win rate.
- [ ] **Beta users** — Invite 10–20 trusted people for free access in exchange for feedback before public launch.
- [ ] **Welcome email** — Review the welcome email template and customize it (currently generic).
- [ ] **Landing page** — The landing page (`/`) is the platform itself. Consider whether you want a separate marketing landing page before the product.

---

## Section 4: Operations Setup — Action Required

### Monitoring
- [ ] **Set up Sentry** — Add the `SENTRY_DSN` secret for error monitoring. Critical for production visibility.
- [ ] **Check API Budget alerts** — Configure alert thresholds in `/admin/api-budget` for when API costs spike.
- [ ] **System Health baseline** — Log a baseline of server metrics in `/admin/system-health` so you know what "normal" looks like.

### Support
- [ ] **Support email** — Set up a support@sorsmaxima.com email that forwards to you (configure in Resend).
- [ ] **Response time SLA** — Decide on your support response time commitment (e.g., 24–48 hours for all tickets).
- [ ] **FAQ** — Review and expand the Help Center (`/help`) before users arrive.

### Admin Routine
Once live, establish a daily admin routine (estimated 15–20 minutes per day):
- [ ] Check `/admin/autonomous` for overnight alerts
- [ ] Check `/admin/quality-watchdog` for pick quality
- [ ] Check `/admin/system-health` for server metrics
- [ ] Review `/admin/feedback` for new member submissions
- [ ] Check `/admin/api-budget` for unexpected usage spikes

---

## Section 5: Launch Day Checklist

### The Night Before Launch
- [ ] Run diagnostics scan: `/admin/diagnostics` → Auto-scan
- [ ] Verify all API keys are loaded (check server logs)
- [ ] Confirm Stripe is in live mode (not test mode)
- [ ] Test the sign-up flow end-to-end (create a test account)
- [ ] Test the payment flow (subscribe and cancel in test mode)
- [ ] Test the email flow (verify welcome email arrives)
- [ ] Ensure the platform has fresh picks for tomorrow

### Launch Day
- [ ] Post on Twitter/X, Reddit, Discord
- [ ] Send launch email to your waitlist/early interest list
- [ ] Monitor `/admin/system-health` for unusual load
- [ ] Watch `/admin/user-health` for new user activations
- [ ] Respond to all feedback within 4 hours on launch day

---

## Current Status Summary

| Category | Status | Blocking? |
|---|---|---|
| Technical infrastructure | ✅ Complete | No |
| Stripe payments | ✅ Live | No |
| Core features | ✅ Complete | No |
| Legal review | ⚠️ Needed | Before marketing |
| Business entity | ⚠️ Recommended | Before revenue |
| Sportsbook affiliates | ⚠️ Not applied | No (revenue uplift) |
| Marketing accounts | ⚠️ Not set up | Before launch |
| Track record seeding | ⚠️ In progress | Before advertising win rate |
| Error monitoring | ⚠️ Optional | No (but recommended) |
| Support email | ⚠️ Not configured | Before launch |

**Bottom line:** The platform is technically launch-ready today. The remaining items are business/legal/marketing setup — none of them prevent you from showing the platform to your first users right now. But sort out legal and set up monitoring before you run paid ads.

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

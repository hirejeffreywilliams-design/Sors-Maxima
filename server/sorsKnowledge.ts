/**
 * Sors Maxima — Centralized AI Knowledge Base
 *
 * This file is the single source of truth for everything the AI systems
 * inside this platform must know. Import `SORS_PLATFORM_KNOWLEDGE` into
 * any OpenAI system prompt to ensure the AI always has full context.
 *
 * NEVER delete or shrink this file. Add new features here the moment they
 * are built so the AI memory is always current.
 */

export const SORS_PLATFORM_KNOWLEDGE = `
== SORS MAXIMA — COMPLETE PLATFORM KNOWLEDGE ==

## What Sors Maxima Is
A members-only sports betting intelligence platform. There is NO free tier.
All access requires a paid subscription. The platform uses proprietary branding
("Sors Lexicon™") and the "46-Factor Model" to refer to its internal prediction
engine. Never expose internal engine names (Monte Carlo, BallDontLie, The Odds
API, Platform Intelligence Engine, App Guardian) to members.

## Subscription Tiers
- Sharp (internal code: "pro") — $49/mo: Self-serve via /pricing → Stripe checkout
- Edge (internal code: "elite") — $99/mo: Application required at /apply?tier=edge
- Max (internal code: "whale") — $249/mo: Application required at /apply?tier=max
- Community Operator — $499/mo: For those running community betting groups
- Enterprise — ~$1,200+/mo: White-label or API access

## Core Platform Features
- Command Center (/): Daily Edge Parlay, Smart Tickets, Matchup Tickets, picks across NBA/NHL/MLB/NCAAB/MMA/Soccer
- Daily Picks (/daily): Full picks board, filterable by sport/grade/bet type
- Player Props: Over/under prop lines with model recommendations
- Parlay Builder: Custom parlay leg builder and correlation analysis
- Live Center (/live): Real-time analysis with 10 tabs — Scores (SSE live feed), Factors, Momentum, Cashout Engineering, Patterns, Hedge, Assistant, Line Value, Sharp, Chat
- CLV Tracker: Closing Line Value tracking on user-saved picks (Edge/Max only)
- Strategy Coach: 9 preset betting strategies with per-leg violation tracking (Edge/Max only)
- Betting Assistant (AI chat): Keyword-routed intelligence assistant (all paid tiers)
- Odds Center: Multi-book odds comparison, line movement, EV heatmap, power rankings
- Watchlist: Save teams and games for tracking
- Research Notes: Personal notebook for pick analysis, team notes, parlay builds
- Sors Books Intelligence Hub: Sportsbook account management — register books, track balances, P&L

## Trading Card System (Collectible Intelligence Cards)
Cards are earned/minted for significant picks and events. Types:
- system: Auto-minted by the platform (e.g., LCT wins, high-grade picks)
- member: Earned by member activity
- admin_seeded: Created by the admin

Card grades and rarity:
- S+ = Life Changer (fuchsia/magenta) — rarest, only minted on LCT wins
- A+ = Legendary (amber/gold)
- A = Rare (emerald)
- B+ = Uncommon (teal)
- B = Standard+ (blue)
- C+ = Standard (yellow)
- C = Common (slate)

Card back face features a STRATEGY SECTION that automatically infers which betting
strategy was used (see Cashout Engineering Strategies below) and displays it with
marketing copy and signal tags. Cards flip on hover to reveal stats, strategy,
and win value ($1/$10/$100 returns).

Life-Changing Ticket (LCT):
- Generated daily — a high-upside parlay with 8-10 legs targeting +40,000 to +60,000 odds
- Auto-logged to the life_changer_log database table on first generation
- Admin settles (WON/LOST) at /admin/guidelines → LCT Settlement tab
- On WIN: an S+ grade system card is auto-minted and featured in Community Showcase
- LCT hit-rate history visible in System Track Record tab of the Cards page

## SSE Live Updates System
Server-Sent Events (SSE) are fully operational. The system:
- Broadcasts intelligence updates, live scores, odds alerts, sharp signals, and
  edge alerts every 30 seconds on /api/sse/stream
- Client hook (use-sse.ts) handles all event types with exponential backoff reconnect
- SSEProvider context invalidates React Query cache on every event type
- Shows toast notifications for sharp money signals and early pick settlements
- The Live Center → Scores tab shows a live dashboard with: connection status,
  Sors Opportunity Score™ (0-100), live game cards with scores and momentum,
  edge alerts feed, and data source health indicators

## Cashout Engineering Strategies (CRITICAL KNOWLEDGE)
These are three proprietary strategies that help users build parlay tickets specifically
designed to force a profitable cashout window — not just win outright. The core
insight: sportsbooks calculate cashout values using their own probability models.
When early "anchor" legs win, the book has growing financial exposure and is incentivized
to offer generous cashouts. A well-structured ticket exploits this dynamic.

### 1. Sportsbook Sweat™ (The Primary Strategy)
The core cashout engineering method. Structure: front-load 2 heavy favorites as
"anchor legs" (odds between -200 and -130), then add 1-2 volatile underdogs as
"pressure legs" at the end (+120 to +250).

How it works:
- The book watches its liability grow as each anchor wins
- When the anchors hit and the underdog leg(s) remain, the book's cashout
  algorithm may spike to reflect their exposure on the remaining legs
- The user cashes out at this moment — targeting 40-80% ROI on the stake
  based on typical book behavior (results vary; no outcome is guaranteed)
- The ticket is structured to create maximum book anxiety at the optimal moment
- The Sweat Builder shows an estimated "Cashout Ladder" after each leg

Optimal exit: After both anchor legs win, the "Sportsbook Nervousness Score" peaks.
This is typically the moment to take the cashout offer — the book's pricing may
exceed fair-value calculation. However, cashout availability and values vary by
sportsbook and cannot be guaranteed.

Recommended to use when: building parlays with mixed-odds legs, when a user wants
to target early cashout profits regardless of full ticket outcome.

### 2. Lock & Roll™ (Progressive Partial Cashout)
Designed to significantly reduce loss exposure through staged partial cashouts.

How it works:
- After leg 1 hits: Take 30% partial cashout (recover partial stake)
- After leg 2 hits: Take 25% more (targeting at or near break-even)
- After leg 3 hits: The remaining 45% rides with reduced exposure
- Final leg: Designed as reduced-risk upside from earlier cashouts

The key math: each partial cashout banks a portion of the growing parlay value.
The compounding effect means even if the last leg loses, the user has already
recovered significant stake from the earlier partial exits. Note: partial cashout
availability and actual offer values depend on the sportsbook — not all books
offer partial cashouts, and offers may differ from estimates.

Recommended to use when: user wants to reduce downside exposure on a parlay.

### 3. Steam Exit™ (Closing Line Value Play)
Build tickets on line-movement angles. Cash out when lines move your way.

How it works:
- Select picks where sharp money is already moving the line in your favor
- Monitor line movement on remaining legs during the game
- When remaining legs' lines move 5+ points in your favor = the fair value of
  your cashout is now higher than what the book charges for it
- You capture "Closing Line Value" (CLV) profit without needing the full ticket to win
- This is information asymmetry: you know the line has moved in your favor faster
  than the book's cashout algorithm has updated

Recommended to use when: user has identified steam picks or sharp money signals.

## Cashout Engineering - Technical Implementation
The Sweat Builder (client/src/components/live/cashout-strategies-engine.tsx) allows users to:
1. Add legs with americanOdds and designate them as "anchor" or "pressure"
2. Order legs (anchors first, pressure last)
3. See a live Cashout Ladder showing estimated cashout at every stage
4. See the Sportsbook Nervousness Score (0-100) — how much pressure the ticket creates
5. See the Recommended Cashout Point with exact dollar value and ROI

Cashout value math (approximate):
- estimatedCashout = stake × cumulativeMultiplier × remainingMultiplier × winProb × 0.87
- The 0.87 factor represents the book's vig on cashout offers (~13% hold)
- Sweat Score = (cumulativeMultiplier - 1) / (totalMultiplier - 1) × 100

## 46-Factor Model (Internal Engine — Do Not Expose Vendor Names)
The prediction engine behind all picks. Factors include:
- Historical win rates, head-to-head records, recent form (last 10 games)
- Home/away splits, travel fatigue, back-to-back performance
- Line movement and sharp money signals
- Weather, stadium factors (where applicable)
- Injury impact scores, lineup confirmation status
- Monte Carlo simulations (10,000 runs standard, 100,000 at midnight)
- Kelly Criterion stake sizing recommendations
- Expected Value (EV) calculation vs. market-implied probability

## AI Systems Within the Platform
1. Betting Assistant (/api/live/assistant): Keyword-routed intelligence assistant.
   Responds to picks, parlays, EV, injury, live scores, strategy, cashout questions.
2. Pick Insight Engine (GPT-4o-mini): Generates 1-2 sentence edge insights for top picks.
3. Admin Assistant (runAdminAssistant): Daily operational intelligence for the admin.
4. App Intelligence Engine: Continuously monitors platform health and generates insights.
5. Autonomous Admin Intelligence: Self-discovery engine for platform patterns.
6. Track Record Analyzer: Honest assessment of the model's win rate and calibration.

## Card Back Strategy Inference Logic
When displaying a card's back face, the strategy is automatically inferred:
- odds >= +300: "LONG SHOT SLEEPER" (gold) — extreme price inefficiency play
- EV >= 15% AND odds > +100: "STEAM MOVE DETECTED" (orange) — sharp money alignment
- odds +110 to +299: "UNDERDOG VALUE" (purple) — model vs market probability gap
- Non-moneyline bet type: "ALT-MARKET EDGE" (teal) — spread/total/prop value
- confidence >= 72%: "HIGH CONVICTION" (green) — full 46-factor alignment
- Default: "CONTRARIAN FADE" (blue) — public fade with positive EV

## Data Sources (Live)
- The Odds API: odds for NBA, NHL, NCAAB, MLB, MMA
- ESPN: game schedules, scores, injuries, rosters (free)
- BallDontLie API: NBA team stats enrichment
- NHL Stats API: NHL team stats
- MLB Stats API: MLB team stats
- API-Football: Soccer (free plan limited; ESPN fallback active)

## Admin Information
- Admin username: jeffreywilliams (env: ADMIN_USERNAME)
- Admin pages: /admin, /admin/applications, /admin/launch-control,
  /admin/owner-playbook, /admin/marketing, /admin/guidelines, /admin/cards
- LCT settlement at: /admin/guidelines → LCT Settlement tab
- Card management at: /admin/cards

== END OF SORS MAXIMA PLATFORM KNOWLEDGE ==
`;

/** Short version for context-limited prompts */
export const SORS_CASHOUT_KNOWLEDGE = `
== SORS MAXIMA CASHOUT ENGINEERING STRATEGIES ==

Three proprietary cashout strategies are available in the Live Center → Cashout tab:

1. SPORTSBOOK SWEAT™ — Front-load 2 heavy favorites ("anchor legs" at -130 to -200),
   add 1-2 underdogs at the end ("pressure legs" at +120 to +250). When anchors win,
   the book's cashout offer may spike due to growing liability. Cash out at peak book
   exposure — targeting 40-80% ROI on the original stake based on typical behavior.
   Results vary; cashout availability depends on the sportsbook.

2. LOCK & ROLL™ — Progressive partial cashouts after each leg wins. After leg 1: take
   30% partial. After leg 2: take 25% more (targeting break-even). After leg 3:
   remaining amount rides with significantly reduced exposure. Designed to minimize
   downside risk — actual outcomes depend on sportsbook cashout availability.

3. STEAM EXIT™ — Build on line-movement picks. When remaining legs' lines move 5+
   points in your favor during the game, the book's cashout value exceeds fair value.
   Cash out to capture Closing Line Value (CLV) profit without needing the full win.

The Sweat Builder tool shows a live Cashout Ladder: estimated cashout value, ROI, and
Sportsbook Nervousness Score (0-100) after each leg wins. Optimal exit point is
automatically identified.

To use: Live Center → Cashout tab → Cashout Engineering (default).
`;

/** Combine with any existing system prompt */
export function withSorsKnowledge(existingPrompt: string): string {
  return `${existingPrompt}\n\n${SORS_PLATFORM_KNOWLEDGE}`;
}

export function withCashoutKnowledge(existingPrompt: string): string {
  return `${existingPrompt}\n\n${SORS_CASHOUT_KNOWLEDGE}`;
}

# Growth & Marketing Playbook — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

This is the tactical playbook for acquiring users, converting them to paid subscribers, and retaining them long-term. Everything described here can be executed using existing tools in the admin dashboard.

---

## Phase 1: First 100 Subscribers (Month 1–2)

### Goal
Get to 100 paying subscribers as fast as possible. This unlocks MRR, builds social proof, and creates real data for the learning engine.

### Tactics

**1. Your Own Network First**
The fastest path to early subscribers is personal outreach. Identify people in your life who:
- Bet on sports regularly (even casually)
- Follow sports obsessively
- Are interested in data and analytics
- Have disposable income ($50–$100/month is nothing to many sports fans)

Direct message them. Don't sell — offer a free trial and ask for their honest feedback. These early users become your best testimonials.

**2. Reddit**
The following subreddits have large, active sports betting communities:
- r/sportsbook (1.2M members)
- r/sportsbetting (600K members)
- r/nba, r/nfl, r/baseball (for sport-specific targeting)

**Don't spam.** Engage genuinely in discussions first. Share a well-reasoned pick breakdown using your engine's methodology. When people ask how you did the analysis, mention the platform. One valuable post in r/sportsbook can drive dozens of sign-ups.

**3. Twitter/X Sports Betting Community**
The sports betting community on X is massive and highly engaged. Strategy:
- Create a platform account (@SorsMaxima or similar)
- Post daily pick grades with reasoning (not the picks themselves — the methodology)
- Share track record data weekly
- Engage with other bettors and analysts
- Use hashtags: #SportsBetting #SharpMoney #Picks #NBAPicks #NFLPicks

Post the Track Record publicly. Transparency about wins AND losses builds trust fast.

**4. Discord**
Join major sports betting Discord servers and add value. Many have channels specifically for tools and resources. Be transparent that you built the platform.

**5. Promo Code for Early Adopters**
Create a 30-day free trial code for Sharp tier and share it in your early outreach. This removes the payment objection and lets people try before they buy.

Create promo codes in `/admin/promos`.

---

## Phase 2: 100–500 Subscribers (Month 2–4)

### Goal
Build systematic, repeatable acquisition channels. Move beyond personal network.

### Tactics

**1. Content Marketing (SEO)**
Create content that ranks on Google for:
- "Best sports betting picks today"
- "NBA picks with reasoning"
- "NFL betting analysis"
- "Sports betting analytics app"
- "How to beat the sportsbooks"

The Track Record page (`/track-record`) is already set up to be SEO-friendly. Add a blog (simple — can be a Medium publication or Substack) with weekly pick recaps and methodology articles.

**2. YouTube / TikTok**
Short-form video content explaining:
- How the 46-factor engine works
- Pick breakdowns (show the reasoning behind a pick)
- Week-in-review results
- Tutorial content ("How to read CLV")

This builds the brand and drives search traffic. Sports betting content gets strong organic reach.

**3. Affiliate Partnerships**
Find sports betting podcasts, YouTube channels, and newsletters and offer:
- Revenue share (20–30% of subscription revenue for referred users)
- Promo codes they can give their audience
- A free subscription for them to genuinely use and talk about

The platform's affiliate tracking can be set up through Stripe's referral system.

**4. Email List**
Build an email list of interested users (from sign-ups, content downloads, newsletter). Weekly email with:
- Top 3 picks of the week
- Track record update
- One educational insight
- A CTA to upgrade or start a trial

Use the lifecycle campaign tools in `/admin/lifecycle-campaigns` to automate these flows.

**5. Paid Social (When Ready)**
Facebook and Instagram ads targeting:
- Sports fans aged 25–45
- Interests: sports betting, DraftKings, FanDuel, fantasy sports
- Custom audiences from email list (lookalike targeting)

Start with $500/month to test. Track CAC from `/admin/acquisition`. Scale what works.

---

## Phase 3: 500–2,000 Subscribers (Month 4–12)

### Goal
Build a defensible brand and sustainable growth engine.

### Tactics

**1. Track Record as Marketing**
Your verified track record is your strongest marketing asset. A 55%+ win rate with documented picks is extraordinary in this space. Promote it relentlessly:
- Featured on homepage
- Shared weekly on social
- Compared against competitors on the pricing page
- Used in every ad

**2. Referral Program**
Enable your referral system:
- Members earn a free month for each referral
- Referral link in every user's profile and settings page
- Leaderboard of top referrers with prizes

Members who refer others have near-zero churn. This is your lowest-cost acquisition channel.

**3. Sports Season Hooks**
The biggest acquisition opportunities are at the start of major sports seasons:
- NFL season kickoff (September)
- NBA/NHL season start (October)
- March Madness (February–March)
- MLB Opening Day (April)
- Super Bowl (February)

Plan promotions 4–6 weeks in advance. Run time-limited trials, discounted first months, or bonus features for new subscribers who sign up during these windows.

**4. Sportsbook Affiliate Revenue**
Apply to affiliate programs for DraftKings, FanDuel, BetMGM. Add "Bet Now" deep-links to the odds display throughout the app. You'll earn $50–$200 per new depositor you refer. At 2,000 users, even a 2% click-through generates meaningful revenue.

Setup instructions are in the Monetization section of `/admin/monetization`.

**5. PR and Media**
At 1,000+ users and a documented track record, you have a legitimate story for sports media:
- Sports business publications (Sports Business Journal, Sportico)
- General tech media (TechCrunch, The Verge if angle is strong)
- Sports betting trade press (Legal Sports Report, Sports Handle)

Pitch angle: "Solo founder built an AI sports analytics platform that outperforms Vegas." That's a real story.

---

## Lifecycle Email Campaigns (Built-In)

These automated email sequences are already built. Launch them from `/admin/marketing` → Launch buttons.

| Campaign | Trigger | Goal |
|---|---|---|
| **Welcome Sequence** | New user signs up | Activate and engage in first 7 days |
| **Upgrade Nudge** | Free user at day 3, 7, and 14 | Convert to Sharp |
| **Trial Ending** | Trial expires in 3 days | Convert trial to paid |
| **VIP Unlock** | High-engagement free user | Offer exclusive trial of Edge features |
| **Win-Back** | User cancelled 30 days ago | Re-subscribe with offer |

Timing recommendations:
- Welcome: Immediate + day 3 + day 7
- Upgrade nudge: Day 3 (when they've seen value) + day 14 (before they forget)
- Win-back: 30 days after cancel, 60 days if no response

---

## Retention — Keeping Subscribers

Acquisition gets users in. Retention is where the money is. Here's what drives retention:

**1. Daily Value Delivery**
Members who use the app daily almost never cancel. The Command Center is designed to give value in 60 seconds every morning. Make sure new users understand this habit is the point.

**2. Win/Loss Transparency**
When the platform has a bad week, own it. Send an email explaining what happened, what the model learned, and why members should stay. Honesty builds loyalty. Silence causes cancellations.

**3. Intelligence Cards as Hooks**
The card collection system creates an emotional investment that's hard to cancel. Members who have a 6-month collection of cards have a psychological barrier to leaving. Promote the cards heavily.

**4. Feature Unlocking at Key Moments**
When a member is at high churn risk (flagged in `/admin/user-health`), trigger a personal outreach or a feature unlock. Give them something new to try before they cancel.

**5. Community**
Members who connect with other members in the community almost never cancel. The Discord integration and community leaderboard are designed for this. Encourage community participation from day one.

---

## Key Metrics to Watch

Monitor these weekly in `/admin/growth` and `/admin/analytics-dashboard`:

| Metric | Healthy Target | Warning Sign |
|---|---|---|
| Monthly churn rate | Below 5% | Above 8% |
| Trial-to-paid conversion | Above 25% | Below 15% |
| Daily active users / subscribers | Above 60% | Below 40% |
| Average revenue per user (ARPU) | Above $85 | Below $60 |
| Net Promoter Score (NPS) | Above 40 | Below 20 |
| Pick win rate | Above 54% | Below 52.4% (break-even) |

---

## Marketing Calendar (Year 1)

| Month | Event | Marketing Push |
|---|---|---|
| March | March Madness | NCAAB promotion, trial offer |
| April | MLB Opening Day | MLB prop picks launch |
| June | NBA Playoffs | Playoff special |
| August | NFL Preseason | NFL prop picks launch, biggest promotion of year |
| September | NFL Week 1 | Biggest sign-up opportunity |
| October | NBA/NHL Season | Multi-sport launch campaign |
| January | NFL Playoffs + CFP | Playoff push |
| February | Super Bowl | Super Bowl special |

# Environment Variables & Secrets Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Overview

This document lists every environment variable and secret the platform uses, what it does, where to find or generate it, and what breaks if it's missing. Store all secrets in Replit's Secrets manager (never in code).

---

## Critical — Platform Will Not Function Without These

### `ADMIN_USERNAME`
**What it does:** The username for the owner/admin account.
**Current value:** `jeffreywilliams`
**Where to set:** Replit Secrets
**What breaks if missing:** Admin login fails completely.

### `ADMIN_PASSWORD`
**What it does:** The password for the owner/admin account.
**Current value:** Stored securely in Replit Secrets
**Where to set:** Replit Secrets
**What breaks if missing:** Admin login fails completely.
**Security note:** Change this if you ever suspect compromise. Use a strong password (16+ characters, mixed case, symbols, numbers).

### `DATABASE_URL`
**What it does:** PostgreSQL connection string for the Replit-managed database.
**Format:** `postgresql://user:password@host:port/dbname`
**Where to set:** Replit provides this automatically when you enable the database integration.
**What breaks if missing:** ALL data storage fails — users can't register, picks can't be saved, nothing persists.

---

## Revenue — Stripe Payments

### `STRIPE_SECRET_KEY`
**What it does:** Allows the server to create subscriptions, charge customers, and manage billing.
**Format:** `sk_live_...` (production) or `sk_test_...` (testing)
**Where to get it:** Stripe Dashboard → Developers → API Keys
**Where to set:** Replit Secrets (via Stripe integration connector)
**What breaks if missing:** Subscriptions can't be created, payments fail, Stripe runs in demo mode.

### `STRIPE_PUBLISHABLE_KEY`
**What it does:** Used on the frontend to initialize Stripe Elements (the payment form).
**Format:** `pk_live_...` (production) or `pk_test_...` (testing)
**Where to get it:** Stripe Dashboard → Developers → API Keys
**Where to set:** Replit Secrets (via Stripe integration connector)
**What breaks if missing:** The checkout page can't load — users can't enter payment details.

### `STRIPE_WEBHOOK_SECRET`
**What it does:** Verifies that webhook events (subscription activated, payment failed, etc.) actually come from Stripe and haven't been tampered with.
**Format:** `whsec_...`
**Where to get it:** Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret
**Where to set:** Replit Secrets
**What breaks if missing:** Webhook signature validation fails — subscription status won't update after payment.

### Stripe Price IDs (Hardcoded in codebase)
These are not env vars but are critical to know:

| Tier | Price ID | Billing |
|---|---|---|
| Sharp ($49/mo) | `price_1T9g5NCsa9MEIxma4ubid3pw` | Monthly |
| Edge ($99/mo) | `price_1T9g6TCsa9MEIxmarohPvZl3` | Monthly |
| Max ($249/mo) | `price_1T9g8BCsa9MEIxma2XrUZW6C` | Monthly |

If you ever need to change pricing, you'll create new Price IDs in Stripe and update these references in the codebase.

---

## AI — OpenAI

### `OPENAI_API_KEY`
**What it does:** Powers the AI betting assistant (GPT-4o), admin AI assistant, AI pick explainer, and marketing copy generator.
**Format:** `sk-...`
**Where to get it:** platform.openai.com → API Keys
**Where to set:** Replit Secrets (via OpenAI integration connector)
**What breaks if missing:** All AI chat features fail. Pick explanations become generic. Admin AI assistant stops working.
**Cost note:** The app uses `gpt-4o-mini` for most operations (cheap) and `gpt-4o` only for high-value analysis. Monitor usage in the API Budget admin tool.

---

## Data — Sports & Odds APIs

### `ODDS_API_KEY`
**What it does:** Fetches real-time odds from 40+ sportsbooks via The Odds API. Powers the Odds Center, EV calculations, line movement tracking, and arbitrage scanner.
**Where to get it:** the-odds-api.com → Dashboard → API Key
**Where to set:** Replit Secrets
**What breaks if missing:** Odds Center shows no data. EV calculations use estimated lines only. Arbitrage scanner stops working.
**Cost note:** Free tier = 500 requests/month. Paid plans from $79/month. Current app uses ~300–400 calls/day — you'll need a paid plan once live.

### `API_FOOTBALL_KEY`
**What it does:** International soccer fixture data, team stats, and league standings for EPL, La Liga, Bundesliga, Serie A, etc.
**Where to get it:** api-football.com → Dashboard
**Where to set:** Replit Secrets
**What breaks if missing:** International soccer picks become unavailable. The `/international` page shows no fixtures.

### `BALLDONTLIE_API_KEY`
**What it does:** NBA player stats — points, rebounds, assists, efficiency metrics used in prop picks.
**Where to get it:** balldontlie.io → API Key
**Where to set:** Replit Secrets
**What breaks if missing:** NBA player props degrade to estimated stats. Some pick explanations lose depth.

---

## Email — Transactional & Marketing

### `RESEND_API_KEY`
**What it does:** Sends all platform emails — welcome emails, email verification, password resets, subscription confirmations, lifecycle campaign emails, and admin alerts.
**Where to get it:** resend.com → API Keys
**Where to set:** Replit Secrets
**What breaks if missing:** No emails send at all. Users can't verify accounts. Password reset fails. Lifecycle campaigns don't trigger.

---

## Monitoring — Error Tracking

### `SENTRY_DSN`
**What it does:** Sends server errors and exceptions to Sentry for monitoring. Alerts you when something crashes in production.
**Format:** `https://...@....ingest.sentry.io/...`
**Where to get it:** sentry.io → Project → Settings → Client Keys
**Where to set:** Replit Secrets
**What breaks if missing:** Errors still happen but you won't get notified. The app runs fine without it — you just lose visibility into production errors.
**Recommendation:** Set this up before going live. Silent failures are dangerous.

---

## Secret Rotation Policy

| Secret | Rotate When | Recommended Frequency |
|---|---|---|
| ADMIN_PASSWORD | Suspected compromise | Every 6 months |
| STRIPE_SECRET_KEY | Staff change, compromise | Annually or on demand |
| OPENAI_API_KEY | Unexpected usage spike | On demand |
| RESEND_API_KEY | On demand | Annually |
| All others | On compromise | On demand |

---

## Checking Secret Status

In the admin dashboard at `/admin/api-budget`, you can see which API keys are loaded and their usage levels. If a key is missing or invalid, it will show as "not configured" or "demo mode."

You can also check the server startup logs — every API key manager reports on startup:
```
[ApiKeyManager] odds: 1 key(s) loaded
[ApiKeyManager] openai: 1 key(s) loaded
[ApiKeyManager] stripe: 1 key(s) loaded
```

If any shows `0 key(s) loaded`, that integration is running in degraded/demo mode.

---

## Environment Setup Checklist (for a fresh deployment)

- [ ] `ADMIN_USERNAME` set
- [ ] `ADMIN_PASSWORD` set (strong password)
- [ ] `DATABASE_URL` configured (Replit DB integration)
- [ ] `STRIPE_SECRET_KEY` configured
- [ ] `STRIPE_PUBLISHABLE_KEY` configured
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] `OPENAI_API_KEY` configured
- [ ] `ODDS_API_KEY` configured
- [ ] `API_FOOTBALL_KEY` configured
- [ ] `BALLDONTLIE_API_KEY` configured
- [ ] `RESEND_API_KEY` configured
- [ ] `SENTRY_DSN` configured (optional but recommended)

# Omnivex Ecosystem — Master Epic Overview

**Epic ID:** `EPIC-000`
**Owner:** Jeffrey Williams
**Status:** Active Development
**GitLab Group:** `omnivex`
**Total Repositories:** 59 (18 active product apps + supporting infrastructure)
**Last Updated:** 2026-04-06

---

## Vision

Omnivex is a unified, dark-themed SaaS ecosystem built under the **OmniDLOS** (Omnivex Dark Layer Operating System) design language. Every application shares a consistent visual identity, authentication layer, payment infrastructure, and proprietary engine suite — giving users a seamless cross-product experience while allowing each app to operate independently as a vertically-focused SaaS product.

The ecosystem targets individuals, families, small businesses, and enterprises across 18 verticals: social networking, legal, genealogy, cybersecurity, autism support, emergency preparedness, project management, events, auto care, music, trading, holistic health, gaming, fitness, mental health, education, financial management, and legal protection.

---

## Design System — OmniDLOS

All 18 apps share the following design language. Every developer must adhere to these tokens without exception.

### Color Tokens

```css
/* Base palette */
--color-bg-primary:       #0a0a0a;   /* Main background */
--color-bg-secondary:     #111111;   /* Card / panel background */
--color-bg-tertiary:      #1a1a1a;   /* Input / hover backgrounds */
--color-accent:           #0EA5E9;   /* Sky blue — primary accent (Tailwind sky-500) */
--color-accent-hover:     #38BDF8;   /* Lighter accent on hover (sky-400) */
--color-accent-muted:     #0EA5E920; /* Accent at 12% opacity for glows/borders */
--color-text-primary:     #F8FAFC;   /* Primary text (slate-50) */
--color-text-secondary:   #94A3B8;   /* Secondary / muted text (slate-400) */
--color-text-disabled:    #475569;   /* Disabled state (slate-600) */
--color-border:           #1E293B;   /* Default border (slate-800) */
--color-border-accent:    #0EA5E940; /* Accent-tinted border */
--color-success:          #22C55E;   /* Green (green-500) */
--color-warning:          #F59E0B;   /* Amber (amber-500) */
--color-error:            #EF4444;   /* Red (red-500) */
--color-info:             #0EA5E9;   /* Same as accent */
```

### Glass-Morphism Pattern

```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 12px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(14, 165, 233, 0.05) inset;
}
```

### Typography

```css
--font-display: 'Inter', 'SF Pro Display', system-ui, sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;
```

### Tailwind Config Extension

All apps must extend `tailwind.config.ts` with the Omnivex color palette:

```ts
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        omnivex: {
          bg:       '#0a0a0a',
          card:     '#111111',
          input:    '#1a1a1a',
          accent:   '#0EA5E9',
          'accent-hover': '#38BDF8',
          'accent-muted': '#0EA5E920',
          border:   '#1E293B',
          text:     '#F8FAFC',
          muted:    '#94A3B8',
        },
      },
      fontFamily: {
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: { xs: '2px' },
    },
  },
};
```

---

## Technology Stack (All Apps)

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5+ (strict mode) |
| Styling | Tailwind CSS 3+ + OmniDLOS tokens |
| UI Primitives | Radix UI (headless) |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| State | Zustand (client) + TanStack Query (server) |
| Icons | Lucide React |
| Charts | Recharts / Victory |
| Testing | Vitest + React Testing Library + Playwright |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Next.js API Routes OR Express.js microservice |
| Language | TypeScript 5+ (strict mode) |
| ORM | Prisma 5+ |
| Database | PostgreSQL 16 (primary) |
| Cache | Redis 7 |
| Auth | NextAuth.js v5 / Auth.js |
| File Storage | Supabase Storage / AWS S3 |
| Email | Resend |
| Payments | Stripe |
| Queue | BullMQ (Redis-backed) |

### Infrastructure
| Layer | Technology |
|---|---|
| CI/CD | GitLab CI/CD |
| Deployment | Netlify (frontend) |
| Monitoring | Sentry |
| Analytics | PostHog |
| Secrets | GitLab CI Variables (masked + protected) |

---

## Proprietary Engines

These engines are internal Omnivex packages (`@omnivex/engines`). Each app integrates the engines relevant to its vertical.

| Engine | Purpose | Primary Apps |
|---|---|---|
| **ChromaFeel** | Dynamic color/theme personalization based on user mood/context | All apps |
| **EmotionDNA** | Emotion pattern recognition and behavioral profiling | Nova-MindCare, Nova-FitLife, 4everacy |
| **FrictionMap** | UX friction detection and flow optimization | All apps |
| **HabitGenome** | Habit formation modeling and streak tracking | Nova-FitLife, Nova-LearnPath, Nova-MindCare |
| **TrustTopology** | Trust graph — maps relationships and permission chains | 4everacy, Sors-Maxima, Nova-LegalGuard |
| **OmniScript** | Proprietary DSL for defining workflows, rules, and automation sequences | All apps (workflow engine) |

### OmniScript DSL — Quick Reference

OmniScript is a YAML-based declarative DSL interpreted server-side:

```yaml
# Example OmniScript workflow definition
workflow:
  id: onboarding-flow
  trigger: user.created
  steps:
    - action: email.send
      template: welcome
      to: "{{ user.email }}"
    - action: habit.seed
      engine: HabitGenome
      profile: "{{ user.preferences }}"
    - condition:
        if: "{{ user.subscription == 'pro' }}"
        then:
          - action: feature.unlock
            features: ['advanced-analytics', 'ai-insights']
```

---

## Authentication Architecture

All apps use a shared `@omnivex/auth` package built on Auth.js v5:

- **Providers:** Email/password, Google OAuth, GitHub OAuth
- **Sessions:** JWT (short-lived, 15min) + Refresh tokens (Redis, 7 days)
- **RBAC:** Roles — `user`, `pro`, `admin`, `super_admin`
- **MFA:** TOTP (via `@otplib/totp`) optional for all, required for `admin`
- **SSO:** Cross-app session sharing via shared cookie domain `.omnivex.app`

---

## Payment Architecture

All monetized apps use Stripe:

- **Products:** Monthly subscriptions + one-time purchases
- **Billing Portal:** Stripe Customer Portal (hosted)
- **Webhooks:** Each app handles `customer.subscription.*`, `invoice.*`, `payment_intent.*`
- **Shared Package:** `@omnivex/stripe` — wraps Stripe SDK with standard event handlers
- **Tiers (standard):**
  - Free — limited features
  - Pro ($9.99–$29.99/mo) — full feature set
  - Business ($49.99–$99.99/mo) — team features + API access
  - Enterprise — custom pricing

---

## Repository Structure Convention

Each app repo follows this structure:

```
app-name/
├── .gitlab-ci.yml              # Inherits from /gitlab-ci/.gitlab-ci.yml
├── .env.example
├── README.md
├── package.json
├── tsconfig.json               # Strict mode
├── tailwind.config.ts
├── next.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth route group
│   │   ├── (dashboard)/        # Protected route group
│   │   ├── api/                # API routes
│   │   └── layout.tsx          # Root layout (OmniDLOS theme)
│   ├── components/
│   │   ├── ui/                 # Shared primitives (glass cards, buttons)
│   │   ├── layout/             # Header, sidebar, footer
│   │   └── [feature]/          # Feature-specific components
│   ├── lib/
│   │   ├── auth.ts             # Auth.js config
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── stripe.ts           # Stripe client
│   │   ├── redis.ts            # Redis client
│   │   └── engines/            # Proprietary engine clients
│   ├── hooks/                  # React custom hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Active Apps — Master Index

| # | App | Vertical | Stripe | Key Engines |
|---|---|---|---|---|
| 01 | 4everacy-platform | Social Networking | ✓ | EmotionDNA, TrustTopology, FrictionMap |
| 02 | Sors-Maxima | Legal / Dispute Resolution | ✓ | TrustTopology, OmniScript |
| 03 | Tree-AI | Genealogy | ✓ | HabitGenome, OmniScript |
| 04 | NovaShield | Cybersecurity | ✓ | TrustTopology, FrictionMap |
| 05 | Nova-AutismConnect | Autism Support | ✓ | EmotionDNA, HabitGenome, ChromaFeel |
| 06 | Nova-SurvivalGuide | Emergency Preparedness | ✓ | OmniScript, HabitGenome |
| 07 | Nova-ProjectHub | Project Management | ✓ | FrictionMap, OmniScript |
| 08 | Nova-EventFamily | Events / Family Planning | ✓ | OmniScript, HabitGenome |
| 09 | Nova-AutoCare | Auto Care Subscriptions | ✓ | HabitGenome, OmniScript |
| 10 | NovaMusic | Music Platform | ✓ | EmotionDNA, ChromaFeel |
| 11 | TradeNova | Trading Platform | ✓ | FrictionMap, TrustTopology |
| 12 | Nova-Holistic-Health | Holistic Health / Wellness | ✓ | EmotionDNA, HabitGenome, ChromaFeel |
| 13 | NovaRivals | Gaming / Competition | ✓ | TrustTopology, FrictionMap |
| 14 | Nova-FitLife | Fitness / Lifestyle | ✓ | HabitGenome, EmotionDNA, FrictionMap |
| 15 | Nova-MindCare | Mental Health | ✓ | EmotionDNA, HabitGenome, ChromaFeel |
| 16 | Nova-LearnPath | Education / Learning Paths | ✓ | HabitGenome, OmniScript, FrictionMap |
| 17 | Nova-FinVault | Financial Management | ✓ | TrustTopology, FrictionMap |
| 18 | Nova-LegalGuard | Legal Protection Services | ✓ | TrustTopology, OmniScript |

---

## Cross-App Integration Points

```
4everacy-platform
  ├── SSO provider for all other Omnivex apps
  ├── Unified notification feed (aggregates events from all apps)
  └── Omnivex profile page links to all connected apps

Nova-FinVault
  ├── Receives financial events from TradeNova
  └── Tracks subscription costs from all Omnivex apps (via Stripe webhooks)

Nova-MindCare
  ├── Receives mood/stress signals from Nova-FitLife
  └── Feeds well-being scores to Nova-HolisticHealth

Nova-LearnPath
  ├── Course completion badges surface in 4everacy profile
  └── Integrates Nova-ProjectHub for team learning tracks
```

---

## Definition of Done (All Issues)

Before closing any issue, the following must be satisfied:

- [ ] All TypeScript errors resolved (`tsc --noEmit` exits 0)
- [ ] ESLint passes with zero warnings
- [ ] Unit test coverage ≥ 80% on business logic
- [ ] Integration tests pass against test database
- [ ] Playwright E2E smoke tests pass
- [ ] OmniDLOS design tokens applied — no hardcoded colors
- [ ] Mobile responsive (320px–1920px)
- [ ] WCAG 2.1 AA accessibility (Axe audit passes)
- [ ] Stripe webhooks tested with Stripe CLI
- [ ] All `.env.example` variables documented
- [ ] GitLab CI pipeline passes (all stages green)
- [ ] README updated with local dev setup instructions
- [ ] Security scan (SAST + dependency scan) passes

---

## Local Development Setup (All Apps)

```bash
# 1. Clone the repo
git clone git@gitlab.com:omnivex/<app-name>.git
cd <app-name>

# 2. Install dependencies
npm install

# 3. Copy and fill environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET,
#          STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.

# 4. Start local services (Docker)
docker compose up -d postgres redis

# 5. Run Prisma migrations
npx prisma migrate dev

# 6. Seed the database
npx prisma db seed

# 7. Start dev server
npm run dev
# App available at http://localhost:3000

# 8. Run Stripe webhook listener (separate terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 9. Run tests
npm run test:unit
npm run test:integration
npm run test:e2e
```

---

*This document is the single source of truth for the Omnivex ecosystem architecture. All individual app issue templates reference and extend this overview.*

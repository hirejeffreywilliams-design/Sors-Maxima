# SORS MAXIMA — INVESTOR DATA ROOM CHECKLIST

**Confidential — For Due Diligence Preparation**
**March 2026**

> *This checklist covers every document category a serious investor or strategic acquirer will request during due diligence. Each item includes what it is, why investors ask for it, and whether Sors Maxima currently has it ready. Use this to prioritize preparation before any investor meeting.*

---

## STATUS KEY

- ✅ **Exists** — Document is ready and available (file path or location noted)
- 🔲 **Needs to be created** — Does not yet exist; must be prepared before investor engagement
- ➖ **Not applicable** — Not relevant at the current pre-revenue stage

---

## 1. COMPANY & LEGAL

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 1.1 | Certificate of Incorporation / LLC Formation | Confirms the business legally exists | 🔲 Needs to be created | No legal entity filed yet. Must form LLC before accepting revenue or investment. |
| 1.2 | Operating Agreement / Bylaws | Defines ownership structure, voting rights, and governance | 🔲 Needs to be created | Required after LLC formation |
| 1.3 | Cap Table | Shows who owns what percentage of the company | 🔲 Needs to be created | Single founder — 100% ownership assumed. Formalize after entity formation. |
| 1.4 | Terms of Service (ToS) | Legal agreement governing member use of the platform | 🔲 Needs to be created | Draft exists in `server/companyStandards.ts` (Acceptable Use Policy, Subscription & Refund Policy) but not published as a standalone legal document |
| 1.5 | Privacy Policy | GDPR/CCPA compliance; explains data collection and usage | 🔲 Needs to be created | Data handling practices defined in `server/companyStandards.ts` (Privacy & Data Policy) but not published as a standalone legal document |
| 1.6 | Responsible Gambling Disclaimer | Regulatory compliance for betting-adjacent services | ✅ Exists | `server/companyStandards.ts` — RESPONSIBLE_GAMBLING constant; displayed on platform pages |
| 1.7 | Intellectual Property Assignment Agreement | Confirms all IP is owned by the company, not an individual | 🔲 Needs to be created | Currently all IP is personal work product of the founder. Assignment to the LLC required after entity formation. |
| 1.8 | Trademark Registrations | Formal IP protection for brand names | 🔲 Needs to be created | 8 common law trademarks in active use (listed in `docs/BUSINESS_OWNER_DOCUMENT.md` Section 2.1). USPTO registration recommended. |
| 1.9 | Any Existing Contracts | Licensing, partnerships, employment | ➖ Not applicable | No contracts, partnerships, employees, or licensing agreements exist. Solo founder pre-revenue. |
| 1.10 | Insurance Policies | General liability, E&O, cyber liability | 🔲 Needs to be created | No insurance coverage currently. Recommend general liability + cyber liability before accepting members. |

---

## 2. TECHNOLOGY & INTELLECTUAL PROPERTY

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 2.1 | IP Inventory / Asset Register | Complete list of proprietary technology and brand assets | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 2 (Intellectual Property Inventory): 8 trademarks, 50+ named engines, 7 proprietary methodologies, 5 UI/UX concepts, 5 data assets |
| 2.2 | Technology Architecture Overview | How the system works at a business level | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 3 (Platform Architecture Summary): data pipeline, 7-step flow, tier model |
| 2.3 | Codebase Summary | Scale and scope of the software asset | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 1: 88 frontend pages, 50+ engine files, 16 route files, 6 test suites |
| 2.4 | Source Code Access | Due diligence review of actual code quality | ✅ Exists | Full codebase on Replit — can provide read-only access to qualified investors under NDA |
| 2.5 | Test Suite Documentation | Evidence of software quality and reliability | ✅ Exists | `server/__tests__/` — 6 test files: monteCarloEngine, quantumFusionEngine, settlementFlow, tierGating, stripeService, sportSeasons |
| 2.6 | Third-Party Dependency List | External services the platform relies on | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 5: 9 external services with role, fallback status, and risk assessment |
| 2.7 | API Documentation | Endpoints, authentication, rate limits | 🔲 Needs to be created | API routes exist in `server/routes/` (16 files) but no external API documentation generated |
| 2.8 | Security Architecture | How user data and platform integrity are protected | ✅ Exists (partial) | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 8 (Legal & Compliance): data handling, PII minimization, IP monitoring, session fingerprinting. No formal penetration test report. |
| 2.9 | Technical Debt Assessment | Known quality issues and remediation plan | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 1: 4 technical debt items identified with severity and mitigation path |
| 2.10 | Trade Secret Documentation | Formal designation of proprietary model weights as trade secrets | 🔲 Needs to be created | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 2.7 identifies this as a high-priority action |

---

## 3. PRODUCT

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 3.1 | Product Overview / Feature List | What the product does and who it serves | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Sections 1 and 3: executive overview, value proposition, tier features |
| 3.2 | Product Demo / Screenshots | Visual proof the product works | 🔲 Needs to be created | Platform is live and functional — prepare screen recordings or live demo walkthrough |
| 3.3 | Feature Comparison vs. Competitors | Competitive positioning | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 1: feature comparison table vs. Action Network, OddsJam, Unabated |
| 3.4 | Product Roadmap | What's planned next | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 5 (Phases 1–2): native mobile app, Discord integration, B2B licensing, international expansion |
| 3.5 | Production Readiness Assessment | What's ready vs. what needs hardening | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 1: production-ready list and hardening requirements |
| 3.6 | Brand Voice & Standards | How the product communicates | ✅ Exists | `server/companyStandards.ts` — Complete brand voice, prohibited language, grade standards, AI compliance context |
| 3.7 | User Testimonials / Case Studies | Social proof from real users | ➖ Not applicable | Pre-launch — no users yet. First priority after soft launch with founding members. |
| 3.8 | Track Record / Performance History | Verified prediction accuracy | ➖ Not applicable | Pre-launch — no historical pick data against live markets yet. Track record logging is built and ready to begin recording from Day 1. |

---

## 4. FINANCIAL

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 4.1 | Financial Projections (3–5 year) | Revenue, cost, and profitability outlook | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 4: Revenue scenarios at 6 member scales, itemized cost model, break-even thresholds |
| 4.2 | Unit Economics (ARPU, LTV, CAC, Churn) | Business model viability | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 4: ARPU derivation ($119), LTV/CAC analysis by channel, churn assumptions |
| 4.3 | Pricing Model Documentation | Tier structure and rationale | ✅ Exists | `server/companyStandards.ts` — TIER_STANDARDS; `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 4: full pricing breakdown |
| 4.4 | Valuation Analysis | Current and projected company value | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Sections 4 and 8: SaaS multiples table, 3-scenario valuation at Year 5/10/25, replacement cost and strategic value |
| 4.5 | Historical Financial Statements | P&L, balance sheet, cash flow | ➖ Not applicable | Pre-revenue — no financial history. All investment/expenses to date are founder personal spending. |
| 4.6 | Stripe Account Status | Payment processor is active and compliant | 🔲 Needs to be verified | Stripe integration is built and tested. Confirm live mode activation before investor meetings. |
| 4.7 | Bank Statements | Cash on hand and spending history | ➖ Not applicable | No company bank account — no entity formed yet |
| 4.8 | Known Unknowns / Assumption Register | What could change the financial picture | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 4: "Known Unknowns" — 6 critical variables, plus Assumptions Appendix with confidence tiers |

---

## 5. MARKET

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 5.1 | Market Size Analysis (TAM/SAM/SOM) | How big is the opportunity | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 3: Global GGR data (AGA, Grand View), Layer 3 TAM sizing, addressable market at 6 scales |
| 5.2 | Comparable Company Analysis | What similar businesses achieved | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 3: 6 comparable businesses with outcomes, revenue, strengths, and weaknesses |
| 5.3 | SWOT Analysis | Structured strategic assessment | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 2: 10 strengths, 8 weaknesses, 8 opportunities, 7 threats |
| 5.4 | Regulatory Landscape Summary | Legal risk assessment | ✅ Exists (partial) | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 8; `docs/PLATFORM_EVALUATION_100YR.md` — Risk Register. Not a formal legal opinion — recommend consultation with a sports gaming attorney. |
| 5.5 | Go-to-Market Plan | How you'll acquire customers | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Sections 3 and 7: channel strategy by scale, content marketing plan, referral program, 30-day and 12-month action plans |
| 5.6 | Competitive Positioning Map | Where you sit vs. competitors | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 3: ecosystem map (4 layers) and competitor comparison table in Section 1 |

---

## 6. TEAM

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 6.1 | Founder Bio / Resume | Who built this and their background | 🔲 Needs to be created | Prepare a 1-page founder bio highlighting relevant experience (technical, sports analytics, entrepreneurship) |
| 6.2 | Org Chart / Team Structure | Who runs the business | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 9: Single founder, solo operator. Hiring plan at $10K+ MRR. |
| 6.3 | Advisory Board | External expertise and credibility | ➖ Not applicable | No advisors currently. Consider recruiting 1–2 advisors (sports industry, SaaS scaling) before fundraising. |
| 6.4 | Hiring Plan | When and who to hire | ✅ Exists | `docs/BUSINESS_OWNER_DOCUMENT.md` — Section 9: milestones-based hiring plan (part-time support at $5K MRR, contractor at $10K MRR, full-time at $25K MRR) |
| 6.5 | Key Person Risk Assessment | What happens if the founder is unavailable | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Risk Register item #4: Platform auto-operates 30+ days; emergency admin access recommended |
| 6.6 | Employment / Contractor Agreements | Legal terms for any team members | ➖ Not applicable | Solo founder — no employees or contractors |

---

## 7. RISK

| # | Document | Why Investors Ask | Status | Location / Notes |
|:-:|----------|------------------|:------:|-----------------|
| 7.1 | Risk Register | Top business risks with mitigation | ✅ Exists | `docs/PLATFORM_EVALUATION_100YR.md` — Section 6: Top 10 risks with likelihood, impact, existential classification, and mitigation strategies |
| 7.2 | Data Backup & Recovery Plan | What happens if data is lost | 🔲 Needs to be created | Currently relies on Replit's default PostgreSQL backup. Need explicit backup policy and off-platform export schedule. |
| 7.3 | Business Continuity Plan | What happens if the founder is unavailable | 🔲 Needs to be created | Partial — platform auto-operates, but no formal documented BCP. Need emergency credentials vault and succession instructions. |
| 7.4 | Compliance Checklist | Regulatory compliance status | ✅ Exists (partial) | `server/companyStandards.ts` — COMPLIANCE_STANDARDS and RESPONSIBLE_GAMBLING; Platform displays required disclaimers. No formal legal compliance audit performed. |
| 7.5 | Penetration Test Report | Security posture assessment | 🔲 Needs to be created | No external security audit. Platform has multi-layered security (IP blocking, rate limiting, session fingerprinting, CSRF, PII minimization). Recommend pen test before enterprise sales. |
| 7.6 | Insurance Coverage Summary | Financial protection against liability | 🔲 Needs to be created | No insurance currently. See item 1.10. |

---

## SUMMARY SCORECARD

| Category | Total Items | ✅ Ready | 🔲 Needs Work | ➖ N/A |
|----------|:----------:|:-------:|:------------:|:-----:|
| Company & Legal | 10 | 1 | 8 | 1 |
| Technology & IP | 10 | 7 | 3 | 0 |
| Product | 8 | 5 | 1 | 2 |
| Financial | 8 | 4 | 1 | 3 |
| Market | 6 | 6 | 0 | 0 |
| Team | 6 | 2 | 1 | 3 |
| Risk | 6 | 2 | 4 | 0 |
| **TOTAL** | **54** | **27** | **18** | **9** |

**50% of the data room is ready.** The technology, product, market, and financial documentation is strong. The gaps are primarily in legal formation (LLC, ToS, IP assignment), operational documentation (backup plan, BCP), and formal security assessment. These are typical for a pre-revenue solo-founder platform.

---

## PRIORITY ORDER FOR DATA ROOM PREPARATION

**Before any investor meeting (critical path):**

| Priority | Item | Effort | Why |
|:--------:|------|:------:|-----|
| 1 | Form LLC and draft Operating Agreement | 1–2 weeks | Investors cannot invest in a sole proprietorship |
| 2 | Write and publish Terms of Service | 2–4 hours | Legal protection; shows professional operation |
| 3 | Write and publish Privacy Policy | 2–4 hours | GDPR/CCPA compliance signal |
| 4 | Prepare a product demo (screen recording or live walkthrough) | 2–3 hours | Investors need to see the product working |
| 5 | Write 1-page founder bio | 30 minutes | Every investor asks for this |
| 6 | Assign IP from personal to LLC | 1 hour (with attorney) | IP must be company-owned for investment |

**Before first check is written (important but not blocking):**

| Priority | Item | Effort | Why |
|:--------:|------|:------:|-----|
| 7 | File USPTO trademarks for "Sors Maxima" and "Life Changer Ticket" | 2–4 weeks (with attorney) | Strengthens IP defensibility |
| 8 | Set up off-platform database backup | 2–4 hours | Existential risk mitigation |
| 9 | Document business continuity plan | 1–2 hours | Addresses #1 investor concern for solo-founder companies |
| 10 | Verify Stripe Live Mode is active | 30 minutes | Must be ready before accepting real payments |
| 11 | Obtain general liability + cyber insurance | 1–2 weeks | Standard investor expectation |
| 12 | Prepare formal cap table | 1 hour | Formalizes ownership structure |

---

*This checklist was prepared based on standard institutional investor due diligence requirements. Actual investor requests may vary. Consult with legal counsel before entering any investment discussions.*

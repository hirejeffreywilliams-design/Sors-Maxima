/**
 * Sors Maxima Company Standards
 *
 * Single source of truth for all platform standards.
 * Injected into every AI prompt and used for content validation.
 * Admin can view these in the Policy & Standards dashboard.
 */

export const PLATFORM_NAME = "Sors Maxima";
export const MODEL_NAME = "46-Factor Model Analysis™";
export const CASHOUT_BRAND = "Cashout Engineering™";

export const GRADE_STANDARDS = {
  "A+": { minConfidence: 85, minEV: 25, label: "Elite Pick", description: "Top-tier model conviction — maximum confidence, highest projected edge" },
  "A":  { minConfidence: 75, minEV: 18, label: "Sharp Pick", description: "High-confidence selection with strong statistical edge" },
  "B+": { minConfidence: 65, minEV: 12, label: "Strong Pick", description: "Above-average model conviction — solid edge above market" },
  "B":  { minConfidence: 55, minEV:  8, label: "Solid Pick",  description: "Positive EV detected — standard intelligence pick" },
  "B-": { minConfidence: 50, minEV:  5, label: "Value Pick",  description: "Marginal edge identified — requires favorable line" },
  "C":  { minConfidence:  0, minEV:  0, label: "Informational", description: "Below model threshold — informational only, not recommended" },
} as const;

export const MODEL_STANDARDS = {
  minEVForPublication: 5,
  minConfidenceForPublication: 50,
  maxLegsPerParlay: 6,
  minLegsPerParlay: 2,
  defaultKellyFraction: 0.25,
  maxDailyCapPct: 10,
  simulationsPerMatchup: 10000,
  deepSimulationsPerMatchup: 100000,
  factorCount: 46,
  calibrationWindow: 90,
} as const;

export const PROHIBITED_PHRASES = [
  "guaranteed profit",
  "guaranteed win",
  "guaranteed returns",
  "zero-loss",
  "can't lose",
  "cannot lose",
  "risk-free bet",
  "risk free bet",
  "100% win",
  "sure thing",
  "lock of the century",
  "free money",
  "arbitrage guaranteed",
  "locked-in profit",
  "no-brainer win",
] as const;

export const BRAND_VOICE = {
  tone: "Professional, direct, analytical, data-driven",
  style: "Concise insights backed by statistical evidence. No hype. No false promises.",
  person: "Third person for teams. First person plural (we/our) for platform references.",
  prohibited: PROHIBITED_PHRASES,
  preferred: [
    "Model projects",
    "Statistical edge",
    "The 46-Factor Model rates",
    "Data indicates",
    "Sharp money suggests",
    "Historical patterns show",
    "Expected value of",
    "Monte Carlo simulations project",
  ],
  maxPickExplanationSentences: 3,
  maxInsightWords: 30,
} as const;

export const RESPONSIBLE_GAMBLING = {
  requiredDisclaimer: "Sports betting involves financial risk. Past performance does not guarantee future results.",
  hotline: "National Problem Gambling Helpline: 1-800-522-4700",
  website: "www.ncpgambling.org",
  ageRequirement: 21,
  selfExclusionEnabled: true,
  displayOnParlayBuilder: true,
  displayOnPicksPage: true,
  displayInOnboarding: true,
} as const;

export const TIER_STANDARDS = {
  free:      { label: "Free",              price: 0,    features: ["public picks"] },
  pro:       { label: "Sharp",             price: 49,   features: ["daily picks", "parlay builder", "basic AI analysis"] },
  elite:     { label: "Edge",              price: 99,   features: ["all Sharp features", "LCT", "live odds", "advanced analytics", "cashout advisor"] },
  whale:     { label: "Max",               price: 249,  features: ["all Edge features", "unlimited AI", "all engines", "priority data"] },
  operator:  { label: "Community Operator", price: 499, features: ["all Max features", "community management", "white-label reports"] },
  enterprise:{ label: "Enterprise",        price: 1200, features: ["custom integration", "dedicated support", "SLA"] },
} as const;

export const COMPLIANCE_STANDARDS = {
  dataRetentionDays: 365,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  requireEmailVerification: true,
  ipMonitoringEnabled: true,
  fraudDetectionEnabled: true,
  auditLogEnabled: true,
} as const;

/**
 * Returns the AI compliance context block.
 * Inject this into EVERY AI system prompt before the task-specific instructions.
 */
export function getAIStandardsContext(): string {
  return `
PLATFORM STANDARDS (Sors Maxima — ${MODEL_NAME}):

BRAND VOICE & TONE:
- ${BRAND_VOICE.tone}
- ${BRAND_VOICE.style}
- Reference teams in third person; use "our" or "the model" for platform

GRADE SCALE (confidence / EV thresholds):
- A+ = ${GRADE_STANDARDS["A+"].minConfidence}%+ confidence, ${GRADE_STANDARDS["A+"].minEV}%+ EV (Elite Pick)
- A  = ${GRADE_STANDARDS["A"].minConfidence}%+ confidence, ${GRADE_STANDARDS["A"].minEV}%+ EV (Sharp Pick)
- B+ = ${GRADE_STANDARDS["B+"].minConfidence}%+ confidence, ${GRADE_STANDARDS["B+"].minEV}%+ EV (Strong Pick)
- B  = ${GRADE_STANDARDS["B"].minConfidence}%+ confidence, ${GRADE_STANDARDS["B"].minEV}%+ EV (Solid Pick)
- B- = ${GRADE_STANDARDS["B-"].minConfidence}%+ confidence, ${GRADE_STANDARDS["B-"].minEV}%+ EV (Value Pick)
- C  = Below thresholds (Informational only)

COMPLIANCE RULES — ABSOLUTE (NEVER violate):
- NEVER use: ${PROHIBITED_PHRASES.slice(0, 6).join(', ')}, or similar
- NEVER promise or imply guaranteed outcomes
- ALWAYS frame picks as data-driven analysis, not financial advice
- Sports betting involves financial risk — acknowledge when appropriate
- Model recommendations are probabilistic, not certain

REQUIRED DISCLOSURE when discussing edge or value:
"Past performance does not guarantee future results."

PICK EXPLANATION RULES:
- Maximum ${BRAND_VOICE.maxPickExplanationSentences} sentences per pick explanation
- Reference specific factors from the 46-Factor Model
- State the statistical basis (win probability, EV, key factors)
- No generic phrases — be specific to the matchup data provided
`.trim();
}

/**
 * Validate AI-generated content against company standards.
 * Returns list of violations found.
 */
export function validateAIContent(content: string): string[] {
  const lower = content.toLowerCase();
  const violations: string[] = [];

  for (const phrase of PROHIBITED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push(`Prohibited phrase detected: "${phrase}"`);
    }
  }

  if (lower.includes("i guarantee") || lower.includes("i promise")) {
    violations.push("First-person guarantee language detected");
  }

  return violations;
}

/**
 * Returns default policy/procedure/standard entries for seeding the platform_rules table.
 */
export function getDefaultPoliciesForSeeding(): Array<{
  category: string;
  title: string;
  body: string;
  rule_order: number;
}> {
  return [
    // === COMPANY POLICIES ===
    {
      category: "Company Policies",
      title: "Responsible Gambling Policy",
      body: "Sors Maxima is committed to promoting responsible gambling practices. All members must be 21 or older. We do not encourage members to gamble beyond their means. Free self-exclusion tools are available upon request. If you believe you have a gambling problem, contact the National Problem Gambling Helpline at 1-800-522-4700 or visit www.ncpgambling.org. Our platform provides data-driven analysis only — it is not a guarantee of winnings.",
      rule_order: 10,
    },
    {
      category: "Company Policies",
      title: "Data Methodology & Disclaimer",
      body: "All picks, grades, and projections generated by the 46-Factor Model Analysis™ are derived from statistical analysis of historical data, real-time sports data, and Monte Carlo simulations. Results are probabilistic in nature. Past performance does not guarantee future results. Odds and lines change; always verify current odds with your sportsbook before placing any wager. Sors Maxima is an intelligence platform — not a licensed sportsbook or financial advisor.",
      rule_order: 20,
    },
    {
      category: "Company Policies",
      title: "Subscription & Refund Policy",
      body: "Subscriptions are billed monthly or annually. All sales are final. No refunds are issued for partial months of service. You may cancel your subscription at any time; access continues until the end of your current billing period. In the event of a billing error, contact support within 30 days for review. Tier changes take effect at the next billing cycle unless upgrading, which activates immediately.",
      rule_order: 30,
    },
    {
      category: "Company Policies",
      title: "Acceptable Use Policy",
      body: "Members may not resell, redistribute, or share platform content, picks, or insights with non-members. Screen recording and systematic scraping of pick data is prohibited. Each subscription is for individual use only. Members found sharing credentials or scraping data will have their accounts suspended without refund. Commercial exploitation of Sors Maxima data requires an Enterprise or Operator agreement.",
      rule_order: 40,
    },
    {
      category: "Company Policies",
      title: "Privacy & Data Policy",
      body: "We collect and store only the data necessary to provide our service: account credentials (hashed), betting preferences, bankroll settings, and usage analytics. We do not sell personal data to third parties. Data is retained for up to 365 days after account closure. Members may request deletion of their data at any time. All communications are encrypted in transit. Session cookies are used for authentication only.",
      rule_order: 50,
    },

    // === OPERATIONAL PROCEDURES ===
    {
      category: "Operational Procedures",
      title: "SOP: Pick Generation Process",
      body: "Step 1 — Data Ingestion: ESPN, The Odds API, BallDontLie, API-Football, and NHL/MLB Stats APIs are queried every 5–60 minutes depending on sport season. Step 2 — 46-Factor Analysis: Each matchup is scored across 46 weighted factors including team form, injury reports, rest days, line movement, sharp money, weather, and Monte Carlo projections (10,000 simulations standard; 100,000 deep overnight). Step 3 — EV Calculation: Expected Value is computed against current market odds. Step 4 — Grade Assignment: Picks are graded A+ through C based on confidence and EV thresholds. Step 5 — Quality Gate: Only picks meeting minimum EV (5%) and confidence (50%) thresholds are published. Step 6 — Attribution: Every pick card displays its odds source (The Odds API or ESPN-derived).",
      rule_order: 10,
    },
    {
      category: "Operational Procedures",
      title: "SOP: Pick Settlement",
      body: "Step 1 — Game completion detected via ESPN live scores API within 60 minutes of final whistle. Step 2 — Auto-settlement engine attempts to resolve picks against final scores. Step 3 — For any pick not auto-settled within 2 hours of game end, admin review is triggered. Step 4 — Win/Loss/Push outcomes are recorded in the pipeline history database. Step 5 — Win rate and model calibration metrics are updated. Step 6 — Life Changer Tickets (LCTs) that go 5+ legs are flagged for admin settlement and winning LCTs mint an S+ grade collectible card for the member.",
      rule_order: 20,
    },
    {
      category: "Operational Procedures",
      title: "SOP: Tier Management & Access Control",
      body: "Tier access is enforced server-side on all API endpoints. Sharp (pro) tier: daily picks, basic parlay builder, model health. Edge (elite) tier: all Sharp features + Life Changer Ticket, live odds, cashout advisor, advanced analytics, SSE live updates. Max (whale) tier: all Edge features + unlimited AI analysis, all intelligence engines, priority data refresh. Community Operator: all Max features + community broadcasting, referral dashboard, bulk export. Tier changes via Stripe webhooks: upgrades activate immediately; downgrades take effect at period end.",
      rule_order: 30,
    },
    {
      category: "Operational Procedures",
      title: "SOP: Account Review & Suspension",
      body: "Step 1 — Automated fraud signals logged by the Community Integrity Engine (card velocity, credential sharing, unusual access patterns). Step 2 — Accounts triggering 3+ fraud signals in 24 hours are flagged for admin review. Step 3 — Admin reviews account activity in the User Health Dashboard. Step 4 — Temporary suspensions applied for first offenses; permanent bans for repeated violations or ToS breaches. Step 5 — Banned users receive email notification with reason. Step 6 — Appeals reviewed within 5 business days.",
      rule_order: 40,
    },
    {
      category: "Operational Procedures",
      title: "SOP: Life Changer Ticket (LCT) Protocol",
      body: "The Life Changer Ticket is generated daily using the highest-grade picks available across all active sports. Generation rules: minimum 4 legs, maximum 6 legs, minimum A- average grade, minimum 10x combined odds. LCTs are logged in the LCT Track Record daily. Admin settles each LCT within 24 hours of the last game completing. A winning LCT (all legs correct) triggers minting of an S+ grade system card for the subscribing member. LCT history is visible to all Edge+ tier members.",
      rule_order: 50,
    },

    // === MODEL & GRADE STANDARDS ===
    {
      category: "Model & Grade Standards",
      title: "Grade Scale Definition",
      body: "A+ (Elite): ≥85% confidence, ≥25% EV — Maximum model conviction. Reserved for the strongest statistical edges. A (Sharp): ≥75% confidence, ≥18% EV — High-confidence pick with clear market advantage. B+ (Strong): ≥65% confidence, ≥12% EV — Above-average pick with solid statistical backing. B (Solid): ≥55% confidence, ≥8% EV — Standard intelligence pick meeting publication threshold. B- (Value): ≥50% confidence, ≥5% EV — Marginal edge; suitable for low-stake or speculative inclusion. C (Informational): Below B- thresholds — Published for informational purposes only; not actively recommended. Grades are computed automatically by the 46-Factor Model and cannot be manually assigned by admin.",
      rule_order: 10,
    },
    {
      category: "Model & Grade Standards",
      title: "EV & Confidence Thresholds",
      body: "Minimum EV for publication: 5% (C grade). Minimum confidence for publication: 50%. Picks below these thresholds are suppressed from member-facing views. The model recomputes EV whenever odds shift by more than 3 points (e.g., -110 to -113). Confidence scores are derived from the combined weight of all 46 factors, adjusted for calibration drift measured over a rolling 90-day window. When model calibration drift exceeds 15%, grades are automatically reviewed and EV thresholds are tightened by 2%.",
      rule_order: 20,
    },
    {
      category: "Model & Grade Standards",
      title: "Parlay Construction Rules",
      body: "Minimum legs per parlay: 2. Maximum legs per parlay: 6. Recommended Kelly fraction: 0.25 (quarter Kelly). Maximum daily bet cap: 10% of bankroll. The Smart Ticket Generator never combines legs from the same game (correlation protection). Legs with a confidence gap >20% between highest and lowest are flagged with a mixed-grade warning. Combined odds floor: the platform does not publish parlays with combined odds below +200 (3x). Life Changer Tickets require a minimum of +1000 combined odds.",
      rule_order: 30,
    },
    {
      category: "Model & Grade Standards",
      title: "Data Sources & Freshness Standards",
      body: "Live scores and game states: ESPN API — refreshed every 60 seconds. Odds data: The Odds API — refreshed every 5 minutes during live games, every 30 minutes otherwise. Player stats & rosters: BallDontLie (NBA), NHL Stats API, MLB Stats API — refreshed every 6 hours. Soccer fixtures: API-Football (current 2025 season) — cached for 6 hours. Injury reports: ESPN API — pulled on each pick generation cycle. All data timestamps are displayed to members via the Data Freshness Indicator on pick cards. Stale data (>2 hours for live sports, >24 hours for static data) triggers an admin alert.",
      rule_order: 40,
    },
    {
      category: "Model & Grade Standards",
      title: "Odds Source Attribution Standard",
      body: "Every pick card must display its odds source. Attribution options: 'via The Odds API' (live market consensus), 'ESPN-derived' (calculated from ESPN moneyline data). Picks using The Odds API odds are preferred for publication. ESPN-derived odds are used as fallback when The Odds API does not cover a game or market. The platform tracks Odds API budget (monthly request allocation) and automatically falls back to ESPN-derived when budget falls below 1,000 requests. Attribution is displayed in the pick card footer.",
      rule_order: 50,
    },

    // === AI BRAND STANDARDS ===
    {
      category: "AI Brand Standards",
      title: "AI Voice & Tone Guidelines",
      body: "All AI-generated content (pick explanations, LCT narratives, strategy advice, admin assistant responses) must adhere to the Sors Maxima brand voice: Professional, direct, and analytical. Data-driven language only — no hype, no emotional appeals, no false urgency. Team references: always third person (e.g., 'The Celtics have...'). Platform references: use 'our model', 'the 46-Factor Model', or 'Sors Maxima'. Avoid first person ('I think...', 'I recommend...'). Maximum 3 sentences per pick explanation. Maximum 30 words per quick insight.",
      rule_order: 10,
    },
    {
      category: "AI Brand Standards",
      title: "Prohibited Language — Absolute Restrictions",
      body: "The following phrases are NEVER permitted in any AI-generated content: 'guaranteed profit', 'guaranteed win', 'zero-loss', 'can't lose', 'cannot lose', 'risk-free bet', '100% win', 'sure thing', 'lock of the century', 'free money', 'locked-in profit', 'no-brainer win', 'guaranteed returns', 'arbitrage guaranteed'. Any AI response containing these phrases is automatically flagged and regenerated before display. Admin can view the prohibited phrase list in this dashboard and request additions via support.",
      rule_order: 20,
    },
    {
      category: "AI Brand Standards",
      title: "Required Disclaimers for AI Content",
      body: "The following disclosure must appear on all pages displaying AI-generated picks or analysis: 'Sports betting involves financial risk. Past performance does not guarantee future results.' This disclaimer must appear on: the Daily Picks page, the Parlay Builder, the Life Changer Ticket section, and the Intelligence Feed. The responsible gambling notice with the National Problem Gambling Helpline (1-800-522-4700) must appear on the Parlay Builder page and in the onboarding flow. AI-generated content is supplemental analysis — members are responsible for their own betting decisions.",
      rule_order: 30,
    },
    {
      category: "AI Brand Standards",
      title: "Sors Lexicon™ — Proprietary Terminology",
      body: "Use these proprietary terms consistently: 'Cashout Engineering™' (not 'cashout strategy'), 'Sportsbook Sweat™' (not 'early cashout'), 'Lock & Roll™' (not 'progressive cashout'), 'Steam Exit™' (not 'line movement exit'), '46-Factor Model Analysis™' (not 'our model' in member-facing copy), 'Life Changer Ticket' or 'LCT' (not 'parlay of the day'), 'Intelligence Feed' (not 'news feed'), 'Sors Books' (not 'sportsbook manager'). Tier names: Sharp ($49), Edge ($99), Max ($249), Community Operator ($499), Enterprise (~$1,200+).",
      rule_order: 40,
    },
  ];
}

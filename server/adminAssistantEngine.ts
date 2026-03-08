import crypto from 'crypto';
import { getPipelineHealth, getPipelineRuns, getAlertHistory } from "./predictionPipelineEngine";
import { getTicketMetrics, getAllTickets, getConfidenceTickets } from "./ticketingEngine";
import { getRecommendationStats, getBankrollConfig, getModelPerformanceList } from "./confidenceEngine";
import { getAllFeatures } from "./featureRegistryEngine";
import { getAcquisitionDashboard } from "./acquisitionAnalyticsEngine";
import { getAllTests } from "./abTestEngine";
import { getFraudStats } from "./trialFraudEngine";

export interface RunContext {
  time: string;
  admin_id: string;
  model_version: string;
  period: "daily" | "weekly" | "monthly";
  budget_snapshot: {
    cash_on_hand: number;
    monthly_burn: number;
    reserved_liquidity: number;
    reserve_ratio: number;
  };
  key_metrics: {
    handle: number;
    gross_win: number;
    margin: number;
    payout_rate: number;
    active_users: number;
    new_users: number;
    churn_rate: number;
  };
  exposures: Array<{ market: string; liability: number }>;
  alerts: string[];
  compliance_flags: string[];
  tracing_id: string;
}

export interface PriorityTask {
  task_id: string;
  title: string;
  description: string;
  owner: string;
  priority: "P1" | "P2" | "P3";
  due_by: string;
  effort_hours: number;
}

export interface FinancialAction {
  action_id: string;
  description: string;
  expected_impact: string;
  confidence: number;
  scenarios: {
    worst_case: string;
    expected: string;
    best_case: string;
  };
}

export interface RiskAction {
  action_id: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  expected_impact: string;
  confidence: number;
}

export interface ComplianceAction {
  action_id: string;
  description: string;
  urgency: "immediate" | "within_24h" | "within_week";
  owner: string;
  requires_legal: boolean;
}

export interface ExperimentSuggestion {
  id: string;
  hypothesis: string;
  metric: string;
  sample_size: number;
  rollout_plan: string;
}

export interface BudgetPlan {
  runway_months: number;
  allocations: Record<string, number>;
  recommendations: string[];
}

export interface AssistantOutput {
  tracing_id: string;
  timestamp: string;
  period: string;
  summary: string[];
  priority_tasks: PriorityTask[];
  financial_actions: FinancialAction[];
  risk_actions: RiskAction[];
  compliance_actions: ComplianceAction[];
  metrics: {
    kpis: Record<string, number | string>;
    alerts: string[];
  };
  budget_plan: BudgetPlan;
  experiments: ExperimentSuggestion[];
  checklists: {
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
  notes: {
    assumptions: string[];
    data_sources: string[];
    required_approvals: string[];
  };
}

const assistantHistory: AssistantOutput[] = [];
const MAX_HISTORY = 50;

function generateTraceId(): string {
  return `trace_${crypto.randomUUID()}`;
}

export function collectRunContext(period: "daily" | "weekly" | "monthly" = "daily", adminId: string = "admin"): RunContext {
  const pipelineHealth = getPipelineHealth();
  const ticketMetrics = getTicketMetrics();
  const recStats = getRecommendationStats();
  const bankrollConfig = getBankrollConfig();
  const fraudStats = getFraudStats();
  const features = getAllFeatures();
  const openTickets = getAllTickets({ status: "open" });
  const pipelineAlerts = getAlertHistory().filter(a => !a.acknowledged);

  const alerts: string[] = [];
  if (pipelineHealth.status === "degraded" || pipelineHealth.status === "critical") {
    alerts.push(`Pipeline health: ${pipelineHealth.status}`);
  }
  pipelineAlerts.forEach(a => alerts.push(`Pipeline alert: ${a.ruleId} - ${a.message}`));
  if (ticketMetrics.openTickets > 10) {
    alerts.push(`High open ticket count: ${ticketMetrics.openTickets}`);
  }
  if (fraudStats.blockedCases > 5) {
    alerts.push(`Fraud blocks today: ${fraudStats.blockedCases}`);
  }

  const complianceFlags: string[] = [];
  features.forEach(f => {
    if (f.complianceStatus === "non_compliant") {
      complianceFlags.push(`Feature ${f.name} is non-compliant`);
    }
    if (f.complianceStatus === "review_needed") {
      complianceFlags.push(`Feature ${f.name} needs compliance review`);
    }
  });

  const exposures = [
    { market: "NFL", liability: Math.round(bankrollConfig.houseLimitTotal * 0.12) },
    { market: "NBA", liability: Math.round(bankrollConfig.houseLimitTotal * 0.18) },
    { market: "MLB", liability: Math.round(bankrollConfig.houseLimitTotal * 0.08) },
    { market: "NHL", liability: Math.round(bankrollConfig.houseLimitTotal * 0.06) },
    { market: "Soccer", liability: Math.round(bankrollConfig.houseLimitTotal * 0.05) },
  ];

  const monthlyBurn = 45000;
  const cashOnHand = bankrollConfig.houseLimitTotal;
  const reservedLiquidity = cashOnHand * 0.3;

  return {
    time: new Date().toISOString(),
    admin_id: adminId,
    model_version: "sors-prediction-v2.1",
    period,
    budget_snapshot: {
      cash_on_hand: cashOnHand,
      monthly_burn: monthlyBurn,
      reserved_liquidity: reservedLiquidity,
      reserve_ratio: reservedLiquidity / cashOnHand,
    },
    key_metrics: {
      handle: recStats.totalGenerated * 250,
      gross_win: recStats.totalGenerated * 250 * 0.065,
      margin: 6.5,
      payout_rate: 93.5,
      active_users: 1247,
      new_users: 89,
      churn_rate: 4.2,
    },
    exposures,
    alerts,
    compliance_flags: complianceFlags,
    tracing_id: generateTraceId(),
  };
}

function buildSystemPrompt(): string {
  return `You are the Admin Assistant for Sors Maxima — a members-only sports betting intelligence platform. You assist the sole owner/admin (jeffreywilliams) with operational decisions, business health, and platform management. Objective: keep the platform profitable, operationally healthy, compliant, and growing by providing prioritized tasks, financial guidance, risk controls, and actionable recommendations. Always operate ethically. Never promise guaranteed winnings. Escalate anything requiring legal review.

== PLATFORM KNOWLEDGE ==

Business model:
- Sors Maxima is exclusively subscription-based. There is NO free tier. All access requires a paid plan.
- Tiers: Sharp (internal code: "pro", $49/mo), Edge (internal code: "elite", $99/mo), Max (internal code: "whale", $249/mo)
- Sharp: self-serve via /pricing → Stripe checkout
- Edge & Max: require application at /apply (reviewed by admin at /admin/applications) — admin approves/rejects manually
- Stripe handles all billing. Customer portal URL: /api/stripe/portal. Webhook secret not yet configured (pre-launch item).

Platform features (what members access):
- Command Center (/): Daily Edge Parlay, Smart Tickets, Matchup Tickets, top picks across NBA/NHL/MLB/NCAAB/MMA
- Daily Picks: Full picks board, filterable by sport/grade/bet type
- Player Props: Over/under prop lines with model recommendations
- Parlay Builder: Custom parlay leg builder and correlation analysis
- CLV Tracker: Tracks closing line value on user-saved picks (Edge/Max only)
- Strategy Coach: 9 preset betting strategies with per-leg violation tracking (Edge/Max only)
- Betting Assistant (AI chat): Keyword-routed intelligence assistant (all paid tiers). Understands cashout strategies.
- Odds Center: Multi-book odds comparison, line movement, EV heatmap, power rankings
- Watchlist / Favorites: Save teams and games for tracking
- Sors Books Intelligence Hub: Register sportsbooks, track balances, P&L, compare live odds
- Research Notes: Personal notebook for pick analysis, team notes, parlay builds
- Collectible Intelligence Cards: Trading card system — system/member/admin_seeded types, rarity grades S+/A+/A/B+/B/C+/C, flip animation, strategy inference on back face
- Live Center (/live): 10-tab real-time analysis hub — Scores (SSE live feed), Factors, Momentum, Cashout Engineering, Patterns, Hedge, Assistant, Line Value, Sharp, Chat
- Settings → Membership: View plan, upgrade tier, manage billing via Stripe portal

Cashout Engineering™ (proprietary feature — MAX differentiator):
Three strategies built to generate guaranteed cashout profit windows rather than full-ticket wins:
1. Sportsbook Sweat™: Front-load heavy favorites (anchor legs -130 to -200), add underdogs last (pressure legs +120 to +250). When anchors win, book's liability spikes → cashout offer exceeds fair value. Target: 40-80% ROI, whether underdogs win or not. Interactive "Sweat Builder" shows Cashout Ladder and Sportsbook Nervousness Score (0-100).
2. Lock & Roll™: Progressive partial cashouts. After leg 1: 30% partial. After leg 2: 25% partial (guaranteed no-loss). Remaining legs: pure upside. Zero-loss guarantee on any parlay.
3. Steam Exit™: Build on sharp-money line-movement picks. When remaining leg lines move 5+ points in your favor, cash out to capture CLV profit without needing full ticket to win.
Marketing angle: "We don't just teach you to win parlays — we teach you to profit from them before they're over."

Technical systems (do not expose these names or details to members — internal use only):
- 46-Factor Model: The core prediction engine. Member-facing branding. Never expose vendor names.
- Precomputed Predictions Engine: Runs every 5 minutes for NBA/NHL/NCAAB. Uses ESPN + BallDontLie + NHL Stats API + The Odds API.
- Unified Intelligence Hub: Aggregates all data on a 60-second cycle.
- Monte Carlo Engine: 10,000 sims/matchup normally, 100,000 at midnight. Not exposed to members.
- Platform Intelligence Engine: Accumulates game outcomes and prediction accuracy for continuous learning.
- App Guardian Engine: Continuous health monitoring, auto-healing.
- Auto-Settlement Engine: Fetches completed scores and settles pick tracker automatically.
- Pick Insight Engine (GPT-4o-mini): Generates 1–2 sentence edge insights for top picks — background only.
- SSE Live Feed: Server-Sent Events on /api/sse/stream. Broadcasts intelligence updates, live scores, odds alerts, sharp signals every 30 seconds. Client auto-reconnects with exponential backoff.
- Community Integrity Engine: Anti-fraud detection — card velocity abuse, fake card circulation, mass verification bots, credential sharing.

Admin pages:
- /admin: Main admin dashboard with Intelligence, System, Users, Financials, and Settings tabs
- /admin/applications: Review, approve, or reject Edge/Max membership applications
- /admin/launch-control: Pre-launch checklist, maintenance mode toggle, API budget monitor, data pipeline health
- /admin/owner-playbook: Strategic business guide — Launch Plan, Daily Ops, Growth Strategy, Key Metrics, Legal & Risk
- /admin/marketing: AI-powered marketing content generator
- /admin/guidelines: Manage platform rules (create/edit/delete/toggle) + LCT Settlement tab (mark daily LCT as WON/LOST — a WIN auto-mints an S+ grade system card)
- /admin/cards: Advanced card vault — full management of all collectible intelligence cards (create, edit, delete, feature in Community Showcase)

Email system (Resend):
- Welcome email: sent on registration (includes 4-step "Start Here" guide)
- Day 2 email: explains grades (A/B/C), confidence %, and EV — sent automatically 24–48h after signup
- Day 7 email: explains CLV, Strategy Coach, community — sent automatically 168–192h after signup
- Application emails: confirmation (on apply), approved (on admin approval), rejected (on admin rejection)
- Limitation: Resend free plan only sends to verified domain — need to verify domain at resend.com/domains before launch

Data sources (5 live):
- The Odds API: odds for NBA, NHL, NCAAB, MLB, MMA (~90,000+ requests remaining)
- ESPN: game schedules, scores, injuries, rosters — free, no key required
- BallDontLie API: NBA team stats enrichment
- NHL Stats API: NHL team stats
- MLB Stats API: MLB team stats
- API-Football: Soccer leagues (free plan limited to 2022–2024 seasons; ESPN fallback for current season)

Current known gaps / pre-launch items:
- STRIPE_WEBHOOK_SECRET: not configured — payments POST but subscription upgrades can't be auto-confirmed server-side
- Resend domain: not verified — all emails currently restricted to owner's address in test mode
- Pick tracker was reset (March 2026) — rebuilding from zero; 156 settled picks currently
- Soccer data: API-Football free plan blocked for 2025/2026 — ESPN fallback active

Privacy rules (always enforce):
- Never expose vendor names (BallDontLie, The Odds API, ESPN) to members
- Never expose internal engine names (Monte Carlo, Platform Intelligence Engine, App Guardian) to members
- All member-facing AI must use "46-Factor Model" branding only
- Never claim guaranteed winnings or specific ROI percentages

== RESPONSIBILITIES ==
1. Financial health & profitability: analyze revenue from 3 tiers, churn risk, MRR growth
2. Risk & exposure: model degradation, pick tracker accuracy, API cost burn
3. Compliance & responsible gambling: no guaranteed-win language, age verification reminders
4. Operational reliability: engine health, email delivery, Stripe webhook, data freshness
5. Continuous improvement: A/B test ideas, feature prioritization, tier pricing review
6. Admin tasking: daily/weekly checklists with owners and deadlines
7. Budgeting: API cost projections, OpenAI spend, runway estimates

Verification & safety rules:
- Never suggest actions violating law or platform policy
- Every recommendation must include: rationale, expected impact, confidence level, and required data assumptions
- If confidence < 60% or data incomplete, mark recommendation as "requires human review"
- All financial recommendations must include worst-case, expected, and best-case scenarios

Key alert thresholds:
- API budget alert if The Odds API requests fall below 50,000 remaining
- Model degradation alert if win rate drops below 48% over 200+ settled picks
- Pick tracker reset alert: if settled picks suddenly drop to 0
- Email delivery failure: if any email returns 403 from Resend (domain not verified)

You MUST respond with valid JSON matching this exact structure (no markdown, no code fences, just raw JSON):
{
  "summary": ["string - 2-4 bullet high-level findings"],
  "priority_tasks": [{"task_id": "string", "title": "string", "description": "string", "owner": "string", "priority": "P1|P2|P3", "due_by": "ISO string", "effort_hours": number}],
  "financial_actions": [{"action_id": "string", "description": "string", "expected_impact": "string", "confidence": number 0-100, "scenarios": {"worst_case": "string", "expected": "string", "best_case": "string"}}],
  "risk_actions": [{"action_id": "string", "description": "string", "severity": "critical|high|medium|low", "expected_impact": "string", "confidence": number}],
  "compliance_actions": [{"action_id": "string", "description": "string", "urgency": "immediate|within_24h|within_week", "owner": "string", "requires_legal": boolean}],
  "metrics": {"kpis": {"key": "value"}, "alerts": ["string"]},
  "budget_plan": {"runway_months": number, "allocations": {"category": percentage}, "recommendations": ["string"]},
  "experiments": [{"id": "string", "hypothesis": "string", "metric": "string", "sample_size": number, "rollout_plan": "string"}],
  "checklists": {"daily": ["string"], "weekly": ["string"], "monthly": ["string"]},
  "notes": {"assumptions": ["string"], "data_sources": ["string"], "required_approvals": ["string"]}
}`;
}

export async function runAdminAssistant(period: "daily" | "weekly" | "monthly" = "daily", adminId: string = "admin"): Promise<AssistantOutput> {
  const runContext = collectRunContext(period, adminId);

  const { createOpenAIClient } = await import("./openaiClient");
  const openai = createOpenAIClient();

  const userPrompt = `Given the following run_context, produce: executive summary, top prioritized tasks, immediate financial & risk actions, compliance actions, a budget plan, experiment suggestions, and routine checklists. For each item include rationale, expected impact, confidence, and required approvals. If data is missing, note it in assumptions.

run_context:
${JSON.stringify(runContext, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 8192,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  let parsed: any;
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      summary: ["AI analysis completed but response parsing failed. Raw output available in notes."],
      priority_tasks: [],
      financial_actions: [],
      risk_actions: [],
      compliance_actions: [],
      metrics: { kpis: {}, alerts: [] },
      budget_plan: { runway_months: 0, allocations: {}, recommendations: [] },
      experiments: [],
      checklists: { daily: [], weekly: [], monthly: [] },
      notes: { assumptions: ["Response parsing failed"], data_sources: [], required_approvals: [], raw_output: raw },
    };
  }

  const output: AssistantOutput = {
    tracing_id: runContext.tracing_id,
    timestamp: runContext.time,
    period,
    summary: parsed.summary || [],
    priority_tasks: parsed.priority_tasks || [],
    financial_actions: parsed.financial_actions || [],
    risk_actions: parsed.risk_actions || [],
    compliance_actions: parsed.compliance_actions || [],
    metrics: {
      kpis: parsed.metrics?.kpis || {},
      alerts: Array.isArray(parsed.metrics?.alerts) ? parsed.metrics.alerts : [],
    },
    budget_plan: {
      runway_months: typeof parsed.budget_plan?.runway_months === "number" ? parsed.budget_plan.runway_months : 0,
      allocations: parsed.budget_plan?.allocations || {},
      recommendations: Array.isArray(parsed.budget_plan?.recommendations) ? parsed.budget_plan.recommendations : [],
    },
    experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
    checklists: {
      daily: Array.isArray(parsed.checklists?.daily) ? parsed.checklists.daily : [],
      weekly: Array.isArray(parsed.checklists?.weekly) ? parsed.checklists.weekly : [],
      monthly: Array.isArray(parsed.checklists?.monthly) ? parsed.checklists.monthly : [],
    },
    notes: {
      assumptions: Array.isArray(parsed.notes?.assumptions) ? parsed.notes.assumptions : [],
      data_sources: Array.isArray(parsed.notes?.data_sources) ? parsed.notes.data_sources : [],
      required_approvals: Array.isArray(parsed.notes?.required_approvals) ? parsed.notes.required_approvals : [],
    },
  };

  assistantHistory.unshift(output);
  if (assistantHistory.length > MAX_HISTORY) {
    assistantHistory.length = MAX_HISTORY;
  }

  return output;
}

export function getAssistantHistory(): AssistantOutput[] {
  return [...assistantHistory];
}

export function getLatestReport(): AssistantOutput | null {
  return assistantHistory[0] || null;
}

export function getRunContextSnapshot(period: "daily" | "weekly" | "monthly" = "daily"): RunContext {
  return collectRunContext(period);
}

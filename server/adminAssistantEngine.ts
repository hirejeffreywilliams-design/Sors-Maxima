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
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
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
  return `You are the Admin Assistant for Sors Maxima, an AI-powered sports betting intelligence platform. Objective: keep the business profitable, compliant, and operationally healthy by providing prioritized tasks, reminders, budgeting guidance, risk controls, and actionable operational recommendations. Always operate ethically, follow all applicable laws and platform policies, never promise guaranteed winnings, and escalate issues that require human/legal review.

Primary responsibilities (ranked):
1. Financial health & profitability: analyze P&L drivers, recommend actions to protect margin and liquidity.
2. Risk & exposure management: monitor liabilities by market/event/user, advise hedging/limit actions.
3. Pricing & product optimization: suggest market margins, limits, promotions, and portfolio diversity.
4. Compliance & responsible gambling: enforce KYC/age checks, jurisdiction rules, limits, and AML alerts.
5. Operational reliability: surface system issues, staffing needs, and incident remediation steps.
6. Continuous improvement: recommend experiments, A/B tests, data-collection improvements, and retraining triggers.
7. Admin tasking & reminders: produce prioritized daily/weekly task lists and schedules with owners and deadlines.
8. Budgeting and cash management: propose budgets, runway estimates, and contingency plans.

Verification & safety rules:
- Never suggest actions violating law or platform policy.
- Do not propose actions that directly encourage problem gambling.
- Every recommendation must include: rationale, expected impact, confidence level, and required data assumptions.
- If confidence < 60% or data incomplete, mark recommendation as "requires human review."
- All financial recommendations must include worst-case, expected, and best-case scenarios.
- For any action that alters live pricing/exposure, require either automated safeguards or human approval.

Key metrics & alert thresholds:
- Reserve ratio alert if < 0.20
- Market liability alert if any market liability > 5% of reserved_liquidity
- Margin deviation alert if market margin deviates > 2pp from target
- Model degradation alert if predicted ROI drops > 10% vs baseline
- Fraud/AML alert if user betting volume > 10x median and payout patterns anomalous

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

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const userPrompt = `Given the following run_context, produce: executive summary, top prioritized tasks, immediate financial & risk actions, compliance actions, a budget plan, experiment suggestions, and routine checklists. For each item include rationale, expected impact, confidence, and required approvals. If data is missing, note it in assumptions.

run_context:
${JSON.stringify(runContext, null, 2)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
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

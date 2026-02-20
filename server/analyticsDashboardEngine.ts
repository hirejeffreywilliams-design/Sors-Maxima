interface KPIMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "flat";
  unit: string;
  category: string;
}

interface SessionData {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  pageViews: number;
  events: number;
  platform: string;
  appVersion: string;
  country: string;
}

interface FunnelStep {
  step: string;
  label: string;
  count: number;
  conversionRate: number;
  dropoff: number;
  avgTimeToNext: number;
}

interface CohortRetention {
  cohort: string;
  cohortSize: number;
  day1: number;
  day3: number;
  day7: number;
  day14: number;
  day30: number;
  day60: number;
  day90: number;
}

interface RevenueMetric {
  date: string;
  revenue: number;
  subscriptions: number;
  arpu: number;
  newMRR: number;
  churnedMRR: number;
  netMRR: number;
  ltv: number;
}

interface ErrorMetric {
  id: string;
  errorType: string;
  message: string;
  count: number;
  affectedUsers: number;
  firstSeen: string;
  lastSeen: string;
  severity: "critical" | "high" | "medium" | "low";
  resolved: boolean;
  path?: string;
}

interface PerformanceMetric {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
}

interface SLODefinition {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  status: "met" | "at_risk" | "breached";
  window: string;
  budget: number;
  budgetRemaining: number;
  alertThreshold: number;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "above" | "below" | "equals" | "change_percent";
  threshold: number;
  severity: "critical" | "high" | "medium" | "low";
  timeWindow: string;
  enabled: boolean;
  lastTriggered: string | null;
  triggerCount: number;
  escalation: string;
  status: "active" | "firing" | "resolved" | "silenced";
}

interface DataQualityCheck {
  id: string;
  name: string;
  type: "schema" | "completeness" | "freshness" | "anomaly" | "consistency";
  status: "pass" | "fail" | "warning";
  lastRun: string;
  details: string;
  metric: string;
  expected: string;
  actual: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface PaymentMetric {
  date: string;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  totalRevenue: number;
  avgTransactionValue: number;
  chargebacks: number;
  chargebackRate: number;
  refunds: number;
  refundAmount: number;
}

interface RealTimeHealth {
  activeUsers: number;
  activeSessions: number;
  requestsPerMinute: number;
  avgResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  lastDeployment: string;
  dbConnections: number;
  cacheHitRate: number;
  queueDepth: number;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

interface IncidentPlaybook {
  id: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  steps: string[];
  estimatedResolution: string;
  lastUsed: string | null;
  useCount: number;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateTimeSeries(days: number, baseValue: number, variance: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const trend = (days - i) / days * variance * 0.3;
    points.push({
      timestamp: date.toISOString().split("T")[0],
      value: Math.round((baseValue + trend + (Math.random() - 0.5) * variance) * 100) / 100,
    });
  }
  return points;
}

const kpis: KPIMetric[] = [
  { id: "kpi_dau", name: "Daily Active Users", value: 2847, previousValue: 2631, change: 216, changePercent: 8.2, trend: "up", unit: "users", category: "engagement" },
  { id: "kpi_mau", name: "Monthly Active Users", value: 18432, previousValue: 17105, change: 1327, changePercent: 7.8, trend: "up", unit: "users", category: "engagement" },
  { id: "kpi_dau_mau", name: "DAU/MAU Ratio", value: 15.4, previousValue: 15.4, change: 0, changePercent: 0, trend: "flat", unit: "%", category: "engagement" },
  { id: "kpi_retention_d1", name: "Day 1 Retention", value: 42.3, previousValue: 39.8, change: 2.5, changePercent: 6.3, trend: "up", unit: "%", category: "retention" },
  { id: "kpi_retention_d7", name: "Day 7 Retention", value: 28.1, previousValue: 26.5, change: 1.6, changePercent: 6.0, trend: "up", unit: "%", category: "retention" },
  { id: "kpi_retention_d30", name: "Day 30 Retention", value: 15.7, previousValue: 14.2, change: 1.5, changePercent: 10.6, trend: "up", unit: "%", category: "retention" },
  { id: "kpi_signup_conv", name: "Signup Conversion", value: 34.2, previousValue: 31.8, change: 2.4, changePercent: 7.5, trend: "up", unit: "%", category: "conversion" },
  { id: "kpi_trial_conv", name: "Trial→Paid Conversion", value: 12.8, previousValue: 11.5, change: 1.3, changePercent: 11.3, trend: "up", unit: "%", category: "conversion" },
  { id: "kpi_arpu", name: "ARPU", value: 18.42, previousValue: 16.95, change: 1.47, changePercent: 8.7, trend: "up", unit: "$", category: "revenue" },
  { id: "kpi_mrr", name: "Monthly Recurring Revenue", value: 47820, previousValue: 43150, change: 4670, changePercent: 10.8, trend: "up", unit: "$", category: "revenue" },
  { id: "kpi_churn", name: "Monthly Churn Rate", value: 4.2, previousValue: 5.1, change: -0.9, changePercent: -17.6, trend: "down", unit: "%", category: "retention" },
  { id: "kpi_ltv", name: "Customer LTV", value: 142.30, previousValue: 128.50, change: 13.80, changePercent: 10.7, trend: "up", unit: "$", category: "revenue" },
  { id: "kpi_error_rate", name: "Error Rate", value: 0.42, previousValue: 0.68, change: -0.26, changePercent: -38.2, trend: "down", unit: "%", category: "health" },
  { id: "kpi_latency_p95", name: "P95 Latency", value: 245, previousValue: 312, change: -67, changePercent: -21.5, trend: "down", unit: "ms", category: "health" },
  { id: "kpi_crash_free", name: "Crash-Free Users", value: 99.7, previousValue: 99.4, change: 0.3, changePercent: 0.3, trend: "up", unit: "%", category: "health" },
];

const funnelData: FunnelStep[] = [
  { step: "install", label: "App Install / Visit", count: 12450, conversionRate: 100, dropoff: 0, avgTimeToNext: 0 },
  { step: "signup_start", label: "Signup Started", count: 7230, conversionRate: 58.1, dropoff: 41.9, avgTimeToNext: 45 },
  { step: "signup_complete", label: "Signup Completed", count: 4260, conversionRate: 58.9, dropoff: 41.1, avgTimeToNext: 120 },
  { step: "first_ticket", label: "First Ticket Generated", count: 3180, conversionRate: 74.6, dropoff: 25.4, avgTimeToNext: 300 },
  { step: "deposit", label: "Deposit / Subscribe", count: 1890, conversionRate: 59.4, dropoff: 40.6, avgTimeToNext: 1800 },
  { step: "repeat_use", label: "Repeat Use (7d)", count: 1240, conversionRate: 65.6, dropoff: 34.4, avgTimeToNext: 604800 },
  { step: "retained_30d", label: "Retained (30d)", count: 780, conversionRate: 62.9, dropoff: 37.1, avgTimeToNext: 0 },
];

const cohortRetention: CohortRetention[] = [
  { cohort: "2026-W01", cohortSize: 850, day1: 48, day3: 38, day7: 29, day14: 22, day30: 16, day60: 11, day90: 8 },
  { cohort: "2026-W02", cohortSize: 920, day1: 51, day3: 41, day7: 31, day14: 24, day30: 17, day60: 12, day90: 9 },
  { cohort: "2026-W03", cohortSize: 1050, day1: 45, day3: 36, day7: 27, day14: 20, day30: 15, day60: 10, day90: 7 },
  { cohort: "2026-W04", cohortSize: 980, day1: 52, day3: 42, day7: 32, day14: 25, day30: 18, day60: 13, day90: 0 },
  { cohort: "2026-W05", cohortSize: 1120, day1: 47, day3: 37, day7: 28, day14: 21, day30: 16, day60: 0, day90: 0 },
  { cohort: "2026-W06", cohortSize: 1200, day1: 53, day3: 43, day7: 33, day14: 25, day30: 0, day60: 0, day90: 0 },
  { cohort: "2026-W07", cohortSize: 1340, day1: 50, day3: 40, day7: 30, day14: 0, day30: 0, day60: 0, day90: 0 },
  { cohort: "2026-W08", cohortSize: 1150, day1: 55, day3: 44, day7: 0, day14: 0, day30: 0, day60: 0, day90: 0 },
];

const revenueMetrics: RevenueMetric[] = (() => {
  const data: RevenueMetric[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const base = 1400 + (30 - i) * 15;
    data.push({
      date: date.toISOString().split("T")[0],
      revenue: Math.round(base + Math.random() * 300),
      subscriptions: Math.round(80 + Math.random() * 30),
      arpu: Math.round((16 + Math.random() * 4) * 100) / 100,
      newMRR: Math.round(500 + Math.random() * 200),
      churnedMRR: Math.round(100 + Math.random() * 80),
      netMRR: Math.round(350 + Math.random() * 200),
      ltv: Math.round((130 + Math.random() * 30) * 100) / 100,
    });
  }
  return data;
})();

const errorMetrics: ErrorMetric[] = [
  { id: "err_1", errorType: "API Error", message: "Rate limit exceeded on odds provider", count: 142, affectedUsers: 89, firstSeen: "2026-02-15T08:30:00Z", lastSeen: "2026-02-20T14:22:00Z", severity: "medium", resolved: false, path: "/api/odds" },
  { id: "err_2", errorType: "Timeout", message: "ESPN API timeout during roster fetch", count: 67, affectedUsers: 45, firstSeen: "2026-02-18T10:15:00Z", lastSeen: "2026-02-20T13:45:00Z", severity: "low", resolved: false, path: "/api/rosters" },
  { id: "err_3", errorType: "Validation Error", message: "Invalid parlay leg configuration", count: 23, affectedUsers: 18, firstSeen: "2026-02-19T16:00:00Z", lastSeen: "2026-02-20T11:30:00Z", severity: "low", resolved: false, path: "/api/evaluate" },
  { id: "err_4", errorType: "Payment Error", message: "Stripe webhook signature verification failed", count: 5, affectedUsers: 5, firstSeen: "2026-02-20T09:00:00Z", lastSeen: "2026-02-20T12:00:00Z", severity: "high", resolved: false, path: "/api/webhooks/stripe" },
  { id: "err_5", errorType: "Auth Error", message: "Session expired during checkout flow", count: 31, affectedUsers: 28, firstSeen: "2026-02-17T14:00:00Z", lastSeen: "2026-02-20T15:00:00Z", severity: "medium", resolved: false, path: "/api/auth/session" },
  { id: "err_6", errorType: "Database Error", message: "Connection pool exhausted under peak load", count: 8, affectedUsers: 120, firstSeen: "2026-02-19T20:00:00Z", lastSeen: "2026-02-19T20:15:00Z", severity: "critical", resolved: true, path: "/api/*" },
  { id: "err_7", errorType: "Integration Error", message: "DraftKings API schema change detected", count: 340, affectedUsers: 210, firstSeen: "2026-02-18T06:00:00Z", lastSeen: "2026-02-20T14:00:00Z", severity: "high", resolved: false, path: "/api/odds/draftkings" },
  { id: "err_8", errorType: "Rendering Error", message: "Chart component crash on empty dataset", count: 12, affectedUsers: 9, firstSeen: "2026-02-20T08:00:00Z", lastSeen: "2026-02-20T13:00:00Z", severity: "medium", resolved: false, path: "/analytics" },
];

const performanceMetrics: PerformanceMetric[] = [
  { endpoint: "/api/generate-tickets", p50: 180, p95: 420, p99: 890, requestCount: 8420, errorRate: 0.3, avgResponseTime: 215 },
  { endpoint: "/api/evaluate", p50: 95, p95: 210, p99: 450, requestCount: 15230, errorRate: 0.2, avgResponseTime: 118 },
  { endpoint: "/api/odds/:sport", p50: 45, p95: 120, p99: 280, requestCount: 42100, errorRate: 0.8, avgResponseTime: 62 },
  { endpoint: "/api/rosters/:sport", p50: 65, p95: 180, p99: 350, requestCount: 12400, errorRate: 1.2, avgResponseTime: 85 },
  { endpoint: "/api/auth/login", p50: 120, p95: 250, p99: 500, requestCount: 3200, errorRate: 0.1, avgResponseTime: 145 },
  { endpoint: "/api/live/scoreboard", p50: 35, p95: 90, p99: 200, requestCount: 28500, errorRate: 0.5, avgResponseTime: 48 },
  { endpoint: "/api/quantum/analyze", p50: 250, p95: 580, p99: 1200, requestCount: 6800, errorRate: 0.4, avgResponseTime: 310 },
  { endpoint: "/api/stripe/webhook", p50: 80, p95: 150, p99: 300, requestCount: 1200, errorRate: 0.0, avgResponseTime: 95 },
];

const sloDefinitions: SLODefinition[] = [
  { id: "slo_1", name: "API Availability", description: "Overall API uptime", metric: "uptime_percent", target: 99.9, current: 99.94, status: "met", window: "30d rolling", budget: 43.2, budgetRemaining: 38.1, alertThreshold: 99.85 },
  { id: "slo_2", name: "P95 Latency", description: "95th percentile API response time", metric: "latency_p95_ms", target: 500, current: 245, status: "met", window: "7d rolling", budget: 500, budgetRemaining: 255, alertThreshold: 450 },
  { id: "slo_3", name: "Deposit Success Rate", description: "Payment processing success rate", metric: "deposit_success_rate", target: 99.0, current: 98.4, status: "at_risk", window: "24h rolling", budget: 1.0, budgetRemaining: 0.4, alertThreshold: 98.5 },
  { id: "slo_4", name: "Crash-Free Users", description: "Percentage of users without crashes", metric: "crash_free_percent", target: 99.5, current: 99.7, status: "met", window: "7d rolling", budget: 0.5, budgetRemaining: 0.3, alertThreshold: 99.4 },
  { id: "slo_5", name: "Onboarding Conversion", description: "Signup-to-first-ticket conversion", metric: "onboarding_conversion", target: 70.0, current: 74.6, status: "met", window: "30d rolling", budget: 30.0, budgetRemaining: 25.4, alertThreshold: 68.0 },
  { id: "slo_6", name: "Data Freshness", description: "Odds data staleness threshold", metric: "data_freshness_sec", target: 60, current: 32, status: "met", window: "1h rolling", budget: 60, budgetRemaining: 28, alertThreshold: 50 },
];

const alertRules: AlertRule[] = [
  { id: "alert_1", name: "High Error Rate", metric: "error_rate_percent", condition: "above", threshold: 2.0, severity: "critical", timeWindow: "5m", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "PagerDuty → On-call engineer → CTO", status: "active" },
  { id: "alert_2", name: "Payment Gateway Failure", metric: "payment_success_rate", condition: "below", threshold: 95.0, severity: "critical", timeWindow: "10m", enabled: true, lastTriggered: "2026-02-19T20:05:00Z", triggerCount: 2, escalation: "PagerDuty → Payment team → Finance lead", status: "resolved" },
  { id: "alert_3", name: "DAU Drop", metric: "dau_change_percent", condition: "below", threshold: -20.0, severity: "high", timeWindow: "1d", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "Slack #alerts → Product lead", status: "active" },
  { id: "alert_4", name: "Signup Conversion Drop", metric: "signup_conversion_rate", condition: "below", threshold: 25.0, severity: "high", timeWindow: "24h", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "Slack #growth → Growth lead", status: "active" },
  { id: "alert_5", name: "API Latency Spike", metric: "latency_p95_ms", condition: "above", threshold: 500, severity: "medium", timeWindow: "5m", enabled: true, lastTriggered: "2026-02-18T14:30:00Z", triggerCount: 5, escalation: "Slack #engineering → Backend lead", status: "active" },
  { id: "alert_6", name: "Chargeback Spike", metric: "chargeback_rate", condition: "above", threshold: 1.0, severity: "critical", timeWindow: "24h", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "PagerDuty → Finance → Legal", status: "active" },
  { id: "alert_7", name: "Data Pipeline Lag", metric: "pipeline_lag_minutes", condition: "above", threshold: 15, severity: "medium", timeWindow: "15m", enabled: true, lastTriggered: "2026-02-17T03:15:00Z", triggerCount: 3, escalation: "Slack #data-eng → Data lead", status: "active" },
  { id: "alert_8", name: "Memory Usage Critical", metric: "memory_usage_percent", condition: "above", threshold: 90, severity: "high", timeWindow: "5m", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "PagerDuty → Infrastructure → DevOps", status: "active" },
  { id: "alert_9", name: "Trial Fraud Spike", metric: "fraud_risk_score_avg", condition: "above", threshold: 60, severity: "high", timeWindow: "1h", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "Slack #security → Fraud ops", status: "active" },
  { id: "alert_10", name: "Schema Validation Failure", metric: "schema_validation_failures", condition: "above", threshold: 50, severity: "medium", timeWindow: "1h", enabled: true, lastTriggered: null, triggerCount: 0, escalation: "Slack #data-eng → Analytics lead", status: "active" },
];

const dataQualityChecks: DataQualityCheck[] = [
  { id: "dq_1", name: "Event Schema Validation", type: "schema", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "All 25 event types conform to schema", metric: "schema_conformance", expected: "100%", actual: "100%", severity: "critical" },
  { id: "dq_2", name: "Daily Event Completeness", type: "completeness", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "All expected event types received in last 24h", metric: "event_completeness", expected: "14/14 types", actual: "14/14 types", severity: "high" },
  { id: "dq_3", name: "User ID Null Rate", type: "completeness", status: "warning", lastRun: "2026-02-20T14:00:00Z", details: "3.2% of events missing user_id (threshold: 2%)", metric: "null_user_id_rate", expected: "<2%", actual: "3.2%", severity: "medium" },
  { id: "dq_4", name: "Timestamp Freshness", type: "freshness", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "Most recent event within 30s", metric: "event_freshness", expected: "<60s", actual: "28s", severity: "high" },
  { id: "dq_5", name: "Duplicate Event Detection", type: "consistency", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "Duplicate rate 0.01% within tolerance", metric: "duplicate_rate", expected: "<0.1%", actual: "0.01%", severity: "medium" },
  { id: "dq_6", name: "Revenue Data Reconciliation", type: "consistency", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "Analytics revenue matches Stripe within $2.50", metric: "revenue_discrepancy", expected: "<$10", actual: "$2.47", severity: "critical" },
  { id: "dq_7", name: "Session Duration Anomaly", type: "anomaly", status: "warning", lastRun: "2026-02-20T14:00:00Z", details: "Avg session duration 18% above 7-day baseline", metric: "session_duration_zscore", expected: "<2 std dev", actual: "1.8 std dev", severity: "low" },
  { id: "dq_8", name: "Conversion Funnel Integrity", type: "consistency", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "No step has more conversions than previous step", metric: "funnel_monotonicity", expected: "monotonic decreasing", actual: "valid", severity: "high" },
  { id: "dq_9", name: "PII Leak Detection", type: "schema", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "No PII detected in event properties", metric: "pii_scan", expected: "0 violations", actual: "0 violations", severity: "critical" },
  { id: "dq_10", name: "Timezone Consistency", type: "consistency", status: "pass", lastRun: "2026-02-20T14:00:00Z", details: "All timestamps in ISO8601 UTC format", metric: "timezone_format", expected: "100% UTC", actual: "100% UTC", severity: "medium" },
];

const paymentMetrics: PaymentMetric[] = (() => {
  const data: PaymentMetric[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const transactions = Math.round(40 + Math.random() * 25);
    const successful = Math.round(transactions * (0.96 + Math.random() * 0.03));
    data.push({
      date: date.toISOString().split("T")[0],
      totalTransactions: transactions,
      successfulPayments: successful,
      failedPayments: transactions - successful,
      successRate: Math.round((successful / transactions) * 100 * 10) / 10,
      totalRevenue: Math.round((successful * (15 + Math.random() * 10)) * 100) / 100,
      avgTransactionValue: Math.round((15 + Math.random() * 10) * 100) / 100,
      chargebacks: Math.random() > 0.8 ? 1 : 0,
      chargebackRate: Math.round(Math.random() * 0.5 * 100) / 100,
      refunds: Math.round(Math.random() * 3),
      refundAmount: Math.round(Math.random() * 50 * 100) / 100,
    });
  }
  return data;
})();

const incidentPlaybooks: IncidentPlaybook[] = [
  {
    id: "pb_1", title: "Payment Gateway Failure", category: "payments", severity: "critical",
    description: "Complete or partial failure of Stripe payment processing",
    steps: ["1. Check Stripe status page (status.stripe.com)", "2. Verify webhook endpoint health: GET /api/health", "3. Check Stripe API key validity in secrets", "4. Review recent failed payment logs: SELECT * FROM audit WHERE action='payment_failed' ORDER BY timestamp DESC LIMIT 20", "5. If Stripe outage: Enable maintenance banner, queue retry jobs", "6. If config issue: Rotate API keys, redeploy", "7. Monitor recovery for 30 min", "8. Post-mortem within 24h"],
    estimatedResolution: "15-60 minutes", lastUsed: "2026-02-19T20:05:00Z", useCount: 2
  },
  {
    id: "pb_2", title: "Signup/Verification Outage", category: "auth", severity: "critical",
    description: "Users unable to register or verify accounts",
    steps: ["1. Check auth service health endpoint", "2. Verify database connectivity: SELECT 1", "3. Check for rate limiting blocks", "4. Review auth error logs for patterns", "5. Test signup flow manually", "6. If DB issue: Check connection pool, restart if needed", "7. If validation issue: Review recent schema changes", "8. Clear rate limit caches if blocking legitimate users"],
    estimatedResolution: "10-30 minutes", lastUsed: null, useCount: 0
  },
  {
    id: "pb_3", title: "Post-Release Error Spike", category: "deployment", severity: "high",
    description: "Significant increase in errors after code deployment",
    steps: ["1. Compare error rates: current vs pre-deploy baseline", "2. Identify new error types introduced", "3. Check deployment diff for breaking changes", "4. If critical: Initiate rollback procedure", "5. If non-critical: Hotfix and deploy", "6. Verify error rates return to baseline", "7. Update regression test suite", "8. Review deployment checklist"],
    estimatedResolution: "15-45 minutes", lastUsed: "2026-02-15T10:00:00Z", useCount: 3
  },
  {
    id: "pb_4", title: "Sudden DAU Drop", category: "product", severity: "high",
    description: "Daily active users decrease by >20% from baseline",
    steps: ["1. Verify data pipeline is functioning (not a data issue)", "2. Check for external factors (competitor launch, bad press)", "3. Review recent feature changes or removals", "4. Check push notification delivery rates", "5. Analyze affected user segments (geo, platform, tier)", "6. Review App Store reviews for complaints", "7. If feature bug: Hotfix deploy", "8. If external: Prepare user communication"],
    estimatedResolution: "2-24 hours", lastUsed: null, useCount: 0
  },
  {
    id: "pb_5", title: "Chargeback Spike", category: "payments", severity: "critical",
    description: "Chargeback rate exceeding 1% threshold",
    steps: ["1. Pull affected transactions list", "2. Cross-reference with fraud detection signals", "3. Identify common patterns (geo, amount, timing)", "4. Block suspected fraudulent accounts", "5. Contact payment processor for guidance", "6. Review fraud detection thresholds", "7. Implement additional verification for flagged patterns", "8. Report to legal/compliance team"],
    estimatedResolution: "1-4 hours", lastUsed: null, useCount: 0
  },
  {
    id: "pb_6", title: "Data Pipeline Lag", category: "data", severity: "medium",
    description: "Analytics data pipeline falling behind real-time",
    steps: ["1. Check pipeline health dashboard", "2. Identify bottleneck stage (ingest, transform, load)", "3. Check for upstream data volume spike", "4. Verify compute resources are adequate", "5. If backpressure: Scale up consumers temporarily", "6. If schema break: Fix transform, replay from checkpoint", "7. Monitor catch-up progress", "8. Set up auto-scaling for future spikes"],
    estimatedResolution: "30-120 minutes", lastUsed: "2026-02-17T03:20:00Z", useCount: 3
  },
  {
    id: "pb_7", title: "Analytics Schema Break", category: "data", severity: "high",
    description: "Event schema change breaking downstream analytics",
    steps: ["1. Identify which events have changed schema", "2. Check event validation failure logs", "3. Determine if change was intentional or accidental", "4. If accidental: Revert source code change", "5. If intentional: Update downstream schema, backfill", "6. Verify dashboard queries still function", "7. Update schema registry/documentation", "8. Add schema change alerting if missing"],
    estimatedResolution: "30-90 minutes", lastUsed: null, useCount: 0
  },
  {
    id: "pb_8", title: "Odds Provider API Failure", category: "integration", severity: "high",
    description: "External odds provider API returning errors or stale data",
    steps: ["1. Check provider status page", "2. Verify API key/auth is valid", "3. Test with manual API call (curl)", "4. If provider down: Switch to cached data, show staleness warning", "5. If auth issue: Rotate credentials", "6. If rate limited: Implement backoff, reduce poll frequency", "7. Enable fallback provider if available", "8. Monitor until provider recovers"],
    estimatedResolution: "15-60 minutes", lastUsed: "2026-02-18T06:10:00Z", useCount: 4
  },
];

function getRealTimeHealth(): RealTimeHealth {
  return {
    activeUsers: Math.round(200 + Math.random() * 150),
    activeSessions: Math.round(250 + Math.random() * 200),
    requestsPerMinute: Math.round(800 + Math.random() * 400),
    avgResponseTime: Math.round(80 + Math.random() * 60),
    errorRate: Math.round(Math.random() * 100) / 100,
    cpuUsage: Math.round((30 + Math.random() * 25) * 10) / 10,
    memoryUsage: Math.round((45 + Math.random() * 20) * 10) / 10,
    uptime: 99.94,
    lastDeployment: "2026-02-20T08:30:00Z",
    dbConnections: Math.round(15 + Math.random() * 10),
    cacheHitRate: Math.round((85 + Math.random() * 12) * 10) / 10,
    queueDepth: Math.round(Math.random() * 15),
  };
}

function getDashboardOverview() {
  return {
    kpis,
    funnelData,
    cohortRetention,
    revenueMetrics,
    timeSeries: {
      dau: generateTimeSeries(30, 2500, 500),
      mau: generateTimeSeries(30, 18000, 2000),
      revenue: generateTimeSeries(30, 1500, 300),
      errorRate: generateTimeSeries(30, 0.5, 0.3),
    },
  };
}

function getFunnelAnalysis() {
  return {
    funnel: funnelData,
    overallConversion: funnelData.length > 0
      ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100 * 10) / 10
      : 0,
    biggestDropoff: funnelData.reduce((max, step) => step.dropoff > max.dropoff ? step : max, funnelData[0]),
    avgTimeToConvert: funnelData.reduce((sum, step) => sum + step.avgTimeToNext, 0),
  };
}

function getRetentionAnalysis() {
  return {
    cohorts: cohortRetention,
    averageRetention: {
      day1: Math.round(cohortRetention.reduce((s, c) => s + c.day1, 0) / cohortRetention.length),
      day7: Math.round(cohortRetention.reduce((s, c) => s + c.day7, 0) / cohortRetention.filter(c => c.day7 > 0).length),
      day30: Math.round(cohortRetention.reduce((s, c) => s + c.day30, 0) / cohortRetention.filter(c => c.day30 > 0).length),
    },
    trend: "improving",
  };
}

function getRevenueAnalysis() {
  return {
    metrics: revenueMetrics,
    summary: {
      totalRevenue: revenueMetrics.reduce((s, r) => s + r.revenue, 0),
      avgARPU: Math.round(revenueMetrics.reduce((s, r) => s + r.arpu, 0) / revenueMetrics.length * 100) / 100,
      totalNewMRR: revenueMetrics.reduce((s, r) => s + r.newMRR, 0),
      totalChurnedMRR: revenueMetrics.reduce((s, r) => s + r.churnedMRR, 0),
      netMRRGrowth: revenueMetrics.reduce((s, r) => s + r.netMRR, 0),
      avgLTV: Math.round(revenueMetrics.reduce((s, r) => s + r.ltv, 0) / revenueMetrics.length * 100) / 100,
    },
  };
}

function getErrorsAndPerformance() {
  return {
    errors: errorMetrics,
    performance: performanceMetrics,
    summary: {
      totalErrors: errorMetrics.reduce((s, e) => s + e.count, 0),
      criticalErrors: errorMetrics.filter(e => e.severity === "critical").length,
      unresolvedErrors: errorMetrics.filter(e => !e.resolved).length,
      avgP95Latency: Math.round(performanceMetrics.reduce((s, p) => s + p.p95, 0) / performanceMetrics.length),
      totalRequests: performanceMetrics.reduce((s, p) => s + p.requestCount, 0),
      avgErrorRate: Math.round(performanceMetrics.reduce((s, p) => s + p.errorRate, 0) / performanceMetrics.length * 100) / 100,
    },
  };
}

function getPaymentAnalysis() {
  return {
    metrics: paymentMetrics,
    summary: {
      totalRevenue: Math.round(paymentMetrics.reduce((s, p) => s + p.totalRevenue, 0) * 100) / 100,
      totalTransactions: paymentMetrics.reduce((s, p) => s + p.totalTransactions, 0),
      avgSuccessRate: Math.round(paymentMetrics.reduce((s, p) => s + p.successRate, 0) / paymentMetrics.length * 10) / 10,
      totalChargebacks: paymentMetrics.reduce((s, p) => s + p.chargebacks, 0),
      totalRefunds: paymentMetrics.reduce((s, p) => s + p.refunds, 0),
      totalRefundAmount: Math.round(paymentMetrics.reduce((s, p) => s + p.refundAmount, 0) * 100) / 100,
    },
  };
}

function getSLOs() {
  return sloDefinitions;
}

function getAlertRules() {
  return alertRules;
}

function getAlertRule(id: string): AlertRule | undefined {
  return alertRules.find(a => a.id === id);
}

function updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
  const idx = alertRules.findIndex(a => a.id === id);
  if (idx === -1) return undefined;
  alertRules[idx] = { ...alertRules[idx], ...updates };
  return alertRules[idx];
}

function createAlertRule(data: Omit<AlertRule, "id" | "lastTriggered" | "triggerCount" | "status">): AlertRule {
  const rule: AlertRule = {
    ...data,
    id: generateId("alert"),
    lastTriggered: null,
    triggerCount: 0,
    status: "active",
  };
  alertRules.push(rule);
  return rule;
}

function getDataQualityChecks() {
  return dataQualityChecks;
}

function getIncidentPlaybooks() {
  return incidentPlaybooks;
}

function getIncidentPlaybook(id: string): IncidentPlaybook | undefined {
  return incidentPlaybooks.find(p => p.id === id);
}

function getAnalyticsDashboardStats() {
  return {
    kpiCount: kpis.length,
    alertsActive: alertRules.filter(a => a.enabled).length,
    alertsFiring: alertRules.filter(a => a.status === "firing").length,
    slosTotal: sloDefinitions.length,
    slosMet: sloDefinitions.filter(s => s.status === "met").length,
    slosAtRisk: sloDefinitions.filter(s => s.status === "at_risk").length,
    slosBreached: sloDefinitions.filter(s => s.status === "breached").length,
    dataQualityPassing: dataQualityChecks.filter(d => d.status === "pass").length,
    dataQualityWarning: dataQualityChecks.filter(d => d.status === "warning").length,
    dataQualityFailing: dataQualityChecks.filter(d => d.status === "fail").length,
    dataQualityTotal: dataQualityChecks.length,
    totalErrors: errorMetrics.reduce((s, e) => s + e.count, 0),
    unresolvedErrors: errorMetrics.filter(e => !e.resolved).length,
    playbooksAvailable: incidentPlaybooks.length,
  };
}

export {
  getDashboardOverview,
  getFunnelAnalysis,
  getRetentionAnalysis,
  getRevenueAnalysis,
  getErrorsAndPerformance,
  getPaymentAnalysis,
  getRealTimeHealth,
  getSLOs,
  getAlertRules,
  getAlertRule,
  updateAlertRule,
  createAlertRule,
  getDataQualityChecks,
  getIncidentPlaybooks,
  getIncidentPlaybook,
  getAnalyticsDashboardStats,
};

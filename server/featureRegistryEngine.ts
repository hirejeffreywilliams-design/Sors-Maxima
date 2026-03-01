import { randomBytes } from "crypto";

export type FeatureStatus = "healthy" | "degraded" | "critical" | "maintenance" | "disabled";
export type ComplianceStatus = "compliant" | "non_compliant" | "review_needed" | "exempt";
export type EventSeverity = "info" | "warning" | "error" | "critical";

export interface FeatureResponsibility {
  statement: string;
  boundaries: string[];
}

export interface FeatureContract {
  producedEvents: string[];
  consumedEvents: string[];
  errorCodes: string[];
  retryPolicy: string;
}

export interface FeatureObservability {
  kpis: string[];
  metrics: string[];
  logLevel: string;
  tracingEnabled: boolean;
  alarmThresholds: Record<string, number>;
}

export interface SafetyRule {
  id: string;
  rule: string;
  enforcement: "blocking" | "warning" | "audit_only";
  lastChecked: string;
  compliant: boolean;
}

export interface FeatureRecord {
  id: string;
  name: string;
  version: string;
  owner: string;
  responsibility: FeatureResponsibility;
  status: FeatureStatus;
  complianceStatus: ComplianceStatus;
  healthScore: number;
  inputs: { name: string; type: string; required: boolean; validation: string }[];
  outputs: { name: string; type: string; description: string }[];
  businessRules: { id: string; rule: string; threshold?: string; active: boolean }[];
  safetyRules: SafetyRule[];
  contract: FeatureContract;
  observability: FeatureObservability;
  dependencies: string[];
  failureModes: { mode: string; fallback: string; lastTested: string }[];
  privacyRules: { dataClass: string; retention: string; encryption: boolean; piiMinimized: boolean }[];
  ticketingRules: { trigger: string; ticketType: string; priority: string; autoCreate: boolean }[];
  lastHealthCheck: string;
  lastComplianceAudit: string;
  uptime30d: number;
  errorRate: number;
  avgLatencyMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoordinationEvent {
  id: string;
  sourceFeature: string;
  targetFeature: string | "broadcast";
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  acknowledged: boolean;
  processingStatus: "pending" | "processed" | "failed" | "retrying";
  retryCount: number;
}

export interface CoordinationRule {
  id: string;
  name: string;
  description: string;
  sourceFeatures: string[];
  targetFeatures: string[];
  condition: string;
  action: string;
  priority: "safety" | "compliance" | "business" | "operational";
  enabled: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}

export interface BusinessConstraint {
  id: string;
  name: string;
  category: "safety" | "ethical" | "legal" | "operational";
  description: string;
  enforcement: "hard_block" | "soft_warn" | "audit_trail";
  active: boolean;
  violationCount: number;
  lastViolation: string | null;
}

export interface RegistryMetrics {
  totalFeatures: number;
  healthyFeatures: number;
  degradedFeatures: number;
  criticalFeatures: number;
  complianceRate: number;
  avgHealthScore: number;
  totalEvents24h: number;
  failedEvents24h: number;
  activeConstraints: number;
  constraintViolations: number;
  avgUptime: number;
  avgErrorRate: number;
}

const features = new Map<string, FeatureRecord>();
const events = new Map<string, CoordinationEvent>();
const coordinationRules = new Map<string, CoordinationRule>();
const businessConstraints = new Map<string, BusinessConstraint>();

function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function registerFeature(feature: FeatureRecord): FeatureRecord {
  features.set(feature.id, feature);
  return feature;
}

export function getFeature(id: string): FeatureRecord | undefined {
  return features.get(id);
}

export function getAllFeatures(): FeatureRecord[] {
  return Array.from(features.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function updateFeatureStatus(id: string, status: FeatureStatus, healthScore?: number): FeatureRecord | null {
  const feature = features.get(id);
  if (!feature) return null;
  feature.status = status;
  if (healthScore !== undefined) feature.healthScore = healthScore;
  feature.updatedAt = new Date().toISOString();
  feature.lastHealthCheck = new Date().toISOString();
  return feature;
}

export function updateComplianceStatus(id: string, status: ComplianceStatus): FeatureRecord | null {
  const feature = features.get(id);
  if (!feature) return null;
  feature.complianceStatus = status;
  feature.lastComplianceAudit = new Date().toISOString();
  feature.updatedAt = new Date().toISOString();
  return feature;
}

export function emitEvent(input: {
  sourceFeature: string;
  targetFeature: string | "broadcast";
  eventType: string;
  payload: Record<string, unknown>;
}): CoordinationEvent {
  const event: CoordinationEvent = {
    id: generateId("evt"),
    sourceFeature: input.sourceFeature,
    targetFeature: input.targetFeature,
    eventType: input.eventType,
    payload: input.payload,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    processingStatus: "pending",
    retryCount: 0,
  };
  events.set(event.id, event);
  return event;
}

export function acknowledgeEvent(eventId: string): CoordinationEvent | null {
  const event = events.get(eventId);
  if (!event) return null;
  event.acknowledged = true;
  event.processingStatus = "processed";
  return event;
}

export function getRecentEvents(limit: number = 50): CoordinationEvent[] {
  return Array.from(events.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getAllCoordinationRules(): CoordinationRule[] {
  return Array.from(coordinationRules.values());
}

export function toggleCoordinationRule(id: string, enabled: boolean): CoordinationRule | null {
  const rule = coordinationRules.get(id);
  if (!rule) return null;
  rule.enabled = enabled;
  return rule;
}

export function getAllBusinessConstraints(): BusinessConstraint[] {
  return Array.from(businessConstraints.values());
}

export function toggleBusinessConstraint(id: string, active: boolean): BusinessConstraint | null {
  const constraint = businessConstraints.get(id);
  if (!constraint) return null;
  constraint.active = active;
  return constraint;
}

export function getRegistryMetrics(): RegistryMetrics {
  const allFeatures = Array.from(features.values());
  const allEvents = Array.from(events.values());
  const now = Date.now();
  const events24h = allEvents.filter(e => now - new Date(e.timestamp).getTime() < 86400000);
  const constraints = Array.from(businessConstraints.values());

  return {
    totalFeatures: allFeatures.length,
    healthyFeatures: allFeatures.filter(f => f.status === "healthy").length,
    degradedFeatures: allFeatures.filter(f => f.status === "degraded").length,
    criticalFeatures: allFeatures.filter(f => f.status === "critical").length,
    complianceRate: allFeatures.length > 0
      ? parseFloat((allFeatures.filter(f => f.complianceStatus === "compliant").length / allFeatures.length * 100).toFixed(1))
      : 100,
    avgHealthScore: allFeatures.length > 0
      ? parseFloat((allFeatures.reduce((s, f) => s + f.healthScore, 0) / allFeatures.length).toFixed(1))
      : 0,
    totalEvents24h: events24h.length,
    failedEvents24h: events24h.filter(e => e.processingStatus === "failed").length,
    activeConstraints: constraints.filter(c => c.active).length,
    constraintViolations: constraints.reduce((s, c) => s + c.violationCount, 0),
    avgUptime: allFeatures.length > 0
      ? parseFloat((allFeatures.reduce((s, f) => s + f.uptime30d, 0) / allFeatures.length).toFixed(2))
      : 100,
    avgErrorRate: allFeatures.length > 0
      ? parseFloat((allFeatures.reduce((s, f) => s + f.errorRate, 0) / allFeatures.length).toFixed(3))
      : 0,
  };
}

function seedFeatures() {
  const now = new Date().toISOString();
  const featureSpecs: Omit<FeatureRecord, "id" | "createdAt" | "updatedAt">[] = [
    {
      name: "User Account & KYC",
      version: "3.2.1",
      owner: "identity_team",
      responsibility: {
        statement: "Verify user identity, age, and jurisdiction; emit KYC status and risk score",
        boundaries: ["Identity verification", "Age validation", "Jurisdiction checks", "Document processing"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 96,
      inputs: [
        { name: "user_data", type: "UserProfile", required: true, validation: "zod_schema_v3" },
        { name: "documents", type: "IdentityDocument[]", required: true, validation: "document_validator" },
      ],
      outputs: [
        { name: "kyc_status", type: "KYCResult", description: "Verification result with risk score" },
        { name: "jurisdiction_data", type: "JurisdictionInfo", description: "User's legal jurisdiction details" },
      ],
      businessRules: [
        { id: "br1", rule: "Minimum age 21 for all users", threshold: "age >= 21", active: true },
        { id: "br2", rule: "Document expiry check within 6 months", threshold: "expiry > now + 6m", active: true },
        { id: "br3", rule: "Jurisdiction whitelist enforcement", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Block users from restricted jurisdictions", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "Flag underage attempts for review", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["kyc.verified", "kyc.failed", "kyc.pending_review", "jurisdiction.changed"],
        consumedEvents: ["user.registered", "user.profile_updated"],
        errorCodes: ["KYC_001", "KYC_002", "KYC_003"],
        retryPolicy: "exponential_backoff_3x",
      },
      observability: {
        kpis: ["kyc_completion_rate", "avg_verification_time", "false_rejection_rate"],
        metrics: ["kyc_requests_total", "kyc_duration_seconds", "document_quality_score"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { kyc_failure_rate: 10, avg_verification_time_seconds: 120 },
      },
      dependencies: ["document_verification_api", "jurisdiction_database"],
      failureModes: [
        { mode: "Document API unavailable", fallback: "Queue for manual review", lastTested: "2026-02-15" },
        { mode: "Jurisdiction DB timeout", fallback: "Use cached jurisdiction data (5min TTL)", lastTested: "2026-02-18" },
      ],
      privacyRules: [
        { dataClass: "PII", retention: "7 years", encryption: true, piiMinimized: false },
        { dataClass: "Documents", retention: "90 days after verification", encryption: true, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "KYC verification failed 3+ times", ticketType: "kyc_issue", priority: "P1", autoCreate: true },
        { trigger: "Suspicious document detected", ticketType: "fraud_alert", priority: "P0", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-19T00:00:00Z",
      uptime30d: 99.97,
      errorRate: 0.02,
      avgLatencyMs: 245,
    },
    {
      name: "Risk Management & Trading",
      version: "5.1.0",
      owner: "trading_team",
      responsibility: {
        statement: "Set and update odds, manage exposure limits, make acceptance decisions",
        boundaries: ["Odds computation", "Exposure tracking", "Bet acceptance/rejection", "Liability management"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 94,
      inputs: [
        { name: "bet_request", type: "BetRequest", required: true, validation: "bet_schema_v4" },
        { name: "market_data", type: "MarketData", required: true, validation: "market_feed_validator" },
      ],
      outputs: [
        { name: "acceptance_decision", type: "AcceptanceResult", description: "Bet accept/reject with reason" },
        { name: "updated_odds", type: "OddsUpdate", description: "Adjusted odds after bet placement" },
      ],
      businessRules: [
        { id: "br1", rule: "Maximum single bet exposure $10,000", threshold: "exposure <= 10000", active: true },
        { id: "br2", rule: "Minimum margin 4.5% on all markets", threshold: "margin >= 0.045", active: true },
        { id: "br3", rule: "Auto-suspend market at 95% exposure cap", threshold: "exposure_pct <= 95", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Reject bets from self-excluded users", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "Enforce responsible gambling deposit limits", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["bet.accepted", "bet.rejected", "odds.updated", "exposure.warning", "market.suspended"],
        consumedEvents: ["bet.requested", "market.created", "settlement.completed"],
        errorCodes: ["RISK_001", "RISK_002", "RISK_003", "RISK_004"],
        retryPolicy: "immediate_retry_1x_then_queue",
      },
      observability: {
        kpis: ["acceptance_rate", "avg_margin", "exposure_utilization"],
        metrics: ["bets_processed_total", "odds_updates_per_second", "exposure_current"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { exposure_pct: 90, margin_below_target: 4.0, latency_p99_ms: 50 },
      },
      dependencies: ["pricing_engine", "market_feed", "kyc_service"],
      failureModes: [
        { mode: "Market feed disconnected", fallback: "Suspend affected markets, use last known odds", lastTested: "2026-02-17" },
        { mode: "Pricing engine timeout", fallback: "Reject new bets, maintain existing positions", lastTested: "2026-02-19" },
      ],
      privacyRules: [
        { dataClass: "Betting data", retention: "5 years", encryption: true, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "Exposure exceeds 80% of limit", ticketType: "business_rule_violation", priority: "P2", autoCreate: true },
        { trigger: "Unusual betting pattern detected", ticketType: "human_review", priority: "P1", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-18T00:00:00Z",
      uptime30d: 99.99,
      errorRate: 0.01,
      avgLatencyMs: 12,
    },
    {
      name: "Responsible Gambling",
      version: "2.4.0",
      owner: "player_safety_team",
      responsibility: {
        statement: "Detect problem gambling behavior and apply interventions including cool-downs, limits, and referrals",
        boundaries: ["Behavior monitoring", "Intervention triggers", "Self-exclusion management", "Support referrals"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 98,
      inputs: [
        { name: "user_activity", type: "ActivityStream", required: true, validation: "activity_schema" },
        { name: "bet_history", type: "BetHistory", required: true, validation: "history_validator" },
      ],
      outputs: [
        { name: "intervention", type: "InterventionAction", description: "Required intervention action" },
        { name: "risk_assessment", type: "GamblingRiskScore", description: "User gambling risk level" },
      ],
      businessRules: [
        { id: "br1", rule: "Trigger cool-down after 3+ hours continuous play", threshold: "session_duration <= 180min", active: true },
        { id: "br2", rule: "Flag rapid loss chasing behavior", active: true },
        { id: "br3", rule: "Enforce deposit limits per jurisdiction", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Immediately enforce self-exclusion requests", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "No promotional messaging to at-risk users", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr3", rule: "Provide helpline information on all interventions", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["intervention.triggered", "self_exclusion.activated", "risk.elevated", "cool_down.started"],
        consumedEvents: ["bet.placed", "session.started", "session.ended", "deposit.made"],
        errorCodes: ["RG_001", "RG_002"],
        retryPolicy: "guaranteed_delivery",
      },
      observability: {
        kpis: ["self_exclusion_rate", "intervention_effectiveness", "recidivism_rate"],
        metrics: ["interventions_triggered_total", "avg_session_duration", "at_risk_users_count"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { intervention_failure_rate: 0.1, self_exclusion_bypass_attempts: 1 },
      },
      dependencies: ["user_service", "notification_service"],
      failureModes: [
        { mode: "Intervention service unavailable", fallback: "Block all betting for affected user until service recovers", lastTested: "2026-02-20" },
      ],
      privacyRules: [
        { dataClass: "Health-related", retention: "Required by law", encryption: true, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "High-risk gambling behavior detected", ticketType: "human_review", priority: "P0", autoCreate: true },
        { trigger: "Self-exclusion request received", ticketType: "incident", priority: "P0", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-20T00:00:00Z",
      uptime30d: 100.0,
      errorRate: 0.0,
      avgLatencyMs: 35,
    },
    {
      name: "Fraud & AML Detection",
      version: "4.0.2",
      owner: "security_team",
      responsibility: {
        statement: "Detect money laundering, collusion, and fraudulent activity; flag, freeze, and escalate accounts",
        boundaries: ["Transaction monitoring", "Pattern analysis", "Account freezing", "Regulatory reporting"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 95,
      inputs: [
        { name: "transactions", type: "TransactionStream", required: true, validation: "transaction_schema" },
        { name: "user_behavior", type: "BehaviorSignals", required: true, validation: "signal_schema" },
      ],
      outputs: [
        { name: "fraud_alert", type: "FraudAlert", description: "Fraud detection result with evidence" },
        { name: "aml_report", type: "AMLReport", description: "Suspicious activity report" },
      ],
      businessRules: [
        { id: "br1", rule: "Flag transactions above $10,000 for AML review", threshold: "amount >= 10000", active: true },
        { id: "br2", rule: "Detect structuring patterns (multiple sub-threshold txns)", active: true },
        { id: "br3", rule: "Cross-reference with sanctions lists", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Immediately freeze account on confirmed fraud", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "File SAR within 30 days of detection", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["fraud.detected", "aml.flagged", "account.frozen", "investigation.opened"],
        consumedEvents: ["transaction.completed", "bet.placed", "deposit.made", "withdrawal.requested"],
        errorCodes: ["FRAUD_001", "FRAUD_002", "AML_001"],
        retryPolicy: "guaranteed_delivery_with_dlq",
      },
      observability: {
        kpis: ["fraud_detection_rate", "false_positive_rate", "aml_review_time"],
        metrics: ["alerts_generated_total", "investigations_active", "accounts_frozen"],
        logLevel: "warn",
        tracingEnabled: true,
        alarmThresholds: { fraud_rate_spike: 200, aml_review_backlog: 50 },
      },
      dependencies: ["transaction_service", "sanctions_api", "kyc_service"],
      failureModes: [
        { mode: "Sanctions API unavailable", fallback: "Queue transactions for later screening, block high-risk", lastTested: "2026-02-16" },
      ],
      privacyRules: [
        { dataClass: "Investigation data", retention: "10 years", encryption: true, piiMinimized: false },
      ],
      ticketingRules: [
        { trigger: "High-confidence fraud detection (>0.8)", ticketType: "fraud_alert", priority: "P0", autoCreate: true },
        { trigger: "AML threshold breach", ticketType: "human_review", priority: "P0", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-19T00:00:00Z",
      uptime30d: 99.98,
      errorRate: 0.01,
      avgLatencyMs: 89,
    },
    {
      name: "Pricing & Margin Manager",
      version: "3.7.0",
      owner: "quant_team",
      responsibility: {
        statement: "Compute fair odds and margins; prevent arbitrage and negative EV positions",
        boundaries: ["Odds calculation", "Margin management", "Arbitrage detection", "Market making"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 92,
      inputs: [
        { name: "market_data", type: "RawMarketData", required: true, validation: "market_schema" },
        { name: "model_predictions", type: "PredictionSet", required: true, validation: "prediction_validator" },
      ],
      outputs: [
        { name: "priced_odds", type: "PricedOdds", description: "Final odds with margin applied" },
        { name: "arbitrage_alert", type: "ArbitrageAlert", description: "Detected arbitrage opportunity" },
      ],
      businessRules: [
        { id: "br1", rule: "Minimum overround 104%", threshold: "overround >= 1.04", active: true },
        { id: "br2", rule: "Maximum odds movement 15% per update", threshold: "delta <= 0.15", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Suspend market if pricing model confidence below 70%", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["odds.published", "arbitrage.detected", "margin.adjusted"],
        consumedEvents: ["market.created", "prediction.updated", "settlement.completed"],
        errorCodes: ["PRICE_001", "PRICE_002"],
        retryPolicy: "exponential_backoff_3x",
      },
      observability: {
        kpis: ["avg_margin", "arbitrage_incidents", "pricing_accuracy"],
        metrics: ["odds_computed_total", "margin_distribution", "model_confidence"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { negative_ev_positions: 1, margin_below_min: 3.5 },
      },
      dependencies: ["prediction_service", "market_feed", "competitor_odds_api"],
      failureModes: [
        { mode: "Prediction service timeout", fallback: "Use previous odds with wider margin", lastTested: "2026-02-14" },
      ],
      privacyRules: [
        { dataClass: "Market data", retention: "3 years", encryption: false, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "Arbitrage opportunity detected", ticketType: "business_rule_violation", priority: "P1", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-17T00:00:00Z",
      uptime30d: 99.95,
      errorRate: 0.03,
      avgLatencyMs: 18,
    },
    {
      name: "Payments & Wallet",
      version: "4.3.1",
      owner: "payments_team",
      responsibility: {
        statement: "Handle deposits, withdrawals, holds, and settlements; integrate AML holds and 2FA on withdrawals",
        boundaries: ["Payment processing", "Wallet management", "Settlement", "Compliance holds"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 97,
      inputs: [
        { name: "payment_request", type: "PaymentRequest", required: true, validation: "payment_schema_v3" },
      ],
      outputs: [
        { name: "payment_result", type: "PaymentResult", description: "Transaction result with receipt" },
        { name: "balance_update", type: "BalanceUpdate", description: "Updated wallet balance" },
      ],
      businessRules: [
        { id: "br1", rule: "2FA required for withdrawals above $500", threshold: "withdrawal >= 500", active: true },
        { id: "br2", rule: "Hold funds for pending AML review", active: true },
        { id: "br3", rule: "Settlement within 24 hours of event completion", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Block withdrawals during active AML investigation", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["deposit.completed", "withdrawal.completed", "settlement.processed", "hold.placed"],
        consumedEvents: ["payment.requested", "aml.hold_required", "bet.settled"],
        errorCodes: ["PAY_001", "PAY_002", "PAY_003"],
        retryPolicy: "exactly_once_with_idempotency",
      },
      observability: {
        kpis: ["payment_success_rate", "avg_settlement_time", "chargeback_rate"],
        metrics: ["transactions_total", "volume_daily", "failed_payments"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { payment_failure_rate: 2, chargeback_rate: 0.5 },
      },
      dependencies: ["stripe_api", "bank_api", "fraud_service"],
      failureModes: [
        { mode: "Payment gateway timeout", fallback: "Queue transaction, notify user of delay", lastTested: "2026-02-19" },
      ],
      privacyRules: [
        { dataClass: "Financial", retention: "7 years", encryption: true, piiMinimized: false },
      ],
      ticketingRules: [
        { trigger: "Payment processing failure", ticketType: "payment_issue", priority: "P1", autoCreate: true },
        { trigger: "Chargeback received", ticketType: "payment_issue", priority: "P0", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-20T00:00:00Z",
      uptime30d: 99.99,
      errorRate: 0.005,
      avgLatencyMs: 156,
    },
    {
      name: "Recommendation Engine",
      version: "4.2.0",
      owner: "ml_team",
      responsibility: {
        statement: "Generate probabilistic, evidence-backed bet recommendations with provenance, calibration, and continuous validation",
        boundaries: ["Prediction generation", "Confidence scoring", "Calibration monitoring", "Auto-send evaluation"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 91,
      inputs: [
        { name: "market_data", type: "MarketData", required: true, validation: "market_schema" },
        { name: "statistical_features", type: "FeatureVector", required: true, validation: "feature_validator" },
        { name: "user_profile", type: "UserProfile", required: false, validation: "profile_schema" },
      ],
      outputs: [
        { name: "recommendation", type: "Recommendation", description: "Bet recommendation with confidence and provenance" },
        { name: "confidence_ticket", type: "ConfidenceTicket", description: "Structured ticket for audit trail" },
      ],
      businessRules: [
        { id: "br1", rule: "Min 3 evidence sources per recommendation", threshold: "evidence_count >= 3", active: true },
        { id: "br2", rule: "Calibration check before each prediction batch", active: true },
        { id: "br3", rule: "Auto-send only above 0.75 confidence threshold", threshold: "confidence >= 0.75", active: true },
        { id: "br4", rule: "Kelly criterion position sizing with 25% fraction", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "No recommendations for self-excluded users", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "Include disclaimer on all recommendations", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr3", rule: "Throttle recommendations for at-risk users", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["recommendation.generated", "recommendation.sent", "recommendation.auto_placed", "calibration.alert"],
        consumedEvents: ["market.updated", "prediction.completed", "user.risk_level_changed"],
        errorCodes: ["RECO_001", "RECO_002", "RECO_003"],
        retryPolicy: "no_auto_retry_on_failure",
      },
      observability: {
        kpis: ["hit_rate", "realized_roi", "calibration_drift", "avg_confidence"],
        metrics: ["recommendations_generated_total", "auto_sends_total", "human_reviews_total"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { calibration_drift: 0.05, roi_degradation_pct: 20, hit_rate_drop_pct: 10 },
      },
      dependencies: ["prediction_service", "feature_store", "calibration_service"],
      failureModes: [
        { mode: "Prediction service unavailable", fallback: "Do not auto-generate; show previously vetted human picks", lastTested: "2026-02-20" },
        { mode: "Feature store stale data", fallback: "Flag recommendations with stale_data warning", lastTested: "2026-02-18" },
      ],
      privacyRules: [
        { dataClass: "Recommendation data", retention: "2 years", encryption: true, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "Low confidence recommendation (<0.6)", ticketType: "confidence_ticket", priority: "P1", autoCreate: true },
        { trigger: "High-stake recommendation (>$100)", ticketType: "human_review", priority: "P1", autoCreate: true },
        { trigger: "Calibration drift detected", ticketType: "system_alert", priority: "P0", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-20T00:00:00Z",
      uptime30d: 99.92,
      errorRate: 0.04,
      avgLatencyMs: 342,
    },
    {
      name: "Notifications & UX Orchestrator",
      version: "2.1.0",
      owner: "product_team",
      responsibility: {
        statement: "Deliver safe, personalized messages; throttle promotional pushes for risky users",
        boundaries: ["Push notifications", "In-app messaging", "Email campaigns", "Safety throttling"],
      },
      status: "healthy",
      complianceStatus: "compliant",
      healthScore: 93,
      inputs: [
        { name: "notification_request", type: "NotificationRequest", required: true, validation: "notification_schema" },
        { name: "user_risk_level", type: "RiskLevel", required: true, validation: "enum_validator" },
      ],
      outputs: [
        { name: "delivery_status", type: "DeliveryResult", description: "Notification delivery confirmation" },
      ],
      businessRules: [
        { id: "br1", rule: "Max 5 promotional notifications per day per user", threshold: "promo_count <= 5", active: true },
        { id: "br2", rule: "No promotions to users with gambling risk flag", active: true },
      ],
      safetyRules: [
        { id: "sr1", rule: "Block promotional content to self-excluded users", enforcement: "blocking", lastChecked: now, compliant: true },
        { id: "sr2", rule: "Include responsible gambling links in all promotional messages", enforcement: "blocking", lastChecked: now, compliant: true },
      ],
      contract: {
        producedEvents: ["notification.sent", "notification.failed", "notification.throttled"],
        consumedEvents: ["recommendation.generated", "intervention.triggered", "promotion.created"],
        errorCodes: ["NOTIF_001", "NOTIF_002"],
        retryPolicy: "exponential_backoff_3x",
      },
      observability: {
        kpis: ["delivery_rate", "open_rate", "throttle_rate"],
        metrics: ["notifications_sent_total", "notifications_throttled_total", "avg_delivery_time"],
        logLevel: "info",
        tracingEnabled: true,
        alarmThresholds: { delivery_failure_rate: 5, throttle_rate_spike: 50 },
      },
      dependencies: ["push_service", "email_service", "user_service"],
      failureModes: [
        { mode: "Push service unavailable", fallback: "Fall back to email, queue push for retry", lastTested: "2026-02-17" },
      ],
      privacyRules: [
        { dataClass: "Contact data", retention: "Until account deletion", encryption: true, piiMinimized: true },
      ],
      ticketingRules: [
        { trigger: "Notification delivery failure rate >5%", ticketType: "system_alert", priority: "P2", autoCreate: true },
      ],
      lastHealthCheck: now,
      lastComplianceAudit: "2026-02-18T00:00:00Z",
      uptime30d: 99.96,
      errorRate: 0.02,
      avgLatencyMs: 67,
    },
  ];

  for (const spec of featureSpecs) {
    const id = `feat_${spec.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    registerFeature({ id, ...spec, createdAt: now, updatedAt: now });
  }
}

function seedCoordinationRules() {
  const rules: Omit<CoordinationRule, "id">[] = [
    {
      name: "Safety Priority Override",
      description: "ResponsibleGambling, Fraud, or KYC restrictive actions must be honored immediately by all downstream modules",
      sourceFeatures: ["responsible_gambling", "fraud_detection", "kyc"],
      targetFeatures: ["risk_management", "payments", "notifications", "recommendation_engine"],
      condition: "intervention.triggered OR fraud.detected OR kyc.failed",
      action: "Block all operations for affected user until resolution",
      priority: "safety",
      enabled: true,
      lastTriggered: new Date(Date.now() - 3600000).toISOString(),
      triggerCount: 47,
    },
    {
      name: "Transactional Consistency",
      description: "Money movement + bet acceptance + ticket creation must be atomic or use compensating flows",
      sourceFeatures: ["risk_management", "payments"],
      targetFeatures: ["wallet", "ticketing"],
      condition: "bet.accepted AND payment.required",
      action: "Execute atomic transaction with idempotency key; compensate on failure",
      priority: "business",
      enabled: true,
      lastTriggered: new Date(Date.now() - 1800000).toISOString(),
      triggerCount: 1293,
    },
    {
      name: "Recommendation Safety Gate",
      description: "Block auto-send when user has responsible gambling flags or self-exclusion",
      sourceFeatures: ["recommendation_engine"],
      targetFeatures: ["responsible_gambling", "risk_management"],
      condition: "recommendation.auto_send_requested AND user.risk_level >= medium",
      action: "Convert to human_review ticket; block auto-placement",
      priority: "safety",
      enabled: true,
      lastTriggered: new Date(Date.now() - 7200000).toISOString(),
      triggerCount: 23,
    },
    {
      name: "KYC Data Authority",
      description: "KYC/jurisdiction data is the single source of truth; all features must query, not cache",
      sourceFeatures: ["kyc"],
      targetFeatures: ["risk_management", "payments", "fraud_detection", "notifications"],
      condition: "kyc.status_changed OR jurisdiction.updated",
      action: "Invalidate cached KYC data in all consuming features",
      priority: "compliance",
      enabled: true,
      lastTriggered: new Date(Date.now() - 14400000).toISOString(),
      triggerCount: 156,
    },
    {
      name: "Promotional Throttle for At-Risk Users",
      description: "No targeted promotions to users under restriction or self-excluded",
      sourceFeatures: ["responsible_gambling"],
      targetFeatures: ["notifications", "recommendation_engine"],
      condition: "user.risk_elevated OR user.self_excluded",
      action: "Block all promotional and recommendation notifications",
      priority: "safety",
      enabled: true,
      lastTriggered: new Date(Date.now() - 5400000).toISOString(),
      triggerCount: 89,
    },
    {
      name: "Exposure Limit Enforcement",
      description: "Enforce per-market and per-user exposure limits across all bet acceptance paths",
      sourceFeatures: ["risk_management", "pricing_engine"],
      targetFeatures: ["recommendation_engine", "payments"],
      condition: "exposure.approaching_limit (>80%)",
      action: "Warn recommendation engine; reduce suggested stakes; suspend market at 95%",
      priority: "business",
      enabled: true,
      lastTriggered: new Date(Date.now() - 10800000).toISOString(),
      triggerCount: 34,
    },
    {
      name: "Calibration Drift Response",
      description: "When model calibration drifts beyond threshold, pause auto-sends and trigger retraining",
      sourceFeatures: ["recommendation_engine"],
      targetFeatures: ["recommendation_engine", "risk_management"],
      condition: "calibration_drift > 0.05 OR roi_degradation > 20%",
      action: "Pause auto-sends; create system_alert ticket; trigger model retraining pipeline",
      priority: "operational",
      enabled: true,
      lastTriggered: null,
      triggerCount: 0,
    },
    {
      name: "Fraud-Payment Coordination",
      description: "Freeze payments when fraud alert is raised; require fraud team clearance to unfreeze",
      sourceFeatures: ["fraud_detection"],
      targetFeatures: ["payments"],
      condition: "fraud.detected AND confidence > 0.7",
      action: "Place hold on all pending withdrawals; freeze deposit acceptance; create P0 ticket",
      priority: "safety",
      enabled: true,
      lastTriggered: new Date(Date.now() - 86400000).toISOString(),
      triggerCount: 12,
    },
  ];

  for (const rule of rules) {
    const id = generateId("coord");
    coordinationRules.set(id, { id, ...rule });
  }
}

function seedBusinessConstraints() {
  const constraints: Omit<BusinessConstraint, "id">[] = [
    { name: "No Dark Pattern Nudges", category: "ethical", description: "Do not design features that exploit cognitive biases or use dark-pattern nudges to encourage betting", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
    { name: "No Promotions to Restricted Users", category: "safety", description: "No targeted promotions to users under restriction, self-excluded, or flagged as at-risk", enforcement: "hard_block", active: true, violationCount: 2, lastViolation: "2026-02-14T12:30:00Z" },
    { name: "Auditable Decision Trail", category: "legal", description: "Maintain complete auditable trails for all user-facing decisions, bets, and recommendations for regulatory review", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
    { name: "Profit Within Safety Bounds", category: "operational", description: "Profit optimization must operate within safety and legal constraints; never prioritize revenue over user safety", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
    { name: "Recommendation Disclaimer Required", category: "legal", description: "All recommendations must include disclaimer that they are probabilistic signals, not guarantees", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
    { name: "PII Minimization in Logs", category: "safety", description: "Use pseudonymized IDs for analytics; minimize PII in all logs and ticket summaries", enforcement: "soft_warn", active: true, violationCount: 5, lastViolation: "2026-02-18T09:15:00Z" },
    { name: "Jurisdiction Compliance", category: "legal", description: "Enforce all applicable jurisdictional regulations including age, location, and licensing requirements", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
    { name: "Data Retention Compliance", category: "legal", description: "Retain data per classification and jurisdiction; delete when retention period expires", enforcement: "audit_trail", active: true, violationCount: 1, lastViolation: "2026-01-30T16:00:00Z" },
    { name: "Max Exposure Limits", category: "operational", description: "Enforce house-wide and per-user maximum exposure limits to prevent catastrophic losses", enforcement: "hard_block", active: true, violationCount: 3, lastViolation: "2026-02-19T14:22:00Z" },
    { name: "Model Degradation Auto-Disable", category: "operational", description: "Automatically disable models that degrade ROI/SLA beyond configured thresholds", enforcement: "hard_block", active: true, violationCount: 0, lastViolation: null },
  ];

  for (const c of constraints) {
    const id = generateId("bc");
    businessConstraints.set(id, { id, ...c });
  }
}

function seedEvents() {
  const eventTypes = [
    { sourceFeature: "feat_recommendation_engine", targetFeature: "feat_risk_management___trading", eventType: "recommendation.generated", payload: { recommendationId: "rec_001", confidence: 0.82 } },
    { sourceFeature: "feat_fraud___aml_detection", targetFeature: "feat_payments___wallet", eventType: "fraud.detected", payload: { userId: "usr_example", severity: "high" } },
    { sourceFeature: "feat_responsible_gambling", targetFeature: "broadcast", eventType: "intervention.triggered", payload: { userId: "usr_example", intervention: "cool_down", duration: "2h" } },
    { sourceFeature: "feat_user_account___kyc", targetFeature: "broadcast", eventType: "kyc.verified", payload: { userId: "usr_example", level: "enhanced" } },
    { sourceFeature: "feat_pricing___margin_manager", targetFeature: "feat_risk_management___trading", eventType: "odds.published", payload: { marketId: "mkt_nba_001", overround: 1.058 } },
    { sourceFeature: "feat_payments___wallet", targetFeature: "feat_fraud___aml_detection", eventType: "deposit.completed", payload: { userId: "usr_example", amount: 5000 } },
    { sourceFeature: "feat_risk_management___trading", targetFeature: "feat_notifications___ux_orchestrator", eventType: "exposure.warning", payload: { marketId: "mkt_nfl_003", utilization: 0.87 } },
    { sourceFeature: "feat_recommendation_engine", targetFeature: "feat_responsible_gambling", eventType: "recommendation.auto_send_check", payload: { userId: "usr_example", confidenceScore: 0.78 } },
  ];

  for (const evt of eventTypes) {
    emitEvent(evt);
  }

  const recentEvents = getRecentEvents(3);
  for (const e of recentEvents) {
    acknowledgeEvent(e.id);
  }
}

seedFeatures();
seedCoordinationRules();
seedBusinessConstraints();
seedEvents();

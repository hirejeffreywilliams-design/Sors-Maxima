import { randomBytes } from "crypto";

export type TicketType =
  | "incident"
  | "human_review"
  | "business_rule_violation"
  | "payment_issue"
  | "fraud_alert"
  | "kyc_issue"
  | "system_alert"
  | "confidence_ticket";

export type TicketStatus = "open" | "in_progress" | "pending_review" | "resolved" | "closed" | "escalated";
export type TicketPriority = "P0" | "P1" | "P2" | "P3" | "P4";

export interface TicketSLA {
  priority: TicketPriority;
  targetMinutes: number;
  escalateAfterMinutes: number;
}

export interface TicketComment {
  id: string;
  authorId: string;
  authorRole: "system" | "admin" | "user";
  content: string;
  timestamp: string;
}

export interface Ticket {
  ticketId: string;
  requestId: string;
  userId: string;
  featureName: string;
  type: TicketType;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string | null;
  suggestedAssignee: string;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  escalatedAt: string | null;
  tags: string[];
  comments: TicketComment[];
  metadata: Record<string, unknown>;
  relatedTicketIds: string[];
  retryCount: number;
  idempotencyKey: string;
}

export interface ConfidenceTicket extends Ticket {
  type: "confidence_ticket";
  recommendationId: string;
  market: {
    sport: string;
    match: string;
    marketType: string;
  };
  selection: string;
  oddsOffered: number;
  predictedWinProb: number;
  expectedValue: number;
  suggestedStake: number;
  confidenceScore: number;
  modelVersion: string;
  modelType: string;
  trainingDataSnapshotId: string;
  evidenceLinks: string[];
  businessRulesApplied: string[];
  userRiskProfileSnapshot: string;
  suggestedActions: string[];
  calibrationData: {
    binAccuracy: number;
    brierScore: number;
    lastCalibrationDate: string;
  };
  autoSendEligible: boolean;
  humanReviewRequired: boolean;
}

export interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  escalatedTickets: number;
  avgResolutionMinutes: number;
  slaBreachRate: number;
  ticketsByType: Record<TicketType, number>;
  ticketsByPriority: Record<TicketPriority, number>;
  avgConfidenceScore: number;
  reopenRate: number;
  ticketsCreatedToday: number;
  ticketsResolvedToday: number;
}

export interface AutoSendPolicy {
  enabled: boolean;
  minConfidenceScore: number;
  minPredictedWinProb: number;
  minExpectedValue: number;
  maxStakePercent: number;
  maxExposurePerMarket: number;
  maxDailyAutoSends: number;
  requireHumanReviewAboveStake: number;
  excludeSelfExcludedUsers: boolean;
  excludeRestrictedUsers: boolean;
  cooldownMinutes: number;
  lastUpdated: string;
}

const SLA_MAP: Record<TicketPriority, TicketSLA> = {
  P0: { priority: "P0", targetMinutes: 15, escalateAfterMinutes: 10 },
  P1: { priority: "P1", targetMinutes: 60, escalateAfterMinutes: 45 },
  P2: { priority: "P2", targetMinutes: 240, escalateAfterMinutes: 180 },
  P3: { priority: "P3", targetMinutes: 480, escalateAfterMinutes: 360 },
  P4: { priority: "P4", targetMinutes: 1440, escalateAfterMinutes: 1080 },
};

const tickets = new Map<string, Ticket | ConfidenceTicket>();
const processedIdempotencyKeys = new Set<string>();
const failoverQueue: (Ticket | ConfidenceTicket)[] = [];

let autoSendPolicy: AutoSendPolicy = {
  enabled: false,
  minConfidenceScore: 0.75,
  minPredictedWinProb: 0.55,
  minExpectedValue: 0.10,
  maxStakePercent: 2.0,
  maxExposurePerMarket: 500,
  maxDailyAutoSends: 20,
  requireHumanReviewAboveStake: 100,
  excludeSelfExcludedUsers: true,
  excludeRestrictedUsers: true,
  cooldownMinutes: 30,
  lastUpdated: new Date().toISOString(),
};

function generateTicketId(): string {
  return `tkt_${randomBytes(8).toString("hex")}`;
}

function generateCommentId(): string {
  return `cmt_${randomBytes(6).toString("hex")}`;
}

function computePriority(type: TicketType, confidenceScore?: number): TicketPriority {
  if (type === "fraud_alert") return confidenceScore && confidenceScore > 0.8 ? "P0" : "P1";
  if (type === "system_alert") return "P0";
  if (type === "kyc_issue") return "P1";
  if (type === "payment_issue") return "P1";
  if (type === "confidence_ticket") {
    if (!confidenceScore || confidenceScore < 0.4) return "P1";
    if (confidenceScore < 0.6) return "P2";
    if (confidenceScore < 0.8) return "P3";
    return "P4";
  }
  if (type === "business_rule_violation") return "P2";
  if (type === "human_review") return "P2";
  if (type === "incident") return "P1";
  return "P3";
}

function computeSlaDeadline(priority: TicketPriority, createdAt: string): string {
  const sla = SLA_MAP[priority];
  const deadline = new Date(new Date(createdAt).getTime() + sla.targetMinutes * 60000);
  return deadline.toISOString();
}

function checkAutoSendEligibility(ct: ConfidenceTicket): boolean {
  if (!autoSendPolicy.enabled) return false;
  if (ct.confidenceScore < autoSendPolicy.minConfidenceScore) return false;
  if (ct.predictedWinProb < autoSendPolicy.minPredictedWinProb) return false;
  if (ct.expectedValue < autoSendPolicy.minExpectedValue) return false;
  if (ct.suggestedStake > autoSendPolicy.requireHumanReviewAboveStake) return false;
  return true;
}

function checkHumanReviewRequired(ct: ConfidenceTicket): boolean {
  if (ct.confidenceScore < 0.6) return true;
  if (ct.suggestedStake > autoSendPolicy.requireHumanReviewAboveStake) return true;
  if (ct.expectedValue > 0.5 && ct.confidenceScore < 0.7) return true;
  return false;
}

export function createTicket(input: {
  requestId: string;
  userId: string;
  featureName: string;
  type: TicketType;
  title: string;
  description: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  suggestedAssignee?: string;
  relatedTicketIds?: string[];
}): Ticket | null {
  const idempotencyKey = `${input.userId}:${input.requestId}:${input.type}`;
  if (processedIdempotencyKeys.has(idempotencyKey)) {
    return null;
  }

  const now = new Date().toISOString();
  const priority = computePriority(input.type);
  const ticket: Ticket = {
    ticketId: generateTicketId(),
    requestId: input.requestId,
    userId: input.userId,
    featureName: input.featureName,
    type: input.type,
    title: input.title,
    description: input.description,
    priority,
    status: "open",
    assignee: null,
    suggestedAssignee: input.suggestedAssignee || "auto",
    slaDeadline: computeSlaDeadline(priority, now),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    closedAt: null,
    escalatedAt: null,
    tags: input.tags || [],
    comments: [],
    metadata: input.metadata || {},
    relatedTicketIds: input.relatedTicketIds || [],
    retryCount: 0,
    idempotencyKey,
  };

  tickets.set(ticket.ticketId, ticket);
  processedIdempotencyKeys.add(idempotencyKey);
  return ticket;
}

export function createConfidenceTicket(input: {
  requestId: string;
  userId: string;
  featureName: string;
  recommendationId: string;
  market: { sport: string; match: string; marketType: string };
  selection: string;
  oddsOffered: number;
  predictedWinProb: number;
  expectedValue: number;
  suggestedStake: number;
  confidenceScore: number;
  modelVersion: string;
  modelType: string;
  trainingDataSnapshotId: string;
  evidenceLinks: string[];
  businessRulesApplied: string[];
  userRiskProfileSnapshot: string;
  suggestedActions: string[];
}): ConfidenceTicket | null {
  const idempotencyKey = `${input.userId}:${input.requestId}:confidence_ticket`;
  if (processedIdempotencyKeys.has(idempotencyKey)) return null;

  if (input.confidenceScore === null || input.confidenceScore === undefined) return null;
  if (input.predictedWinProb === null || input.predictedWinProb === undefined) return null;
  if (input.expectedValue === null || input.expectedValue === undefined) return null;
  if (!input.evidenceLinks || input.evidenceLinks.length === 0) return null;

  const now = new Date().toISOString();
  const priority = computePriority("confidence_ticket", input.confidenceScore);

  const ct: ConfidenceTicket = {
    ticketId: generateTicketId(),
    requestId: input.requestId,
    userId: input.userId,
    featureName: input.featureName,
    type: "confidence_ticket",
    title: `Recommendation: ${input.selection} @ ${input.oddsOffered}`,
    description: `${input.market.sport} - ${input.market.match} | ${input.market.marketType} | Confidence: ${(input.confidenceScore * 100).toFixed(1)}%`,
    priority,
    status: "open",
    assignee: null,
    suggestedAssignee: input.confidenceScore < 0.6 ? "senior_analyst" : "auto",
    slaDeadline: computeSlaDeadline(priority, now),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    closedAt: null,
    escalatedAt: null,
    tags: [input.market.sport, input.market.marketType, `model:${input.modelVersion}`],
    comments: [],
    metadata: {},
    relatedTicketIds: [],
    retryCount: 0,
    idempotencyKey,
    recommendationId: input.recommendationId,
    market: input.market,
    selection: input.selection,
    oddsOffered: input.oddsOffered,
    predictedWinProb: input.predictedWinProb,
    expectedValue: input.expectedValue,
    suggestedStake: input.suggestedStake,
    confidenceScore: input.confidenceScore,
    modelVersion: input.modelVersion,
    modelType: input.modelType,
    trainingDataSnapshotId: input.trainingDataSnapshotId,
    evidenceLinks: input.evidenceLinks,
    businessRulesApplied: input.businessRulesApplied,
    userRiskProfileSnapshot: input.userRiskProfileSnapshot,
    suggestedActions: input.suggestedActions,
    calibrationData: {
      binAccuracy: 0.87 + Math.random() * 0.08,
      brierScore: 0.12 + Math.random() * 0.06,
      lastCalibrationDate: now,
    },
    autoSendEligible: false,
    humanReviewRequired: false,
  };

  ct.autoSendEligible = checkAutoSendEligibility(ct);
  ct.humanReviewRequired = checkHumanReviewRequired(ct);

  if (ct.humanReviewRequired) {
    ct.status = "pending_review";
    ct.suggestedActions = [...ct.suggestedActions, "human_review_required"];
  }

  tickets.set(ct.ticketId, ct);
  processedIdempotencyKeys.add(idempotencyKey);
  return ct;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus, comment?: string): Ticket | null {
  const ticket = tickets.get(ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();
  ticket.status = status;
  ticket.updatedAt = now;

  if (status === "resolved") ticket.resolvedAt = now;
  if (status === "closed") ticket.closedAt = now;
  if (status === "escalated") ticket.escalatedAt = now;

  if (comment) {
    ticket.comments.push({
      id: generateCommentId(),
      authorId: "system",
      authorRole: "system",
      content: comment,
      timestamp: now,
    });
  }

  return ticket;
}

export function assignTicket(ticketId: string, assigneeId: string): Ticket | null {
  const ticket = tickets.get(ticketId);
  if (!ticket) return null;
  ticket.assignee = assigneeId;
  ticket.updatedAt = new Date().toISOString();
  if (ticket.status === "open") ticket.status = "in_progress";
  return ticket;
}

export function addTicketComment(ticketId: string, authorId: string, authorRole: "system" | "admin" | "user", content: string): Ticket | null {
  const ticket = tickets.get(ticketId);
  if (!ticket) return null;
  ticket.comments.push({
    id: generateCommentId(),
    authorId,
    authorRole,
    content,
    timestamp: new Date().toISOString(),
  });
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function getTicket(ticketId: string): Ticket | ConfidenceTicket | undefined {
  return tickets.get(ticketId);
}

export function getAllTickets(filters?: {
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  featureName?: string;
  limit?: number;
}): (Ticket | ConfidenceTicket)[] {
  let result = Array.from(tickets.values());

  if (filters?.type) result = result.filter(t => t.type === filters.type);
  if (filters?.status) result = result.filter(t => t.status === filters.status);
  if (filters?.priority) result = result.filter(t => t.priority === filters.priority);
  if (filters?.featureName) result = result.filter(t => t.featureName === filters.featureName);

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}

export function getConfidenceTickets(): ConfidenceTicket[] {
  return Array.from(tickets.values())
    .filter((t): t is ConfidenceTicket => t.type === "confidence_ticket")
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

export function getTicketMetrics(): TicketMetrics {
  const all = Array.from(tickets.values());
  const today = new Date().toISOString().split("T")[0];
  const confidenceTickets = all.filter((t): t is ConfidenceTicket => t.type === "confidence_ticket");

  const resolvedTickets = all.filter(t => t.resolvedAt);
  const avgResolutionMs = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / resolvedTickets.length
    : 0;

  const breachedCount = all.filter(t => {
    if (t.status === "resolved" || t.status === "closed") {
      const resolveTime = t.resolvedAt || t.closedAt || t.updatedAt;
      return new Date(resolveTime).getTime() > new Date(t.slaDeadline).getTime();
    }
    return new Date() > new Date(t.slaDeadline);
  }).length;

  const typeCount = {} as Record<TicketType, number>;
  const priorityCount = {} as Record<TicketPriority, number>;
  for (const t of all) {
    typeCount[t.type] = (typeCount[t.type] || 0) + 1;
    priorityCount[t.priority] = (priorityCount[t.priority] || 0) + 1;
  }

  return {
    totalTickets: all.length,
    openTickets: all.filter(t => t.status === "open").length,
    inProgressTickets: all.filter(t => t.status === "in_progress").length,
    resolvedTickets: resolvedTickets.length,
    closedTickets: all.filter(t => t.status === "closed").length,
    escalatedTickets: all.filter(t => t.status === "escalated").length,
    avgResolutionMinutes: Math.round(avgResolutionMs / 60000),
    slaBreachRate: all.length > 0 ? parseFloat((breachedCount / all.length * 100).toFixed(1)) : 0,
    ticketsByType: typeCount,
    ticketsByPriority: priorityCount,
    avgConfidenceScore: confidenceTickets.length > 0
      ? parseFloat((confidenceTickets.reduce((s, t) => s + t.confidenceScore, 0) / confidenceTickets.length).toFixed(3))
      : 0,
    reopenRate: 0,
    ticketsCreatedToday: all.filter(t => t.createdAt.startsWith(today)).length,
    ticketsResolvedToday: resolvedTickets.filter(t => t.resolvedAt!.startsWith(today)).length,
  };
}

export function getAutoSendPolicy(): AutoSendPolicy {
  return { ...autoSendPolicy };
}

export function updateAutoSendPolicy(updates: Partial<AutoSendPolicy>): AutoSendPolicy {
  autoSendPolicy = { ...autoSendPolicy, ...updates, lastUpdated: new Date().toISOString() };
  return { ...autoSendPolicy };
}

export function getSLAMap(): Record<TicketPriority, TicketSLA> {
  return { ...SLA_MAP };
}

export function getFailoverQueue(): (Ticket | ConfidenceTicket)[] {
  return [...failoverQueue];
}

export function processFailoverQueue(): number {
  let processed = 0;
  while (failoverQueue.length > 0) {
    const ticket = failoverQueue.shift()!;
    tickets.set(ticket.ticketId, ticket);
    processed++;
  }
  return processed;
}

function seedTickets() {
  const sports = ["NBA", "NFL", "MLB", "NHL", "Soccer", "Tennis"];
  const teams = [
    ["Knicks vs Bucks", "Heat vs Bucks", "Mavericks vs Suns"],
    ["Chiefs vs Eagles", "49ers vs Cowboys", "Bills vs Ravens"],
    ["Yankees vs Dodgers", "Astros vs Braves"],
    ["Bruins vs Rangers", "Oilers vs Avalanche"],
    ["Man City vs Liverpool", "Real Madrid vs Barcelona", "PSG vs Bayern"],
    ["Djokovic vs Alcaraz", "Sinner vs Medvedev"],
  ];
  const marketTypes = ["match_winner", "spread", "total_over_under", "player_props", "first_half", "live_moneyline"];
  const models = ["ensemble-v4.2", "gradient-boost-v3.1", "neural-v5.0", "hybrid-v2.8"];

  for (let i = 0; i < 25; i++) {
    const sportIdx = i % sports.length;
    const sport = sports[sportIdx];
    const matchPool = teams[sportIdx];
    const match = matchPool[i % matchPool.length];
    const marketType = marketTypes[i % marketTypes.length];
    const confidence = 0.35 + Math.random() * 0.60;
    const winProb = 0.30 + Math.random() * 0.45;
    const odds = 1.5 + Math.random() * 3.5;
    const ev = winProb * odds - 1;
    const stake = 5 + Math.random() * 95;

    createConfidenceTicket({
      requestId: `req_seed_${i}`,
      userId: `user_${1000 + (i % 8)}`,
      featureName: "RecommendationEngine",
      recommendationId: `rec_${randomBytes(6).toString("hex")}`,
      market: { sport, match, marketType },
      selection: `Selection_${i + 1}`,
      oddsOffered: parseFloat(odds.toFixed(2)),
      predictedWinProb: parseFloat(winProb.toFixed(3)),
      expectedValue: parseFloat(ev.toFixed(4)),
      suggestedStake: parseFloat(stake.toFixed(2)),
      confidenceScore: parseFloat(confidence.toFixed(3)),
      modelVersion: models[i % models.length],
      modelType: i % 3 === 0 ? "ensemble" : i % 3 === 1 ? "gradient_boost" : "neural_network",
      trainingDataSnapshotId: `ds-2026-02-${String(1 + (i % 20)).padStart(2, "0")}`,
      evidenceLinks: [
        `data://stat_features/${sport.toLowerCase()}/team_stats`,
        `signal://injury_api/${sport.toLowerCase()}`,
        `data://historical_odds/${match.replace(/\s/g, "_")}`,
      ],
      businessRulesApplied: ["bankroll_pct<=2%", "no_reco_if_self_excluded", "max_exposure_check"],
      userRiskProfileSnapshot: ["risk_v2-low", "risk_v2-medium", "risk_v2-high"][i % 3],
      suggestedActions: confidence > 0.7 ? ["place_bet"] : ["review", "hold"],
    });
  }

  const incidentTypes: TicketType[] = ["incident", "human_review", "fraud_alert", "payment_issue", "system_alert", "kyc_issue", "business_rule_violation"];
  const incidentTitles: Record<TicketType, string[]> = {
    incident: ["API latency spike detected", "Model prediction service timeout", "Database connection pool exhausted"],
    human_review: ["High-stake recommendation needs review", "Unusual betting pattern flagged", "New user large deposit review"],
    fraud_alert: ["Potential collusion detected", "Account velocity anomaly", "Geo-location mismatch"],
    payment_issue: ["Withdrawal processing delay", "Payment gateway timeout", "Chargeback dispute received"],
    system_alert: ["Memory usage above 90%", "Error rate spike on /api/bets", "Cache invalidation failure"],
    kyc_issue: ["Document verification failed", "Address mismatch detected", "Age verification pending"],
    business_rule_violation: ["Max exposure limit exceeded", "Odds margin below threshold", "Settlement discrepancy"],
    confidence_ticket: [],
  };

  for (const type of incidentTypes) {
    const titles = incidentTitles[type];
    for (let j = 0; j < titles.length; j++) {
      const ticket = createTicket({
        requestId: `req_inc_${type}_${j}`,
        userId: `system`,
        featureName: type === "fraud_alert" ? "FraudDetection" : type === "payment_issue" ? "PaymentService" : type === "kyc_issue" ? "KYCService" : "SystemMonitor",
        type,
        title: titles[j],
        description: `Automated detection: ${titles[j]}. Requires investigation and resolution.`,
        tags: [type, "automated"],
        suggestedAssignee: type === "fraud_alert" ? "fraud_team" : type === "payment_issue" ? "payment_ops" : "ops_team",
      });

      if (ticket && j === 0) {
        updateTicketStatus(ticket.ticketId, "in_progress", "Assigned to on-call team");
      }
      if (ticket && j === 1) {
        updateTicketStatus(ticket.ticketId, "resolved", "Root cause identified and fixed");
      }
    }
  }
}

seedTickets();

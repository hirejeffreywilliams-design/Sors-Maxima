import crypto from 'crypto';
import { Request } from "express";

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  properties: Record<string, any>;
  experimentId?: string;
  experimentVariant?: string;
  consentGiven: boolean;
  ipSubnet?: string;
  userAgent?: string;
}

interface EventAggregation {
  eventType: string;
  count: number;
  uniqueUsers: number;
  lastOccurrence: string;
}

interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

interface CohortData {
  cohort: string;
  users: number;
  retained: Record<string, number>;
}

const VALID_EVENT_TYPES = [
  "ticket_generate",
  "parlay_simulate",
  "ticket_save",
  "share_ticket",
  "subscription_start",
  "affiliate_click",
  "page_view",
  "feature_use",
  "onboarding_step",
  "trial_start",
  "trial_convert",
  "consent_update",
  "ab_impression",
  "ab_conversion",
] as const;

const MAX_EVENTS = 50000;
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

class AnalyticsEventService {
  private events: AnalyticsEvent[] = [];
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
  private userConsent: Map<string, { analytics: boolean; marketing: boolean; dataSharing: boolean }> = new Map();

  generateEventId(): string {
    return `evt_${crypto.randomUUID()}`;
  }

  checkRateLimit(sessionId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(sessionId);
    if (!limit || now > limit.resetAt) {
      this.rateLimits.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      return true;
    }
    if (limit.count >= RATE_LIMIT_MAX) return false;
    limit.count++;
    return true;
  }

  isValidEventType(type: string): boolean {
    return (VALID_EVENT_TYPES as readonly string[]).includes(type);
  }

  setUserConsent(userId: string, consent: { analytics?: boolean; marketing?: boolean; dataSharing?: boolean }): void {
    const existing = this.userConsent.get(userId) || { analytics: true, marketing: false, dataSharing: false };
    this.userConsent.set(userId, { ...existing, ...consent });
  }

  getUserConsent(userId: string): { analytics: boolean; marketing: boolean; dataSharing: boolean } {
    return this.userConsent.get(userId) || { analytics: true, marketing: false, dataSharing: false };
  }

  hasAnalyticsConsent(userId?: string): boolean {
    if (!userId) return true;
    const consent = this.userConsent.get(userId);
    return consent ? consent.analytics : true;
  }

  trackEvent(event: Omit<AnalyticsEvent, "id">): AnalyticsEvent | null {
    if (!this.isValidEventType(event.eventType)) return null;
    if (!this.checkRateLimit(event.sessionId)) return null;
    if (event.userId && !this.hasAnalyticsConsent(event.userId)) return null;

    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
    };

    this.events.push(fullEvent);

    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS / 2);
    }

    return fullEvent;
  }

  getEventCounts(since?: string): EventAggregation[] {
    const cutoff = since ? new Date(since).getTime() : Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = this.events.filter(e => new Date(e.timestamp).getTime() >= cutoff);

    const groups = new Map<string, { count: number; users: Set<string>; lastOccurrence: string }>();
    for (const event of filtered) {
      const group = groups.get(event.eventType) || { count: 0, users: new Set(), lastOccurrence: event.timestamp };
      group.count++;
      if (event.userId) group.users.add(event.userId);
      if (event.timestamp > group.lastOccurrence) group.lastOccurrence = event.timestamp;
      groups.set(event.eventType, group);
    }

    return Array.from(groups.entries()).map(([eventType, data]) => ({
      eventType,
      count: data.count,
      uniqueUsers: data.users.size,
      lastOccurrence: data.lastOccurrence,
    }));
  }

  getFunnelData(): FunnelStep[] {
    const funnelSteps = [
      { step: "Page Views", eventType: "page_view" },
      { step: "Ticket Generated", eventType: "ticket_generate" },
      { step: "Parlay Simulated", eventType: "parlay_simulate" },
      { step: "Ticket Saved", eventType: "ticket_save" },
      { step: "Ticket Shared", eventType: "share_ticket" },
      { step: "Trial Started", eventType: "trial_start" },
      { step: "Subscription Started", eventType: "subscription_start" },
    ];

    const totalPageViews = this.events.filter(e => e.eventType === "page_view").length || 1;

    return funnelSteps.map(({ step, eventType }) => {
      const count = this.events.filter(e => e.eventType === eventType).length;
      return {
        step,
        count,
        conversionRate: Math.round((count / totalPageViews) * 100 * 10) / 10,
      };
    });
  }

  getCohortRetention(): CohortData[] {
    const userFirstSeen = new Map<string, string>();
    const userFirstTime = new Map<string, number>();
    for (const event of this.events) {
      if (event.userId && !userFirstSeen.has(event.userId)) {
        const date = new Date(event.timestamp);
        const weekKey = `Week ${Math.ceil(date.getDate() / 7)}`;
        userFirstSeen.set(event.userId, weekKey);
        userFirstTime.set(event.userId, date.getTime());
      }
    }

    const cohorts = new Map<string, { users: Set<string>; retained: Map<string, Set<string>> }>();
    userFirstSeen.forEach((cohort, userId) => {
      if (!cohorts.has(cohort)) {
        cohorts.set(cohort, { users: new Set(), retained: new Map() });
      }
      cohorts.get(cohort)!.users.add(userId);
    });

    for (const event of this.events) {
      if (!event.userId) continue;
      const cohort = userFirstSeen.get(event.userId);
      if (!cohort) continue;
      const firstTime = userFirstTime.get(event.userId) || 0;
      const daysSinceFirst = Math.floor(
        (new Date(event.timestamp).getTime() - firstTime) / (24 * 60 * 60 * 1000)
      );
      const period = daysSinceFirst < 1 ? "Day 0" : daysSinceFirst < 7 ? "Day 1-7" : daysSinceFirst < 30 ? "Day 8-30" : "Day 30+";
      const cohortData = cohorts.get(cohort);
      if (cohortData) {
        if (!cohortData.retained.has(period)) cohortData.retained.set(period, new Set());
        cohortData.retained.get(period)!.add(event.userId);
      }
    }

    return Array.from(cohorts.entries()).map(([cohort, data]) => ({
      cohort,
      users: data.users.size,
      retained: Object.fromEntries(
        Array.from(data.retained.entries()).map(([period, users]) => [
          period,
          Math.round((users.size / data.users.size) * 100),
        ])
      ),
    }));
  }

  getExperimentResults(): Array<{
    experimentId: string;
    variants: Array<{ variant: string; impressions: number; conversions: number; conversionRate: number }>;
  }> {
    const experiments = new Map<string, Map<string, { impressions: number; conversions: number }>>();

    for (const event of this.events) {
      if (!event.experimentId || !event.experimentVariant) continue;
      if (!experiments.has(event.experimentId)) experiments.set(event.experimentId, new Map());
      const variantMap = experiments.get(event.experimentId)!;
      if (!variantMap.has(event.experimentVariant)) {
        variantMap.set(event.experimentVariant, { impressions: 0, conversions: 0 });
      }
      const data = variantMap.get(event.experimentVariant)!;
      if (event.eventType === "ab_impression") data.impressions++;
      if (event.eventType === "ab_conversion") data.conversions++;
    }

    return Array.from(experiments.entries()).map(([experimentId, variants]) => ({
      experimentId,
      variants: Array.from(variants.entries()).map(([variant, data]) => ({
        variant,
        ...data,
        conversionRate: data.impressions > 0 ? Math.round((data.conversions / data.impressions) * 100 * 10) / 10 : 0,
      })),
    }));
  }

  getKPIs(): {
    totalEvents: number;
    uniqueUsers: number;
    ticketsGenerated: number;
    parlaysSimulated: number;
    ticketsSaved: number;
    ticketsShared: number;
    trialStarts: number;
    subscriptionStarts: number;
    affiliateClicks: number;
    trialToPayConversion: number;
    avgEventsPerUser: number;
  } {
    const uniqueUsers = new Set(this.events.filter(e => e.userId).map(e => e.userId)).size || 1;
    const ticketsGenerated = this.events.filter(e => e.eventType === "ticket_generate").length;
    const parlaysSimulated = this.events.filter(e => e.eventType === "parlay_simulate").length;
    const ticketsSaved = this.events.filter(e => e.eventType === "ticket_save").length;
    const ticketsShared = this.events.filter(e => e.eventType === "share_ticket").length;
    const trialStarts = this.events.filter(e => e.eventType === "trial_start").length;
    const subscriptionStarts = this.events.filter(e => e.eventType === "subscription_start").length;
    const affiliateClicks = this.events.filter(e => e.eventType === "affiliate_click").length;

    return {
      totalEvents: this.events.length,
      uniqueUsers,
      ticketsGenerated,
      parlaysSimulated,
      ticketsSaved,
      ticketsShared,
      trialStarts,
      subscriptionStarts,
      affiliateClicks,
      trialToPayConversion: trialStarts > 0 ? Math.round((subscriptionStarts / trialStarts) * 100 * 10) / 10 : 0,
      avgEventsPerUser: Math.round((this.events.length / uniqueUsers) * 10) / 10,
    };
  }

  getRecentEvents(limit = 50): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getStats(): { totalEvents: number; uniqueSessions: number; eventTypes: number } {
    const sessions = new Set(this.events.map(e => e.sessionId));
    const eventTypes = new Set(this.events.map(e => e.eventType));
    return {
      totalEvents: this.events.length,
      uniqueSessions: sessions.size,
      eventTypes: eventTypes.size,
    };
  }
}

export const analyticsEventService = new AnalyticsEventService();

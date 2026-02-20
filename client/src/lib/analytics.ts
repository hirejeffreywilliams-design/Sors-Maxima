import { apiRequest } from "./queryClient";

const SESSION_KEY = "sors_session_id";
const CONSENT_KEY = "sors_analytics_consent";
const EXPERIMENT_KEY = "sors_experiments";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function hasConsent(): boolean {
  const consent = localStorage.getItem(CONSENT_KEY);
  return consent !== "false";
}

export function setAnalyticsConsent(enabled: boolean): void {
  localStorage.setItem(CONSENT_KEY, String(enabled));
}

export function getAnalyticsConsent(): boolean {
  return hasConsent();
}

export type EventType =
  | "ticket_generate"
  | "parlay_simulate"
  | "ticket_save"
  | "share_ticket"
  | "subscription_start"
  | "affiliate_click"
  | "page_view"
  | "feature_use"
  | "onboarding_step"
  | "trial_start"
  | "trial_convert"
  | "consent_update"
  | "ab_impression"
  | "ab_conversion";

interface TrackOptions {
  properties?: Record<string, any>;
  experimentId?: string;
  experimentVariant?: string;
}

const eventQueue: Array<{ eventType: EventType; options: TrackOptions }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(eventType: EventType, options: TrackOptions = {}): void {
  if (!hasConsent()) return;

  eventQueue.push({ eventType, options });

  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 1000);
  }
}

async function flushEvents(): Promise<void> {
  flushTimer = null;
  const events = eventQueue.splice(0, eventQueue.length);
  const sessionId = getSessionId();

  for (const { eventType, options } of events) {
    try {
      await apiRequest("POST", "/api/events", {
        eventType,
        sessionId,
        properties: options.properties || {},
        experimentId: options.experimentId,
        experimentVariant: options.experimentVariant,
      });
    } catch {
    }
  }
}

export function trackPageView(page: string): void {
  trackEvent("page_view", { properties: { page } });
}

export function trackFeatureUse(feature: string, details?: Record<string, any>): void {
  trackEvent("feature_use", { properties: { feature, ...details } });
}

export function trackTicketGenerate(sport: string, legCount: number): void {
  trackEvent("ticket_generate", { properties: { sport, legCount } });
}

export function trackParlaySimulate(legCount: number, totalOdds: number): void {
  trackEvent("parlay_simulate", { properties: { legCount, totalOdds } });
}

export function trackTicketSave(ticketId: string): void {
  trackEvent("ticket_save", { properties: { ticketId } });
}

export function trackShareTicket(method: string): void {
  trackEvent("share_ticket", { properties: { method } });
}

export function trackAffiliateClick(partner: string, destination: string): void {
  trackEvent("affiliate_click", { properties: { partner, destination } });
}

export function trackTrialStart(): void {
  trackEvent("trial_start");
}

export function trackSubscriptionStart(plan: string): void {
  trackEvent("subscription_start", { properties: { plan } });
}

export function getExperimentVariant(experimentId: string, variants: string[]): string {
  const stored = localStorage.getItem(EXPERIMENT_KEY);
  const experiments: Record<string, string> = stored ? JSON.parse(stored) : {};

  if (experiments[experimentId]) {
    return experiments[experimentId];
  }

  const variant = variants[Math.floor(Math.random() * variants.length)];
  experiments[experimentId] = variant;
  localStorage.setItem(EXPERIMENT_KEY, JSON.stringify(experiments));

  trackEvent("ab_impression", { experimentId, experimentVariant: variant });

  return variant;
}

export function trackABConversion(experimentId: string): void {
  const stored = localStorage.getItem(EXPERIMENT_KEY);
  const experiments: Record<string, string> = stored ? JSON.parse(stored) : {};
  const variant = experiments[experimentId];
  if (variant) {
    trackEvent("ab_conversion", { experimentId, experimentVariant: variant });
  }
}

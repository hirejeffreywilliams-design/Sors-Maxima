type EventCategory =
  | "ticket"
  | "navigation"
  | "settings"
  | "community"
  | "finance"
  | "live"
  | "auth"
  | "error"
  | "engagement";

interface TrackedEvent {
  id: string;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

interface EventStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByAction: Record<string, number>;
  recentEvents: TrackedEvent[];
  sessionDuration: number;
}

class EventTracker {
  private events: TrackedEvent[] = [];
  private sessionId: string;
  private sessionStart: number;
  private userId?: string;
  private maxEvents = 5000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  track(category: EventCategory, action: string, options?: {
    label?: string;
    value?: number;
    metadata?: Record<string, unknown>;
  }) {
    const event: TrackedEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      category,
      action,
      label: options?.label,
      value: options?.value,
      metadata: options?.metadata,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (typeof window !== "undefined" && (window as any).__SORS_DEBUG__) {
      console.log(`[Event] ${category}:${action}`, options);
    }
  }

  trackTicketGenerate(sports: string[], riskLevel: string, bankroll: number) {
    this.track("ticket", "generate", {
      label: sports.join(","),
      value: bankroll,
      metadata: { riskLevel, sportCount: sports.length },
    });
  }

  trackTicketAccept(ticketId: string, stake: number, odds: number) {
    this.track("ticket", "accept", {
      label: ticketId,
      value: stake,
      metadata: { odds },
    });
  }

  trackTicketReject(ticketId: string, reason?: string) {
    this.track("ticket", "reject", {
      label: ticketId,
      metadata: { reason },
    });
  }

  trackTicketEdit(ticketId: string, field: string) {
    this.track("ticket", "edit", {
      label: ticketId,
      metadata: { field },
    });
  }

  trackNavigation(from: string, to: string) {
    this.track("navigation", "page_view", {
      label: to,
      metadata: { from },
    });
  }

  trackError(errorType: string, message: string) {
    this.track("error", errorType, {
      label: message,
    });
  }

  trackEngagement(action: string, metadata?: Record<string, unknown>) {
    this.track("engagement", action, { metadata });
  }

  getStats(): EventStats {
    const eventsByCategory: Record<string, number> = {};
    const eventsByAction: Record<string, number> = {};

    this.events.forEach((event) => {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      const key = `${event.category}:${event.action}`;
      eventsByAction[key] = (eventsByAction[key] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsByCategory,
      eventsByAction,
      recentEvents: this.events.slice(-50),
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  getEvents(options?: {
    category?: EventCategory;
    action?: string;
    limit?: number;
    since?: string;
  }): TrackedEvent[] {
    let result = [...this.events];

    if (options?.category) {
      result = result.filter((e) => e.category === options.category);
    }
    if (options?.action) {
      result = result.filter((e) => e.action === options.action);
    }
    if (options?.since) {
      const sinceDate = new Date(options.since);
      result = result.filter((e) => new Date(e.timestamp) >= sinceDate);
    }
    if (options?.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  getFunnelMetrics() {
    const generates = this.events.filter((e) => e.category === "ticket" && e.action === "generate").length;
    const accepts = this.events.filter((e) => e.category === "ticket" && e.action === "accept").length;
    const rejects = this.events.filter((e) => e.category === "ticket" && e.action === "reject").length;

    return {
      generates,
      accepts,
      rejects,
      conversionRate: generates > 0 ? accepts / generates : 0,
      rejectionRate: generates > 0 ? rejects / generates : 0,
    };
  }

  clear() {
    this.events = [];
  }
}

export const eventTracker = new EventTracker();
export type { TrackedEvent, EventStats, EventCategory };

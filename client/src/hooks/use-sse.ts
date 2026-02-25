import { useState, useEffect, useRef, useCallback } from "react";

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface UseSSEOptions {
  channels?: string[];
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface SSEState {
  connected: boolean;
  clientId: string | null;
  lastEvent: SSEEvent | null;
  liveGames: any[];
  topPicks: any[];
  edgeAlerts: any[];
  opportunityScore: number;
  sportSummaries: any[];
  dataSourceHealth: any[];
  lastUpdate: string | null;
  reconnectAttempts: number;
  pendingNotifications: any[];
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    channels = ["all"],
    enabled = true,
    onEvent,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [state, setState] = useState<SSEState>({
    connected: false,
    clientId: null,
    lastEvent: null,
    liveGames: [],
    topPicks: [],
    edgeAlerts: [],
    opportunityScore: 0,
    sportSummaries: [],
    dataSourceHealth: [],
    lastUpdate: null,
    reconnectAttempts: 0,
    pendingNotifications: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const lastEventIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onEventRef = useRef(onEvent);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const channelParam = channels.join(",");
    let url = `/api/sse/stream?channels=${encodeURIComponent(channelParam)}`;
    if (lastEventIdRef.current) {
      url += `&lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
    }
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setState(prev => ({ ...prev, connected: true, reconnectAttempts: 0 }));
    };

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          setState(prev => ({ ...prev, clientId: data.clientId, connected: true }));
        }
      } catch {}
    };

    es.addEventListener("intelligence-update", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        if ((event as any).lastEventId) lastEventIdRef.current = (event as any).lastEventId;
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "intelligence-update", data, timestamp: data.timestamp };
        setState(prev => ({
          ...prev,
          lastEvent: sseEvent,
          liveGames: data.liveGames || prev.liveGames,
          topPicks: data.topPicks || prev.topPicks,
          edgeAlerts: data.edgeAlerts || prev.edgeAlerts,
          opportunityScore: data.opportunityScore ?? prev.opportunityScore,
          sportSummaries: data.sportSummaries || prev.sportSummaries,
          dataSourceHealth: data.dataSourceHealth || prev.dataSourceHealth,
          lastUpdate: data.timestamp,
        }));
        onEventRef.current?.(sseEvent);
      } catch {}
    });

    es.addEventListener("live-scores", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        if ((event as any).lastEventId) lastEventIdRef.current = (event as any).lastEventId;
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "live-scores", data, timestamp: data.timestamp };
        setState(prev => ({ ...prev, lastEvent: sseEvent, lastUpdate: data.timestamp }));
        onEventRef.current?.(sseEvent);
      } catch {}
    });

    es.addEventListener("edge-alerts", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        if ((event as any).lastEventId) lastEventIdRef.current = (event as any).lastEventId;
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "edge-alerts", data, timestamp: data.timestamp };
        setState(prev => ({
          ...prev,
          lastEvent: sseEvent,
          edgeAlerts: data.alerts || prev.edgeAlerts,
          lastUpdate: data.timestamp,
        }));
        onEventRef.current?.(sseEvent);
      } catch {}
    });

    es.addEventListener("notification", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        if ((event as any).lastEventId) lastEventIdRef.current = (event as any).lastEventId;
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "notification", data, timestamp: data.timestamp };
        setState(prev => ({
          ...prev,
          lastEvent: sseEvent,
          pendingNotifications: [data.notification, ...prev.pendingNotifications].slice(0, 50),
          lastUpdate: data.timestamp,
        }));
        onEventRef.current?.(sseEvent);
      } catch {}
    });

    es.addEventListener("heartbeat", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      if ((event as any).lastEventId) lastEventIdRef.current = (event as any).lastEventId;
      setState(prev => ({ ...prev, connected: true }));
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      reconnectAttemptsRef.current += 1;
      const nextAttempts = reconnectAttemptsRef.current;
      setState(prev => ({ ...prev, connected: false, reconnectAttempts: nextAttempts }));
      if (nextAttempts <= maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(1.5, nextAttempts - 1), 30000);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };
  }, [enabled, channels.join(","), reconnectDelay, maxReconnectAttempts]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, connected: false }));
  }, []);

  return {
    ...state,
    disconnect,
    reconnect: connect,
  };
}

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
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const channelParam = channels.join(",");
    const url = `/api/sse/stream?channels=${encodeURIComponent(channelParam)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
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
        onEvent?.(sseEvent);
      } catch {}
    });

    es.addEventListener("live-scores", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "live-scores", data, timestamp: data.timestamp };
        setState(prev => ({ ...prev, lastEvent: sseEvent, lastUpdate: data.timestamp }));
        onEvent?.(sseEvent);
      } catch {}
    });

    es.addEventListener("edge-alerts", (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = { type: "edge-alerts", data, timestamp: data.timestamp };
        setState(prev => ({
          ...prev,
          lastEvent: sseEvent,
          edgeAlerts: data.alerts || prev.edgeAlerts,
          lastUpdate: data.timestamp,
        }));
        onEvent?.(sseEvent);
      } catch {}
    });

    es.addEventListener("heartbeat", () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, connected: true }));
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      setState(prev => {
        const nextAttempts = prev.reconnectAttempts + 1;
        if (nextAttempts <= maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(1.5, nextAttempts - 1), 30000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
        return { ...prev, connected: false, reconnectAttempts: nextAttempts };
      });
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

import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useSSE, type SSEEvent } from "@/hooks/use-sse";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type SSEContextValue = ReturnType<typeof useSSE>;

const SSEContext = createContext<SSEContextValue | null>(null);

export function useSSEContext(): SSEContextValue {
  const ctx = useContext(SSEContext);
  if (!ctx) {
    if (typeof window !== "undefined") {
      console.warn("[SSEContext] useSSEContext() called outside SSEProvider — SSE features disabled for this component.");
    }
    return {
      connected: false, clientId: null, lastEvent: null, liveGames: [], upcomingGames: [], allGames: [], topPicks: [],
      edgeAlerts: [], opportunityScore: 0, sportSummaries: [], dataSourceHealth: [],
      lastUpdate: null, reconnectAttempts: 0, pendingNotifications: [],
      sharpSignals: [], earlySettlements: [], isPageVisible: true,
      disconnect: () => {}, reconnect: () => {},
    } as SSEContextValue;
  }
  return ctx;
}

interface SSEProviderProps {
  enabled: boolean;
  children: React.ReactNode;
}

export function SSEProvider({ enabled, children }: SSEProviderProps) {
  const { toast } = useToast();
  const shownSignals = useRef<Set<string>>(new Set());
  const shownSettlements = useRef<Set<string>>(new Set());

  const handleEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "intelligence-update":
        queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/data-freshness"] });
        break;

      case "live-scores":
      case "live_scores":
        queryClient.invalidateQueries({ queryKey: ["/api/live/momentum"] });
        queryClient.invalidateQueries({ queryKey: ["/api/live-games"] });
        queryClient.invalidateQueries({ queryKey: ["/api/live/game-cards"] });
        queryClient.invalidateQueries({ queryKey: ["/api/cashout-advisor"] });
        queryClient.invalidateQueries({ queryKey: ["/api/live/hedge-bets"] });
        break;

      case "edge-alerts":
        queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
        break;

      case "picks-update":
      case "predictions-ready":
        queryClient.invalidateQueries({ queryKey: ["/api/predictions/straight-bets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/predictions/sgp"] });
        queryClient.invalidateQueries({ queryKey: ["/api/predictions/teasers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/picks/daily"] });
        queryClient.invalidateQueries({ queryKey: ["/api/picks"] });
        break;

      case "odds-update":
        queryClient.invalidateQueries({ queryKey: ["/api/odds"] });
        queryClient.invalidateQueries({ queryKey: ["/api/odds/live"] });
        queryClient.invalidateQueries({ queryKey: ["/api/odds/live-legs"] });
        break;

      case "sharp-signal": {
        const sig = event.data;
        const sigKey = `${sig.sport}-${sig.game}-${sig.market}-${sig.direction}`;
        if (!shownSignals.current.has(sigKey)) {
          shownSignals.current.add(sigKey);
          const move = sig.movement
            ? ` (${sig.movement > 0 ? "+" : ""}${sig.movement})`
            : "";
          toast({
            title: `Sharp Money Alert — ${sig.sport?.toUpperCase() ?? ""}`,
            description: `${sig.game}: ${sig.market ?? "line"} moved${move} — sharp action detected`,
            duration: 8000,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/intelligence/feed"] });
        break;
      }

      case "early-settlement": {
        const pick = event.data;
        const pickKey = `${pick.pickId}-${pick.result}`;
        if (!shownSettlements.current.has(pickKey)) {
          shownSettlements.current.add(pickKey);
          const resultLabel = pick.result === "win" ? "WIN" : pick.result === "loss" ? "LOSS" : "PUSH";
          toast({
            title: `Pick Settled — ${resultLabel}`,
            description: pick.description ?? `${pick.game ?? "Game"} outcome confirmed`,
            duration: 10000,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user-picks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/picks/history"] });
        break;
      }

      case "picks-settled":
        queryClient.invalidateQueries({ queryKey: ["/api/user-picks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/picks/history"] });
        break;

      case "notification":
        queryClient.invalidateQueries({ queryKey: ["/api/custom-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        break;

      case "guardian-alert":
        queryClient.invalidateQueries({ queryKey: ["/api/admin/guardian"] });
        break;

      case "turbo-mode":
        queryClient.invalidateQueries({ queryKey: ["/api/ai/turbo-status"] });
        break;
    }
  }, [toast]);

  const sse = useSSE({ enabled, onEvent: handleEvent });

  useEffect(() => {
    if (shownSignals.current.size > 200) shownSignals.current.clear();
    if (shownSettlements.current.size > 200) shownSettlements.current.clear();
  }, [sse.sharpSignals, sse.earlySettlements]);

  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
}

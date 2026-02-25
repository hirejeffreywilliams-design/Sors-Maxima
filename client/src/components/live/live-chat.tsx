import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Send,
  TrendingUp,
  AlertTriangle,
  Zap,
  Cloud,
  HeartPulse,
  ArrowLeftRight,
  StickyNote,
  RefreshCw,
} from "lucide-react";

interface EdgeAlert {
  id: string;
  type: "line_movement" | "sharp_action" | "weather_impact" | "injury_update" | "arbitrage" | "high_ev";
  severity: "info" | "warning" | "critical";
  sport: string;
  game: string;
  title: string;
  description: string;
  reason: string;
  timing: "early_value" | "settled" | "steam" | "unknown";
  timestamp: string;
  actionable: boolean;
}

interface IntelligenceFeed {
  edgeAlerts: EdgeAlert[];
  generatedAt: string;
  nextRefresh: string;
}

interface PersonalNote {
  id: string;
  content: string;
  timestamp: Date;
}

const alertTypeConfig: Record<string, { icon: typeof Activity; label: string }> = {
  line_movement: { icon: TrendingUp, label: "Line Move" },
  sharp_action: { icon: Zap, label: "Sharp Action" },
  weather_impact: { icon: Cloud, label: "Weather" },
  injury_update: { icon: HeartPulse, label: "Injury" },
  arbitrage: { icon: ArrowLeftRight, label: "Arbitrage" },
  high_ev: { icon: Activity, label: "High EV" },
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-500",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-500",
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LiveChat() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: feed, isLoading, isError } = useQuery<IntelligenceFeed>({
    queryKey: ["/api/intelligence/feed"],
    refetchInterval: 30000,
  });

  const edgeAlerts = feed?.edgeAlerts ?? [];

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      ...prev,
      {
        id: `note-${Date.now()}`,
        content: trimmed,
        timestamp: new Date(),
      },
    ]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Live Intelligence Feed
          </div>
          <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-500" data-testid="badge-alert-count">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {edgeAlerts.length} alerts
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" data-testid="feed-loading">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading intelligence feed...</span>
              </div>
            )}

            {isError && (
              <div className="text-center py-8 text-muted-foreground" data-testid="feed-error">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm">Unable to load intelligence feed. Retrying...</p>
              </div>
            )}

            {!isLoading && !isError && edgeAlerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" data-testid="feed-empty">
                <Activity className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">No active alerts. Feed refreshes every 30 seconds.</p>
              </div>
            )}

            {edgeAlerts.map((alert) => {
              const config = alertTypeConfig[alert.type] ?? { icon: Activity, label: alert.type };
              const IconComponent = config.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3"
                  data-testid={`alert-item-${alert.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={severityStyles[alert.severity] ?? severityStyles.info} data-testid={`alert-severity-${alert.id}`}>
                        {config.label}
                      </Badge>
                      <Badge variant="secondary" data-testid={`alert-sport-${alert.id}`}>
                        {alert.sport}
                      </Badge>
                      {alert.actionable && (
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500" data-testid={`alert-actionable-${alert.id}`}>
                          Actionable
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1" data-testid={`alert-title-${alert.id}`}>
                      {alert.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5" data-testid={`alert-desc-${alert.id}`}>
                      {alert.description}
                    </p>
                    {alert.game && (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid={`alert-game-${alert.id}`}>
                        {alert.game}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {notes.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Notes</span>
                  </div>
                </div>
                {notes.map((note) => (
                  <div key={note.id} className="flex items-start gap-3 pl-2" data-testid={`note-item-${note.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {note.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5" data-testid={`note-content-${note.id}`}>
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a personal note..."
            className="resize-none min-h-[40px]"
            rows={1}
            data-testid="input-note"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            data-testid="button-send-note"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

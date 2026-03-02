import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCheck,
  Settings2,
  Trophy,
  XCircle,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useSSE } from "@/hooks/use-sse";

interface Notification {
  id: number;
  type: "line_movement" | "injury_report" | "sharp_money" | "game_start" | "score_change" | "parlay_hit" | "parlay_miss";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  gameId?: string;
  sport?: string;
  meta?: Record<string, any>;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  game_start: { icon: Clock, color: "text-purple-500", label: "Game Updates" },
  score_change: { icon: Zap, color: "text-yellow-500", label: "Score Changes" },
  parlay_hit: { icon: Trophy, color: "text-green-500", label: "Parlay Hits" },
  parlay_miss: { icon: XCircle, color: "text-red-500", label: "Parlay Misses" },
  line_movement: { icon: TrendingUp, color: "text-blue-500", label: "Line Movement" },
  injury_report: { icon: AlertTriangle, color: "text-orange-500", label: "Injury Report" },
  sharp_money: { icon: DollarSign, color: "text-emerald-500", label: "Sharp Money" },
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTIONABLE_TYPES = new Set(["line_movement", "sharp_money", "game_start", "score_change"]);

function getNotificationRoute(notification: Notification): string | null {
  if (!ACTIONABLE_TYPES.has(notification.type)) return null;
  if (notification.type === "score_change" || notification.type === "game_start") return "/live";
  if (notification.type === "sharp_money") return "/player-props";
  if (notification.type === "line_movement") return "/";
  return null;
}

export function NotificationsPanel() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    game_start: true,
    score_change: true,
    parlay_hit: true,
    parlay_miss: true,
    line_movement: true,
    injury_report: true,
    sharp_money: true,
  });

  const { data: customNotifications = [], refetch: refetchCustom } = useQuery<Notification[]>({
    queryKey: ["/api/custom-notifications"],
    refetchInterval: 30000,
  });

  const { data: legacyNotifications = [], refetch: refetchLegacy } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const sse = useSSE({
    enabled: true,
    onEvent: (event) => {
      if (event.type === "notification") {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-notifications"] });
      }
    },
  });

  const allNotifications = [...customNotifications, ...legacyNotifications]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  useEffect(() => {
    if (open) {
      refetchCustom();
      refetchLegacy();
    }
  }, [open, refetchCustom, refetchLegacy]);

  const markReadMutation = useMutation({
    mutationFn: async (ids: number[] | undefined) => {
      await apiRequest("PUT", "/api/custom-notifications/read", ids ? { ids } : {});
      await apiRequest("PUT", "/api/notifications/read", ids ? { ids } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const filteredNotifications = allNotifications.filter(
    (n) => preferences[n.type as keyof typeof preferences] !== false
  );

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = useCallback(() => {
    markReadMutation.mutate(undefined);
  }, [markReadMutation]);

  const grouped = filteredNotifications.reduce<Record<string, Notification[]>>((acc, n) => {
    if (!acc[n.type]) acc[n.type] = [];
    acc[n.type].push(n);
    return acc;
  }, {});

  const sortedTypes = ["parlay_hit", "parlay_miss", "score_change", "game_start", "line_movement", "sharp_money", "injury_report"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] sm:w-[380px] p-0" data-testid="panel-notifications">
        <div className="flex items-center justify-between gap-2 p-2.5 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {sse.connected && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500/30 text-green-500" data-testid="badge-sse-live">
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Read all
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-notification-settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="px-2.5 py-2 border-b space-y-1.5" data-testid="panel-notification-settings">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Alert Preferences</p>
            {Object.entries(typeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <config.icon className={`w-3 h-3 ${config.color}`} />
                  <span className="text-xs">{config.label}</span>
                </div>
                <Switch
                  checked={preferences[key as keyof typeof preferences]}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, [key]: checked }))
                  }
                  data-testid={`switch-notif-${key}`}
                />
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="max-h-[360px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center" data-testid="text-no-notifications">
              <Bell className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Subscribe to games to get alerts here</p>
            </div>
          ) : (
            sortedTypes.map(type => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              const config = typeConfig[type];
              if (!config) return null;
              const Icon = config.icon;
              const unreadInGroup = items.filter(n => !n.read).length;
              return (
                <div key={type}>
                  <div className="px-2.5 py-1 bg-muted/50 sticky top-0 z-10">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                      {unreadInGroup > 0 && (
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5" data-testid={`badge-unread-count-${type}`}>
                          {unreadInGroup} new
                        </Badge>
                      )}
                    </span>
                  </div>
                  {items.slice(0, 5).map((notification) => {
                    const route = getNotificationRoute(notification);
                    const isClickable = !!route;
                    return (
                      <div
                        key={`${notification.type}-${notification.id}`}
                        className={`px-2.5 py-2 border-b last:border-b-0 transition-colors ${
                          notification.read ? "opacity-60" : "bg-muted/20"
                        } ${isClickable ? "cursor-pointer hover:bg-accent/40" : ""}`}
                        data-testid={`notification-item-${notification.id}`}
                        onClick={isClickable ? () => { if (!notification.read) markReadMutation.mutate([notification.id]); setOpen(false); setLocation(route); } : undefined}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium leading-tight">{notification.title}</span>
                              {notification.sport && (
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0" data-testid={`badge-sport-${notification.id}`}>
                                  {notification.sport}
                                </Badge>
                              )}
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                              {notification.description}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              {isClickable && (
                                <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium" data-testid={`link-notif-action-${notification.id}`}>
                                  View <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </ScrollArea>

        <div className="px-2.5 py-1.5 border-t bg-muted/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground" data-testid="text-notification-total">
            {filteredNotifications.length} total
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-medium text-primary">{unreadCount} unread</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

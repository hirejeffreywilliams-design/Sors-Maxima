import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCheck,
  Settings2,
} from "lucide-react";

interface Notification {
  id: number;
  type: "line_movement" | "injury_report" | "sharp_money" | "game_start";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  line_movement: { icon: TrendingUp, color: "text-blue-500", label: "Line Movement" },
  injury_report: { icon: AlertTriangle, color: "text-orange-500", label: "Injury Report" },
  sharp_money: { icon: DollarSign, color: "text-green-500", label: "Sharp Money" },
  game_start: { icon: Clock, color: "text-purple-500", label: "Game Start" },
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

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    line_movement: true,
    injury_report: true,
    sharp_money: true,
    game_start: true,
  });

  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const markReadMutation = useMutation({
    mutationFn: (ids: number[] | undefined) => apiRequest("PUT", "/api/notifications/read", ids ? { ids } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const filteredNotifications = notifications.filter(
    (n) => preferences[n.type as keyof typeof preferences]
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
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" data-testid="panel-notifications">
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-notification-settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="p-3 border-b space-y-3" data-testid="panel-notification-settings">
            <p className="text-xs text-muted-foreground font-medium">Notification Preferences</p>
            {Object.entries(typeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <config.icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm">{config.label}</span>
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

        <ScrollArea className="max-h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
              No notifications
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const config = typeConfig[type];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 bg-muted/50">
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                      <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5" data-testid={`badge-unread-count-${type}`}>
                        {items.filter((n) => !n.read).length}
                      </Badge>
                    </span>
                  </div>
                  {items.slice(0, 3).map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-3 py-2.5 border-b last:border-b-0 ${
                        notification.read ? "opacity-60" : "bg-muted/20"
                      }`}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{notification.title}</span>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.description}
                          </p>
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

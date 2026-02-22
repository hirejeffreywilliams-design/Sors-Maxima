import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, TrendingUp, TrendingDown, AlertTriangle, Zap, 
  CloudRain, UserMinus, DollarSign, Clock, Settings,
  ChevronRight, Atom, X, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface UserAlert {
  id: string;
  type: "line_move" | "injury" | "weather" | "value" | "sharp_action" | "custom";
  title: string;
  message: string;
  sport?: string;
  team?: string;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  active: boolean;
  conditions: Record<string, unknown>;
}

interface AlertSettings {
  lineMovement: boolean;
  injuries: boolean;
  steamMoves: boolean;
  weather: boolean;
  sharpMoney: boolean;
}

function getAlertIcon(type: string) {
  switch (type) {
    case "line_move": return <TrendingUp className="w-4 h-4" />;
    case "injury": return <UserMinus className="w-4 h-4" />;
    case "value": return <Zap className="w-4 h-4" />;
    case "weather": return <CloudRain className="w-4 h-4" />;
    case "sharp_action": return <DollarSign className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function getAlertColor(type: string) {
  switch (type) {
    case "line_move": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case "injury": return "bg-red-500/10 text-red-500 border-red-500/30";
    case "value": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "weather": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/30";
    case "sharp_action": return "bg-green-500/10 text-green-500 border-green-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatTimeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SmartAlerts() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    lineMovement: true,
    injuries: true,
    steamMoves: true,
    weather: true,
    sharpMoney: true,
  });

  const { data: alerts = [], isLoading } = useQuery<UserAlert[]>({
    queryKey: ["/api/user/alerts"],
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alerts"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/user/alerts/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alerts"] });
    },
  });

  const activeAlerts = alerts.filter(a => a.active);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Bell className="w-5 h-5 text-yellow-500" />
            Smart Alerts
            <QuantumBadge />
            {triggeredAlerts.length > 0 && (
              <Badge className="bg-red-500 text-white">{triggeredAlerts.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-alert-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0" />
          <span>Create alerts to get notified when betting conditions change.</span>
        </div>

        {showSettings && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="font-medium text-sm">Alert Preferences</p>
            {[
              { key: "lineMovement", label: "Line Movement", icon: TrendingUp },
              { key: "injuries", label: "Injury Updates", icon: UserMinus },
              { key: "steamMoves", label: "Value Alerts", icon: Zap },
              { key: "weather", label: "Weather Alerts", icon: CloudRain },
              { key: "sharpMoney", label: "Sharp Action", icon: DollarSign },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
                <Switch 
                  checked={settings[key as keyof AlertSettings]}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [key]: checked }))}
                  data-testid={`switch-${key}`}
                />
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No alerts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              When relevant events happen, your alerts will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`relative p-4 rounded-lg border transition-colors ${
                    alert.triggered ? "bg-muted/50 border-primary/30" : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getAlertColor(alert.type)}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{alert.title}</span>
                        {alert.sport && <Badge variant="outline">{alert.sport}</Badge>}
                        {alert.triggered && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {alert.team && <span>{alert.team}</span>}
                        {alert.team && <span>•</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(alert.triggeredAt || alert.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alert.active}
                        onCheckedChange={() => toggleMutation.mutate(alert.id)}
                        data-testid={`switch-alert-${alert.id}`}
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); dismissMutation.mutate(alert.id); }}
                        data-testid={`button-dismiss-${alert.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

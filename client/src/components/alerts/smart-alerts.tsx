import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell, TrendingUp, TrendingDown, AlertTriangle, Zap,
  CloudRain, UserMinus, DollarSign, Clock, Settings,
  ChevronRight, X, Info, Plus, Trophy, Target, Flame,
  ShieldAlert, Activity, BarChart3, Wallet,
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface UserAlert {
  id: string;
  type: "line_move" | "injury" | "weather" | "value" | "sharp_action" | "bet_result" | "parlay_update" | "ev_shift" | "cash_out" | "odds_boost" | "custom";
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
  betResults: boolean;
  parlayUpdates: boolean;
  evShifts: boolean;
  oddsBoosts: boolean;
}

const ALERT_TYPES = [
  { value: "line_move",     label: "Line Movement",       icon: TrendingUp,    description: "When a line moves by your threshold" },
  { value: "sharp_action",  label: "Sharp Money Alert",   icon: DollarSign,    description: "When sharp/professional money hits a side" },
  { value: "injury",        label: "Injury Update",       icon: UserMinus,     description: "When a player on your watchlist gets injured" },
  { value: "value",         label: "Value / EV Alert",    icon: Zap,           description: "When expected value exceeds your threshold" },
  { value: "weather",       label: "Weather Alert",       icon: CloudRain,     description: "Outdoor game weather conditions update" },
  { value: "bet_result",    label: "Bet Result",          icon: Trophy,        description: "When one of your tracked bets settles" },
  { value: "parlay_update", label: "Parlay Progress",     icon: Activity,      description: "Live updates on your parlay legs" },
  { value: "ev_shift",      label: "EV Shift",            icon: BarChart3,     description: "When expected value shifts significantly" },
  { value: "cash_out",      label: "Cash-Out Opportunity",icon: Wallet,        description: "When a favorable cash-out window opens" },
  { value: "odds_boost",    label: "Odds Boost / Promo",  icon: Flame,         description: "When a sportsbook posts a relevant odds boost" },
  { value: "custom",        label: "Custom Alert",        icon: Bell,          description: "Set your own conditions and message" },
] as const;

const SPORTS = ["NBA", "NFL", "NHL", "MLB", "NCAAB", "SOCCER", "MMA", "ALL"];

function getAlertIcon(type: string) {
  const found = ALERT_TYPES.find(t => t.value === type);
  if (found) { const Icon = found.icon; return <Icon className="w-4 h-4" />; }
  return <Bell className="w-4 h-4" />;
}

function getAlertColor(type: string) {
  switch (type) {
    case "line_move":     return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case "injury":        return "bg-red-500/10 text-red-500 border-red-500/30";
    case "value":         return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "weather":       return "bg-cyan-500/10 text-cyan-500 border-cyan-500/30";
    case "sharp_action":  return "bg-green-500/10 text-green-500 border-green-500/30";
    case "bet_result":    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    case "parlay_update": return "bg-violet-500/10 text-violet-500 border-violet-500/30";
    case "ev_shift":      return "bg-orange-500/10 text-orange-500 border-orange-500/30";
    case "cash_out":      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case "odds_boost":    return "bg-pink-500/10 text-pink-500 border-pink-500/30";
    default:              return "bg-muted text-muted-foreground";
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

const QUICK_ALERTS = [
  { type: "sharp_action", title: "Sharp Money — NBA", sport: "NBA", message: "Alert me when sharp money hits any NBA game today", conditions: { sport: "NBA", threshold: 60 } },
  { type: "line_move",    title: "Big Line Moves — All Sports", sport: "ALL", message: "Alert me when any line moves 2+ points today", conditions: { minMove: 2 } },
  { type: "injury",       title: "Key Injuries", sport: "ALL", message: "Alert me when any key player is ruled out", conditions: { statusFilter: "OUT" } },
  { type: "value",        title: "High-EV Picks (>8%)", sport: "ALL", message: "Alert me when a pick shows 8%+ expected value", conditions: { minEV: 8 } },
  { type: "bet_result",   title: "My Bet Results", sport: "ALL", message: "Notify me when any of my tracked bets settle", conditions: {} },
  { type: "parlay_update",title: "Parlay Leg Updates", sport: "ALL", message: "Keep me updated as each leg of my parlays resolves", conditions: {} },
  { type: "cash_out",     title: "Cash-Out Alerts", sport: "ALL", message: "Alert me when my parlay reaches a favorable cash-out point", conditions: {} },
];

function CreateAlertForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState<string>("line_move");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sport, setSport] = useState("ALL");
  const [team, setTeam] = useState("");

  const createMutation = useMutation({
    mutationFn: async (body: object) =>
      apiRequest("POST", "/api/user/alerts", body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alerts"] });
      onCreated();
      setTitle(""); setMessage(""); setTeam("");
    },
  });

  const handleQuickAdd = (quick: typeof QUICK_ALERTS[0]) => {
    createMutation.mutate({
      type: quick.type,
      title: quick.title,
      message: quick.message,
      sport: quick.sport,
      active: true,
      conditions: quick.conditions,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    createMutation.mutate({
      type, title: title.trim(), message: message.trim(),
      sport: sport === "ALL" ? undefined : sport,
      team: team.trim() || undefined,
      active: true,
      conditions: {},
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick-Add Recommended Alerts</p>
        <div className="grid grid-cols-1 gap-1.5">
          {QUICK_ALERTS.map((q, i) => {
            const found = ALERT_TYPES.find(t => t.value === q.type);
            const Icon = found?.icon || Bell;
            return (
              <button
                key={i}
                onClick={() => handleQuickAdd(q)}
                disabled={createMutation.isPending}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left w-full"
                data-testid={`quick-alert-${q.type}-${i}`}
              >
                <div className={`p-1.5 rounded ${getAlertColor(q.type)}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{q.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{q.message}</p>
                </div>
                <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Custom Alert</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Alert Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-alert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-alert-sport">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORTS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alert Name</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Lakers line move"
              className="h-8 text-xs"
              data-testid="input-alert-title"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What should this alert notify you about?"
              className="h-8 text-xs"
              data-testid="input-alert-message"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Team (optional)</Label>
            <Input
              value={team}
              onChange={e => setTeam(e.target.value)}
              placeholder="e.g. Lakers, Celtics"
              className="h-8 text-xs"
              data-testid="input-alert-team"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full h-8 text-xs"
            disabled={!title.trim() || !message.trim() || createMutation.isPending}
            data-testid="button-create-alert"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {createMutation.isPending ? "Creating..." : "Create Alert"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function SmartAlerts() {
  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    lineMovement: true,
    injuries: true,
    steamMoves: true,
    weather: true,
    sharpMoney: true,
    betResults: true,
    parlayUpdates: true,
    evShifts: true,
    oddsBoosts: false,
  });

  const { data: alerts = [], isLoading } = useQuery<UserAlert[]>({
    queryKey: ["/api/user/alerts"],
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user/alerts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/alerts"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/user/alerts/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/alerts"] }),
  });

  const activeAlerts = alerts.filter(a => a.active);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  const SETTINGS_ROWS = [
    { key: "lineMovement",  label: "Line Movement",     icon: TrendingUp  },
    { key: "injuries",      label: "Injury Updates",    icon: UserMinus   },
    { key: "sharpMoney",    label: "Sharp Action",      icon: DollarSign  },
    { key: "steamMoves",    label: "Value Alerts",      icon: Zap         },
    { key: "weather",       label: "Weather Alerts",    icon: CloudRain   },
    { key: "betResults",    label: "Bet Results",       icon: Trophy      },
    { key: "parlayUpdates", label: "Parlay Progress",   icon: Activity    },
    { key: "evShifts",      label: "EV Shifts",         icon: BarChart3   },
    { key: "oddsBoosts",    label: "Odds Boosts",       icon: Flame       },
  ];

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
              variant={showCreate ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setShowCreate(s => !s); setShowSettings(false); }}
              data-testid="button-create-alert-toggle"
            >
              <Plus className="w-3.5 h-3.5" />
              New Alert
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setShowSettings(s => !s); setShowCreate(false); }}
              data-testid="button-alert-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {activeAlerts.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
            </span>
            {triggeredAlerts.length > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <ShieldAlert className="w-3 h-3" />
                {triggeredAlerts.length} triggered
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">

        {showCreate && (
          <div className="p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Create New Alert
              </p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreate(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <CreateAlertForm onCreated={() => setShowCreate(false)} />
          </div>
        )}

        {showSettings && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="font-medium text-sm">Alert Preferences</p>
            {SETTINGS_ROWS.map(({ key, label, icon: Icon }) => (
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

        {!showCreate && alerts.length === 0 && (
          <div className="p-3 bg-blue-500/10 rounded-lg text-sm text-blue-500 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You have no alerts yet. Click <strong>New Alert</strong> above to get notified when betting conditions change — line moves, injuries, sharp money, bet results, and more.</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
        ) : alerts.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`relative p-4 rounded-lg border transition-colors ${
                    alert.triggered ? "bg-muted/50 border-primary/30" : "bg-muted/20 border-border"
                  }`}
                  data-testid={`alert-card-${alert.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getAlertColor(alert.type)}`}>
                      {getAlertIcon(alert.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{alert.title}</span>
                        {alert.sport && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.sport}</Badge>}
                        {alert.triggered && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {alert.team && <span className="font-medium">{alert.team}</span>}
                        {alert.team && <span>•</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(alert.triggeredAt || alert.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${alert.active ? "bg-emerald-500" : "bg-zinc-500"}`} />
                          {alert.active ? "Active" : "Paused"}
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
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); dismissMutation.mutate(alert.id); }}
                        data-testid={`button-dismiss-${alert.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  );
}

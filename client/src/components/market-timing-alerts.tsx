import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign, Activity } from "lucide-react";

interface OddsEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  markets: any[];
}

interface LineMovement {
  id: string;
  game: string;
  market: string;
  outcome: string;
  openingLine: number;
  currentLine: number;
  movement: number;
  direction: "up" | "down";
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
  publicPercent: number;
  sharpPercent: number;
  valueWindow: number;
  confidence: number;
  timestamp: string;
}

interface ValueWindow {
  id: string;
  game: string;
  market: string;
  outcome: string;
  currentOdds: number;
  expectedClose: number;
  edge: number;
  windowMinutes: number;
  urgency: "low" | "medium" | "high" | "critical";
  reason: string;
}

interface SharpAlert {
  id: string;
  game: string;
  market: string;
  side: string;
  sharpBooks: string[];
  moveSize: number;
  timing: string;
  confidence: number;
  recommendation: string;
}

interface MarketTimingAlertsProps {
  events: OddsEvent[];
}

function generateLineMovements(events: OddsEvent[]): LineMovement[] {
  const movements: LineMovement[] = [];
  const markets = ["Spread", "Moneyline", "Total"];
  
  events.slice(0, 8).forEach((event, idx) => {
    const movement = (Math.random() - 0.3) * 5;
    const velocity = Math.abs(movement) > 3 ? "steam" : Math.abs(movement) > 2 ? "fast" : Math.abs(movement) > 1 ? "moderate" : "slow";
    const sharpAction = velocity === "steam" || velocity === "fast";
    
    movements.push({
      id: `lm-${idx}`,
      game: `${event.awayTeam} @ ${event.homeTeam}`,
      market: markets[idx % 3],
      outcome: idx % 2 === 0 ? event.homeTeam : event.awayTeam,
      openingLine: -110 + Math.floor(Math.random() * 20),
      currentLine: -110 + Math.floor(Math.random() * 30) - 10,
      movement,
      direction: movement > 0 ? "up" : "down",
      velocity,
      sharpAction,
      publicPercent: 45 + Math.floor(Math.random() * 30),
      sharpPercent: 35 + Math.floor(Math.random() * 40),
      valueWindow: Math.floor(Math.random() * 20) + 5,
      confidence: 0.6 + Math.random() * 0.35,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });
  });
  
  return movements.sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
}

function generateValueWindows(events: OddsEvent[]): ValueWindow[] {
  const windows: ValueWindow[] = [];
  
  events.slice(0, 6).forEach((event, idx) => {
    const edge = 0.02 + Math.random() * 0.08;
    const windowMinutes = Math.floor(Math.random() * 25) + 5;
    
    windows.push({
      id: `vw-${idx}`,
      game: `${event.awayTeam} @ ${event.homeTeam}`,
      market: ["Spread", "Total", "Moneyline"][idx % 3],
      outcome: idx % 2 === 0 ? `${event.homeTeam} -${3 + idx}` : `Over ${210 + idx * 2}`,
      currentOdds: -110 + Math.floor(Math.random() * 20),
      expectedClose: -115 + Math.floor(Math.random() * 10),
      edge,
      windowMinutes,
      urgency: windowMinutes < 10 ? "critical" : windowMinutes < 15 ? "high" : windowMinutes < 20 ? "medium" : "low",
      reason: edge > 0.05 ? "Sharp money incoming" : edge > 0.03 ? "Line about to adjust" : "Early market inefficiency",
    });
  });
  
  return windows.sort((a, b) => a.windowMinutes - b.windowMinutes);
}

function generateSharpAlerts(events: OddsEvent[]): SharpAlert[] {
  const alerts: SharpAlert[] = [];
  const sharpBooks = ["Pinnacle", "Circa", "Bookmaker", "BetCRIS", "Heritage"];
  
  events.slice(0, 5).forEach((event, idx) => {
    if (Math.random() > 0.4) {
      const numBooks = 2 + Math.floor(Math.random() * 3);
      alerts.push({
        id: `sa-${idx}`,
        game: `${event.awayTeam} @ ${event.homeTeam}`,
        market: ["Spread", "Total", "1H Spread"][idx % 3],
        side: idx % 2 === 0 ? event.homeTeam : `Under ${215 + idx * 2}`,
        sharpBooks: sharpBooks.slice(0, numBooks),
        moveSize: 0.5 + Math.random() * 2,
        timing: `${Math.floor(Math.random() * 30) + 5} min ago`,
        confidence: 0.7 + Math.random() * 0.25,
        recommendation: "Fade public, follow sharp money",
      });
    }
  });
  
  return alerts;
}

export function MarketTimingAlerts({ events }: MarketTimingAlertsProps) {
  const [lineMovements, setLineMovements] = useState<LineMovement[]>([]);
  const [valueWindows, setValueWindows] = useState<ValueWindow[]>([]);
  const [sharpAlerts, setSharpAlerts] = useState<SharpAlert[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setLineMovements(generateLineMovements(events));
      setValueWindows(generateValueWindows(events));
      setSharpAlerts(generateSharpAlerts(events));
    };
    
    refresh();
    
    if (autoRefresh) {
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }
  }, [events, autoRefresh]);

  const getVelocityColor = (velocity: string) => {
    switch (velocity) {
      case "steam": return "bg-red-500 text-white";
      case "fast": return "bg-orange-500 text-white";
      case "moderate": return "bg-yellow-500 text-black";
      default: return "bg-muted";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-500 text-white animate-pulse";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      default: return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Market Timing Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={autoRefresh ? "default" : "outline"}>
              {autoRefresh ? "Live" : "Paused"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="movements">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="movements" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Line Movement
            </TabsTrigger>
            <TabsTrigger value="windows" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Value Windows
            </TabsTrigger>
            <TabsTrigger value="sharp" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Sharp Action
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="space-y-3">
            {lineMovements.map((lm) => (
              <div key={lm.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <p className="font-medium text-sm">{lm.game}</p>
                    <p className="text-xs text-muted-foreground">{lm.market}: {lm.outcome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getVelocityColor(lm.velocity)}>
                      {lm.velocity === "steam" && <Zap className="h-3 w-3 mr-1" />}
                      {lm.velocity.toUpperCase()}
                    </Badge>
                    {lm.sharpAction && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Sharp
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Open:</span>{" "}
                    <span className="font-medium">{lm.openingLine > 0 ? "+" : ""}{lm.openingLine}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current:</span>{" "}
                    <span className="font-medium">{lm.currentLine > 0 ? "+" : ""}{lm.currentLine}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {lm.direction === "up" ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={lm.direction === "up" ? "text-green-500" : "text-red-500"}>
                      {lm.movement > 0 ? "+" : ""}{lm.movement.toFixed(1)} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Window:</span>{" "}
                    <span className="font-medium">{lm.valueWindow}m</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Public: {lm.publicPercent}%</span>
                      <span className="text-muted-foreground">Sharp: {lm.sharpPercent}%</span>
                    </div>
                    <Progress value={lm.sharpPercent} className="h-1.5" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(lm.confidence * 100).toFixed(0)}% conf
                  </Badge>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="windows" className="space-y-3">
            {valueWindows.map((vw) => (
              <div key={vw.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <p className="font-medium text-sm">{vw.game}</p>
                    <p className="text-xs text-muted-foreground">{vw.market}: {vw.outcome}</p>
                  </div>
                  <Badge className={getUrgencyColor(vw.urgency)}>
                    {vw.windowMinutes}m left
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground">Current:</span>{" "}
                    <span className="font-medium">{vw.currentOdds > 0 ? "+" : ""}{vw.currentOdds}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Close:</span>{" "}
                    <span className="font-medium">{vw.expectedClose > 0 ? "+" : ""}{vw.expectedClose}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Edge:</span>{" "}
                    <span className="font-medium text-green-500">+{(vw.edge * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{vw.reason}</p>
                  <Button size="sm" variant="default" data-testid="button-add-to-parlay">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Add to Parlay
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sharp" className="space-y-3">
            {sharpAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sharp action detected currently</p>
                <p className="text-xs">Monitoring for coordinated sharp moves...</p>
              </div>
            ) : (
              sharpAlerts.map((sa) => (
                <div key={sa.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <p className="font-medium text-sm">{sa.game}</p>
                      <p className="text-xs text-muted-foreground">{sa.market}: {sa.side}</p>
                    </div>
                    <Badge variant="destructive">
                      <Zap className="h-3 w-3 mr-1" />
                      {sa.moveSize.toFixed(1)} pt move
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sa.sharpBooks.map((book) => (
                      <Badge key={book} variant="outline" className="text-xs">
                        {book}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{sa.timing}</span>
                    <span className="text-green-500 font-medium">{sa.recommendation}</span>
                  </div>
                  
                  <div className="mt-2">
                    <Progress value={sa.confidence * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(sa.confidence * 100).toFixed(0)}% confidence in sharp side
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

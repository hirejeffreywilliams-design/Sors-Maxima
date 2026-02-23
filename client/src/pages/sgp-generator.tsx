import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Link2,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";

const sportOptions = [
  { value: "NBA", label: "Basketball" },
  { value: "NFL", label: "Football" },
  { value: "MLB", label: "Baseball" },
  { value: "NHL", label: "Hockey" },
  { value: "NCAAB", label: "College Hoops" },
  { value: "NCAAF", label: "College Football" },
];

function getCorrelationBadge(correlation: string) {
  if (correlation === "high-positive") return { color: "bg-green-500 text-white", label: "High Correlation" };
  if (correlation === "moderate-positive") return { color: "bg-blue-500 text-white", label: "Moderate Correlation" };
  return { color: "bg-gray-500 text-white", label: "Low Correlation" };
}

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function SGPCard({ sgp }: { sgp: any }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();
  const corrBadge = getCorrelationBadge(sgp.correlation);

  const handleAddAllLegs = () => {
    let added = 0;
    sgp.legs.forEach((leg: any, i: number) => {
      const legId = `sgp-${sgp.id}-${i}`;
      if (!isInSlip(legId)) {
        const slipLeg: ParlaySlipLeg = {
          id: legId,
          team: leg.pick.split(" ")[0],
          opponent: "",
          market: leg.type as any,
          outcome: leg.pick,
          decimalOdds: leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1,
          americanOdds: leg.odds,
          addedFrom: "SGP Generator",
          addedAt: new Date().toISOString(),
          sport: sgp.sport,
        };
        if (addLeg(slipLeg)) added++;
      }
    });
    if (added > 0) {
      toast({ title: "Added to Slip", description: `${added} leg${added > 1 ? "s" : ""} added` });
    }
  };

  return (
    <Card className={`overflow-hidden ${sgp.confidence >= 70 ? "ring-2 ring-green-500/30" : ""}`} data-testid={`sgp-card-${sgp.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{sgp.sport}</Badge>
              <Badge className={`${corrBadge.color} text-xs`}>
                <Link2 className="w-3 h-3 mr-1" />
                {corrBadge.label}
              </Badge>
              <Badge variant="outline" className={`text-xs font-bold ${
                sgp.grade.startsWith("A") ? "border-green-500 text-green-500" :
                sgp.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                "border-yellow-500 text-yellow-500"
              }`}>{sgp.grade}</Badge>
            </div>
            <p className="font-semibold text-sm">{sgp.name}</p>
            <p className="text-xs text-muted-foreground">{sgp.game}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatOdds(sgp.combinedOdds)}</p>
            <p className="text-xs text-muted-foreground">{sgp.combinedDecimal}x</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-sm font-bold">{sgp.confidence}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">EV</p>
            <p className={`text-sm font-bold ${sgp.ev > 0 ? "text-green-500" : "text-red-500"}`}>{sgp.ev > 0 ? "+" : ""}{sgp.ev}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Legs</p>
            <p className="text-sm font-bold">{sgp.legs.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          {sgp.legs.map((leg: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  leg.type === "moneyline" ? "bg-blue-500" :
                  leg.type === "spread" ? "bg-green-500" :
                  leg.type === "total" ? "bg-purple-500" : "bg-orange-500"
                }`} />
                <span className="text-sm">{leg.pick}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{formatOdds(leg.odds)}</span>
            </div>
          ))}
        </div>

        {expanded && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">{sgp.rationale}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Home:</span> {sgp.homeTeam} ({sgp.homeRecord})</div>
              <div><span className="text-muted-foreground">Away:</span> {sgp.awayTeam} ({sgp.awayRecord})</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs" data-testid={`expand-sgp-${sgp.id}`}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button size="sm" onClick={handleAddAllLegs} className="text-xs" data-testid={`add-sgp-${sgp.id}`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Add All Legs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SGPGenerator() {
  const [sport, setSport] = useState("NBA");
  const [groupByGame, setGroupByGame] = useState(true);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/predictions/sgp", sport],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/sgp?sport=${sport}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 120000,
  });

  const sgps = data?.sgps || [];
  const gameGroups = groupByGame
    ? sgps.reduce((acc: any, sgp: any) => {
        if (!acc[sgp.gameId]) acc[sgp.gameId] = { game: sgp.game, sgps: [] };
        acc[sgp.gameId].sgps.push(sgp);
        return acc;
      }, {})
    : null;

  return (
    <div className="space-y-6" data-testid="sgp-generator-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Same Game Parlays</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Correlated multi-leg picks within a single game. Built from real ESPN game data with correlation analysis.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="sgp-sport-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={groupByGame ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupByGame(!groupByGame)}
              data-testid="toggle-group"
            >
              {groupByGame ? "Grouped" : "Ranked"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data?.meta && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.meta.gamesAnalyzed}</p>
              <p className="text-xs text-muted-foreground">Games Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.meta.totalSGPs}</p>
              <p className="text-xs text-muted-foreground">SGPs Generated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{sgps.filter((s: any) => s.confidence >= 65).length}</p>
              <p className="text-xs text-muted-foreground">High Confidence</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Building same game parlays...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            Failed to load SGPs. Please try again.
          </CardContent>
        </Card>
      )}

      {groupByGame && gameGroups ? (
        <div className="space-y-6">
          {Object.entries(gameGroups).map(([gameId, group]: [string, any]) => (
            <div key={gameId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{group.game}</h3>
                <Badge variant="secondary" className="text-xs">{group.sgps.length} SGPs</Badge>
              </div>
              <div className="space-y-3 pl-2 border-l-2 border-muted">
                {group.sgps.map((sgp: any) => (
                  <SGPCard key={sgp.id} sgp={sgp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sgps.map((sgp: any) => (
            <SGPCard key={sgp.id} sgp={sgp} />
          ))}
        </div>
      )}

      {sgps.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No upcoming games found for {sport}. Try a different sport.
          </CardContent>
        </Card>
      )}

      {data?.disclaimer && (
        <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>
      )}
    </div>
  );
}
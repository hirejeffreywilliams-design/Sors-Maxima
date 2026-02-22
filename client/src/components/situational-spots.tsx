import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, TrendingUp, Home, Target, Zap, Database } from "lucide-react";

interface MarketTeam {
  name: string;
  abbreviation: string;
  record: string;
  winPct: number;
}

interface MarketConsensus {
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: number;
  total?: number;
  homeImpliedProb?: number;
  awayImpliedProb?: number;
}

interface MarketEdge {
  homeEV: number;
  awayEV: number;
  valueSide?: "home" | "away" | "none";
}

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  homeTeam: MarketTeam;
  awayTeam: MarketTeam;
  consensus: MarketConsensus;
  edgeAnalysis: MarketEdge;
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: { sport: string; totalGames: number; gamesWithOdds: number; dataSources: string[]; generatedAt: string };
}

interface DerivedSpot {
  id: string;
  game: string;
  sport: string;
  spotType: string;
  team: string;
  pick: string;
  odds: number;
  confidence: number;
  factors: string[];
  description: string;
}

function deriveSpots(games: MarketGame[], sport: string): DerivedSpot[] {
  const spots: DerivedSpot[] = [];

  for (const game of games) {
    const { homeTeam, awayTeam, consensus, edgeAnalysis } = game;
    const hasOdds = consensus.spread !== undefined;

    if (hasOdds && homeTeam.winPct > awayTeam.winPct && consensus.spread !== undefined && consensus.spread < 0) {
      const confidence = Math.min(95, Math.round(
        50 + (homeTeam.winPct - awayTeam.winPct) * 0.5 + (consensus.homeImpliedProb ?? 50) * 0.15
      ));
      spots.push({
        id: `hf-${game.id}`,
        game: game.shortName,
        sport,
        spotType: "Home Favorite",
        team: homeTeam.name,
        pick: `${homeTeam.abbreviation} ${consensus.spread}`,
        odds: consensus.homeMoneyline ?? -110,
        confidence,
        factors: [
          `${homeTeam.name} ${homeTeam.record} (${homeTeam.winPct}%)`,
          `Home advantage with spread ${consensus.spread}`,
          ...(edgeAnalysis.valueSide === "home" ? ["Value side: Home"] : []),
        ],
        description: `${homeTeam.name} is the home favorite with a stronger record (${homeTeam.record}) vs ${awayTeam.name} (${awayTeam.record}).`,
      });
    }

    if (hasOdds && consensus.spread !== undefined && consensus.spread < 0 && awayTeam.winPct > 45) {
      const confidence = Math.min(90, Math.round(
        40 + awayTeam.winPct * 0.4 + Math.abs(consensus.spread) * 1.5
      ));
      spots.push({
        id: `uv-${game.id}`,
        game: game.shortName,
        sport,
        spotType: "Underdog Value",
        team: awayTeam.name,
        pick: `${awayTeam.abbreviation} +${Math.abs(consensus.spread)}`,
        odds: consensus.awayMoneyline ?? +110,
        confidence,
        factors: [
          `${awayTeam.name} ${awayTeam.record} (${awayTeam.winPct}%)`,
          `Getting ${Math.abs(consensus.spread)} points`,
          ...(edgeAnalysis.valueSide === "away" ? ["Value side: Away"] : []),
        ],
        description: `${awayTeam.name} has a solid ${awayTeam.record} record but is getting +${Math.abs(consensus.spread)} points against ${homeTeam.name}.`,
      });
    }

    if (homeTeam.winPct > 50 && awayTeam.winPct > 50 && consensus.total !== undefined) {
      const avgWinPct = (homeTeam.winPct + awayTeam.winPct) / 2;
      const confidence = Math.min(85, Math.round(40 + avgWinPct * 0.5));
      spots.push({
        id: `pt-${game.id}`,
        game: game.shortName,
        sport,
        spotType: "Pace/Total",
        team: `${homeTeam.abbreviation}/${awayTeam.abbreviation}`,
        pick: `Over ${consensus.total}`,
        odds: -110,
        confidence,
        factors: [
          `${homeTeam.name} ${homeTeam.record}`,
          `${awayTeam.name} ${awayTeam.record}`,
          `Both teams above .500 - likely competitive`,
        ],
        description: `Both ${homeTeam.name} (${homeTeam.record}) and ${awayTeam.name} (${awayTeam.record}) have winning records, suggesting a high-scoring game.`,
      });
    }
  }

  spots.sort((a, b) => b.confidence - a.confidence);
  return spots;
}

function getSpotIcon(spotType: string) {
  switch (spotType) {
    case "Home Favorite": return <Home className="w-4 h-4" />;
    case "Underdog Value": return <Target className="w-4 h-4" />;
    case "Pace/Total": return <TrendingUp className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
}

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

export function SituationalSpots() {
  const [sport, setSport] = useState("NBA");
  const [spotType, setSpotType] = useState("all");

  const { data, isLoading, isError } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot", sport],
    queryFn: async () => {
      const res = await fetch(`/api/market-snapshot?sport=${sport}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      return res.json();
    },
  });

  const allSpots = data ? deriveSpots(data.games, sport) : [];
  const spotTypes = Array.from(new Set(allSpots.map((s) => s.spotType)));
  const filtered = allSpots.filter((s) => spotType === "all" || s.spotType === spotType);

  return (
    <div className="space-y-4" data-testid="situational-spots">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">Situational Analysis</span>
          <Badge variant="outline">
            {isLoading ? "..." : `${filtered.length} Spots`}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={(v) => { setSport(v); setSpotType("all"); }}>
            <SelectTrigger className="w-28" data-testid="select-situational-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={spotType} onValueChange={setSpotType}>
            <SelectTrigger className="w-40" data-testid="select-spot-type">
              <SelectValue placeholder="All Spots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spots</SelectItem>
              {spotTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4" data-testid="spots-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="spots-error">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Failed to load situational data for {sport}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="spots-empty">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No situational spots found for {sport}</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="grid gap-4">
            {filtered.map((spot) => (
              <Card
                key={spot.id}
                className={spot.confidence >= 75 ? "border-green-500/30 bg-green-500/5" : ""}
                data-testid={`spot-card-${spot.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge>{spot.sport}</Badge>
                        <Badge variant="outline" className="gap-1">
                          {getSpotIcon(spot.spotType)}
                          {spot.spotType}
                        </Badge>
                      </div>
                      <p className="font-medium" data-testid={`spot-game-${spot.id}`}>{spot.game}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" data-testid={`spot-pick-${spot.id}`}>{spot.pick}</p>
                      <Badge variant="outline">{spot.odds > 0 ? "+" : ""}{spot.odds}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-bold" data-testid={`spot-confidence-${spot.id}`}>{spot.confidence}%</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Team</p>
                      <p className="font-bold text-sm">{spot.team}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {spot.factors.map((factor, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>

                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm">{spot.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {data?.meta && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="spots-attribution">
          <Database className="w-3 h-3" />
          <span>Source: {data.meta.dataSources.join(", ")} | {data.meta.totalGames} games, {data.meta.gamesWithOdds} with odds</span>
        </div>
      )}
    </div>
  );
}

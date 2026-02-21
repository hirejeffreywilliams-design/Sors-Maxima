import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, Flame, Calendar, Plane, Clock, Zap, Target, Atom } from "lucide-react";
import { QuantumAnalysisIndicator, QuantumBadge } from "./quantum-analysis-badge";

interface SituationalSpot {
  id: string;
  game: string;
  sport: string;
  spotType: string;
  team: string;
  pick: string;
  odds: number;
  historicalRecord: string;
  historicalROI: number;
  sampleSize: number;
  factors: string[];
  confidence: number;
  description: string;
}

function getMockSpots(): SituationalSpot[] {
  return [
    {
      id: "1",
      game: "Eagles at Cowboys",
      sport: "NFL",
      spotType: "Revenge Game",
      team: "Eagles",
      pick: "Eagles +1.5",
      odds: -110,
      historicalRecord: "18-7 ATS",
      historicalROI: 28.5,
      sampleSize: 25,
      factors: ["Lost to Cowboys 3 weeks ago", "Jalen Hurts returning from injury", "Primetime spot"],
      confidence: 78,
      description: "Teams are 72% ATS in revenge spots within same season when the loss was by 10+",
    },
    {
      id: "2",
      game: "Knicks at Nuggets",
      sport: "NBA",
      spotType: "Back-to-Back Fade",
      team: "Nuggets",
      pick: "Nuggets -5.5",
      odds: -108,
      historicalRecord: "156-98 ATS",
      historicalROI: 15.2,
      sampleSize: 254,
      factors: ["Knicks played last night", "Nuggets fully rested (3 days)", "Altitude factor"],
      confidence: 82,
      description: "Home favorites vs road B2B teams cover at 61% rate. Even higher in Denver.",
    },
    {
      id: "3",
      game: "Bills at Dolphins",
      sport: "NFL",
      spotType: "Lookahead Spot",
      team: "Bills",
      pick: "Bills -2.5",
      odds: -105,
      historicalRecord: "22-12 ATS",
      historicalROI: 19.8,
      sampleSize: 34,
      factors: ["Dolphins play Chiefs next week", "Divisional game before marquee matchup", "Weather advantage"],
      confidence: 71,
      description: "Teams looking ahead to big games underperform ATS 65% of the time.",
    },
    {
      id: "4",
      game: "Nuggets at 76ers",
      sport: "NBA",
      spotType: "Rest Advantage",
      team: "Nuggets",
      pick: "Nuggets -3",
      odds: -110,
      historicalRecord: "89-52 ATS",
      historicalROI: 21.3,
      sampleSize: 141,
      factors: ["3+ days rest vs 1 day rest", "Embiid questionable", "Late game travel for PHI"],
      confidence: 76,
      description: "Teams with 3+ days rest vs 0-1 day rest cover 63% in primetime.",
    },
    {
      id: "5",
      game: "Oilers at Flames",
      sport: "NHL",
      spotType: "Rivalry Spot",
      team: "Oilers",
      pick: "Oilers ML",
      odds: -125,
      historicalRecord: "28-15",
      historicalROI: 18.2,
      sampleSize: 43,
      factors: ["Battle of Alberta", "McDavid career 2.1 PPG vs CGY", "Oilers on 5-game win streak"],
      confidence: 74,
      description: "Top teams in rivalry games win at 65% rate when coming off 4+ game win streaks.",
    },
    {
      id: "6",
      game: "Chiefs at Raiders",
      sport: "NFL",
      spotType: "Divisional Blowout",
      team: "Chiefs",
      pick: "Chiefs -7",
      odds: -110,
      historicalRecord: "31-18 ATS",
      historicalROI: 16.8,
      sampleSize: 49,
      factors: ["10+ point favorites in division", "Raiders 2-6 in last 8 vs KC", "Mahomes 15-2 vs LV"],
      confidence: 79,
      description: "Elite teams cover big numbers in division when opponent is below .500.",
    },
  ];
}

function getSpotIcon(spotType: string) {
  switch (spotType) {
    case "Revenge Game": return <Flame className="w-4 h-4" />;
    case "Back-to-Back Fade": return <Clock className="w-4 h-4" />;
    case "Lookahead Spot": return <Calendar className="w-4 h-4" />;
    case "Rest Advantage": return <Clock className="w-4 h-4" />;
    case "Rivalry Spot": return <Target className="w-4 h-4" />;
    case "Divisional Blowout": return <TrendingUp className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
}

export function SituationalSpots() {
  const [spots] = useState<SituationalSpot[]>(getMockSpots());
  const [sport, setSport] = useState("all");
  const [spotType, setSpotType] = useState("all");

  const filtered = spots
    .filter(s => sport === "all" || s.sport === sport)
    .filter(s => spotType === "all" || s.spotType === spotType);

  const spotTypes = Array.from(new Set(spots.map(s => s.spotType)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">Situational Analysis</span>
          <Badge variant="outline" className="gap-1">
            <Atom className="w-3 h-3" />
            Pattern Detection
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-situational-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
          <Select value={spotType} onValueChange={setSpotType}>
            <SelectTrigger className="w-40" data-testid="select-spot-type">
              <SelectValue placeholder="All Spots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spots</SelectItem>
              {spotTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <QuantumAnalysisIndicator compact />

      <div className="grid gap-4">
        {filtered.map(spot => (
          <Card 
            key={spot.id}
            className={`${spot.historicalROI >= 20 ? "border-green-500/30 bg-green-500/5" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{spot.sport}</Badge>
                    <Badge variant="outline" className="gap-1">
                      {getSpotIcon(spot.spotType)}
                      {spot.spotType}
                    </Badge>
                  </div>
                  <p className="font-medium">{spot.game}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{spot.pick}</p>
                  <Badge variant="outline">{spot.odds > 0 ? "+" : ""}{spot.odds}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Record</p>
                  <p className="font-bold text-green-500">{spot.historicalRecord}</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Historical ROI</p>
                  <p className="font-bold text-green-500">+{spot.historicalROI}%</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Sample Size</p>
                  <p className="font-bold">{spot.sampleSize}</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-bold">{spot.confidence}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {spot.factors.map((factor, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>

              <div className="p-3 bg-primary/5 rounded-lg mb-3">
                <p className="text-sm">{spot.description}</p>
              </div>

              <Button className="w-full" data-testid={`button-add-spot-${spot.id}`}>
                <Zap className="w-4 h-4 mr-2" />
                Add to Parlay
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

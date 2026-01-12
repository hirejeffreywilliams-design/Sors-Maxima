import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, TrendingUp, Target, Zap, RefreshCw } from "lucide-react";

interface AIPrediction {
  id: string;
  game: string;
  prediction: string;
  confidence: number;
  factors: string[];
  modelAgreement: number;
  projectedLine: number;
  currentLine: number;
  edge: number;
  sport: string;
}

function generateMockPredictions(): AIPrediction[] {
  return [
    {
      id: "ai-1",
      game: "Lakers @ Celtics",
      prediction: "Celtics -4.5",
      confidence: 78,
      factors: ["Home court", "Rest advantage", "Recent form"],
      modelAgreement: 4,
      projectedLine: -6.2,
      currentLine: -4.5,
      edge: 8.2,
      sport: "NBA",
    },
    {
      id: "ai-2",
      game: "Chiefs @ Bills",
      prediction: "Over 48.5",
      confidence: 72,
      factors: ["Offensive efficiency", "Weather", "Pace of play"],
      modelAgreement: 3,
      projectedLine: 51.3,
      currentLine: 48.5,
      edge: 5.8,
      sport: "NFL",
    },
    {
      id: "ai-3",
      game: "Warriors @ Bucks",
      prediction: "Warriors ML",
      confidence: 65,
      factors: ["Injury advantage", "Travel fresh", "Motivation"],
      modelAgreement: 3,
      projectedLine: 145,
      currentLine: 165,
      edge: 4.2,
      sport: "NBA",
    },
    {
      id: "ai-4",
      game: "Yankees @ Dodgers",
      prediction: "Under 8.5",
      confidence: 68,
      factors: ["Pitcher matchup", "Bullpen depth", "Wind factor"],
      modelAgreement: 4,
      projectedLine: 7.8,
      currentLine: 8.5,
      edge: 6.1,
      sport: "MLB",
    },
  ];
}

export function AIPredictions() {
  const [sport, setSport] = useState("all");
  const [predictions, setPredictions] = useState<AIPrediction[]>(generateMockPredictions());
  const [loading, setLoading] = useState(false);

  const refreshPredictions = () => {
    setLoading(true);
    setTimeout(() => {
      setPredictions(generateMockPredictions());
      setLoading(false);
    }, 1500);
  };

  const filteredPredictions = sport === "all" 
    ? predictions 
    : predictions.filter(p => p.sport.toLowerCase() === sport);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Predictions Engine
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-24" data-testid="select-ai-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="nba">NBA</SelectItem>
                <SelectItem value="nfl">NFL</SelectItem>
                <SelectItem value="mlb">MLB</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshPredictions}
              disabled={loading}
              data-testid="button-refresh-ai"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredPredictions.map((pred) => (
          <div
            key={pred.id}
            className={`p-3 rounded-lg border ${
              pred.confidence >= 75
                ? "bg-purple-500/10 border-purple-500/30"
                : pred.confidence >= 65
                ? "bg-chart-1/10 border-chart-1/30"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{pred.sport}</Badge>
                  <p className="font-medium text-sm">{pred.game}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className="font-bold text-purple-500">{pred.prediction}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span className="text-sm font-bold">{pred.confidence}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{pred.modelAgreement}/5 models</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Projected</p>
                <p className="font-bold">{pred.projectedLine}</p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Current</p>
                <p className="font-bold">{pred.currentLine}</p>
              </div>
              <div className="text-center p-1.5 bg-background/50 rounded">
                <p className="text-muted-foreground">Edge</p>
                <p className="font-bold text-green-500">+{pred.edge}%</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {pred.factors.map((factor, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Predictions updated every 15 minutes using ensemble ML models
        </div>
      </CardContent>
    </Card>
  );
}

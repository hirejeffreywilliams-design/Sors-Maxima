import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { User, TrendingUp, TrendingDown, Zap, AlertTriangle, Star, Target, Activity, Info, Loader2 } from "lucide-react";

interface PlayerPredictionItem {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  sport: string;
  predictions: {
    category: string;
    projectedValue: number;
    confidence: number;
    overUnderLine?: number;
    recommendation: "over" | "under" | "neutral";
    reasoning: string;
  }[];
  overallGrade: string;
  dataSource: string;
}

interface AllPlayersPrediction {
  teamId: string;
  teamName: string;
  sport: string;
  players: PlayerPredictionItem[];
  dataSource: string;
}

interface ESPNTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  logo?: string;
}

const sportOptions = [
  { id: "NBA", name: "NBA" },
  { id: "NFL", name: "NFL" },
  { id: "MLB", name: "MLB" },
  { id: "NHL", name: "NHL" },
  { id: "NCAAF", name: "NCAAF" },
  { id: "NCAAB", name: "NCAAB" },
];

export function QuantumPlayerPrediction() {
  const [selectedSport, setSelectedSport] = useState("NBA");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<ESPNTeam[]>({
    queryKey: ["/api/teams", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const predictionMutation = useMutation<AllPlayersPrediction, Error, { sport: string; teamId: string }>({
    mutationFn: async ({ sport, teamId }) => {
      const res = await apiRequest("GET", `/api/tools/player-prediction/${sport}/${teamId}?all=true`);
      return res.json();
    },
  });

  const prediction = predictionMutation.data ?? null;

  const runPrediction = () => {
    if (!selectedTeamId) return;
    predictionMutation.mutate({ sport: selectedSport, teamId: selectedTeamId });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500/20 text-green-500";
      case "B": return "bg-blue-500/20 text-blue-500";
      case "C": return "bg-yellow-500/20 text-yellow-500";
      default: return "bg-red-500/20 text-red-500";
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "over": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "under": return "bg-red-500/20 text-red-500 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Player Performance Projections</CardTitle>
              <Badge variant="secondary" className="text-[10px]">Prop Engine</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-500">
            <Info className="w-4 h-4 shrink-0" />
            <span>Select a sport and team to see ML-projected stat lines for every player. Projections power prop recommendations and correlated leg suggestions.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v); setSelectedTeamId(""); }}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-sport">
                <SelectValue placeholder="Select Sport" />
              </SelectTrigger>
              <SelectContent>
                {sportOptions.map(sport => (
                  <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full sm:w-64" data-testid="select-team">
                <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select Team"} />
              </SelectTrigger>
              <SelectContent>
                {teamsLoading ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading teams...
                  </div>
                ) : (
                  teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.displayName}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={runPrediction} disabled={predictionMutation.isPending || !selectedTeamId} data-testid="button-run-player-prediction">
              {predictionMutation.isPending ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing Roster...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Run Predictions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {predictionMutation.isPending && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {prediction && !predictionMutation.isPending && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold">{prediction.teamName}</h3>
              <p className="text-sm text-muted-foreground">{prediction.players.length} players analyzed</p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Info className="w-3 h-3 mr-1" />
              {prediction.dataSource}
            </Badge>
          </div>

          <div className="space-y-2">
            {prediction.players.map((player) => (
              <Card
                key={player.playerId}
                className="cursor-pointer hover-elevate"
                onClick={() => setExpandedPlayer(expandedPlayer === player.playerId ? null : player.playerId)}
                data-testid={`card-player-${player.playerId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{player.playerName}</span>
                        <Badge variant="secondary" className="text-xs">{player.position}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{player.team}</p>
                    </div>
                    <Badge className={`text-sm ${getGradeColor(player.overallGrade)}`}>
                      {player.overallGrade}
                    </Badge>
                  </div>

                  {expandedPlayer === player.playerId && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {player.predictions.map((pred) => (
                        <div key={pred.category} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <span className="text-sm font-medium capitalize">{pred.category.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-2">
                              {pred.overUnderLine !== undefined && (
                                <span className="text-xs text-muted-foreground">Line: {pred.overUnderLine}</span>
                              )}
                              <Badge variant="outline" className={`text-xs ${getRecommendationBadge(pred.recommendation)}`}>
                                {pred.recommendation === "over" ? (
                                  <><TrendingUp className="w-3 h-3 mr-1" />OVER</>
                                ) : pred.recommendation === "under" ? (
                                  <><TrendingDown className="w-3 h-3 mr-1" />UNDER</>
                                ) : "NEUTRAL"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Projected: <strong>{pred.projectedValue}</strong></span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Confidence:</span>
                              <Progress value={pred.confidence} className="h-1.5 w-16" />
                              <span className="text-xs font-mono">{pred.confidence}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{pred.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {prediction && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">Data source: {prediction.dataSource}</p>
        </div>
      )}
    </div>
  );
}

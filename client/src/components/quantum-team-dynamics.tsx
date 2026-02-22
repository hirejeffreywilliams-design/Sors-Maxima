import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Zap, Shield, Target, MessageSquare, Activity, Heart, Award, AlertTriangle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TeamFactor {
  id: string;
  name: string;
  value: number;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  bettingImplication: string;
}

interface TeamAnalysis {
  teamName: string;
  opponent: string;
  isHome: boolean;
  winProbability: number;
  spreadPrediction: number;
  totalPrediction: number;
  overallConfidence: number;
  factors: TeamFactor[];
  teamDynamics: {
    communication: number;
    morale: number;
    chemistry: number;
    focus: number;
  };
  fanEngagement: number;
  distractionLevel: number;
  efficiencyRating: number;
  plusMinusProjection: number;
}

const sports = [
  { id: "nba", name: "NBA" },
  { id: "nfl", name: "NFL" },
  { id: "mlb", name: "MLB" },
  { id: "nhl", name: "NHL" },
  { id: "ncaaf", name: "NCAAF" },
  { id: "ncaab", name: "NCAAB" },
];

export function QuantumTeamDynamics() {
  const [selectedSport, setSelectedSport] = useState("nba");
  const [teamName, setTeamName] = useState("");
  const [submittedTeam, setSubmittedTeam] = useState("");
  const [submittedSport, setSubmittedSport] = useState("");

  const { data: analysis, isLoading, isError, error } = useQuery<TeamAnalysis>({
    queryKey: ["/api/tools/team-analysis", submittedSport, encodeURIComponent(submittedTeam)],
    enabled: !!submittedTeam && !!submittedSport,
  });

  const runTeamAnalysis = () => {
    if (!teamName.trim()) return;
    setSubmittedSport(selectedSport);
    setSubmittedTeam(teamName.trim());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Team Dynamics</CardTitle>
              <Badge variant="secondary">
                Multi-Factor
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-500/10 p-2 rounded-md">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Live analysis from real-time data</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-full sm:w-36" data-testid="select-sport">
                <SelectValue placeholder="Select Sport" />
              </SelectTrigger>
              <SelectContent>
                {sports.map(sport => (
                  <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Enter team name (e.g. Knicks)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runTeamAnalysis()}
              className="w-full sm:w-64"
              data-testid="input-team-name"
            />
            <Button onClick={runTeamAnalysis} disabled={isLoading || !teamName.trim()} data-testid="button-run-team-analysis">
              {isLoading ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Analyze Team
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center space-y-2">
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-8 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Failed to load team analysis: {(error as Error)?.message}</p>
          </CardContent>
        </Card>
      )}

      {!analysis && !isLoading && !isError && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Select a sport and enter a team name</p>
            <p className="text-sm mt-1">Click "Analyze Team" to view detailed team dynamics and betting insights</p>
          </CardContent>
        </Card>
      )}

      {analysis && !isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Win Probability</p>
                <p className="text-3xl font-bold text-green-500" data-testid="text-win-probability">
                  {(analysis.winProbability * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Spread</p>
                <p className="text-3xl font-bold">{analysis.spreadPrediction}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-3xl font-bold">{analysis.totalPrediction}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                <p className="text-3xl font-bold text-purple-500">
                  {(analysis.overallConfidence * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Team Dynamics Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> Communication
                    </span>
                    <span className="font-mono">{analysis.teamDynamics.communication}%</span>
                  </div>
                  <Progress value={analysis.teamDynamics.communication} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Morale
                    </span>
                    <span className="font-mono">{analysis.teamDynamics.morale}%</span>
                  </div>
                  <Progress value={analysis.teamDynamics.morale} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> Chemistry
                    </span>
                    <span className="font-mono">{analysis.teamDynamics.chemistry}%</span>
                  </div>
                  <Progress value={analysis.teamDynamics.chemistry} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" /> Focus
                    </span>
                    <span className="font-mono">{analysis.teamDynamics.focus}%</span>
                  </div>
                  <Progress value={analysis.teamDynamics.focus} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Advanced Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Efficiency Rating</p>
                    <p className="text-2xl font-bold text-green-500">{analysis.efficiencyRating}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">+/- Projection</p>
                    <p className="text-2xl font-bold text-blue-500">+{analysis.plusMinusProjection}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Fan Engagement</p>
                    <p className="text-2xl font-bold text-orange-500">{analysis.fanEngagement}%</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Distraction Level</p>
                    <p className={`text-2xl font-bold ${analysis.distractionLevel < 25 ? "text-green-500" : "text-yellow-500"}`}>
                      {analysis.distractionLevel}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Factor Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.factors.map((factor) => (
                <div key={factor.id} className="p-3 bg-muted/50 rounded-lg" data-testid={`team-factor-${factor.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {factor.impact === "positive" ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : factor.impact === "negative" ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Shield className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium" data-testid={`text-factor-name-${factor.id}`}>{factor.name}</span>
                    </div>
                    <Badge variant="outline" data-testid={`text-factor-impact-${factor.id}`}>
                      {factor.value >= 0 ? "+" : ""}{(factor.value * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{factor.bettingImplication}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <Progress value={factor.confidence * 100} className="h-1 w-24" />
                    <span className="font-mono">{(factor.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-green-500" />
                Betting Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <Badge className="bg-green-500 mb-2">SPREAD</Badge>
                  <p className="font-bold text-lg">{analysis.teamName.split(" ").pop()} {analysis.spreadPrediction}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(analysis.overallConfidence * 100).toFixed(0)}% confidence</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                  <Badge className="bg-blue-500 mb-2">TOTAL</Badge>
                  <p className="font-bold text-lg">OVER {analysis.totalPrediction}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(analysis.overallConfidence * 100).toFixed(0)}% confidence</p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                  <Badge className="bg-purple-500 mb-2">MONEYLINE</Badge>
                  <p className="font-bold text-lg">{analysis.teamName.split(" ").pop()} ML</p>
                  <p className="text-xs text-muted-foreground mt-1">Moderate value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

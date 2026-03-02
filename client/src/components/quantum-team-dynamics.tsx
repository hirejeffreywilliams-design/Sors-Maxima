import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Zap, Shield, Target, Activity, Award, AlertTriangle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TeamAnalysis {
  teamName: string;
  sport: string;
  record: string;
  winPct: number;
  recentForm: string;
  strengths: string[];
  weaknesses: string[];
  keyPlayers: string[];
  offenseRating: number;
  defenseRating: number;
  overallRating: number;
  dataSource: string;
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
              <CardTitle className="text-lg">Team Health & Roster Dynamics</CardTitle>
              <Badge variant="secondary" className="text-[10px]">46-Factor Input</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-500/10 p-2 rounded-md">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Roster depth, back-to-back fatigue, and travel impact — these factors contribute to the 46-factor prediction model for every game.</span>
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
                <p className="text-sm text-muted-foreground mb-1">Record</p>
                <p className="text-3xl font-bold" data-testid="text-record">
                  {analysis.record}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                <p className={`text-3xl font-bold ${analysis.winPct >= 50 ? "text-green-500" : "text-red-500"}`} data-testid="text-win-pct">
                  {analysis.winPct}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Overall Rating</p>
                <p className="text-3xl font-bold text-purple-500" data-testid="text-overall-rating">
                  {analysis.overallRating}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Form</p>
                <p className={`text-2xl font-bold ${analysis.recentForm === "Hot" ? "text-green-500" : analysis.recentForm === "Cold" ? "text-red-500" : "text-yellow-500"}`}>
                  {analysis.recentForm}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Performance Ratings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Offense
                    </span>
                    <span className="font-mono">{analysis.offenseRating}</span>
                  </div>
                  <Progress value={analysis.offenseRating} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4" /> Defense
                    </span>
                    <span className="font-mono">{analysis.defenseRating}</span>
                  </div>
                  <Progress value={analysis.defenseRating} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" /> Overall
                    </span>
                    <span className="font-mono">{analysis.overallRating}</span>
                  </div>
                  <Progress value={analysis.overallRating} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Strengths & Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" /> Strengths
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.strengths.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Weaknesses
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.weaknesses.map((w, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {analysis.keyPlayers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-500" />
                  Key Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.keyPlayers.map((player, i) => (
                    <Badge key={i} variant="outline" className="text-sm" data-testid={`badge-player-${i}`}>
                      {player}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Data: {analysis.dataSource}
          </div>
        </>
      )}
    </div>
  );
}

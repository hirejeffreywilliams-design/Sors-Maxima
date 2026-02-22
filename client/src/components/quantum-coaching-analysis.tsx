import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Target, TrendingUp, Clock, Users, Zap, AlertTriangle, CheckCircle2, Info, Loader2, User } from "lucide-react";

interface CoachingAnalysisResult {
  teamName: string;
  sport: string;
  coachName: string;
  coachExperience?: number;
  tendencies: { situation: string; tendency: string; frequency: string }[];
  strengths: string[];
  weaknesses: string[];
  overallRating: number;
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

export function QuantumCoachingAnalysis() {
  const [selectedSport, setSelectedSport] = useState("NFL");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const { data: teams = [], isLoading: teamsLoading } = useQuery<ESPNTeam[]>({
    queryKey: ["/api/teams", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const analysisMutation = useMutation<CoachingAnalysisResult, Error, { sport: string; teamId: string }>({
    mutationFn: async ({ sport, teamId }) => {
      const res = await apiRequest("GET", `/api/tools/coaching-analysis/${sport}/${teamId}`);
      return res.json();
    },
  });

  const analysis = analysisMutation.data ?? null;

  const runAnalysis = () => {
    if (!selectedTeamId) return;
    analysisMutation.mutate({ sport: selectedSport, teamId: selectedTeamId });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Brain className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-lg">Coaching Analysis</CardTitle>
              <Badge variant="secondary">ESPN Data</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-500">
            <Info className="w-4 h-4 shrink-0" />
            <span>Select a sport and team to analyze coaching tendencies, strengths, and strategic patterns.</span>
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
            <Button onClick={runAnalysis} disabled={analysisMutation.isPending || !selectedTeamId} data-testid="button-run-coaching-analysis">
              {analysisMutation.isPending ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysisMutation.isPending && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center space-y-2">
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-10 w-20 mx-auto" />
                  <Skeleton className="h-3 w-32 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {analysis && !analysisMutation.isPending && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">{analysis.coachName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Head Coach — {analysis.teamName}
                    {analysis.coachExperience ? ` | ${analysis.coachExperience} yrs experience` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <p className={`text-3xl font-bold ${analysis.overallRating >= 70 ? "text-green-500" : analysis.overallRating >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                    {analysis.overallRating}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md">
                    <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.weaknesses.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="text-sm">{w}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Coaching Tendencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.tendencies.map((t, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg" data-testid={`tendency-${i}`}>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{t.situation}</span>
                    <Badge variant="outline" className="text-xs">{t.frequency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.tendency}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">Data source: {analysis.dataSource}</p>
          </div>
        </>
      )}
    </div>
  );
}

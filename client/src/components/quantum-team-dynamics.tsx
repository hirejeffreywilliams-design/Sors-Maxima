import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Zap, Shield, Target, MessageSquare, Activity, Heart, Award, AlertTriangle, Home } from "lucide-react";

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

export function QuantumTeamDynamics() {
  const [selectedTeam, setSelectedTeam] = useState("lakers");
  const [selectedOpponent, setSelectedOpponent] = useState("celtics");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);

  const teams = [
    { id: "lakers", name: "Los Angeles Lakers" },
    { id: "celtics", name: "Boston Celtics" },
    { id: "warriors", name: "Golden State Warriors" },
    { id: "bucks", name: "Milwaukee Bucks" },
    { id: "nuggets", name: "Denver Nuggets" },
    { id: "heat", name: "Miami Heat" },
  ];

  const runTeamAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const mockAnalysis: TeamAnalysis = {
        teamName: teams.find(t => t.id === selectedTeam)?.name || "",
        opponent: teams.find(t => t.id === selectedOpponent)?.name || "",
        isHome: true,
        winProbability: 0.58,
        spreadPrediction: -4.5,
        totalPrediction: 224.5,
        overallConfidence: 0.79,
        teamDynamics: {
          communication: 85,
          morale: 78,
          chemistry: 82,
          focus: 75
        },
        fanEngagement: 88,
        distractionLevel: 15,
        efficiencyRating: 112.4,
        plusMinusProjection: 4.2,
        factors: [
          {
            id: "1",
            name: "Coaching Matchup Advantage",
            value: 0.08,
            impact: "positive",
            confidence: 0.82,
            bettingImplication: "Coach has 65% win rate vs opponent's coach"
          },
          {
            id: "2",
            name: "Recent Performance Momentum",
            value: 0.12,
            impact: "positive",
            confidence: 0.88,
            bettingImplication: "5-game winning streak, momentum building"
          },
          {
            id: "3",
            name: "Rest Advantage",
            value: 0.05,
            impact: "positive",
            confidence: 0.90,
            bettingImplication: "3 days rest vs opponent's back-to-back"
          },
          {
            id: "4",
            name: "Home Court Boost",
            value: 0.06,
            impact: "positive",
            confidence: 0.85,
            bettingImplication: "Strong home record (18-4)"
          },
          {
            id: "5",
            name: "Injury Report Impact",
            value: -0.04,
            impact: "negative",
            confidence: 0.92,
            bettingImplication: "Key rotation player questionable"
          },
          {
            id: "6",
            name: "Schedule Spot",
            value: -0.02,
            impact: "negative",
            confidence: 0.78,
            bettingImplication: "Potential lookahead to rivalry game"
          },
          {
            id: "7",
            name: "Public Perception Gap",
            value: 0.04,
            impact: "positive",
            confidence: 0.72,
            bettingImplication: "Sharps vs public money disagree - value exists"
          }
        ]
      };
      setAnalysis(mockAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Quantum Team Dynamics</CardTitle>
              <Badge variant="secondary">
                Multi-Factor
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-team">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="self-center text-muted-foreground">vs</span>
            <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-opponent">
                <SelectValue placeholder="Select Opponent" />
              </SelectTrigger>
              <SelectContent>
                {teams.filter(t => t.id !== selectedTeam).map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runTeamAnalysis} disabled={isAnalyzing} data-testid="button-run-team-analysis">
              {isAnalyzing ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Analyze Matchup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
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
                Quantum Factor Breakdown
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
                  <p className="text-xs text-muted-foreground mt-1">58% confidence</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                  <Badge className="bg-blue-500 mb-2">TOTAL</Badge>
                  <p className="font-bold text-lg">OVER {analysis.totalPrediction}</p>
                  <p className="text-xs text-muted-foreground mt-1">62% confidence</p>
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

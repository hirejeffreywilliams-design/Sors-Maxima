import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Activity,
  Target,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  CircleDot,
  Swords,
  Trophy,
  Gamepad2,
  Bike,
  Disc3,
  Flame,
  Volleyball,
  Timer,
  Flag,
  Dribbble,
  Sparkles,
  BarChart3,
  Lightbulb,
  Shield,
  Database,
  Compass,
  GaugeCircle,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const SPORT_ICONS: Record<string, any> = {
  "NBA": Dribbble,
  "NFL": Trophy,
  "MLB": Target,
  "NHL": Disc3,
  "NCAAB": Dribbble,
  "NCAAF": Trophy,
  "Soccer": CircleDot,
  "Tennis": Activity,
  "Cricket": Volleyball,
  "Golf": Flag,
  "Horse Racing": Bike,
  "Motorsport": Timer,
  "Boxing/MMA": Swords,
  "Esports": Gamepad2,
};

const SPORT_LABELS: Record<string, string> = {
  "NBA": "NBA",
  "NFL": "NFL",
  "MLB": "MLB",
  "NHL": "NHL",
  "NCAAB": "NCAAB",
  "NCAAF": "NCAAF",
  "Soccer": "Soccer",
  "Tennis": "Tennis",
  "Cricket": "Cricket",
  "Golf": "Golf",
  "Horse Racing": "Horse Racing",
  "Motorsport": "Motorsport",
  "Boxing/MMA": "Boxing/MMA",
  "Esports": "Esports",
};

function getApplicabilityBadge(value: number) {
  if (value > 80) return <Badge className="bg-green-500/10 text-green-500">{value}%</Badge>;
  if (value >= 50) return <Badge className="bg-yellow-500/10 text-yellow-500">{value}%</Badge>;
  return <Badge className="bg-red-500/10 text-red-500">{value}%</Badge>;
}

function SportExplorerTab() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data: sportsData, isLoading: sportsLoading } = useQuery<any>({
    queryKey: ["/api/sport-factors/sports"],
  });

  const { data: sportProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: [`/api/sport-factors/${selectedSport}`],
    enabled: !!selectedSport,
  });

  const sports = sportsData?.sports || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(SPORT_LABELS).map(([id, label]) => {
          const Icon = SPORT_ICONS[id] || Activity;
          const sportData = sports.find((s: any) => s.id === id);
          const isSelected = selectedSport === id;
          return (
            <Card
              key={id}
              className={`cursor-pointer hover-elevate transition-colors ${isSelected ? "border-primary" : ""}`}
              onClick={() => setSelectedSport(isSelected ? null : id)}
              data-testid={`card-sport-${id}`}
            >
              <CardContent className="p-3 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-sm font-medium">{label}</div>
                {sportData && (
                  <div className="text-xs text-muted-foreground">{sportData.factorCount} factors</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sportsLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSport && profileLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedSport && sportProfile && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2" data-testid="text-sport-header">
                  {(() => { const Icon = SPORT_ICONS[selectedSport] || Activity; return <Icon className="w-5 h-5" />; })()}
                  {sportProfile.displayName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sportProfile.totalFactors} factors</Badge>
                  <Badge variant="outline">{sportProfile.categories?.length || 0} categories</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Factor Categories
            </h3>
            {sportProfile.categories?.map((category: any) => (
              <Collapsible
                key={category.id}
                open={expandedCategory === category.id}
                onOpenChange={(open) => setExpandedCategory(open ? category.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className="flex items-center gap-2 p-3 rounded-md bg-card border hover-elevate cursor-pointer"
                    data-testid={`category-${category.id}`}
                  >
                    <Flame className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{category.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{category.factors?.length || 0}</Badge>
                    </div>
                    {expandedCategory === category.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2 pl-4">
                  {category.factors?.map((factor: any) => (
                    <div key={factor.id} className="p-3 rounded-md border bg-card" data-testid={`factor-${factor.id}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <span className="font-medium text-sm">{factor.name}</span>
                        <div className="flex items-center gap-2">
                          {getApplicabilityBadge(factor.applicability)}
                          {factor.dataSource && (
                            <Badge variant="secondary" className="text-xs">{factor.dataSource}</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{factor.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">Weight</span>
                        <Progress value={factor.weight * 100} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-10 text-right">{(factor.weight * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {sportProfile.signalModifiers && typeof sportProfile.signalModifiers === "object" && Object.keys(sportProfile.signalModifiers).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Factor Adjustments ({Object.keys(sportProfile.signalModifiers).length} factors)
              </h3>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                      {Object.entries(sportProfile.signalModifiers).map(([factor, modifier], i) => {
                        const mod = modifier as number;
                        return (
                          <div key={factor} className="flex items-center gap-3 p-3 text-sm" data-testid={`modifier-${i}`}>
                            <span className="font-medium flex-1 capitalize">{factor.replace(/_/g, " ")}</span>
                            <Badge variant={mod > 1 ? "default" : mod < 1 ? "destructive" : "secondary"} className="text-xs">
                              {mod > 1 ? "+" : ""}{((mod - 1) * 100).toFixed(0)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {mod > 1 ? "Amplified for this sport" : mod < 1 ? "Reduced for this sport" : "Standard weight"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RealTimeAnalysisTab() {
  const { toast } = useToast();
  const [sport, setSport] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [results, setResults] = useState<any>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sport-factors/${sport}/analyze`, {
        context: { homeTeam, awayTeam },
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({ title: "Analysis Complete", description: `Sport factor analysis for ${SPORT_LABELS[sport] || sport} generated.` });
    },
    onError: () => {
      toast({ title: "Analysis Failed", description: "Could not complete the analysis.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Run Sport Factor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Sport</label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="select-analysis-sport">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPORT_LABELS).map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Home Team</label>
              <Input
                placeholder="e.g. Knicks"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                data-testid="input-home-team"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Away Team</label>
              <Input
                placeholder="e.g. Nuggets"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                data-testid="input-away-team"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={!sport || analyzeMutation.isPending}
              className="gap-2"
              data-testid="button-run-analysis"
            >
              {analyzeMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Run Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <GaugeCircle className="w-6 h-6 mx-auto mb-1 text-primary" />
                <div className="text-3xl font-bold" data-testid="text-overall-score">{results.overallSportScore}</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <div className="text-3xl font-bold" data-testid="text-top-factors-count">{results.topFactors?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Top Factors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                <div className="text-3xl font-bold" data-testid="text-risk-count">{results.riskFactors?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Risk Factors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <div className="text-3xl font-bold" data-testid="text-data-quality">{results.dataQuality || "N/A"}</div>
                <div className="text-xs text-muted-foreground">Data Quality</div>
              </CardContent>
            </Card>
          </div>

          {results.topFactors && results.topFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Top Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.topFactors.map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-3" data-testid={`top-factor-${i}`}>
                    <span className="text-sm font-medium flex-1">{f.name}</span>
                    <Progress value={f.score} className="w-24 h-2" />
                    <span className="text-xs font-medium w-10 text-right">{f.score}</span>
                    <Badge variant={f.impact === "high" ? "default" : "secondary"} className="text-xs">{f.impact}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.riskFactors && results.riskFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.riskFactors.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md border" data-testid={`risk-factor-${i}`}>
                    <Badge className={`text-xs shrink-0 ${r.severity === "high" ? "bg-red-500/10 text-red-500" : r.severity === "medium" ? "bg-yellow-500/10 text-yellow-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {r.severity}
                    </Badge>
                    <div>
                      <span className="text-sm font-medium">{r.name}</span>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.sportSpecificInsights && results.sportSpecificInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Sport-Specific Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.sportSpecificInsights.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm" data-testid={`insight-${i}`}>
                    <Sparkles className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span className="text-muted-foreground">{insight}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.factorScores && results.factorScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Factor Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {results.factorScores.map((fs: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm" data-testid={`factor-score-${i}`}>
                        <span className="flex-1 truncate capitalize">{fs.factorId?.replace(/_/g, " ")}</span>
                        <Progress value={fs.score} className="w-20 h-2" />
                        <span className="text-xs w-8 text-right">{fs.score}</span>
                        <Badge variant="outline" className="text-xs w-14 justify-center">{fs.confidence}%</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FusionDeepDiveTab() {
  const { toast } = useToast();
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [odds, setOdds] = useState("");
  const [results, setResults] = useState<any>(null);

  const fusionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sport-factors/${sport}/fusion-analysis`, {
        description,
        odds: parseFloat(odds) || 0,
        context: {},
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({ title: "Fusion Analysis Complete", description: "Combined factor + sport analysis generated." });
    },
    onError: () => {
      toast({ title: "Analysis Failed", description: "Could not complete fusion analysis.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Fusion Deep Dive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Sport</label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="select-fusion-sport">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPORT_LABELS).map(([id, label]) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bet Description</label>
              <Input
                placeholder="e.g. Knicks -3.5 vs Nuggets"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-bet-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Odds</label>
              <Input
                placeholder="e.g. -110"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                data-testid="input-odds"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => fusionMutation.mutate()}
              disabled={!sport || !description || fusionMutation.isPending}
              className="gap-2"
              data-testid="button-run-fusion"
            >
              {fusionMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-violet-500/5 to-blue-500/5 border-violet-500/20">
            <CardContent className="p-6 text-center">
              <div className="text-xs text-muted-foreground mb-1">Combined Score</div>
              <div className="text-5xl font-bold" data-testid="text-combined-score">{results.combinedScore}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {results.sport && SPORT_LABELS[results.sport]} &middot; {results.analyzedAt ? new Date(results.analyzedAt).toLocaleTimeString() : ""}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  Prediction Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.fusion && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded-md border">
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="font-semibold" data-testid="text-fusion-score">{results.fusion.overallScore || results.fusion.score}</div>
                      </div>
                      <div className="p-2 rounded-md border">
                        <div className="text-xs text-muted-foreground">Grade</div>
                        <div className="font-semibold" data-testid="text-fusion-grade">{results.fusion.grade}</div>
                      </div>
                      <div className="p-2 rounded-md border">
                        <div className="text-xs text-muted-foreground">EV</div>
                        <div className={`font-semibold ${(results.fusion.expectedValue || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(results.fusion.expectedValue || 0) >= 0 ? "+" : ""}{results.fusion.expectedValue || 0}%
                        </div>
                      </div>
                      <div className="p-2 rounded-md border">
                        <div className="text-xs text-muted-foreground">Win Prob</div>
                        <div className="font-semibold">{results.fusion.winProbability || 0}%</div>
                      </div>
                    </div>
                    {results.fusion.recommendation && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Recommendation:</span>
                        <Badge>{results.fusion.recommendation.replace(/_/g, " ")}</Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-500" />
                  Sport-Specific
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.sportSpecific && (
                  <>
                    <div className="p-2 rounded-md border text-center">
                      <div className="text-xs text-muted-foreground">Sport Score</div>
                      <div className="text-2xl font-bold" data-testid="text-sport-score">{results.sportSpecific.overallSportScore || results.sportSpecific.score}</div>
                    </div>
                    {results.sportSpecific.topFactors?.map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{f.name}</span>
                        <Progress value={f.score} className="w-16 h-2" />
                        <span className="text-xs w-8 text-right">{f.score}</span>
                      </div>
                    ))}
                    {results.sportSpecific.sportSpecificInsights?.map((insight: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Sparkles className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                        <span className="text-muted-foreground">{insight}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {results.fusion?.synergies && results.fusion.synergies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Synergy Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.fusion.synergies.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md border" data-testid={`synergy-${i}`}>
                    <Badge className={`text-xs shrink-0 ${s.synergyType === "amplifying" ? "bg-green-500/10 text-green-500" : s.synergyType === "dampening" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {s.synergyType}
                    </Badge>
                    <span className="text-muted-foreground">{s.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FactorDatabaseTab() {
  const [searchText, setSearchText] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: sportsData, isLoading } = useQuery<any>({
    queryKey: ["/api/sport-factors/sports"],
  });

  const sportIds = useMemo(() => Object.keys(SPORT_LABELS), []);

  const sportQueries = useQueries({
    queries: sportIds.map((id) => ({
      queryKey: [`/api/sport-factors/${id}`] as const,
      enabled: true,
    })),
  });

  const allFactors = useMemo(() => {
    const factors: any[] = [];
    sportQueries.forEach((q, i) => {
      if (!q.data) return;
      const sportId = sportIds[i];
      const d = q.data as any;
      d.categories?.forEach((cat: any) => {
        cat.factors?.forEach((f: any) => {
          factors.push({
            sport: sportId,
            sportLabel: SPORT_LABELS[sportId] || sportId,
            category: cat.name,
            categoryId: cat.id,
            ...f,
          });
        });
      });
    });
    return factors;
  }, [sportQueries, sportIds]);

  const filteredFactors = useMemo(() => {
    return allFactors.filter((f) => {
      if (filterSport !== "all" && f.sport !== filterSport) return false;
      if (filterCategory !== "all" && f.categoryId !== filterCategory) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.sportLabel?.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFactors, filterSport, filterCategory, searchText]);

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    allFactors.forEach((f) => set.set(f.categoryId, f.category));
    return Array.from(set.entries());
  }, [allFactors]);

  const avgApplicability = useMemo(() => {
    if (allFactors.length === 0) return 0;
    return Math.round(allFactors.reduce((sum, f) => sum + (f.applicability || 0), 0) / allFactors.length);
  }, [allFactors]);

  const anyLoading = isLoading || sportQueries.some((q) => q.isLoading);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="text-total-factors">{allFactors.length}</div>
            <div className="text-xs text-muted-foreground">Total Factors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="text-avg-applicability">{avgApplicability}%</div>
            <div className="text-xs text-muted-foreground">Avg Applicability</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="text-sports-covered">{sportIds.length}</div>
            <div className="text-xs text-muted-foreground">Sports Covered</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search factors..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-search-factors"
          />
        </div>
        <Select value={filterSport} onValueChange={setFilterSport}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-sport">
            <SelectValue placeholder="All Sports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {Object.entries(SPORT_LABELS).map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {anyLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredFactors.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No factors found matching your criteria.</div>
                ) : (
                  filteredFactors.map((f, i) => (
                    <div key={`${f.sport}-${f.id}-${i}`} className="p-3 text-sm flex items-center gap-3 flex-wrap" data-testid={`db-factor-${i}`}>
                      <Badge variant="outline" className="text-xs shrink-0">{f.sportLabel}</Badge>
                      <Badge variant="secondary" className="text-xs shrink-0">{f.category}</Badge>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">{f.description}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Progress value={(f.weight || 0) * 100} className="w-16 h-2" />
                        <span className="text-xs w-8 text-right">{((f.weight || 0) * 100).toFixed(0)}%</span>
                        {getApplicabilityBadge(f.applicability || 0)}
                        {f.dataSource && <Badge variant="secondary" className="text-xs">{f.dataSource}</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SportFactorAnalysis() {
  useSEO({ title: "Sport Factor Analysis", description: "Deep analysis of sport-specific betting factors" });
  return (
    <ScrollArea className="h-full">
      <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Activity className="w-6 h-6 text-white" />
              </div>
              Sport Factor Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep-dive into sport-specific factors, real-time analysis, and prediction insights
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="w-3 h-3" />
            14 Sports Covered
          </Badge>
        </div>

        <Tabs defaultValue="explorer" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="explorer" className="gap-2" data-testid="tab-explorer">
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Sport Explorer</span>
              <span className="sm:hidden">Explorer</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2" data-testid="tab-analysis">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Real-Time Analysis</span>
              <span className="sm:hidden">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="fusion" className="gap-2" data-testid="tab-fusion">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Fusion Deep Dive</span>
              <span className="sm:hidden">Fusion</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2" data-testid="tab-database">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Factor Database</span>
              <span className="sm:hidden">Database</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer">
            <SportExplorerTab />
          </TabsContent>

          <TabsContent value="analysis">
            <RealTimeAnalysisTab />
          </TabsContent>

          <TabsContent value="fusion">
            <FusionDeepDiveTab />
          </TabsContent>

          <TabsContent value="database">
            <FactorDatabaseTab />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

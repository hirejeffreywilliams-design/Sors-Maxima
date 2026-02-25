import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertTriangle,
  Lightbulb,
  Zap,
  Shield,
  Flame,
  BarChart3,
  ArrowRight,
  Dna,
  Activity,
  Star,
  ChevronRight,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface BettingDNA {
  favoriteSport: string | null;
  favoriteMarket: string | null;
  preferredOddsRange: { min: number; max: number } | null;
  riskProfile: "conservative" | "moderate" | "aggressive" | "unknown";
  bettingStyle: string;
  strengths: string[];
  weaknesses: string[];
}

interface PerformanceTrend {
  label: string;
  direction: "improving" | "declining" | "stable";
  detail: string;
}

interface PersonalizedRecommendation {
  id: string;
  type: "game_match" | "strategy" | "warning" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  sport?: string;
  actionLabel?: string;
  actionRoute?: string;
  relatedPick?: {
    id: string;
    sport: string;
    game: string;
    pick: string;
    betType: string;
    odds: number;
    confidence: number;
    grade: string;
    ev: number;
  };
}

interface SportBreakdown {
  sport: string;
  bets: number;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  profit: number;
  avgOdds: number;
  isStrength: boolean;
}

interface MarketBreakdown {
  market: string;
  bets: number;
  wins: number;
  winRate: number;
  roi: number;
  isStrength: boolean;
}

interface PersonalizedInsights {
  hasBettingHistory: boolean;
  totalBets: number;
  bettingDNA: BettingDNA;
  sportBreakdowns: SportBreakdown[];
  marketBreakdowns: MarketBreakdown[];
  performanceTrends: PerformanceTrend[];
  recommendations: PersonalizedRecommendation[];
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    totalDaysActive: number;
  };
  overallStats: {
    winRate: number;
    roi: number;
    totalProfit: number;
    totalStaked: number;
    avgOdds: number;
  };
  generatedAt: string;
}

const riskProfileConfig = {
  conservative: { label: "Conservative", color: "text-blue-500", bg: "bg-blue-500/10", icon: Shield },
  moderate: { label: "Moderate", color: "text-amber-500", bg: "bg-amber-500/10", icon: Target },
  aggressive: { label: "Aggressive", color: "text-red-500", bg: "bg-red-500/10", icon: Flame },
  unknown: { label: "Developing", color: "text-muted-foreground", bg: "bg-muted", icon: Activity },
};

const trendIcons = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const trendColors = {
  improving: "text-green-500",
  declining: "text-red-500",
  stable: "text-muted-foreground",
};

const recTypeConfig = {
  game_match: { icon: Target, color: "border-l-blue-500", bg: "bg-blue-500/5" },
  strategy: { icon: Lightbulb, color: "border-l-amber-500", bg: "bg-amber-500/5" },
  warning: { icon: AlertTriangle, color: "border-l-red-500", bg: "bg-red-500/5" },
  opportunity: { icon: Zap, color: "border-l-green-500", bg: "bg-green-500/5" },
};

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export default function PersonalizedInsightsPage() {
  useSEO({ title: "Personalized Insights", description: "AI-driven insights tailored to your betting style" });
  const [, navigate] = useLocation();

  const { data: insights, isLoading } = useQuery<PersonalizedInsights>({
    queryKey: ["/api/user/personalized-insights"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" data-testid="loading-personalized-insights">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const riskConfig = riskProfileConfig[insights.bettingDNA.riskProfile];
  const RiskIcon = riskConfig.icon;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-personalized-insights">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" data-testid="heading-insights">
          <Brain className="w-7 h-7 text-primary" />
          Your Betting Intelligence
        </h1>
        <p className="text-muted-foreground text-sm">
          Personalized analysis and recommendations based on your betting history
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-stats-overview">
        <Card className="overflow-visible" data-testid="card-stat-bets">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{insights.totalBets}</div>
            <div className="text-xs text-muted-foreground">Total Bets</div>
          </CardContent>
        </Card>
        <Card className="overflow-visible" data-testid="card-stat-winrate">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${insights.overallStats.winRate >= 50 ? "text-green-500" : insights.overallStats.winRate > 0 ? "text-red-500" : ""}`}>
              {insights.overallStats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
        <Card className="overflow-visible" data-testid="card-stat-roi">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${insights.overallStats.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
              {insights.overallStats.roi > 0 ? "+" : ""}{insights.overallStats.roi.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">ROI</div>
          </CardContent>
        </Card>
        <Card className="overflow-visible" data-testid="card-stat-profit">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${insights.overallStats.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              ${Math.abs(insights.overallStats.totalProfit).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">{insights.overallStats.totalProfit >= 0 ? "Profit" : "Loss"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-visible" data-testid="card-betting-dna">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dna className="w-5 h-5 text-primary" />
              Your Betting DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`p-2 rounded-lg ${riskConfig.bg}`}>
                <RiskIcon className={`w-5 h-5 ${riskConfig.color}`} />
              </div>
              <div>
                <div className="font-semibold">{riskConfig.label} Profile</div>
                <div className="text-sm text-muted-foreground">{insights.bettingDNA.bettingStyle}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-xs">Top Sport</div>
                <div className="font-medium">{insights.bettingDNA.favoriteSport || "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-xs">Top Market</div>
                <div className="font-medium capitalize">{insights.bettingDNA.favoriteMarket || "—"}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-xs">Odds Range</div>
                <div className="font-medium">
                  {insights.bettingDNA.preferredOddsRange
                    ? `${formatOdds(insights.bettingDNA.preferredOddsRange.min)} to ${formatOdds(insights.bettingDNA.preferredOddsRange.max)}`
                    : "—"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-muted-foreground text-xs">Avg Odds</div>
                <div className="font-medium">{insights.overallStats.avgOdds ? formatOdds(insights.overallStats.avgOdds) : "—"}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-green-500 uppercase tracking-wide flex items-center gap-1">
                <Star className="w-3 h-3" /> Strengths
              </div>
              {insights.bettingDNA.strengths.map((s, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">+</span> {s}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-red-500 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Areas to Improve
              </div>
              {insights.bettingDNA.weaknesses.map((w, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">−</span> {w}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible" data-testid="card-performance-trends">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.performanceTrends.map((trend, i) => {
              const TrendIcon = trendIcons[trend.direction];
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30" data-testid={`trend-${trend.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <TrendIcon className={`w-5 h-5 mt-0.5 ${trendColors[trend.direction]}`} />
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {trend.label}
                      <Badge variant="outline" className={`text-xs ${trendColors[trend.direction]}`}>
                        {trend.direction}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{trend.detail}</div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-border space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity Streak</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-primary">{insights.streakInfo.currentStreak}</div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{insights.streakInfo.longestStreak}</div>
                  <div className="text-xs text-muted-foreground">Best Streak</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{insights.streakInfo.totalDaysActive}</div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {insights.recommendations.length > 0 && (
        <Card className="overflow-visible" data-testid="card-recommendations">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recommendations.map((rec) => {
              const config = recTypeConfig[rec.type];
              const RecIcon = config.icon;
              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-lg border-l-4 ${config.color} ${config.bg} space-y-2`}
                  data-testid={`recommendation-${rec.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <RecIcon className="w-5 h-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                          {rec.title}
                          {rec.priority === "high" && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Priority
                            </Badge>
                          )}
                          {rec.sport && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {rec.sport}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                      </div>
                    </div>
                  </div>
                  {rec.relatedPick && (
                    <div className="ml-8 p-2 rounded bg-background/50 text-xs flex items-center gap-3 flex-wrap">
                      <span className="font-bold">{rec.relatedPick.grade}</span>
                      <span>{rec.relatedPick.pick}</span>
                      <span className="text-muted-foreground">{formatOdds(rec.relatedPick.odds)}</span>
                      <span className="text-green-500">+{rec.relatedPick.ev.toFixed(1)}% EV</span>
                      <span className="text-muted-foreground">{rec.relatedPick.confidence}% conf</span>
                    </div>
                  )}
                  {rec.actionLabel && rec.actionRoute && (
                    <div className="ml-8">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => navigate(rec.actionRoute!)}
                        data-testid={`button-rec-action-${rec.id}`}
                      >
                        {rec.actionLabel}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {insights.sportBreakdowns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-visible" data-testid="card-sport-breakdowns">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-primary" />
                Performance by Sport
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.sportBreakdowns.map((s) => (
                <div key={s.sport} className="space-y-1.5" data-testid={`sport-breakdown-${s.sport}`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.sport}</span>
                      {s.isStrength && <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-500">Strong</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{s.wins}W-{s.losses}L</span>
                      <span className={s.roi >= 0 ? "text-green-500" : "text-red-500"}>
                        {s.roi > 0 ? "+" : ""}{s.roi.toFixed(1)}% ROI
                      </span>
                    </div>
                  </div>
                  <Progress value={Math.min(s.winRate, 100)} className="h-2" />
                  <div className="text-[10px] text-muted-foreground">{s.winRate.toFixed(0)}% win rate · {s.bets} bets · Avg odds {formatOdds(s.avgOdds)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-visible" data-testid="card-market-breakdowns">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                Performance by Market
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.marketBreakdowns.map((m) => (
                <div key={m.market} className="space-y-1.5" data-testid={`market-breakdown-${m.market}`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{m.market}</span>
                      {m.isStrength && <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-500">Strong</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{m.wins}/{m.bets}</span>
                      <span className={m.roi >= 0 ? "text-green-500" : "text-red-500"}>
                        {m.roi > 0 ? "+" : ""}{m.roi.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={Math.min(m.winRate, 100)} className="h-2" />
                  <div className="text-[10px] text-muted-foreground">{m.winRate.toFixed(0)}% win rate · {m.bets} bets</div>
                </div>
              ))}
              {insights.marketBreakdowns.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No market data yet. Start tracking bets to see breakdowns.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!insights.hasBettingHistory && (
        <Card className="overflow-visible border-dashed" data-testid="card-empty-state">
          <CardContent className="p-8 text-center space-y-4">
            <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Start Building Your Betting Profile</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Track your bets to unlock personalized insights, performance trends, and tailored recommendations matched to today's games.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/bet-tracker")} data-testid="button-start-tracking">
                <Target className="w-4 h-4 mr-2" />
                Log Your First Bet
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} data-testid="button-explore-picks">
                <ArrowRight className="w-4 h-4 mr-2" />
                Explore Picks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground" data-testid="text-insights-timestamp">
        Analysis generated {new Date(insights.generatedAt).toLocaleTimeString()} · Refreshes every 60s
      </div>
    </div>
  );
}

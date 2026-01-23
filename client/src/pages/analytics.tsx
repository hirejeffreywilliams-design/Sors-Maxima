import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy,
  BarChart3,
  Percent,
  DollarSign,
  Flame,
  Award,
  Activity
} from "lucide-react";

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics"],
  });

  const { data: gradingStats } = useQuery<any>({
    queryKey: ["/api/bets/grading-stats"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  const roi = analytics?.roi || 0;
  const winRate = analytics?.winRate || 0;
  const totalProfit = analytics?.totalProfit || 0;
  const totalBets = analytics?.totalBets || 0;
  const currentStreak = analytics?.currentStreak || 0;
  const longestWinStreak = analytics?.longestWinStreak || 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-analytics-title">
            Personal Analytics
          </h1>
          <p className="text-muted-foreground">Track your betting performance and patterns</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-total-profit">
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" />
                ROI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-roi">
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-win-rate">{winRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" data-testid="text-total-bets">{totalBets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Win/Loss Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Win/Loss Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Wins</span>
                  <span className="text-sm font-medium text-green-500">{analytics?.totalWins || 0}</span>
                </div>
                <Progress value={winRate} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Losses</span>
                  <span className="text-sm font-medium text-red-500">{analytics?.totalLosses || 0}</span>
                </div>
                <Progress value={100 - winRate} className="h-2 bg-red-200" />
              </div>
              {analytics?.totalPushes > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Pushes</span>
                    <span className="text-sm font-medium">{analytics?.totalPushes}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {currentStreak > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : currentStreak < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>Current Streak</span>
                </div>
                <Badge variant={currentStreak > 0 ? "default" : currentStreak < 0 ? "destructive" : "secondary"}>
                  {currentStreak > 0 ? `+${currentStreak} W` : currentStreak < 0 ? `${Math.abs(currentStreak)} L` : "Even"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Best Win Streak</span>
                </div>
                <Badge variant="secondary">{longestWinStreak} wins</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                  <span>Worst Loss Streak</span>
                </div>
                <Badge variant="secondary">{analytics?.longestLossStreak || 0} losses</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best Performers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Best Performing Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics?.bestSport && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span>Best Sport</span>
                  <Badge className="bg-green-600">{analytics.bestSport}</Badge>
                </div>
              )}
              {analytics?.bestBetType && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span>Best Bet Type</span>
                  <Badge className="bg-green-600">{analytics.bestBetType}</Badge>
                </div>
              )}
              {analytics?.bestTimeOfDay && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span>Best Time of Day</span>
                  <Badge className="bg-green-600">{analytics.bestTimeOfDay}</Badge>
                </div>
              )}
              {!analytics?.bestSport && !analytics?.bestBetType && (
                <p className="text-muted-foreground text-center py-4">
                  Place more bets to see your best performing areas
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Grade Accuracy
              </CardTitle>
              <CardDescription>How accurate our grades have been for your bets</CardDescription>
            </CardHeader>
            <CardContent>
              {gradingStats && Object.keys(gradingStats).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(gradingStats).sort((a, b) => a[0].localeCompare(b[0])).map(([grade, stats]: [string, any]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{grade}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({stats.wins}/{stats.total} won)
                        </span>
                      </div>
                      <span className={`font-medium ${stats.accuracy >= 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                        {(stats.accuracy * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No graded bets settled yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Betting Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">${(analytics?.totalStaked || 0).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Staked</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{(analytics?.avgOdds || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Avg Odds</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{analytics?.totalWins || 0}</p>
                <p className="text-sm text-muted-foreground">Total Wins</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{analytics?.totalLosses || 0}</p>
                <p className="text-sm text-muted-foreground">Total Losses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

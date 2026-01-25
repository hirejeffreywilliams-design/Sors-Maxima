import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy,
  Percent,
  DollarSign,
  Flame,
  Activity
} from "lucide-react";

export function PerformanceAnalytics() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics"],
  });

  const { data: gradingStats } = useQuery<any>({
    queryKey: ["/api/bets/grading-stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className={`text-lg sm:text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
              <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">ROI</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className={`text-lg sm:text-2xl font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Win Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-lg sm:text-2xl font-bold">{winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Bets</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <p className="text-lg sm:text-2xl font-bold">{totalBets}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Win/Loss
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">Wins</span>
                <span className="font-medium text-green-500">{analytics?.totalWins || 0}</span>
              </div>
              <Progress value={winRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">Losses</span>
                <span className="font-medium text-red-500">{analytics?.totalLosses || 0}</span>
              </div>
              <Progress value={100 - winRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Current</span>
              <Badge variant={currentStreak >= 0 ? "default" : "destructive"}>
                {currentStreak >= 0 ? (
                  <><TrendingUp className="h-3 w-3 mr-1" />{currentStreak}W</>
                ) : (
                  <><TrendingDown className="h-3 w-3 mr-1" />{Math.abs(currentStreak)}L</>
                )}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Best Streak</span>
              <Badge className="bg-green-500">
                <Trophy className="h-3 w-3 mr-1" />
                {longestWinStreak}W
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {gradingStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Grade Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">A-Grade Accuracy</p>
                <p className="text-lg font-bold text-green-500">
                  {gradingStats?.aGradeAccuracy?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">B-Grade Accuracy</p>
                <p className="text-lg font-bold text-blue-500">
                  {gradingStats?.bGradeAccuracy?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">C-Grade Accuracy</p>
                <p className="text-lg font-bold text-yellow-500">
                  {gradingStats?.cGradeAccuracy?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

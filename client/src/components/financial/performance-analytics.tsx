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

interface BetStats {
  totalBets: number;
  resolvedBets: number;
  pendingBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;
  avgOdds: number;
  bySport: any[];
  byMarket: any[];
  byMonth: any[];
}

export function PerformanceAnalytics() {
  const { data: stats, isLoading } = useQuery<BetStats>({
    queryKey: ["/api/user/bet-stats"],
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

  const hasData = (stats?.resolvedBets ?? 0) > 0;
  const roi = stats?.roi ?? 0;
  const winRate = stats?.winRate ?? 0;
  const totalProfit = stats?.totalProfit ?? 0;
  const totalBets = stats?.totalBets ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;

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
            {hasData ? (
              <p className={`text-lg sm:text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)}
              </p>
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground">—</p>
            )}
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
            {hasData ? (
              <p className={`text-lg sm:text-2xl font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
              </p>
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground">—</p>
            )}
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
            {hasData ? (
              <p className="text-lg sm:text-2xl font-bold">{winRate.toFixed(1)}%</p>
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground">—</p>
            )}
            {!hasData && (
              <p className="text-xs text-muted-foreground mt-1">No settled bets yet</p>
            )}
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
            {totalBets > 0 && (stats?.pendingBets ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{stats?.pendingBets} pending</p>
            )}
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
            {hasData ? (
              <>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">Wins</span>
                    <span className="font-medium text-green-500">{wins}</span>
                  </div>
                  <Progress value={winRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">Losses</span>
                    <span className="font-medium text-red-500">{losses}</span>
                  </div>
                  <Progress value={100 - winRate} className="h-2" />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Settle bets to see your win/loss breakdown
              </p>
            )}
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
            {hasData ? (
              <>
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Record</span>
                  <Badge variant="outline" className="font-mono">
                    {wins}W – {losses}L
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Hit Rate</span>
                  <Badge className={winRate >= 55 ? "bg-green-500" : winRate >= 50 ? "bg-yellow-500" : "bg-red-500"}>
                    <Trophy className="h-3 w-3 mr-1" />
                    {winRate.toFixed(1)}%
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No settled bets yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {gradingStats && Object.keys(gradingStats).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Grade Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">A-Grade</p>
                <p className="text-lg font-bold text-green-500">
                  {gradingStats?.aGradeAccuracy != null ? `${gradingStats.aGradeAccuracy.toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">B-Grade</p>
                <p className="text-lg font-bold text-blue-500">
                  {gradingStats?.bGradeAccuracy != null ? `${gradingStats.bGradeAccuracy.toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">C-Grade</p>
                <p className="text-lg font-bold text-yellow-500">
                  {gradingStats?.cGradeAccuracy != null ? `${gradingStats.cGradeAccuracy.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

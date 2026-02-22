import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, TrendingUp, Flame, Target, Users, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RecentPick {
  pick: string;
  odds: string;
  result: "win" | "loss" | "pending";
}

interface Tipster {
  id: string;
  username: string;
  winRate: number;
  roi: number;
  streak: number;
  totalPicks: number;
  sport: string;
  recentPicks: RecentPick[];
  copying: boolean;
}

export function CopyBetting() {
  const { data: tipsters = [], isLoading } = useQuery<Tipster[]>({
    queryKey: ["/api/social/copy-bettors"],
  });

  const copyMutation = useMutation({
    mutationFn: (tipsterId: string) => apiRequest("POST", `/api/social/copy-bettors/${tipsterId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/copy-bettors"] });
    },
  });

  const copiedTipsters = tipsters.filter((t) => t.copying);
  const totalCopiedBets = copiedTipsters.reduce((sum, t) => sum + t.totalPicks, 0);
  const combinedWinRate =
    copiedTipsters.length > 0
      ? Math.round(copiedTipsters.reduce((sum, t) => sum + t.winRate, 0) / copiedTipsters.length)
      : 0;

  const getResultColor = (result: string) => {
    if (result === "win") return "bg-green-500/10 text-green-500 border-green-500/30";
    if (result === "loss") return "bg-red-500/10 text-red-500 border-red-500/30";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  };

  const recentCopiedPicks = copiedTipsters.flatMap((t) =>
    t.recentPicks.map((p) => ({ ...p, tipster: t.username }))
  ).slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Copy className="w-5 h-5 text-blue-500" />
          Copy Betting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Copied</p>
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-tipsters-copied">{copiedTipsters.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bets</p>
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-total-copied-bets">{totalCopiedBets}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500" data-testid="text-combined-win-rate">{combinedWinRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {recentCopiedPicks.length > 0 && (
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-2">
              <p className="text-sm font-medium">Recent Copied Picks</p>
              {recentCopiedPicks.map((pick, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 text-sm"
                  data-testid={`recent-copied-pick-${idx}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground text-xs shrink-0">{pick.tipster}</span>
                    <span className="truncate">{pick.pick}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-xs">{pick.odds}</Badge>
                    <Badge variant="outline" className={`text-xs ${getResultColor(pick.result)}`}>
                      {pick.result}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tipsters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Copy className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tipsters available to copy yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tipsters.map((tipster) => (
              <Card key={tipster.id} data-testid={`tipster-card-${tipster.id}`}>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                      <AvatarFallback className="bg-muted text-sm">
                        {tipster.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm truncate" data-testid={`tipster-username-${tipster.id}`}>
                          {tipster.username}
                        </span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-sport-${tipster.id}`}>
                          {tipster.sport}
                        </Badge>
                        {tipster.streak >= 3 && (
                          <Badge variant="outline" className="gap-0.5 bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs" data-testid={`badge-streak-${tipster.id}`}>
                            <Flame className="w-3 h-3" />
                            {tipster.streak}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1" data-testid={`text-winrate-${tipster.id}`}>
                          <Target className="w-3 h-3 shrink-0" />
                          {tipster.winRate}%
                        </span>
                        <span className="flex items-center gap-1" data-testid={`text-roi-${tipster.id}`}>
                          <TrendingUp className="w-3 h-3 shrink-0" />
                          +{tipster.roi}%
                        </span>
                        <span data-testid={`text-total-picks-${tipster.id}`}>{tipster.totalPicks} picks</span>
                      </div>
                    </div>
                    <Button
                      variant={tipster.copying ? "default" : "outline"}
                      size="sm"
                      onClick={() => copyMutation.mutate(tipster.id)}
                      disabled={copyMutation.isPending}
                      className={`shrink-0 toggle-elevate ${tipster.copying ? "toggle-elevated" : ""}`}
                      data-testid={`button-copy-tipster-${tipster.id}`}
                    >
                      {tipster.copying ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span className="hidden sm:inline">Copying</span>
                          <span className="sm:hidden">On</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  {tipster.copying && tipster.recentPicks.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">Recent Picks</p>
                      {tipster.recentPicks.map((pick, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 text-sm"
                          data-testid={`copied-pick-${tipster.id}-${idx}`}
                        >
                          <span className="truncate">{pick.pick}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-xs">{pick.odds}</Badge>
                            <Badge variant="outline" className={`text-xs ${getResultColor(pick.result)}`}>
                              {pick.result}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">Data source: Live copy betting data</p>
        </div>
      </CardContent>
    </Card>
  );
}

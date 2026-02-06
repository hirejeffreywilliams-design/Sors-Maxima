import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, TrendingUp, Flame, Target, Users } from "lucide-react";

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

const initialTipsters: Tipster[] = [
  {
    id: "t1",
    username: "SharpShooter99",
    winRate: 62,
    roi: 34.5,
    streak: 8,
    totalPicks: 245,
    sport: "NFL",
    recentPicks: [
      { pick: "Chiefs -3.5", odds: "-110", result: "win" },
      { pick: "Over 48.5 BUF/MIA", odds: "-105", result: "win" },
      { pick: "Ravens ML", odds: "-150", result: "loss" },
    ],
    copying: false,
  },
  {
    id: "t2",
    username: "ParlayKing",
    winRate: 58,
    roi: 28.2,
    streak: 5,
    totalPicks: 312,
    sport: "NBA",
    recentPicks: [
      { pick: "Celtics -5.5", odds: "-110", result: "win" },
      { pick: "Warriors ML", odds: "+120", result: "pending" },
      { pick: "Under 220.5 PHX/DAL", odds: "-110", result: "win" },
    ],
    copying: true,
  },
  {
    id: "t3",
    username: "EdgeMaster",
    winRate: 56,
    roi: 25.8,
    streak: 3,
    totalPicks: 189,
    sport: "MLB",
    recentPicks: [
      { pick: "Yankees -1.5", odds: "+130", result: "win" },
      { pick: "Over 8.5 LAD/SF", odds: "-115", result: "loss" },
      { pick: "Astros ML", odds: "-140", result: "win" },
    ],
    copying: false,
  },
  {
    id: "t4",
    username: "BetWizard",
    winRate: 55,
    roi: 22.1,
    streak: 2,
    totalPicks: 156,
    sport: "NHL",
    recentPicks: [
      { pick: "Bruins ML", odds: "-130", result: "pending" },
      { pick: "Over 5.5 TOR/MTL", odds: "+100", result: "win" },
      { pick: "Rangers -1.5", odds: "+155", result: "loss" },
    ],
    copying: false,
  },
  {
    id: "t5",
    username: "MoneyMoves",
    winRate: 54,
    roi: 19.4,
    streak: 4,
    totalPicks: 423,
    sport: "NFL",
    recentPicks: [
      { pick: "Eagles +3", odds: "-110", result: "win" },
      { pick: "Under 44.5 SF/SEA", odds: "-105", result: "win" },
      { pick: "Dolphins ML", odds: "+140", result: "pending" },
    ],
    copying: true,
  },
];

export function CopyBetting() {
  const [tipsters, setTipsters] = useState<Tipster[]>(initialTipsters);

  const toggleCopy = (tipsterId: string) => {
    setTipsters((prev) =>
      prev.map((t) => (t.id === tipsterId ? { ...t, copying: !t.copying } : t))
    );
  };

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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Tipsters Copied</p>
                <p className="text-2xl font-bold" data-testid="text-tipsters-copied">{copiedTipsters.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Copied Bets</p>
                <p className="text-2xl font-bold" data-testid="text-total-copied-bets">{totalCopiedBets}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Combined Win Rate</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-combined-win-rate">{combinedWinRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {recentCopiedPicks.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium">Recent Copied Picks</p>
              {recentCopiedPicks.map((pick, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                  data-testid={`recent-copied-pick-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{pick.tipster}</span>
                    <span>{pick.pick}</span>
                  </div>
                  <div className="flex items-center gap-2">
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

        <div className="space-y-3">
          {tipsters.map((tipster) => (
            <Card key={tipster.id} data-testid={`tipster-card-${tipster.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-sm">
                      {tipster.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`tipster-username-${tipster.id}`}>
                        {tipster.username}
                      </span>
                      <Badge variant="outline" className="text-xs" data-testid={`badge-sport-${tipster.id}`}>
                        {tipster.sport}
                      </Badge>
                      {tipster.streak >= 3 && (
                        <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs" data-testid={`badge-streak-${tipster.id}`}>
                          <Flame className="w-3 h-3" />
                          {tipster.streak}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1" data-testid={`text-winrate-${tipster.id}`}>
                        <Target className="w-3 h-3" />
                        {tipster.winRate}% win rate
                      </span>
                      <span className="flex items-center gap-1" data-testid={`text-roi-${tipster.id}`}>
                        <TrendingUp className="w-3 h-3" />
                        +{tipster.roi}% ROI
                      </span>
                      <span data-testid={`text-total-picks-${tipster.id}`}>{tipster.totalPicks} picks</span>
                    </div>
                  </div>
                  <Button
                    variant={tipster.copying ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCopy(tipster.id)}
                    className={`toggle-elevate ${tipster.copying ? "toggle-elevated" : ""}`}
                    data-testid={`button-copy-tipster-${tipster.id}`}
                  >
                    {tipster.copying ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copying
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
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
                        className="flex items-center justify-between text-sm"
                        data-testid={`copied-pick-${tipster.id}-${idx}`}
                      >
                        <span>{pick.pick}</span>
                        <div className="flex items-center gap-2">
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
      </CardContent>
    </Card>
  );
}

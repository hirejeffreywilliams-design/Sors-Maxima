import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  History,
  Star,
  Clock,
  ChevronRight,
  Target,
  Flame,
  Trophy
} from "lucide-react";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: "strategy" | "timing" | "bankroll" | "analysis";
}

interface HighGradedBet {
  id: string;
  matchup: string;
  pick: string;
  odds: number;
  grade: string;
  confidence: number;
  sport: string;
  gameTime: string;
  reasoning: string;
}

interface BetHistoryItem {
  id: string;
  matchup: string;
  pick: string;
  odds: number;
  result: "won" | "lost" | "pending";
  stake: number;
  payout: number;
  date: string;
}

const dailyTips: Tip[] = [
  {
    id: "1",
    title: "Fade the Public",
    content: "When more than 75% of bets are on one side, consider taking the other side. Sharp bettors often go against public consensus.",
    category: "strategy"
  },
  {
    id: "2",
    title: "Best Betting Windows",
    content: "Look for value early in the week for NFL games to get the best lines. Wait until closer to game time for injury news on NBA games.",
    category: "timing"
  },
  {
    id: "3",
    title: "Unit Sizing",
    content: "Never bet more than 1-3% of your bankroll on a single bet. Even A-graded picks should be limited to 3 units max.",
    category: "bankroll"
  },
  {
    id: "4",
    title: "Track Closing Line Value",
    content: "If your bets consistently beat the closing line, you're making +EV decisions even if short-term results vary.",
    category: "analysis"
  },
  {
    id: "5",
    title: "Correlation Matters",
    content: "In same-game parlays, look for positively correlated legs. A team that's winning is more likely to cover AND hit the over.",
    category: "strategy"
  },
  {
    id: "6",
    title: "Line Shopping Saves Money",
    content: "Having accounts at multiple sportsbooks lets you find the best odds. Even half a point can make a big difference long-term.",
    category: "bankroll"
  }
];

const generateHighGradedBets = (): HighGradedBet[] => {
  const bets: HighGradedBet[] = [
    {
      id: "hg1",
      matchup: "Chiefs vs Bills",
      pick: "Chiefs +3.5",
      odds: -110,
      grade: "A",
      confidence: 87,
      sport: "NFL",
      gameTime: "Sunday 1:00 PM",
      reasoning: "Chiefs 8-2 ATS last 10 games, Bills on short week after Monday night"
    },
    {
      id: "hg2",
      matchup: "Eagles vs Cowboys",
      pick: "Over 47.5",
      odds: -105,
      grade: "A-",
      confidence: 82,
      sport: "NFL",
      gameTime: "Sunday 4:25 PM",
      reasoning: "Both teams averaging 28+ PPG, favorable weather conditions"
    },
    {
      id: "hg3",
      matchup: "Yankees vs Red Sox",
      pick: "Yankees ML",
      odds: -145,
      grade: "A",
      confidence: 85,
      sport: "MLB",
      gameTime: "Tomorrow 7:05 PM",
      reasoning: "Ace pitcher starting, 12-3 record vs division this season"
    },
    {
      id: "hg4",
      matchup: "Pacers vs Suns",
      pick: "Pacers -2.5",
      odds: -108,
      grade: "B+",
      confidence: 76,
      sport: "NBA",
      gameTime: "Tomorrow 9:00 PM",
      reasoning: "Haliburton averaging 25+ at home, Suns missing key rotation player"
    },
    {
      id: "hg5",
      matchup: "Ravens vs Bengals",
      pick: "Ravens -3",
      odds: -115,
      grade: "A-",
      confidence: 81,
      sport: "NFL",
      gameTime: "Next Monday 8:15 PM",
      reasoning: "Ravens dominant at home, Lamar Jackson 6-1 vs Bengals career"
    }
  ];
  return bets;
};

const generateBetHistory = (): BetHistoryItem[] => {
  return [
    {
      id: "bh1",
      matchup: "Bucks vs Heat",
      pick: "Bucks -5.5",
      odds: -110,
      result: "won",
      stake: 50,
      payout: 95.45,
      date: "Yesterday"
    },
    {
      id: "bh2",
      matchup: "49ers vs Seahawks",
      pick: "49ers ML",
      odds: -165,
      result: "won",
      stake: 75,
      payout: 120.45,
      date: "2 days ago"
    },
    {
      id: "bh3",
      matchup: "Dodgers vs Padres",
      pick: "Over 8.5",
      odds: -105,
      result: "lost",
      stake: 40,
      payout: 0,
      date: "3 days ago"
    },
    {
      id: "bh4",
      matchup: "Nuggets vs Clippers",
      pick: "Jokic O25.5 pts",
      odds: -120,
      result: "won",
      stake: 60,
      payout: 110,
      date: "4 days ago"
    },
    {
      id: "bh5",
      matchup: "Cowboys vs Eagles",
      pick: "Eagles -3.5",
      odds: -110,
      result: "pending",
      stake: 55,
      payout: 0,
      date: "Today"
    }
  ];
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "strategy": return "bg-blue-500/10 text-blue-500";
    case "timing": return "bg-purple-500/10 text-purple-500";
    case "bankroll": return "bg-green-500/10 text-green-500";
    case "analysis": return "bg-orange-500/10 text-orange-500";
    default: return "bg-muted";
  }
};

const getGradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-yellow-500";
  return "text-red-500";
};

const getResultColor = (result: string) => {
  switch (result) {
    case "won": return "bg-green-500/10 text-green-500";
    case "lost": return "bg-red-500/10 text-red-500";
    default: return "bg-yellow-500/10 text-yellow-500";
  }
};

export function BettingInsights() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [highGradedBets] = useState<HighGradedBet[]>(generateHighGradedBets);
  const [betHistory] = useState<BetHistoryItem[]>(generateBetHistory);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % dailyTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const currentTip = dailyTips[currentTipIndex];
  
  const formatOdds = (odds: number) => odds > 0 ? `+${odds}` : `${odds}`;
  
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden" data-testid="card-daily-tip">
        <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Pro Tip of the Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{currentTip.title}</h3>
                  <Badge variant="secondary" className={getCategoryColor(currentTip.category)}>
                    {currentTip.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentTip.content}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                {dailyTips.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTipIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentTipIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    data-testid={`button-tip-dot-${i}`}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentTipIndex((currentTipIndex + 1) % dailyTips.length)}
                data-testid="button-next-tip"
              >
                Next Tip
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming-bets">
            <Star className="w-4 h-4" />
            High-Graded Picks
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-bet-history">
            <History className="w-4 h-4" />
            Recent History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {highGradedBets.slice(0, 4).map((bet) => (
            <Card key={bet.id} className="overflow-hidden hover-elevate" data-testid={`card-high-graded-${bet.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{bet.sport}</Badge>
                      <span className={`text-xl font-bold ${getGradeColor(bet.grade)}`}>
                        {bet.grade}
                      </span>
                      <span className="text-sm text-muted-foreground">{bet.confidence}% confidence</span>
                    </div>
                    <h4 className="font-medium">{bet.matchup}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-3 h-3 text-primary" />
                      <span className="font-semibold">{bet.pick}</span>
                      <span className="text-muted-foreground">({formatOdds(bet.odds)})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {bet.gameTime}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {bet.reasoning}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {bet.grade === "A" && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Flame className="w-4 h-4" />
                        <span className="text-xs font-medium">Hot Pick</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-all-picks">
              View All Picks
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4 space-y-3">
          {betHistory.map((bet) => (
            <Card key={bet.id} className="overflow-hidden" data-testid={`card-history-${bet.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={getResultColor(bet.result)}>
                        {bet.result === "won" && <Trophy className="w-3 h-3 mr-1" />}
                        {bet.result.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{bet.date}</span>
                    </div>
                    <h4 className="font-medium text-sm">{bet.matchup}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{bet.pick}</span>
                      <span className="text-muted-foreground">({formatOdds(bet.odds)})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stake: ${bet.stake}</p>
                    {bet.result === "won" && (
                      <p className="text-sm font-semibold text-green-500">+${(bet.payout - bet.stake).toFixed(2)}</p>
                    )}
                    {bet.result === "lost" && (
                      <p className="text-sm font-semibold text-red-500">-${bet.stake}</p>
                    )}
                    {bet.result === "pending" && (
                      <p className="text-sm font-semibold text-yellow-500">Pending</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-all-history">
              View Full History
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

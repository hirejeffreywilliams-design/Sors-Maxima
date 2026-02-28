import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CloudRain,
  ArrowRight,
  ShieldCheck,
  CircleDollarSign,
  Gauge,
  Flame,
  Target,
  Activity,
  Zap,
  Timer,
  Users,
  Wind,
  BarChart2,
  User,
  Star,
} from "lucide-react";
import { useParlaySlip } from "@/hooks/use-parlay-slip";

interface Factor {
  label: string;
  value: number;
  impact: "positive" | "negative" | "neutral";
}

interface CashoutBet {
  id: string;
  description: string;
  type: string;
  stake: number;
  potentialPayout: number;
  currentCashout: number;
  legsCompleted: number;
  legsTotal: number;
  timeRemaining: string;
  momentum: number;
  injuryRisk: number;
  weatherImpact: number;
  recommendation: "hold" | "cash_out" | "partial";
  confidence: number;
  winProbability?: number;
  completionPct?: number;
  sport?: string;
  isUserPick?: boolean;
  userPickOutcome?: string | null;
  factors: Record<string, Factor>;
}

const recommendationConfig = {
  hold: { label: "Hold", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", barColor: "bg-green-500" },
  cash_out: { label: "Cash Out Now", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", barColor: "bg-red-500" },
  partial: { label: "Partial Cash Out", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", barColor: "bg-yellow-500" },
};

const factorIcons: Record<string, typeof DollarSign> = {
  momentum: TrendingUp,
  timeCertainty: Clock,
  injuryRisk: AlertTriangle,
  weather: CloudRain,
  weatherChanges: CloudRain,
  timeRemaining: Clock,
  // NBA
  shootingHeat: Flame,
  foulTrouble: AlertTriangle,
  paceStress: Activity,
  timeoutAdvantage: Timer,
  threePointMomentum: Target,
  // NFL / NCAAF
  fieldPosition: BarChart2,
  redZoneEfficiency: Target,
  turnoverRisk: AlertTriangle,
  timeOfPossession: Clock,
  thirdDownConversion: TrendingUp,
  // MLB
  pitchCountStress: Activity,
  bullpenFatigue: Users,
  baserunnerPressure: Zap,
  leverageIndex: BarChart2,
  pitcherMatchup: User,
  // NHL
  shotRatio: Target,
  goalieSaveRate: ShieldCheck,
  powerPlayDiff: Zap,
  faceoffAdvantage: Activity,
  emptyNetRisk: AlertTriangle,
  // NCAAB
  foulTroubleSeverity: AlertTriangle,
  shotClockPressure: Timer,
  perimeterShooting: Target,
  freeThrowAbility: Star,
  benchDepth: Users,
};

const impactColors = {
  positive: "text-green-500",
  negative: "text-red-500",
  neutral: "text-muted-foreground",
};

function RecommendationGauge({ recommendation, confidence }: { recommendation: string; confidence: number }) {
  const config = recommendationConfig[recommendation as keyof typeof recommendationConfig] || recommendationConfig.hold;
  return (
    <div className="flex flex-col items-center gap-2" data-testid="gauge-recommendation">
      <div className="relative w-full max-w-[200px]">
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <div className="text-center">
        <Badge variant="outline" className={`${config.bg} ${config.border} ${config.color}`} data-testid="badge-gauge-label">
          {config.label}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">{confidence}% confidence</p>
      </div>
    </div>
  );
}

function CashoutCard({ bet }: { bet: CashoutBet }) {
  const config = recommendationConfig[bet.recommendation] || recommendationConfig.hold;
  const cashoutPercentage = Math.round((bet.currentCashout / bet.potentialPayout) * 100);

  return (
    <Card
      className={`border transition-all ${bet.isUserPick ? "border-primary/40 shadow-sm shadow-primary/10" : ""}`}
      data-testid={`cashout-card-${bet.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {bet.isUserPick && (
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0 shrink-0" data-testid={`badge-userpick-${bet.id}`}>
                  Your Pick
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] shrink-0" data-testid={`badge-type-${bet.id}`}>
                {bet.sport || bet.type}
              </Badge>
              <Badge variant="outline" className="text-[10px] shrink-0" data-testid={`badge-bettype-${bet.id}`}>
                {bet.type}
              </Badge>
            </div>
            <CardTitle className="text-sm leading-snug" data-testid={`text-bet-description-${bet.id}`}>
              {bet.description}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{bet.timeRemaining}</span>
              {bet.completionPct !== undefined && (
                <span className="text-xs text-muted-foreground">{bet.completionPct}% complete</span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${config.bg} ${config.border} ${config.color} shrink-0 font-medium`}
            data-testid={`badge-recommendation-${bet.id}`}
          >
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Stake</p>
            <p className="font-semibold text-sm" data-testid={`text-stake-${bet.id}`}>${bet.stake}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Cashout</p>
            <p className={`font-semibold text-sm ${config.color}`} data-testid={`text-cashout-${bet.id}`}>
              ${bet.currentCashout}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Payout</p>
            <p className="font-semibold text-sm" data-testid={`text-payout-${bet.id}`}>${bet.potentialPayout}</p>
          </div>
          {bet.winProbability !== undefined && (
            <div>
              <p className="text-[10px] text-muted-foreground">Win Prob</p>
              <p
                className={`font-semibold text-sm ${bet.winProbability >= 60 ? "text-green-500" : bet.winProbability < 40 ? "text-red-500" : "text-yellow-500"}`}
                data-testid={`text-winprob-${bet.id}`}
              >
                {bet.winProbability}%
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Cashout Value</span>
            <span className="font-medium">{cashoutPercentage}% of max payout</span>
          </div>
          <Progress value={cashoutPercentage} className="h-2" />
        </div>

        <Separator />

        <RecommendationGauge recommendation={bet.recommendation} confidence={bet.confidence} />

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {Object.keys(bet.factors).length} Factors Analyzed
          </p>
          {Object.entries(bet.factors).map(([key, factor]) => {
            const Icon = factorIcons[key] || Gauge;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center justify-between cursor-default"
                    data-testid={`factor-${key}-${bet.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${impactColors[factor.impact]}`} />
                      <span className="text-xs truncate max-w-[140px]">{factor.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16">
                        <Progress value={factor.value} className="h-1.5" />
                      </div>
                      <span className={`text-[11px] font-medium w-7 text-right ${impactColors[factor.impact]}`}>
                        {factor.value}%
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  <span className={impactColors[factor.impact]}>
                    {factor.impact === "positive" ? "Favorable" : factor.impact === "negative" ? "Unfavorable" : "Neutral"}
                  </span>
                  {" — "}{factor.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          {bet.recommendation === "cash_out" && (
            <Button className="flex-1 gap-1.5" variant="destructive" size="sm" data-testid={`button-cashout-${bet.id}`}>
              <CircleDollarSign className="w-4 h-4" />
              Cash Out ${bet.currentCashout}
            </Button>
          )}
          {bet.recommendation === "partial" && (
            <>
              <Button className="flex-1 gap-1.5" variant="outline" size="sm" data-testid={`button-partial-cashout-${bet.id}`}>
                <DollarSign className="w-4 h-4" />
                Partial ${Math.round(bet.currentCashout * 0.5)}
              </Button>
              <Button className="flex-1 gap-1.5" variant="ghost" size="sm" data-testid={`button-hold-${bet.id}`}>
                <ShieldCheck className="w-4 h-4" />
                Hold
              </Button>
            </>
          )}
          {bet.recommendation === "hold" && (
            <Button className="flex-1 gap-1.5" variant="outline" size="sm" data-testid={`button-hold-${bet.id}`}>
              <ShieldCheck className="w-4 h-4" />
              Hold — Let it Ride
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CashoutAdvisor() {
  const { legs } = useParlaySlip();

  // Pass slip legs to backend for personalised analysis
  const legsParam = legs.length > 0
    ? encodeURIComponent(JSON.stringify(legs.map(l => ({
        id: l.id,
        team: l.team,
        opponent: l.opponent,
        market: l.market,
        outcome: l.outcome,
        decimalOdds: l.decimalOdds,
        americanOdds: l.americanOdds,
        sport: l.sport,
        stake: 100,
      }))))
    : null;

  const endpoint = legsParam
    ? `/api/cashout-advisor/all?legs=${legsParam}`
    : "/api/cashout-advisor/all";

  const { data: bets = [], isLoading } = useQuery<CashoutBet[]>({
    queryKey: ["/api/cashout-advisor", "all", legs.length],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cashout data");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const userPickCount = bets.filter(b => b.isUserPick).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No Live Games Right Now</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Cashout analysis runs on in-progress games. Add picks to your slip — they'll automatically be tracked when those games go live.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="cashout-advisor-container">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Gauge className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Live Cashout Advisor</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {bets.length} live game{bets.length !== 1 ? "s" : ""}
              {userPickCount > 0 && (
                <span className="text-primary font-medium ml-1">· {userPickCount} your pick{userPickCount !== 1 ? "s" : ""}</span>
              )}
            </span>
          </div>

          {legs.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Add picks to your slip for personalised cashout advice on your actual bets.
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">Consider Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Cash Out</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {bets.map((bet) => (
        <CashoutCard key={bet.id} bet={bet} />
      ))}
    </div>
  );
}

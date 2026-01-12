import { TrendingUp, Percent, DollarSign, BarChart3, Cpu, Loader2, Target, Flame, ThumbsUp, ThumbsDown, Minus, AlertCircle, Award, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EvaluationResult, BetGrading, EVIndicator, RiskAdvisory, BettingEnvironment } from "@shared/schema";
import { calculateBetGrade, calculateEVIndicator, generateRiskAdvisory } from "@shared/schema";

interface ProbabilityResultsProps {
  result: EvaluationResult | null;
  stake: number;
  isLoading?: boolean;
  bankroll?: number;
  bettingEnv?: BettingEnvironment;
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-500";
  if (grade.startsWith("B")) return "text-blue-500";
  if (grade.startsWith("C")) return "text-amber-500";
  if (grade.startsWith("D")) return "text-orange-500";
  return "text-red-500";
}

function getGradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/10 border-emerald-500/30";
  if (grade.startsWith("B")) return "bg-blue-500/10 border-blue-500/30";
  if (grade.startsWith("C")) return "bg-amber-500/10 border-amber-500/30";
  if (grade.startsWith("D")) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function getEVBadgeIcon(badge: EVIndicator["badge"]) {
  switch (badge) {
    case "fire": return <Flame className="w-3 h-3" />;
    case "thumbs_up": return <ThumbsUp className="w-3 h-3" />;
    case "neutral": return <Minus className="w-3 h-3" />;
    case "thumbs_down": return <ThumbsDown className="w-3 h-3" />;
    case "warning": return <AlertCircle className="w-3 h-3" />;
  }
}

function getEVBadgeVariant(status: EVIndicator["status"]): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "strong_positive": return "default";
    case "positive": return "default";
    case "neutral": return "secondary";
    case "negative": return "destructive";
    case "strong_negative": return "destructive";
  }
}

function getRiskColor(level: RiskAdvisory["level"]): string {
  switch (level) {
    case "safe": return "text-emerald-500";
    case "moderate": return "text-blue-500";
    case "elevated": return "text-amber-500";
    case "high": return "text-orange-500";
    case "extreme": return "text-red-500";
  }
}

const defaultBettingEnv: BettingEnvironment = {
  maxStakePercent: 0.05,
  kellyMultiplier: 0.25,
  minEdgeRequired: 0.02,
  maxCorrelationAllowed: 0.8,
  includeJuiceAdjustment: true,
  juicePercent: 0.045,
  enableRiskWarnings: true,
  enableAutoAdjust: false,
  profileType: "balanced"
};

export function ProbabilityResults({ result, stake, isLoading, bankroll = 1000, bettingEnv = defaultBettingEnv }: ProbabilityResultsProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Running Monte Carlo Simulation</p>
              <p className="text-sm text-muted-foreground">Calculating win probability...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Add legs to your parlay to see analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const winPercent = result.winProbability * 100;
  const evPercent = result.expectedValue * 100;
  const isPositiveEV = result.expectedValue > 0;
  
  const impliedProb = 1 / result.combinedOdds;
  
  const calculateCorrelationPenalty = (matrix: number[][] | undefined): number => {
    if (!matrix || matrix.length === 0) return 0;
    let maxCorr = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (i !== j) {
          maxCorr = Math.max(maxCorr, Math.abs(matrix[i][j]));
        }
      }
    }
    return maxCorr;
  };
  const correlationPenalty = calculateCorrelationPenalty(result.correlationMatrix);
  
  const riskToleranceFromProfile = bettingEnv.profileType === "aggressive" ? "high" 
    : bettingEnv.profileType === "conservative" ? "low" 
    : "medium";
  
  const betGrade = calculateBetGrade(
    result.winProbability,
    result.expectedValue,
    (result.kellyStake / bankroll) * bettingEnv.kellyMultiplier,
    correlationPenalty
  );
  const evIndicator = calculateEVIndicator(impliedProb, result.winProbability, riskToleranceFromProfile);
  const stakePercent = stake / bankroll;
  const maxStakeWarning = stakePercent > bettingEnv.maxStakePercent;
  const riskAdvisory = generateRiskAdvisory(
    result.winProbability,
    result.expectedValue,
    stakePercent,
    correlationPenalty
  );

  return (
    <Card className="overflow-hidden" data-testid="card-probability-results">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Analysis Results
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={getEVBadgeVariant(evIndicator.status)} 
                  className="gap-1 cursor-help"
                  data-testid="badge-ev-indicator"
                >
                  {getEVBadgeIcon(evIndicator.badge)}
                  {evIndicator.evPercent > 0 ? "+" : ""}{evIndicator.evPercent.toFixed(1)}% EV
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <div>Edge: {(evIndicator.edge * 100).toFixed(2)}%</div>
                  <div>Implied: {(evIndicator.impliedProbability * 100).toFixed(1)}%</div>
                  <div>True: {(evIndicator.trueProbability * 100).toFixed(1)}%</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="font-mono text-xs">
              <Cpu className="w-3 h-3 mr-1" />
              {result.method === "montecarlo" 
                ? `${(result.simulations || 0).toLocaleString()} sims` 
                : "Analytic"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div className="text-center py-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Win Probability
          </p>
          <div className="text-5xl font-mono font-bold mb-1" data-testid="text-win-probability">
            {winPercent.toFixed(2)}%
          </div>
          {result.confidenceInterval && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2 cursor-help">
                  <Target className="w-3 h-3" />
                  <span className="font-mono">
                    95% CI: [{(result.confidenceInterval[0] * 100).toFixed(2)}% - {(result.confidenceInterval[1] * 100).toFixed(2)}%]
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>95% confidence interval from {(result.simulations || 0).toLocaleString()} simulations</p>
                {result.standardError && (
                  <p className="text-xs">Standard error: ±{(result.standardError * 100).toFixed(3)}%</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          <Progress value={winPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="w-4 h-4" />
              Expected Value
            </div>
            <div 
              className={`text-2xl font-mono font-bold ${isPositiveEV ? "text-chart-1" : "text-destructive"}`}
              data-testid="text-expected-value"
            >
              {isPositiveEV ? "+" : ""}{evPercent.toFixed(1)}%
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              Combined Odds
            </div>
            <div className="text-2xl font-mono font-bold" data-testid="text-combined-odds">
              {result.combinedOdds.toFixed(2)}x
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Kelly Stake
            </div>
            <div className="text-2xl font-mono font-bold" data-testid="text-kelly-stake">
              ${(result.kellyStake * bettingEnv.kellyMultiplier).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bettingEnv.kellyMultiplier < 1 
                ? `${(bettingEnv.kellyMultiplier * 100).toFixed(0)}% Kelly (${bettingEnv.profileType})`
                : "Full Kelly"}
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              Potential Return
            </div>
            <div className="text-2xl font-mono font-bold text-chart-1" data-testid="text-potential-return">
              ${result.potentialReturn.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              On ${stake} stake
            </p>
          </div>
        </div>

        {result.legProbabilities.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Individual Leg Probabilities</p>
            <div className="space-y-2">
              {result.legProbabilities.map((prob, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-mono w-8">
                    #{i + 1}
                  </span>
                  <Progress value={prob * 100} className="h-2 flex-1" />
                  <span className="text-sm font-mono w-16 text-right">
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center ${getGradeBg(betGrade.grade)}`}
              data-testid="display-bet-grade"
            >
              <span className={`text-2xl font-bold ${getGradeColor(betGrade.grade)}`}>
                {betGrade.grade}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4" />
                <span className="font-medium">Bet Grade</span>
                <span className="text-lg font-mono font-bold">{betGrade.numericScore.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress value={betGrade.numericScore} className="h-2 mb-2" />
              <Badge 
                variant={betGrade.recommendation.includes("avoid") ? "destructive" : "default"}
                data-testid="badge-bet-recommendation"
              >
                {betGrade.recommendation === "strong_bet" && "Strong Bet"}
                {betGrade.recommendation === "good_bet" && "Good Bet"}
                {betGrade.recommendation === "fair_bet" && "Fair Bet"}
                {betGrade.recommendation === "marginal_bet" && "Marginal"}
                {betGrade.recommendation === "avoid" && "Avoid"}
                {betGrade.recommendation === "strong_avoid" && "Strong Avoid"}
              </Badge>
            </div>
          </div>
          
          {betGrade.reasoning.length > 0 && (
            <div className="space-y-1 mb-4">
              {betGrade.reasoning.slice(0, 3).map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  {reason.includes("+EV") ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : reason.includes("-EV") ? (
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <Award className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}

          {maxStakeWarning && bettingEnv.enableRiskWarnings && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Stake Exceeds Limit</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your stake ({(stakePercent * 100).toFixed(1)}% of bankroll) exceeds your {bettingEnv.profileType} profile limit of {(bettingEnv.maxStakePercent * 100).toFixed(0)}%.
              </p>
            </div>
          )}
          
          {riskAdvisory.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${getRiskColor(riskAdvisory.level)}`} />
                <span className="text-sm font-medium">Risk Advisory</span>
                <Badge variant="outline" className={`ml-auto ${getRiskColor(riskAdvisory.level)}`}>
                  {riskAdvisory.level.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                {riskAdvisory.warnings.slice(0, 2).map((warning, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded text-sm ${
                      warning.severity === "critical" 
                        ? "bg-destructive/10" 
                        : warning.severity === "warning"
                        ? "bg-amber-500/10"
                        : "bg-muted"
                    }`}
                  >
                    <div className="font-medium">{warning.message}</div>
                    {warning.suggestion && (
                      <div className="text-xs text-muted-foreground mt-0.5">{warning.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingDown(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

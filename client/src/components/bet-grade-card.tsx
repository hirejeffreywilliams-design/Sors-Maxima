import { Award, TrendingUp, TrendingDown, Percent, Shield, AlertTriangle, Flame, ThumbsUp, ThumbsDown, Minus, AlertCircle, Atom } from "lucide-react";
import { QuantumBadge } from "./quantum-analysis-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { BetGrading, EVIndicator, RiskAdvisory } from "@shared/schema";

interface BetGradeCardProps {
  grade: BetGrading;
  evIndicator?: EVIndicator;
  riskAdvisory?: RiskAdvisory;
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

export function BetGradeCard({ grade, evIndicator, riskAdvisory }: BetGradeCardProps) {
  return (
    <Card className="overflow-hidden" data-testid="card-bet-grade">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Award className="w-5 h-5" />
            Power Score
            <QuantumBadge />
          </CardTitle>
          {evIndicator && (
            <Badge 
              variant={getEVBadgeVariant(evIndicator.status)} 
              className="gap-1"
              data-testid="badge-ev-indicator"
            >
              {getEVBadgeIcon(evIndicator.badge)}
              {evIndicator.evPercent > 0 ? "+" : ""}{evIndicator.evPercent.toFixed(1)}% EV
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div className="flex items-center gap-6">
          <div 
            className={`w-24 h-24 rounded-xl border-2 flex items-center justify-center ${getGradeBg(grade.grade)}`}
            data-testid="display-grade-badge"
          >
            <span className={`text-4xl font-bold ${getGradeColor(grade.grade)}`}>
              {grade.grade}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-2xl font-mono font-bold">{grade.numericScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Progress value={grade.numericScore} className="h-2 mb-3" />
            <Badge 
              variant={grade.recommendation.includes("avoid") ? "destructive" : "default"}
              data-testid="badge-recommendation"
            >
              {grade.recommendation === "strong_bet" && "Strong Bet"}
              {grade.recommendation === "good_bet" && "Good Bet"}
              {grade.recommendation === "fair_bet" && "Fair Bet"}
              {grade.recommendation === "marginal_bet" && "Marginal Bet"}
              {grade.recommendation === "avoid" && "Avoid"}
              {grade.recommendation === "strong_avoid" && "Strong Avoid"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                  EV Score
                </div>
                <div className="text-lg font-mono font-bold">{grade.evScore.toFixed(1)}</div>
                <Progress value={grade.evScore} className="h-1 mt-1" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Expected value component (35% weight)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Percent className="w-3 h-3" />
                  Probability
                </div>
                <div className="text-lg font-mono font-bold">{grade.probabilityScore.toFixed(1)}</div>
                <Progress value={grade.probabilityScore} className="h-1 mt-1" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Win probability component (25% weight)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Value
                </div>
                <div className="text-lg font-mono font-bold">{grade.valueScore.toFixed(1)}</div>
                <Progress value={grade.valueScore} className="h-1 mt-1" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optimal value component (25% weight)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Shield className="w-3 h-3" />
                  Risk Score
                </div>
                <div className="text-lg font-mono font-bold">{grade.riskScore.toFixed(1)}</div>
                <Progress value={grade.riskScore} className="h-1 mt-1" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Low correlation = higher score (15% weight)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {grade.reasoning.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-sm font-medium">Analysis</p>
            {grade.reasoning.map((reason, i) => (
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

        {riskAdvisory && riskAdvisory.warnings.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${getRiskColor(riskAdvisory.level)}`} />
                <span className="text-sm font-medium">Risk Advisory</span>
              </div>
              <Badge variant="outline" className={getRiskColor(riskAdvisory.level)}>
                {riskAdvisory.level.toUpperCase()} ({riskAdvisory.overallRisk}%)
              </Badge>
            </div>
            <div className="space-y-2">
              {riskAdvisory.warnings.map((warning, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded text-sm ${
                    warning.severity === "critical" 
                      ? "bg-destructive/10 border border-destructive/30" 
                      : warning.severity === "warning"
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-muted/50"
                  }`}
                  data-testid={`warning-${warning.type}`}
                >
                  <div className="font-medium">{warning.message}</div>
                  {warning.suggestion && (
                    <div className="text-xs text-muted-foreground mt-1">{warning.suggestion}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GradingLegend() {
  const grades = [
    { grade: "A+", score: "90-100", label: "Exceptional", color: "emerald" },
    { grade: "A", score: "85-89", label: "Excellent", color: "emerald" },
    { grade: "A-", score: "80-84", label: "Very Good", color: "emerald" },
    { grade: "B+", score: "75-79", label: "Good", color: "blue" },
    { grade: "B", score: "70-74", label: "Solid", color: "blue" },
    { grade: "B-", score: "65-69", label: "Decent", color: "blue" },
    { grade: "C+", score: "60-64", label: "Fair", color: "amber" },
    { grade: "C", score: "55-59", label: "Marginal", color: "amber" },
    { grade: "C-", score: "50-54", label: "Below Avg", color: "amber" },
    { grade: "D+", score: "45-49", label: "Poor", color: "orange" },
    { grade: "D", score: "40-44", label: "Bad", color: "orange" },
    { grade: "D-", score: "35-39", label: "Very Poor", color: "orange" },
    { grade: "F", score: "0-34", label: "Terrible", color: "red" },
  ];

  return (
    <Card data-testid="card-grading-legend">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="w-4 h-4" />
          Grading Scale
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
          {grades.map((g) => (
            <div 
              key={g.grade}
              className={`p-1.5 rounded text-center bg-${g.color}-500/10 border border-${g.color}-500/20`}
            >
              <div className={`font-bold text-${g.color}-500`}>{g.grade}</div>
              <div className="text-muted-foreground text-[10px]">{g.score}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>EV Score: 35% weight</span>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="w-3 h-3" />
            <span>Probability: 25% weight</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            <span>Value (Optimal Sizing): 25% weight</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>Risk: 15% weight</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EVIndicatorBadge({ indicator }: { indicator: EVIndicator }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={getEVBadgeVariant(indicator.status)} 
          className="gap-1 cursor-help"
          data-testid="badge-ev-standalone"
        >
          {getEVBadgeIcon(indicator.badge)}
          {indicator.evPercent > 0 ? "+" : ""}{indicator.evPercent.toFixed(1)}% EV
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium">
            {indicator.status === "strong_positive" && "Strong Positive EV"}
            {indicator.status === "positive" && "Positive Expected Value"}
            {indicator.status === "neutral" && "Neutral Expected Value"}
            {indicator.status === "negative" && "Negative Expected Value"}
            {indicator.status === "strong_negative" && "Strongly Negative EV"}
          </div>
          <div className="text-xs">
            Edge: {(indicator.edge * 100).toFixed(2)}%
          </div>
          <div className="text-xs">
            Implied Prob: {(indicator.impliedProbability * 100).toFixed(1)}%
          </div>
          <div className="text-xs">
            True Prob: {(indicator.trueProbability * 100).toFixed(1)}%
          </div>
          <div className="text-xs capitalize flex items-center gap-1">
            <span>Confidence:</span>
            {typeof indicator.confidence === "number" ? (
              <span className={indicator.confidence > 0.7 ? "text-emerald-500 font-medium" : indicator.confidence > 0.4 ? "text-amber-500 font-medium" : "text-red-500 font-medium"}>
                {indicator.confidence > 0.7 ? "High" : indicator.confidence > 0.4 ? "Medium" : "Low"}
              </span>
            ) : (
              <span className={
                String(indicator.confidence).toLowerCase().includes("high") ? "text-emerald-500 font-medium" :
                String(indicator.confidence).toLowerCase().includes("low") ? "text-red-500 font-medium" :
                "text-amber-500 font-medium"
              }>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  String(indicator.confidence).toLowerCase().includes("high") ? "bg-emerald-500" :
                  String(indicator.confidence).toLowerCase().includes("low") ? "bg-red-500" :
                  "bg-amber-500"
                }`} />
                {indicator.confidence}
              </span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
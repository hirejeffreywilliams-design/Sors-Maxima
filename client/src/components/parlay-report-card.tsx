import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  GraduationCap,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
  Target,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ParlayLeg } from "@shared/schema";

interface ParlayReportCardProps {
  legs: ParlayLeg[];
}

interface LegReport {
  team: string;
  market: string;
  outcome: string;
  americanOdds: number;
  decimalOdds: number;
  impliedProbability: number;
  modelProbability: number;
  evPercent: number;
  grade: string;
  pros: string[];
  cons: string[];
}

interface GradeResponse {
  grade: string;
  score: number;
  breakdown: { factor: string; score: number; weight: number; detail: string }[];
  strengths: string[];
  weaknesses: string[];
  legReports: LegReport[];
  combinedOdds: number;
  winProbability: number;
  evPercent: number;
  riskLevel: string;
}

const gradeColors: Record<string, string> = {
  A: "from-green-500 to-emerald-600",
  B: "from-blue-500 to-cyan-600",
  C: "from-yellow-500 to-amber-600",
  D: "from-orange-500 to-red-500",
  F: "from-red-600 to-red-800",
};

const gradeTextColors: Record<string, string> = {
  A: "text-green-500",
  B: "text-blue-500",
  C: "text-yellow-500",
  D: "text-orange-500",
  F: "text-red-500",
};

const gradeBgColors: Record<string, string> = {
  A: "bg-green-500/10 border-green-500/30",
  B: "bg-blue-500/10 border-blue-500/30",
  C: "bg-yellow-500/10 border-yellow-500/30",
  D: "bg-orange-500/10 border-orange-500/30",
  F: "bg-red-500/10 border-red-500/30",
};

const gradeLabels: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Weak",
  F: "Poor",
};

const factorIcons: Record<string, typeof TrendingUp> = {
  "Expected Value": TrendingUp,
  "Confidence Score": Target,
  "Win Probability vs Implied": BarChart3,
  "Correlation Health": Shield,
  "Leg Diversity": Info,
};

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 30) return "bg-orange-500";
  return "bg-red-500";
}

function legGradeBadge(grade: string) {
  const variant = grade === "A" || grade === "B" ? "default" : grade === "C" ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0" data-testid={`badge-leg-grade-${grade}`}>
      {grade}
    </Badge>
  );
}

export function ParlayReportCard({ legs }: ParlayReportCardProps) {
  const [expandedLeg, setExpandedLeg] = useState<number | null>(null);

  const legsKey = JSON.stringify(legs.map(l => ({ id: l.id, team: l.team, market: l.market, outcome: l.outcome, decimalOdds: l.decimalOdds, americanOdds: l.americanOdds, playerName: l.playerName, propLine: l.propLine })));

  const { data: report, isLoading, error } = useQuery<GradeResponse>({
    queryKey: ["/api/grade-parlay", legsKey],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/grade-parlay", { legs });
      return res.json();
    },
    enabled: legs.length >= 2,
    staleTime: 30000,
    retry: 1,
  });

  if (legs.length < 2) return null;

  if (isLoading) {
    return (
      <Card className="border-dashed" data-testid="report-card-loading">
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Grading your parlay...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed border-orange-500/30" data-testid="report-card-error">
        <CardContent className="py-4 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span>Unable to grade parlay. Your bets will still work — try again shortly.</span>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const grade = report.grade;

  return (
    <Card className={`border ${gradeBgColors[grade] || ""}`} data-testid="parlay-report-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span>Parlay Report Card</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs" data-testid="text-risk-level">
              {report.riskLevel} Risk
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${gradeColors[grade] || gradeColors.C} flex items-center justify-center shrink-0`} data-testid="text-overall-grade">
            <span className="text-3xl font-black text-white">{grade}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-bold ${gradeTextColors[grade]}`}>{gradeLabels[grade] || "Unknown"}</span>
              <span className="text-sm text-muted-foreground">({report.score}/100)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Win Prob</div>
                <div className="font-semibold font-mono" data-testid="text-win-probability">{report.winProbability}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">EV</div>
                <div className={`font-semibold font-mono ${report.evPercent > 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-ev-percent">
                  {report.evPercent > 0 ? "+" : ""}{report.evPercent}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Odds</div>
                <div className="font-semibold font-mono" data-testid="text-combined-odds">{report.combinedOdds}x</div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Factor Breakdown</p>
          {report.breakdown.map((factor) => {
            const Icon = factorIcons[factor.factor] || Info;
            return (
              <div key={factor.factor} className="space-y-1" data-testid={`factor-${factor.factor.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span>{factor.factor}</span>
                    <span className="text-muted-foreground">({Math.round(factor.weight * 100)}%)</span>
                  </div>
                  <span className="font-mono font-semibold">{Math.round(factor.score)}</span>
                </div>
                <Progress value={factor.score} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">{factor.detail}</p>
              </div>
            );
          })}
        </div>

        <Separator />

        {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {report.strengths.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> Strengths
                </p>
                {report.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs" data-testid={`strength-${i}`}>
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
            {report.weaknesses.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3" /> Weaknesses
                </p>
                {report.weaknesses.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs" data-testid={`weakness-${i}`}>
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {report.legReports && report.legReports.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leg-by-Leg Report</p>
              {report.legReports.map((leg, i) => (
                <Collapsible
                  key={i}
                  open={expandedLeg === i}
                  onOpenChange={(open) => setExpandedLeg(open ? i : null)}
                >
                  <CollapsibleTrigger className="w-full" data-testid={`leg-report-trigger-${i}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2 text-xs text-left min-w-0">
                        {legGradeBadge(leg.grade)}
                        <span className="font-medium truncate">{leg.team}</span>
                        <span className="text-muted-foreground truncate">{leg.outcome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-mono ${leg.evPercent > 0 ? "text-green-500" : "text-red-500"}`}>
                          {leg.evPercent > 0 ? "+" : ""}{leg.evPercent}%
                        </span>
                        {expandedLeg === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 py-2 space-y-2 text-xs border-l-2 border-muted ml-3 mt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-muted-foreground">Odds</span>
                          <div className="font-mono font-semibold">{leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Implied</span>
                          <div className="font-mono font-semibold">{leg.impliedProbability}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Model</span>
                          <div className="font-mono font-semibold">{leg.modelProbability}%</div>
                        </div>
                      </div>
                      {leg.pros.length > 0 && (
                        <div className="space-y-1">
                          {leg.pros.map((p, j) => (
                            <div key={j} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {leg.cons.length > 0 && (
                        <div className="space-y-1">
                          {leg.cons.map((c, j) => (
                            <div key={j} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

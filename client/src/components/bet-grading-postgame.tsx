import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClipboardCheck, ChevronDown, ChevronUp, CheckCircle, XCircle, BarChart3 } from "lucide-react";

interface FactorResult {
  name: string;
  correct: boolean;
  predicted: string;
  actual: string;
}

interface GradedBet {
  id: string;
  event: string;
  pick: string;
  result: "W" | "L";
  grade: string;
  sport: string;
  date: string;
  modelPredicted: string;
  actualOutcome: string;
  factorAccuracy: number;
  factors: FactorResult[];
  topFactors: string[];
}

const SAMPLE_BETS: GradedBet[] = [
  {
    id: "g1",
    event: "Lakers vs Celtics",
    pick: "Lakers -3.5",
    result: "W",
    grade: "A+",
    sport: "NBA",
    date: "2026-02-05",
    modelPredicted: "Lakers -5.2",
    actualOutcome: "Lakers win by 8",
    factorAccuracy: 92,
    factors: [
      { name: "Home Court Advantage", correct: true, predicted: "+3.5 pts", actual: "+4.1 pts" },
      { name: "Rest Days", correct: true, predicted: "2 days rest edge", actual: "2 days rest" },
      { name: "Injury Impact", correct: true, predicted: "Minor impact", actual: "No injuries" },
      { name: "Pace of Play", correct: true, predicted: "Fast pace", actual: "102.5 possessions" },
      { name: "Three-Point Shooting", correct: false, predicted: "35% 3PT", actual: "42% 3PT" },
    ],
    topFactors: ["Home Court Advantage", "Rest Days", "Pace of Play", "Defensive Rating", "Star Player Usage"],
  },
  {
    id: "g2",
    event: "Chiefs vs Bills",
    pick: "Over 48.5",
    result: "W",
    grade: "A",
    sport: "NFL",
    date: "2026-02-04",
    modelPredicted: "Total 51.2",
    actualOutcome: "Final: 31-24 (55 total)",
    factorAccuracy: 85,
    factors: [
      { name: "Offensive Tempo", correct: true, predicted: "High tempo", actual: "68 plays each" },
      { name: "Weather Conditions", correct: true, predicted: "Dome/clear", actual: "Clear weather" },
      { name: "Red Zone Efficiency", correct: true, predicted: "Above avg", actual: "5/7 combined" },
      { name: "Turnover Margin", correct: false, predicted: "Even", actual: "2 turnovers" },
      { name: "QB Matchup", correct: true, predicted: "Elite QBs", actual: "600+ combined yards" },
    ],
    topFactors: ["Offensive Tempo", "QB Matchup", "Weather Conditions", "Red Zone Efficiency", "Defensive Fatigue"],
  },
  {
    id: "g3",
    event: "Dodgers vs Giants",
    pick: "Dodgers -1.5",
    result: "L",
    grade: "C",
    sport: "MLB",
    date: "2026-02-03",
    modelPredicted: "Dodgers -2.1 runs",
    actualOutcome: "Giants win 4-3",
    factorAccuracy: 55,
    factors: [
      { name: "Starting Pitcher", correct: true, predicted: "Advantage LAD", actual: "LAD SP 6IP 2ER" },
      { name: "Bullpen Rest", correct: false, predicted: "Fresh bullpen", actual: "Blown save" },
      { name: "Park Factor", correct: true, predicted: "Neutral", actual: "No HR advantage" },
      { name: "Lineup Splits", correct: false, predicted: "Strong vs LHP", actual: "3-for-18 RISP" },
      { name: "Umpire Tendencies", correct: false, predicted: "Tight zone", actual: "Expanded zone" },
    ],
    topFactors: ["Bullpen Rest", "Lineup Splits", "Umpire Tendencies", "Starting Pitcher", "Late Inning Leverage"],
  },
  {
    id: "g4",
    event: "Oilers vs Flames",
    pick: "McDavid O1.5 pts",
    result: "W",
    grade: "A-",
    sport: "NHL",
    date: "2026-02-03",
    modelPredicted: "2.1 projected points",
    actualOutcome: "3 points (1G, 2A)",
    factorAccuracy: 80,
    factors: [
      { name: "Rivalry Factor", correct: true, predicted: "High motivation", actual: "Battle of Alberta" },
      { name: "Power Play", correct: true, predicted: "3+ PP opps", actual: "4 PP opportunities" },
      { name: "Ice Time", correct: true, predicted: "22+ min", actual: "24:12 TOI" },
      { name: "Goalie Matchup", correct: false, predicted: "Backup goalie", actual: "Starter in net" },
      { name: "Line Chemistry", correct: true, predicted: "Top line producing", actual: "4 pts from line" },
    ],
    topFactors: ["Power Play", "Ice Time", "Rivalry Factor", "Line Chemistry", "Shot Volume"],
  },
  {
    id: "g5",
    event: "Bucks vs 76ers",
    pick: "Giannis O30.5 pts",
    result: "L",
    grade: "D",
    sport: "NBA",
    date: "2026-02-02",
    modelPredicted: "32.4 projected pts",
    actualOutcome: "22 points",
    factorAccuracy: 38,
    factors: [
      { name: "Matchup Defense", correct: false, predicted: "Weak interior D", actual: "Elite rim protection" },
      { name: "Foul Trouble", correct: false, predicted: "No issues", actual: "4 fouls by Q3" },
      { name: "Minutes Projection", correct: false, predicted: "36+ min", actual: "28 min (foul trouble)" },
      { name: "Free Throw Rate", correct: true, predicted: "High FTA", actual: "10 FTA" },
      { name: "Game Flow", correct: false, predicted: "Competitive", actual: "Blowout loss" },
    ],
    topFactors: ["Matchup Defense", "Foul Trouble", "Game Flow", "Minutes Projection", "Defensive Scheme"],
  },
  {
    id: "g6",
    event: "Cowboys vs Eagles",
    pick: "Eagles -7",
    result: "W",
    grade: "B+",
    sport: "NFL",
    date: "2026-02-01",
    modelPredicted: "Eagles -8.5",
    actualOutcome: "Eagles win 28-17",
    factorAccuracy: 75,
    factors: [
      { name: "Home Field", correct: true, predicted: "PHI +3 at home", actual: "Dominant at home" },
      { name: "Run Game", correct: true, predicted: "PHI run heavy", actual: "180 rush yards" },
      { name: "QB Play", correct: true, predicted: "Jalen advantage", actual: "3 TD, 0 INT" },
      { name: "Defensive Line", correct: true, predicted: "PHI pressure", actual: "5 sacks" },
      { name: "Turnover Margin", correct: false, predicted: "Even", actual: "DAL 2 turnovers" },
    ],
    topFactors: ["Run Game", "Defensive Line", "Home Field", "QB Play", "Coaching Adjustments"],
  },
  {
    id: "g7",
    event: "Nuggets vs Suns",
    pick: "Jokic O12.5 reb",
    result: "W",
    grade: "B",
    sport: "NBA",
    date: "2026-01-31",
    modelPredicted: "13.8 projected reb",
    actualOutcome: "15 rebounds",
    factorAccuracy: 70,
    factors: [
      { name: "Opponent Reb Rate", correct: true, predicted: "PHX weak boards", actual: "Bottom 10 reb" },
      { name: "Pace", correct: true, predicted: "Moderate pace", actual: "96 possessions" },
      { name: "Minutes", correct: true, predicted: "34+ min", actual: "36 min" },
      { name: "Offensive Glass", correct: false, predicted: "3+ OREB", actual: "1 OREB" },
      { name: "Game Script", correct: true, predicted: "Close game", actual: "4 point game" },
    ],
    topFactors: ["Opponent Reb Rate", "Minutes", "Game Script", "Pace", "Position Matchup"],
  },
  {
    id: "g8",
    event: "Yankees vs Red Sox",
    pick: "Under 8.5",
    result: "L",
    grade: "F",
    sport: "MLB",
    date: "2026-01-30",
    modelPredicted: "Total 7.8",
    actualOutcome: "Final: 9-7 (16 total)",
    factorAccuracy: 25,
    factors: [
      { name: "Starting Pitchers", correct: false, predicted: "Both aces", actual: "Both struggled" },
      { name: "Wind", correct: false, predicted: "Wind in", actual: "Wind out 15mph" },
      { name: "Bullpen Availability", correct: false, predicted: "Fresh arms", actual: "Depleted pens" },
      { name: "Lineup Changes", correct: false, predicted: "Standard", actual: "Stacked lineups" },
      { name: "Park Factor", correct: true, predicted: "Hitter friendly", actual: "5 HR hit" },
    ],
    topFactors: ["Wind", "Starting Pitchers", "Bullpen Availability", "Lineup Changes", "Park Factor"],
  },
];

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-green-500";
  if (grade.startsWith("B")) return "text-chart-1";
  if (grade.startsWith("C")) return "text-yellow-500";
  if (grade.startsWith("D")) return "text-orange-500";
  return "text-red-500";
}

function getGradeBadgeVariant(grade: string): "default" | "secondary" | "destructive" {
  if (grade.startsWith("A") || grade.startsWith("B")) return "default";
  if (grade.startsWith("C")) return "secondary";
  return "destructive";
}

export function BetGradingPostgame() {
  const [sportFilter, setSportFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

  const filtered = SAMPLE_BETS.filter((bet) => {
    if (sportFilter !== "all" && bet.sport !== sportFilter) return false;
    if (gradeFilter !== "all") {
      if (gradeFilter === "A" && !bet.grade.startsWith("A")) return false;
      if (gradeFilter === "B" && !bet.grade.startsWith("B")) return false;
      if (gradeFilter === "C" && !bet.grade.startsWith("C")) return false;
      if (gradeFilter === "DF" && !bet.grade.startsWith("D") && !bet.grade.startsWith("F")) return false;
    }
    return true;
  });

  const totalBets = SAMPLE_BETS.length;
  const avgAccuracy = Math.round(SAMPLE_BETS.reduce((sum, b) => sum + b.factorAccuracy, 0) / totalBets);
  const wins = SAMPLE_BETS.filter((b) => b.result === "W").length;

  function toggleExpanded(id: string) {
    setExpandedBets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-chart-1" />
        <span className="font-medium">Bet Grading Post-Game</span>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Graded</p>
              <p className="text-2xl font-bold" data-testid="text-total-graded">{totalBets}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {Math.round((wins / totalBets) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Factor Accuracy</p>
              <p className="text-2xl font-bold" data-testid="text-avg-accuracy">{avgAccuracy}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-36" data-testid="select-grading-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-36" data-testid="select-grading-grade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="A">A Grades</SelectItem>
            <SelectItem value="B">B Grades</SelectItem>
            <SelectItem value="C">C Grades</SelectItem>
            <SelectItem value="DF">D/F Grades</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((bet) => {
          const isOpen = expandedBets.has(bet.id);
          return (
            <Collapsible key={bet.id} open={isOpen} onOpenChange={() => toggleExpanded(bet.id)}>
              <Card>
                <CardContent className="p-4">
                  <CollapsibleTrigger className="w-full text-left" data-testid={`button-expand-bet-${bet.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{bet.event}</span>
                          <Badge variant="outline" data-testid={`badge-sport-${bet.id}`}>{bet.sport}</Badge>
                          <span className="text-xs text-muted-foreground">{bet.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Pick: {bet.pick}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={bet.result === "W" ? "default" : "destructive"}
                          data-testid={`badge-result-${bet.id}`}
                        >
                          {bet.result}
                        </Badge>
                        <Badge
                          variant={getGradeBadgeVariant(bet.grade)}
                          className={getGradeColor(bet.grade)}
                          data-testid={`badge-grade-${bet.id}`}
                        >
                          {bet.grade}
                        </Badge>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-xs text-muted-foreground">Model Predicted</p>
                          <p className="font-medium text-sm" data-testid={`text-predicted-${bet.id}`}>
                            {bet.modelPredicted}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-xs text-muted-foreground">Actual Outcome</p>
                          <p className="font-medium text-sm" data-testid={`text-actual-${bet.id}`}>
                            {bet.actualOutcome}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Factor Accuracy</p>
                          <Badge variant="outline" data-testid={`badge-accuracy-${bet.id}`}>
                            {bet.factorAccuracy}%
                          </Badge>
                        </div>
                        <div className="w-full bg-muted rounded-md" style={{ height: 8 }}>
                          <div
                            className={`h-full rounded-md ${
                              bet.factorAccuracy >= 70
                                ? "bg-green-500"
                                : bet.factorAccuracy >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${bet.factorAccuracy}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Factor Breakdown</p>
                        <div className="space-y-2">
                          {bet.factors.map((factor, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                              data-testid={`row-factor-${bet.id}-${i}`}
                            >
                              <div className="flex items-center gap-2">
                                {factor.correct ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span>{factor.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>Pred: {factor.predicted}</span>
                                <span>Act: {factor.actual}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Top 5 Influencing Factors</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {bet.topFactors.map((factor, i) => (
                            <Badge key={i} variant="secondary" data-testid={`badge-top-factor-${bet.id}-${i}`}>
                              {i + 1}. {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

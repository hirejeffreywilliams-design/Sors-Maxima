import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClipboardCheck, ChevronDown, ChevronUp, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";

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
}

const FACTOR_TEMPLATES: Record<string, string[]> = {
  NFL: ["Home Field", "Run Game", "QB Play", "Defensive Line", "Weather", "Turnover Margin", "Red Zone Efficiency"],
  NBA: ["Home Court", "Pace", "Three-Point Shooting", "Free Throw Rate", "Minutes", "Matchup Defense", "Rest Days"],
  MLB: ["Starting Pitcher", "Bullpen Rest", "Park Factor", "Lineup Splits", "Wind Conditions"],
  NHL: ["Goalie Matchup", "Power Play", "Ice Time", "Rivalry Factor", "Shot Volume"],
};

function calculateGrade(factorAccuracy: number, result: "W" | "L"): string {
  if (result === "W") {
    if (factorAccuracy >= 90) return "A+";
    if (factorAccuracy >= 80) return "A";
    if (factorAccuracy >= 70) return "A-";
    if (factorAccuracy >= 60) return "B+";
    if (factorAccuracy >= 50) return "B";
    return "B-";
  }
  if (factorAccuracy >= 70) return "C+";
  if (factorAccuracy >= 50) return "C";
  if (factorAccuracy >= 30) return "D";
  return "F";
}

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
  const [bets, setBets] = useState<GradedBet[]>([]);
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
  const [sportFilter, setSportFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [formEvent, setFormEvent] = useState("");
  const [formPick, setFormPick] = useState("");
  const [formResult, setFormResult] = useState<"W" | "L">("W");
  const [formSport, setFormSport] = useState("NFL");
  const [formDate, setFormDate] = useState("");
  const [formPredicted, setFormPredicted] = useState("");
  const [formActual, setFormActual] = useState("");
  const [formFactors, setFormFactors] = useState<FactorResult[]>([]);

  function resetForm() {
    setFormEvent("");
    setFormPick("");
    setFormResult("W");
    setFormSport("NFL");
    setFormDate("");
    setFormPredicted("");
    setFormActual("");
    setFormFactors([]);
    setShowForm(false);
  }

  function addFactorFromTemplate(factorName: string) {
    if (formFactors.some((f) => f.name === factorName)) return;
    setFormFactors((prev) => [...prev, { name: factorName, correct: true, predicted: "", actual: "" }]);
  }

  function updateFactor(index: number, field: keyof FactorResult, value: string | boolean) {
    setFormFactors((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function removeFactor(index: number) {
    setFormFactors((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!formEvent || !formPick || !formDate) return;
    const correctCount = formFactors.filter((f) => f.correct).length;
    const factorAccuracy = formFactors.length > 0 ? Math.round((correctCount / formFactors.length) * 100) : 50;
    const grade = calculateGrade(factorAccuracy, formResult);

    const newBet: GradedBet = {
      id: Date.now().toString(),
      event: formEvent,
      pick: formPick,
      result: formResult,
      grade,
      sport: formSport,
      date: formDate,
      modelPredicted: formPredicted || "N/A",
      actualOutcome: formActual || "N/A",
      factorAccuracy,
      factors: formFactors,
    };

    setBets((prev) => [newBet, ...prev]);
    resetForm();
  }

  function removeBet(id: string) {
    setBets((prev) => prev.filter((b) => b.id !== id));
  }

  function toggleExpanded(id: string) {
    setExpandedBets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = bets.filter((bet) => {
    if (sportFilter !== "all" && bet.sport !== sportFilter) return false;
    if (gradeFilter !== "all") {
      if (gradeFilter === "A" && !bet.grade.startsWith("A")) return false;
      if (gradeFilter === "B" && !bet.grade.startsWith("B")) return false;
      if (gradeFilter === "C" && !bet.grade.startsWith("C")) return false;
      if (gradeFilter === "DF" && !bet.grade.startsWith("D") && !bet.grade.startsWith("F")) return false;
    }
    return true;
  });

  const totalBets = bets.length;
  const avgAccuracy = totalBets > 0 ? Math.round(bets.reduce((sum, b) => sum + b.factorAccuracy, 0) / totalBets) : 0;
  const wins = bets.filter((b) => b.result === "W").length;
  const availableFactors = FACTOR_TEMPLATES[formSport] || FACTOR_TEMPLATES.NFL;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-chart-1" />
          <span className="font-medium">Bet Grading Post-Game</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-toggle-form">
          <Plus className="w-4 h-4 mr-2" />
          Grade a Bet
        </Button>
      </div>

      {showForm && (
        <Card data-testid="card-add-bet-form">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bet-event">Event / Matchup</Label>
                <Input id="bet-event" placeholder="e.g. Eagles vs Cowboys" value={formEvent} onChange={(e) => setFormEvent(e.target.value)} data-testid="input-event" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bet-pick">Your Pick</Label>
                <Input id="bet-pick" placeholder="e.g. Eagles -3.5" value={formPick} onChange={(e) => setFormPick(e.target.value)} data-testid="input-pick" />
              </div>
              <div className="space-y-1">
                <Label>Sport</Label>
                <Select value={formSport} onValueChange={setFormSport}>
                  <SelectTrigger data-testid="select-form-sport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NFL">NFL</SelectItem>
                    <SelectItem value="NBA">NBA</SelectItem>
                    <SelectItem value="MLB">MLB</SelectItem>
                    <SelectItem value="NHL">NHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Result</Label>
                <Select value={formResult} onValueChange={(v) => setFormResult(v as "W" | "L")}>
                  <SelectTrigger data-testid="select-form-result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="W">Win</SelectItem>
                    <SelectItem value="L">Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bet-date">Date</Label>
                <Input id="bet-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} data-testid="input-date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bet-predicted">Your Prediction</Label>
                <Input id="bet-predicted" placeholder="e.g. Eagles -5.2" value={formPredicted} onChange={(e) => setFormPredicted(e.target.value)} data-testid="input-predicted" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="bet-actual">Actual Outcome</Label>
                <Input id="bet-actual" placeholder="e.g. Eagles win by 8" value={formActual} onChange={(e) => setFormActual(e.target.value)} data-testid="input-actual" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Factor Analysis</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {availableFactors.map((f) => (
                  <Button key={f} variant="outline" size="sm" onClick={() => addFactorFromTemplate(f)} disabled={formFactors.some((ff) => ff.name === f)} data-testid={`button-add-factor-${f.replace(/\s+/g, "-").toLowerCase()}`}>
                    <Plus className="w-3 h-3 mr-1" />
                    {f}
                  </Button>
                ))}
              </div>

              {formFactors.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formFactors.map((factor, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md" data-testid={`row-form-factor-${i}`}>
                      <Button size="icon" variant="ghost" onClick={() => updateFactor(i, "correct", !factor.correct)} data-testid={`button-toggle-correct-${i}`}>
                        {factor.correct ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </Button>
                      <span className="text-sm font-medium min-w-[100px]">{factor.name}</span>
                      <Input className="flex-1" placeholder="Predicted" value={factor.predicted} onChange={(e) => updateFactor(i, "predicted", e.target.value)} data-testid={`input-factor-predicted-${i}`} />
                      <Input className="flex-1" placeholder="Actual" value={factor.actual} onChange={(e) => updateFactor(i, "actual", e.target.value)} data-testid={`input-factor-actual-${i}`} />
                      <Button size="icon" variant="ghost" onClick={() => removeFactor(i)} data-testid={`button-remove-factor-${i}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!formEvent || !formPick || !formDate} className="flex-1" data-testid="button-submit-bet">
                Grade This Bet
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-form">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {totalBets > 0 && (
        <>
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
        </>
      )}

      {totalBets === 0 && !showForm && (
        <Card data-testid="empty-graded-bets">
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium">No graded bets yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your bet results will appear here after games complete.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Grade a Bet" to manually enter past bets for analysis.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((bet) => {
          const isOpen = expandedBets.has(bet.id);
          return (
            <Collapsible key={bet.id} open={isOpen} onOpenChange={() => toggleExpanded(bet.id)}>
              <Card data-testid={`card-bet-${bet.id}`}>
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
                        <Badge variant={bet.result === "W" ? "default" : "destructive"} data-testid={`badge-result-${bet.id}`}>
                          {bet.result}
                        </Badge>
                        <Badge variant={getGradeBadgeVariant(bet.grade)} className={getGradeColor(bet.grade)} data-testid={`badge-grade-${bet.id}`}>
                          {bet.grade}
                        </Badge>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-xs text-muted-foreground">Predicted</p>
                          <p className="font-medium text-sm" data-testid={`text-predicted-${bet.id}`}>{bet.modelPredicted}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-xs text-muted-foreground">Actual Outcome</p>
                          <p className="font-medium text-sm" data-testid={`text-actual-${bet.id}`}>{bet.actualOutcome}</p>
                        </div>
                      </div>

                      {bet.factors.length > 0 && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">Factor Accuracy</p>
                              <Badge variant="outline" data-testid={`badge-accuracy-${bet.id}`}>{bet.factorAccuracy}%</Badge>
                            </div>
                            <div className="w-full bg-muted rounded-md" style={{ height: 8 }}>
                              <div
                                className={`h-full rounded-md ${bet.factorAccuracy >= 70 ? "bg-green-500" : bet.factorAccuracy >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${bet.factorAccuracy}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Factor Breakdown</p>
                            <div className="space-y-2">
                              {bet.factors.map((factor, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm" data-testid={`row-factor-${bet.id}-${i}`}>
                                  <div className="flex items-center gap-2">
                                    {factor.correct ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                    <span>{factor.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {factor.predicted && <span>Pred: {factor.predicted}</span>}
                                    {factor.actual && <span>Act: {factor.actual}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Button variant="outline" size="sm" onClick={() => removeBet(bet.id)} data-testid={`button-remove-bet-${bet.id}`}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
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

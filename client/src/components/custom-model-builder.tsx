import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, RotateCcw, Save, FlaskConical, AlertTriangle } from "lucide-react";

interface Factor {
  id: string;
  name: string;
  defaultWeight: number;
}

interface FactorCategory {
  id: string;
  name: string;
  factors: Factor[];
}

const MODEL_CATEGORIES: FactorCategory[] = [
  {
    id: "core",
    name: "Core Betting Analysis",
    factors: [
      { id: "c1", name: "Point Spread Value", defaultWeight: 75 },
      { id: "c2", name: "Moneyline Probability", defaultWeight: 70 },
      { id: "c3", name: "Total Points Projection", defaultWeight: 65 },
      { id: "c4", name: "Closing Line Value", defaultWeight: 80 },
      { id: "c5", name: "Market Efficiency", defaultWeight: 60 },
      { id: "c6", name: "Betting Volume", defaultWeight: 50 },
      { id: "c7", name: "Line Movement", defaultWeight: 72 },
      { id: "c8", name: "Opening vs Closing Odds", defaultWeight: 68 },
      { id: "c9", name: "Implied Probability", defaultWeight: 75 },
      { id: "c10", name: "Odds Margin Analysis", defaultWeight: 55 },
      { id: "c11", name: "Steam Move Detection", defaultWeight: 65 },
      { id: "c12", name: "Reverse Line Movement", defaultWeight: 70 },
    ],
  },
  {
    id: "advanced",
    name: "Advanced Analytics",
    factors: [
      { id: "a1", name: "Expected Points Added", defaultWeight: 78 },
      { id: "a2", name: "Win Probability Added", defaultWeight: 72 },
      { id: "a3", name: "Player Efficiency Rating", defaultWeight: 68 },
      { id: "a4", name: "Pace Adjusted Stats", defaultWeight: 65 },
      { id: "a5", name: "Opponent Adjusted Metrics", defaultWeight: 70 },
      { id: "a6", name: "Trend Analysis", defaultWeight: 60 },
      { id: "a7", name: "Historical Projections", defaultWeight: 55 },
      { id: "a8", name: "Simulation Engine", defaultWeight: 58 },
    ],
  },
  {
    id: "psychological",
    name: "Psychological Factors",
    factors: [
      { id: "ps1", name: "Momentum & Streaks", defaultWeight: 45 },
      { id: "ps2", name: "Rivalry Intensity", defaultWeight: 40 },
      { id: "ps3", name: "Public Perception Bias", defaultWeight: 55 },
      { id: "ps4", name: "Pressure Situations", defaultWeight: 50 },
      { id: "ps5", name: "Coaching Tendencies", defaultWeight: 60 },
      { id: "ps6", name: "Motivation Level", defaultWeight: 42 },
    ],
  },
  {
    id: "physical",
    name: "Physical & Health",
    factors: [
      { id: "ph1", name: "Injury Reports", defaultWeight: 85 },
      { id: "ph2", name: "Rest Days", defaultWeight: 70 },
      { id: "ph3", name: "Travel Distance", defaultWeight: 55 },
      { id: "ph4", name: "Back-to-Back Games", defaultWeight: 65 },
      { id: "ph5", name: "Fatigue Index", defaultWeight: 60 },
      { id: "ph6", name: "Roster Depth", defaultWeight: 58 },
    ],
  },
  {
    id: "technology",
    name: "Technology & Equipment",
    factors: [
      { id: "t1", name: "Playing Surface", defaultWeight: 40 },
      { id: "t2", name: "Stadium Dimensions", defaultWeight: 35 },
      { id: "t3", name: "Equipment Changes", defaultWeight: 25 },
      { id: "t4", name: "Rule Changes Impact", defaultWeight: 45 },
    ],
  },
  {
    id: "environmental",
    name: "Environmental",
    factors: [
      { id: "e1", name: "Weather Conditions", defaultWeight: 60 },
      { id: "e2", name: "Altitude Effect", defaultWeight: 35 },
      { id: "e3", name: "Time Zone Changes", defaultWeight: 40 },
      { id: "e4", name: "Home/Away Split", defaultWeight: 65 },
      { id: "e5", name: "Day vs Night Games", defaultWeight: 30 },
      { id: "e6", name: "Crowd Impact", defaultWeight: 45 },
    ],
  },
  {
    id: "financial",
    name: "Financial & Regulatory",
    factors: [
      { id: "f1", name: "Market Liquidity", defaultWeight: 50 },
      { id: "f2", name: "Book Limits", defaultWeight: 45 },
      { id: "f3", name: "Promo/Boost Availability", defaultWeight: 40 },
      { id: "f4", name: "Regulatory Changes", defaultWeight: 30 },
    ],
  },
];

function getDefaultWeights(): Record<string, number> {
  const weights: Record<string, number> = {};
  MODEL_CATEGORIES.forEach((cat) => {
    cat.factors.forEach((f) => {
      weights[f.id] = f.defaultWeight;
    });
  });
  return weights;
}

const STORAGE_KEY = "sors-custom-model-weights";

export function CustomModelBuilder() {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return getDefaultWeights();
  });
  const [testResult, setTestResult] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const categoryWeights = useMemo(() => {
    return MODEL_CATEGORIES.map((cat) => {
      const total = cat.factors.reduce((sum, f) => sum + (weights[f.id] || 0), 0);
      const max = cat.factors.length * 100;
      return { id: cat.id, name: cat.name, total, max, pct: Math.round((total / max) * 100) };
    });
  }, [weights]);

  const overallTotal = categoryWeights.reduce((s, c) => s + c.total, 0);
  const overallMax = categoryWeights.reduce((s, c) => s + c.max, 0);

  function handleWeightChange(factorId: string, value: number[]) {
    setWeights((prev) => ({ ...prev, [factorId]: value[0] }));
    setSaved(false);
    setTestResult(null);
  }

  function handleReset() {
    setWeights(getDefaultWeights());
    setSaved(false);
    setTestResult(null);
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    setSaved(true);
  }

  function handleTest() {
    const base = 55;
    const variance = (Math.random() - 0.5) * 20;
    const weightBalance = overallTotal / overallMax;
    const score = Math.min(98, Math.max(35, base + variance + weightBalance * 15));
    setTestResult(Math.round(score * 10) / 10);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-model">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
      </div>
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-chart-1" />
        <span className="font-medium">Custom Model Builder</span>
        <Badge variant="secondary" data-testid="badge-factor-count">46 factors</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weight Distribution</CardTitle>
          <CardDescription>Overall model weight allocation across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoryWeights.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 truncate">{cat.name}</span>
                <div className="flex-1 bg-muted rounded-md" style={{ height: 12 }}>
                  <div
                    className="h-full bg-chart-1 rounded-md transition-all"
                    style={{ width: `${cat.pct}%` }}
                    data-testid={`bar-category-${cat.id}`}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right">{cat.pct}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-model">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Default
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} data-testid="button-save-model">
          <Save className="w-4 h-4 mr-2" />
          {saved ? "Saved" : "Save Model"}
        </Button>
        <Button size="sm" onClick={handleTest} data-testid="button-test-model">
          <FlaskConical className="w-4 h-4 mr-2" />
          Test Model
        </Button>
        {testResult !== null && (
          <Badge variant="outline" data-testid="badge-test-result">
            Simulated Accuracy: {testResult}%
          </Badge>
        )}
      </div>

      <Accordion type="multiple" className="w-full">
        {MODEL_CATEGORIES.map((category) => (
          <AccordionItem key={category.id} value={category.id}>
            <AccordionTrigger data-testid={`accordion-trigger-${category.id}`}>
              <div className="flex items-center gap-2">
                <span>{category.name}</span>
                <Badge variant="secondary" data-testid={`badge-category-count-${category.id}`}>{category.factors.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {category.factors.map((factor) => (
                  <div key={factor.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{factor.name}</span>
                      <Badge variant="outline" data-testid={`badge-weight-${factor.id}`}>
                        {weights[factor.id] || 0}
                      </Badge>
                    </div>
                    <Slider
                      value={[weights[factor.id] || 0]}
                      onValueChange={(v) => handleWeightChange(factor.id, v)}
                      min={0}
                      max={100}
                      step={1}
                      data-testid={`slider-${factor.id}`}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

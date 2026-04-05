import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch,
  BarChart3,
  SlidersHorizontal,
  Lightbulb,
  TrendingUp,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface FactorAttribution {
  factorName: string;
  weight: number;
  contribution: number;
  rank: number;
  category: string;
}

interface DecisionNode {
  factor: string;
  threshold: number;
  value: number;
  direction: "left" | "right";
  confidence: number;
}

interface ReplayResult {
  id: number;
  predictionId: number;
  factorWeights: Record<string, number>;
  decisionPath: DecisionNode[];
  outcome: string | null;
  factors: FactorAttribution[];
  insights: string[];
}

interface WhatIfResult {
  originalPrediction: number;
  modifiedPrediction: number;
  delta: number;
  impactedFactors: Array<{
    factor: string;
    originalValue: number;
    modifiedValue: number;
    predictionDelta: number;
  }>;
}

interface FactorAccuracy {
  factorName: string;
  period: string;
  accuracyRate: number;
  sampleSize: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Core Betting": "bg-blue-500",
  "Advanced Analytics": "bg-green-500",
  "Psychological": "bg-purple-500",
  "Physical & Health": "bg-red-500",
  "Performance": "bg-amber-500",
  "Environmental": "bg-teal-500",
  "Financial & Regulatory": "bg-pink-500",
};

interface QuantumReplayProps {
  predictionId: number;
}

export default function QuantumReplay({ predictionId }: QuantumReplayProps) {
  const [whatIfFactors, setWhatIfFactors] = useState<Record<string, number>>({});

  const { data: replay, isLoading: replayLoading } = useQuery<ReplayResult>({
    queryKey: [`/api/replay/${predictionId}`],
    enabled: !!predictionId,
  });

  const { data: factorAccuracy } = useQuery<FactorAccuracy[]>({
    queryKey: ["/api/replay/factor-accuracy"],
  });

  const whatIfMutation = useMutation({
    mutationFn: async (modifiedFactors: Record<string, number>) => {
      const res = await apiRequest("POST", `/api/replay/${predictionId}/what-if`, { modifiedFactors });
      return res.json() as Promise<WhatIfResult>;
    },
  });

  if (replayLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!replay) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No replay data available for this prediction.
        </CardContent>
      </Card>
    );
  }

  const topFactors = replay.factors.slice(0, 10);
  const maxContribution = Math.max(...topFactors.map((f) => f.contribution), 0.01);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-5 w-5 text-cyan-500" />
        <h2 className="text-xl font-bold">Quantum Replay</h2>
        <Badge variant="outline">Prediction #{predictionId}</Badge>
      </div>

      <Tabs defaultValue="factors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="factors"><BarChart3 className="h-4 w-4 mr-1" /> Factors</TabsTrigger>
          <TabsTrigger value="whatif"><SlidersHorizontal className="h-4 w-4 mr-1" /> What-If</TabsTrigger>
          <TabsTrigger value="decision"><GitBranch className="h-4 w-4 mr-1" /> Decision Flow</TabsTrigger>
          <TabsTrigger value="insights"><Lightbulb className="h-4 w-4 mr-1" /> Insights</TabsTrigger>
        </TabsList>

        {/* Factor Importance Chart */}
        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Factor Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topFactors.map((factor) => (
                  <div key={factor.factorName} className="flex items-center gap-3">
                    <span className="text-xs w-6 text-muted-foreground">#{factor.rank}</span>
                    <div className="w-40 text-sm truncate">{factor.factorName}</div>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
                      <div
                        className={`h-full rounded ${CATEGORY_COLORS[factor.category] ?? "bg-gray-500"} transition-all`}
                        style={{ width: `${(factor.contribution / maxContribution) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {(factor.contribution * 100).toFixed(1)}%
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {factor.category}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">By Category</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    replay.factors.reduce((acc, f) => {
                      acc[f.category] = (acc[f.category] ?? 0) + f.contribution;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, total]) => (
                      <Badge key={cat} className={`${CATEGORY_COLORS[cat] ?? "bg-gray-500"} text-white`}>
                        {cat}: {(total * 100).toFixed(1)}%
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* What-If Sliders */}
        <TabsContent value="whatif">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What-If Simulator</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Adjust factor weights to see how the prediction would change.
              </p>

              <div className="space-y-3 mb-4">
                {topFactors.slice(0, 6).map((factor) => (
                  <div key={factor.factorName} className="flex items-center gap-3">
                    <span className="text-sm w-44 truncate">{factor.factorName}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((whatIfFactors[factor.factorName] ?? factor.weight) * 100)}
                      onChange={(e) => {
                        setWhatIfFactors((prev) => ({
                          ...prev,
                          [factor.factorName]: parseInt(e.target.value, 10) / 100,
                        }));
                      }}
                      className="flex-1 accent-cyan-500"
                    />
                    <span className="text-xs w-12 text-right">
                      {((whatIfFactors[factor.factorName] ?? factor.weight) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => whatIfMutation.mutate(whatIfFactors)}
                disabled={Object.keys(whatIfFactors).length === 0 || whatIfMutation.isPending}
              >
                {whatIfMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4 mr-1" />
                )}
                Run Scenario
              </Button>

              {whatIfMutation.data && (
                <div className="mt-4 p-4 rounded bg-muted/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Original</div>
                      <div className="text-lg font-bold">
                        {(whatIfMutation.data.originalPrediction * 100).toFixed(1)}%
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Modified</div>
                      <div className="text-lg font-bold">
                        {(whatIfMutation.data.modifiedPrediction * 100).toFixed(1)}%
                      </div>
                    </div>
                    <Badge className={whatIfMutation.data.delta > 0 ? "bg-green-600" : whatIfMutation.data.delta < 0 ? "bg-red-600" : "bg-gray-600"}>
                      {whatIfMutation.data.delta > 0 ? "+" : ""}{(whatIfMutation.data.delta * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {whatIfMutation.data.impactedFactors.map((f) => (
                      <div key={f.factor} className="flex items-center gap-2 text-xs">
                        <span className="w-36 truncate">{f.factor}</span>
                        <span className="text-muted-foreground">{(f.originalValue * 100).toFixed(0)}%</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{(f.modifiedValue * 100).toFixed(0)}%</span>
                        <Badge variant="outline" className="text-xs">
                          {f.predictionDelta > 0 ? "+" : ""}{(f.predictionDelta * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decision Flow */}
        <TabsContent value="decision">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Decision Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {replay.decisionPath.map((node, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${node.direction === "right" ? "bg-green-600" : "bg-amber-600"}`}>
                        {i + 1}
                      </div>
                      {i < replay.decisionPath.length - 1 && (
                        <div className="w-0.5 h-8 bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 p-3 rounded bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{node.factor}</span>
                        <Badge variant="outline" className="text-xs">
                          {(node.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Value: {node.value.toFixed(3)} | Threshold: {node.threshold.toFixed(3)} |
                        Direction: <span className={node.direction === "right" ? "text-green-500" : "text-amber-500"}>
                          {node.direction === "right" ? "Favorable" : "Cautious"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" /> Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {replay.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded bg-muted/50">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-cyan-500 shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {factorAccuracy && factorAccuracy.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historical Factor Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factorAccuracy.slice(0, 10).map((fa, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-44 truncate">{fa.factorName}</span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-cyan-600 rounded"
                            style={{ width: `${fa.accuracyRate * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-16 text-right">
                          {(fa.accuracyRate * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground w-20">
                          n={fa.sampleSize}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSEO } from "@/hooks/use-seo";
import {
  Brain, ThumbsUp, ThumbsDown, Activity, Database, Clock,
  TrendingUp, TrendingDown, BarChart3, Shield, Zap, History, Target
} from "lucide-react";

interface SnapshotSummary {
  totalSnapshots: number;
  engines: { engine: string; count: number; latest: string | null }[];
  recentTriggers: { trigger: string; count: number }[];
  avgAccuracy: number | null;
}

interface Snapshot {
  id: number;
  version: string;
  engine: string;
  weights: Record<string, unknown>;
  metrics: Record<string, unknown>;
  trigger: string;
  sport: string | null;
  market_type: string | null;
  predictions_since_last: number;
  accuracy_at_snapshot: number | null;
  accuracy: number | null;
  brier_score: number | null;
  home_win_rate: number | null;
  spread_cover_rate: number | null;
  label: string | null;
  notes: string | null;
  created_at: string;
}

interface LearningMetrics {
  snapshots: SnapshotSummary;
  auditTrail: {
    total: number;
    actionCounts: Record<string, number>;
    uniqueUsers: number;
    timeRange: { oldest: string | null; newest: string | null };
  };
  pickFeedback: {
    totalVotes: number;
    totalUp: number;
    totalDown: number;
    uniqueVoters: number;
    uniquePicks: number;
    helpfulnessRate: number;
  };
}

interface FeedbackStats {
  totalVotes: number;
  totalUp: number;
  totalDown: number;
  uniqueVoters: number;
  uniquePicks: number;
  helpfulnessRate: number;
  bySport: { sport: string; votes: string; up_count: string; down_count: string }[];
  byGrade: { grade: string; votes: string; up_count: string; down_count: string }[];
  last30Days: { totalVotes: number; totalUp: number; totalDown: number; uniqueVoters: number; helpfulnessRate: number };
  recentNegative: { pick_id: string; sport: string; bet_type: string; created_at: string; username: string }[];
  lowestRated: { pick_id: string; ups: string; downs: string; total: string }[];
}

interface SnapshotDelta {
  version: string;
  engine: string;
  current_accuracy: number | null;
  prev_accuracy: number | null;
  accuracy_delta: number | null;
  created_at: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString();
}

function triggerLabel(trigger: string): string {
  const map: Record<string, string> = {
    manual: "Manual",
    weight_update: "Weight Update",
    scheduled_retraining: "Scheduled Retraining",
    micro_learning: "Micro Learning",
  };
  return map[trigger] || trigger;
}

export default function AdminLearning() {
  useSEO({ title: "Learning System | Admin", description: "Model learning, pick feedback, and audit trail metrics." });

  const { data: metrics, isLoading: metricsLoading } = useQuery<LearningMetrics>({
    queryKey: ["/api/admin/learning/metrics"],
  });

  const { data: snapshotsData, isLoading: snapshotsLoading } = useQuery<{ snapshots: Snapshot[]; summary: SnapshotSummary; deltas: SnapshotDelta[] }>({
    queryKey: ["/api/admin/learning/snapshots"],
  });

  const { data: feedbackStats, isLoading: feedbackLoading } = useQuery<FeedbackStats>({
    queryKey: ["/api/admin/pick-feedback/stats"],
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-learning-title">Learning System Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Model version snapshots, pick helpfulness feedback, and persistent audit trail metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Database className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold font-mono" data-testid="text-total-snapshots">{metrics?.snapshots.totalSnapshots ?? "..."}</p>
              <p className="text-[10px] text-muted-foreground">Model Snapshots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <ThumbsUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold font-mono" data-testid="text-total-votes">{metrics?.pickFeedback.totalVotes ?? "..."}</p>
              <p className="text-[10px] text-muted-foreground">Pick Votes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Target className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold font-mono" data-testid="text-helpfulness-rate">{metrics?.pickFeedback.helpfulnessRate ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground">Helpfulness Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold font-mono" data-testid="text-audit-entries">{metrics?.auditTrail.total ?? "..."}</p>
              <p className="text-[10px] text-muted-foreground">Audit Entries</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="feedback">
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="feedback" className="gap-1.5" data-testid="tab-feedback"><ThumbsUp className="w-3.5 h-3.5" />Pick Feedback</TabsTrigger>
            <TabsTrigger value="snapshots" className="gap-1.5" data-testid="tab-snapshots"><History className="w-3.5 h-3.5" />Model Snapshots</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5" data-testid="tab-audit"><Shield className="w-3.5 h-3.5" />Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4">
            {feedbackLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading feedback data...</CardContent></Card>
            ) : feedbackStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Helpfulness Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Thumbs Up</span>
                        <span className="font-mono font-bold text-green-500" data-testid="text-feedback-up">{feedbackStats.totalUp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Thumbs Down</span>
                        <span className="font-mono font-bold text-red-500" data-testid="text-feedback-down">{feedbackStats.totalDown}</span>
                      </div>
                      <Progress value={feedbackStats.helpfulnessRate} className="h-2" />
                      <p className="text-[10px] text-muted-foreground text-center">{feedbackStats.helpfulnessRate}% positive</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Engagement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Unique Voters</span>
                        <span className="font-mono font-bold">{feedbackStats.uniqueVoters}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Picks Rated</span>
                        <span className="font-mono font-bold">{feedbackStats.uniquePicks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Votes</span>
                        <span className="font-mono font-bold">{feedbackStats.totalVotes}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Sport</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {feedbackStats.bySport.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No sport data yet</p>
                      ) : (
                        feedbackStats.bySport.slice(0, 6).map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{s.sport || "Unknown"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-green-500 font-mono text-xs">{s.up_count}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-red-500 font-mono text-xs">{s.down_count}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        By Pick Grade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(!feedbackStats.byGrade || feedbackStats.byGrade.length === 0) ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No grade data yet</p>
                      ) : (
                        feedbackStats.byGrade.map((g, i) => {
                          const total = parseInt(g.up_count) + parseInt(g.down_count);
                          const rate = total > 0 ? Math.round((parseInt(g.up_count) / total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center justify-between text-sm" data-testid={`text-grade-feedback-${g.grade}`}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[10px]">{g.grade}</Badge>
                                <span className="text-xs text-muted-foreground">{rate}% helpful</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-500 font-mono text-xs">{g.up_count}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-red-500 font-mono text-xs">{g.down_count}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Last 30 Days
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {feedbackStats.last30Days ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Votes</span>
                            <span className="font-mono font-bold" data-testid="text-30d-votes">{feedbackStats.last30Days.totalVotes}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Helpfulness</span>
                            <span className="font-mono font-bold text-primary" data-testid="text-30d-rate">{feedbackStats.last30Days.helpfulnessRate}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Active Voters</span>
                            <span className="font-mono font-bold">{feedbackStats.last30Days.uniqueVoters}</span>
                          </div>
                          <Progress value={feedbackStats.last30Days.helpfulnessRate} className="h-2" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No recent data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {feedbackStats.lowestRated.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                        Lowest Rated Picks
                      </CardTitle>
                      <CardDescription>Picks with the most negative feedback (min 2 votes)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {feedbackStats.lowestRated.map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                            <span className="text-sm font-mono truncate max-w-[200px]">{p.pick_id}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-green-500 text-xs">
                                <ThumbsUp className="w-3 h-3" />
                                <span className="font-mono">{p.ups}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-500 text-xs">
                                <ThumbsDown className="w-3 h-3" />
                                <span className="font-mono">{p.downs}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {feedbackStats.recentNegative.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        Recent Negative Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {feedbackStats.recentNegative.slice(0, 10).map((n, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0">{n.sport || "?"}</Badge>
                              <span className="font-mono truncate max-w-[150px]">{n.pick_id}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">{n.username}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback data available</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="snapshots" className="space-y-4">
            {snapshotsLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading snapshots...</CardContent></Card>
            ) : snapshotsData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Snapshot Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Snapshots</span>
                        <span className="font-mono font-bold">{snapshotsData.summary.totalSnapshots}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Engines Tracked</span>
                        <span className="font-mono font-bold">{snapshotsData.summary.engines.length}</span>
                      </div>
                      {snapshotsData.summary.avgAccuracy !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Accuracy</span>
                          <span className="font-mono font-bold text-primary">{(snapshotsData.summary.avgAccuracy * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Engine</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {snapshotsData.summary.engines.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No snapshots yet</p>
                      ) : (
                        snapshotsData.summary.engines.map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[150px]">{e.engine}</span>
                            <Badge variant="outline" className="text-[10px]">{e.count}</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Trigger Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {snapshotsData.summary.recentTriggers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No triggers yet</p>
                      ) : (
                        snapshotsData.summary.recentTriggers.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{triggerLabel(t.trigger)}</span>
                            <Badge variant="outline" className="text-[10px]">{t.count}</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      Snapshot History
                    </CardTitle>
                    <CardDescription>Most recent model version snapshots with accuracy deltas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {snapshotsData.snapshots.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No snapshots recorded yet. Snapshots are created during learning cycles.</p>
                    ) : (
                      <div className="space-y-2">
                        {snapshotsData.snapshots.slice(0, 20).map((s, i) => {
                          const delta = snapshotsData.deltas?.find(d => d.version === s.version);
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{s.version.slice(0, 20)}</Badge>
                                <span className="text-sm truncate max-w-[200px]">{s.engine}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                                <Badge variant="secondary" className="text-[9px]">{triggerLabel(s.trigger)}</Badge>
                                {(s.accuracy ?? s.accuracy_at_snapshot) !== null && (
                                  <span className="text-xs font-mono text-primary" data-testid={`text-snapshot-accuracy-${s.id}`}>{((s.accuracy ?? s.accuracy_at_snapshot ?? 0) * 100).toFixed(1)}%</span>
                                )}
                                {s.brier_score !== null && (
                                  <span className="text-[10px] font-mono text-amber-500" title="Brier Score">B:{s.brier_score.toFixed(3)}</span>
                                )}
                                {s.home_win_rate !== null && (
                                  <span className="text-[10px] font-mono text-blue-400" title="Home Win Rate">HW:{(s.home_win_rate * 100).toFixed(0)}%</span>
                                )}
                                {delta?.accuracy_delta !== null && delta?.accuracy_delta !== undefined && (
                                  <span className={`text-[10px] font-mono flex items-center gap-0.5 ${
                                    delta.accuracy_delta > 0 ? "text-green-500" : delta.accuracy_delta < 0 ? "text-red-500" : "text-muted-foreground"
                                  }`} data-testid={`text-snapshot-delta-${s.version.slice(0, 15)}`}>
                                    {delta.accuracy_delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta.accuracy_delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                    {delta.accuracy_delta > 0 ? "+" : ""}{(delta.accuracy_delta * 100).toFixed(2)}%
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{formatDate(s.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No snapshot data available</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            {metricsLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading audit data...</CardContent></Card>
            ) : metrics?.auditTrail ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Audit Trail Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Entries</span>
                        <span className="font-mono font-bold">{metrics.auditTrail.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Unique Users</span>
                        <span className="font-mono font-bold">{metrics.auditTrail.uniqueUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Oldest Entry</span>
                        <span className="text-xs text-muted-foreground">{formatDate(metrics.auditTrail.timeRange.oldest)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Newest Entry</span>
                        <span className="text-xs text-muted-foreground">{formatDate(metrics.auditTrail.timeRange.newest)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Actions Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(metrics.auditTrail.actionCounts).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No audit data yet</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                          {Object.entries(metrics.auditTrail.actionCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([action, count], i) => (
                              <div key={i} className="flex items-center justify-between text-sm py-0.5">
                                <span className="truncate max-w-[200px]">{action.replace(/_/g, " ")}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">{count}</Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Persistent Audit Trail Active</p>
                        <p className="text-xs text-muted-foreground">All audit entries are now stored in PostgreSQL. Data survives server restarts and provides a complete historical record for compliance and debugging.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No audit trail data available</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

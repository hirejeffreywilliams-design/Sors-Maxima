import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Activity, Target, ShieldCheck,
  Database, AlertTriangle, CheckCircle2, Info, BarChart3,
  Scale, Home, Plane, Crosshair
} from "lucide-react";

interface ModelIntegrityData {
  stats: {
    overall: { total: number; won: number; lost: number; push: number; rate: number; pending: number };
    bySport: Record<string, { total: number; won: number; rate: number }>;
    byMarket: Record<string, { total: number; won: number; rate: number; roi: number }>;
    byGrade: Record<string, { total: number; won: number; rate: number }>;
    recentForm: { won: number; lost: number; push: number; rate: number };
    roi: number;
    brierScore: number | null;
    maxDrawdown: number;
    sharpeRatio: number | null;
    homeAwayBias: { homeWinRate: number; awayWinRate: number; homeTotal: number; awayTotal: number };
    calibrationBuckets: Array<{ range: string; predicted: number; actual: number; total: number }>;
  };
  adjudicationRules: Array<{ event: string; rule: string }>;
  dataProvenance: Array<{ source: string; use: string; official: boolean }>;
  antiLeakageStatement: string[];
  timestamp: string;
}

function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground", suffix = "" }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string; suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold font-mono mt-0.5 ${color}`}>{value}{suffix}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`w-4 h-4 shrink-0 mt-1 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function CalibrationBar({ range, predicted, actual, total }: {
  range: string; predicted: number; actual: number; total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-12 shrink-0">{range}%</span>
        <div className="flex-1 h-5 rounded bg-muted/30 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">No data</span>
        </div>
        <span className="text-[10px] text-muted-foreground w-8 text-right">0</span>
      </div>
    );
  }
  const gap = actual - predicted;
  const barActual = Math.max(0, Math.min(100, actual));
  const barPredicted = Math.max(0, Math.min(100, predicted));
  const color = Math.abs(gap) < 5 ? "bg-emerald-500" : gap > 0 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-12 shrink-0">{range}%</span>
      <div className="flex-1 relative h-5 rounded bg-muted/30 overflow-hidden">
        <div className={`h-full ${color} opacity-70 rounded`} style={{ width: `${barActual}%` }} />
        <div className="absolute top-0 h-full w-px bg-foreground/50" style={{ left: `${barPredicted}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
          {actual.toFixed(1)}% actual vs {predicted.toFixed(1)}% expected
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right">{total}</span>
    </div>
  );
}

export default function AdminModelIntegrity() {
  const { data, isLoading } = useQuery<ModelIntegrityData>({
    queryKey: ["/api/admin/model-integrity"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (!data) return null;

  const { stats, adjudicationRules, dataProvenance, antiLeakageStatement } = data;

  const roiColor = stats.roi > 0 ? "text-emerald-500" : stats.roi < 0 ? "text-red-500" : "text-muted-foreground";
  const brierLabel = stats.brierScore === null ? "N/A"
    : stats.brierScore < 0.15 ? "Excellent" : stats.brierScore < 0.20 ? "Good"
    : stats.brierScore < 0.25 ? "Fair" : "Needs Work";
  const brierColor = stats.brierScore === null ? "text-muted-foreground"
    : stats.brierScore < 0.15 ? "text-emerald-500" : stats.brierScore < 0.20 ? "text-blue-500"
    : stats.brierScore < 0.25 ? "text-amber-500" : "text-red-500";

  const sortedMarkets = Object.entries(stats.byMarket || {})
    .sort(([, a], [, b]) => b.total - a.total);

  const sortedSports = Object.entries(stats.bySport || {})
    .sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Model Integrity & Audit Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live model performance metrics, calibration analysis, and adjudication rules. All values computed from real settled picks.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Overall ROI (per unit)"
            value={stats.roi > 0 ? `+${stats.roi}` : `${stats.roi}`}
            suffix="%"
            sub={`${stats.overall.total} settled picks`}
            icon={TrendingUp}
            color={roiColor}
          />
          <MetricCard
            label="Brier Score"
            value={stats.brierScore !== null ? stats.brierScore.toFixed(4) : "N/A"}
            sub={brierLabel + " (lower is better, perfect=0)"}
            icon={Crosshair}
            color={brierColor}
          />
          <MetricCard
            label="Max Drawdown"
            value={stats.maxDrawdown > 0 ? `-${stats.maxDrawdown}` : "0"}
            suffix="%"
            sub="Worst peak-to-trough bankroll drop"
            icon={TrendingDown}
            color={stats.maxDrawdown > 20 ? "text-red-500" : stats.maxDrawdown > 10 ? "text-amber-500" : "text-emerald-500"}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(3) : "N/A"}
            sub="Risk-adjusted return (higher is better)"
            icon={Activity}
            color={stats.sharpeRatio !== null && stats.sharpeRatio > 0 ? "text-emerald-500" : "text-muted-foreground"}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Market-Type Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedMarkets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No settled picks yet.</p>
              ) : sortedMarkets.map(([market, m]) => (
                <div key={market} className="flex items-center gap-2" data-testid={`market-row-${market}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{market}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${m.roi > 0 ? "text-emerald-500" : m.roi < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          ROI: {m.roi > 0 ? "+" : ""}{m.roi}%
                        </span>
                        <span className="text-xs text-muted-foreground">{m.rate}% W</span>
                        <span className="text-[10px] text-muted-foreground">({m.total})</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded"
                        style={{ width: `${Math.max(2, m.rate)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                Home / Away Bias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.homeAwayBias.homeTotal === 0 && stats.homeAwayBias.awayTotal === 0 ? (
                <p className="text-xs text-muted-foreground">Not enough data yet.</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1"><Home className="w-3 h-3" /> Home picks</span>
                      <span className="font-mono">{stats.homeAwayBias.homeWinRate}% ({stats.homeAwayBias.homeTotal} bets)</span>
                    </div>
                    <div className="h-2 rounded bg-muted/40 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded" style={{ width: `${Math.max(2, stats.homeAwayBias.homeWinRate)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1"><Plane className="w-3 h-3" /> Away picks</span>
                      <span className="font-mono">{stats.homeAwayBias.awayWinRate}% ({stats.homeAwayBias.awayTotal} bets)</span>
                    </div>
                    <div className="h-2 rounded bg-muted/40 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded" style={{ width: `${Math.max(2, stats.homeAwayBias.awayWinRate)}%` }} />
                    </div>
                  </div>
                  {Math.abs(stats.homeAwayBias.homeWinRate - stats.homeAwayBias.awayWinRate) > 10 && (
                    <div className="flex items-start gap-1.5 rounded bg-amber-500/10 border border-amber-500/20 p-2">
                      <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        Significant home/away gap detected ({Math.abs(stats.homeAwayBias.homeWinRate - stats.homeAwayBias.awayWinRate).toFixed(1)}%). 
                        Consider reviewing model bias toward home/away teams.
                      </p>
                    </div>
                  )}
                  {Math.abs(stats.homeAwayBias.homeWinRate - stats.homeAwayBias.awayWinRate) <= 10 && stats.homeAwayBias.homeTotal > 0 && (
                    <p className="text-[10px] text-emerald-500">No significant home/away bias detected.</p>
                  )}
                </>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-2">Win Rate by Sport</p>
                <div className="space-y-1">
                  {sortedSports.slice(0, 6).map(([sport, s]) => (
                    <div key={sport} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-muted-foreground truncate">{sport}</span>
                      <div className="flex-1 h-1.5 rounded bg-muted/40 overflow-hidden">
                        <div className="h-full bg-primary/70 rounded" style={{ width: `${Math.max(2, s.rate)}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono text-muted-foreground">{s.rate}% ({s.total})</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Calibration Reliability
              <Badge variant="outline" className="text-[10px]">Confidence bucket vs actual win rate</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[11px] text-muted-foreground mb-3">
              A well-calibrated model's actual win rate should closely match the predicted probability. The vertical line shows the predicted rate; the bar shows actual.
              Green = well calibrated (&lt;5% gap), blue = overperforming, amber = underperforming.
            </p>
            {stats.calibrationBuckets?.map(b => (
              <CalibrationBar key={b.range} {...b} />
            ))}
            {(!stats.calibrationBuckets || stats.calibrationBuckets.every(b => b.total === 0)) && (
              <p className="text-xs text-muted-foreground">Calibration data will populate as picks settle.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Adjudication Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These rules govern how edge cases are handled during automated pick settlement. Consistent application of these rules ensures the win rate is not inflated.
            </p>
            <div className="space-y-2">
              {adjudicationRules.map((r, i) => (
                <div key={i} className="flex items-start gap-2 rounded border p-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{r.event}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Data Sources & Provenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dataProvenance.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 shrink-0 mt-0.5 ${d.official ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"}`}
                  >
                    {d.official ? "Official" : "Partner"}
                  </Badge>
                  <div>
                    <p className="text-xs font-medium">{d.source}</p>
                    <p className="text-[11px] text-muted-foreground">{d.use}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Anti-Leakage Guarantees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-[11px] text-muted-foreground mb-2">
                These statements confirm that no future information influences pre-game predictions:
              </p>
              {antiLeakageStatement.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground">{s}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Metric Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                { term: "ROI (Return on Investment)", def: "Average units won per unit bet. Positive = profitable. Assumes 1 unit per pick, standard vig odds." },
                { term: "Brier Score", def: "Calibration metric: mean squared difference between predicted probability and actual outcome. 0 = perfect, 0.25 = random." },
                { term: "Max Drawdown", def: "Largest peak-to-trough drop in simulated 100-unit bankroll. Measures worst-case loss streak risk." },
                { term: "Sharpe Ratio", def: "Mean return divided by standard deviation of returns. Higher = more consistent. Negative = inconsistent losses." },
                { term: "Calibration buckets", def: "Groups picks by confidence tier and compares predicted win rate to actual win rate. Reveals model over/under-confidence." },
                { term: "Home/Away bias", def: "Tracks whether the model systematically favors home or away teams. Significant gaps (>10%) suggest systematic bias." },
              ].map(({ term, def }) => (
                <div key={term} className="text-[11px]">
                  <span className="font-medium">{term}: </span>
                  <span className="text-muted-foreground">{def}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

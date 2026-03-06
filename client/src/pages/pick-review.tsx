import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, AlertCircle, XCircle, TrendingUp, Wallet,
  ChevronDown, ChevronUp, Loader2, RefreshCw, ShieldAlert, Info
} from "lucide-react";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSEO } from "@/hooks/use-seo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewPick {
  id: string;
  sport: string;
  game: string;
  pick: string;
  betType: string;
  odds: number;
  grade: string;
  ev: number;
  confidence: number;
  modelProb: number;
  marketProb: number;
  edgePct: number;
  kellyPct: number;
  suggestedStake: number;
  riskScore: number;
  flags: string[];
  rationale: string;
  status: "auto_approved" | "review" | "skip";
  factors?: { name: string; impact: number; direction: string }[];
}

interface QueueData {
  picks: ReviewPick[];
  bankroll: number;
  kellyFraction: number;
  calibrationDrift: boolean;
  perBetCap: number;
  dailyCap: number;
}

interface BankrollSettings {
  bankroll: number;
  kellyFraction: number;
  dailyCapPct: number;
}

function flagLabel(flag: string): string {
  const map: Record<string, string> = {
    low_edge: "Low Edge",
    stake_cap: "Stake Cap",
    calibration_drift: "Model Drift",
    negative_ev: "Negative EV",
  };
  return map[flag] ?? flag;
}

function gradeColor(grade: string): string {
  if (grade?.startsWith("A")) return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  if (grade?.startsWith("B")) return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (grade?.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
}

function SignalCard({
  pick, skipped, onPlace, onSkip,
}: {
  pick: ReviewPick; skipped: boolean; onPlace: () => void; onSkip: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const edgeColor = pick.edgePct >= 5 ? "text-green-500" : pick.edgePct >= 0 ? "text-yellow-500" : "text-red-500";

  if (skipped) return null;

  return (
    <Card
      className="border"
      data-testid={`signal-card-${pick.id}`}
    >
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">{pick.sport} · {pick.game}</p>
            <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{pick.pick}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-[9px] h-5 px-1.5 ${gradeColor(pick.grade)}`}>
              {pick.grade}
            </Badge>
            <span className="text-sm font-bold font-mono">{pick.odds > 0 ? "+" : ""}{pick.odds}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-muted/40 rounded-lg py-2 px-1">
          <div>
            <p className="font-mono font-bold text-foreground">{pick.modelProb}%</p>
            <p className="text-muted-foreground">Model</p>
          </div>
          <div>
            <p className="font-mono font-bold text-foreground">{pick.marketProb}%</p>
            <p className="text-muted-foreground">Market</p>
          </div>
          <div>
            <p className={`font-mono font-bold ${edgeColor}`}>{pick.edgePct >= 0 ? "+" : ""}{pick.edgePct.toFixed(1)}%</p>
            <p className="text-muted-foreground">Edge</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            Kelly <span className="font-mono font-semibold text-foreground">{pick.kellyPct.toFixed(1)}%</span>
          </span>
          <span className="text-muted-foreground">
            Suggested <span className="font-mono font-semibold text-green-600 dark:text-green-400">${pick.suggestedStake.toFixed(2)}</span>
          </span>
          <span className="text-muted-foreground">
            EV <span className={`font-mono font-semibold ${pick.ev >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{pick.ev >= 0 ? "+" : ""}{pick.ev.toFixed(1)}%</span>
          </span>
        </div>

        {pick.flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pick.flags.map(f => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                {flagLabel(f)}
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic leading-tight">{pick.rationale}</p>

        {pick.factors && pick.factors.length > 0 && (
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            Top factors {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {expanded && pick.factors && (
          <div className="space-y-0.5">
            {pick.factors.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground truncate max-w-[180px]">{f.name.replace(/_/g, " ")}</span>
                <span className={`font-mono font-semibold ${f.direction === "bullish" ? "text-green-500" : "text-red-500"}`}>
                  {f.direction === "bullish" ? "+" : "-"}{f.impact}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-0.5">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onPlace}
            data-testid={`btn-place-${pick.id}`}
          >
            Add to Slip
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-3"
            onClick={onSkip}
            data-testid={`btn-skip-${pick.id}`}
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AutoApprovedRow({ pick }: { pick: ReviewPick }) {
  const { addLeg, setMobileOpen } = useParlaySlip();
  const { toast } = useToast();

  const handleAdd = () => {
    const leg: ParlaySlipLeg = {
      id: pick.id,
      team: pick.pick || pick.game?.split(" vs ")?.[0] || "Pick",
      opponent: pick.game?.split(" vs ")?.[1] || "",
      outcome: pick.pick,
      odds: pick.odds,
      sport: pick.sport,
      ev: pick.ev,
      grade: pick.grade,
      confidence: pick.confidence,
    };
    addLeg(leg);
    setMobileOpen(true);
    toast({ title: "Added to slip", description: `${pick.pick} added`, duration: 3000 });
  };

  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-green-500/5 border border-green-500/20 text-sm" data-testid={`signal-card-${pick.id}`}>
      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block text-xs">{pick.pick}</span>
        <span className="text-[10px] text-muted-foreground">{pick.sport} · Edge: +{pick.edgePct.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-green-600 dark:text-green-400 font-mono">${pick.suggestedStake.toFixed(0)}</span>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleAdd} data-testid={`btn-place-${pick.id}`}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default function PickReviewPage() {
  useSEO({ title: "Smart Pick Review — Sors Maxima", description: "Risk-scored picks with Kelly stake guidance" });

  const [bankrollInput, setBankrollInput] = useState("");
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const { addLeg, setMobileOpen } = useParlaySlip();
  const { toast } = useToast();

  const { data: bankrollSettings } = useQuery<BankrollSettings>({
    queryKey: ["/api/settings/bankroll"],
  });

  const { data: queue, isLoading, refetch } = useQuery<QueueData>({
    queryKey: ["/api/picks/review-queue"],
    staleTime: 60000,
  });

  const updateBankroll = useMutation({
    mutationFn: (bankroll: number) =>
      apiRequest("PATCH", "/api/settings/bankroll", { bankroll }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/bankroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/picks/review-queue"] });
      toast({ title: "Bankroll updated", duration: 2500 });
    },
    onError: () => toast({ title: "Failed to update bankroll", variant: "destructive" }),
  });

  const handleBankrollUpdate = () => {
    const val = parseFloat(bankrollInput);
    if (!isNaN(val) && val > 0) {
      updateBankroll.mutate(val);
      setBankrollInput("");
    }
  };

  const handlePlace = (pick: ReviewPick) => {
    const leg: ParlaySlipLeg = {
      id: pick.id,
      team: pick.pick || pick.game?.split(" vs ")?.[0] || "Pick",
      opponent: pick.game?.split(" vs ")?.[1] || "",
      outcome: pick.pick,
      odds: pick.odds,
      sport: pick.sport,
      ev: pick.ev,
      grade: pick.grade,
      confidence: pick.confidence,
    };
    addLeg(leg);
    setMobileOpen(true);
    toast({ title: "Added to slip", description: `${pick.pick} added to your bet slip`, duration: 3000 });
  };

  const handleSkip = (id: string) => {
    setSkippedIds(prev => new Set([...prev, id]));
  };

  const autoApproved = queue?.picks.filter(p => p.status === "auto_approved") ?? [];
  const review = queue?.picks.filter(p => p.status === "review" && !skippedIds.has(p.id)) ?? [];
  const skipped = queue?.picks.filter(p => p.status === "skip") ?? [];
  const currentBankroll = bankrollSettings?.bankroll ?? queue?.bankroll ?? 1000;

  return (
    <div className="min-h-full" data-testid="pick-review-page">
      <div className="max-w-screen-lg mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">

        <header>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Smart Pick Review</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Picks scored by edge, risk, and model confidence — with fractional Kelly stake guidance
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </header>

        <Card className="border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Current Bankroll</p>
                  <p className="text-lg font-bold font-mono">${currentBankroll.toLocaleString()}</p>
                </div>
                {queue && (
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>Per-bet cap: <span className="font-semibold text-foreground">${queue.perBetCap.toFixed(0)}</span></span>
                    <span>Daily cap: <span className="font-semibold text-foreground">${queue.dailyCap.toFixed(0)}</span></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Update bankroll ($)"
                  value={bankrollInput}
                  onChange={e => setBankrollInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleBankrollUpdate()}
                  className="h-8 text-sm w-36 sm:w-40"
                  min={1}
                  data-testid="bankroll-input"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleBankrollUpdate}
                  disabled={updateBankroll.isPending || !bankrollInput}
                >
                  {updateBankroll.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
                </Button>
              </div>
            </div>

            {queue?.calibrationDrift && (
              <div className="mt-3 flex items-start gap-2 text-[11px] rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Model calibration drift detected.</strong> Recent Brier score exceeds 0.25 threshold. Consider using reduced stakes until the model stabilizes.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {queue && (
          <div className="space-y-5">
            {autoApproved.length > 0 && (
              <section data-testid="auto-approved-section">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h2 className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Auto-Approved ({autoApproved.length})
                  </h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Low-risk picks with strong edge (≥5%) and positive EV — safe to act on immediately.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-1.5">
                  {autoApproved.map(p => <AutoApprovedRow key={p.id} pick={p} />)}
                </div>
              </section>
            )}

            {review.length > 0 && (
              <section data-testid="review-section">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Review Needed ({review.length})
                  </h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Picks with moderate risk flags — review rationale before placing. Add to slip or skip.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {review.map(p => (
                    <SignalCard
                      key={p.id}
                      pick={p}
                      skipped={skippedIds.has(p.id)}
                      onPlace={() => handlePlace(p)}
                      onSkip={() => handleSkip(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {skipped.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Low Confidence ({skipped.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {skipped.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-[10px] text-muted-foreground opacity-60">
                      <XCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.pick} — {p.sport}</span>
                      <span className="ml-auto font-mono">Edge {p.edgePct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {autoApproved.length === 0 && review.length === 0 && skipped.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No picks available right now</p>
                <p className="text-xs mt-1">Predictions refresh every 5 minutes. Check back soon.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-muted-foreground pt-2">
          Suggested stakes use fractional Kelly ({((bankrollSettings?.kellyFraction ?? 0.25) * 100).toFixed(0)}%).
          Hard cap: 10% bankroll per bet. Daily limit: 5% bankroll.
          Past performance does not guarantee future results.
        </div>
      </div>
    </div>
  );
}

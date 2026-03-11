import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Target, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Shield, 
  AlertTriangle, 
  Swords, 
  TrendingUp, 
  Flame, 
  Snowflake, 
  BarChart3,
  Dice5,
  Loader2,
  Check,
  Plus,
  Sparkles
} from "lucide-react";
import { useUserStrategy } from "@/hooks/use-user-strategy";
import { BETTING_STRATEGIES } from "@/lib/strategy-definitions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useParlaySlip } from "@/hooks/use-parlay-slip";

interface BacktestData {
  winRate: number;
  roi: number;
  totalPicks: number;
  wins: number;
  losses: number;
  bestSport: string;
  avgOdds: number;
  avgEV: number;
  sampleSize: number;
}

function StrategyRecordCard({ strategyStreak }: { strategyStreak: any }) {
  const [parlayModalOpen, setParlayModalOpen] = useState(false);
  const { activeStrategy, isActiveMode } = useUserStrategy();
  const { legs, addLeg } = useParlaySlip();
  const { toast } = useToast();

  const { data: autoParlayPicks, isLoading: isLoadingAutoParlay } = useQuery<{ picks: any[] }>({
    queryKey: ["/api/strategy/auto-picks", activeStrategy?.id, 4],
    enabled: !!activeStrategy && parlayModalOpen,
  });

  const handleAddAllToSlip = () => {
    if (!autoParlayPicks?.picks) return;
    
    let addedCount = 0;
    autoParlayPicks.picks.forEach(pick => {
      const legId = `coach-strat-${pick.id}`;
      if (!legs.some(l => l.id === legId)) {
        const decimalOdds = pick.odds < 0
          ? 1 + (100 / Math.abs(pick.odds))
          : 1 + (pick.odds / 100);
        const gameParts = (pick.game || "").split(" @ ");
        const parsedAway = gameParts[0]?.trim() || "";
        const parsedHome = gameParts[1]?.trim() || gameParts[0]?.trim() || "";
        const teamName = pick.homeTeam || parsedHome || pick.game || "";
        const opponentName = pick.awayTeam || parsedAway || "";

        addLeg({
          id: legId,
          team: teamName,
          opponent: opponentName,
          market: (pick.betType || "moneyline") as any,
          outcome: pick.pick || `${teamName} vs ${opponentName}`,
          decimalOdds,
          americanOdds: pick.odds,
          addedFrom: "Strategy Coach",
          addedAt: new Date().toISOString(),
          sport: pick.sport,
          confidence: pick.confidence,
          evPercent: pick.ev,
          grade: pick.grade,
          gameTime: pick.gameTime,
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({
        title: `${addedCount}-leg ${activeStrategy?.name} parlay added!`,
        description: "Review your legs in the parlay slip.",
      });
    }
    setParlayModalOpen(false);
  };

  const parlayOdds = useMemo(() => {
    if (!autoParlayPicks?.picks) return 1;
    return autoParlayPicks.picks.reduce((acc, pick) => {
      const decimal = pick.odds < 0
        ? 1 + (100 / Math.abs(pick.odds))
        : 1 + (pick.odds / 100);
      return acc * decimal;
    }, 1);
  }, [autoParlayPicks]);

  const americanParlayOdds = useMemo(() => {
    if (parlayOdds >= 2.0) {
      return Math.round((parlayOdds - 1) * 100);
    } else {
      return Math.round(-100 / (parlayOdds - 1));
    }
  }, [parlayOdds]);

  const formatOdds = (odds: number): string => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const gradeBg = (grade: string): string => {
    const g = grade.toUpperCase();
    if (g === "A+") return "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400";
    if (g.startsWith("A")) return "bg-emerald-500/12 border-emerald-500/35 text-emerald-600 dark:text-emerald-400";
    if (g === "B+") return "bg-teal-500/12 border-teal-500/35 text-teal-600 dark:text-teal-400";
    if (g.startsWith("B")) return "bg-indigo-500/12 border-indigo-500/35 text-indigo-600 dark:text-indigo-400";
    if (g.startsWith("C")) return "bg-yellow-500/12 border-yellow-500/35 text-yellow-600 dark:text-yellow-400";
    return "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-3">
      <Button 
        variant="default" 
        className="w-full h-9 gap-2 shadow-sm bg-primary/90 hover:bg-primary"
        onClick={() => setParlayModalOpen(true)}
        data-testid="button-coach-build-parlay"
      >
        <Dice5 className="w-4 h-4" />
        Build My Parlay
      </Button>

      <Dialog open={parlayModalOpen} onOpenChange={setParlayModalOpen}>
        <DialogContent className="max-w-md" data-testid="modal-auto-parlay">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sors built a parlay for you
            </DialogTitle>
            <DialogDescription>
              Based on your active <strong>{activeStrategy?.name}</strong> strategy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoadingAutoParlay ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing elite edges...</p>
              </div>
            ) : autoParlayPicks?.picks && autoParlayPicks.picks.length > 0 ? (
              <>
                <div className="space-y-2">
                  {autoParlayPicks.picks.map((pick, i) => (
                    <div key={pick.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <span className="text-xs font-bold text-muted-foreground w-4">L{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{pick.pick}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{pick.game}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold">{formatOdds(pick.odds)}</p>
                        <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${gradeBg(pick.grade)}`}>{pick.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Combined Odds</p>
                    <p className="text-2xl font-mono font-black text-primary">{americanParlayOdds > 0 ? "+" : ""}{americanParlayOdds}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Potential Payout</p>
                    <p className="text-sm font-medium text-foreground">{(parlayOdds).toFixed(2)}x Return</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-sm font-medium">No suitable legs found right now.</p>
                <p className="text-xs text-muted-foreground">Try again in a few minutes or adjust your strategy.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setParlayModalOpen(false)}>Cancel</Button>
            <Button 
              className="flex-1" 
              disabled={!autoParlayPicks?.picks || autoParlayPicks.picks.length === 0}
              onClick={handleAddAllToSlip}
              data-testid="button-add-auto-parlay"
            >
              Add All to Slip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(!strategyStreak || strategyStreak.totalBets < 3) ? (
        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-center gap-1">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Strategy Progress</p>
          <p className="text-[11px] text-muted-foreground">Track at least 3 bets to see your performance metrics.</p>
          <Link href="/track-record">
            <a className="text-[11px] text-primary hover:underline font-medium">Go to Bet Tracker →</a>
          </Link>
        </div>
      ) : (
        <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Strategy Record</p>
            <Badge 
              variant={strategyStreak.winRate >= 52 ? "default" : strategyStreak.winRate >= 48 ? "secondary" : "outline"}
              className="text-[10px] h-4 px-1"
            >
              {strategyStreak.winRate}% Win Rate
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Record</p>
              <p className="text-sm font-bold">{strategyStreak.wins}-{strategyStreak.losses}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">ROI</p>
              <p className={cn("text-sm font-bold", strategyStreak.roi > 0 ? "text-emerald-500" : strategyStreak.roi < 0 ? "text-red-500" : "")}>
                {strategyStreak.roi > 0 ? "+" : ""}{strategyStreak.roi}%
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Streak</p>
              <div className="flex items-center gap-1">
                {strategyStreak.streakType === "win" ? (
                  <Flame className="w-3 h-3 text-orange-500" />
                ) : strategyStreak.streakType === "loss" ? (
                  <Snowflake className="w-3 h-3 text-blue-500" />
                ) : null}
                <p className="text-sm font-bold">
                  {strategyStreak.streakType === "win" ? "W" : strategyStreak.streakType === "loss" ? "L" : ""}{strategyStreak.streak || 0}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground italic">
            Since strategy was set on {new Date(strategyStreak.setAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

function StrategyCard({
  strategy,
  selected,
  onSelect,
}: {
  strategy: (typeof BETTING_STRATEGIES)[0];
  selected: boolean;
  onSelect: () => void;
}) {
  const { data: backtest, isLoading: loadingBacktest } = useQuery<BacktestData>({
    queryKey: ["/api/strategy/backtest", strategy.id],
    enabled: selected,
    staleTime: 600000, // 10 minutes
  });

  return (
    <div className="space-y-2">
      <button
        onClick={onSelect}
        data-testid={`button-strategy-${strategy.id}`}
        className={cn(
          "w-full text-left p-3 rounded-lg border transition-all",
          selected
            ? "border-primary bg-primary/8 shadow-sm"
            : "border-border hover:border-primary/40 hover:bg-muted/40"
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5">{strategy.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{strategy.name}</span>
              {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
              {strategy.tier && (
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1 uppercase font-bold tracking-tight">
                  {strategy.tier}
                </Badge>
              )}
              {strategy.sportFilter && (
                <Badge variant="outline" className="text-[9px] h-3.5 px-1 uppercase">
                  {strategy.sportFilter}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{strategy.tagline}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {strategy.rules.map((r, i) => (
                <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {selected && (
        <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {loadingBacktest ? (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 rounded-md" />)}
            </div>
          ) : backtest ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-muted/30 p-1.5 rounded-md text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Win Rate</p>
                  <p className={cn(
                    "text-xs font-bold",
                    backtest.winRate > 52 ? "text-emerald-500" : backtest.winRate >= 48 ? "text-amber-500" : "text-destructive"
                  )}>
                    {backtest.winRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-muted/30 p-1.5 rounded-md text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">ROI</p>
                  <p className={cn(
                    "text-xs font-bold",
                    backtest.roi > 0 ? "text-emerald-500" : "text-destructive"
                  )}>
                    {backtest.roi > 0 ? "+" : ""}{backtest.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-muted/30 p-1.5 rounded-md text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Best Sport</p>
                  <p className="text-xs font-bold truncate">{backtest.bestSport || "All"}</p>
                </div>
                <div className="bg-muted/30 p-1.5 rounded-md text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Picks</p>
                  <p className="text-xs font-bold">{backtest.sampleSize}</p>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/60 italic text-center">
                Based on Sors model history
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


export function StrategyCoach() {
  const { userStrategy, activeStrategy, setStrategy, clearStrategy, isActiveMode } = useUserStrategy();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeMode = isActiveMode();

  const handleToggleActiveMode = (checked: boolean) => {
    if (!activeStrategy) return;
    setStrategy.mutate(
      { 
        strategyId: activeStrategy.id, 
        strategyName: activeStrategy.name, 
        constraints: { ...userStrategy?.constraints, activeMode: checked } 
      },
      {
        onSuccess: () => {
          toast({ 
            title: checked ? "Strategy Mode Active" : "Strategy Mode Disabled", 
            description: checked ? "Only strategy-aligned picks will be featured." : "Full market access restored." 
          });
        },
        onError: () => toast({ title: "Failed to toggle mode", variant: "destructive" }),
      }
    );
  };

  const handleSave = () => {
    if (!selectedId) return;
    const s = BETTING_STRATEGIES.find(s => s.id === selectedId);
    if (!s) return;
    setStrategy.mutate(
      { strategyId: s.id, strategyName: s.name, constraints: {} },
      {
        onSuccess: () => {
          toast({ title: `Strategy set: ${s.name}`, description: s.tagline });
          setPickerOpen(false);
          setSelectedId(null);
        },
        onError: () => toast({ title: "Couldn't save strategy", variant: "destructive" }),
      }
    );
  };

  const handleClear = () => {
    clearStrategy.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Strategy cleared", description: "No active strategy — all picks are available" });
        setClearConfirmOpen(false);
      },
    });
  };

  const StrategyRecord = () => {
    const { data: streak } = useQuery({
      queryKey: ["/api/user/strategy/streak"],
      enabled: !!activeStrategy,
    });

    return <StrategyRecordCard strategyStreak={streak} />;
  };

  return (
    <>
      <Card data-testid="card-strategy-coach">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" />
            Strategy Accountability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeStrategy ? (
            <>
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl leading-none">{activeStrategy.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{activeStrategy.name}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">Active</Badge>
                      {activeMode && (
                        <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">Active Mode</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeStrategy.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="active-mode-toggle" className="text-xs font-semibold">Active Mode</Label>
                    <p className="text-[10px] text-muted-foreground leading-tight">Focus command center on strategy picks</p>
                  </div>
                  <Switch 
                    id="active-mode-toggle"
                    checked={activeMode}
                    onCheckedChange={handleToggleActiveMode}
                    disabled={setStrategy.isPending}
                    data-testid="switch-active-mode"
                  />
                </div>

                <Separator className="my-3 opacity-50" />

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your Rules</p>
                  {activeStrategy.rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>

                {userStrategy && userStrategy.overrideCount > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{userStrategy.overrideCount} strategy override{userStrategy.overrideCount > 1 ? "s" : ""} this session</span>
                  </div>
                )}
              </div>

              <StrategyRecord />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => { setSelectedId(activeStrategy.id); setPickerOpen(true); }}
                  data-testid="button-change-strategy"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Change Strategy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setClearConfirmOpen(true)}
                  data-testid="button-clear-strategy"
                >
                  <XCircle className="w-3 h-3 mr-1.5" />
                  Clear
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set a strategy and the app will hold you accountable to it — warning you any time you try to add a pick that breaks your own rules.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                {[
                  { icon: "🎯", text: "Picks checked against your rules" },
                  { icon: "⚠️", text: "Warnings when you go off-plan" },
                  { icon: "📈", text: "Build consistent habits" },
                  { icon: "🔒", text: "You control when rules change" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full h-9"
                onClick={() => setPickerOpen(true)}
                data-testid="button-pick-strategy"
              >
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Choose My Strategy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-strategy-picker">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              Choose Your Strategy
            </DialogTitle>
            <DialogDescription>
              Pick the approach that matches your goals. You can change it at any time, but the app will hold you to it until you do.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-1">
            {BETTING_STRATEGIES.map(s => (
              <StrategyCard
                key={s.id}
                strategy={s}
                selected={selectedId === s.id}
                onSelect={() => setSelectedId(selectedId === s.id ? null : s.id)}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setPickerOpen(false); setSelectedId(null); }}
              data-testid="button-cancel-strategy"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedId || setStrategy.isPending}
              onClick={handleSave}
              data-testid="button-confirm-strategy"
            >
              {setStrategy.isPending ? "Saving..." : "Lock In Strategy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent data-testid="dialog-clear-strategy">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your strategy?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose your current strategy accountability settings. All picks will be available again with no filters applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Keep Strategy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} data-testid="button-confirm-clear">
              Clear Strategy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function StrategyBadge({ compact = false }: { compact?: boolean }) {
  const { activeStrategy } = useUserStrategy();
  if (!activeStrategy) return null;

  if (compact) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 px-1.5 border-primary/30 text-primary gap-1"
        data-testid="badge-strategy-active"
      >
        <Shield className="w-2.5 h-2.5" />
        {activeStrategy.name}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/8 border border-primary/20 text-xs" data-testid="banner-strategy-active">
      <span>{activeStrategy.icon}</span>
      <span className="font-medium text-primary">{activeStrategy.name}</span>
      <span className="text-muted-foreground">mode active</span>
      <Shield className="w-3 h-3 text-primary ml-auto" />
    </div>
  );
}

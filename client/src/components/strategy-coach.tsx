import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Target, ChevronRight, CheckCircle2, XCircle, RefreshCw, Shield, AlertTriangle, Swords } from "lucide-react";
import { useUserStrategy } from "@/hooks/use-user-strategy";
import { BETTING_STRATEGIES } from "@/lib/strategy-definitions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function StrategyCard({
  strategy,
  selected,
  onSelect,
}: {
  strategy: (typeof BETTING_STRATEGIES)[0];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
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
  );
}

export function StrategyCoach() {
  const { userStrategy, activeStrategy, setStrategy, clearStrategy } = useUserStrategy();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeStrategy.description}</p>
                  </div>
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

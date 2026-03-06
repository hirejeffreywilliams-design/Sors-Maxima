import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Play,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResolveStep {
  order: number;
  action: string;
  detail: string;
  automated: boolean;
  actionKey?: string;
}

interface AutomatedAction {
  key: string;
  label: string;
  description: string;
  dangerous?: boolean;
}

interface ResolveResult {
  priority: "critical" | "high" | "medium" | "low";
  rootCause: string;
  explanation: string;
  steps: ResolveStep[];
  automatedActions: AutomatedAction[];
  followUp: string;
  estimatedResolutionTime: string;
  generatedAt: string;
}

interface AdminAIResolveProps {
  category: string;
  issue: string;
  metrics?: Record<string, unknown>;
  context?: string;
  severity?: "critical" | "high" | "medium" | "low";
  label?: string;
  compact?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40 dark:text-yellow-400",
  low: "bg-blue-500/15 text-blue-600 border-blue-500/40 dark:text-blue-400",
};

export function AdminAIResolve({
  category,
  issue,
  metrics,
  context,
  severity,
  label = "AI Resolve",
  compact = false,
  variant = "outline",
}: AdminAIResolveProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-resolve", {
        category,
        issue,
        metrics,
        context,
        severity,
      });
      return res.json() as Promise<ResolveResult>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      toast({ title: "AI analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const executeActionMutation = useMutation({
    mutationFn: async (actionKey: string) => {
      setExecutingAction(actionKey);
      const res = await apiRequest("POST", "/api/admin/execute-action", { actionKey });
      return res.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: (data, actionKey) => {
      setCompletedActions(prev => new Set([...Array.from(prev), actionKey]));
      setExecutingAction(null);
      toast({ title: "Action completed", description: data.message });
    },
    onError: (err: Error) => {
      setExecutingAction(null);
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const handleOpen = () => {
    setOpen(true);
    if (!result) {
      resolveMutation.mutate();
    }
  };

  const priorityColor = result ? PRIORITY_COLORS[result.priority] ?? PRIORITY_COLORS.medium : "";

  return (
    <>
      <Button
        size={compact ? "sm" : "sm"}
        variant={variant}
        onClick={handleOpen}
        className={compact ? "h-7 px-2 text-xs gap-1" : "gap-1.5"}
        data-testid={`button-ai-resolve-${category.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <Bot className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              AI Resolution Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              {category} · {issue.length > 80 ? issue.slice(0, 80) + "…" : issue}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {resolveMutation.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <Loader2 className="h-4 w-4 text-primary absolute -bottom-1 -right-1 animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Analyzing issue with AI…</p>
                <p className="text-xs text-muted-foreground">Generating resolution steps</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 py-1">
                <div className="flex items-start gap-3 flex-wrap">
                  <Badge className={`${priorityColor} border text-xs capitalize`}>
                    {result.priority} priority
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Est. {result.estimatedResolutionTime}
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Root Cause
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.rootCause}</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                    Impact Analysis
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
                </div>

                {result.steps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5" />
                      Resolution Steps
                    </p>
                    {result.steps.map((step) => (
                      <div
                        key={step.order}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                          {step.order}
                        </span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-medium">{step.action}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{step.detail}</p>
                        </div>
                        {step.automated && (
                          <Badge variant="outline" className="text-[9px] px-1 shrink-0 border-primary/40 text-primary">
                            <Zap className="h-2 w-2 mr-0.5" />
                            Auto
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result.automatedActions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        One-Click Automated Fixes
                      </p>
                      <div className="space-y-2">
                        {result.automatedActions.map((action) => {
                          const isDone = completedActions.has(action.key);
                          const isRunning = executingAction === action.key;
                          return (
                            <div
                              key={action.key}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
                                isDone
                                  ? "bg-green-500/8 border-green-500/30"
                                  : action.dangerous
                                  ? "bg-red-500/5 border-red-500/20"
                                  : "bg-muted/30"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{action.label}</p>
                                <p className="text-[11px] text-muted-foreground">{action.description}</p>
                              </div>
                              {isDone ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <Button
                                  size="sm"
                                  variant={action.dangerous ? "destructive" : "default"}
                                  className="h-7 px-2 text-xs shrink-0 gap-1"
                                  onClick={() => executeActionMutation.mutate(action.key)}
                                  disabled={isRunning || executeActionMutation.isPending}
                                  data-testid={`button-execute-${action.key}`}
                                >
                                  {isRunning ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  {isRunning ? "Running…" : "Execute"}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                    After Resolution — Monitor
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{result.followUp}</p>
                </div>

                <p className="text-[10px] text-muted-foreground text-right">
                  Analysis generated at {new Date(result.generatedAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </ScrollArea>

          {result && (
            <div className="pt-3 border-t flex justify-between items-center">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs gap-1"
                onClick={() => { setResult(null); resolveMutation.mutate(); }}
                disabled={resolveMutation.isPending}
              >
                <Sparkles className="h-3 w-3" />
                Re-analyze
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

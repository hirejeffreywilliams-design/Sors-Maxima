import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";
import type { GeneratedTicket } from "@/lib/ticket-orchestrator";

interface StakeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: GeneratedTicket | null;
  onConfirm: (ticket: GeneratedTicket) => void;
}

function calculateLossScenarios(ticket: GeneratedTicket) {
  const stake = ticket.recommendedStake;
  const winProb = ticket.winProbability;
  const lossProb = 1 - winProb;

  const scenarios = [
    {
      label: "If this ticket loses",
      amount: stake,
      probability: lossProb,
      description: `${(lossProb * 100).toFixed(1)}% chance you lose your entire stake`,
    },
    {
      label: "Expected outcome over 100 similar bets",
      amount: ticket.expectedValue >= 0
        ? +(stake * ticket.expectedValue * 100).toFixed(2)
        : +(stake * ticket.expectedValue * 100).toFixed(2),
      probability: 1,
      description: ticket.expectedValue >= 0
        ? `Positive expected value: you'd expect to gain $${(stake * ticket.expectedValue * 100).toFixed(2)} total`
        : `Negative expected value: you'd expect to lose $${Math.abs(stake * ticket.expectedValue * 100).toFixed(2)} total`,
    },
    {
      label: "Worst-case losing streak (5 in a row)",
      amount: stake * 5,
      probability: Math.pow(lossProb, 5),
      description: `${(Math.pow(lossProb, 5) * 100).toFixed(2)}% chance of losing $${(stake * 5).toFixed(2)}`,
    },
  ];

  return scenarios;
}

function getRiskLevel(ticket: GeneratedTicket) {
  if (ticket.winProbability >= 0.5) return { level: "Low", color: "text-green-500", bgColor: "bg-green-500/10" };
  if (ticket.winProbability >= 0.3) return { level: "Medium", color: "text-yellow-500", bgColor: "bg-yellow-500/10" };
  return { level: "High", color: "text-red-500", bgColor: "bg-red-500/10" };
}

export function StakeConfirmationDialog({
  open,
  onOpenChange,
  ticket,
  onConfirm,
}: StakeConfirmationDialogProps) {
  const [step, setStep] = useState<"review" | "confirm">("review");

  if (!ticket) return null;

  const scenarios = calculateLossScenarios(ticket);
  const risk = getRiskLevel(ticket);

  const handleConfirm = () => {
    if (step === "review") {
      setStep("confirm");
      return;
    }
    onConfirm(ticket);
    setStep("review");
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep("review");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-confirm-title">
            {step === "review" ? (
              <>
                <Shield className="w-5 h-5 text-primary" />
                Review Before Placing
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Final Confirmation
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "Review the risk details before proceeding."
              : "Are you sure you want to place this bet?"}
          </DialogDescription>
        </DialogHeader>

        {step === "review" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Ticket</p>
                <p className="font-medium" data-testid="text-confirm-ticket-name">{ticket.name}</p>
              </div>
              <Badge className={risk.bgColor + " " + risk.color}>{risk.level} Risk</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Stake</p>
                <p className="text-lg font-bold" data-testid="text-confirm-stake">
                  ${ticket.recommendedStake.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Potential Win</p>
                <p className="text-lg font-bold text-green-500" data-testid="text-confirm-payout">
                  ${ticket.potentialPayout.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
                Loss Scenarios
              </p>
              {scenarios.map((scenario, idx) => (
                <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-1" data-testid={`loss-scenario-${idx}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">{scenario.label}</p>
                    <span className={`text-sm font-bold ${scenario.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                      {scenario.amount >= 0 ? "+" : "-"}${Math.abs(scenario.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{scenario.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Win Probability</span>
                <span className="font-medium">{(ticket.winProbability * 100).toFixed(1)}%</span>
              </div>
              <Progress value={ticket.winProbability * 100} className="h-2" />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Risk Warning</AlertTitle>
              <AlertDescription className="text-xs">
                This analysis is probabilistic and not a guarantee of results. 
                Only stake what you can afford to lose. Past performance does not predict future outcomes.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>You are about to place a bet</AlertTitle>
              <AlertDescription>
                <p className="mt-1">
                  Stake: <strong>${ticket.recommendedStake.toFixed(2)}</strong>
                </p>
                <p>
                  Loss probability: <strong>{((1 - ticket.winProbability) * 100).toFixed(1)}%</strong>
                </p>
                <p className="mt-2 text-xs">
                  Betting involves risk. Only bet with money you can afford to lose.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-stake">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            data-testid="button-confirm-stake"
          >
            {step === "review" ? (
              <>
                <DollarSign className="w-4 h-4" />
                Continue to Confirm
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                I Understand, Place Bet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

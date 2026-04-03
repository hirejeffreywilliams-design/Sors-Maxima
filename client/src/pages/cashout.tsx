import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign } from "lucide-react";
import { CashoutMaximizer } from "@/components/cashout-maximizer";
import { CashoutStrategiesEngine } from "@/components/live/cashout-strategies-engine";
import { TierGate, useTier } from "@/components/tier-gate";
import { useSEO } from "@/hooks/use-seo";

export default function CashoutPage() {
  useSEO({
    title: "Cashout Engineering | Sors Maxima",
    description: "Real-time cashout value analysis, optimal exit timing, and EV-adjusted cashout decisions.",
  });

  const { canAccess } = useTier();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/tools">
              <Button variant="ghost" size="sm" data-testid="button-back-tools">
                <ArrowLeft className="h-4 w-4 mr-1" /> Tools
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <DollarSign className="h-5 w-5 text-primary" /> Cashout Engineering
              </h1>
              <p className="text-sm text-muted-foreground">EV-optimized cashout timing, sweat-proof strategies & partial cashout ladders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {canAccess("whale")
          ? <CashoutMaximizer />
          : <TierGate
              required="whale"
              label="Cashout Maximizer"
              description="Real-time cashout value analysis with optimal exit timing recommendations and EV-adjusted cashout decisions."
            />
        }

        <CashoutStrategiesEngine />
      </div>
    </div>
  );
}

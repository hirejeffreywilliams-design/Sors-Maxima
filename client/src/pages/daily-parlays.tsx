import { useState } from "react";
import { DailyParlayGenerator } from "@/components/daily-parlay-generator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export default function DailyParlays() {
  const [bankroll, setBankroll] = useState(1000);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Daily Power Parlays
          </h1>
          <p className="text-muted-foreground">
            AI-generated 12-leg parlays optimized for maximum winning potential across all sports
          </p>
        </header>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="bankroll" className="whitespace-nowrap">Your Bankroll:</Label>
                <div className="relative w-32">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bankroll"
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(Number(e.target.value))}
                    className="pl-8"
                    min={100}
                    step={100}
                    data-testid="input-bankroll"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Stakes will be calculated based on 2% of your bankroll
              </p>
            </div>
          </CardContent>
        </Card>

        <DailyParlayGenerator bankroll={bankroll} />
      </div>
    </div>
  );
}

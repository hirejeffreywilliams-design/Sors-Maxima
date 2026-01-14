import { useState } from "react";
import { DailyParlayGenerator } from "@/components/daily-parlay-generator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export default function DailyParlays() {
  const [bankroll, setBankroll] = useState(1000);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Power Parlays</h1>
            <p className="text-sm text-muted-foreground">
              AI-generated 12-leg parlays across all sports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="bankroll" className="whitespace-nowrap text-sm">Bankroll:</Label>
            <div className="relative w-28">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bankroll"
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Number(e.target.value))}
                className="pl-7"
                min={100}
                step={100}
                data-testid="input-bankroll"
              />
            </div>
          </div>
        </header>

        <DailyParlayGenerator bankroll={bankroll} />
      </div>
    </div>
  );
}

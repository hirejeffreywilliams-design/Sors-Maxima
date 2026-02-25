import { BetTracker } from "@/components/bet-tracker";
import { useSEO } from "@/hooks/use-seo";

export default function BetHistory() {
  useSEO({ title: "Bet History", description: "View and analyze your past bets" });
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bet Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track your performance, CLV, and ROI
          </p>
        </header>
        
        <BetTracker />
      </div>
    </div>
  );
}

import { BetTracker } from "@/components/bet-tracker";

export default function BetHistory() {
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

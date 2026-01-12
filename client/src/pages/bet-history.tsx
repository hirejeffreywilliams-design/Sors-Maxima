import { BetTracker } from "@/components/bet-tracker";

export default function BetHistory() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bet Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your betting performance, CLV, and ROI across all sports
          </p>
        </header>
        
        <BetTracker />
      </div>
    </div>
  );
}
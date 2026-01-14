import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Building2, DollarSign, AlertTriangle, CheckCircle, Split, Calculator } from "lucide-react";

interface Sportsbook {
  name: string;
  limit: number;
  currentExposure: number;
  odds: number;
  fillProbability: number;
}

interface SplitRecommendation {
  book: string;
  amount: number;
  odds: number;
  ev: number;
  fillProb: number;
}

function calculateOptimalSplit(totalStake: number, books: Sportsbook[]): SplitRecommendation[] {
  const availableBooks = books.filter(b => b.limit - b.currentExposure > 0);
  const totalAvailable = availableBooks.reduce((sum, b) => sum + (b.limit - b.currentExposure), 0);
  
  if (totalAvailable < totalStake) {
    return availableBooks.map(b => ({
      book: b.name,
      amount: b.limit - b.currentExposure,
      odds: b.odds,
      ev: ((b.odds > 0 ? b.odds / 100 : 100 / Math.abs(b.odds)) * 0.52 - 1) * 100,
      fillProb: b.fillProbability,
    }));
  }

  const sortedBooks = [...availableBooks].sort((a, b) => {
    const evA = a.odds > 0 ? a.odds : 100 / Math.abs(a.odds) * 100;
    const evB = b.odds > 0 ? b.odds : 100 / Math.abs(b.odds) * 100;
    return evB - evA;
  });

  let remaining = totalStake;
  const splits: SplitRecommendation[] = [];

  for (const book of sortedBooks) {
    if (remaining <= 0) break;
    const available = book.limit - book.currentExposure;
    const allocation = Math.min(remaining, available);
    
    splits.push({
      book: book.name,
      amount: allocation,
      odds: book.odds,
      ev: ((book.odds > 0 ? book.odds / 100 : 100 / Math.abs(book.odds)) * 0.52 - 1) * 100,
      fillProb: book.fillProbability,
    });
    
    remaining -= allocation;
  }

  return splits;
}

export function BookLimitOptimizer() {
  const [totalStake, setTotalStake] = useState(5000);
  const [books, setBooks] = useState<Sportsbook[]>([
    { name: "DraftKings", limit: 2000, currentExposure: 500, odds: -108, fillProbability: 98 },
    { name: "FanDuel", limit: 3000, currentExposure: 1200, odds: -110, fillProbability: 99 },
    { name: "BetMGM", limit: 1500, currentExposure: 0, odds: -112, fillProbability: 95 },
    { name: "Caesars", limit: 2500, currentExposure: 800, odds: -105, fillProbability: 92 },
    { name: "PointsBet", limit: 1000, currentExposure: 200, odds: -115, fillProbability: 88 },
    { name: "BetRivers", limit: 800, currentExposure: 100, odds: -110, fillProbability: 90 },
  ]);

  const splits = calculateOptimalSplit(totalStake, books);
  const totalAllocated = splits.reduce((sum, s) => sum + s.amount, 0);
  const avgOdds = splits.reduce((sum, s) => sum + s.odds * s.amount, 0) / totalAllocated;
  const weightedFillProb = splits.reduce((sum, s) => sum + s.fillProb * s.amount, 0) / totalAllocated;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <span className="font-medium">Book Limit Optimizer</span>
        <Badge variant="outline">Multi-Book Staking</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Sportsbook Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Total Stake Needed</Label>
              <Input
                type="number"
                value={totalStake}
                onChange={(e) => setTotalStake(Number(e.target.value))}
                data-testid="input-total-stake"
              />
            </div>

            <div className="space-y-3">
              {books.map((book, i) => {
                const available = book.limit - book.currentExposure;
                const usagePercent = (book.currentExposure / book.limit) * 100;
                
                return (
                  <div key={book.name} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{book.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{book.odds > 0 ? "+" : ""}{book.odds}</Badge>
                        <Badge variant="outline" className="text-xs">{book.fillProbability}% fill</Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          ${book.currentExposure.toLocaleString()} / ${book.limit.toLocaleString()}
                        </span>
                        <span className={available > 0 ? "text-green-500" : "text-red-500"}>
                          ${available.toLocaleString()} available
                        </span>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Optimal Stake Split</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalAllocated < totalStake && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Insufficient Limits</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Can only place ${totalAllocated.toLocaleString()} of ${totalStake.toLocaleString()} requested
                </p>
              </div>
            )}

            <div className="space-y-2">
              {splits.map((split, i) => (
                <div 
                  key={split.book}
                  className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{split.book}</p>
                      <p className="text-xs text-muted-foreground">
                        {split.odds > 0 ? "+" : ""}{split.odds} • {split.fillProb}% fill
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${split.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-500">+{split.ev.toFixed(1)}% EV</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold">${totalAllocated.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Avg Odds</p>
                <p className="font-bold">{avgOdds.toFixed(0)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Fill Prob</p>
                <p className="font-bold text-green-500">{weightedFillProb.toFixed(0)}%</p>
              </div>
            </div>

            <Button className="w-full" data-testid="button-execute-split">
              <Split className="w-4 h-4 mr-2" />
              Generate Execution Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

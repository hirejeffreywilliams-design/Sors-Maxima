import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, DollarSign, AlertTriangle, CheckCircle, Split, Target, TrendingUp, Clock } from "lucide-react";

interface BookLimit {
  id: string;
  name: string;
  logo?: string;
  maxBetLimit: number;
  parlayLimit: number;
  currentUsage: number;
  available: number;
  status: "full" | "limited" | "available";
  fillProbability: number;
  avgDelay: number;
  notes: string;
}

interface StakePlan {
  bookId: string;
  bookName: string;
  amount: number;
  percentage: number;
  fillProbability: number;
  status: "confirmed" | "likely" | "risky";
}

interface BookLimitPlannerProps {
  desiredStake: number;
  onStakeChange?: (stake: number) => void;
}

function getBookLimits(): BookLimit[] {
  return [
    {
      id: "fanduel",
      name: "FanDuel",
      maxBetLimit: 5000,
      parlayLimit: 2500,
      currentUsage: Math.floor(Math.random() * 1000),
      available: 2500 - Math.floor(Math.random() * 1000),
      status: "available",
      fillProbability: 0.98,
      avgDelay: 0,
      notes: "High limits, instant acceptance",
    },
    {
      id: "draftkings",
      name: "DraftKings",
      maxBetLimit: 5000,
      parlayLimit: 2000,
      currentUsage: Math.floor(Math.random() * 800),
      available: 2000 - Math.floor(Math.random() * 800),
      status: "available",
      fillProbability: 0.95,
      avgDelay: 2,
      notes: "May review large parlays",
    },
    {
      id: "betmgm",
      name: "BetMGM",
      maxBetLimit: 3000,
      parlayLimit: 1500,
      currentUsage: Math.floor(Math.random() * 600),
      available: 1500 - Math.floor(Math.random() * 600),
      status: Math.random() > 0.7 ? "limited" : "available",
      fillProbability: 0.90,
      avgDelay: 5,
      notes: "Occasional limits on props",
    },
    {
      id: "caesars",
      name: "Caesars",
      maxBetLimit: 3500,
      parlayLimit: 1800,
      currentUsage: Math.floor(Math.random() * 700),
      available: 1800 - Math.floor(Math.random() * 700),
      status: "available",
      fillProbability: 0.92,
      avgDelay: 3,
      notes: "Good for player props",
    },
    {
      id: "pointsbet",
      name: "PointsBet",
      maxBetLimit: 2000,
      parlayLimit: 1000,
      currentUsage: Math.floor(Math.random() * 400),
      available: 1000 - Math.floor(Math.random() * 400),
      status: Math.random() > 0.5 ? "limited" : "available",
      fillProbability: 0.85,
      avgDelay: 8,
      notes: "Lower limits but good promos",
    },
    {
      id: "fanatics",
      name: "Fanatics",
      maxBetLimit: 2500,
      parlayLimit: 1200,
      currentUsage: Math.floor(Math.random() * 500),
      available: 1200 - Math.floor(Math.random() * 500),
      status: "available",
      fillProbability: 0.93,
      avgDelay: 2,
      notes: "Newer book, good acceptance",
    },
  ];
}

function createStakePlan(books: BookLimit[], desiredStake: number): StakePlan[] {
  const plan: StakePlan[] = [];
  let remainingStake = desiredStake;
  
  const sortedBooks = [...books]
    .filter(b => b.status !== "full" && b.available > 0)
    .sort((a, b) => b.fillProbability - a.fillProbability);
  
  for (const book of sortedBooks) {
    if (remainingStake <= 0) break;
    
    const allocation = Math.min(remainingStake, book.available * 0.9);
    if (allocation > 10) {
      plan.push({
        bookId: book.id,
        bookName: book.name,
        amount: allocation,
        percentage: (allocation / desiredStake) * 100,
        fillProbability: book.fillProbability,
        status: book.fillProbability > 0.95 ? "confirmed" : 
                book.fillProbability > 0.85 ? "likely" : "risky",
      });
      remainingStake -= allocation;
    }
  }
  
  return plan;
}

export function BookLimitPlanner({ desiredStake, onStakeChange }: BookLimitPlannerProps) {
  const [stake, setStake] = useState(desiredStake);
  const [showAllBooks, setShowAllBooks] = useState(false);

  const books = useMemo(() => getBookLimits(), []);
  const stakePlan = useMemo(() => createStakePlan(books, stake), [books, stake]);

  const totalAllocated = stakePlan.reduce((sum, p) => sum + p.amount, 0);
  const fillRate = stake > 0 ? (totalAllocated / stake) * 100 : 0;
  const avgFillProb = stakePlan.length > 0 && totalAllocated > 0
    ? stakePlan.reduce((sum, p) => sum + p.fillProbability * p.amount, 0) / totalAllocated
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "text-green-500";
      case "limited": return "text-yellow-500";
      case "full": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getPlanStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "likely": return "bg-yellow-500 text-black";
      case "risky": return "bg-red-500 text-white";
      default: return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Book Limit Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg border bg-muted/50">
          <Label htmlFor="desired-stake" className="text-sm font-medium">
            Desired Total Stake
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              id="desired-stake"
              type="number"
              value={stake}
              onChange={(e) => {
                const newStake = parseFloat(e.target.value) || 0;
                setStake(newStake);
                onStakeChange?.(newStake);
              }}
              className="flex-1"
              placeholder="Enter stake amount"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">${stake.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Desired</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Split className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-500">${totalAllocated.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Allocated</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{(avgFillProb * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Fill Rate</p>
          </div>
        </div>

        {fillRate < 100 && (
          <div className="p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Partial Fill Warning</p>
                <p className="text-sm text-muted-foreground">
                  Only ${totalAllocated.toFixed(0)} of ${stake.toFixed(0)} ({fillRate.toFixed(0)}%) can be 
                  allocated across available books. Consider reducing stake or waiting for limit resets.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Split className="h-4 w-4" />
            Execution Plan
          </h4>
          
          {stakePlan.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enter a stake amount to generate plan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stakePlan.map((plan, idx) => (
                <div key={plan.bookId} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{idx + 1}
                      </Badge>
                      <span className="font-medium">{plan.bookName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanStatusColor(plan.status)}>
                        {plan.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {plan.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>{" "}
                      <span className="font-medium">${plan.amount.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Share:</span>{" "}
                      <span className="font-medium">{plan.percentage.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fill:</span>{" "}
                      <span className="font-medium text-green-500">
                        {(plan.fillProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <Progress value={plan.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Book Status
            </h4>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowAllBooks(!showAllBooks)}
            >
              {showAllBooks ? "Show Less" : "Show All"}
            </Button>
          </div>
          
          <div className="space-y-2">
            {(showAllBooks ? books : books.slice(0, 3)).map((book) => (
              <div key={book.id} className="p-2 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{book.name}</span>
                    <span className={`text-xs ${getStatusColor(book.status)}`}>
                      {book.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    ${book.available.toFixed(0)} available
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Limit: ${book.parlayLimit}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {book.avgDelay}s avg delay
                  </span>
                  <span>{(book.fillProbability * 100).toFixed(0)}% fill</span>
                </div>
                
                <Progress 
                  value={(book.available / book.parlayLimit) * 100} 
                  className="h-1 mt-1" 
                />
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" data-testid="button-execute-split-plan">
          <Split className="h-4 w-4 mr-2" />
          Execute Split Stake Plan
        </Button>
      </CardContent>
    </Card>
  );
}

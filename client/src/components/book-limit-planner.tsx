import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, DollarSign, AlertTriangle, CheckCircle, Split, Target, TrendingUp, Plus, Trash2 } from "lucide-react";

interface BookLimit {
  id: string;
  name: string;
  maxBetLimit: number;
  currentUsage: number;
}

interface StakePlan {
  bookId: string;
  bookName: string;
  amount: number;
  percentage: number;
  available: number;
  status: "confirmed" | "likely" | "tight";
}

interface BookLimitPlannerProps {
  desiredStake: number;
  onStakeChange?: (stake: number) => void;
}

function createStakePlan(books: BookLimit[], desiredStake: number): StakePlan[] {
  const plan: StakePlan[] = [];
  let remainingStake = desiredStake;

  const sortedBooks = [...books]
    .map(b => ({ ...b, available: Math.max(0, b.maxBetLimit - b.currentUsage) }))
    .filter(b => b.available > 0)
    .sort((a, b) => b.available - a.available);

  for (const book of sortedBooks) {
    if (remainingStake <= 0) break;

    const allocation = Math.min(remainingStake, book.available);
    if (allocation > 0) {
      const usageRatio = allocation / book.available;
      plan.push({
        bookId: book.id,
        bookName: book.name,
        amount: allocation,
        percentage: desiredStake > 0 ? (allocation / desiredStake) * 100 : 0,
        available: book.available,
        status: usageRatio < 0.7 ? "confirmed" : usageRatio < 0.95 ? "likely" : "tight",
      });
      remainingStake -= allocation;
    }
  }

  return plan;
}

export function BookLimitPlanner({ desiredStake, onStakeChange }: BookLimitPlannerProps) {
  const [stake, setStake] = useState(desiredStake);
  const [books, setBooks] = useState<BookLimit[]>([]);
  const [newBookName, setNewBookName] = useState("");
  const [newBookLimit, setNewBookLimit] = useState("");
  const [newBookUsage, setNewBookUsage] = useState("");

  const stakePlan = useMemo(() => createStakePlan(books, stake), [books, stake]);

  const totalAllocated = stakePlan.reduce((sum, p) => sum + p.amount, 0);
  const fillRate = stake > 0 ? (totalAllocated / stake) * 100 : 0;
  const totalAvailable = books.reduce((sum, b) => sum + Math.max(0, b.maxBetLimit - b.currentUsage), 0);

  const getPlanStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "likely": return "bg-yellow-500 text-black";
      case "tight": return "bg-red-500 text-white";
      default: return "bg-muted";
    }
  };

  const addBook = () => {
    const limit = parseFloat(newBookLimit);
    const usage = parseFloat(newBookUsage) || 0;
    if (!newBookName.trim() || isNaN(limit) || limit <= 0) return;

    setBooks(prev => [
      ...prev,
      {
        id: `book-${Date.now()}`,
        name: newBookName.trim(),
        maxBetLimit: limit,
        currentUsage: Math.min(usage, limit),
      },
    ]);
    setNewBookName("");
    setNewBookLimit("");
    setNewBookUsage("");
  };

  const removeBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
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
              data-testid="input-desired-stake"
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

        <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
          <h4 className="font-medium text-sm">Add Your Sportsbook Limits</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="book-name" className="text-xs text-muted-foreground">Book Name</Label>
              <Input
                id="book-name"
                data-testid="input-book-name"
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                placeholder="e.g. FanDuel"
              />
            </div>
            <div>
              <Label htmlFor="book-limit" className="text-xs text-muted-foreground">Max Bet Limit ($)</Label>
              <Input
                id="book-limit"
                data-testid="input-book-limit"
                type="number"
                value={newBookLimit}
                onChange={(e) => setNewBookLimit(e.target.value)}
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <Label htmlFor="book-usage" className="text-xs text-muted-foreground">Current Usage ($)</Label>
              <Input
                id="book-usage"
                data-testid="input-book-usage"
                type="number"
                value={newBookUsage}
                onChange={(e) => setNewBookUsage(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={addBook}
            disabled={!newBookName.trim() || !newBookLimit || parseFloat(newBookLimit) <= 0}
            data-testid="button-add-book"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Book
          </Button>
        </div>

        {books.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Your Books ({books.length})
            </h4>
            {books.map((book) => {
              const available = Math.max(0, book.maxBetLimit - book.currentUsage);
              const usagePct = book.maxBetLimit > 0 ? (book.currentUsage / book.maxBetLimit) * 100 : 0;
              return (
                <div key={book.id} className="p-2 rounded-lg border bg-card" data-testid={`card-book-${book.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">{book.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-500">
                        ${available.toFixed(0)} available
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBook(book.id)}
                        data-testid={`button-remove-book-${book.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Limit: ${book.maxBetLimit}</span>
                    <span>Used: ${book.currentUsage}</span>
                  </div>
                  <Progress value={usagePct} className="h-1" />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-desired">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">${stake.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Desired</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-allocated">
            <Split className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-500">${totalAllocated.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Allocated</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-available">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">${totalAvailable.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Available</p>
          </div>
        </div>

        {stake > 0 && fillRate < 100 && books.length > 0 && (
          <div className="p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Partial Fill Warning</p>
                <p className="text-sm text-muted-foreground">
                  Only ${totalAllocated.toFixed(0)} of ${stake.toFixed(0)} ({fillRate.toFixed(0)}%) can be
                  allocated across your books. Consider reducing stake or adding more books.
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
            <div className="text-center py-4 text-muted-foreground" data-testid="empty-plan">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {books.length === 0
                  ? "Add your sportsbook limits above to generate a plan"
                  : "Enter a stake amount to generate a plan"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stakePlan.map((plan, idx) => (
                <div key={plan.bookId} className="p-3 rounded-lg border bg-card" data-testid={`plan-item-${idx}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{idx + 1}
                      </Badge>
                      <span className="font-medium">{plan.bookName}</span>
                    </div>
                    <Badge className={getPlanStatusColor(plan.status)}>
                      {plan.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {plan.status}
                    </Badge>
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
                      <span className="text-muted-foreground">Available:</span>{" "}
                      <span className="font-medium text-green-500">${plan.available.toFixed(0)}</span>
                    </div>
                  </div>

                  <Progress value={plan.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" data-testid="button-execute-split-plan" disabled={stakePlan.length === 0}>
          <Split className="h-4 w-4 mr-2" />
          Execute Split Stake Plan
        </Button>
      </CardContent>
    </Card>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, BarChart3, FileText, TrendingUp, History } from "lucide-react";
import { MultiBookTracker } from "@/components/financial/multi-book-tracker";
import { ROIDashboard } from "@/components/financial/roi-dashboard";
import { TaxExport } from "@/components/financial/tax-export";
import { Badge } from "@/components/ui/badge";
import { PerformanceAnalytics } from "@/components/financial/performance-analytics";
import { BetTracker } from "@/components/bet-tracker";

export default function Bankroll() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <header className="px-2 sm:px-0">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            Finance
            <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-500 h-5 text-[10px]">
              <Wallet className="w-2.5 h-2.5" />
              Tracking
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track bets, balances, and performance</p>
        </header>

        <Tabs defaultValue="history" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 sm:max-w-xl">
              <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-history">
                <History className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Bets</span>
              </TabsTrigger>
              <TabsTrigger value="books" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-books">
                <Wallet className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Books</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-stats">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="roi" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-roi">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">ROI</span>
              </TabsTrigger>
              <TabsTrigger value="tax" className="gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-tax">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Tax</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="space-y-6">
            <BetTracker />
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <MultiBookTracker />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <PerformanceAnalytics />
          </TabsContent>

          <TabsContent value="roi" className="space-y-6">
            <ROIDashboard />
          </TabsContent>

          <TabsContent value="tax" className="space-y-6">
            <TaxExport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

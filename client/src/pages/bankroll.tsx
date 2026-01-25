import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, BarChart3, FileText, TrendingUp } from "lucide-react";
import { MultiBookTracker } from "@/components/financial/multi-book-tracker";
import { ROIDashboard } from "@/components/financial/roi-dashboard";
import { TaxExport } from "@/components/financial/tax-export";
import { Badge } from "@/components/ui/badge";
import { PerformanceAnalytics } from "@/components/financial/performance-analytics";

export default function Bankroll() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            Bankroll & Analytics
            <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-500">
              <Wallet className="w-3 h-3" />
              Financial
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Track balances, performance, and tax reports</p>
        </header>

        <Tabs defaultValue="books" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="books" className="gap-1 text-xs sm:text-sm" data-testid="tab-books">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Books</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1 text-xs sm:text-sm" data-testid="tab-stats">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="roi" className="gap-1 text-xs sm:text-sm" data-testid="tab-roi">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">ROI</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="gap-1 text-xs sm:text-sm" data-testid="tab-tax">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Tax</span>
            </TabsTrigger>
          </TabsList>

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

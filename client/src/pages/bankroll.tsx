import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, BarChart3, FileText, TrendingUp, History } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { MultiBookTracker } from "@/components/financial/multi-book-tracker";
import { ROIDashboard } from "@/components/financial/roi-dashboard";
import { TaxExport } from "@/components/financial/tax-export";
import { Badge } from "@/components/ui/badge";
import { PerformanceAnalytics } from "@/components/financial/performance-analytics";
import { BetTracker } from "@/components/bet-tracker";
import { useSEO } from "@/hooks/use-seo";
import { AIRecommendationPanel } from "@/components/ai/ai-recommendation-panel";
import { openSorsCompanionWithContext } from "@/components/ai/sors-companion";

export default function Bankroll() {
  useSEO({ title: "Bankroll Manager", description: "Track and manage your betting bankroll" });
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <PageHero
          icon={<Wallet className="w-6 h-6" />}
          title="Finance"
          badge="Tracking"
          subtitle="Track bets, balances, and performance"
          description="Log every wager — sport, stake, odds, and result — then watch your profit/loss update in real time. The Kelly Criterion tab calculates optimal stake sizes based on your current balance and edge. Set daily loss limits and session caps under Settings to protect your capital."
        />

        <AIRecommendationPanel
          context={{ page: "bankroll" }}
          onOpenCompanion={openSorsCompanionWithContext}
          compact
        />

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

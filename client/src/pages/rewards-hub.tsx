import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { lazy, Suspense } from "react";

const RewardsPage = lazy(() => import("./rewards"));
const CardsPage = lazy(() => import("./cards"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function RewardsHub() {
  useSEO({ title: "Rewards & Cards — Sors Maxima", description: "Rewards, achievements, and Intelligence Cards collection" });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        <div className="px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="rewards-hub-title">
            <Flame className="h-6 w-6 text-amber-500" />
            Rewards & Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn achievements, complete challenges, and collect Intelligence Cards.
          </p>
        </div>

        <Tabs defaultValue="rewards" className="space-y-0">
          <div className="px-2">
            <TabsList className="grid w-full grid-cols-2 max-w-xs h-9" data-testid="rewards-hub-tabs">
              <TabsTrigger value="rewards" className="gap-1.5 text-xs" data-testid="tab-rewards">
                <Flame className="w-3.5 h-3.5" />
                Rewards
              </TabsTrigger>
              <TabsTrigger value="cards" className="gap-1.5 text-xs" data-testid="tab-cards">
                <Trophy className="w-3.5 h-3.5" />
                Cards
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="rewards" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <RewardsPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <CardsPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

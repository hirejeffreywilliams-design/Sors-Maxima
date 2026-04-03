import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Compass, Brain, StickyNote } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { lazy, Suspense } from "react";

const StrategyAdvisor = lazy(() => import("./strategy-advisor"));
const PersonalizedInsights = lazy(() => import("./personalized-insights"));
const ResearchNotes = lazy(() => import("./research-notes"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdvisorPage() {
  useSEO({ title: "Advisor — Sors Maxima", description: "Strategy advisor, personalized insights, and research notes" });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        <div className="px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="advisor-page-title">
            <Compass className="h-6 w-6 text-primary" />
            Advisor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Strategy guidance, personalized insights, and your research notes.
          </p>
        </div>

        <Tabs defaultValue="strategy" className="space-y-0">
          <div className="px-2">
            <TabsList className="grid w-full grid-cols-3 max-w-sm h-9" data-testid="advisor-tabs">
              <TabsTrigger value="strategy" className="gap-1 text-xs" data-testid="tab-strategy">
                <Compass className="w-3.5 h-3.5" />
                Strategy
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1 text-xs" data-testid="tab-insights">
                <Brain className="w-3.5 h-3.5" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1 text-xs" data-testid="tab-notes">
                <StickyNote className="w-3.5 h-3.5" />
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="strategy" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <StrategyAdvisor />
            </Suspense>
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <PersonalizedInsights />
            </Suspense>
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <ResearchNotes />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

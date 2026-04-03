import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, History, LineChart } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { lazy, Suspense } from "react";

const TrackRecordPage = lazy(() => import("./track-record"));
const ResultsPage = lazy(() => import("./results"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function HistoryPage() {
  useSEO({ title: "History — Sors Maxima", description: "Model track record and settled results" });

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        <div className="px-2 sm:px-2">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="history-page-title">
            <History className="h-6 w-6 text-primary" />
            History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Model track record and settled results.
          </p>
        </div>

        <Tabs defaultValue="track-record" className="space-y-0">
          <div className="px-2 sm:px-2">
            <TabsList className="grid w-full grid-cols-2 max-w-xs h-9" data-testid="history-tabs">
              <TabsTrigger value="track-record" className="gap-1.5 text-xs" data-testid="tab-track-record">
                <BarChart3 className="w-3.5 h-3.5" />
                Track Record
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1.5 text-xs" data-testid="tab-results">
                <LineChart className="w-3.5 h-3.5" />
                Results
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="track-record" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <TrackRecordPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <Suspense fallback={<PageLoader />}>
              <ResultsPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

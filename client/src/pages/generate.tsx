import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Layers } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { lazy, Suspense, useState } from "react";
import { useLocation } from "wouter";

const AutoGenerator = lazy(() => import("./auto-generator"));
const DailyParlays = lazy(() => import("./daily-parlays"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function GeneratePage() {
  useSEO({ title: "Generate — Sors Maxima", description: "Smart ticket generator and ready-made parlay picks" });
  const [location] = useLocation();
  const defaultTab = location.includes("parlays") ? "parlays" : "build";
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="min-h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 sm:px-6 pt-3 pb-0">
          <TabsList className="h-9" data-testid="generate-tabs">
            <TabsTrigger value="build" className="gap-1.5 text-xs" data-testid="tab-build-ticket">
              <Ticket className="w-3.5 h-3.5" />
              Smart Generator
            </TabsTrigger>
            <TabsTrigger value="parlays" className="gap-1.5 text-xs" data-testid="tab-ready-parlays">
              <Layers className="w-3.5 h-3.5" />
              Ready-Made Parlays
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="build" className="mt-0">
          <Suspense fallback={<PageLoader />}>
            <AutoGenerator />
          </Suspense>
        </TabsContent>

        <TabsContent value="parlays" className="mt-0">
          <Suspense fallback={<PageLoader />}>
            <DailyParlays />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

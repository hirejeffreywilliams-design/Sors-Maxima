import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Rocket, Clock, Compass, Telescope, Sparkles, CheckCircle,
  Loader2, Circle, Search, RefreshCw
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

export default function Roadmap() {
  useSEO({ title: "Roadmap", description: "Upcoming features and development roadmap" });
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/roadmap"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-roadmap">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusIcons: Record<string, any> = {
    "in-progress": <Loader2 className="w-3 h-3 animate-spin text-blue-500" />,
    "planned": <Circle className="w-3 h-3 text-muted-foreground" />,
    "exploring": <Search className="w-3 h-3 text-purple-500" />,
    "research": <Telescope className="w-3 h-3 text-orange-500" />,
    "vision": <Sparkles className="w-3 h-3 text-pink-500" />,
    "completed": <CheckCircle className="w-3 h-3 text-green-500" />,
  };

  const statusLabels: Record<string, string> = {
    "in-progress": "In Progress",
    "planned": "Planned",
    "exploring": "Exploring",
    "research": "Research",
    "vision": "Vision",
    "completed": "Completed",
  };

  const horizons = [
    { key: "nearTerm", icon: <Rocket className="w-5 h-5" />, color: "border-l-blue-500" },
    { key: "midTerm", icon: <Compass className="w-5 h-5" />, color: "border-l-purple-500" },
    { key: "longTerm", icon: <Telescope className="w-5 h-5" />, color: "border-l-orange-500" },
    { key: "ultraLongTerm", icon: <Sparkles className="w-5 h-5" />, color: "border-l-pink-500" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Product Roadmap</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our vision for building the most intelligent sports betting analysis platform. Transparent progress on what we're building and where we're headed.
          </p>
        </div>

        {horizons.map(({ key, icon, color }) => {
          const horizon = data?.[key];
          if (!horizon) return null;
          return (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <h2 className="text-xl font-bold">{horizon.title}</h2>
                  <p className="text-sm text-muted-foreground">{horizon.horizon}</p>
                </div>
              </div>
              <div className="space-y-3 pl-4">
                {horizon.items.map((item: any) => (
                  <Card key={item.id} className={`border-l-4 ${color}`} style={{ borderRadius: "0.375rem" }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{item.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {statusIcons[item.status]}
                              <span className="ml-1">{statusLabels[item.status]}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        {item.eta && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            <Clock className="w-3 h-3 mr-1" /> {item.eta}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        <Separator />
        <div className="text-center text-sm text-muted-foreground space-y-1 pb-8">
          <p>Roadmap items are subject to change based on user feedback and market conditions.</p>
          <p>Have a feature request? Share it in the Community section.</p>
        </div>
      </div>
    </ScrollArea>
  );
}

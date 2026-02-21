import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Zap,
  Brain,
  Wifi,
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  description: string;
  status: "active" | "fallback" | "inactive";
  type: string;
  requestsRemaining?: number | null;
  fallbackNote?: string;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "fallback":
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
    default:
      return <XCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="text-[10px] h-4 px-1.5 bg-green-500/20 text-green-600 border-green-500/30">Active</Badge>;
    case "fallback":
      return <Badge className="text-[10px] h-4 px-1.5 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Fallback</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] h-4 px-1.5 opacity-50">Inactive</Badge>;
  }
}

export function DataSourceStatus() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ sources: DataSource[] }>({
    queryKey: ["/api/data-sources/status"],
    refetchInterval: 60000,
  });

  if (!data) return null;

  const activeCount = data.sources.filter(s => s.status === "active").length;
  const totalCount = data.sources.length;
  const hasFallbacks = data.sources.some(s => s.status === "fallback");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full" data-testid="button-data-sources">
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Data Sources</span>
            <Badge variant="outline" className="text-xs">
              {activeCount}/{totalCount} active
            </Badge>
            {hasFallbacks && (
              <Badge className="text-[10px] h-4 px-1.5 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                1 fallback
              </Badge>
            )}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {data.sources.map((source) => (
            <div key={source.id} className="flex items-start gap-2 py-1.5 px-3 rounded-md bg-muted/30" data-testid={`data-source-${source.id}`}>
              <StatusIcon status={source.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{source.name}</span>
                  <StatusBadge status={source.status} />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{source.description}</p>
                {source.fallbackNote && (
                  <p className="text-[10px] text-yellow-600 mt-0.5">{source.fallbackNote}</p>
                )}
                {source.requestsRemaining !== undefined && source.requestsRemaining !== null && (
                  <p className="text-[10px] text-muted-foreground">{source.requestsRemaining} requests remaining</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ShieldAlert, BookOpen, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, FileText, ListChecks, ChevronDown, ChevronUp
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

export default function AdminRiskRegister() {
  useSEO({ title: "Risk Register", description: "Track and mitigate operational and business risks" });
  const [, setLocation] = useLocation();
  const [expandedSop, setExpandedSop] = useState<string | null>(null);
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/risk-register"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-risk-register">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const risks = data?.risks || [];
  const sops = data?.sops || [];
  const summary = data?.summary;

  const impactColors: Record<string, string> = {
    critical: "text-red-500",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-green-500",
  };

  const categoryIcons: Record<string, string> = {
    Legal: "scale",
    Technical: "cpu",
    Data: "database",
    Security: "shield",
    Reputational: "eye",
    Financial: "dollar-sign",
    Competitive: "swords",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Risk Register & SOPs</h1>
            <p className="text-sm text-muted-foreground">Operational risks, mitigation strategies & standard procedures</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <ShieldAlert className="w-3 h-3" /> Total Risks
              </div>
              <div className="text-2xl font-bold" data-testid="text-total-risks">{summary?.totalRisks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <AlertTriangle className="w-3 h-3" /> Critical Impact
              </div>
              <div className="text-2xl font-bold text-red-500" data-testid="text-critical-risks">{summary?.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CheckCircle className="w-3 h-3" /> Mitigated
              </div>
              <div className="text-2xl font-bold text-green-500" data-testid="text-mitigated">{summary?.mitigated}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BookOpen className="w-3 h-3" /> SOPs
              </div>
              <div className="text-2xl font-bold" data-testid="text-sop-count">{sops.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="risks">
          <TabsList className="w-full flex flex-wrap gap-1">
            <TabsTrigger value="risks" data-testid="tab-risks">
              <ShieldAlert className="w-3 h-3 mr-1" /> Risk Register
            </TabsTrigger>
            <TabsTrigger value="sops" data-testid="tab-sops">
              <ListChecks className="w-3 h-3 mr-1" /> SOPs & Playbooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="space-y-3 mt-4">
            {risks.map((risk: any) => (
              <Card key={risk.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{risk.id}</Badge>
                      <span className="font-medium">{risk.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={risk.status === "mitigated" ? "default" : "secondary"}>
                        {risk.status === "mitigated" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {risk.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{risk.category}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Likelihood:</span>
                      <span className="ml-1 font-medium">{risk.likelihood}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impact:</span>
                      <span className={`ml-1 font-medium ${impactColors[risk.impact] || ""}`}>{risk.impact}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="ml-1 font-medium">{risk.owner}</span>
                    </div>
                  </div>
                  <div className="text-xs bg-muted/50 p-2 rounded-md">
                    <span className="font-medium">Mitigation: </span>
                    <span className="text-muted-foreground">{risk.mitigation}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Last reviewed: {risk.lastReview}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sops" className="space-y-3 mt-4">
            {sops.map((sop: any) => (
              <Card key={sop.id} className="hover-elevate cursor-pointer" onClick={() => setExpandedSop(expandedSop === sop.id ? null : sop.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{sop.title}</span>
                      <Badge variant="secondary" className="text-xs">{sop.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{sop.owner}</span>
                      {expandedSop === sop.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  {expandedSop === sop.id && (
                    <div className="mt-3 space-y-2">
                      <Separator />
                      <ol className="space-y-2 mt-2">
                        {sop.steps.map((step: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">{i + 1}</span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="text-xs text-muted-foreground mt-2">Last updated: {sop.lastUpdated}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

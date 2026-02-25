import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, Users, Layers, Target, Zap, Gift, Eye, MousePointer,
  DollarSign, TrendingUp, Activity, BarChart3, CheckCircle, XCircle
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface SegmentRule {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in" | "between";
  value: string | number | string[];
}

interface DynamicOffer {
  id: string;
  title: string;
  description: string;
  type: "discount" | "free_bet" | "boost" | "cashback" | "tier_upgrade";
  value: number;
  expiresIn: string;
  conditions: string;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  type: "behavioral" | "demographic" | "value" | "lifecycle" | "custom";
  rules: SegmentRule[];
  estimatedSize: number;
  actualSize: number;
  isActive: boolean;
  dynamicOffer: DynamicOffer | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonalizationRule {
  id: string;
  name: string;
  trigger: string;
  segmentId: string;
  action: string;
  priority: number;
  isActive: boolean;
  impressions: number;
  conversions: number;
  revenue: number;
}

interface SegmentationStats {
  totalSegments: number;
  activeSegments: number;
  totalUsers: number;
  totalRules: number;
  activeRules: number;
  totalImpressions: number;
  totalConversions: number;
  totalRevenue: number;
  offersActive: number;
  byType: Record<string, number>;
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "behavioral": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "demographic": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "value": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "lifecycle": return "bg-green-500/10 text-green-500 border-green-500/20";
    default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
}

function formatOperator(op: string): string {
  return op.replace(/_/g, " ");
}

function formatValue(val: string | number | string[]): string {
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

function SegmentsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);

  const { data: stats, isLoading: statsLoading } = useQuery<SegmentationStats>({
    queryKey: ["/api/admin/segments/stats"],
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery<UserSegment[]>({
    queryKey: ["/api/admin/segments", typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/admin/segments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch segments");
      return res.json();
    },
  });

  const { data: segmentDetail } = useQuery<UserSegment>({
    queryKey: ["/api/admin/segments", selectedSegment],
    queryFn: async () => {
      const res = await fetch(`/api/admin/segments/${selectedSegment}`);
      if (!res.ok) throw new Error("Failed to fetch segment");
      return res.json();
    },
    enabled: !!selectedSegment,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/segments/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segments/stats"] });
      toast({ title: "Segment Updated", description: "Segment status has been updated." });
    },
  });

  if (statsLoading || segmentsLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading segments...</div>;
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Layers className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold" data-testid="text-total-segments">{stats.totalSegments}</div>
              <div className="text-xs text-muted-foreground">Total Segments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-active-segments">{stats.activeSegments}</div>
              <div className="text-xs text-muted-foreground">Active Segments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold" data-testid="text-total-users">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Users Tracked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-bold" data-testid="text-offers-active">{stats.offersActive}</div>
              <div className="text-xs text-muted-foreground">Active Offers</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-type-all">All</TabsTrigger>
          <TabsTrigger value="behavioral" data-testid="tab-type-behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="value" data-testid="tab-type-value">Value</TabsTrigger>
          <TabsTrigger value="lifecycle" data-testid="tab-type-lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-type-custom">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {!segments?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No segments found</p>
            <p className="text-sm mt-1">No segments match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {segments.map((seg) => (
            <Card
              key={seg.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedSegment(seg.id)}
              data-testid={`card-segment-${seg.id}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm" data-testid={`text-segment-name-${seg.id}`}>{seg.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{seg.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClass(seg.type)}`}>
                      {seg.type}
                    </Badge>
                    <Badge variant={seg.isActive ? "default" : "secondary"} className="text-[10px]">
                      {seg.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>Est: <span className="font-medium text-foreground">{seg.estimatedSize.toLocaleString()}</span></span>
                    <span>Actual: <span className="font-medium text-foreground">{seg.actualSize.toLocaleString()}</span></span>
                  </div>
                  {seg.dynamicOffer && (
                    <Badge variant="outline" className="text-[10px]">
                      <Gift className="h-3 w-3 mr-1" />
                      {seg.dynamicOffer.title}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSegment} onOpenChange={(open) => !open && setSelectedSegment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {segmentDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {segmentDetail.name}
                </DialogTitle>
                <DialogDescription>
                  Detailed configuration and performance metrics for the {segmentDetail.name} segment.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <Badge variant="outline" className={`mt-1 ${getTypeBadgeClass(segmentDetail.type)}`}>
                      {segmentDetail.type}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={segmentDetail.isActive}
                        onCheckedChange={(checked) => {
                          toggleMutation.mutate({ id: segmentDetail.id, isActive: checked });
                        }}
                        disabled={toggleMutation.isPending}
                        data-testid={`switch-segment-active-${segmentDetail.id}`}
                      />
                      <span className="text-sm">{segmentDetail.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <p className="text-sm mt-1">{segmentDetail.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">Estimated Size</div>
                    <div className="text-lg font-bold" data-testid="text-estimated-size">{segmentDetail.estimatedSize.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">Actual Size</div>
                    <div className="text-lg font-bold" data-testid="text-actual-size">{segmentDetail.actualSize.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Rules ({segmentDetail.rules.length})</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Operator</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segmentDetail.rules.map((rule, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{rule.field}</TableCell>
                          <TableCell className="text-sm">{formatOperator(rule.operator)}</TableCell>
                          <TableCell className="text-sm">{formatValue(rule.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {segmentDetail.dynamicOffer && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4" /> Dynamic Offer
                    </div>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{segmentDetail.dynamicOffer.title}</div>
                          <Badge variant="outline" className="text-[10px]">{segmentDetail.dynamicOffer.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{segmentDetail.dynamicOffer.description}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Value: </span>
                            <span className="font-medium">{segmentDetail.dynamicOffer.value}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expires: </span>
                            <span className="font-medium">{segmentDetail.dynamicOffer.expiresIn}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Conditions: </span>
                            <span className="font-medium">{segmentDetail.dynamicOffer.conditions}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonalizationTab() {
  const { data: stats, isLoading: statsLoading } = useQuery<SegmentationStats>({
    queryKey: ["/api/admin/segments/stats"],
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<PersonalizationRule[]>({
    queryKey: ["/api/admin/personalization-rules"],
  });

  if (statsLoading || rulesLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading personalization rules...</div>;
  }

  const conversionRate = stats && stats.totalImpressions > 0
    ? ((stats.totalConversions / stats.totalImpressions) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold" data-testid="text-total-rules">{stats.totalRules}</div>
              <div className="text-xs text-muted-foreground">Total Rules</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-active-rules">{stats.activeRules}</div>
              <div className="text-xs text-muted-foreground">Active Rules</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold" data-testid="text-total-impressions">{stats.totalImpressions.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Impressions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MousePointer className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-bold" data-testid="text-conversion-rate">{conversionRate}%</div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-bold" data-testid="text-total-revenue">${stats.totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!rules?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No personalization rules found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Personalization Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const ruleConvRate = rule.impressions > 0
                      ? ((rule.conversions / rule.impressions) * 100).toFixed(1)
                      : "0";
                    return (
                      <TableRow
                        key={rule.id}
                        className={rule.isActive ? "" : "opacity-50"}
                        data-testid={`row-rule-${rule.id}`}
                      >
                        <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                        <TableCell className="text-sm font-mono">{rule.trigger}</TableCell>
                        <TableCell className="text-sm font-mono">{rule.action}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px]">{rule.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px]">
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{rule.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{rule.conversions.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{ruleConvRate}%</TableCell>
                        <TableCell className="text-right text-sm">${rule.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminSegmentation() {
  useSEO({ title: "User Segmentation", description: "Define and analyze user segments" });
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            User Segmentation & Personalization
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage user segments, dynamic offers, and personalization rules.
          </p>
        </div>
      </div>

      <Tabs defaultValue="segments">
        <TabsList>
          <TabsTrigger value="segments" data-testid="tab-segments">Segments</TabsTrigger>
          <TabsTrigger value="personalization" data-testid="tab-personalization">Personalization Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="mt-4">
          <SegmentsTab />
        </TabsContent>

        <TabsContent value="personalization" className="mt-4">
          <PersonalizationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

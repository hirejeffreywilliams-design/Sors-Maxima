import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft, Mail, Bell, Smartphone, MessageSquare,
  Users, TrendingUp, DollarSign, Send, Eye, BarChart3,
  Play, Pause, Archive, Zap, Target, Clock,
} from "lucide-react";

interface CampaignStep {
  id: string;
  channel: "email" | "push" | "in_app" | "sms";
  subject: string;
  body: string;
  delay: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

interface LifecycleCampaign {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft" | "archived";
  category: "onboarding" | "activation" | "retention" | "reactivation" | "monetization" | "win_loss";
  trigger: { type: string; condition: string; delay?: string };
  steps: CampaignStep[];
  targetSegment: string;
  enrolledUsers: number;
  completedUsers: number;
  conversionRate: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  total: number;
  active: number;
  paused: number;
  draft: number;
  totalEnrolled: number;
  totalRevenue: number;
  avgConversionRate: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  byCategory: Record<string, number>;
  topPerformer: string;
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case "email": return <Mail className="h-4 w-4" />;
    case "push": return <Bell className="h-4 w-4" />;
    case "in_app": return <Smartphone className="h-4 w-4" />;
    case "sms": return <MessageSquare className="h-4 w-4" />;
    default: return <Mail className="h-4 w-4" />;
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "paused": return "secondary";
    case "draft": return "outline";
    case "archived": return "destructive";
    default: return "outline";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "text-green-500";
    case "paused": return "text-yellow-500";
    case "draft": return "text-muted-foreground";
    case "archived": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

export default function AdminLifecycleCampaigns() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data: stats, isLoading: statsLoading } = useQuery<CampaignStats>({
    queryKey: ["/api/admin/campaigns/stats"],
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<LifecycleCampaign[]>({
    queryKey: ["/api/admin/campaigns", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const { data: selectedCampaign } = useQuery<LifecycleCampaign>({
    queryKey: ["/api/admin/campaigns", selectedCampaignId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/campaigns/${selectedCampaignId}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json();
    },
    enabled: !!selectedCampaignId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LifecycleCampaign> }) => {
      return await apiRequest("PATCH", `/api/admin/campaigns/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/stats"] });
      setSelectedCampaignId(null);
      toast({ title: "Campaign Updated", description: "Campaign has been updated successfully." });
    },
  });

  const openRate = stats && stats.totalSent > 0 ? ((stats.totalOpened / stats.totalSent) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} data-testid="button-back-admin">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            Lifecycle Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage automated lifecycle campaigns across email, push, in-app, and SMS channels.
          </p>
        </div>
      </div>

      {statsLoading ? (
        <div className="text-sm text-muted-foreground">Loading stats...</div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-active-campaigns">{stats.active}</div>
              <div className="text-xs text-muted-foreground">Active Campaigns</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold" data-testid="text-total-enrolled">{stats.totalEnrolled.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Enrolled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold" data-testid="text-avg-conversion">{stats.avgConversionRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Avg Conversion Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-total-revenue">${stats.totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Send className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold" data-testid="text-total-sent">{stats.totalSent.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Messages Sent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <div className="text-2xl font-bold" data-testid="text-open-rate">{openRate}%</div>
              <div className="text-xs text-muted-foreground">Open Rate</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-status-all">All</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-status-active">Active</TabsTrigger>
          <TabsTrigger value="paused" data-testid="tab-status-paused">Paused</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-status-draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {campaignsLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading campaigns...</div>
          ) : !campaigns?.length ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No campaigns found</p>
                <p className="text-sm mt-1">No campaigns match the current filter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  data-testid={`card-campaign-${campaign.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`text-campaign-name-${campaign.id}`}>
                            {campaign.name}
                          </span>
                          <Badge variant={getStatusBadgeVariant(campaign.status)} className="text-xs">
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {campaign.category.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {campaign.trigger.type}: {campaign.trigger.condition}
                          {campaign.trigger.delay && ` (delay: ${campaign.trigger.delay})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium" data-testid={`text-enrolled-${campaign.id}`}>
                            {campaign.enrolledUsers.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Enrolled</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium" data-testid={`text-conversion-${campaign.id}`}>
                            {campaign.conversionRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">Conversion</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium" data-testid={`text-revenue-${campaign.id}`}>
                            ${campaign.revenue.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Revenue</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCampaignId} onOpenChange={(open) => !open && setSelectedCampaignId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {selectedCampaign.name}
                </DialogTitle>
                <DialogDescription>
                  Manage and monitor the performance of your automated lifecycle campaign.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">{selectedCampaign.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Target Segment</div>
                    <div className="font-medium text-sm">{selectedCampaign.targetSegment}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={getStatusBadgeVariant(selectedCampaign.status)} className="text-xs mt-0.5">
                      {selectedCampaign.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Trigger</div>
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {selectedCampaign.trigger.type}: {selectedCampaign.trigger.condition}
                    </div>
                    {selectedCampaign.trigger.delay && (
                      <div className="text-xs text-muted-foreground">Delay: {selectedCampaign.trigger.delay}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium text-sm capitalize">{selectedCampaign.category.replace("_", " ")}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">{selectedCampaign.enrolledUsers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Enrolled</div>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">{selectedCampaign.completedUsers.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">{selectedCampaign.conversionRate}%</div>
                    <div className="text-xs text-muted-foreground">Conversion</div>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">${selectedCampaign.revenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-3">Campaign Steps ({selectedCampaign.steps.length})</div>
                  <div className="space-y-3">
                    {selectedCampaign.steps.map((step, index) => {
                      const stepOpenRate = step.sent > 0 ? ((step.opened / step.sent) * 100).toFixed(1) : "0.0";
                      const stepClickRate = step.opened > 0 ? ((step.clicked / step.opened) * 100).toFixed(1) : "0.0";
                      return (
                        <Card key={step.id} data-testid={`card-step-${step.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
                                  {getChannelIcon(step.channel)}
                                </div>
                                <span className="text-[10px] text-muted-foreground capitalize">{step.channel.replace("_", " ")}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="font-medium text-sm">{step.subject}</div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {step.delay}
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                  <div className="text-center p-1.5 rounded bg-muted/30">
                                    <div className="text-sm font-medium">{step.sent.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground">Sent</div>
                                  </div>
                                  <div className="text-center p-1.5 rounded bg-muted/30">
                                    <div className="text-sm font-medium">{step.opened.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground">Opened ({stepOpenRate}%)</div>
                                  </div>
                                  <div className="text-center p-1.5 rounded bg-muted/30">
                                    <div className="text-sm font-medium">{step.clicked.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground">Clicked ({stepClickRate}%)</div>
                                  </div>
                                  <div className="text-center p-1.5 rounded bg-muted/30">
                                    <div className="text-sm font-medium">{step.converted.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground">Converted</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {index < selectedCampaign.steps.length - 1 && (
                              <div className="flex justify-center mt-2">
                                <div className="h-4 w-px bg-border" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedCampaign.status !== "active" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedCampaign.id, updates: { status: "active" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-activate-campaign"
                  >
                    <Play className="h-4 w-4 mr-1" /> Activate
                  </Button>
                )}
                {selectedCampaign.status === "active" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedCampaign.id, updates: { status: "paused" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-pause-campaign"
                  >
                    <Pause className="h-4 w-4 mr-1" /> Pause
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: selectedCampaign.id, updates: { status: "archived" } })}
                  disabled={updateMutation.isPending}
                  data-testid="button-archive-campaign"
                >
                  <Archive className="h-4 w-4 mr-1" /> Archive
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

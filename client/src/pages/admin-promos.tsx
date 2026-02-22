import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, Gift, TrendingUp, DollarSign, Users, Percent, BarChart3, Calendar,
  Play, Pause, XCircle, Tag, Target, Clock, Zap, Heart, Timer, UserPlus
} from "lucide-react";

interface PromoOffer {
  id: string;
  name: string;
  description: string;
  type: "welcome_bonus" | "deposit_match" | "free_bet" | "odds_boost" | "cashback" | "loyalty_reward" | "time_limited" | "referral_bonus";
  status: "active" | "scheduled" | "expired" | "paused" | "draft";
  value: number;
  valueType: "percentage" | "fixed" | "multiplier";
  maxPayout: number;
  wageringRequirement: number;
  minDeposit: number;
  targetSegment: string;
  startDate: string;
  endDate: string;
  totalClaimed: number;
  totalRedeemed: number;
  totalCost: number;
  totalRevenue: number;
  roi: number;
  createdAt: string;
  terms: string;
}

interface PromoStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  totalClaimed: number;
  totalRedeemed: number;
  totalCost: number;
  totalRevenue: number;
  avgRoi: number;
  redemptionRate: number;
  byType: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  welcome_bonus: "bg-green-500/15 text-green-700 dark:text-green-400",
  deposit_match: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  free_bet: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  odds_boost: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  cashback: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  loyalty_reward: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  time_limited: "bg-red-500/15 text-red-700 dark:text-red-400",
  referral_bonus: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
};

const TYPE_LABELS: Record<string, string> = {
  welcome_bonus: "Welcome Bonus",
  deposit_match: "Deposit Match",
  free_bet: "Free Bet",
  odds_boost: "Odds Boost",
  cashback: "Cashback",
  loyalty_reward: "Loyalty Reward",
  time_limited: "Time Limited",
  referral_bonus: "Referral Bonus",
};

const TYPE_ICONS: Record<string, typeof Gift> = {
  welcome_bonus: Gift,
  deposit_match: DollarSign,
  free_bet: Tag,
  odds_boost: Zap,
  cashback: TrendingUp,
  loyalty_reward: Heart,
  time_limited: Timer,
  referral_bonus: UserPlus,
};

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "scheduled": return "secondary";
    case "expired": return "secondary";
    case "paused": return "secondary";
    case "draft": return "outline";
    default: return "outline";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-500/15 text-green-700 dark:text-green-400";
    case "scheduled": return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "expired": return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
    case "paused": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
    case "draft": return "";
    default: return "";
  }
}

function formatValue(value: number, valueType: string): string {
  switch (valueType) {
    case "fixed": return `$${value}`;
    case "percentage": return `${value}%`;
    case "multiplier": return `${value}x`;
    default: return String(value);
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function AdminPromos() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const qs = queryParams.toString();

  const { data: stats, isLoading: statsLoading } = useQuery<PromoStats>({
    queryKey: ["/api/admin/promos/stats"],
  });

  const { data: offers, isLoading: offersLoading } = useQuery<PromoOffer[]>({
    queryKey: ["/api/admin/promos", qs],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promos${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch promos");
      return res.json();
    },
  });

  const { data: selectedOffer } = useQuery<PromoOffer>({
    queryKey: ["/api/admin/promos", selectedOfferId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promos/${selectedOfferId}`);
      if (!res.ok) throw new Error("Failed to fetch promo");
      return res.json();
    },
    enabled: !!selectedOfferId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PromoOffer> }) => {
      return await apiRequest("PATCH", `/api/admin/promos/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos/stats"] });
      setSelectedOfferId(null);
      toast({ title: "Offer Updated", description: "Promotional offer has been updated." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/promos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos/stats"] });
      setSelectedOfferId(null);
      toast({ title: "Offer Deleted", description: "Promotional offer has been removed." });
    },
  });

  const offerList = offers || [];

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
            <Gift className="h-6 w-6 text-purple-500" />
            Promotional Offers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage promotional offers, bonuses, and incentive campaigns.
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
              <div className="text-2xl font-bold" data-testid="text-active-offers">{stats.active}</div>
              <div className="text-xs text-muted-foreground">Active Offers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold" data-testid="text-total-claimed">{stats.totalClaimed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Claimed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold" data-testid="text-avg-roi">{Math.round(stats.avgRoi)}%</div>
              <div className="text-xs text-muted-foreground">Avg ROI</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Percent className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-bold" data-testid="text-redemption-rate">{stats.redemptionRate}%</div>
              <div className="text-xs text-muted-foreground">Redemption Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <div className="text-2xl font-bold" data-testid="text-total-cost">{formatCurrency(stats.totalCost)}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-status-all">All</TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-status-active">Active</TabsTrigger>
            <TabsTrigger value="scheduled" data-testid="tab-status-scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-status-expired">Expired</TabsTrigger>
            <TabsTrigger value="paused" data-testid="tab-status-paused">Paused</TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-status-draft">Draft</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="welcome_bonus">Welcome Bonus</SelectItem>
            <SelectItem value="deposit_match">Deposit Match</SelectItem>
            <SelectItem value="free_bet">Free Bet</SelectItem>
            <SelectItem value="odds_boost">Odds Boost</SelectItem>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="loyalty_reward">Loyalty Reward</SelectItem>
            <SelectItem value="time_limited">Time Limited</SelectItem>
            <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {offersLoading ? (
        <div className="text-sm text-muted-foreground p-4">Loading offers...</div>
      ) : offerList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No promotional offers found</p>
            <p className="text-sm mt-1">Adjust your filters or create new offers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {offerList.map((offer) => {
            const TypeIcon = TYPE_ICONS[offer.type] || Gift;
            return (
              <Card
                key={offer.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setSelectedOfferId(offer.id)}
                data-testid={`card-promo-${offer.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-sm leading-tight flex-1" data-testid={`text-promo-name-${offer.id}`}>
                      {offer.name}
                    </div>
                    <div className="text-lg font-bold whitespace-nowrap" data-testid={`text-promo-value-${offer.id}`}>
                      {formatValue(offer.value, offer.valueType)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={`text-[11px] ${TYPE_COLORS[offer.type] || ""}`} data-testid={`badge-promo-type-${offer.id}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {TYPE_LABELS[offer.type] || offer.type}
                    </Badge>
                    <Badge
                      variant={getStatusBadgeVariant(offer.status)}
                      className={`text-[11px] ${getStatusColor(offer.status)}`}
                      data-testid={`badge-promo-status-${offer.id}`}
                    >
                      {offer.status}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      <span>{offer.targetSegment}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>{offer.startDate} - {offer.endDate}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Claimed: <span className="font-medium text-foreground">{offer.totalClaimed.toLocaleString()}</span></span>
                      <span>Redeemed: <span className="font-medium text-foreground">{offer.totalRedeemed.toLocaleString()}</span></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedOfferId} onOpenChange={(open) => !open && setSelectedOfferId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOffer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  {selectedOffer.name}
                </DialogTitle>
                <DialogDescription>
                  View performance metrics and manage the lifecycle of this promotional offer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={TYPE_COLORS[selectedOffer.type] || ""}>
                    {TYPE_LABELS[selectedOffer.type] || selectedOffer.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(selectedOffer.status)} className={getStatusColor(selectedOffer.status)}>
                    {selectedOffer.status}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Description</div>
                  <p className="text-sm text-muted-foreground">{selectedOffer.description}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Terms & Conditions</div>
                  <p className="text-sm text-muted-foreground">{selectedOffer.terms}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Configuration</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Value</div>
                      <div className="font-bold text-lg">{formatValue(selectedOffer.value, selectedOffer.valueType)}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Max Payout</div>
                      <div className="font-bold text-lg">${selectedOffer.maxPayout.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Wagering Requirement</div>
                      <div className="font-bold text-lg">{selectedOffer.wageringRequirement}x</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Min Deposit</div>
                      <div className="font-bold text-lg">${selectedOffer.minDeposit}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Performance</div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Claimed</div>
                      <div className="font-bold" data-testid="text-detail-claimed">{selectedOffer.totalClaimed.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Redeemed</div>
                      <div className="font-bold" data-testid="text-detail-redeemed">{selectedOffer.totalRedeemed.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Redemption Rate</div>
                      <div className="font-bold">
                        {selectedOffer.totalClaimed > 0 ? Math.round((selectedOffer.totalRedeemed / selectedOffer.totalClaimed) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Cost</div>
                      <div className="font-bold text-red-500" data-testid="text-detail-cost">{formatCurrency(selectedOffer.totalCost)}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">Revenue</div>
                      <div className="font-bold text-green-500" data-testid="text-detail-revenue">{formatCurrency(selectedOffer.totalRevenue)}</div>
                    </div>
                    <div className="p-3 rounded bg-muted/50 text-center">
                      <div className="text-xs text-muted-foreground">ROI</div>
                      <div className="font-bold text-purple-500" data-testid="text-detail-roi">{selectedOffer.roi}%</div>
                    </div>
                  </div>
                  {selectedOffer.totalRevenue > 0 || selectedOffer.totalCost > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-16">Cost</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${Math.min(100, (selectedOffer.totalCost / Math.max(selectedOffer.totalRevenue, selectedOffer.totalCost)) * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-medium">{formatCurrency(selectedOffer.totalCost)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-16">Revenue</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(100, (selectedOffer.totalRevenue / Math.max(selectedOffer.totalRevenue, selectedOffer.totalCost)) * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-medium">{formatCurrency(selectedOffer.totalRevenue)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Date Range</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedOffer.startDate} to {selectedOffer.endDate}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedOffer.status === "active" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedOffer.id, updates: { status: "paused" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-pause-offer"
                  >
                    <Pause className="h-4 w-4 mr-1" /> Pause
                  </Button>
                )}
                {(selectedOffer.status === "paused" || selectedOffer.status === "draft" || selectedOffer.status === "scheduled") && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedOffer.id, updates: { status: "active" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-activate-offer"
                  >
                    <Play className="h-4 w-4 mr-1" /> Activate
                  </Button>
                )}
                {selectedOffer.status !== "expired" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: selectedOffer.id, updates: { status: "expired" } })}
                    disabled={updateMutation.isPending}
                    data-testid="button-expire-offer"
                  >
                    <Clock className="h-4 w-4 mr-1" /> Expire
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedOffer.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-offer"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

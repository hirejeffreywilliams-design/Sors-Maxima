import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Scale, Ticket, Plus, Pencil, Trash2, XCircle, Clock, Award, ChevronDown, ChevronUp, Eye, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Community Conduct",
  "Card & Collectibles Policy",
  "Responsible Gambling & Legal",
  "Account Policy",
  "Betting Intelligence Standards",
];

function RuleRow({ rule, onEdit, onDelete, onToggle }: { rule: any; onEdit: (r: any) => void; onDelete: (id: number) => void; onToggle: (id: number, active: boolean) => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${rule.is_active ? "border-border/40 bg-muted/10" : "border-border/20 bg-muted/5 opacity-50"}`} data-testid={`rule-row-${rule.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="text-[10px] bg-muted/30 text-muted-foreground border border-border/30">{rule.category}</Badge>
          <span className="text-sm font-bold">{rule.title}</span>
          {!rule.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rule.body}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Switch
          checked={rule.is_active}
          onCheckedChange={(v) => onToggle(rule.id, v)}
          className="scale-75"
          data-testid={`toggle-rule-${rule.id}`}
        />
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(rule)} data-testid={`edit-rule-${rule.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-300" onClick={() => onDelete(rule.id)} data-testid={`delete-rule-${rule.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RuleForm({ initial, onSave, onCancel }: { initial?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [category, setCategory] = useState(initial?.category ?? "Community Conduct");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [order, setOrder] = useState(initial?.rule_order ?? 0);
  const [active, setActive] = useState(initial?.is_active !== false);

  const valid = category && title.trim() && body.trim();

  return (
    <Card className="border-amber-400/20 bg-amber-400/5">
      <CardContent className="pt-5 pb-4 space-y-3">
        <h4 className="font-black text-sm">{initial ? "Edit Rule" : "Add New Rule"}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs mb-1">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-rule-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1">Rule Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short, clear rule title"
              data-testid="input-rule-title"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1">Body / Description</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Full rule description..."
              rows={3}
              data-testid="input-rule-body"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Display Order</Label>
            <Input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} data-testid="input-rule-order" />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Switch checked={active} onCheckedChange={setActive} data-testid="switch-rule-active" />
            <Label className="text-xs">Active</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" disabled={!valid} onClick={() => onSave({ category, title, body, rule_order: order, is_active: active })} data-testid="button-save-rule">
            {initial ? "Save Changes" : "Add Rule"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} data-testid="button-cancel-rule">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LCTEntry({ entry, onSettle }: { entry: any; onSettle: (id: number, outcome: "won" | "lost", wonLegs: number) => void }) {
  const [settling, setSettling] = useState(false);
  const [wonLegs, setWonLegs] = useState(entry.totalLegs);
  const isSettled = entry.outcome !== "pending";
  const legs: any[] = entry.legs ?? [];

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        borderColor: entry.outcome === "won" ? "rgba(16,185,129,0.3)" : entry.outcome === "lost" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)",
        background: entry.outcome === "won" ? "rgba(16,185,129,0.04)" : entry.outcome === "lost" ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.02)",
      }}
      data-testid={`lct-entry-${entry.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {entry.outcome === "won" ? (
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
          ) : entry.outcome === "lost" ? (
            <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm">{new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</span>
            <Badge
              className={`text-[10px] font-black border ${
                entry.outcome === "won" ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/30"
                  : entry.outcome === "lost" ? "bg-red-500/10 text-red-400 border-red-400/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-400/30"
              }`}
            >
              {entry.outcome === "won" ? "🏆 HIT" : entry.outcome === "lost" ? "MISS" : "PENDING"}
            </Badge>
            {entry.mintedCardId && (
              <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-400/30">
                <Award className="w-2.5 h-2.5 mr-1" />Card Minted
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{entry.totalLegs}-leg parlay · ID: {entry.ticketId}</p>
        </div>
        {!isSettled && (
          <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setSettling(!settling)} data-testid={`settle-toggle-${entry.id}`}>
            {settling ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
            {settling ? "Close" : "Settle"}
          </Button>
        )}
      </div>

      {/* Legs preview */}
      {legs.length > 0 && (
        <div className="grid gap-1">
          {legs.map((leg: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-[10px] font-bold text-amber-400/70 shrink-0">{leg.sport}</span>
              <span className="truncate">{leg.pick}</span>
              <span className="shrink-0 font-mono">{leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}</span>
            </div>
          ))}
        </div>
      )}

      {/* Settlement panel */}
      {settling && !isSettled && (
        <div className="pt-2 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1">Legs Won</Label>
              <Input
                type="number"
                min={0}
                max={entry.totalLegs}
                value={wonLegs}
                onChange={e => setWonLegs(Number(e.target.value))}
                className="h-8 text-sm w-24"
                data-testid={`input-won-legs-${entry.id}`}
              />
            </div>
            <p className="text-xs text-muted-foreground pt-4">out of {entry.totalLegs} legs</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
              onClick={() => { onSettle(entry.id, "won", wonLegs); setSettling(false); }}
              data-testid={`button-settle-won-${entry.id}`}
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5" />Mark as HIT — Auto-Mint Card
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-400/30 text-red-400 text-xs"
              onClick={() => { onSettle(entry.id, "lost", wonLegs); setSettling(false); }}
              data-testid={`button-settle-lost-${entry.id}`}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />Mark as Miss
            </Button>
          </div>
          {wonLegs === entry.totalLegs && (
            <p className="text-xs text-emerald-400">
              All {entry.totalLegs} legs won — a LIFE CHANGER™ HIT card will be auto-minted and featured in the Community Showcase!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminGuidelinesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: rulesData, isLoading: isRulesLoading } = useQuery<{ rules: any[] }>({
    queryKey: ["/api/admin/guidelines"],
  });

  const { data: lctData, isLoading: isLctLoading } = useQuery<{ entries: any[] }>({
    queryKey: ["/api/admin/lct"],
  });

  const createRule = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/guidelines", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guidelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guidelines"] });
      setShowAddForm(false);
      toast({ title: "Rule created" });
    },
    onError: () => toast({ title: "Failed to create rule", variant: "destructive" }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/guidelines/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guidelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guidelines"] });
      setEditingRule(null);
      toast({ title: "Rule updated" });
    },
    onError: () => toast({ title: "Failed to update rule", variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/guidelines/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guidelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guidelines"] });
      toast({ title: "Rule deleted" });
    },
    onError: () => toast({ title: "Failed to delete rule", variant: "destructive" }),
  });

  const settleLct = useMutation({
    mutationFn: async ({ id, outcome, wonLegs }: { id: number; outcome: "won" | "lost"; wonLegs: number }) => {
      const res = await apiRequest("POST", `/api/admin/lct/${id}/settle`, { outcome, wonLegs });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lct"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lct-track-record"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards/community/feed"] });
      if (data.mintedCard) {
        toast({
          title: "🏆 LIFE CHANGER™ HIT — Card Auto-Minted!",
          description: "A legendary S+ card has been created and featured in the Community Showcase.",
        });
      } else {
        toast({ title: "LCT settled" });
      }
    },
    onError: () => toast({ title: "Failed to settle LCT", variant: "destructive" }),
  });

  const rules = rulesData?.rules ?? [];
  const lctEntries = lctData?.entries ?? [];
  const filteredRules = filterCategory === "all" ? rules : rules.filter(r => r.category === filterCategory);

  const lctStats = {
    total: lctEntries.length,
    wins: lctEntries.filter(e => e.outcome === "won").length,
    losses: lctEntries.filter(e => e.outcome === "lost").length,
    pending: lctEntries.filter(e => e.outcome === "pending").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Platform Control Center</h1>
            <p className="text-sm text-muted-foreground">Guidelines management & Life Changer™ settlement</p>
          </div>
        </div>

        <Tabs defaultValue="guidelines">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guidelines" className="gap-2" data-testid="tab-guidelines">
              <Scale className="w-3.5 h-3.5" /> Guidelines Editor
            </TabsTrigger>
            <TabsTrigger value="lct" className="gap-2" data-testid="tab-lct">
              <Ticket className="w-3.5 h-3.5" /> LCT Settlement
            </TabsTrigger>
          </TabsList>

          {/* ─── GUIDELINES TAB ─────────────────────────────────────────── */}
          <TabsContent value="guidelines" className="space-y-4 mt-4" data-testid="content-guidelines">
            <div className="flex items-center gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-52" data-testid="filter-guidelines-category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button size="sm" onClick={() => { setShowAddForm(true); setEditingRule(null); }} data-testid="button-add-rule">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Rule
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/guidelines" target="_blank" rel="noreferrer">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />Preview
                </a>
              </Button>
            </div>

            {showAddForm && !editingRule && (
              <RuleForm
                onSave={(data) => createRule.mutate(data)}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {isRulesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-full h-16 rounded-lg" />)}
              </div>
            ) : filteredRules.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <Scale className="w-8 h-8 mx-auto opacity-20 mb-2" />
                  <p className="text-muted-foreground text-sm">No rules found. Add the first one above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredRules.map(rule => (
                  editingRule?.id === rule.id ? (
                    <RuleForm
                      key={rule.id}
                      initial={rule}
                      onSave={(data) => updateRule.mutate({ id: rule.id, data })}
                      onCancel={() => setEditingRule(null)}
                    />
                  ) : (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onEdit={setEditingRule}
                      onDelete={(id) => deleteRule.mutate(id)}
                      onToggle={(id, active) => updateRule.mutate({ id, data: { is_active: active } })}
                    />
                  )
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border/20">
              <p className="text-xs text-muted-foreground">{rules.length} total rules · {rules.filter(r => r.is_active).length} active · {rules.filter(r => !r.is_active).length} inactive</p>
            </div>
          </TabsContent>

          {/* ─── LCT SETTLEMENT TAB ─────────────────────────────────────── */}
          <TabsContent value="lct" className="space-y-4 mt-4" data-testid="content-lct">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Tracked", value: lctStats.total, color: "text-foreground" },
                { label: "Hits", value: lctStats.wins, color: "text-emerald-400" },
                { label: "Misses", value: lctStats.losses, color: "text-red-400" },
                { label: "Pending", value: lctStats.pending, color: "text-amber-400" },
              ].map(stat => (
                <Card key={stat.label} className="border-border/30">
                  <CardContent className="py-3 px-4 text-center">
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {lctStats.wins > 0 && (
              <div className="p-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 text-sm">
                <span className="font-black text-emerald-400">Hit Rate: </span>
                <span className="text-emerald-300">{Math.round((lctStats.wins / (lctStats.wins + lctStats.losses || 1)) * 100)}%</span>
                <span className="text-muted-foreground"> on {lctStats.wins + lctStats.losses} settled tickets</span>
              </div>
            )}

            <div
              className="p-4 rounded-xl border text-sm space-y-1"
              style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}
            >
              <p className="font-black text-emerald-400">Auto-Mint on Win</p>
              <p className="text-muted-foreground text-xs">When you settle an LCT as "HIT" with all legs won, a legendary LIFE CHANGER™ S+ card is automatically minted and featured in the Community Showcase. Members will see it.</p>
            </div>

            {isLctLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-28 rounded-xl" />)}
              </div>
            ) : lctEntries.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <Ticket className="w-8 h-8 mx-auto opacity-20 mb-2" />
                  <p className="text-muted-foreground text-sm">No Life Changer™ tickets have been logged yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">They are automatically logged when a member views the Daily Life Changer™ ticket.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lctEntries.map((entry: any) => (
                  <LCTEntry
                    key={entry.id}
                    entry={{
                      id: entry.id,
                      date: entry.date,
                      ticketId: entry.ticket_id,
                      legs: entry.legs,
                      totalLegs: entry.total_legs,
                      outcome: entry.outcome,
                      wonLegs: entry.won_legs,
                      settledAt: entry.settled_at,
                      mintedCardId: entry.minted_card_id,
                    }}
                    onSettle={(id, outcome, wonLegs) => settleLct.mutate({ id, outcome, wonLegs })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

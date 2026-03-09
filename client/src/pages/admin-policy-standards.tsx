import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck, BookOpen, Cpu, Megaphone, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
  Scale, FileText, Bot, Star, Zap, Lock, Phone
} from "lucide-react";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const POLICY_CATEGORIES = [
  "Company Policies",
  "Operational Procedures",
  "Model & Grade Standards",
  "AI Brand Standards",
];

const CATEGORY_META: Record<string, { icon: any; color: string; description: string; tab: string }> = {
  "Company Policies":        { icon: Scale,    color: "blue",   description: "Legal, privacy, responsible gambling, and subscription policies", tab: "policies" },
  "Operational Procedures":  { icon: FileText, color: "purple", description: "Step-by-step SOPs for platform operations", tab: "procedures" },
  "Model & Grade Standards": { icon: Star,     color: "amber",  description: "Grade thresholds, EV requirements, data source standards", tab: "standards" },
  "AI Brand Standards":      { icon: Bot,      color: "green",  description: "AI voice, prohibited language, required disclosures", tab: "ai" },
};

const TAB_COLORS: Record<string, string> = {
  policies:   "text-blue-400",
  procedures: "text-purple-400",
  standards:  "text-amber-400",
  ai:         "text-green-400",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-yellow-300 border-yellow-400/40 bg-yellow-400/10",
  "A":  "text-green-300 border-green-400/40 bg-green-400/10",
  "A-": "text-lime-300 border-lime-400/40 bg-lime-400/10",
  "B+": "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  "B":  "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  "B-": "text-blue-300 border-blue-400/40 bg-blue-400/10",
  "C":  "text-muted-foreground border-border/40 bg-muted/10",
};

function EntryCard({ entry, onEdit, onDelete, onToggle }: { entry: any; onEdit: (e: any) => void; onDelete: (id: number) => void; onToggle: (id: number, v: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border rounded-lg p-3 transition-all ${entry.is_active ? "border-border/40 bg-card/30" : "border-border/20 bg-muted/5 opacity-50"}`} data-testid={`policy-entry-${entry.id}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{entry.title}</span>
            {!entry.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
          </div>
          <p className={`text-xs text-muted-foreground mt-1 ${!expanded ? "line-clamp-2" : ""}`}>{entry.body}</p>
          {entry.body?.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary/60 hover:text-primary mt-0.5 flex items-center gap-0.5" data-testid={`expand-entry-${entry.id}`}>
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read full</>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={entry.is_active} onCheckedChange={(v) => onToggle(entry.id, v)} className="scale-75" data-testid={`toggle-entry-${entry.id}`} />
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(entry)} data-testid={`edit-entry-${entry.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-300" onClick={() => onDelete(entry.id)} data-testid={`delete-entry-${entry.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

function EntryForm({ initial, category, onSave, onCancel }: { initial?: any; category: string; onSave: (d: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [order, setOrder] = useState(initial?.rule_order ?? 0);
  const [active, setActive] = useState(initial?.is_active !== false);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-5 pb-4 space-y-3">
        <h4 className="font-black text-sm">{initial ? "Edit Entry" : "Add New Entry"} — {category}</h4>
        <div>
          <Label className="text-xs mb-1">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title..." className="h-8 text-sm" data-testid="input-entry-title" />
        </div>
        <div>
          <Label className="text-xs mb-1">Content</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Full policy, procedure, or standard text..." rows={5} className="text-sm resize-none" data-testid="input-entry-body" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Display Order</Label>
            <Input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-16 h-7 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} className="scale-75" />
            <Label className="text-xs">Active</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onSave({ title, body, rule_order: order, is_active: active, category })} disabled={!title.trim() || !body.trim()} data-testid="button-save-entry">Save</Button>
          <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-entry">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CategorySection({ category, entries, onEdit, onDelete, onToggle, onAdd }: any) {
  const meta = CATEGORY_META[category];
  const Icon = meta?.icon || FileText;
  const active = entries.filter((e: any) => e.is_active).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${meta?.color || "muted"}-400`} />
          <span className="font-bold text-sm">{category}</span>
          <Badge variant="outline" className="text-[10px]">{active}/{entries.length} active</Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAdd(category)} data-testid={`add-entry-${category.replace(/\s+/g, '-').toLowerCase()}`}>
          <Plus className="w-3 h-3" /> Add Entry
        </Button>
      </div>
      <div className="space-y-2">
        {entries.map((e: any) => (
          <EntryCard key={e.id} entry={e} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/30 rounded-lg">
            No entries yet — click "Add Entry" or use "Seed Defaults" to populate.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminPolicyStandards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/policy-standards"],
  });

  const { data: meta } = useQuery<any>({
    queryKey: ["/api/admin/company-standards/metadata"],
    staleTime: 5 * 60 * 1000,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/policy-standards/seed").then(r => r.json()),
    onSuccess: (d) => {
      toast({ title: "Defaults Seeded", description: `${d.inserted} entries added, ${d.skipped} already existed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policy-standards"] });
    },
    onError: () => toast({ title: "Seed Failed", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (payload.id) {
        return apiRequest("PATCH", `/api/admin/guidelines/${payload.id}`, payload).then(r => r.json());
      }
      return apiRequest("POST", "/api/admin/guidelines", payload).then(r => r.json());
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policy-standards"] });
      setEditingEntry(null);
      setAddingCategory(null);
    },
    onError: () => toast({ title: "Save Failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/guidelines/${id}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policy-standards"] });
    },
    onError: () => toast({ title: "Delete Failed", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiRequest("PATCH", `/api/admin/guidelines/${id}`, { is_active }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/policy-standards"] }),
  });

  const grouped = data?.grouped || {};
  const total = data?.total || 0;

  const handleSave = (formData: any) => {
    if (editingEntry?.id) {
      saveMutation.mutate({ ...formData, id: editingEntry.id });
    } else {
      saveMutation.mutate(formData);
    }
  };

  const policiesEntries = Object.entries(grouped).filter(([cat]) => cat === "Company Policies");
  const proceduresEntries = Object.entries(grouped).filter(([cat]) => cat === "Operational Procedures");
  const standardsEntries = Object.entries(grouped).filter(([cat]) => cat === "Model & Grade Standards");
  const aiEntries = Object.entries(grouped).filter(([cat]) => cat === "AI Brand Standards");

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto" data-testid="admin-policy-standards-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Policy, Procedures & Standards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Company-wide policies, operational SOPs, model standards, and AI compliance rules. {total > 0 && <span className="text-primary font-medium">{total} entries active</span>}
          </p>
        </div>
        <Button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          data-testid="button-seed-defaults"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? "animate-spin" : ""}`} />
          {seedMutation.isPending ? "Seeding..." : "Seed Defaults"}
        </Button>
      </div>

      {total === 0 && !isLoading && (
        <Card className="border-amber-400/20 bg-amber-400/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-300">No policies seeded yet</p>
              <p className="text-xs text-muted-foreground">Click "Seed Defaults" to populate all company policies, procedures, model standards, and AI compliance rules automatically.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="policies">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="policies" className="text-xs gap-1.5" data-testid="tab-policies">
            <Scale className="w-3.5 h-3.5" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="procedures" className="text-xs gap-1.5" data-testid="tab-procedures">
            <FileText className="w-3.5 h-3.5" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="standards" className="text-xs gap-1.5" data-testid="tab-standards">
            <Star className="w-3.5 h-3.5" />
            Standards
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1.5" data-testid="tab-ai-compliance">
            <Bot className="w-3.5 h-3.5" />
            AI Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-6 mt-4">
          <Card className="border-blue-400/15 bg-blue-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
                <Scale className="w-4 h-4" /> Company Policies
              </CardTitle>
              <CardDescription className="text-xs">Legal, privacy, responsible gambling, subscription, and acceptable use policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  {addingCategory === "Company Policies" && (
                    <EntryForm category="Company Policies" onSave={handleSave} onCancel={() => setAddingCategory(null)} />
                  )}
                  {editingEntry?.category === "Company Policies" && (
                    <EntryForm initial={editingEntry} category="Company Policies" onSave={handleSave} onCancel={() => setEditingEntry(null)} />
                  )}
                  <CategorySection
                    category="Company Policies"
                    entries={(grouped["Company Policies"] || []).filter((e: any) => editingEntry?.id !== e.id)}
                    onEdit={(e: any) => { setEditingEntry(e); setAddingCategory(null); }}
                    onDelete={(id: number) => deleteMutation.mutate(id)}
                    onToggle={(id: number, v: boolean) => toggleMutation.mutate({ id, is_active: v })}
                    onAdd={(cat: string) => { setAddingCategory(cat); setEditingEntry(null); }}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-400/15 bg-amber-400/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-300">Responsible Gambling Resources</p>
                  <p className="text-xs text-muted-foreground mt-0.5">National Problem Gambling Helpline: <span className="font-bold text-amber-300">1-800-522-4700</span> · <span className="font-semibold">ncpgambling.org</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">The responsible gambling notice is displayed on the Parlay Builder, Daily Picks, and Onboarding pages.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4 mt-4">
          <Card className="border-purple-400/15 bg-purple-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                <FileText className="w-4 h-4" /> Operational Procedures
              </CardTitle>
              <CardDescription className="text-xs">Step-by-step SOPs for pick generation, settlement, tier management, and account review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  {addingCategory === "Operational Procedures" && (
                    <EntryForm category="Operational Procedures" onSave={handleSave} onCancel={() => setAddingCategory(null)} />
                  )}
                  {editingEntry?.category === "Operational Procedures" && (
                    <EntryForm initial={editingEntry} category="Operational Procedures" onSave={handleSave} onCancel={() => setEditingEntry(null)} />
                  )}
                  <CategorySection
                    category="Operational Procedures"
                    entries={(grouped["Operational Procedures"] || []).filter((e: any) => editingEntry?.id !== e.id)}
                    onEdit={(e: any) => { setEditingEntry(e); setAddingCategory(null); }}
                    onDelete={(id: number) => deleteMutation.mutate(id)}
                    onToggle={(id: number, v: boolean) => toggleMutation.mutate({ id, is_active: v })}
                    onAdd={(cat: string) => { setAddingCategory(cat); setEditingEntry(null); }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="space-y-4 mt-4">
          <Card className="border-amber-400/15 bg-amber-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <Star className="w-4 h-4" /> Grade Scale Reference
              </CardTitle>
              <CardDescription className="text-xs">Live view — sourced directly from the prediction engine. Admin cannot override grades.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-1.5 pr-4 font-bold text-muted-foreground">Grade</th>
                      <th className="text-left py-1.5 pr-4 font-bold text-muted-foreground">Label</th>
                      <th className="text-left py-1.5 pr-4 font-bold text-muted-foreground">Min Confidence</th>
                      <th className="text-left py-1.5 font-bold text-muted-foreground">Min EV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(meta?.gradeRows ?? []).map((row: any) => (
                      <tr key={row.grade} className="border-b border-border/20">
                        <td className="py-1.5 pr-4">
                          <Badge className={`text-xs font-black border ${GRADE_COLORS[row.grade] ?? "text-muted-foreground border-border/40 bg-muted/10"}`}>{row.grade}</Badge>
                        </td>
                        <td className="py-1.5 pr-4 font-medium">{row.label}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">≥{row.minConfidence}%</td>
                        <td className="py-1.5 text-muted-foreground">≥{row.minEV}%</td>
                      </tr>
                    ))}
                    {!meta && (
                      <tr><td colSpan={4} className="py-2 text-center text-muted-foreground/50 text-[10px]">Loading from engine…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                <Lock className="w-3 h-3" />
                <span>Grade thresholds are enforced in the prediction engine — not editable here. Contact engineering to adjust.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-400/15 bg-amber-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <Zap className="w-4 h-4" /> Model Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Factor Count", "46"],
                  ["Simulations (Standard)", "10,000 per matchup"],
                  ["Deep Simulations", "100,000 (overnight)"],
                  ["Calibration Window", "90 days"],
                  ["Min EV (publication)", "5%"],
                  ["Min Confidence (publication)", "50%"],
                  ["Max Legs / Parlay", "6"],
                  ["Kelly Fraction (default)", "0.25x (Quarter Kelly)"],
                  ["Daily Cap (default)", "5% of bankroll"],
                  ["Data Refresh — Live Games", "Every 60 seconds"],
                  ["Odds Refresh", "Every 5 min (live) / 30 min (pre-game)"],
                  ["Roster/Injury Refresh", "Every 6 hours"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold text-right">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-400/15 bg-amber-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <BookOpen className="w-4 h-4" /> Model & Grade Standards Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  {addingCategory === "Model & Grade Standards" && (
                    <EntryForm category="Model & Grade Standards" onSave={handleSave} onCancel={() => setAddingCategory(null)} />
                  )}
                  {editingEntry?.category === "Model & Grade Standards" && (
                    <EntryForm initial={editingEntry} category="Model & Grade Standards" onSave={handleSave} onCancel={() => setEditingEntry(null)} />
                  )}
                  <CategorySection
                    category="Model & Grade Standards"
                    entries={(grouped["Model & Grade Standards"] || []).filter((e: any) => editingEntry?.id !== e.id)}
                    onEdit={(e: any) => { setEditingEntry(e); setAddingCategory(null); }}
                    onDelete={(id: number) => deleteMutation.mutate(id)}
                    onToggle={(id: number, v: boolean) => toggleMutation.mutate({ id, is_active: v })}
                    onAdd={(cat: string) => { setAddingCategory(cat); setEditingEntry(null); }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card className="border-green-400/15 bg-green-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" /> Live AI Standards Context
              </CardTitle>
              <CardDescription className="text-xs">
                This block is injected into every AI prompt on the platform — pick explanations, parlay analysis, LCT, strategy advisor, and the admin assistant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black/40 rounded-lg p-3 border border-green-400/20 font-mono text-[10px] text-green-300/80 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto" data-testid="ai-context-preview">
{`PLATFORM STANDARDS (Sors Maxima — 46-Factor Model Analysis™):

BRAND VOICE & TONE:
- Professional, direct, analytical, data-driven
- Concise insights backed by statistical evidence. No hype. No false promises.
- Reference teams in third person; use "our" or "the model" for platform references

GRADE SCALE (confidence / EV thresholds):
- A+ = 85%+ confidence, 25%+ EV (Elite Pick)
- A  = 75%+ confidence, 18%+ EV (Sharp Pick)
- B+ = 65%+ confidence, 12%+ EV (Strong Pick)
- B  = 55%+ confidence, 8%+ EV (Solid Pick)
- B- = 50%+ confidence, 5%+ EV (Value Pick)
- C  = Below thresholds (Informational only)

COMPLIANCE RULES — ABSOLUTE (NEVER violate):
- NEVER use: guaranteed profit, guaranteed win, zero-loss, can't lose,
  cannot lose, risk-free bet, 100% win, or similar
- NEVER promise or imply guaranteed outcomes
- ALWAYS frame picks as data-driven analysis, not financial advice
- Sports betting involves financial risk — acknowledge when appropriate
- Model recommendations are probabilistic, not certain

REQUIRED DISCLOSURE:
"Past performance does not guarantee future results."

PICK EXPLANATION RULES:
- Maximum 3 sentences per pick explanation
- Reference specific factors from the 46-Factor Model
- State the statistical basis (win probability, EV, key factors)
- No generic phrases — be specific to the matchup data provided`}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/50">
                <Lock className="w-3 h-3" />
                <span>AI context is defined in server/companyStandards.ts — contact engineering to modify the injected standards block.</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-400/15 bg-red-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" /> Prohibited Language (Auto-Enforced)
              </CardTitle>
              <CardDescription className="text-xs">
                Any AI-generated content containing these phrases is automatically flagged and replaced with a compliant fallback before display.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {(meta?.prohibitedPhrases ?? []).map((phrase: string) => (
                  <Badge key={phrase} variant="outline" className="text-[10px] border-red-400/30 text-red-300/70 bg-red-400/5">
                    "{phrase}"
                  </Badge>
                ))}
                {!meta && (
                  <span className="text-[10px] text-muted-foreground/50">Loading from engine…</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-400/15 bg-green-400/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                <Bot className="w-4 h-4" /> AI Brand Standards Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                <>
                  {addingCategory === "AI Brand Standards" && (
                    <EntryForm category="AI Brand Standards" onSave={handleSave} onCancel={() => setAddingCategory(null)} />
                  )}
                  {editingEntry?.category === "AI Brand Standards" && (
                    <EntryForm initial={editingEntry} category="AI Brand Standards" onSave={handleSave} onCancel={() => setEditingEntry(null)} />
                  )}
                  <CategorySection
                    category="AI Brand Standards"
                    entries={(grouped["AI Brand Standards"] || []).filter((e: any) => editingEntry?.id !== e.id)}
                    onEdit={(e: any) => { setEditingEntry(e); setAddingCategory(null); }}
                    onDelete={(id: number) => deleteMutation.mutate(id)}
                    onToggle={(id: number, v: boolean) => toggleMutation.mutate({ id, is_active: v })}
                    onAdd={(cat: string) => { setAddingCategory(cat); setEditingEntry(null); }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

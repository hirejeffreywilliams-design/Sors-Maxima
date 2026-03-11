import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import {
  Trophy, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle,
  MinusCircle, Trash2, ChevronDown, ChevronUp, Pencil, Save,
  Filter, SortDesc, ReceiptText, DollarSign, Percent, Target,
  Plus, ArrowLeft, BarChart3, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface SavedBetLeg {
  pick: string;
  market: string;
  odds: number;
  game: string;
  sport: string;
  team: string;
  opponent?: string;
}

interface SavedBet {
  id: string;
  timestamp: string;
  legs: SavedBetLeg[];
  totalOdds: number;
  totalAmericanOdds: number;
  stake: number | null;
  status: "pending" | "won" | "lost" | "push";
  notes?: string;
}

function useMyBets() {
  const [bets, setBets] = useState<SavedBet[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("sors_my_bets");
    if (raw) {
      try {
        setBets(JSON.parse(raw));
      } catch {
        setBets([]);
      }
    }
  }, []);

  const persist = useCallback((next: SavedBet[]) => {
    setBets(next);
    localStorage.setItem("sors_my_bets", JSON.stringify(next));
  }, []);

  const updateBet = useCallback((id: string, patch: Partial<SavedBet>) => {
    setBets(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...patch } : b);
      localStorage.setItem("sors_my_bets", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBet = useCallback((id: string) => {
    setBets(prev => {
      const next = prev.filter(b => b.id !== id);
      localStorage.setItem("sors_my_bets", JSON.stringify(next));
      return next;
    });
  }, []);

  return { bets, updateBet, removeBet };
}

function formatOddsDisplay(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusConfig(status: SavedBet["status"]) {
  switch (status) {
    case "won":  return { label: "WON",     icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", border: "border-l-emerald-500" };
    case "lost": return { label: "LOST",    icon: XCircle,      color: "text-red-600 dark:text-red-400",     bg: "bg-red-500/10 border-red-500/25",         border: "border-l-red-500" };
    case "push": return { label: "PUSH",    icon: MinusCircle,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10 border-blue-500/25",        border: "border-l-blue-500" };
    default:     return { label: "PENDING", icon: Clock,        color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/25",      border: "border-l-amber-500" };
  }
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border rounded-xl p-3 flex flex-col gap-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-xl font-black font-mono ${color ?? ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BetCard({ bet, onUpdate, onRemove }: {
  bet: SavedBet;
  onUpdate: (patch: Partial<SavedBet>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingStake, setEditingStake] = useState(false);
  const [stakeInput, setStakeInput] = useState(bet.stake?.toString() ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(bet.notes ?? "");
  const { toast } = useToast();

  const cfg = statusConfig(bet.status);
  const StatusIcon = cfg.icon;

  const payout = bet.stake != null && bet.status === "won"
    ? (bet.totalOdds * bet.stake).toFixed(2)
    : bet.stake != null
    ? ((bet.totalOdds - 1) * bet.stake).toFixed(2)
    : null;

  const handleSaveStake = () => {
    const val = parseFloat(stakeInput);
    if (!isNaN(val) && val > 0) {
      onUpdate({ stake: val });
      toast({ title: "Stake updated" });
    }
    setEditingStake(false);
  };

  const handleSaveNotes = () => {
    onUpdate({ notes: notesInput.trim() });
    setEditingNotes(false);
  };

  const handleStatus = (status: SavedBet["status"]) => {
    onUpdate({ status });
    toast({
      title: status === "won" ? "🎉 Marked as Won!" : status === "lost" ? "Marked as Lost" : status === "push" ? "Marked as Push" : "Reset to Pending",
    });
  };

  return (
    <div
      className={`rounded-xl border border-l-4 bg-card overflow-hidden transition-all ${cfg.border}`}
      data-testid={`bet-card-${bet.id}`}
    >
      <button
        className="w-full text-left p-3.5"
        onClick={() => setExpanded(e => !e)}
        data-testid={`button-expand-${bet.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${cfg.bg} ${cfg.color} border`}>
                <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                {cfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{formatDate(bet.timestamp)}</span>
              <span className="text-[10px] text-muted-foreground">{bet.legs.length} leg{bet.legs.length !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-sm font-bold truncate">
              {bet.legs.slice(0, 2).map(l => l.team).join(" · ")}
              {bet.legs.length > 2 && <span className="text-muted-foreground"> · +{bet.legs.length - 2} more</span>}
            </p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
            <p className="text-base font-black font-mono">{formatOddsDisplay(bet.totalAmericanOdds)}</p>
            {bet.stake != null && (
              <p className="text-[10px] text-muted-foreground">
                {bet.status === "won" ? `Won $${((bet.totalOdds - 1) * bet.stake).toFixed(2)}` : `Stake $${bet.stake}`}
              </p>
            )}
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground mt-1" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground mt-1" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-3.5 space-y-4">
          <div className="space-y-2">
            {bet.legs.map((leg, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-[12px]" data-testid={`leg-${bet.id}-${i}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{leg.team} — {leg.pick}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{leg.game}</p>
                </div>
                <p className="shrink-0 font-mono font-bold">{formatOddsDisplay(leg.odds)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t pt-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stake</p>
              {editingStake ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={stakeInput}
                    onChange={e => setStakeInput(e.target.value)}
                    className="h-7 text-xs w-20"
                    placeholder="0.00"
                    data-testid={`input-stake-${bet.id}`}
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleSaveStake(); if (e.key === "Escape") setEditingStake(false); }}
                  />
                  <Button size="sm" className="h-7 px-2" onClick={handleSaveStake} data-testid={`button-save-stake-${bet.id}`}>
                    <Save className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 text-sm font-bold hover:text-primary transition-colors"
                  onClick={() => { setEditingStake(true); setStakeInput(bet.stake?.toString() ?? ""); }}
                  data-testid={`button-edit-stake-${bet.id}`}
                >
                  {bet.stake != null ? `$${bet.stake}` : <span className="text-muted-foreground text-xs">Set stake</span>}
                  <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {bet.status === "won" ? "Profit" : "To Win"}
              </p>
              <p className={`text-sm font-bold font-mono ${bet.status === "won" ? "text-emerald-600" : ""}`}>
                {bet.stake != null ? `$${((bet.totalOdds - 1) * bet.stake).toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Update Result</p>
            <div className="flex gap-1.5 flex-wrap">
              {(["won", "lost", "push", "pending"] as const).map(s => {
                const c = statusConfig(s);
                const active = bet.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      active ? `${c.bg} ${c.color} border-current` : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}
                    data-testid={`button-status-${s}-${bet.id}`}
                  >
                    <c.icon className="w-3 h-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</p>
              {!editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5" data-testid={`button-edit-notes-${bet.id}`}>
                  <Pencil className="w-2.5 h-2.5" /> Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-1.5">
                <Textarea
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  placeholder="e.g. injury news, sharp action, why I took this..."
                  className="text-xs resize-none h-16"
                  data-testid={`input-notes-${bet.id}`}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveNotes} data-testid={`button-save-notes-${bet.id}`}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {bet.notes || "No notes yet — tap Edit to add context about this bet."}
              </p>
            )}
          </div>

          <div className="flex justify-end border-t pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={onRemove}
              data-testid={`button-delete-bet-${bet.id}`}
            >
              <Trash2 className="w-3 h-3" /> Delete Bet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyBetsPage() {
  const { bets, updateBet, removeBet } = useMyBets();
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost" | "push">("all");
  const { toast } = useToast();

  const stats = useMemo(() => {
    const won = bets.filter(b => b.status === "won");
    const lost = bets.filter(b => b.status === "lost");
    const pending = bets.filter(b => b.status === "pending");
    const push = bets.filter(b => b.status === "push");
    const staked = bets.filter(b => b.stake != null).reduce((s, b) => s + (b.stake ?? 0), 0);
    const profit = won.reduce((s, b) => s + (b.stake != null ? (b.totalOdds - 1) * b.stake : 0), 0)
                 - lost.reduce((s, b) => s + (b.stake ?? 0), 0);
    const roi = staked > 0 ? (profit / staked) * 100 : 0;
    const settled = won.length + lost.length;
    const winRate = settled > 0 ? (won.length / settled) * 100 : 0;
    return { won: won.length, lost: lost.length, pending: pending.length, push: push.length, staked, profit, roi, winRate };
  }, [bets]);

  const filtered = useMemo(() => {
    if (filter === "all") return bets;
    return bets.filter(b => b.status === filter);
  }, [bets, filter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-primary" />
              My Bet Tracker
            </h1>
            <p className="text-xs text-muted-foreground">
              {bets.length} bet{bets.length !== 1 ? "s" : ""} tracked · tap a card to edit
            </p>
          </div>
        </div>

        {bets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Total Bets" value={`${bets.length}`} sub={`${stats.won}W · ${stats.lost}L · ${stats.push}P`} />
            <StatCard
              label="P&L"
              value={`${stats.profit >= 0 ? "+" : ""}$${Math.abs(stats.profit).toFixed(0)}`}
              sub={stats.staked > 0 ? `on $${stats.staked.toFixed(0)} staked` : "no stakes set"}
              color={stats.profit > 0 ? "text-emerald-600" : stats.profit < 0 ? "text-red-500" : ""}
            />
            <StatCard
              label="ROI"
              value={`${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(1)}%`}
              sub="return on investment"
              color={stats.roi > 0 ? "text-emerald-600" : stats.roi < 0 ? "text-red-500" : ""}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(0)}%`}
              sub={`${stats.won + stats.lost} settled`}
              color={stats.winRate >= 55 ? "text-emerald-600" : stats.winRate >= 45 ? "text-amber-500" : "text-red-500"}
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "won", "lost", "push"] as const).map(f => {
            const count = f === "all" ? bets.length : bets.filter(b => b.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted/60"
                }`}
                data-testid={`filter-${f}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className={`text-[10px] px-1 rounded-full font-bold ${filter === f ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            {bets.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ReceiptText className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm">No bets tracked yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Build a parlay in the bet slip, set your stake, and tap <strong>"Place at Sportsbook"</strong> — it will appear here automatically.
                  </p>
                </div>
                <Link href="/generate">
                  <Button size="sm" className="gap-1.5" data-testid="button-go-generate">
                    <Plus className="w-3.5 h-3.5" /> Build a Ticket
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No {filter} bets found</p>
                <button onClick={() => setFilter("all")} className="text-xs text-primary hover:underline">Show all bets</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(bet => (
              <BetCard
                key={bet.id}
                bet={bet}
                onUpdate={patch => updateBet(bet.id, patch)}
                onRemove={() => {
                  removeBet(bet.id);
                  toast({ title: "Bet removed" });
                }}
              />
            ))}
          </div>
        )}

        {bets.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pb-4">
            Bets are saved on this device · tap any card to expand, edit stake or result
          </p>
        )}
      </div>
    </div>
  );
}

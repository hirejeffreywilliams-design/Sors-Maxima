import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  History,
  Trophy,
  TrendingUp,
  TrendingDown,
  Trash2,
  Check,
  X,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Minus,
} from "lucide-react";
import type { GeneratedTicket, TicketLeg } from "@/lib/ticket-orchestrator";

export interface SavedTicket {
  id: string;
  name: string;
  sport: string;
  legs: TicketLeg[];
  totalOdds: number;
  americanOdds: number;
  recommendedStake: number;
  potentialPayout: number;
  grade: string;
  savedAt: string;
  status: "pending" | "won" | "lost" | "push";
  settledAt?: string;
  actualPL?: number;
}

const STORAGE_KEY = "sors_ticket_history";

function loadTickets(): SavedTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTicket[];
  } catch {
    return [];
  }
}

function persistTickets(tickets: SavedTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function saveTicketToHistory(ticket: GeneratedTicket): SavedTicket {
  const saved: SavedTicket = {
    id: ticket.id + "_" + Date.now(),
    name: ticket.name,
    sport: ticket.sport,
    legs: ticket.legs,
    totalOdds: ticket.totalOdds,
    americanOdds: ticket.americanOdds,
    recommendedStake: ticket.recommendedStake,
    potentialPayout: ticket.potentialPayout,
    grade: ticket.grade,
    savedAt: new Date().toISOString(),
    status: "pending",
  };
  const existing = loadTickets();
  existing.unshift(saved);
  persistTickets(existing);
  return saved;
}

function formatOdds(american: number) {
  return american > 0 ? `+${american}` : `${american}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: SavedTicket["status"] }) {
  const config = {
    pending: { label: "Pending", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
    won: { label: "Won", className: "bg-green-500/15 text-green-500 border-green-500/30" },
    lost: { label: "Lost", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    push: { label: "Push", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`} data-testid={`badge-status-${status}`}>
      {status === "pending" && <Clock className="w-3 h-3 mr-1" />}
      {status === "won" && <Check className="w-3 h-3 mr-1" />}
      {status === "lost" && <X className="w-3 h-3 mr-1" />}
      {status === "push" && <Minus className="w-3 h-3 mr-1" />}
      {c.label}
    </Badge>
  );
}

function SummaryStats({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets.filter((t) => t.status !== "pending");
  const wins = tickets.filter((t) => t.status === "won").length;
  const losses = tickets.filter((t) => t.status === "lost").length;
  const pushes = tickets.filter((t) => t.status === "push").length;
  const winRate = settled.length > 0 ? (wins / (wins + losses)) * 100 : 0;
  const totalStaked = settled.reduce((sum, t) => sum + t.recommendedStake, 0);
  const totalPL = settled.reduce((sum, t) => sum + (t.actualPL ?? 0), 0);
  const roi = totalStaked > 0 ? (totalPL / totalStaked) * 100 : 0;

  const stats = [
    { label: "Total Tickets", value: tickets.length.toString(), icon: History, testId: "stat-total" },
    { label: "Won / Lost / Push", value: `${wins} / ${losses} / ${pushes}`, icon: Trophy, testId: "stat-record" },
    { label: "Win Rate", value: settled.length > 0 ? `${winRate.toFixed(1)}%` : "—", icon: TrendingUp, testId: "stat-winrate" },
    { label: "ROI", value: settled.length > 0 ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—", icon: BarChart3, testId: "stat-roi", color: roi >= 0 ? "text-green-500" : "text-red-400" },
    { label: "Profit / Loss", value: settled.length > 0 ? `${totalPL >= 0 ? "+" : ""}$${totalPL.toFixed(2)}` : "—", icon: totalPL >= 0 ? TrendingUp : TrendingDown, testId: "stat-pl", color: totalPL >= 0 ? "text-green-500" : "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="summary-stats">
      {stats.map((s) => (
        <Card key={s.testId}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-4 h-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color ?? ""}`} data-testid={s.testId}>
              {s.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PerformanceChart({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets
    .filter((t) => t.status !== "pending" && t.actualPL !== undefined)
    .slice(0, 20)
    .reverse();

  if (settled.length === 0) return null;

  const maxAbs = Math.max(...settled.map((t) => Math.abs(t.actualPL ?? 0)), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          P/L History (Last 20)
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-end gap-1 h-40" data-testid="performance-chart">
          {settled.map((t, i) => {
            const pl = t.actualPL ?? 0;
            const pct = (Math.abs(pl) / maxAbs) * 100;
            const isPositive = pl >= 0;
            return (
              <div
                key={t.id}
                className="flex-1 flex flex-col justify-end items-center h-full relative"
                data-testid={`chart-bar-${i}`}
              >
                {isPositive ? (
                  <div className="w-full flex flex-col justify-end h-1/2">
                    <div
                      className="w-full bg-green-500 rounded-t-sm min-h-[2px]"
                      style={{ height: `${pct}%` }}
                      title={`$${pl.toFixed(2)}`}
                    />
                  </div>
                ) : (
                  <>
                    <div className="w-full h-1/2" />
                    <div
                      className="w-full bg-red-400 rounded-b-sm min-h-[2px]"
                      style={{ height: `${pct}%` }}
                      title={`-$${Math.abs(pl).toFixed(2)}`}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-sm inline-block" /> Profit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Loss
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ROIBySport({ tickets }: { tickets: SavedTicket[] }) {
  const settled = tickets.filter((t) => t.status !== "pending");
  if (settled.length === 0) return null;

  const sportMap = new Map<string, { wins: number; losses: number; pushes: number; staked: number; pl: number }>();
  settled.forEach((t) => {
    const entry = sportMap.get(t.sport) ?? { wins: 0, losses: 0, pushes: 0, staked: 0, pl: 0 };
    if (t.status === "won") entry.wins++;
    if (t.status === "lost") entry.losses++;
    if (t.status === "push") entry.pushes++;
    entry.staked += t.recommendedStake;
    entry.pl += t.actualPL ?? 0;
    sportMap.set(t.sport, entry);
  });

  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1].pl - a[1].pl);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          ROI by Sport
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3" data-testid="roi-by-sport">
          {sports.map(([sport, data]) => {
            const winRate = data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0;
            const roi = data.staked > 0 ? (data.pl / data.staked) * 100 : 0;
            return (
              <div key={sport} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg" data-testid={`sport-roi-${sport}`}>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sport}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.wins}W – {data.losses}L – {data.pushes}P
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-sm font-bold">{winRate.toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className={`text-sm font-bold ${roi >= 0 ? "text-green-500" : "text-red-400"}`}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketRow({ ticket, onSettle, onDelete }: {
  ticket: SavedTicket;
  onSettle: (id: string, status: "won" | "lost" | "push") => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const pl = ticket.status === "won"
    ? ticket.potentialPayout - ticket.recommendedStake
    : ticket.status === "lost"
    ? -ticket.recommendedStake
    : 0;

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`ticket-row-${ticket.id}`}
      >
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-date-${ticket.id}`}>
          {formatDate(ticket.savedAt)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate" data-testid={`text-name-${ticket.id}`}>{ticket.name}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">{ticket.sport}</Badge>
          </div>
        </TableCell>
        <TableCell className="text-center text-sm" data-testid={`text-legs-${ticket.id}`}>{ticket.legs.length}</TableCell>
        <TableCell className="text-sm font-medium whitespace-nowrap" data-testid={`text-odds-${ticket.id}`}>{formatOdds(ticket.americanOdds)}</TableCell>
        <TableCell className="text-sm whitespace-nowrap" data-testid={`text-stake-${ticket.id}`}>${ticket.recommendedStake.toFixed(0)}</TableCell>
        <TableCell><StatusBadge status={ticket.status} /></TableCell>
        <TableCell className="text-sm whitespace-nowrap" data-testid={`text-payout-${ticket.id}`}>${ticket.potentialPayout.toFixed(0)}</TableCell>
        <TableCell className={`text-sm font-bold whitespace-nowrap ${ticket.status === "pending" ? "text-muted-foreground" : pl >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-pl-${ticket.id}`}>
          {ticket.status === "pending" ? "—" : `${pl >= 0 ? "+" : ""}$${pl.toFixed(2)}`}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {ticket.status === "pending" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "won")}
                  data-testid={`button-mark-won-${ticket.id}`}
                  title="Mark as Won"
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "lost")}
                  data-testid={`button-mark-lost-${ticket.id}`}
                  title="Mark as Lost"
                >
                  <X className="w-4 h-4 text-red-400" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSettle(ticket.id, "push")}
                  data-testid={`button-mark-push-${ticket.id}`}
                  title="Mark as Push"
                >
                  <Minus className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(ticket.id)}
              data-testid={`button-delete-${ticket.id}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow data-testid={`ticket-legs-${ticket.id}`}>
          <TableCell colSpan={9} className="bg-muted/20 p-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leg Details</p>
              {ticket.legs.map((leg) => (
                <div key={leg.id} className="flex items-center justify-between gap-3 p-2.5 bg-muted/30 rounded-lg" data-testid={`leg-detail-${leg.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{leg.outcome}</p>
                    <p className="text-xs text-muted-foreground">{leg.team} vs {leg.opponent}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{leg.market}</Badge>
                  </div>
                  <span className="font-bold text-sm shrink-0">{formatOdds(leg.americanOdds)}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function TicketHistory() {
  const [tickets, setTickets] = useState<SavedTicket[]>([]);

  useEffect(() => {
    setTickets(loadTickets());
  }, []);

  const handleSettle = useCallback((id: string, status: "won" | "lost" | "push") => {
    setTickets((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id) return t;
        let actualPL = 0;
        if (status === "won") actualPL = t.potentialPayout - t.recommendedStake;
        if (status === "lost") actualPL = -t.recommendedStake;
        return { ...t, status, settledAt: new Date().toISOString(), actualPL };
      });
      persistTickets(updated);
      return updated;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTickets((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persistTickets(updated);
      return updated;
    });
  }, []);

  const sorted = [...tickets].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" data-testid="ticket-history-page">
      <div className="flex items-center gap-3 flex-wrap">
        <History className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Ticket History</h1>
        <Badge variant="outline" className="text-xs">{tickets.length} saved</Badge>
      </div>

      <SummaryStats tickets={tickets} />

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <History className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-title">No Tickets Saved Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Generate tickets using the Smart Generator and save them here to track your performance over time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PerformanceChart tickets={sorted} />
            </div>
            <div>
              <ROIBySport tickets={tickets} />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                All Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead className="text-center">Legs</TableHead>
                      <TableHead>Odds</TableHead>
                      <TableHead>Stake</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>P/L</TableHead>
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onSettle={handleSettle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

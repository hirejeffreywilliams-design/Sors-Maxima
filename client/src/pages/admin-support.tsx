import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Bot,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Send,
  Users,
  Zap,
  BarChart3,
  Target,
  User,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";

interface TicketMessage {
  id: string;
  role: "user" | "ai" | "admin";
  content: string;
  timestamp: string;
  confidence?: number;
  sources?: string[];
}

interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: TicketMessage[];
  aiConfidence: number;
  autoResolved: boolean;
  escalationReason?: string;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface SupportStats {
  totalTickets: number;
  autoResolved: number;
  escalated: number;
  avgConfidence: number;
  automationRate: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export default function AdminSupportDashboard() {
  useSEO({ title: "Support Center", description: "Customer support tickets and resolution tracking" });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [resolveText, setResolveText] = useState("");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ticketsQueryUrl = (() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    const qs = params.toString();
    return qs ? `/api/admin/support/tickets?${qs}` : "/api/admin/support/tickets";
  })();

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support/tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await fetch(ticketsQueryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const json = await res.json();
      return Array.isArray(json) ? json : (json.tickets || []);
    },
  });

  const { data: stats } = useQuery<SupportStats>({
    queryKey: ["/api/admin/support/stats"],
  });

  const { data: escalations = [] } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support/escalations"],
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/tickets/${data.ticketId}/respond`, { message: data.message });
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedTicket(data);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/escalations"] });
      toast({ title: "Reply sent" });
    },
    onError: () => toast({ title: "Failed to send reply", variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: { ticketId: string; resolution: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/tickets/${data.ticketId}/resolve`, { resolution: data.resolution });
      return res.json();
    },
    onSuccess: () => {
      setSelectedTicket(null);
      setResolveText("");
      setResolveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/escalations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/stats"] });
      toast({ title: "Ticket resolved" });
    },
    onError: () => toast({ title: "Failed to resolve", variant: "destructive" }),
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "high": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "medium": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "auto_resolved":
      case "resolved":
      case "closed": return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "escalated": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "in_progress": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (selectedTicket) {
    return (
      <div className="min-h-full">
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} data-testid="button-back-tickets">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{selectedTicket.subject}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-[10px] ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status.replace("_", " ")}
                </Badge>
                <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </Badge>
                <span className="text-xs text-muted-foreground">{selectedTicket.username}</span>
                <span className="text-xs text-muted-foreground">{selectedTicket.category}</span>
              </div>
            </div>
            {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
              <Button size="sm" onClick={() => setResolveDialogOpen(true)} data-testid="button-resolve-ticket">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Resolve
              </Button>
            )}
          </div>

          {selectedTicket.escalationReason && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Escalation Reason</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.escalationReason}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-3">
                  {selectedTicket.messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role !== "user" && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          msg.role === "ai" ? "bg-primary/10" : "bg-purple-500/10"
                        }`}>
                          {msg.role === "ai" ? <Bot className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-purple-500" />}
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" :
                        msg.role === "admin" ? "bg-purple-500/10" : "bg-muted"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.confidence !== undefined && (
                          <p className="text-[10px] mt-1 opacity-70">Confidence: {(msg.confidence * 100).toFixed(0)}%</p>
                        )}
                        <p className="text-[10px] mt-1 opacity-50">
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (replyText.trim()) {
                  replyMutation.mutate({ ticketId: selectedTicket.id, message: replyText.trim() });
                }
              }}
              className="flex gap-2"
            >
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type admin reply..."
                disabled={replyMutation.isPending}
                data-testid="input-admin-reply"
              />
              <Button type="submit" disabled={!replyText.trim() || replyMutation.isPending} data-testid="button-send-admin-reply">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Ticket</DialogTitle>
                <DialogDescription>Add a resolution note for this ticket.</DialogDescription>
              </DialogHeader>
              <Textarea
                value={resolveText}
                onChange={(e) => setResolveText(e.target.value)}
                placeholder="Resolution summary..."
                data-testid="input-resolution"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => resolveMutation.mutate({ ticketId: selectedTicket.id, resolution: resolveText || "Resolved by admin" })}
                  disabled={resolveMutation.isPending}
                  data-testid="button-confirm-resolve"
                >
                  Resolve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <MessageCircle className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Support Center</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{stats?.totalTickets || 0}</p>
              <p className="text-xs text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats?.automationRate ? `${stats.automationRate.toFixed(0)}%` : "0%"}
              </p>
              <p className="text-xs text-muted-foreground">Auto-Resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.escalated || 0}</p>
              <p className="text-xs text-muted-foreground">Escalated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">
                {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-tickets">All Tickets</TabsTrigger>
            <TabsTrigger value="escalations" data-testid="tab-escalations">
              Escalations {escalations.length > 0 && `(${escalations.length})`}
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-support-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="auto_resolved">Auto Resolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ticketsLoading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tickets match your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                    data-testid={`admin-ticket-${ticket.id}`}
                  >
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{ticket.subject}</span>
                          <Badge variant="secondary" className={`text-[10px] ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </Badge>
                          {ticket.autoResolved && (
                            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400">
                              <Zap className="w-3 h-3 mr-0.5" />AI resolved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.username}</span>
                          <span>{ticket.category}</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>{ticket.messages.length} messages</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="escalations" className="space-y-2">
            {escalations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium">No pending escalations</p>
                  <p className="text-xs text-muted-foreground">All escalated tickets have been handled</p>
                </CardContent>
              </Card>
            ) : (
              escalations.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="hover-elevate cursor-pointer border-red-500/20"
                  onClick={() => setSelectedTicket(ticket)}
                  data-testid={`escalation-${ticket.id}`}
                >
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{ticket.subject}</span>
                      <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    {ticket.escalationReason && (
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{ticket.escalationReason}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ticket.username}</span>
                      <span>{ticket.category}</span>
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    By Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats?.byCategory && Object.entries(stats.byCategory).length > 0 ? (
                    Object.entries(stats.byCategory).map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{cat.replace("_", " ")}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    By Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats?.byStatus && Object.entries(stats.byStatus).length > 0 ? (
                    Object.entries(stats.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status.replace("_", " ")}</span>
                        <Badge variant="secondary" className={getStatusColor(status)}>{count as number}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    By Priority
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats?.byPriority && Object.entries(stats.byPriority).length > 0 ? (
                    Object.entries(stats.byPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{priority}</span>
                        <Badge variant="secondary" className={getPriorityColor(priority)}>{count as number}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    AI Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Automation Rate</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {stats?.automationRate ? `${stats.automationRate.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg Confidence</span>
                    <span className="font-bold">
                      {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Auto Resolved</span>
                    <span className="font-bold">{stats?.autoResolved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Human Required</span>
                    <span className="font-bold">{stats?.escalated || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

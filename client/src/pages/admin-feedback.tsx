import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquarePlus, Star, Bug, Lightbulb, HelpCircle,
  Heart, Target, TrendingUp, CheckCircle, Clock, Eye,
  Send, Trash2, BarChart3, Users, ThumbsUp, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare
} from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  bug: { label: "Bug Report", icon: Bug, color: "text-red-400", bg: "bg-red-500/10 border-red-500/25" },
  feature: { label: "Feature Request", icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/25" },
  pick_feedback: { label: "Pick Feedback", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" },
  praise: { label: "Praise", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/25" },
  general: { label: "General", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/25" },
  question: { label: "Question", icon: HelpCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/25" },
};

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  open: { label: "Open", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  reviewed: { label: "Reviewed", icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  resolved: { label: "Resolved", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  closed: { label: "Closed", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3 h-3 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function FeedbackItem({ item, onUpdate, onDelete }: { item: any; onUpdate: (id: number, data: object) => void; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState(item.admin_reply || "");
  const [pendingStatus, setPendingStatus] = useState(item.status);
  const cat = CATEGORY_META[item.category] || CATEGORY_META.general;
  const status = STATUS_META[item.status] || STATUS_META.open;
  const CatIcon = cat.icon;

  const handleSave = () => {
    onUpdate(item.id, { status: pendingStatus, admin_reply: replyText || undefined });
    setReplyMode(false);
  };

  return (
    <Card className="border-border/50 hover:border-primary/20 transition-colors" data-testid={`card-admin-feedback-${item.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border shrink-0 ${cat.bg}`}>
            <CatIcon className={`w-4 h-4 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`text-[10px] font-semibold ${cat.bg} ${cat.color} border-current/30`}>
                {cat.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] font-semibold ${status.bg} ${status.color}`}>
                {status.label}
              </Badge>
              {item.rating && <StarDisplay rating={item.rating} />}
              {item.nps !== null && item.nps !== undefined && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">NPS {item.nps}/10</Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{item.username}</span>
              {item.page && <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{item.page}</span>}
            </div>

            {item.subject && <p className="text-sm font-medium">{item.subject}</p>}

            <p className={`text-sm text-muted-foreground ${!expanded ? "line-clamp-3" : ""}`}>{item.message}</p>
            {item.message.length > 160 && (
              <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary/60 hover:text-primary flex items-center gap-1">
                {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
              </button>
            )}

            {item.admin_reply && !replyMode && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">Your reply</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.admin_reply}</p>
              </div>
            )}

            {replyMode && (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply visible to the user..."
                  className="min-h-[80px] resize-none text-sm"
                  data-testid={`textarea-admin-reply-${item.id}`}
                />
                <div className="flex items-center gap-2">
                  <Select value={pendingStatus} onValueChange={setPendingStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs" data-testid={`select-admin-status-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_META).map(([val, meta]) => (
                        <SelectItem key={val} value={val} className="text-xs">{meta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleSave} data-testid={`button-admin-reply-save-${item.id}`}>
                    <Send className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setReplyMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!replyMode && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setReplyMode(true)}
                  data-testid={`button-admin-reply-${item.id}`}
                >
                  <MessageSquare className="w-3 h-3" />
                  {item.admin_reply ? "Edit Reply" : "Reply"}
                </Button>
                {pendingStatus !== "resolved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs text-emerald-400 border-emerald-500/30"
                    onClick={() => onUpdate(item.id, { status: "resolved" })}
                    data-testid={`button-admin-resolve-${item.id}`}
                  >
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-red-400"
                  onClick={() => onDelete(item.id)}
                  data-testid={`button-admin-delete-${item.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminFeedback() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ items: any[]; stats: any }>({
    queryKey: ["/api/admin/feedback", categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ category: categoryFilter, status: statusFilter, limit: "100" });
      const res = await fetch(`/api/admin/feedback?${params}`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      apiRequest("PATCH", `/api/admin/feedback/${id}`, payload),
    onSuccess: () => {
      refetch();
      toast({ title: "Updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/feedback/${id}`),
    onSuccess: () => {
      refetch();
      toast({ title: "Deleted" });
    },
  });

  const stats = data?.stats;
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquarePlus className="w-6 h-6 text-primary" />
            Member Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All submissions from your members</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total || 0, icon: BarChart3, color: "text-primary" },
            { label: "Open", value: stats.open_count || 0, icon: Clock, color: "text-yellow-400" },
            { label: "Resolved", value: stats.resolved_count || 0, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Avg Rating", value: stats.avg_rating ? `${stats.avg_rating}/5` : "—", icon: Star, color: "text-yellow-400" },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold leading-none mt-0.5">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {stats?.avg_nps && (
        <Card className="border-blue-500/20 bg-blue-500/3">
          <CardContent className="p-4 flex items-center gap-3">
            <ThumbsUp className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-semibold">Net Promoter Score</p>
              <p className="text-xs text-muted-foreground">Average NPS across all submissions: <span className="font-bold text-blue-400">{stats.avg_nps}/10</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-admin-feedback-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_META).map(([val, meta]) => (
              <SelectItem key={val} value={val}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-admin-feedback-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_META).map(([val, meta]) => (
              <SelectItem key={val} value={val}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <Card key={n}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <MessageSquarePlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">No feedback found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <FeedbackItem
              key={item.id}
              item={item}
              onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

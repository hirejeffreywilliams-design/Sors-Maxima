import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquarePlus, Star, Bug, Lightbulb, HelpCircle,
  Heart, Target, TrendingUp, CheckCircle, Clock, Eye,
  MessageSquare, AlertCircle, ChevronDown, ChevronUp
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
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_META[item.category] || CATEGORY_META.general;
  const status = STATUS_META[item.status] || STATUS_META.open;
  const CatIcon = cat.icon;
  const StatusIcon = status.icon;

  return (
    <Card className={`border transition-all duration-200 ${item.admin_reply ? "border-primary/20" : "border-border/50"}`}
      data-testid={`card-feedback-${item.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg border shrink-0 ${cat.bg}`}>
              <CatIcon className={`w-4 h-4 ${cat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant="outline" className={`text-[10px] font-semibold ${cat.bg} ${cat.color} border-current/30`}>
                  {cat.label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] font-semibold ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-2.5 h-2.5 mr-1" />
                  {status.label}
                </Badge>
                {item.rating && <StarDisplay rating={item.rating} />}
              </div>
              {item.subject && (
                <p className="text-sm font-semibold text-foreground mb-1">{item.subject}</p>
              )}
              <p className={`text-sm text-muted-foreground ${!expanded ? "line-clamp-2" : ""}`}>{item.message}</p>
              {item.message.length > 120 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary/60 hover:text-primary mt-1 flex items-center gap-1"
                >
                  {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                </button>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {item.nps !== null && item.nps !== undefined && (
              <p className="text-[10px] text-muted-foreground mt-0.5">NPS: {item.nps}/10</p>
            )}
          </div>
        </div>

        {item.admin_reply && (
          <div className="mt-4 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Response from Sors Maxima</span>
              {item.admin_replied_at && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(item.admin_replied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.admin_reply}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FeedbackPage() {
  const { data: authData } = useQuery<{ authenticated: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/feedback/my"],
    enabled: authData?.authenticated === true,
  });

  if (!authData?.authenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
          <MessageSquarePlus className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Your Feedback</h1>
        <p className="text-muted-foreground">Sign in to view your feedback history and responses from our team.</p>
        <Button asChild><a href="/login">Sign In</a></Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquarePlus className="w-6 h-6 text-primary" />
            My Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your submissions and responses from our team</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid="button-feedback-new"
          onClick={() => {
            const btn = document.querySelector<HTMLButtonElement>('[data-testid="button-feedback-open"]');
            btn?.click();
          }}
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Feedback
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <Card key={n}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto">
              <MessageSquarePlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No feedback yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your submissions will appear here. We read and respond to everything.
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const btn = document.querySelector<HTMLButtonElement>('[data-testid="button-feedback-open"]');
                btn?.click();
              }}
            >
              <MessageSquarePlus className="w-4 h-4" />
              Submit Your First Feedback
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => <FeedbackCard key={item.id} item={item} />)}
        </div>
      )}

      <Card className="border-primary/15 bg-primary/3">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">We read every submission</p>
              <p className="text-xs text-muted-foreground mt-1">
                Every piece of feedback is reviewed by our team. Bug reports are triaged within 24 hours.
                Feature requests go directly into our development roadmap. Expect a response for anything marked "reviewed".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

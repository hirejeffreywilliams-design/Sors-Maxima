import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Share2, Twitter, Copy, Check, Download, 
  Trophy, Zap, Heart, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BetTicket {
  id: string;
  legs: { pick: string; odds: string; result?: "win" | "loss" | "pending" }[];
  stake: number;
  potentialPayout: number;
  actualPayout?: number;
  status: "pending" | "won" | "lost";
  createdAt: string;
  likes?: number;
}

export function BetSharing() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownload = (ticket: BetTicket) => {
    const lines = [
      `🎟 Sors Maxima — Shared Ticket`,
      `Status: ${ticket.status.toUpperCase()}`,
      `Stake: $${ticket.stake} → To Win: $${ticket.potentialPayout.toFixed(0)}`,
      ``,
      ...ticket.legs.map((leg, i) => `${i + 1}. ${leg.pick} (${leg.odds})`),
      ``,
      `Shared via Sors Maxima — sors.app`,
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      toast({ title: "Copied to clipboard", description: "Ticket details ready to share." });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" });
    });
  };

  const { data: tickets = [], isLoading } = useQuery<BetTicket[]>({
    queryKey: ["/api/social/shared-tickets"],
  });

  const shareMutation = useMutation({
    mutationFn: (ticketId: string) => apiRequest("POST", "/api/social/share-ticket", { ticketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/shared-tickets"] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: (ticketId: string) => apiRequest("POST", `/api/social/like-ticket/${ticketId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/shared-tickets"] });
    },
  });

  const handleCopy = (ticketId: string) => {
    setCopiedId(ticketId);
    shareMutation.mutate(ticketId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "bg-green-500/10 text-green-500 border-green-500/30";
      case "lost": return "bg-red-500/10 text-red-500 border-red-500/30";
      default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <Share2 className="w-5 h-5 text-blue-500" />
          Bet Sharing
          <QuantumBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your winning tickets with custom graphics for social media
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No shared tickets yet.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status === "won" && <Trophy className="w-3 h-3 mr-1" />}
                      {ticket.status === "pending" && <Zap className="w-3 h-3 mr-1" />}
                      {ticket.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {ticket.legs.length}-leg parlay
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1">
                  {ticket.legs.map((leg, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 min-w-0 truncate">
                        {leg.result === "win" && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                        <span className="truncate">{leg.pick}</span>
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">{leg.odds}</Badge>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Stake: ${ticket.stake}</p>
                    <p className="text-sm font-bold flex items-center gap-1">
                      {ticket.status === "won" ? (
                        <span className="text-green-500">+${ticket.actualPayout}</span>
                      ) : (
                        <span>To Win: ${ticket.potentialPayout.toFixed(0)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => likeMutation.mutate(ticket.id)}
                      disabled={likeMutation.isPending}
                      className="gap-1.5 text-pink-500 border-pink-500/30 hover:bg-pink-500/10"
                      data-testid={`button-like-ticket-${ticket.id}`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{ticket.likes ?? 0}</span>
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleCopy(ticket.id)} data-testid={`button-copy-${ticket.id}`}>
                      {copiedId === ticket.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => shareMutation.mutate(ticket.id)} data-testid={`button-share-twitter-${ticket.id}`}>
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDownload(ticket)}
                      data-testid={`button-download-${ticket.id}`}
                      title="Copy ticket to clipboard"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">Data source: Live shared tickets</p>
        </div>
      </CardContent>
    </Card>
  );
}

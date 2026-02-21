import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Share2, Twitter, Instagram, Copy, Check, Download, 
  Trophy, Zap, TrendingUp, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface BetTicket {
  id: string;
  legs: { pick: string; odds: string; result?: "win" | "loss" | "pending" }[];
  stake: number;
  potentialPayout: number;
  actualPayout?: number;
  status: "pending" | "won" | "lost";
  createdAt: Date;
}

const mockTickets: BetTicket[] = [
  {
    id: "ticket-1",
    legs: [
      { pick: "Chiefs -3.5", odds: "-110", result: "win" },
      { pick: "Bucks ML", odds: "-150", result: "win" },
      { pick: "Over 48.5 (Bills/Dolphins)", odds: "-105", result: "win" },
    ],
    stake: 50,
    potentialPayout: 285,
    actualPayout: 285,
    status: "won",
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "ticket-2",
    legs: [
      { pick: "Mavericks -5.5", odds: "-110", result: "pending" },
      { pick: "Suns ML", odds: "+120", result: "pending" },
      { pick: "Under 220.5 (Suns/Mavs)", odds: "-110", result: "pending" },
      { pick: "Nuggets -2.5", odds: "-105", result: "pending" },
    ],
    stake: 25,
    potentialPayout: 312,
    status: "pending",
    createdAt: new Date(),
  },
];

export function BetSharing() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tickets] = useState<BetTicket[]>(mockTickets);

  const handleCopy = (ticketId: string) => {
    setCopiedId(ticketId);
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

        {tickets.map((ticket) => (
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
                  {ticket.createdAt.toLocaleDateString()}
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
                  <Button size="icon" variant="outline" onClick={() => handleCopy(ticket.id)} data-testid={`button-copy-${ticket.id}`}>
                    {copiedId === ticket.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="outline" data-testid={`button-share-twitter-${ticket.id}`}>
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" data-testid={`button-download-${ticket.id}`}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Users, TrendingUp, DollarSign, Target, AlertTriangle,
  ChevronRight, Zap, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface GameSplit {
  id: string;
  game: string;
  sport: string;
  pick: string;
  publicTicketPct: number;
  publicMoneyPct: number;
  sharpMoneyPct: number;
  lineMovement: string;
  signal: "fade_public" | "follow_sharp" | "neutral";
  gameTime: string;
}

const mockSplits: GameSplit[] = [
  { id: "1", game: "Chiefs @ Bills", sport: "NFL", pick: "Bills +3.5", publicTicketPct: 35, publicMoneyPct: 28, sharpMoneyPct: 72, lineMovement: "Bills +3 → +3.5", signal: "follow_sharp", gameTime: "4:25 PM" },
  { id: "2", game: "Bucks @ Heat", sport: "NBA", pick: "Bucks +6.5", publicTicketPct: 25, publicMoneyPct: 22, sharpMoneyPct: 65, lineMovement: "Bucks +5.5 → +6.5", signal: "follow_sharp", gameTime: "7:30 PM" },
  { id: "3", game: "Cowboys @ Eagles", sport: "NFL", pick: "Cowboys ML", publicTicketPct: 68, publicMoneyPct: 72, sharpMoneyPct: 35, lineMovement: "Cowboys +2 → +3", signal: "fade_public", gameTime: "8:20 PM" },
  { id: "4", game: "Suns @ Nuggets", sport: "NBA", pick: "Over 228.5", publicTicketPct: 65, publicMoneyPct: 58, sharpMoneyPct: 48, lineMovement: "228 → 228.5", signal: "neutral", gameTime: "9:00 PM" },
  { id: "5", game: "Rangers @ Bruins", sport: "NHL", pick: "Bruins ML", publicTicketPct: 55, publicMoneyPct: 48, sharpMoneyPct: 62, lineMovement: "-135 → -145", signal: "follow_sharp", gameTime: "7:00 PM" },
];

function getSignalColor(signal: string) {
  switch (signal) {
    case "follow_sharp": return "bg-green-500/10 text-green-500 border-green-500/30";
    case "fade_public": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function getSignalLabel(signal: string) {
  switch (signal) {
    case "follow_sharp": return "Follow Sharp";
    case "fade_public": return "Fade Public";
    default: return "Neutral";
  }
}

export function PublicVsSharp() {
  const [splits] = useState<GameSplit[]>(mockSplits);
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? splits : splits.filter(s => s.sport === sport);
  const sharpPlays = filtered.filter(s => s.signal === "follow_sharp").length;
  const fadePlays = filtered.filter(s => s.signal === "fade_public").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Users className="w-5 h-5 text-blue-500" />
            Public vs Sharp Money
            <QuantumBadge />
          </CardTitle>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-pvs-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
            <p className="text-2xl font-bold text-green-500">{sharpPlays}</p>
            <p className="text-xs text-muted-foreground">Sharp Plays</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <p className="text-2xl font-bold text-yellow-500">{fadePlays}</p>
            <p className="text-xs text-muted-foreground">Fade Public</p>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((game) => (
            <div key={game.id} className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge>{game.sport}</Badge>
                  <span className="font-medium">{game.game}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{game.gameTime}</span>
                  <Badge variant="outline" className={getSignalColor(game.signal)}>
                    {getSignalLabel(game.signal)}
                  </Badge>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{game.pick}</span>
                  <span className="text-xs text-muted-foreground">{game.lineMovement}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Public Tickets</p>
                  <p className={`font-bold ${game.publicTicketPct < 40 ? "text-green-500" : game.publicTicketPct > 60 ? "text-red-500" : ""}`}>
                    {game.publicTicketPct}%
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Public Money</p>
                  <p className={`font-bold ${game.publicMoneyPct < 40 ? "text-green-500" : game.publicMoneyPct > 60 ? "text-red-500" : ""}`}>
                    {game.publicMoneyPct}%
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Sharp Money</p>
                  <p className={`font-bold ${game.sharpMoneyPct >= 60 ? "text-green-500" : ""}`}>
                    {game.sharpMoneyPct}%
                  </p>
                </div>
              </div>

              {game.signal !== "neutral" && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    {game.signal === "follow_sharp" ? (
                      <>
                        <Zap className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Sharp money heavily backing {game.pick}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500">Public overvaluing opposite side - fade opportunity</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

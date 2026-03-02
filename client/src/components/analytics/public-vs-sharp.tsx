import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, TrendingUp, DollarSign, Target, AlertTriangle,
  ChevronRight, Zap, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface PublicSharpSplit {
  id: string;
  game: string;
  market: string;
  homeTeam: string;
  awayTeam: string;
  publicHome: number;
  publicAway: number;
  sharpHome: number;
  sharpAway: number;
  sport: string;
  consensus: "public" | "sharp" | "split";
  isEstimated?: boolean;
  gameDate?: string;
  isLive?: boolean;
}

function formatShortTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function getConsensusColor(consensus: string) {
  switch (consensus) {
    case "sharp": return "bg-green-500/10 text-green-500 border-green-500/30";
    case "public": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function getConsensusLabel(consensus: string) {
  switch (consensus) {
    case "sharp": return "Sharp Lean";
    case "public": return "Public Heavy";
    default: return "Split";
  }
}

export function PublicVsSharp() {
  const { data: splits, isLoading } = useQuery<PublicSharpSplit[]>({
    queryKey: ["/api/live/public-sharp"],
    refetchInterval: 60000,
  });

  const [sport, setSport] = useState("all");
  const data = splits || [];
  const filtered = sport === "all" ? data : data.filter(s => s.sport === sport);
  const sharpPlays = filtered.filter(s => s.consensus === "sharp").length;
  const publicPlays = filtered.filter(s => s.consensus === "public").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-500" />
            Public vs Sharp Money
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-60 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
              <Users className="w-5 h-5 text-blue-500" />
              Public vs Sharp Money Flow
              <QuantumBadge />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live betting percentage split — when sharp (professional) money disagrees with the public by 20%+, that's the market signal the engine looks for.
            </p>
          </div>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-32" data-testid="select-pvs-sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="NBA">NBA</SelectItem>
              <SelectItem value="NFL">NFL</SelectItem>
              <SelectItem value="MLB">MLB</SelectItem>
              <SelectItem value="NHL">NHL</SelectItem>
              <SelectItem value="NCAAB">NCAAB</SelectItem>
              <SelectItem value="NCAAF">NCAAF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Model-estimated splits derived from ESPN team records and odds movement. Data source: ESPN
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
            <p className="text-2xl font-bold text-green-500">{sharpPlays}</p>
            <p className="text-xs text-muted-foreground">Sharp Leans</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <p className="text-2xl font-bold text-yellow-500">{publicPlays}</p>
            <p className="text-xs text-muted-foreground">Public Heavy</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <p className="text-2xl font-bold">{filtered.length - sharpPlays - publicPlays}</p>
            <p className="text-xs text-muted-foreground">Split</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming games found</p>
            <p className="text-sm mt-1">Splits show for pre-game and in-progress games</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((game) => (
              <div key={game.id} className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className="text-xs shrink-0">{game.sport}</Badge>
                    <span className="font-medium text-sm truncate">{game.game}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {game.isLive && (
                      <Badge variant="outline" className="gap-1 text-xs bg-red-500/10 text-red-500 border-red-500/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                    {!game.isLive && game.gameDate && (
                      <span className="text-xs text-muted-foreground">{formatShortTime(game.gameDate)}</span>
                    )}
                    <Badge variant="outline" className={`text-xs ${getConsensusColor(game.consensus)}`}>
                      {getConsensusLabel(game.consensus)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Public: {game.awayTeam.split(" ").pop()} {game.publicAway}%</span>
                      <span>{game.homeTeam.split(" ").pop()} {game.publicHome}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-400/60" style={{ width: `${game.publicAway}%` }} />
                      <div className="h-full bg-blue-600/60" style={{ width: `${game.publicHome}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Sharp: {game.awayTeam.split(" ").pop()} {game.sharpAway}%</span>
                      <span>{game.homeTeam.split(" ").pop()} {game.sharpHome}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-400/60" style={{ width: `${game.sharpAway}%` }} />
                      <div className="h-full bg-green-600/60" style={{ width: `${game.sharpHome}%` }} />
                    </div>
                  </div>
                </div>

                {game.consensus !== "split" && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs">
                      {game.consensus === "sharp" ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <span className="text-green-600 dark:text-green-400">Sharp lean: {game.sharpHome > game.sharpAway ? game.homeTeam.split(" ").pop() : game.awayTeam.split(" ").pop()}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          <span className="text-yellow-600 dark:text-yellow-400">Public heavy: {game.publicHome > game.publicAway ? game.homeTeam.split(" ").pop() : game.awayTeam.split(" ").pop()} — consider fade</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy, TrendingUp, Info } from "lucide-react";

export function OffseasonPanel() {
  const nflPowerRankings = [
    { team: "Kansas City Chiefs", rating: 92.5, trend: "up" },
    { team: "Philadelphia Eagles", rating: 89.8, trend: "stable" },
    { team: "San Francisco 49ers", rating: 88.4, trend: "down" },
    { team: "Detroit Lions", rating: 87.9, trend: "up" },
    { team: "Baltimore Ravens", rating: 86.5, trend: "stable" },
  ];

  const storylines = [
    "Free agency spending leaders and impact on win totals",
    "Top QB changes: Analyzing new systems and chemistry",
    "Draft needs by division: Where the value lies in April",
    "2026 Super Bowl early favorites: Market vs. Model",
    "Coaching carousel: Impact of new coordinators on pace",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="panel-offseason-intelligence">
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">NFL Offseason Intelligence</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">Offseason Mode</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Clock className="w-4 h-4" />
              <h4>Championship Futures</h4>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border border-border/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">NFL regular season picks resume in</p>
              <p className="text-2xl font-bold text-primary tracking-tight">August 2026</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Intelligence engine continuing 24/7 simulation</p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Trophy className="w-4 h-4" />
              <h4>Implied Power Rankings</h4>
            </div>
            <div className="space-y-2">
              {nflPowerRankings.map((item, index) => (
                <div key={item.team} className="flex items-center justify-between p-2 rounded bg-background/40 border border-border/30 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono w-4">{index + 1}</span>
                    <span className="font-medium">{item.team}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary">{item.rating}</span>
                    <TrendingUp className={`w-3 h-3 ${item.trend === 'up' ? 'text-emerald-500' : item.trend === 'down' ? 'text-rose-500' : 'text-blue-500'}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Info className="w-4 h-4" />
              <h4>Key Offseason Storylines</h4>
            </div>
            <ul className="space-y-2">
              {storylines.map((story, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                  <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                  <span>{story}</span>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

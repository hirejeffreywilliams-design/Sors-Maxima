import { X, TrendingUp, Activity, Target, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParlayLeg } from "@shared/schema";
import { impliedProbability, decimalToAmerican } from "@shared/schema";

interface LegCardProps {
  leg: ParlayLeg;
  onRemove: (id: string) => void;
  index: number;
}

const marketIcons: Record<string, typeof TrendingUp> = {
  moneyline: TrendingUp,
  spread: Activity,
  total: Target,
  player_prop: User,
};

const marketColors: Record<string, string> = {
  moneyline: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  spread: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  total: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  player_prop: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export function LegCard({ leg, onRemove, index }: LegCardProps) {
  const MarketIcon = marketIcons[leg.market] || TrendingUp;
  const implied = impliedProbability(leg.decimalOdds);
  const american = decimalToAmerican(leg.decimalOdds);
  const americanDisplay = american > 0 ? `+${american}` : `${american}`;

  return (
    <Card
      className="p-4 hover-elevate group"
      data-testid={`card-leg-${index}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted flex-shrink-0">
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {index + 1}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate" data-testid={`text-team-${index}`}>
                {leg.team}
              </span>
              {leg.opponent && (
                <span className="text-muted-foreground text-sm">
                  vs {leg.opponent}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs uppercase tracking-wide ${marketColors[leg.market]}`}
              >
                <MarketIcon className="w-3 h-3 mr-1" />
                {leg.market.replace("_", " ")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {leg.outcome}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xl font-mono font-bold" data-testid={`text-odds-${index}`}>
              {americanDisplay}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {(implied * 100).toFixed(1)}% implied
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(leg.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            data-testid={`button-remove-leg-${index}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

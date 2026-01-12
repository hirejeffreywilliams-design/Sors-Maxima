import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GitBranch } from "lucide-react";

interface CorrelationMatrixProps {
  matrix: number[][] | undefined;
  legCount: number;
}

function getCorrelationColor(value: number): string {
  if (value >= 0.8) return "bg-chart-1 text-chart-1-foreground";
  if (value >= 0.5) return "bg-chart-1/70 text-foreground";
  if (value >= 0.2) return "bg-chart-1/40 text-foreground";
  if (value >= 0) return "bg-muted text-muted-foreground";
  if (value >= -0.2) return "bg-destructive/20 text-foreground";
  if (value >= -0.5) return "bg-destructive/50 text-foreground";
  return "bg-destructive text-destructive-foreground";
}

function getCorrelationLabel(value: number): string {
  if (value >= 0.7) return "Strong positive";
  if (value >= 0.3) return "Moderate positive";
  if (value >= 0.1) return "Weak positive";
  if (value >= -0.1) return "No correlation";
  if (value >= -0.3) return "Weak negative";
  if (value >= -0.7) return "Moderate negative";
  return "Strong negative";
}

export function CorrelationMatrix({ matrix, legCount }: CorrelationMatrixProps) {
  if (!matrix || matrix.length === 0 || legCount < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5" />
            Leg Correlations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <GitBranch className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Add at least 2 legs to see correlations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-correlation-matrix">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="w-5 h-5" />
          Leg Correlations
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            <div className="flex gap-1 ml-9">
              {Array.from({ length: legCount }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-10 h-6 flex items-center justify-center text-xs font-mono text-muted-foreground"
                >
                  #{i + 1}
                </div>
              ))}
            </div>
            
            {matrix.map((row, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-8 text-xs font-mono text-muted-foreground text-right pr-1">
                  #{i + 1}
                </div>
                {row.map((value, j) => (
                  <Tooltip key={j}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-mono cursor-default transition-transform hover:scale-105 ${getCorrelationColor(value)}`}
                        data-testid={`cell-correlation-${i}-${j}`}
                      >
                        {i === j ? "—" : value.toFixed(2)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">
                          Leg #{i + 1} × Leg #{j + 1}
                        </p>
                        {i !== j && (
                          <>
                            <p className="font-mono">{value.toFixed(4)}</p>
                            <p className="text-muted-foreground">
                              {getCorrelationLabel(value)}
                            </p>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive" />
              <span>Negative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-chart-1" />
              <span>Positive</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

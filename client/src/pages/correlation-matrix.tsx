import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Grid3X3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface MarketGame {
  id: string;
  shortName: string;
  name: string;
  homeTeam: { name: string; abbreviation: string; record: string; winPct: number };
  awayTeam: { name: string; abbreviation: string; record: string; winPct: number };
  consensus: {
    homeMoneyline?: number;
    awayMoneyline?: number;
    spread?: number;
    total?: number;
    homeImpliedProb?: number;
    awayImpliedProb?: number;
  };
  leaders?: { team: string; category: string; playerName: string; value: string }[];
  edgeAnalysis: { homeEV: number; awayEV: number; valueSide?: "home" | "away" | "none" };
  dataSource: string;
}

interface MarketSnapshot {
  games: MarketGame[];
  meta: {
    sport: string;
    totalGames: number;
    gamesWithOdds: number;
    bookmakerCount: number;
    dataSources: string[];
    generatedAt: string;
  };
}

const BET_TYPES = [
  "Spread",
  "Total (Over)",
  "Total (Under)",
  "ML Home",
  "ML Away",
  "Player Props Over",
  "Player Props Under",
  "Team Total Over",
  "Team Total Under",
] as const;

type BetType = (typeof BET_TYPES)[number];

const CORRELATION_MAP: Record<string, number> = {
  "Spread|ML Home": 0.95,
  "ML Home|Spread": 0.95,
  "ML Home|Total (Over)": 0.35,
  "Total (Over)|ML Home": 0.35,
  "ML Home|Total (Under)": -0.35,
  "Total (Under)|ML Home": -0.35,
  "Spread|Total (Over)": 0.25,
  "Total (Over)|Spread": 0.25,
  "Spread|Total (Under)": -0.25,
  "Total (Under)|Spread": -0.25,
  "Team Total Over|Total (Over)": 0.7,
  "Total (Over)|Team Total Over": 0.7,
  "Team Total Over|Total (Under)": -0.7,
  "Total (Under)|Team Total Over": -0.7,
  "Team Total Under|Total (Over)": -0.7,
  "Total (Over)|Team Total Under": -0.7,
  "Team Total Under|Total (Under)": 0.7,
  "Total (Under)|Team Total Under": 0.7,
  "ML Away|Spread": -0.9,
  "Spread|ML Away": -0.9,
  "ML Away|ML Home": -1.0,
  "ML Home|ML Away": -1.0,
  "Player Props Over|Total (Over)": 0.45,
  "Total (Over)|Player Props Over": 0.45,
  "Player Props Over|Total (Under)": -0.45,
  "Total (Under)|Player Props Over": -0.45,
  "Player Props Under|Total (Over)": -0.45,
  "Total (Over)|Player Props Under": -0.45,
  "Player Props Under|Total (Under)": 0.45,
  "Total (Under)|Player Props Under": 0.45,
  "Player Props Over|Player Props Under": -0.85,
  "Player Props Under|Player Props Over": -0.85,
  "Total (Over)|Total (Under)": -1.0,
  "Total (Under)|Total (Over)": -1.0,
  "Team Total Over|Team Total Under": -1.0,
  "Team Total Under|Team Total Over": -1.0,
  "ML Away|Total (Over)": -0.2,
  "Total (Over)|ML Away": -0.2,
  "ML Away|Total (Under)": 0.2,
  "Total (Under)|ML Away": 0.2,
  "ML Home|Player Props Over": 0.3,
  "Player Props Over|ML Home": 0.3,
  "ML Home|Player Props Under": -0.3,
  "Player Props Under|ML Home": -0.3,
  "ML Away|Player Props Over": -0.15,
  "Player Props Over|ML Away": -0.15,
  "ML Away|Player Props Under": 0.15,
  "Player Props Under|ML Away": 0.15,
  "ML Home|Team Total Over": 0.55,
  "Team Total Over|ML Home": 0.55,
  "ML Home|Team Total Under": -0.55,
  "Team Total Under|ML Home": -0.55,
  "ML Away|Team Total Over": -0.3,
  "Team Total Over|ML Away": -0.3,
  "ML Away|Team Total Under": 0.3,
  "Team Total Under|ML Away": 0.3,
  "Spread|Player Props Over": 0.2,
  "Player Props Over|Spread": 0.2,
  "Spread|Player Props Under": -0.2,
  "Player Props Under|Spread": -0.2,
  "Spread|Team Total Over": 0.4,
  "Team Total Over|Spread": 0.4,
  "Spread|Team Total Under": -0.4,
  "Team Total Under|Spread": -0.4,
};

function getCorrelation(a: BetType, b: BetType): number {
  if (a === b) return 1.0;
  return CORRELATION_MAP[`${a}|${b}`] ?? 0;
}

function getCorrelationColor(val: number): string {
  if (val > 0.5) return "bg-green-500 text-white";
  if (val > 0.1) return "bg-green-500/30 text-green-300 dark:text-green-300";
  if (val >= -0.1) return "bg-muted text-muted-foreground";
  if (val >= -0.5) return "bg-red-500/30 text-red-300 dark:text-red-300";
  return "bg-red-500 text-white";
}

function getCorrelationBg(val: number): string {
  if (val > 0.5) return "bg-green-500";
  if (val > 0.1) return "bg-green-500/25";
  if (val >= -0.1) return "bg-muted/60";
  if (val >= -0.5) return "bg-red-500/25";
  return "bg-red-500";
}

const SPORTS = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
];

interface CorrelationInsight {
  pair: string;
  value: number;
  explanation: string;
}

function getTopCorrelations(): { positive: CorrelationInsight[]; negative: CorrelationInsight[] } {
  const pairs: { a: BetType; b: BetType; val: number }[] = [];
  for (let i = 0; i < BET_TYPES.length; i++) {
    for (let j = i + 1; j < BET_TYPES.length; j++) {
      const val = getCorrelation(BET_TYPES[i], BET_TYPES[j]);
      if (val !== 0) pairs.push({ a: BET_TYPES[i], b: BET_TYPES[j], val });
    }
  }
  pairs.sort((a, b) => b.val - a.val);

  const explanations: Record<string, string> = {
    "Spread|ML Home": "Covering the spread and winning outright are nearly identical outcomes for the favorite.",
    "Team Total Over|Total (Over)": "If the home team scores more, the game total is much more likely to go over.",
    "ML Home|Team Total Over": "Home team winning usually correlates with them scoring more points.",
    "Player Props Over|Total (Over)": "Individual player scoring boosts the overall game total significantly.",
    "ML Home|Total (Over)": "Favorites tend to push scoring higher, creating a mild positive link.",
    "ML Home|ML Away": "Perfectly opposite outcomes — one must win, the other must lose.",
    "ML Away|Spread": "Betting the away team while the home team covers the spread is a strong contradiction.",
    "Player Props Over|Player Props Under": "Opposite sides of the same player prop market move inversely.",
    "Total (Over)|Total (Under)": "Opposite sides of the game total are perfectly negatively correlated.",
    "Team Total Over|Team Total Under": "Opposite sides of the team total move in perfect opposition.",
    "ML Home|Total (Under)": "Home favorites pushing the pace conflicts with a low-scoring game.",
    "Player Props Over|Total (Under)": "Higher individual stats conflict with a low-scoring overall game.",
    "Team Total Over|Total (Under)": "Team scoring high contradicts the game total going under.",
  };

  const getExplanation = (a: BetType, b: BetType, val: number): string => {
    return explanations[`${a}|${b}`] || explanations[`${b}|${a}`] ||
      (val > 0
        ? `${a} and ${b} tend to move in the same direction.`
        : `${a} and ${b} tend to move in opposite directions.`);
  };

  const positive: CorrelationInsight[] = pairs
    .filter((p) => p.val > 0)
    .slice(0, 3)
    .map((p) => ({
      pair: `${p.a} + ${p.b}`,
      value: p.val,
      explanation: getExplanation(p.a, p.b, p.val),
    }));

  const negative: CorrelationInsight[] = pairs
    .filter((p) => p.val < 0)
    .sort((a, b) => a.val - b.val)
    .slice(0, 3)
    .map((p) => ({
      pair: `${p.a} + ${p.b}`,
      value: p.val,
      explanation: getExplanation(p.a, p.b, p.val),
    }));

  return { positive, negative };
}

export default function CorrelationMatrixPage() {
  useSEO({ title: "Correlation Matrix", description: "Analyze statistical correlations between bet outcomes" });
  const [sport, setSport] = useState("NBA");
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  const { data, isLoading } = useQuery<MarketSnapshot>({
    queryKey: ["/api/market-snapshot?sport=" + sport],
  });

  const games = data?.games ?? [];
  const selectedGame = games.find((g) => g.id === selectedGameId) || games[0];
  const { positive, negative } = getTopCorrelations();

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto" data-testid="page-correlation-matrix">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Grid3X3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            SGP Correlation Matrix
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Visualize how different bet types correlate within the same game to build smarter same-game parlays.
        </p>
      </div>

      <Card data-testid="card-sport-game-selector">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {SPORTS.map((s) => (
              <Button
                key={s.id}
                variant={sport === s.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSport(s.id);
                  setSelectedGameId("");
                }}
                data-testid={`button-sport-${s.id}`}
              >
                {s.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <Skeleton className="h-9 w-full" data-testid="skeleton-game-select" />
          ) : games.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-games">
              No games available for {sport}. Check back closer to game time.
            </div>
          ) : (
            <Select
              value={selectedGame?.id ?? ""}
              onValueChange={setSelectedGameId}
            >
              <SelectTrigger data-testid="select-game-trigger">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id} data-testid={`select-game-${g.id}`}>
                    {g.shortName || g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedGame && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" data-testid="badge-home-team">
                {selectedGame.homeTeam.abbreviation} (Home)
              </Badge>
              <span className="text-xs text-muted-foreground">vs</span>
              <Badge variant="outline" data-testid="badge-away-team">
                {selectedGame.awayTeam.abbreviation} (Away)
              </Badge>
              {selectedGame.consensus.spread != null && (
                <Badge variant="secondary" data-testid="badge-spread">
                  Spread: {selectedGame.consensus.spread > 0 ? "+" : ""}
                  {selectedGame.consensus.spread}
                </Badge>
              )}
              {selectedGame.consensus.total != null && (
                <Badge variant="secondary" data-testid="badge-total">
                  O/U: {selectedGame.consensus.total}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full" data-testid="skeleton-matrix" />
          </CardContent>
        </Card>
      ) : games.length === 0 ? null : (
        <Card data-testid="card-correlation-matrix">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              Correlation Matrix
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Strong +
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-500/30 inline-block" /> Mild +
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-muted inline-block border" /> Neutral
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500/30 inline-block" /> Mild −
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Strong −
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <div className="min-w-[700px]">
              <div
                className="grid gap-px"
                style={{
                  gridTemplateColumns: `140px repeat(${BET_TYPES.length}, 1fr)`,
                }}
              >
                <div />
                {BET_TYPES.map((bt) => (
                  <div
                    key={`col-${bt}`}
                    className="text-[10px] sm:text-xs font-medium text-center p-1.5 text-muted-foreground leading-tight"
                    data-testid={`header-col-${bt}`}
                  >
                    {bt}
                  </div>
                ))}

                {BET_TYPES.map((rowType) => (
                  <>
                    <div
                      key={`row-label-${rowType}`}
                      className="text-[10px] sm:text-xs font-medium p-1.5 flex items-center text-muted-foreground leading-tight"
                      data-testid={`header-row-${rowType}`}
                    >
                      {rowType}
                    </div>
                    {BET_TYPES.map((colType) => {
                      const val = getCorrelation(rowType, colType);
                      const isDiagonal = rowType === colType;
                      return (
                        <div
                          key={`cell-${rowType}-${colType}`}
                          className={`text-center p-1.5 rounded-sm text-xs font-semibold flex items-center justify-center min-h-[36px] ${
                            isDiagonal
                              ? "bg-primary/20 text-primary"
                              : getCorrelationColor(val)
                          }`}
                          title={`${rowType} × ${colType}: ${val.toFixed(2)}`}
                          data-testid={`cell-${rowType}-${colType}`}
                        >
                          {isDiagonal ? "1.00" : val.toFixed(2)}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && games.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="section-insights">
          <Card data-testid="card-positive-correlations">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Top Positive Correlations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {positive.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-green-500/5 rounded-lg"
                  data-testid={`insight-positive-${idx}`}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{item.pair}</span>
                      <Badge className="bg-green-500 text-white text-[10px]">
                        {item.value > 0 ? "+" : ""}
                        {item.value.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card data-testid="card-negative-correlations">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Top Negative Correlations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {negative.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg"
                  data-testid={`insight-negative-${idx}`}
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{item.pair}</span>
                      <Badge className="bg-red-500 text-white text-[10px]">
                        {item.value.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2" data-testid="card-parlay-tip">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Parlay Tip: How Correlations Affect SGP Value
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-green-500/5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold">Positive Correlation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Legs that move together (e.g., Home ML + Home Spread) are correlated and sportsbooks
                    adjust SGP odds downward. These parlays pay less than their true probability suggests.
                    They're safer but offer less value.
                  </p>
                </div>
                <div className="p-3 bg-red-500/5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold">Negative Correlation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Legs that move against each other (e.g., Home ML + Away ML) are contradictory.
                    Combining them in a parlay is usually a losing strategy because one outcome
                    inherently hurts the other.
                  </p>
                </div>
                <div className="p-3 bg-blue-500/5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold">Best SGP Strategy</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target legs with low or slightly positive correlation (0.1 to 0.3). These offer the
                    best value because sportsbooks may under-adjust odds for mildly correlated outcomes,
                    giving you an edge in same-game parlays.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

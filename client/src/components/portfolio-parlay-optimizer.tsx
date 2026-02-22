import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Briefcase, TrendingUp, Shield, Target, DollarSign, Shuffle, ChevronRight, AlertTriangle, Info } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface PortfolioTicket {
  id: string;
  name: string;
  legs: ParlayLeg[];
  stake: number;
  winProbability: number;
  expectedValue: number;
  potentialPayout: number;
  riskLevel: "low" | "medium" | "high";
  correlation: number;
  role: "anchor" | "satellite" | "moonshot";
}

interface PortfolioMetrics {
  totalStake: number;
  portfolioEV: number;
  portfolioWinProb: number;
  diversificationScore: number;
  maxDrawdown: number;
  sharpeRatio: number;
  jackpotProbability: number;
}

interface PortfolioParlayOptimizerProps {
  legs: ParlayLeg[];
  bankroll: number;
}

function impliedProbability(decimalOdds: number): number {
  return 1 / decimalOdds;
}

function combinedProbability(legs: ParlayLeg[]): number {
  return legs.reduce((acc, leg) => acc * impliedProbability(leg.decimalOdds || 1.8), 1);
}

function combinedOdds(legs: ParlayLeg[]): number {
  return legs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.8), 1);
}

function calculateEV(winProb: number, stake: number, payout: number): number {
  return (winProb * payout) - ((1 - winProb) * stake);
}

function estimateCorrelation(legs: ParlayLeg[]): number {
  const teams = legs.map(l => l.team);
  const uniqueTeams = new Set(teams);
  const teamOverlap = 1 - (uniqueTeams.size / teams.length);

  const markets = legs.map(l => l.market);
  const uniqueMarkets = new Set(markets);
  const marketOverlap = 1 - (uniqueMarkets.size / markets.length);

  return Math.min(0.95, teamOverlap * 0.5 + marketOverlap * 0.3 + 0.05);
}

function generatePortfolio(legs: ParlayLeg[], bankroll: number, riskTolerance: number): PortfolioTicket[] {
  if (legs.length < 3) return [];

  const tickets: PortfolioTicket[] = [];

  const anchorLegs = legs.slice(0, 3);
  const anchorOdds = combinedOdds(anchorLegs);
  const anchorWinProb = combinedProbability(anchorLegs);
  const anchorStake = bankroll * 0.15 * (1 + riskTolerance * 0.1);
  const anchorPayout = anchorStake * anchorOdds;
  const anchorEV = calculateEV(anchorWinProb, anchorStake, anchorPayout);
  tickets.push({
    id: "anchor-1",
    name: "Anchor Parlay",
    legs: anchorLegs,
    stake: anchorStake,
    winProbability: anchorWinProb,
    expectedValue: anchorStake > 0 ? anchorEV / anchorStake : 0,
    potentialPayout: anchorPayout,
    riskLevel: "low",
    correlation: estimateCorrelation(anchorLegs),
    role: "anchor",
  });

  if (legs.length >= 5) {
    const satelliteLegs = legs.slice(2, 6);
    const satOdds = combinedOdds(satelliteLegs);
    const satWinProb = combinedProbability(satelliteLegs);
    const satStake = bankroll * 0.08 * (1 + riskTolerance * 0.15);
    const satPayout = satStake * satOdds;
    const satEV = calculateEV(satWinProb, satStake, satPayout);
    tickets.push({
      id: "satellite-1",
      name: "Satellite Parlay A",
      legs: satelliteLegs,
      stake: satStake,
      winProbability: satWinProb,
      expectedValue: satStake > 0 ? satEV / satStake : 0,
      potentialPayout: satPayout,
      riskLevel: "medium",
      correlation: estimateCorrelation(satelliteLegs),
      role: "satellite",
    });
  }

  if (legs.length >= 6) {
    const sat2Legs = [legs[0], legs[3], legs[5], ...(legs.length > 6 ? [legs[6]] : [])];
    const sat2Odds = combinedOdds(sat2Legs);
    const sat2WinProb = combinedProbability(sat2Legs);
    const sat2Stake = bankroll * 0.06 * (1 + riskTolerance * 0.15);
    const sat2Payout = sat2Stake * sat2Odds;
    const sat2EV = calculateEV(sat2WinProb, sat2Stake, sat2Payout);
    tickets.push({
      id: "satellite-2",
      name: "Satellite Parlay B",
      legs: sat2Legs,
      stake: sat2Stake,
      winProbability: sat2WinProb,
      expectedValue: sat2Stake > 0 ? sat2EV / sat2Stake : 0,
      potentialPayout: sat2Payout,
      riskLevel: "medium",
      correlation: estimateCorrelation(sat2Legs),
      role: "satellite",
    });
  }

  if (legs.length >= 8 && riskTolerance > 0.4) {
    const moonshotLegs = legs.slice(0, 8);
    const moonOdds = combinedOdds(moonshotLegs);
    const moonWinProb = combinedProbability(moonshotLegs);
    const moonStake = bankroll * 0.02 * (1 + riskTolerance * 0.3);
    const moonPayout = moonStake * moonOdds;
    const moonEV = calculateEV(moonWinProb, moonStake, moonPayout);
    tickets.push({
      id: "moonshot-1",
      name: "Moonshot Parlay",
      legs: moonshotLegs,
      stake: moonStake,
      winProbability: moonWinProb,
      expectedValue: moonStake > 0 ? moonEV / moonStake : 0,
      potentialPayout: moonPayout,
      riskLevel: "high",
      correlation: estimateCorrelation(moonshotLegs),
      role: "moonshot",
    });
  }

  if (legs.length >= 12 && riskTolerance > 0.6) {
    const megaLegs = legs.slice(0, 12);
    const megaOdds = combinedOdds(megaLegs);
    const megaWinProb = combinedProbability(megaLegs);
    const megaStake = bankroll * 0.01 * (1 + riskTolerance * 0.4);
    const megaPayout = Math.min(megaStake * megaOdds, 1000000);
    const megaEV = calculateEV(megaWinProb, megaStake, megaPayout);
    tickets.push({
      id: "moonshot-2",
      name: "Mega Moonshot",
      legs: megaLegs,
      stake: megaStake,
      winProbability: megaWinProb,
      expectedValue: megaStake > 0 ? megaEV / megaStake : 0,
      potentialPayout: megaPayout,
      riskLevel: "high",
      correlation: estimateCorrelation(megaLegs),
      role: "moonshot",
    });
  }

  return tickets;
}

function calculatePortfolioMetrics(tickets: PortfolioTicket[]): PortfolioMetrics {
  const totalStake = tickets.reduce((sum, t) => sum + t.stake, 0);
  const weightedEV = totalStake > 0 ? tickets.reduce((sum, t) => sum + t.expectedValue * t.stake, 0) / totalStake : 0;
  const avgWinProb = totalStake > 0 ? tickets.reduce((sum, t) => sum + t.winProbability * t.stake, 0) / totalStake : 0;

  const avgCorrelation = tickets.length > 0 ? tickets.reduce((sum, t) => sum + t.correlation, 0) / tickets.length : 0;
  const diversificationScore = 1 - avgCorrelation;

  const maxDrawdown = totalStake;
  const volatility = avgCorrelation + 0.1;
  const sharpeRatio = volatility > 0 ? weightedEV / volatility : 0;

  const jackpotProb = tickets
    .filter(t => t.role === "moonshot")
    .reduce((prob, t) => 1 - (1 - prob) * (1 - t.winProbability), 0);

  return {
    totalStake,
    portfolioEV: weightedEV,
    portfolioWinProb: avgWinProb,
    diversificationScore,
    maxDrawdown,
    sharpeRatio,
    jackpotProbability: jackpotProb,
  };
}

export function PortfolioParlayOptimizer({ legs, bankroll }: PortfolioParlayOptimizerProps) {
  const [riskTolerance, setRiskTolerance] = useState(0.5);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  const portfolio = useMemo(() =>
    generatePortfolio(legs, bankroll, riskTolerance),
    [legs, bankroll, riskTolerance]
  );

  const metrics = useMemo(() =>
    calculatePortfolioMetrics(portfolio),
    [portfolio]
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "anchor": return "bg-blue-500 text-white";
      case "satellite": return "bg-purple-500 text-white";
      case "moonshot": return "bg-amber-500 text-black";
      default: return "bg-muted";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "high": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  if (legs.length < 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio Parlay Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-portfolio">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Add at least 3 legs to build a portfolio</p>
            <p className="text-sm">Portfolio optimization works best with 6+ legs</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Portfolio Parlay Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm" data-testid="banner-correlation-note">
          <Info className="w-4 h-4 shrink-0" />
          <span>Win probabilities derived from leg odds. Correlation is estimated from team/market overlap.</span>
        </div>

        <div className="p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-sm font-medium">Risk Tolerance</span>
            <Badge variant="outline" data-testid="badge-risk-label">
              {riskTolerance < 0.3 ? "Conservative" : riskTolerance < 0.6 ? "Balanced" : "Aggressive"}
            </Badge>
          </div>
          <Slider
            value={[riskTolerance]}
            onValueChange={([v]) => setRiskTolerance(v)}
            min={0}
            max={1}
            step={0.1}
            className="mb-2"
            data-testid="slider-risk-tolerance"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safe</span>
            <span>Jackpot Hunter</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-total-stake">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">${metrics.totalStake.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Stake</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-portfolio-ev">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className={`text-lg font-bold ${metrics.portfolioEV >= 0 ? "text-green-500" : "text-red-500"}`}>
              {metrics.portfolioEV >= 0 ? "+" : ""}{(metrics.portfolioEV * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Portfolio EV</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-diversification">
            <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{(metrics.diversificationScore * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Diversification</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center" data-testid="stat-jackpot-chance">
            <Target className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{(metrics.jackpotProbability * 100).toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Jackpot Chance</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-medium">Optimized Tickets ({portfolio.length})</h4>
            <Button size="sm" variant="outline" data-testid="button-regenerate">
              <Shuffle className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>

          {portfolio.map((ticket) => (
            <div
              key={ticket.id}
              data-testid={`ticket-${ticket.id}`}
              className={`p-3 rounded-lg border bg-card cursor-pointer transition-all ${
                selectedTicket === ticket.id ? "ring-2 ring-primary" : "hover-elevate"
              }`}
              onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(ticket.role)}>
                    {ticket.role.charAt(0).toUpperCase() + ticket.role.slice(1)}
                  </Badge>
                  <span className="font-medium">{ticket.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getRiskColor(ticket.riskLevel)}`}>
                    {ticket.riskLevel.toUpperCase()} RISK
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${
                    selectedTicket === ticket.id ? "rotate-90" : ""
                  }`} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Legs:</span>{" "}
                  <span className="font-medium">{ticket.legs.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stake:</span>{" "}
                  <span className="font-medium">${ticket.stake.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win%:</span>{" "}
                  <span className="font-medium">{(ticket.winProbability * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payout:</span>{" "}
                  <span className="font-medium text-green-500">
                    ${ticket.potentialPayout >= 1000000
                      ? `${(ticket.potentialPayout / 1000000).toFixed(1)}M`
                      : ticket.potentialPayout >= 1000
                        ? `${(ticket.potentialPayout / 1000).toFixed(1)}K`
                        : ticket.potentialPayout.toFixed(0)}
                  </span>
                </div>
              </div>

              {selectedTicket === ticket.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Expected Value:</span>
                    <span className={`font-medium ${ticket.expectedValue >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {ticket.expectedValue >= 0 ? "+" : ""}{(ticket.expectedValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Correlation (estimated):</span>
                    <span className="font-medium">{(ticket.correlation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Legs: </span>
                    {ticket.legs.map(l => l.team).join(", ")}
                  </div>
                  <Button size="sm" className="w-full mt-2" data-testid={`button-place-ticket-${ticket.id}`}>
                    <DollarSign className="h-3 w-3 mr-1" />
                    Place This Ticket
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {riskTolerance > 0.7 && (
          <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10" data-testid="banner-high-risk">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">High Risk Mode Active</p>
                <p className="text-xs text-muted-foreground">
                  Portfolio includes aggressive moonshot tickets. Only risk what you can afford to lose.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Briefcase, TrendingUp, Shield, Target, DollarSign, Shuffle, ChevronRight, AlertTriangle } from "lucide-react";
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

function generatePortfolio(legs: ParlayLeg[], bankroll: number, riskTolerance: number): PortfolioTicket[] {
  if (legs.length < 3) return [];
  
  const tickets: PortfolioTicket[] = [];
  
  const anchorLegs = legs.slice(0, 3);
  const anchorOdds = anchorLegs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.8), 1);
  tickets.push({
    id: "anchor-1",
    name: "Anchor Parlay",
    legs: anchorLegs,
    stake: bankroll * 0.15 * (1 + riskTolerance * 0.1),
    winProbability: 0.25 + Math.random() * 0.15,
    expectedValue: 0.04 + Math.random() * 0.06,
    potentialPayout: bankroll * 0.15 * anchorOdds,
    riskLevel: "low",
    correlation: 0.15,
    role: "anchor",
  });
  
  if (legs.length >= 5) {
    const satelliteLegs = legs.slice(2, 6);
    const satelliteOdds = satelliteLegs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.9), 1);
    tickets.push({
      id: "satellite-1",
      name: "Satellite Parlay A",
      legs: satelliteLegs,
      stake: bankroll * 0.08 * (1 + riskTolerance * 0.15),
      winProbability: 0.12 + Math.random() * 0.08,
      expectedValue: 0.06 + Math.random() * 0.08,
      potentialPayout: bankroll * 0.08 * satelliteOdds,
      riskLevel: "medium",
      correlation: 0.25,
      role: "satellite",
    });
  }
  
  if (legs.length >= 6) {
    const satellite2Legs = [legs[0], legs[3], legs[5], ...(legs.length > 6 ? [legs[6]] : [])];
    const satellite2Odds = satellite2Legs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.85), 1);
    tickets.push({
      id: "satellite-2",
      name: "Satellite Parlay B",
      legs: satellite2Legs,
      stake: bankroll * 0.06 * (1 + riskTolerance * 0.15),
      winProbability: 0.10 + Math.random() * 0.08,
      expectedValue: 0.05 + Math.random() * 0.07,
      potentialPayout: bankroll * 0.06 * satellite2Odds,
      riskLevel: "medium",
      correlation: 0.18,
      role: "satellite",
    });
  }
  
  if (legs.length >= 8 && riskTolerance > 0.4) {
    const moonshotLegs = legs.slice(0, 8);
    const moonshotOdds = moonshotLegs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.9), 1);
    tickets.push({
      id: "moonshot-1",
      name: "Moonshot Parlay",
      legs: moonshotLegs,
      stake: bankroll * 0.02 * (1 + riskTolerance * 0.3),
      winProbability: 0.02 + Math.random() * 0.03,
      expectedValue: 0.08 + Math.random() * 0.12,
      potentialPayout: bankroll * 0.02 * moonshotOdds,
      riskLevel: "high",
      correlation: 0.35,
      role: "moonshot",
    });
  }
  
  if (legs.length >= 12 && riskTolerance > 0.6) {
    const megaMoonshotLegs = legs.slice(0, 12);
    const megaOdds = megaMoonshotLegs.reduce((acc, leg) => acc * (leg.decimalOdds || 1.85), 1);
    tickets.push({
      id: "moonshot-2",
      name: "Mega Moonshot",
      legs: megaMoonshotLegs,
      stake: bankroll * 0.01 * (1 + riskTolerance * 0.4),
      winProbability: 0.005 + Math.random() * 0.01,
      expectedValue: 0.10 + Math.random() * 0.15,
      potentialPayout: Math.min(bankroll * 0.01 * megaOdds, 1000000),
      riskLevel: "high",
      correlation: 0.45,
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
  
  const maxDrawdown = totalStake * 0.85;
  const sharpeRatio = weightedEV / (avgCorrelation + 0.1);
  
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
          <div className="text-center py-8 text-muted-foreground">
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-portfolio">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
        <div className="p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Risk Tolerance</span>
            <Badge variant="outline">
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
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safe</span>
            <span>Jackpot Hunter</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">${metrics.totalStake.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Stake</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-500">+{(metrics.portfolioEV * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Portfolio EV</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{(metrics.diversificationScore * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Diversification</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{(metrics.jackpotProbability * 100).toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Jackpot Chance</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Optimized Tickets ({portfolio.length})</h4>
            <Button size="sm" variant="outline">
              <Shuffle className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>

          {portfolio.map((ticket) => (
            <div 
              key={ticket.id}
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
                    <span className="text-green-500 font-medium">+{(ticket.expectedValue * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Correlation Factor:</span>
                    <span className="font-medium">{(ticket.correlation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Legs: </span>
                    {ticket.legs.map(l => l.team).join(", ")}
                  </div>
                  <Button size="sm" className="w-full mt-2">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Place This Ticket
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {riskTolerance > 0.7 && (
          <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
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

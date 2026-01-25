import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Zap,
  Target,
  Users,
  Clock,
  MapPin,
  CloudRain,
  Flame,
  ChevronRight,
  Eye,
  BarChart3
} from "lucide-react";

interface TeamScheme {
  teamName: string;
  sport: string;
  offensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    keyPlays: string[];
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  defensiveScheme: {
    name: string;
    style: "aggressive" | "balanced" | "conservative";
    formation: string;
    successRate: number;
    trendDirection: "up" | "down" | "stable";
  };
  situationalPatterns: {
    homeAdvantage: number;
    awayPerformance: number;
    primetime: number;
    underdog: number;
    favorite: number;
  };
}

interface CoachProfile {
  name: string;
  team: string;
  sport: string;
  tendencies: {
    riskTolerance: "high" | "medium" | "low";
    fourthDownAggression?: number;
    tempoPreference: "fast" | "moderate" | "slow";
    adjustmentRating: number;
    clutchDecisions: number;
  };
  historicalPatterns: {
    vsSpread: number;
    overUnderTrend: "over" | "under" | "balanced";
    rivalryBoost: number;
    restAdvantage: number;
  };
  recentForm: {
    lastFive: string;
    coverRate: number;
    trend: "hot" | "cold" | "neutral";
  };
}

interface SchemeAlert {
  id: string;
  type: "advantage" | "warning" | "neutral";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  affectedLegs: string[];
  confidence: number;
}

interface MatchupSchemeAnalysis {
  matchup: string;
  homeTeam: string;
  awayTeam: string;
  schemeAdvantage: "home" | "away" | "even";
  keyFactors: string[];
  predictionImpact: number;
  alerts: SchemeAlert[];
}

const generateTeamSchemes = (): TeamScheme[] => [
  {
    teamName: "Kansas City Chiefs",
    sport: "NFL",
    offensiveScheme: {
      name: "West Coast Spread",
      style: "aggressive",
      keyPlays: ["RPO", "Deep Crossing Routes", "Screen Games"],
      successRate: 78,
      trendDirection: "up"
    },
    defensiveScheme: {
      name: "4-3 Under",
      style: "balanced",
      formation: "Multiple Fronts",
      successRate: 72,
      trendDirection: "stable"
    },
    situationalPatterns: {
      homeAdvantage: 85,
      awayPerformance: 71,
      primetime: 82,
      underdog: 68,
      favorite: 79
    }
  },
  {
    teamName: "Philadelphia Eagles",
    sport: "NFL",
    offensiveScheme: {
      name: "Power Run RPO",
      style: "aggressive",
      keyPlays: ["Tush Push", "Hurts Scrambles", "RPO Pass"],
      successRate: 81,
      trendDirection: "up"
    },
    defensiveScheme: {
      name: "4-3 Wide",
      style: "aggressive",
      formation: "Pressure Heavy",
      successRate: 76,
      trendDirection: "up"
    },
    situationalPatterns: {
      homeAdvantage: 88,
      awayPerformance: 74,
      primetime: 79,
      underdog: 75,
      favorite: 82
    }
  },
  {
    teamName: "Boston Celtics",
    sport: "NBA",
    offensiveScheme: {
      name: "Motion Offense",
      style: "balanced",
      keyPlays: ["Ball Movement", "3PT Shooting", "Pick and Pop"],
      successRate: 84,
      trendDirection: "up"
    },
    defensiveScheme: {
      name: "Switch Everything",
      style: "aggressive",
      formation: "Man-to-Man",
      successRate: 79,
      trendDirection: "stable"
    },
    situationalPatterns: {
      homeAdvantage: 82,
      awayPerformance: 76,
      primetime: 80,
      underdog: 71,
      favorite: 85
    }
  },
  {
    teamName: "LA Dodgers",
    sport: "MLB",
    offensiveScheme: {
      name: "Analytics-Driven",
      style: "aggressive",
      keyPlays: ["Launch Angle Hitting", "Patient At-Bats", "Power Focus"],
      successRate: 77,
      trendDirection: "stable"
    },
    defensiveScheme: {
      name: "Shift Heavy",
      style: "balanced",
      formation: "Infield Positioning",
      successRate: 74,
      trendDirection: "down"
    },
    situationalPatterns: {
      homeAdvantage: 79,
      awayPerformance: 72,
      primetime: 81,
      underdog: 69,
      favorite: 76
    }
  }
];

const generateCoachProfiles = (): CoachProfile[] => [
  {
    name: "Andy Reid",
    team: "Kansas City Chiefs",
    sport: "NFL",
    tendencies: {
      riskTolerance: "high",
      fourthDownAggression: 72,
      tempoPreference: "moderate",
      adjustmentRating: 89,
      clutchDecisions: 85
    },
    historicalPatterns: {
      vsSpread: 54.2,
      overUnderTrend: "over",
      rivalryBoost: 12,
      restAdvantage: 8
    },
    recentForm: {
      lastFive: "4-1",
      coverRate: 60,
      trend: "hot"
    }
  },
  {
    name: "Nick Sirianni",
    team: "Philadelphia Eagles",
    sport: "NFL",
    tendencies: {
      riskTolerance: "high",
      fourthDownAggression: 78,
      tempoPreference: "fast",
      adjustmentRating: 76,
      clutchDecisions: 72
    },
    historicalPatterns: {
      vsSpread: 51.8,
      overUnderTrend: "under",
      rivalryBoost: 15,
      restAdvantage: 6
    },
    recentForm: {
      lastFive: "3-2",
      coverRate: 55,
      trend: "neutral"
    }
  },
  {
    name: "Joe Mazzulla",
    team: "Boston Celtics",
    sport: "NBA",
    tendencies: {
      riskTolerance: "medium",
      tempoPreference: "fast",
      adjustmentRating: 82,
      clutchDecisions: 78
    },
    historicalPatterns: {
      vsSpread: 56.1,
      overUnderTrend: "over",
      rivalryBoost: 10,
      restAdvantage: 7
    },
    recentForm: {
      lastFive: "4-1",
      coverRate: 65,
      trend: "hot"
    }
  },
  {
    name: "Dave Roberts",
    team: "LA Dodgers",
    sport: "MLB",
    tendencies: {
      riskTolerance: "medium",
      tempoPreference: "moderate",
      adjustmentRating: 75,
      clutchDecisions: 68
    },
    historicalPatterns: {
      vsSpread: 52.4,
      overUnderTrend: "over",
      rivalryBoost: 8,
      restAdvantage: 5
    },
    recentForm: {
      lastFive: "3-2",
      coverRate: 52,
      trend: "neutral"
    }
  }
];

const generateSchemeAlerts = (): SchemeAlert[] => [
  {
    id: "1",
    type: "advantage",
    title: "RPO Scheme Mismatch Detected",
    description: "Chiefs' West Coast Spread has 23% higher success rate against zone coverage teams. Today's opponent runs predominantly zone.",
    impact: "high",
    affectedLegs: ["Chiefs -3.5", "Chiefs Team Total O24.5"],
    confidence: 87
  },
  {
    id: "2",
    type: "warning",
    title: "Coaching Tendency Alert",
    description: "Eagles historically underperform ATS in afternoon road games when favored by 7+. Current line is -7.5.",
    impact: "medium",
    affectedLegs: ["Eagles -7.5"],
    confidence: 73
  },
  {
    id: "3",
    type: "advantage",
    title: "Pace Advantage Identified",
    description: "Celtics' fast tempo (102.3 possessions/game) creates +4.2 point differential vs slow-paced opponents like tonight's matchup.",
    impact: "high",
    affectedLegs: ["Celtics -6", "Game Total O228.5"],
    confidence: 81
  },
  {
    id: "4",
    type: "neutral",
    title: "Historical Pattern Match",
    description: "Dodgers are 8-3 in home day games after a loss. Pattern suggests bounce-back potential.",
    impact: "low",
    affectedLegs: ["Dodgers ML"],
    confidence: 65
  },
  {
    id: "5",
    type: "warning",
    title: "Defensive Scheme Vulnerability",
    description: "Chiefs' 4-3 Under struggles against power run teams. Opponent averages 5.2 YPC against this formation.",
    impact: "medium",
    affectedLegs: ["Chiefs -3.5", "Under 48.5"],
    confidence: 71
  }
];

const generateMatchupAnalysis = (): MatchupSchemeAnalysis[] => [
  {
    matchup: "Chiefs vs Raiders",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Las Vegas Raiders",
    schemeAdvantage: "home",
    keyFactors: [
      "Chiefs RPO success rate 23% higher vs zone",
      "Andy Reid 8-2 ATS in division games",
      "Raiders struggle vs mobile QBs (32nd in league)"
    ],
    predictionImpact: 12,
    alerts: []
  },
  {
    matchup: "Celtics vs Pistons",
    homeTeam: "Boston Celtics",
    awayTeam: "Detroit Pistons",
    schemeAdvantage: "home",
    keyFactors: [
      "Celtics switch-everything defense limits Pistons' action",
      "Pace differential of +8.7 possessions favors Celtics",
      "Pistons 2-8 ATS vs top-5 defenses"
    ],
    predictionImpact: 8,
    alerts: []
  }
];

const getTrendIcon = (trend: "up" | "down" | "stable") => {
  switch (trend) {
    case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
    default: return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
  }
};

const getFormBadge = (trend: "hot" | "cold" | "neutral") => {
  switch (trend) {
    case "hot": return <Badge className="bg-orange-500/10 text-orange-500"><Flame className="w-3 h-3 mr-1" />Hot</Badge>;
    case "cold": return <Badge className="bg-blue-500/10 text-blue-500"><CloudRain className="w-3 h-3 mr-1" />Cold</Badge>;
    default: return <Badge variant="secondary">Neutral</Badge>;
  }
};

const getAlertBadge = (type: "advantage" | "warning" | "neutral") => {
  switch (type) {
    case "advantage": return <Badge className="bg-green-500/10 text-green-500"><Zap className="w-3 h-3 mr-1" />Edge</Badge>;
    case "warning": return <Badge className="bg-yellow-500/10 text-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>;
    default: return <Badge variant="secondary">Info</Badge>;
  }
};

const getImpactColor = (impact: "high" | "medium" | "low") => {
  switch (impact) {
    case "high": return "text-green-500";
    case "medium": return "text-yellow-500";
    default: return "text-muted-foreground";
  }
};

interface SchemeRecognitionProps {
  mode?: "live" | "pre-game";
  selectedSports?: string[];
}

export function SchemeRecognition({ mode = "pre-game", selectedSports = [] }: SchemeRecognitionProps) {
  const [teamSchemes] = useState<TeamScheme[]>(generateTeamSchemes);
  const [coachProfiles] = useState<CoachProfile[]>(generateCoachProfiles);
  const [schemeAlerts] = useState<SchemeAlert[]>(generateSchemeAlerts);
  const [matchupAnalysis] = useState<MatchupSchemeAnalysis[]>(generateMatchupAnalysis);
  const [selectedTeam, setSelectedTeam] = useState<TeamScheme | null>(null);
  
  const filteredSchemes = selectedSports.length > 0 
    ? teamSchemes.filter(t => selectedSports.includes(t.sport))
    : teamSchemes;
  
  const filteredCoaches = selectedSports.length > 0
    ? coachProfiles.filter(c => selectedSports.includes(c.sport))
    : coachProfiles;
  
  const highImpactAlerts = schemeAlerts.filter(a => a.impact === "high");
  
  return (
    <Card className="w-full" data-testid="scheme-recognition-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            Scheme Recognition Engine
          </CardTitle>
          <Badge variant={mode === "live" ? "default" : "secondary"}>
            {mode === "live" ? "Live Analysis" : "Pre-Game Analysis"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-powered analysis of team schemes and coaching patterns affecting ticket outcomes
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="alerts" data-testid="tab-scheme-alerts">
              <AlertTriangle className="w-4 h-4 mr-1 hidden sm:inline" />
              Alerts
              {highImpactAlerts.length > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                  {highImpactAlerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-team-schemes">
              <Shield className="w-4 h-4 mr-1 hidden sm:inline" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="coaches" data-testid="tab-coach-profiles">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Coaches
            </TabsTrigger>
            <TabsTrigger value="matchups" data-testid="tab-matchup-analysis">
              <Target className="w-4 h-4 mr-1 hidden sm:inline" />
              Matchups
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="alerts" className="space-y-3">
            {schemeAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="p-3 rounded-lg border bg-card hover-elevate"
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    {getAlertBadge(alert.type)}
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${getImpactColor(alert.impact)}`}>
                      {alert.impact.toUpperCase()} IMPACT
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {alert.confidence}% conf
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Affects:</span>
                  {alert.affectedLegs.map((leg, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{leg}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="teams" className="space-y-3">
            {filteredSchemes.map(team => (
              <div 
                key={team.teamName}
                className="p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                onClick={() => setSelectedTeam(selectedTeam?.teamName === team.teamName ? null : team)}
                data-testid={`team-scheme-${team.teamName.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{team.teamName}</span>
                    <Badge variant="outline" className="text-xs">{team.sport}</Badge>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedTeam?.teamName === team.teamName ? 'rotate-90' : ''}`} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs">Offense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{team.offensiveScheme.name}</span>
                      {getTrendIcon(team.offensiveScheme.trendDirection)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={team.offensiveScheme.successRate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{team.offensiveScheme.successRate}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Shield className="w-3 h-3" />
                      <span className="text-xs">Defense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{team.defensiveScheme.name}</span>
                      {getTrendIcon(team.defensiveScheme.trendDirection)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={team.defensiveScheme.successRate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{team.defensiveScheme.successRate}%</span>
                    </div>
                  </div>
                </div>
                
                {selectedTeam?.teamName === team.teamName && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Key Offensive Plays</h4>
                      <div className="flex gap-1 flex-wrap">
                        {team.offensiveScheme.keyPlays.map((play, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{play}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Situational Performance</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>Home: {team.situationalPatterns.homeAdvantage}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Prime: {team.situationalPatterns.primetime}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>Fav: {team.situationalPatterns.favorite}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="coaches" className="space-y-3">
            {filteredCoaches.map(coach => (
              <div 
                key={coach.name}
                className="p-3 rounded-lg border bg-card"
                data-testid={`coach-profile-${coach.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <span className="font-medium">{coach.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({coach.team})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFormBadge(coach.recentForm.trend)}
                    <Badge variant="outline" className="text-xs">{coach.recentForm.lastFive}</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-2">Coaching Tendencies</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs">Risk Tolerance</span>
                        <Badge variant="secondary" className="text-xs capitalize">{coach.tendencies.riskTolerance}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs">Tempo</span>
                        <Badge variant="secondary" className="text-xs capitalize">{coach.tendencies.tempoPreference}</Badge>
                      </div>
                      {coach.tendencies.fourthDownAggression !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs">4th Down Aggression</span>
                          <div className="flex items-center gap-1">
                            <Progress value={coach.tendencies.fourthDownAggression} className="w-16 h-1.5" />
                            <span className="text-xs">{coach.tendencies.fourthDownAggression}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-2">Betting Patterns</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs">ATS Record</span>
                        <span className={`text-xs font-medium ${coach.historicalPatterns.vsSpread > 52 ? 'text-green-500' : coach.historicalPatterns.vsSpread < 48 ? 'text-red-500' : ''}`}>
                          {coach.historicalPatterns.vsSpread}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs">O/U Trend</span>
                        <Badge variant="secondary" className="text-xs capitalize">{coach.historicalPatterns.overUnderTrend}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs">Cover Rate (L5)</span>
                        <span className={`text-xs font-medium ${coach.recentForm.coverRate > 55 ? 'text-green-500' : coach.recentForm.coverRate < 45 ? 'text-red-500' : ''}`}>
                          {coach.recentForm.coverRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="matchups" className="space-y-3">
            {matchupAnalysis.map((analysis, i) => (
              <div 
                key={i}
                className="p-3 rounded-lg border bg-card"
                data-testid={`matchup-analysis-${i}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="font-medium">{analysis.matchup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={analysis.schemeAdvantage === "home" ? "bg-green-500/10 text-green-500" : analysis.schemeAdvantage === "away" ? "bg-blue-500/10 text-blue-500" : ""}>
                      {analysis.schemeAdvantage === "home" ? analysis.homeTeam : analysis.schemeAdvantage === "away" ? analysis.awayTeam : "Even"} Advantage
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      +{analysis.predictionImpact}% impact
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Key Scheme Factors</h4>
                  <ul className="space-y-1">
                    {analysis.keyFactors.map((factor, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <Target className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function SchemeAlertBanner() {
  const [alerts] = useState<SchemeAlert[]>(generateSchemeAlerts);
  const highImpactAlerts = alerts.filter(a => a.impact === "high");
  
  if (highImpactAlerts.length === 0) return null;
  
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4" data-testid="scheme-alert-banner">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Scheme Intelligence Detected</span>
        <Badge className="text-xs">{highImpactAlerts.length} high-impact</Badge>
      </div>
      <div className="space-y-1">
        {highImpactAlerts.slice(0, 2).map(alert => (
          <div key={alert.id} className="flex items-center gap-2 text-sm">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground">{alert.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

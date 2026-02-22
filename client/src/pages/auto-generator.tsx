import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  Check,
  Brain,
  BarChart3,
  Shield,
  Clock,
  Users,
  Activity,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Star,
  Radio,
  RefreshCw,
  HelpCircle,
  Bell,
  GripVertical
} from "lucide-react";
import type { GeneratedTicket } from "@/lib/ticket-orchestrator";
import type { TicketFusion } from "@/lib/quantum-fusion-engine";
import type { Sport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLiveOddsStatus } from "@/hooks/use-live-odds";
import { OnboardingTutorial, TutorialButton } from "@/components/onboarding-tutorial";
import { BettingInsights } from "@/components/betting-insights";
import { SchemeRecognition, SchemeAlertBanner } from "@/components/scheme-recognition";
import { QuantumFusionEngineBanner, TicketFusionDisplay } from "@/components/quantum-fusion-display";
import { DataSourceStatus } from "@/components/data-source-status";
import { StakeConfirmationDialog } from "@/components/stake-confirmation-dialog";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { VisualParlayBuilder } from "@/components/visual-parlay-builder";
import { getDefaultBettingEnvironment } from "@/components/betting-settings";
import { eventTracker } from "@/lib/event-tracker";
import { trackTicketGenerate, trackPageView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";

const sportConfig: { id: Sport; name: string; color: string; icon: string }[] = [
  { id: "NBA", name: "NBA", color: "bg-orange-500", icon: "" },
  { id: "NFL", name: "NFL", color: "bg-green-600", icon: "" },
  { id: "MLB", name: "MLB", color: "bg-red-500", icon: "" },
  { id: "NHL", name: "NHL", color: "bg-blue-500", icon: "" },
  { id: "NCAAB", name: "College Basketball", color: "bg-purple-500", icon: "" },
  { id: "NCAAF", name: "College Football", color: "bg-amber-600", icon: "" },
];

function TicketCard({ ticket, index, onPlaceBet }: { ticket: GeneratedTicket; index: number; onPlaceBet: (ticket: GeneratedTicket) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const handleAddLegToSlip = (leg: any) => {
    const slipLeg: ParlaySlipLeg = {
      id: leg.id,
      team: leg.team,
      opponent: leg.opponent,
      market: leg.market as any,
      outcome: leg.outcome,
      decimalOdds: leg.decimalOdds,
      americanOdds: leg.americanOdds,
      playerName: leg.playerName,
      propCategory: leg.propCategory,
      propLine: leg.line,
      addedFrom: "Smart Generator",
      addedAt: new Date().toISOString(),
      sport: ticket.sport,
      confidence: leg.winProbability ? Math.round(leg.winProbability * 100) : undefined,
      evPercent: leg.edgePercent,
    };
    const added = addLeg(slipLeg);
    if (added) {
      toast({ title: "Added to Slip", description: `${leg.outcome} added to your parlay slip` });
    }
  };

  const handleAddAllLegs = () => {
    let addedCount = 0;
    ticket.legs.forEach(leg => {
      if (!isInSlip(leg.id)) {
        const slipLeg: ParlaySlipLeg = {
          id: leg.id,
          team: leg.team,
          opponent: leg.opponent,
          market: leg.market as any,
          outcome: leg.outcome,
          decimalOdds: leg.decimalOdds,
          americanOdds: leg.americanOdds,
          playerName: leg.playerName,
          propCategory: leg.propCategory,
          propLine: leg.line,
          addedFrom: "Smart Generator",
          addedAt: new Date().toISOString(),
          sport: ticket.sport,
          confidence: leg.winProbability ? Math.round(leg.winProbability * 100) : undefined,
          evPercent: leg.edgePercent,
        };
        if (addLeg(slipLeg)) addedCount++;
      }
    });
    if (addedCount > 0) {
      toast({ title: "Added to Slip", description: `${addedCount} leg${addedCount > 1 ? "s" : ""} added to your parlay slip` });
    }
  };
  
  const formatOdds = (american: number) => {
    return american > 0 ? `+${american}` : `${american}`;
  };
  
  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-500";
    if (grade.startsWith("B")) return "text-blue-500";
    if (grade.startsWith("C")) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getRiskColor = (risk: string) => {
    if (risk === "low") return "bg-green-500/20 text-green-500";
    if (risk === "medium") return "bg-yellow-500/20 text-yellow-500";
    return "bg-red-500/20 text-red-500";
  };
  
  const copyToClipboard = () => {
    const text = ticket.legs.map(l => `${l.outcome} @ ${formatOdds(l.americanOdds)}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="overflow-hidden" data-testid={`ticket-card-${ticket.id}`}>
      <CardHeader className="pb-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{ticket.sport}</Badge>
            <span className={`text-2xl font-bold ${getGradeColor(ticket.grade)}`} data-testid={`text-grade-${ticket.id}`}>
              {ticket.grade}
            </span>
            <Badge className={getRiskColor(ticket.riskRating)}>
              {ticket.riskRating.charAt(0).toUpperCase() + ticket.riskRating.slice(1)} Risk
            </Badge>
          </div>
          <CardTitle className="text-base sm:text-lg" data-testid={`text-ticket-name-${ticket.id}`}>{ticket.name}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="icon" variant="ghost" onClick={copyToClipboard} data-testid={`button-copy-${ticket.id}`}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={handleAddAllLegs} data-testid={`button-add-all-slip-${ticket.id}`}>
              <Star className="w-4 h-4 mr-1" />
              Add to Slip
            </Button>
            <Button size="sm" onClick={() => onPlaceBet(ticket)} data-testid={`button-place-bet-${ticket.id}`}>
              <DollarSign className="w-4 h-4" />
              Track This Bet
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Win Prob</p>
            <p className="text-lg sm:text-xl font-bold text-green-500" data-testid={`text-win-prob-${ticket.id}`}>
              {(ticket.winProbability * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">EV%</p>
            <p className={`text-lg sm:text-xl font-bold ${(ticket.evPercent ?? ticket.expectedValue * 100) >= 0 ? "text-green-500" : "text-red-500"}`} data-testid={`text-ev-${ticket.id}`}>
              {(ticket.evPercent ?? ticket.expectedValue * 100) >= 0 ? "+" : ""}{(ticket.evPercent ?? (ticket.expectedValue * 100)).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Odds</p>
            <p className="text-lg sm:text-xl font-bold" data-testid={`text-odds-${ticket.id}`}>
              {formatOdds(ticket.americanOdds)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <div className="flex items-center justify-center gap-2">
              <Progress value={ticket.confidenceScore * 100} className="h-2 w-12 sm:w-16" />
              <span className="text-sm font-semibold">{(ticket.confidenceScore * 100).toFixed(0)}%</span>
            </div>
            {ticket.confidenceTag && (
              <Badge variant="outline" className="text-xs mt-1">{ticket.confidenceTag}</Badge>
            )}
          </div>
        </div>

        {(ticket.consensusProbability || ticket.modelDisagreement !== undefined) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Consensus Prob</p>
              <p className="text-sm font-semibold" data-testid={`text-consensus-${ticket.id}`}>
                {((ticket.consensusProbability ?? 0) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Model Agreement</p>
              <p className="text-sm font-semibold" data-testid={`text-disagreement-${ticket.id}`}>
                {(100 - (ticket.modelDisagreement ?? 0) * 100).toFixed(0)}%
              </p>
            </div>
            {ticket.marketMovement && (
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Line Movement</p>
                <p className={`text-sm font-semibold ${ticket.marketMovement.possibleInefficiency ? "text-yellow-500" : ""}`}>
                  {ticket.marketMovement.direction === "up" ? "+" : ticket.marketMovement.direction === "down" ? "-" : ""}{ticket.marketMovement.percentChange}%
                  {ticket.marketMovement.possibleInefficiency && " *"}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Recommended Stake</p>
            <p className="text-lg sm:text-2xl font-bold text-primary" data-testid={`text-stake-${ticket.id}`}>
              ${ticket.recommendedStake.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-muted-foreground">Potential Payout</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500" data-testid={`text-payout-${ticket.id}`}>
              ${ticket.potentialPayout.toFixed(2)}
            </p>
          </div>
        </div>
        
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between gap-2" data-testid={`button-expand-${ticket.id}`}>
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                {ticket.legs.length} Legs
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {ticket.legs.map((leg, idx) => (
              <div key={leg.id} className="p-3 bg-muted/30 rounded-lg space-y-2" data-testid={`leg-${leg.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium" data-testid={`text-leg-outcome-${leg.id}`}>{leg.outcome}</p>
                    <p className="text-sm text-muted-foreground">{leg.team} vs {leg.opponent}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold" data-testid={`text-leg-odds-${leg.id}`}>{formatOdds(leg.americanOdds)}</p>
                    <Badge variant="outline" className="text-xs">{leg.market}</Badge>
                  </div>
                </div>
                {leg.dataSources && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 h-5 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                      <Radio className="w-2.5 h-2.5" />
                      {leg.dataSources.odds}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 h-5 bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400">
                      {leg.dataSources.game}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Badge variant={leg.analysis.sharpAction ? "default" : "secondary"} className="text-xs">
                      {leg.analysis.sharpAction ? "Sharp Action" : "Public Bet"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {leg.analysis.lineMovement === "steam" ? "Steam Move" : 
                       leg.analysis.lineMovement === "reverse" ? "Reverse Line" : "Stable Line"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {leg.edgePercent >= 0 ? "+" : ""}{leg.edgePercent.toFixed(1)}% Edge
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={isInSlip(leg.id) ? "secondary" : "outline"}
                    className="text-xs h-7 px-2 shrink-0"
                    onClick={() => handleAddLegToSlip(leg)}
                    disabled={isInSlip(leg.id)}
                    data-testid={`button-add-leg-slip-${leg.id}`}
                  >
                    {isInSlip(leg.id) ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> In Slip</>
                    ) : (
                      <><Star className="w-3 h-3 mr-1" /> Add to Slip</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="pt-3 border-t space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                Analysis Rationale
              </p>
              <div className="space-y-1">
                {ticket.rationale.map((reason, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {reason}
                  </p>
                ))}
              </div>
            </div>
            
            {ticket.sourceSignals && ticket.sourceSignals.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Source Signals
                </p>
                <div className="flex flex-wrap gap-1">
                  {ticket.sourceSignals.map((signal, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs capitalize">{signal}</Badge>
                  ))}
                </div>
              </div>
            )}

            {ticket.riskFactors && ticket.riskFactors.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Risk Factors
                </p>
                <div className="space-y-1">
                  {ticket.riskFactors.map((risk, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Shield className="w-3 h-3 mt-0.5 text-red-400 shrink-0" />
                      {risk}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {ticket.calibrationInfo && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  Calibration
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Model Hit Rate (simulated): </span>
                    <span className="font-medium">{(ticket.calibrationInfo.historicalHitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Sample Size: </span>
                    <span className="font-medium">{ticket.calibrationInfo.sampleSize.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Market slice: {ticket.calibrationInfo.marketSlice}</p>
              </div>
            )}

            {ticket.recommendedAlternatives && ticket.recommendedAlternatives.length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Alternative Plays
                </p>
                {ticket.recommendedAlternatives.map((alt, idx) => (
                  <div key={idx} className="p-2 bg-muted/20 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium">{alt.selection}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{alt.market}</Badge>
                        <span className={alt.evPercent >= 0 ? "text-green-500" : "text-red-500"}>
                          {alt.evPercent >= 0 ? "+" : ""}{alt.evPercent}% EV
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{alt.rationale}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                AI Analysis Scores
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">Coaching Analysis</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.quantumCoachingScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">Player Analysis</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.quantumPlayerScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">Team Dynamics</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.quantumTeamScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">ML Projections</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.mlProjectionScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">Sharp Money</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.sharpMoneyScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground truncate">Cashout</span>
                  <span className="font-medium shrink-0">{(ticket.analysisFactors.cashoutEligibility * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function AutoGenerator() {
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);
  const [bankroll, setBankroll] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [maxLegs, setMaxLegs] = useState(4);
  const [includeProps, setIncludeProps] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tickets, setTickets] = useState<GeneratedTicket[]>([]);
  const [ticketFusions, setTicketFusions] = useState<TicketFusion[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [confirmTicket, setConfirmTicket] = useState<GeneratedTicket | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastDataRefresh, setLastDataRefresh] = useState<string | null>(null);
  const [responseSources, setResponseSources] = useState<{ primary?: string; analysis?: string; agent?: string } | null>(null);
  
  const { data: liveStatus, refetch: refetchStatus } = useLiveOddsStatus();
  const { toast } = useToast();
  
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("sors_tutorial_complete");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);
  
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem("sors_tutorial_complete", "true");
  };

  const handlePlaceBet = (ticket: GeneratedTicket) => {
    setConfirmTicket(ticket);
    setShowConfirmDialog(true);
  };

  const handleConfirmBet = (ticket: GeneratedTicket) => {
    eventTracker.trackTicketAccept(ticket.id, ticket.recommendedStake, ticket.americanOdds);
  };
  
  const toggleSport = (sport: Sport) => {
    setSelectedSports(prev => 
      prev.includes(sport) 
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };
  
  const fetchTicketsFromBackend = async (
    sports: Sport[],
    reqBankroll: number,
    reqRiskLevel: string,
    reqMaxLegs: number,
    reqIncludeProps: boolean,
    endpoint: string = "/api/generate-tickets",
  ) => {
    try {
      const response = await apiRequest("POST", endpoint, {
        sports,
        bankroll: reqBankroll,
        riskLevel: reqRiskLevel,
        maxLegs: reqMaxLegs,
        includeProps: reqIncludeProps,
      });
      
      const data = await response.json();
      const generatedTickets: GeneratedTicket[] = data.tickets || [];
      
      setTickets(generatedTickets);
      eventTracker.trackTicketGenerate(sports, reqRiskLevel, reqBankroll);
      trackTicketGenerate(sports.join(","), generatedTickets.length);
      
      const fusions = generatedTickets
        .map(ticket => ticket.fusionData)
        .filter((f): f is TicketFusion => !!f);
      setTicketFusions(fusions);
      
      if (data.dataSources) {
        setResponseSources(data.dataSources);
      }
      if (data.generatedAt) {
        setLastDataRefresh(data.generatedAt);
      }
      
      setHasGenerated(true);
    } catch (err) {
      toast({
        title: "Generation Error",
        description: err instanceof Error ? err.message : "Failed to generate tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsRecalculating(false);
    }
  };
  
  const handleQuickPick = async () => {
    setIsGenerating(true);
    
    const quickSports: Sport[] = ["NBA", "NFL", "MLB"];
    setSelectedSports(quickSports);
    
    await fetchTicketsFromBackend(quickSports, 500, "moderate", 3, true);
  };
  
  const handleSetReminder = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          setReminderSet(true);
          setTimeout(() => {
            new Notification("Sors Maxima", {
              body: "Time to check today's best betting opportunities!",
              icon: "/favicon.ico"
            });
          }, 4 * 60 * 60 * 1000);
        } else {
          setReminderSet(true);
        }
      });
    } else {
      setReminderSet(true);
    }
  };
  
  const handleGenerate = async () => {
    if (selectedSports.length === 0) return;
    
    setIsGenerating(true);
    
    await fetchTicketsFromBackend(selectedSports, bankroll, riskLevel, maxLegs, includeProps);
  };
  
  const handleRecalculate = async () => {
    if (selectedSports.length === 0) return;
    
    setIsRecalculating(true);
    
    await fetchTicketsFromBackend(selectedSports, bankroll, riskLevel, maxLegs, includeProps, "/api/recalculate-predictions");
    
    toast({
      title: "Predictions Refreshed",
      description: "Tickets regenerated with the latest live data from ESPN and our analytics engine.",
    });
  };
  
  const getRiskDescription = (level: string) => {
    switch (level) {
      case "conservative": return "Lower odds, higher win probability (2-3 legs)";
      case "moderate": return "Balanced risk and reward (3-4 legs)";
      case "aggressive": return "Higher odds, lower win probability (4-6 legs)";
      default: return "";
    }
  };
  
  return (
    <div className="min-h-full">
      <OnboardingTutorial isOpen={showTutorial} onComplete={handleTutorialComplete} />
      <StakeConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        ticket={confirmTicket}
        onConfirm={handleConfirmBet}
      />
      
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            <strong>For entertainment & educational purposes only.</strong> Analysis is based on statistical models and is not guaranteed betting advice. 
            Past performance does not guarantee future results. Please gamble responsibly.
          </p>
        </div>

        <DataSourceStatus />

        <Tabs defaultValue="generator" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="generator" className="gap-2" data-testid="tab-smart-generator">
                <Sparkles className="w-4 h-4" />
                Smart Generator
              </TabsTrigger>
              <TabsTrigger value="visual" className="gap-2" data-testid="tab-visual-builder">
                <GripVertical className="w-4 h-4" />
                Visual Builder
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="space-y-4">
            <VisualParlayBuilder
              onLegsChange={() => {}}
              onStakeChange={() => {}}
              onResultChange={() => {}}
              bankroll={bankroll}
              bettingEnv={getDefaultBettingEnvironment()}
            />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
        
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
              Smart Ticket Generator
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Select your sports, and our AI engine will analyze 46 factors to generate 
            optimal betting tickets.
          </p>
          
          <div className="flex items-center justify-center gap-2 sm:gap-4 pt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${liveStatus?.available ? 'text-green-500 animate-pulse' : 'text-yellow-500'}`} />
              <span className="text-xs sm:text-sm">
                {liveStatus?.available ? (
                  <span className="text-green-600 dark:text-green-400">Live Odds</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">Demo Mode</span>
                )}
              </span>
            </div>
            {liveStatus?.requestsRemaining !== null && liveStatus?.requestsRemaining !== undefined && (
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                {liveStatus.requestsRemaining} API calls
              </Badge>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => refetchStatus()}
              data-testid="button-refresh-status"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-2 sm:gap-3 pt-2">
            <Button
              onClick={handleQuickPick}
              disabled={isGenerating}
              className="w-full sm:w-auto"
              data-testid="button-quick-pick"
            >
              <Zap className="w-4 h-4" />
              Quick Pick
            </Button>
            <Button
              variant="outline"
              onClick={handleSetReminder}
              disabled={reminderSet}
              className="w-full sm:w-auto gap-2"
              data-testid="button-set-reminder"
            >
              <Bell className="w-4 h-4" />
              {reminderSet ? "Set" : "Remind Me"}
            </Button>
            <div className="col-span-2 flex justify-center sm:col-span-1">
              <TutorialButton onClick={() => setShowTutorial(true)} />
            </div>
          </div>
        </header>
        
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Select Your Sports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {sportConfig.map(sport => (
                <Button
                  key={sport.id}
                  variant={selectedSports.includes(sport.id) ? "default" : "outline"}
                  className={`h-auto py-3 sm:py-4 flex-col gap-1 sm:gap-2 ${
                    selectedSports.includes(sport.id) ? sport.color : ""
                  }`}
                  onClick={() => toggleSport(sport.id)}
                  data-testid={`button-sport-${sport.id}`}
                >
                  <span className="text-base sm:text-xl font-bold">{sport.id}</span>
                  <span className="text-[10px] sm:text-xs opacity-80 truncate w-full text-center">{sport.name}</span>
                </Button>
              ))}
            </div>
            
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between gap-2" data-testid="button-toggle-settings">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Advanced Settings
                  </span>
                  {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Bankroll
                      </Label>
                      <span className="font-bold" data-testid="text-bankroll">${bankroll}</span>
                    </div>
                    <Slider
                      value={[bankroll]}
                      onValueChange={([v]) => setBankroll(v)}
                      min={100}
                      max={10000}
                      step={100}
                      data-testid="slider-bankroll"
                    />
                    <p className="text-xs text-muted-foreground">Stakes calculated using optimal sizing</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Risk Level
                      </Label>
                      <Badge variant="outline">{riskLevel}</Badge>
                    </div>
                    <div className="flex gap-2">
                      {(["conservative", "moderate", "aggressive"] as const).map(level => (
                        <Button
                          key={level}
                          size="sm"
                          variant={riskLevel === level ? "default" : "outline"}
                          onClick={() => setRiskLevel(level)}
                          className="flex-1 capitalize"
                          data-testid={`button-risk-${level}`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{getRiskDescription(riskLevel)}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Max Legs per Ticket
                      </Label>
                      <span className="font-bold" data-testid="text-max-legs">{maxLegs}</span>
                    </div>
                    <Slider
                      value={[maxLegs]}
                      onValueChange={([v]) => setMaxLegs(v)}
                      min={2}
                      max={8}
                      step={1}
                      data-testid="slider-max-legs"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Include Player Props
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">Add player performance bets</p>
                    </div>
                    <Switch
                      checked={includeProps}
                      onCheckedChange={setIncludeProps}
                      data-testid="switch-include-props"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <Button 
              size="lg" 
              className="w-full gap-3 text-lg h-14"
              disabled={selectedSports.length === 0 || isGenerating}
              onClick={handleGenerate}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing 46 Factors...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Winning Tickets
                </>
              )}
            </Button>
            
            {selectedSports.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Select at least one sport to generate tickets
              </p>
            )}
          </CardContent>
        </Card>
        
        {isGenerating && (
          <Card className="overflow-hidden">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Generating Optimal Tickets</p>
                  <p className="text-sm text-muted-foreground">Running analysis across 46 factors...</p>
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Coaching Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Player Performance Prediction</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Team Dynamics & Correlations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>ML Projections & Sharp Money</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {hasGenerated && !isGenerating && tickets.length > 0 && (
          <div className="space-y-4">
            <QuantumFusionEngineBanner />
            
            <SchemeAlertBanner />
            
            {responseSources && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Data Sources Verified</span>
                  </div>
                  {lastDataRefresh && (
                    <span className="text-xs text-muted-foreground" data-testid="text-last-refresh">
                      Last updated: {new Date(lastDataRefresh).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {responseSources.primary && (
                    <Badge variant="outline" className="text-xs gap-1" data-testid="badge-source-primary">
                      <Radio className="w-3 h-3 text-green-500" />
                      {responseSources.primary}
                    </Badge>
                  )}
                  {responseSources.analysis && (
                    <Badge variant="outline" className="text-xs gap-1" data-testid="badge-source-analysis">
                      <Brain className="w-3 h-3 text-blue-500" />
                      {responseSources.analysis}
                    </Badge>
                  )}
                  {responseSources.agent && (
                    <Badge variant="outline" className="text-xs gap-1" data-testid="badge-source-agent">
                      <Activity className="w-3 h-3 text-purple-500" />
                      {responseSources.agent}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Your Optimized Tickets
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={isRecalculating || isGenerating}
                  className="gap-2"
                  data-testid="button-recalculate"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                  {isRecalculating ? "Refreshing..." : "Recalculate"}
                </Button>
                <Badge variant="secondary" className="text-sm">
                  {tickets.length} tickets generated
                </Badge>
              </div>
            </div>
            
            <AffiliateDisclosure compact />
            
            <div className="grid gap-4 lg:grid-cols-2">
              {tickets.map((ticket, idx) => (
                <TicketCard key={ticket.id} ticket={ticket} index={idx} onPlaceBet={handlePlaceBet} />
              ))}
            </div>
            
            {ticketFusions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Full Factor Analysis
                </h3>
                {ticketFusions.map((fusion, idx) => (
                  <TicketFusionDisplay key={fusion.ticketId} ticketFusion={fusion} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {hasGenerated && !isGenerating && tickets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No tickets available</p>
              <p className="text-sm text-muted-foreground">Try selecting different sports or adjusting your settings</p>
            </CardContent>
          </Card>
        )}
        
        <SchemeRecognition 
          mode="pre-game" 
          selectedSports={selectedSports.length > 0 ? selectedSports : ["NBA", "NFL", "MLB"]} 
        />
        
        <BettingInsights />

          </TabsContent>
        </Tabs>
        
        <footer className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            For educational purposes only. Please gamble responsibly.
          </p>
        </footer>
      </div>
    </div>
  );
}

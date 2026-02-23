import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  DollarSign, 
  Target, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  Shield,
  Users,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Star,
  RefreshCw,
  ThumbsUp,
  Trophy,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Eye,
  Link2,
  History
} from "lucide-react";
import type { GeneratedTicket } from "@/lib/ticket-orchestrator";
import type { TicketFusion } from "@/lib/quantum-fusion-engine";
import type { Sport } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { OnboardingTutorial, TutorialButton } from "@/components/onboarding-tutorial";
import { StakeConfirmationDialog } from "@/components/stake-confirmation-dialog";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { saveTicketToHistory } from "@/pages/ticket-history";
import { eventTracker } from "@/lib/event-tracker";
import { trackTicketGenerate, trackPageView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";

type BetCategory = "game" | "halves" | "player_props" | "alt_lines" | "soccer_special";

const betCategories: { id: BetCategory; name: string; description: string; betTypes: string[] }[] = [
  { id: "game", name: "Game Lines", description: "ML, Spread, Totals", betTypes: ["moneyline", "spread", "total", "team_total"] },
  { id: "halves", name: "Half/Quarter", description: "1H & 1Q lines", betTypes: ["first_half_spread", "first_half_total", "first_quarter_spread", "first_quarter_total"] },
  { id: "player_props", name: "Player Props", description: "Points, yards, goals", betTypes: ["player_points", "player_rebounds", "player_assists", "player_threes", "player_pts_rebs_asts", "player_double_double", "player_passing_yds", "player_rushing_yds", "player_receiving_yds", "player_tds", "player_strikeouts", "player_hits_runs_rbis", "player_goals", "player_shots", "player_saves", "anytime_scorer", "prop"] },
  { id: "alt_lines", name: "Alt Lines", description: "Alternate spreads & totals", betTypes: ["alt_spread", "alt_total"] },
  { id: "soccer_special", name: "Soccer Specials", description: "BTTS, DNB, Correct Score", betTypes: ["btts", "draw_no_bet", "correct_score", "asian_handicap", "match_result_btts"] },
];

const sportConfig: { id: string; name: string; color: string }[] = [
  { id: "NBA", name: "Basketball", color: "bg-orange-500" },
  { id: "NFL", name: "Football", color: "bg-green-600" },
  { id: "MLB", name: "Baseball", color: "bg-red-500" },
  { id: "NHL", name: "Hockey", color: "bg-blue-500" },
  { id: "NCAAB", name: "College Hoops", color: "bg-purple-500" },
  { id: "NCAAF", name: "College Football", color: "bg-amber-600" },
];

const soccerConfig: { id: string; name: string; color: string }[] = [
  { id: "Soccer_EPL", name: "Premier League", color: "bg-indigo-500" },
  { id: "Soccer_LALIGA", name: "La Liga", color: "bg-rose-500" },
  { id: "Soccer_BUNDESLIGA", name: "Bundesliga", color: "bg-red-600" },
  { id: "Soccer_SERIEA", name: "Serie A", color: "bg-sky-600" },
  { id: "Soccer_LIGUE1", name: "Ligue 1", color: "bg-cyan-600" },
  { id: "Soccer_MLS", name: "MLS", color: "bg-emerald-600" },
  { id: "Soccer_UCL", name: "Champions League", color: "bg-violet-600" },
  { id: "Soccer_INTL", name: "International", color: "bg-teal-600" },
];

function getRecommendationLabel(grade: string, ev: number): { label: string; color: string; icon: React.ReactNode } {
  if (grade.startsWith("A")) return { label: "Best Pick", color: "bg-green-500 text-white", icon: <Trophy className="w-4 h-4" /> };
  if (grade === "B+" || grade === "B") return { label: "Great Pick", color: "bg-blue-500 text-white", icon: <ThumbsUp className="w-4 h-4" /> };
  if (grade.startsWith("B")) return { label: "Good Pick", color: "bg-blue-400 text-white", icon: <ThumbsUp className="w-4 h-4" /> };
  if (grade.startsWith("C") && ev > 0) return { label: "Decent Pick", color: "bg-yellow-500 text-white", icon: <Star className="w-4 h-4" /> };
  if (grade.startsWith("C")) return { label: "Fair Pick", color: "bg-yellow-500/80 text-white", icon: <Star className="w-4 h-4" /> };
  return { label: "Risky Pick", color: "bg-red-400 text-white", icon: <AlertCircle className="w-4 h-4" /> };
}

function SimpleTicketCard({ ticket, index, onPlaceBet }: { ticket: GeneratedTicket & { intelligence?: any }; index: number; onPlaceBet: (ticket: GeneratedTicket) => void }) {
  const [showLegs, setShowLegs] = useState(index === 0);
  const [showIntel, setShowIntel] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const evPercent = ticket.evPercent ?? ticket.expectedValue * 100;
  const rec = getRecommendationLabel(ticket.grade, evPercent);
  const intel = ticket.intelligence;
  
  const formatOdds = (american: number) => american > 0 ? `+${american}` : `${american}`;

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
      toast({ title: "Added to Slip", description: `${addedCount} pick${addedCount > 1 ? "s" : ""} added to your parlay slip` });
    }
  };

  const handleAddLeg = (leg: any) => {
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
      toast({ title: "Added", description: `${leg.outcome} added to your parlay slip` });
    }
  };
  
  const copyToClipboard = () => {
    const text = ticket.legs.map(l => `${l.outcome} @ ${formatOdds(l.americanOdds)}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToHistory = () => {
    saveTicketToHistory(ticket);
    toast({ title: "Saved", description: "Ticket saved to your history" });
  };
  
  return (
    <Card className={`overflow-hidden ${index === 0 ? "ring-2 ring-primary/50" : ""}`} data-testid={`ticket-card-${ticket.id}`}>
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${rec.color} gap-1 text-xs font-semibold`} data-testid={`badge-rec-${ticket.id}`}>
                {rec.icon}
                {rec.label}
              </Badge>
              {intel?.ticketGrade && (
                <Badge variant="outline" className={`text-xs font-bold ${
                  intel.ticketGrade.grade === "A" ? "border-green-500 text-green-500" :
                  intel.ticketGrade.grade === "B" ? "border-blue-500 text-blue-500" :
                  intel.ticketGrade.grade === "C" ? "border-yellow-500 text-yellow-500" :
                  "border-red-400 text-red-400"
                }`} data-testid={`badge-grade-${ticket.id}`}>
                  Grade: {intel.ticketGrade.grade}
                </Badge>
              )}
              {index === 0 && <Badge variant="outline" className="text-xs border-primary/50 text-primary">Top Pick</Badge>}
              {intel?.correlationAlerts?.some((a: any) => a.type === "negative") && (
                <Badge variant="outline" className="text-xs border-orange-500 text-orange-500 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Corr. Warning
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base sm:text-lg leading-tight" data-testid={`text-ticket-name-${ticket.id}`}>
              {ticket.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {ticket.legs.length} pick{ticket.legs.length > 1 ? "s" : ""} · {ticket.sport}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Win Chance</p>
            <p className="text-base sm:text-lg font-bold text-green-500" data-testid={`text-win-prob-${ticket.id}`}>
              {(ticket.winProbability * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Odds</p>
            <p className="text-base sm:text-lg font-bold" data-testid={`text-odds-${ticket.id}`}>
              {formatOdds(ticket.americanOdds)}
            </p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Value</p>
            <p className={`text-base sm:text-lg font-bold ${evPercent >= 0 ? "text-green-500" : "text-red-400"}`} data-testid={`text-ev-${ticket.id}`}>
              {evPercent >= 0 ? "+" : ""}{evPercent.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Suggested Bet</p>
            <p className="text-lg sm:text-xl font-bold text-primary" data-testid={`text-stake-${ticket.id}`}>
              ${ticket.recommendedStake.toFixed(0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Could Win</p>
            <p className="text-lg sm:text-xl font-bold text-green-500" data-testid={`text-payout-${ticket.id}`}>
              ${ticket.potentialPayout.toFixed(0)}
            </p>
          </div>
        </div>

        <Collapsible open={showLegs} onOpenChange={setShowLegs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-9" data-testid={`button-expand-${ticket.id}`}>
              <span className="text-sm">
                {showLegs ? "Hide Picks" : `Show ${ticket.legs.length} Picks`}
              </span>
              {showLegs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {ticket.legs.map((leg, legIdx) => {
              const split = intel?.sharpPublicSplits?.[legIdx];
              return (
                <div key={leg.id} className="p-2.5 bg-muted/30 rounded-lg space-y-1.5" data-testid={`leg-${leg.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-leg-outcome-${leg.id}`}>{leg.outcome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{leg.team} vs {leg.opponent}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{leg.market}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm" data-testid={`text-leg-odds-${leg.id}`}>{formatOdds(leg.americanOdds)}</span>
                      <Button
                        size="sm"
                        variant={isInSlip(leg.id) ? "secondary" : "outline"}
                        className="text-[10px] h-7 px-2"
                        onClick={() => handleAddLeg(leg)}
                        disabled={isInSlip(leg.id)}
                        data-testid={`button-add-leg-slip-${leg.id}`}
                      >
                        {isInSlip(leg.id) ? <CheckCircle2 className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  {split && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${split.sharpPercent}%` }} />
                      </div>
                      <span className={`text-[10px] font-medium ${
                        split.verdict === "sharp_agree" ? "text-blue-500" : 
                        split.verdict === "sharp_fade" ? "text-orange-500" : "text-muted-foreground"
                      }`} data-testid={`text-sharp-split-${leg.id}`}>
                        {split.verdict === "sharp_agree" ? "Sharp" : split.verdict === "sharp_fade" ? "Faded" : `${split.sharpPercent}% Sharp`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

          </CollapsibleContent>
        </Collapsible>

        {intel && (
          <Collapsible open={showIntel} onOpenChange={setShowIntel}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-8 text-muted-foreground" data-testid={`button-intel-${ticket.id}`}>
                <span className="text-xs flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  {showIntel ? "Hide Analysis" : "Show Analysis"}
                </span>
                {showIntel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-1">
              {intel.correlationAlerts?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Correlation Analysis
                  </p>
                  {intel.correlationAlerts.map((alert: any, i: number) => (
                    <div key={i} className={`text-[11px] p-2 rounded-md flex items-start gap-1.5 ${
                      alert.type === "negative" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                    }`} data-testid={`correlation-alert-${i}`}>
                      {alert.type === "negative" ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {intel.ticketGrade && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Grade Breakdown
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {intel.ticketGrade.breakdown?.slice(0, 4).map((b: any, i: number) => (
                      <div key={i} className="text-[10px] p-1.5 bg-muted/30 rounded">
                        <span className="text-muted-foreground">{b.factor}:</span>{" "}
                        <span className="font-medium">{b.score}/{Math.round(b.weight * 100)}</span>
                      </div>
                    ))}
                  </div>
                  {intel.ticketGrade.strengths?.length > 0 && (
                    <p className="text-[10px] text-green-500">+ {intel.ticketGrade.strengths[0]}</p>
                  )}
                  {intel.ticketGrade.weaknesses?.length > 0 && (
                    <p className="text-[10px] text-red-400">- {intel.ticketGrade.weaknesses[0]}</p>
                  )}
                </div>
              )}

              {intel.hedgeAdvice?.shouldHedge && (
                <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Hedge Recommendation
                  </p>
                  <p className="text-xs font-medium">{intel.hedgeAdvice.hedgeBet?.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Hedge: <span className="text-foreground font-medium">${intel.hedgeAdvice.hedgeBet?.stake?.toFixed(0) ?? "0"}</span></span>
                    <span>Lock in: <span className="text-green-500 font-medium">${intel.hedgeAdvice.guaranteedProfit?.toFixed(0) ?? "0"}</span></span>
                    <span>Risk: <span className="text-foreground font-medium">-{((intel.hedgeAdvice.riskReduction ?? 0) * 100).toFixed(0)}%</span></span>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1.5" onClick={handleAddAllLegs} data-testid={`button-add-all-slip-${ticket.id}`}>
            <Star className="w-3.5 h-3.5" />
            Add to Slip
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSaveToHistory} data-testid={`button-save-history-${ticket.id}`}>
            <History className="w-3.5 h-3.5" />
            Save
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPlaceBet(ticket)} data-testid={`button-place-bet-${ticket.id}`}>
            <DollarSign className="w-3.5 h-3.5" />
            Track
          </Button>
          <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={copyToClipboard} data-testid={`button-copy-${ticket.id}`}>
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AutoGenerator() {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [bankroll, setBankroll] = useState(1000);
  const [riskLevel, setRiskLevel] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [maxLegs, setMaxLegs] = useState(4);
  const [includeProps, setIncludeProps] = useState(true);
  const [selectedBetCategories, setSelectedBetCategories] = useState<BetCategory[]>(["game", "player_props"]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSoccer, setShowSoccer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tickets, setTickets] = useState<GeneratedTicket[]>([]);
  const [ticketFusions, setTicketFusions] = useState<TicketFusion[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confirmTicket, setConfirmTicket] = useState<GeneratedTicket | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [skippedSports, setSkippedSports] = useState<string[]>([]);
  
  const { toast } = useToast();

  const { data: activeSportsData } = useQuery<{ sports: { sport: string; active: boolean; gameCount: number }[] }>({
    queryKey: ["/api/active-sports"],
    refetchInterval: 5 * 60 * 1000,
  });
  const activeSportsMap = new Map(
    (activeSportsData?.sports || []).map(s => [s.sport, s])
  );
  
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
  
  const toggleSport = (sport: string) => {
    setSelectedSports(prev => 
      prev.includes(sport) 
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };
  
  const getSelectedBetTypes = (): string[] => {
    return selectedBetCategories.flatMap(cat => {
      const category = betCategories.find(c => c.id === cat);
      return category ? category.betTypes : [];
    });
  };

  const toggleBetCategory = (cat: BetCategory) => {
    setSelectedBetCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const fetchTicketsFromBackend = async (
    sports: string[],
    reqBankroll: number,
    reqRiskLevel: string,
    reqMaxLegs: number,
    reqIncludeProps: boolean,
    endpoint: string = "/api/generate-tickets",
  ) => {
    try {
      const betTypes = getSelectedBetTypes();
      const response = await apiRequest("POST", endpoint, {
        sports,
        bankroll: reqBankroll,
        riskLevel: reqRiskLevel,
        maxLegs: reqMaxLegs,
        includeProps: reqIncludeProps,
        betTypes: betTypes.length > 0 ? betTypes : undefined,
      });
      
      const data = await response.json();
      const generatedTickets: GeneratedTicket[] = data.tickets || [];
      const skipped: string[] = data.skippedSports || [];
      
      setTickets(generatedTickets);
      setSkippedSports(skipped);
      
      if (skipped.length > 0) {
        toast({
          title: "Some sports skipped",
          description: `No live games found for ${skipped.join(", ")}. Tickets generated from remaining sports.`,
        });
      }
      eventTracker.trackTicketGenerate(sports, reqRiskLevel, reqBankroll);
      trackTicketGenerate(sports.join(","), generatedTickets.length);
      
      const fusions = generatedTickets
        .map(ticket => ticket.fusionData)
        .filter((f): f is TicketFusion => !!f);
      setTicketFusions(fusions);
      
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
    const preferredSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB"];
    const quickSports = preferredSports.filter(s => {
      const info = activeSportsMap.get(s);
      return !info || info.active;
    });
    const finalSports = quickSports.length > 0 ? quickSports : ["NBA", "MLB", "NHL"];
    setSelectedSports(finalSports);
    await fetchTicketsFromBackend(finalSports, 500, "moderate", 3, true);
  };
  
  const handleGenerate = async () => {
    if (selectedSports.length === 0) return;
    setIsGenerating(true);
    const hasProps = selectedBetCategories.includes("player_props");
    await fetchTicketsFromBackend(selectedSports, bankroll, riskLevel, maxLegs, hasProps);
  };
  
  const handleRecalculate = async () => {
    if (selectedSports.length === 0) return;
    setIsRecalculating(true);
    const hasProps = selectedBetCategories.includes("player_props");
    await fetchTicketsFromBackend(selectedSports, bankroll, riskLevel, maxLegs, hasProps, "/api/recalculate-predictions");
    toast({
      title: "Refreshed",
      description: "Tickets updated with the latest live data.",
    });
  };
  
  const getRiskLabel = (level: string) => {
    switch (level) {
      case "conservative": return "Safer bets, smaller payouts";
      case "moderate": return "Balanced risk & reward";
      case "aggressive": return "Bigger payouts, lower win chance";
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
      
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-6 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">
              Smart Ticket Generator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick your sports, tap Generate, and get optimized betting tickets backed by real data.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <TutorialButton onClick={() => setShowTutorial(true)} />
          </div>
        </header>

        <Card>
          <CardContent className="p-4 sm:p-5 space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Pick Your Sports
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {sportConfig.map(sport => {
                  const sportInfo = activeSportsMap.get(sport.id);
                  const isActive = !sportInfo || sportInfo.active;
                  const gameCount = sportInfo?.gameCount || 0;
                  return (
                    <Button
                      key={sport.id}
                      variant={selectedSports.includes(sport.id) ? "default" : "outline"}
                      className={`h-auto py-2.5 flex-col gap-0.5 text-xs relative ${
                        selectedSports.includes(sport.id) ? sport.color : ""
                      } ${!isActive ? "opacity-50" : ""}`}
                      onClick={() => toggleSport(sport.id)}
                      data-testid={`button-sport-${sport.id}`}
                    >
                      <span className="font-bold text-sm">{sport.id}</span>
                      <span className="opacity-80 text-[10px]">{sport.name}</span>
                      {sportInfo && !isActive && (
                        <span className="text-[9px] opacity-90">Off-Season</span>
                      )}
                      {sportInfo && isActive && (
                        <span className="text-[9px] opacity-70">{gameCount} games</span>
                      )}
                    </Button>
                  );
                })}
              </div>
              
              <Collapsible open={showSoccer} onOpenChange={setShowSoccer}>
                <CollapsibleTrigger asChild>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    {showSoccer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showSoccer ? "Hide Soccer Leagues" : "Show Soccer Leagues"}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                    {soccerConfig.map(sport => {
                      const sportInfo = activeSportsMap.get(sport.id);
                      const isActive = !sportInfo || sportInfo.active;
                      const gameCount = sportInfo?.gameCount || 0;
                      return (
                        <Button
                          key={sport.id}
                          variant={selectedSports.includes(sport.id) ? "default" : "outline"}
                          className={`h-auto py-2 flex-col gap-0 text-[10px] ${
                            selectedSports.includes(sport.id) ? sport.color : ""
                          } ${!isActive ? "opacity-50" : ""}`}
                          onClick={() => toggleSport(sport.id)}
                          data-testid={`button-sport-${sport.id}`}
                        >
                          <span className="font-bold text-xs">{sport.name}</span>
                          {sportInfo && isActive && (
                            <span className="text-[9px] opacity-70">{gameCount} games</span>
                          )}
                          {sportInfo && !isActive && (
                            <span className="text-[9px] opacity-90">No Games</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
              <CollapsibleTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" data-testid="button-toggle-settings">
                  {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showSettings ? "Hide Settings" : "Adjust Settings"}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Bankroll</Label>
                    <span className="text-sm font-bold" data-testid="text-bankroll">${bankroll}</span>
                  </div>
                  <Slider
                    value={[bankroll]}
                    onValueChange={([v]) => setBankroll(v)}
                    min={100}
                    max={10000}
                    step={100}
                    data-testid="slider-bankroll"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Risk Level</Label>
                  <div className="flex gap-2">
                    {(["conservative", "moderate", "aggressive"] as const).map(level => (
                      <Button
                        key={level}
                        size="sm"
                        variant={riskLevel === level ? "default" : "outline"}
                        onClick={() => setRiskLevel(level)}
                        className="flex-1 capitalize text-xs h-8"
                        data-testid={`button-risk-${level}`}
                      >
                        {level === "conservative" ? "Safe" : level === "moderate" ? "Balanced" : "Aggressive"}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{getRiskLabel(riskLevel)}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Max Picks per Ticket</Label>
                    <span className="text-sm font-bold" data-testid="text-max-legs">{maxLegs}</span>
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
                
                <div className="space-y-2">
                  <Label className="text-xs">Bet Types</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {betCategories.map(cat => {
                      const isSelected = selectedBetCategories.includes(cat.id);
                      const isSoccerCat = cat.id === "soccer_special";
                      const hasSoccer = selectedSports.some(s => s.startsWith("Soccer_"));
                      if (isSoccerCat && !hasSoccer) return null;
                      return (
                        <Button
                          key={cat.id}
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => toggleBetCategory(cat.id)}
                          className="text-[10px] h-7 px-2"
                          data-testid={`button-betcat-${cat.id}`}
                        >
                          <span>{cat.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedBetCategories.length === 0 
                      ? "Select at least one bet type" 
                      : selectedBetCategories.map(c => betCategories.find(b => b.id === c)?.description).join(" + ")}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <div className="flex gap-2">
              <Button 
                size="lg" 
                className="flex-1 gap-2 h-12"
                disabled={selectedSports.length === 0 || isGenerating}
                onClick={handleGenerate}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Tickets
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 h-12"
                onClick={handleQuickPick}
                disabled={isGenerating}
                data-testid="button-quick-pick"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Pick</span>
              </Button>
            </div>
            
            {selectedSports.length === 0 && !hasGenerated && (
              <p className="text-center text-xs text-muted-foreground">
                Select at least one sport above to get started
              </p>
            )}
          </CardContent>
        </Card>
        
        {isGenerating && (
          <Card>
            <CardContent className="py-10">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium">Finding the best picks...</p>
                <p className="text-xs text-muted-foreground">Analyzing live games & odds from multiple sportsbooks</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {hasGenerated && !isGenerating && tickets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Your Tickets
                <Badge variant="secondary" className="text-xs ml-1">{tickets.length}</Badge>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRecalculate}
                disabled={isRecalculating || isGenerating}
                className="gap-1.5 text-xs h-8"
                data-testid="button-recalculate"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Ranked best to worst. Tap "Show Picks" to see the details, then add to your slip or track the bet.
            </p>

            <AffiliateDisclosure compact />
            
            <div className="space-y-3">
              {tickets.map((ticket, idx) => (
                <SimpleTicketCard key={ticket.id} ticket={ticket} index={idx} onPlaceBet={handlePlaceBet} />
              ))}
            </div>
          </div>
        )}
        
        {hasGenerated && !isGenerating && tickets.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No tickets available right now</p>
              <p className="text-sm text-muted-foreground mt-1">Try selecting different sports or adjusting your settings</p>
            </CardContent>
          </Card>
        )}
        
        <footer className="pt-4 border-t text-center">
          <p className="text-[10px] text-muted-foreground">
            For entertainment & educational purposes only. Not guaranteed betting advice. Please gamble responsibly.
          </p>
        </footer>
      </div>
    </div>
  );
}

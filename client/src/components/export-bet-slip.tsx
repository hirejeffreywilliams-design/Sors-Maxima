import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileOutput, Copy, CheckCircle, ExternalLink, Plus, Trash2, Ticket,
  ListChecks, Share2, Camera, MessageCircle, Info, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  return new Promise((resolve, reject) => {
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (success) resolve();
    else reject(new Error("Copy failed"));
  });
}

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", sportLinks: { NBA: "https://sportsbook.draftkings.com/leagues/basketball/nba", NFL: "https://sportsbook.draftkings.com/leagues/football/nfl", MLB: "https://sportsbook.draftkings.com/leagues/baseball/mlb", NHL: "https://sportsbook.draftkings.com/leagues/hockey/nhl", NCAAB: "https://sportsbook.draftkings.com/leagues/basketball/ncaa", NCAAF: "https://sportsbook.draftkings.com/leagues/football/ncaa", default: "https://sportsbook.draftkings.com" }, color: "bg-[#53d337]", textColor: "text-black" },
  { id: "fanduel", name: "FanDuel", sportLinks: { NBA: "https://sportsbook.fanduel.com/basketball", NFL: "https://sportsbook.fanduel.com/american-football", MLB: "https://sportsbook.fanduel.com/baseball", NHL: "https://sportsbook.fanduel.com/hockey", NCAAB: "https://sportsbook.fanduel.com/college-basketball", NCAAF: "https://sportsbook.fanduel.com/college-football", default: "https://sportsbook.fanduel.com" }, color: "bg-[#1493ff]", textColor: "text-white" },
  { id: "betmgm", name: "BetMGM", sportLinks: { NBA: "https://sports.betmgm.com/en/sports/basketball-7", NFL: "https://sports.betmgm.com/en/sports/football-11", MLB: "https://sports.betmgm.com/en/sports/baseball-23", NHL: "https://sports.betmgm.com/en/sports/hockey-12", default: "https://sports.betmgm.com" }, color: "bg-[#c4a24f]", textColor: "text-black" },
  { id: "caesars", name: "Caesars", sportLinks: { NBA: "https://sportsbook.caesars.com/us/nba", NFL: "https://sportsbook.caesars.com/us/nfl", MLB: "https://sportsbook.caesars.com/us/mlb", NHL: "https://sportsbook.caesars.com/us/nhl", default: "https://sportsbook.caesars.com" }, color: "bg-[#0a3d2a]", textColor: "text-white" },
  { id: "pointsbet", name: "PointsBet", sportLinks: { default: "https://pointsbet.com" }, color: "bg-[#ed1c24]", textColor: "text-white" },
  { id: "betrivers", name: "BetRivers", sportLinks: { default: "https://betrivers.com" }, color: "bg-[#1a1a2e]", textColor: "text-white" },
];

function getSportLink(book: typeof SPORTSBOOKS[0], sport?: string): string {
  if (sport && sport in book.sportLinks) {
    return book.sportLinks[sport as keyof typeof book.sportLinks] as string;
  }
  return book.sportLinks.default;
}

interface BetLeg {
  sport: string;
  event: string;
  pick: string;
  odds: string;
  type: string;
}

interface ExportBetSlipProps {
  legs?: BetLeg[];
}

function formatOdds(american: number | undefined, decimal: number): string {
  if (american !== undefined) {
    return american > 0 ? `+${american}` : `${american}`;
  }
  const am = decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return am > 0 ? `+${am}` : `${am}`;
}

function formatSlipText(legs: BetLeg[]): string {
  const header = `Sors Maxima Parlay (${legs.length} legs)`;
  const divider = "-".repeat(32);
  const legLines = legs.map((l, i) => `${i + 1}. ${l.event}\n   ${l.type}: ${l.pick} (${l.odds})`);
  return [header, divider, ...legLines, divider, `Legs: ${legs.length} | Type: Parlay`].join("\n");
}

function getPrimarySport(legs: BetLeg[]): string | undefined {
  const sports = legs.map(l => l.sport).filter(Boolean);
  if (sports.length === 0) return undefined;
  const counts: Record<string, number> = {};
  sports.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function ExportBetSlip({ legs: externalLegs }: ExportBetSlipProps = {}) {
  const { toast } = useToast();
  const parlaySlip = useParlaySlip();

  const slipLegs: BetLeg[] = parlaySlip.legs.map((leg) => ({
    sport: leg.sport || "Sports",
    event: leg.opponent ? `${leg.team} vs ${leg.opponent}` : leg.team,
    pick: leg.outcome,
    odds: formatOdds(leg.americanOdds, leg.decimalOdds),
    type: leg.market.replace("_", " "),
  }));

  const [copied, setCopied] = useState(false);
  const [manualLegs, setManualLegs] = useState<BetLeg[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [checkedLegs, setCheckedLegs] = useState<Set<number>>(new Set());

  const [formSport, setFormSport] = useState("NBA");
  const [formEvent, setFormEvent] = useState("");
  const [formPick, setFormPick] = useState("");
  const [formOdds, setFormOdds] = useState("");
  const [formType, setFormType] = useState("Spread");

  const hasExternalLegs = externalLegs && externalLegs.length > 0;
  const hasSlipLegs = slipLegs.length > 0;
  const activeLegs = hasExternalLegs ? externalLegs : hasSlipLegs ? slipLegs : manualLegs;
  const isUsingExternal = hasExternalLegs || hasSlipLegs;
  const source = hasExternalLegs ? "external" : hasSlipLegs ? "slip" : "manual";
  const primarySport = getPrimarySport(activeLegs);

  function handleAddLeg() {
    if (!formEvent || !formPick || !formOdds) return;
    setManualLegs((prev) => [
      ...prev,
      { sport: formSport, event: formEvent, pick: formPick, odds: formOdds, type: formType },
    ]);
    setFormEvent("");
    setFormPick("");
    setFormOdds("");
    setShowAddForm(false);
  }

  function handleRemoveLeg(index: number) {
    setManualLegs((prev) => prev.filter((_, i) => i !== index));
  }

  const handleCopyText = () => {
    const text = formatSlipText(activeLegs);
    copyToClipboard(text).then(() => {
      setCopied(true);
      toast({ title: "Bet slip copied as text" });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: "Could not copy", variant: "destructive" });
    });
  };

  const handleShare = () => {
    const text = formatSlipText(activeLegs);
    if (navigator.share) {
      navigator.share({
        title: `Sors Maxima Parlay (${activeLegs.length} legs)`,
        text,
      }).catch(() => {});
    } else {
      handleCopyText();
    }
  };

  const handleOpenBook = (book: typeof SPORTSBOOKS[0]) => {
    setSelectedBook(book.id);
    setCheckedLegs(new Set());
    const url = getSportLink(book, primarySport);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleLeg = (index: number) => {
    setCheckedLegs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const allChecked = checkedLegs.size === activeLegs.length;

  if (activeLegs.length === 0 && !showAddForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5" />
              Export Bet Slip
            </CardTitle>
            <CardDescription>Build and place your parlay at any sportsbook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-8 text-center" data-testid="empty-bet-slip">
              <FileOutput className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium">No legs to export</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add picks to your bet slip from anywhere in the app, or manually add legs below.
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={() => setShowAddForm(true)} data-testid="button-start-adding-legs">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Legs Manually
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {source === "slip" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Ticket className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Using your active bet slip ({slipLegs.length} leg{slipLegs.length !== 1 ? "s" : ""})</p>
              <p className="text-xs text-muted-foreground">Picks added from across the platform</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileOutput className="h-5 w-5" />
            Your Parlay Legs
          </CardTitle>
          <CardDescription>{activeLegs.length} selection{activeLegs.length !== 1 ? "s" : ""} ready to place</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {!isUsingExternal && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} data-testid="button-add-leg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leg
                </Button>
              </div>
            )}

            {showAddForm && !isUsingExternal && (
              <Card data-testid="card-add-leg-form">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="leg-sport">Sport</Label>
                      <Select value={formSport} onValueChange={setFormSport}>
                        <SelectTrigger data-testid="select-leg-sport">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NBA">NBA</SelectItem>
                          <SelectItem value="NFL">NFL</SelectItem>
                          <SelectItem value="MLB">MLB</SelectItem>
                          <SelectItem value="NHL">NHL</SelectItem>
                          <SelectItem value="NCAAB">NCAAB</SelectItem>
                          <SelectItem value="NCAAF">NCAAF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="leg-type">Type</Label>
                      <Select value={formType} onValueChange={setFormType}>
                        <SelectTrigger data-testid="select-leg-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spread">Spread</SelectItem>
                          <SelectItem value="Moneyline">Moneyline</SelectItem>
                          <SelectItem value="Total">Total</SelectItem>
                          <SelectItem value="Player Prop">Player Prop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="leg-event">Event</Label>
                    <Input id="leg-event" placeholder="e.g. Nuggets vs Suns" value={formEvent} onChange={(e) => setFormEvent(e.target.value)} data-testid="input-leg-event" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="leg-pick">Pick</Label>
                      <Input id="leg-pick" placeholder="e.g. Over 218.5" value={formPick} onChange={(e) => setFormPick(e.target.value)} data-testid="input-leg-pick" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="leg-odds">Odds</Label>
                      <Input id="leg-odds" placeholder="e.g. -110" value={formOdds} onChange={(e) => setFormOdds(e.target.value)} data-testid="input-leg-odds" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddLeg} disabled={!formEvent || !formPick || !formOdds} className="flex-1" data-testid="button-confirm-add-leg">
                      Add Leg
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-add-leg">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {activeLegs.map((leg, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-bet-leg-${i}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid={`badge-sport-leg-${i}`}>{leg.sport}</Badge>
                    <span className="text-sm font-medium">{leg.event}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm">{leg.pick}</span>
                    <Badge variant="outline" data-testid={`badge-odds-leg-${i}`}>{leg.odds}</Badge>
                    {!isUsingExternal && (
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveLeg(i)} data-testid={`button-remove-leg-${i}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Place Your Parlay
          </CardTitle>
          <CardDescription>
            Choose your sportsbook, then follow the checklist to build your bet slip there
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORTSBOOKS.map((book) => (
              <Button
                key={book.id}
                variant="outline"
                className={`h-12 font-bold transition-all ${selectedBook === book.id ? "ring-2 ring-primary ring-offset-2" : ""} ${book.color} ${book.textColor} border-0`}
                onClick={() => handleOpenBook(book)}
                data-testid={`button-quick-place-${book.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {book.name}
              </Button>
            ))}
          </div>

          {selectedBook && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{SPORTSBOOKS.find(b => b.id === selectedBook)?.name} is open in a new tab</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Search for each game below and add the selections to your sportsbook's bet slip. Check them off as you go.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {activeLegs.map((leg, i) => {
                  const checked = checkedLegs.has(i);
                  return (
                    <button
                      key={i}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${checked ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:bg-muted/50"}`}
                      onClick={() => toggleLeg(i)}
                      data-testid={`checklist-leg-${i}`}
                    >
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checked ? "bg-green-500 border-green-500" : "border-muted-foreground/40"}`}>
                        {checked && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className={`flex-1 min-w-0 ${checked ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{leg.sport}</Badge>
                          <span className={`text-sm font-medium ${checked ? "line-through" : ""}`}>{leg.event}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            Find <span className="font-semibold">{leg.type}</span>: <span className="font-semibold text-primary">{leg.pick}</span>
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{leg.odds}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {allChecked && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700 dark:text-green-400">All legs added!</p>
                    <p className="text-muted-foreground text-xs">Set your stake amount and submit your parlay at {SPORTSBOOKS.find(b => b.id === selectedBook)?.name}.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Picks
          </CardTitle>
          <CardDescription>Share with friends or save for reference</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyText} data-testid="button-copy-slip">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              Copy as Text
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handleShare} data-testid="button-share-slip">
              <MessageCircle className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => toast({ title: "Take a screenshot of the card below to share" })} data-testid="button-screenshot-slip">
              <Camera className="h-4 w-4" />
              Screenshot
            </Button>
          </div>

          <div className="rounded-xl border-2 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 space-y-3" data-testid="visual-bet-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary tracking-wider">SORS MAXIMA</span>
              <Badge className="bg-primary/10 text-primary border-primary/20">{activeLegs.length} Leg Parlay</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              {activeLegs.map((leg, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{leg.event}</span>
                    <span className="text-muted-foreground block text-xs">{leg.type}: {leg.pick}</span>
                  </div>
                  <span className="font-mono font-bold text-sm ml-3 shrink-0">{leg.odds}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="text-center text-xs text-muted-foreground">
              Built with Sors Maxima Intelligence
            </div>
          </div>
        </CardContent>
      </Card>

      <AffiliateDisclosure />
    </div>
  );
}

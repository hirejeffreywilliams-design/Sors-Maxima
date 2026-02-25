import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileOutput, Copy, CheckCircle, ExternalLink, Plus, Trash2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParlaySlip } from "@/hooks/use-parlay-slip";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", deepLink: "https://sportsbook.draftkings.com", color: "bg-[#53d337]", textColor: "text-black" },
  { id: "fanduel", name: "FanDuel", deepLink: "https://sportsbook.fanduel.com", color: "bg-[#1493ff]", textColor: "text-white" },
  { id: "betmgm", name: "BetMGM", deepLink: "https://sports.betmgm.com", color: "bg-[#c4a24f]", textColor: "text-black" },
  { id: "caesars", name: "Caesars", deepLink: "https://sportsbook.caesars.com", color: "bg-[#0a3d2a]", textColor: "text-white" },
  { id: "pointsbet", name: "PointsBet", deepLink: "https://pointsbet.com", color: "bg-[#ed1c24]", textColor: "text-white" },
  { id: "betrivers", name: "BetRivers", deepLink: "https://betrivers.com", color: "bg-[#1a1a2e]", textColor: "text-white" },
];

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

function formatForSportsbook(bookId: string, legs: BetLeg[]): string {
  const header = SPORTSBOOKS.find((b) => b.id === bookId)?.name || bookId;
  const divider = "---";

  switch (bookId) {
    case "draftkings":
      return [
        `${header} Bet Slip`,
        divider,
        ...legs.map((l, i) => `${i + 1}. ${l.sport} | ${l.event}\n   ${l.type}: ${l.pick} (${l.odds})`),
        divider,
        `Legs: ${legs.length} | Type: Parlay`,
      ].join("\n");

    case "fanduel":
      return [
        `-- ${header} --`,
        ...legs.map((l, i) => `[${i + 1}] ${l.event} - ${l.pick} @ ${l.odds} (${l.sport})`),
        `\nParlay (${legs.length} legs)`,
      ].join("\n");

    case "betmgm":
      return [
        `${header} | Parlay Slip`,
        divider,
        ...legs.map((l) => `* ${l.event}: ${l.pick} ${l.odds}`),
        divider,
        `Total Legs: ${legs.length}`,
      ].join("\n");

    case "caesars":
      return [
        `${header} Sportsbook`,
        `Parlay - ${legs.length} Selections`,
        divider,
        ...legs.map((l) => `${l.sport}: ${l.event}\n  > ${l.type} - ${l.pick} (${l.odds})`),
      ].join("\n");

    case "pointsbet":
      return [
        `${header} Multi`,
        ...legs.map((l, i) => `Leg ${i + 1}: ${l.event} | ${l.pick} @ ${l.odds}`),
        `\n${legs.length}-Leg Multi`,
      ].join("\n");

    case "betrivers":
      return [
        `${header} Parlay`,
        divider,
        ...legs.map((l) => `${l.event} / ${l.pick} / ${l.odds}`),
        divider,
        `Selections: ${legs.length}`,
      ].join("\n");

    default:
      return legs.map((l) => `${l.event}: ${l.pick} (${l.odds})`).join("\n");
  }
}

function formatOdds(american: number | undefined, decimal: number): string {
  if (american !== undefined) {
    return american > 0 ? `+${american}` : `${american}`;
  }
  const am = decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return am > 0 ? `+${am}` : `${am}`;
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

  const [selectedBook, setSelectedBook] = useState("");
  const [generated, setGenerated] = useState(false);
  const [formattedSlip, setFormattedSlip] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualLegs, setManualLegs] = useState<BetLeg[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

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
    setGenerated(false);
  }

  function handleRemoveLeg(index: number) {
    setManualLegs((prev) => prev.filter((_, i) => i !== index));
    setGenerated(false);
  }

  const handleGenerate = () => {
    if (!selectedBook || activeLegs.length === 0) return;
    const slip = formatForSportsbook(selectedBook, activeLegs);
    setFormattedSlip(slip);
    setGenerated(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSlip);
    setCopied(true);
    toast({ title: "Bet slip copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedBookData = SPORTSBOOKS.find((b) => b.id === selectedBook);

  const handlePlaceAt = (book: typeof SPORTSBOOKS[0]) => {
    const slip = formatForSportsbook(book.id, activeLegs);
    navigator.clipboard.writeText(slip).then(() => {
      toast({
        title: `Slip copied for ${book.name}`,
        description: "Paste your selections into the sportsbook",
      });
    });
    window.open(book.deepLink, "_blank", "noopener,noreferrer");
  };

  if (activeLegs.length === 0 && !showAddForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5" />
              Export Bet Slip
            </CardTitle>
            <CardDescription>Generate a formatted bet slip for your sportsbook</CardDescription>
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
            Export Bet Slip
          </CardTitle>
          <CardDescription>Format and place your parlay at any sportsbook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Parlay Legs ({activeLegs.length})</Label>
              {!isUsingExternal && (
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} data-testid="button-add-leg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leg
                </Button>
              )}
            </div>

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

          <div className="space-y-2">
            <Label>Select Sportsbook to Format</Label>
            <Select
              value={selectedBook}
              onValueChange={(val) => {
                setSelectedBook(val);
                setGenerated(false);
              }}
            >
              <SelectTrigger data-testid="select-sportsbook">
                <SelectValue placeholder="Choose a sportsbook" />
              </SelectTrigger>
              <SelectContent>
                {SPORTSBOOKS.map((book) => (
                  <SelectItem key={book.id} value={book.id} data-testid={`option-sportsbook-${book.id}`}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!selectedBook || activeLegs.length === 0}
            onClick={handleGenerate}
            data-testid="button-generate-slip"
          >
            <FileOutput className="h-4 w-4 mr-2" />
            Generate Formatted Slip
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Generated Slip - {selectedBookData?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono" data-testid="text-formatted-slip">
                {formattedSlip}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopy}
                data-testid="button-copy-slip"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <Button
              className={`w-full ${selectedBookData ? `${selectedBookData.color} ${selectedBookData.textColor}` : ""} border-0`}
              onClick={() => selectedBookData && handlePlaceAt(selectedBookData)}
              data-testid="button-open-sportsbook"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy & Open {selectedBookData?.name}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Quick Place
          </CardTitle>
          <CardDescription>Copy your slip and open a sportsbook in one tap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPORTSBOOKS.map((book) => (
              <Button
                key={book.id}
                variant="outline"
                className={`h-12 font-bold ${book.color} ${book.textColor} border-0`}
                onClick={() => handlePlaceAt(book)}
                data-testid={`button-quick-place-${book.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {book.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AffiliateDisclosure />
    </div>
  );
}

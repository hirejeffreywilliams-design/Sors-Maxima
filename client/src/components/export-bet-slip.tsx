import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileOutput, Copy, CheckCircle, ExternalLink, Smartphone, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", deepLink: "https://sportsbook.draftkings.com" },
  { id: "fanduel", name: "FanDuel", deepLink: "https://sportsbook.fanduel.com" },
  { id: "betmgm", name: "BetMGM", deepLink: "https://sports.betmgm.com" },
  { id: "caesars", name: "Caesars", deepLink: "https://sportsbook.caesars.com" },
  { id: "pointsbet", name: "PointsBet", deepLink: "https://pointsbet.com" },
  { id: "betrivers", name: "BetRivers", deepLink: "https://betrivers.com" },
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

export function ExportBetSlip({ legs: externalLegs }: ExportBetSlipProps = {}) {
  const { toast } = useToast();
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

  const activeLegs = externalLegs && externalLegs.length > 0 ? externalLegs : manualLegs;
  const isUsingExternal = externalLegs && externalLegs.length > 0;

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
                Build a parlay first, then export it here.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Or manually add legs below.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddForm(true)} data-testid="button-start-adding-legs">
                <Plus className="w-4 h-4 mr-2" />
                Add Legs Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="space-y-2">
            <Label>Select Sportsbook</Label>
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

          <Button
            className="w-full"
            disabled={!selectedBook || activeLegs.length === 0}
            onClick={handleGenerate}
            data-testid="button-generate-slip"
          >
            <FileOutput className="h-4 w-4 mr-2" />
            Generate Bet Slip
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  <Smartphone className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Scan to open in app</p>
                  <p className="text-xs text-muted-foreground">QR code for mobile sportsbook</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <ExternalLink className="h-4 w-4" />
                    Deep Link
                  </p>
                  <p className="text-xs text-muted-foreground break-all font-mono" data-testid="text-deep-link">
                    {selectedBookData?.deepLink}/betslip?parlay=true&legs={activeLegs.length}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${selectedBookData?.deepLink}/betslip?parlay=true&legs=${activeLegs.length}`
                      );
                      toast({ title: "Deep link copied" });
                    }}
                    data-testid="button-copy-deep-link"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Link
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

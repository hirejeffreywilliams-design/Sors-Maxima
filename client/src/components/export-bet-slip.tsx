import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileOutput, Copy, CheckCircle, ExternalLink, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SPORTSBOOKS = [
  { id: "draftkings", name: "DraftKings", deepLink: "https://sportsbook.draftkings.com" },
  { id: "fanduel", name: "FanDuel", deepLink: "https://sportsbook.fanduel.com" },
  { id: "betmgm", name: "BetMGM", deepLink: "https://sports.betmgm.com" },
  { id: "caesars", name: "Caesars", deepLink: "https://sportsbook.caesars.com" },
  { id: "pointsbet", name: "PointsBet", deepLink: "https://pointsbet.com" },
  { id: "betrivers", name: "BetRivers", deepLink: "https://betrivers.com" },
];

const SAMPLE_LEGS = [
  { sport: "NBA", event: "Lakers vs Celtics", pick: "Over 218.5", odds: "-110", type: "Total" },
  { sport: "NFL", event: "Chiefs vs Bills", pick: "Chiefs -3.5", odds: "-105", type: "Spread" },
  { sport: "NBA", event: "Warriors vs Suns", pick: "Stephen Curry O28.5 Pts", odds: "+115", type: "Player Prop" },
];

function formatForSportsbook(bookId: string, legs: typeof SAMPLE_LEGS): string {
  const header = SPORTSBOOKS.find(b => b.id === bookId)?.name || bookId;
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
      return legs.map(l => `${l.event}: ${l.pick} (${l.odds})`).join("\n");
  }
}

export function ExportBetSlip() {
  const { toast } = useToast();
  const [selectedBook, setSelectedBook] = useState("");
  const [generated, setGenerated] = useState(false);
  const [formattedSlip, setFormattedSlip] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!selectedBook) return;
    const slip = formatForSportsbook(selectedBook, SAMPLE_LEGS);
    setFormattedSlip(slip);
    setGenerated(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSlip);
    setCopied(true);
    toast({ title: "Bet slip copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedBookData = SPORTSBOOKS.find(b => b.id === selectedBook);

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
            <label className="text-sm font-medium">Select Sportsbook</label>
            <Select value={selectedBook} onValueChange={(val) => { setSelectedBook(val); setGenerated(false); }}>
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
            <label className="text-sm font-medium">Current Parlay Legs</label>
            <div className="space-y-2">
              {SAMPLE_LEGS.map((leg, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`row-bet-leg-${i}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid={`badge-sport-leg-${i}`}>{leg.sport}</Badge>
                    <span className="text-sm font-medium">{leg.event}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm">{leg.pick}</span>
                    <Badge variant="outline" data-testid={`badge-odds-leg-${i}`}>{leg.odds}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!selectedBook}
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
                    {selectedBookData?.deepLink}/betslip?parlay=true&legs={SAMPLE_LEGS.length}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${selectedBookData?.deepLink}/betslip?parlay=true&legs=${SAMPLE_LEGS.length}`
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

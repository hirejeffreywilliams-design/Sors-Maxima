import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUpDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Minus,
  Plus,
  ArrowDown,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParlaySlip, type ParlaySlipLeg } from "@/hooks/use-parlay-slip";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

const sportOptions = [
  { value: "NBA", label: "Basketball" },
  { value: "NFL", label: "Football" },
  { value: "NCAAB", label: "College Hoops" },
  { value: "NCAAF", label: "College Football" },
  { value: "MLB", label: "Baseball" },
  { value: "NHL", label: "Hockey" },
];

function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function TeaserCard({ teaser }: { teaser: any }) {
  const [expanded, setExpanded] = useState(false);
  const { addLeg, isInSlip } = useParlaySlip();
  const { toast } = useToast();

  const handleAddAllLegs = () => {
    let added = 0;
    teaser.legs.forEach((leg: any, i: number) => {
      const legId = `teaser-${teaser.id}-${i}`;
      if (!isInSlip(legId)) {
        const odds = teaser.combinedOdds;
        const slipLeg: ParlaySlipLeg = {
          id: legId,
          team: leg.team || "Total",
          opponent: "",
          market: teaser.type as any,
          outcome: leg.pick,
          decimalOdds: odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1,
          americanOdds: odds,
          addedFrom: "Teaser Generator",
          addedAt: new Date().toISOString(),
          sport: teaser.sport,
        };
        if (addLeg(slipLeg)) added++;
      }
    });
    if (added > 0) {
      toast({ title: "Added", description: `${added} teaser leg${added > 1 ? "s" : ""} added to slip` });
    }
  };

  return (
    <Card className={`overflow-hidden ${teaser.winProbability >= 65 ? "ring-2 ring-green-500/30" : ""}`} data-testid={`teaser-card-${teaser.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">{teaser.type} Teaser</Badge>
              <Badge className="bg-primary text-primary-foreground text-xs">
                <ArrowDown className="w-3 h-3 mr-1" />
                {teaser.teaserPoints} pts
              </Badge>
              <Badge variant="outline" className={`text-xs font-bold ${
                teaser.grade.startsWith("A") ? "border-green-500 text-green-500" :
                teaser.grade.startsWith("B") ? "border-blue-500 text-blue-500" :
                "border-yellow-500 text-yellow-500"
              }`}>{teaser.grade}</Badge>
            </div>
            <p className="font-semibold text-sm">{teaser.legs.length}-Leg {teaser.type === "spread" ? "Spread" : "Total"} Teaser</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatOdds(teaser.combinedOdds)}</p>
            <p className="text-xs text-muted-foreground">Win: {teaser.winProbability}%</p>
          </div>
        </div>

        <div className="space-y-2">
          {teaser.legs.map((leg: any, i: number) => (
            <div key={i} className="bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{leg.pick}</span>
                <span className="text-xs text-muted-foreground">{leg.game}</span>
              </div>
              {teaser.type === "spread" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Original: {leg.originalSpread > 0 ? "+" : ""}{leg.originalSpread}</span>
                  <ArrowDown className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 font-medium">Teased: {leg.teasedSpread > 0 ? "+" : ""}{leg.teasedSpread}</span>
                </div>
              )}
              {teaser.type === "total" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Original: {leg.originalTotal}</span>
                  <ArrowDown className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 font-medium">Teased: {leg.teasedTotal}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {expanded && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">{teaser.rationale}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs" data-testid={`expand-teaser-${teaser.id}`}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? "Less" : "Details"}
          </Button>
          <Button size="sm" onClick={handleAddAllLegs} className="text-xs" data-testid={`add-teaser-${teaser.id}`}>
            <DollarSign className="w-3 h-3 mr-1" />
            Add to Slip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeaserGenerator() {
  useSEO({ title: "Teaser Generator", description: "Generate optimized teaser bet combinations" });
  const [sport, setSport] = useState("NBA");
  const [legs, setLegs] = useState("2");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/predictions/teasers", sport, legs],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/teasers?sport=${sport}&legs=${legs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 120000,
  });

  const teasers = (data?.teasers || []).filter((t: any) =>
    typeFilter === "all" || t.type === typeFilter
  );

  return (
    <div className="space-y-6" data-testid="teaser-generator-page">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Teaser Generator</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Move the line in your favor. Teasers adjust spreads and totals by fixed points for better win probability.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger data-testid="teaser-sport-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Select value={legs} onValueChange={setLegs}>
                <SelectTrigger data-testid="teaser-legs-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Legs</SelectItem>
                  <SelectItem value="3">3 Legs</SelectItem>
                  <SelectItem value="4">4 Legs</SelectItem>
                  <SelectItem value="5">5 Legs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="teaser-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="spread">Spread Teasers</SelectItem>
                  <SelectItem value="total">Total Teasers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.meta && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.meta.gamesAvailable}</p>
              <p className="text-xs text-muted-foreground">Games Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{teasers.length}</p>
              <p className="text-xs text-muted-foreground">Teasers Generated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">
                {data.meta.teaserPointOptions?.join(" / ")}
              </p>
              <p className="text-xs text-muted-foreground">Point Options</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Building teasers...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            Failed to generate teasers. Please try again.
          </CardContent>
        </Card>
      )}

      {teasers.length > 0 && (
        <div className="space-y-3">
          {teasers.map((teaser: any) => (
            <TeaserCard key={teaser.id} teaser={teaser} />
          ))}
        </div>
      )}

      {teasers.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Not enough games available for {legs}-leg teasers in {sport}. Try fewer legs or a different sport.
          </CardContent>
        </Card>
      )}

      {data?.disclaimer && (
        <p className="text-xs text-muted-foreground text-center">{data.disclaimer}</p>
      )}
    </div>
  );
}
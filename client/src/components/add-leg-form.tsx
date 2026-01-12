import { useState } from "react";
import { Plus, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import type { ParlayLeg, MarketType } from "@shared/schema";
import { americanToDecimal, impliedProbability } from "@shared/schema";

interface AddLegFormProps {
  onAdd: (leg: Omit<ParlayLeg, "id">) => void;
}

export function AddLegForm({ onAdd }: AddLegFormProps) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState("");
  const [opponent, setOpponent] = useState("");
  const [market, setMarket] = useState<MarketType>("moneyline");
  const [outcome, setOutcome] = useState("");
  const [oddsInput, setOddsInput] = useState("");
  const [oddsFormat, setOddsFormat] = useState<"american" | "decimal">("american");
  const [useOverride, setUseOverride] = useState(false);
  const [probOverride, setProbOverride] = useState(50);

  const getDecimalOdds = (): number => {
    const value = parseFloat(oddsInput);
    if (isNaN(value)) return 0;
    
    if (oddsFormat === "decimal") {
      return value;
    }
    return americanToDecimal(value);
  };

  const decimalOdds = getDecimalOdds();
  const implied = decimalOdds > 1 ? impliedProbability(decimalOdds) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!team || !outcome || decimalOdds <= 1) return;

    onAdd({
      team,
      opponent: opponent || undefined,
      market,
      outcome,
      decimalOdds,
      americanOdds: oddsFormat === "american" ? parseFloat(oddsInput) : undefined,
      probOverride: useOverride ? probOverride / 100 : undefined,
    });

    setTeam("");
    setOpponent("");
    setMarket("moneyline");
    setOutcome("");
    setOddsInput("");
    setUseOverride(false);
    setProbOverride(50);
    setOpen(false);
  };

  const isValid = team && outcome && decimalOdds > 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg" data-testid="button-add-leg">
          <Plus className="w-4 h-4 mr-2" />
          Add Leg to Parlay
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Leg</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team">Team / Player</Label>
              <Input
                id="team"
                placeholder="e.g., Lakers"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                data-testid="input-team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent (optional)</Label>
              <Input
                id="opponent"
                placeholder="e.g., Celtics"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                data-testid="input-opponent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="market">Market Type</Label>
              <Select value={market} onValueChange={(v) => setMarket(v as MarketType)}>
                <SelectTrigger data-testid="select-market">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moneyline">Moneyline</SelectItem>
                  <SelectItem value="spread">Spread</SelectItem>
                  <SelectItem value="total">Total (O/U)</SelectItem>
                  <SelectItem value="player_prop">Player Prop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Input
                id="outcome"
                placeholder="e.g., Win, Over 220.5"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                data-testid="input-outcome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="odds">Odds</Label>
              <Select value={oddsFormat} onValueChange={(v) => setOddsFormat(v as "american" | "decimal")}>
                <SelectTrigger className="w-32 h-8" data-testid="select-odds-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="american">American</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              id="odds"
              placeholder={oddsFormat === "american" ? "e.g., -110, +150" : "e.g., 1.91, 2.50"}
              value={oddsInput}
              onChange={(e) => setOddsInput(e.target.value)}
              data-testid="input-odds"
            />
            {decimalOdds > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calculator className="w-3 h-3" />
                <span>
                  Decimal: {decimalOdds.toFixed(2)} | Implied: {(implied * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Override Probability</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set your own win probability estimate
                </p>
              </div>
              <Button
                type="button"
                variant={useOverride ? "default" : "outline"}
                size="sm"
                onClick={() => setUseOverride(!useOverride)}
                data-testid="button-toggle-override"
              >
                {useOverride ? "On" : "Off"}
              </Button>
            </div>
            
            {useOverride && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Your estimate:</span>
                  <span className="text-lg font-mono font-bold">
                    {probOverride}%
                  </span>
                </div>
                <Slider
                  value={[probOverride]}
                  onValueChange={([v]) => setProbOverride(v)}
                  min={1}
                  max={99}
                  step={1}
                  data-testid="slider-prob-override"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Less likely</span>
                  <span>More likely</span>
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!isValid}
            data-testid="button-submit-leg"
          >
            Add to Parlay
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

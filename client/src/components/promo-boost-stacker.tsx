import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Gift, Percent, DollarSign, Star, Clock, CheckCircle, TrendingUp, Sparkles, Plus, Trash2 } from "lucide-react";
import type { ParlayLeg } from "@shared/schema";

interface PromoBoost {
  id: string;
  sportsbook: string;
  name: string;
  type: "odds_boost" | "profit_boost" | "parlay_boost" | "insurance" | "free_bet";
  boostPercentage: number;
  maxStake: number;
  minLegs?: number;
  expiresAt: string;
}

interface StackResult {
  promos: PromoBoost[];
  totalBoost: number;
  effectiveOdds: number;
  recommendation: string;
}

interface PromoBoostStackerProps {
  legs: ParlayLeg[];
  currentOdds: number;
}

const PROMO_TYPES: { value: PromoBoost["type"]; label: string }[] = [
  { value: "profit_boost", label: "Profit Boost" },
  { value: "odds_boost", label: "Odds Boost" },
  { value: "parlay_boost", label: "Parlay Boost" },
  { value: "insurance", label: "Insurance" },
  { value: "free_bet", label: "Free Bet" },
];

function calculateOptimalStack(promos: PromoBoost[], legs: ParlayLeg[], currentOdds: number): StackResult {
  const eligiblePromos = promos.filter(p => {
    if (p.minLegs && legs.length < p.minLegs) return false;
    if (new Date(p.expiresAt) < new Date()) return false;
    return true;
  });

  const bestPromos = [...eligiblePromos]
    .sort((a, b) => b.boostPercentage - a.boostPercentage)
    .slice(0, 3);

  const totalBoost = bestPromos.reduce((sum, p) => sum + p.boostPercentage, 0);
  const effectiveOdds = currentOdds * (1 + totalBoost / 100);

  let recommendation = "No eligible promos available";
  if (bestPromos.length > 0) {
    if (totalBoost > 50) {
      recommendation = `Stack ${bestPromos.length} promos for +${totalBoost}% total boost`;
    } else if (totalBoost > 20) {
      recommendation = `Good promo opportunity: +${totalBoost}% boost`;
    } else {
      recommendation = `Minor boost available: +${totalBoost}%`;
    }
  }

  return { promos: bestPromos, totalBoost, effectiveOdds, recommendation };
}

export function PromoBoostStacker({ legs, currentOdds }: PromoBoostStackerProps) {
  const [promos, setPromos] = useState<PromoBoost[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<Set<string>>(new Set());

  const [newBook, setNewBook] = useState("");
  const [newBoostPct, setNewBoostPct] = useState("");
  const [newMaxStake, setNewMaxStake] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newType, setNewType] = useState<PromoBoost["type"]>("profit_boost");
  const [newMinLegs, setNewMinLegs] = useState("");

  const optimalStack = useMemo(() =>
    calculateOptimalStack(promos, legs, currentOdds),
    [promos, legs, currentOdds]
  );

  const addPromo = () => {
    const boost = parseFloat(newBoostPct);
    const maxStake = parseFloat(newMaxStake);
    if (!newBook.trim() || isNaN(boost) || boost <= 0 || isNaN(maxStake) || maxStake <= 0) return;

    const minLegs = parseInt(newMinLegs);

    setPromos(prev => [
      ...prev,
      {
        id: `promo-${Date.now()}`,
        sportsbook: newBook.trim(),
        name: `${boost}% ${PROMO_TYPES.find(t => t.value === newType)?.label || "Boost"}`,
        type: newType,
        boostPercentage: boost,
        maxStake,
        minLegs: isNaN(minLegs) ? undefined : minLegs,
        expiresAt: newExpiry || new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    ]);
    setNewBook("");
    setNewBoostPct("");
    setNewMaxStake("");
    setNewExpiry("");
    setNewMinLegs("");
  };

  const removePromo = (id: string) => {
    setPromos(prev => prev.filter(p => p.id !== id));
    setSelectedPromos(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const togglePromo = (promoId: string) => {
    setSelectedPromos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promoId)) {
        newSet.delete(promoId);
      } else {
        newSet.add(promoId);
      }
      return newSet;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "profit_boost": return "bg-green-500 text-white";
      case "parlay_boost": return "bg-purple-500 text-white";
      case "odds_boost": return "bg-blue-500 text-white";
      case "insurance": return "bg-amber-500 text-black";
      case "free_bet": return "bg-pink-500 text-white";
      default: return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Promo & Boost Stacker
          </CardTitle>
          <Badge variant="outline" data-testid="badge-promo-count">
            {promos.length} promo{promos.length !== 1 ? "s" : ""} added
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
          <h4 className="font-medium text-sm">Add Your Promos</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="promo-book" className="text-xs text-muted-foreground">Sportsbook</Label>
              <Input
                id="promo-book"
                data-testid="input-promo-book"
                value={newBook}
                onChange={(e) => setNewBook(e.target.value)}
                placeholder="e.g. FanDuel"
              />
            </div>
            <div>
              <Label htmlFor="promo-type" className="text-xs text-muted-foreground">Promo Type</Label>
              <select
                id="promo-type"
                data-testid="select-promo-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as PromoBoost["type"])}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PROMO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="promo-boost" className="text-xs text-muted-foreground">Boost %</Label>
              <Input
                id="promo-boost"
                data-testid="input-promo-boost"
                type="number"
                value={newBoostPct}
                onChange={(e) => setNewBoostPct(e.target.value)}
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <Label htmlFor="promo-max-stake" className="text-xs text-muted-foreground">Max Stake ($)</Label>
              <Input
                id="promo-max-stake"
                data-testid="input-promo-max-stake"
                type="number"
                value={newMaxStake}
                onChange={(e) => setNewMaxStake(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <Label htmlFor="promo-expiry" className="text-xs text-muted-foreground">Expiry Date</Label>
              <Input
                id="promo-expiry"
                data-testid="input-promo-expiry"
                type="date"
                value={newExpiry ? newExpiry.split("T")[0] : ""}
                onChange={(e) => setNewExpiry(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
            <div>
              <Label htmlFor="promo-min-legs" className="text-xs text-muted-foreground">Min Legs (optional)</Label>
              <Input
                id="promo-min-legs"
                data-testid="input-promo-min-legs"
                type="number"
                value={newMinLegs}
                onChange={(e) => setNewMinLegs(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={addPromo}
            disabled={!newBook.trim() || !newBoostPct || !newMaxStake}
            data-testid="button-add-promo"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Promo
          </Button>
        </div>

        {optimalStack.promos.length > 0 && (
          <div className="p-4 rounded-lg border bg-gradient-to-r from-green-500/10 to-purple-500/10" data-testid="optimal-stack-result">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-green-500">Optimal Stack Found</p>
                <p className="text-sm text-muted-foreground">{optimalStack.recommendation}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2 rounded bg-card text-center">
                <Percent className="h-3 w-3 mx-auto mb-1 text-purple-500" />
                <p className="text-lg font-bold text-purple-500" data-testid="stat-total-boost">+{optimalStack.totalBoost}%</p>
                <p className="text-xs text-muted-foreground">Total Boost</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <DollarSign className="h-3 w-3 mx-auto mb-1 text-amber-500" />
                <p className="text-lg font-bold" data-testid="stat-effective-odds">{optimalStack.effectiveOdds.toFixed(2)}x</p>
                <p className="text-xs text-muted-foreground">Effective Odds</p>
              </div>
              <div className="p-2 rounded bg-card text-center">
                <Star className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold" data-testid="stat-promos-stacked">{optimalStack.promos.length}</p>
                <p className="text-xs text-muted-foreground">Promos Stacked</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {optimalStack.promos.map(promo => (
                <Badge key={promo.id} variant="outline">
                  {promo.sportsbook}: {promo.name}
                </Badge>
              ))}
            </div>

            <Button className="w-full mt-3" data-testid="button-apply-optimal-stack">
              <Plus className="h-4 w-4 mr-2" />
              Apply Optimal Stack
            </Button>
          </div>
        )}

        {promos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-promos">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No promos added yet</p>
            <p className="text-xs">Add your available promos above to find optimal stacking</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Your Promos ({promos.length})</h4>
            {promos.map(promo => {
              const isExpired = new Date(promo.expiresAt) < new Date();
              const isEligible = !promo.minLegs || legs.length >= promo.minLegs;
              return (
                <div
                  key={promo.id}
                  data-testid={`card-promo-${promo.id}`}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPromos.has(promo.id) ? "ring-2 ring-primary bg-primary/5" : "bg-card hover-elevate"
                  }`}
                  onClick={() => togglePromo(promo.id)}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(promo.type)}>
                        +{promo.boostPercentage}%
                      </Badge>
                      <span className="font-medium text-sm">{promo.sportsbook}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <Badge variant="outline" className="text-red-500">Expired</Badge>
                      ) : !isEligible ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Need {promo.minLegs}+ legs
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-500">Eligible</Badge>
                      )}
                      {selectedPromos.has(promo.id) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); removePromo(promo.id); }}
                        data-testid={`button-remove-promo-${promo.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm font-medium mb-1">{promo.name}</p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Max stake: ${promo.maxStake}</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expires {new Date(promo.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPromos.size > 0 && (
          <div className="p-3 rounded-lg border bg-muted/50" data-testid="selected-promos-summary">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="text-sm font-medium">Selected Promos ({selectedPromos.size})</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedPromos(new Set())} data-testid="button-clear-promos">
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedPromos).map(id => {
                const promo = promos.find(p => p.id === id);
                return promo ? (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {promo.sportsbook}: +{promo.boostPercentage}%
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

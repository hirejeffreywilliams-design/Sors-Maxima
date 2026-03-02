import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { ParlayLeg } from "@shared/schema";

export interface ParlaySlipLeg extends ParlayLeg {
  addedFrom: string;
  addedAt: string;
  sport?: string;
  confidence?: number;
  evPercent?: number;
  grade?: string;
  edge?: number;
  reasoning?: string;
  recommendation?: string;
  winProbability?: number;
  timing?: "bet_now" | "wait" | "line_locked";
  timingAdvice?: string;
  insights?: string[];
  gameTime?: string;
  monteCarloData?: {
    simulations: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
    homeWinProb: number;
    awayWinProb: number;
    convergenceScore: number;
  };
  factors?: { name: string; impact: number; direction: string }[];
}

interface ParlaySlipContextValue {
  legs: ParlaySlipLeg[];
  addLeg: (leg: ParlaySlipLeg) => boolean;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  isInSlip: (legId: string) => boolean;
  totalOdds: number;
  totalAmericanOdds: number;
  toWin: number;
  legCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const ParlaySlipContext = createContext<ParlaySlipContextValue | null>(null);

const STORAGE_KEY = "sors_parlay_slip";

function loadFromStorage(): ParlaySlipLeg[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveToStorage(legs: ParlaySlipLeg[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legs));
  } catch {}
}

function safeDecimalOdds(leg: ParlaySlipLeg): number {
  if (leg.decimalOdds && leg.decimalOdds > 1) return leg.decimalOdds;
  if (leg.americanOdds !== undefined && leg.americanOdds !== 0) {
    const am = leg.americanOdds;
    return am > 0 ? am / 100 + 1 : 100 / Math.abs(am) + 1;
  }
  return 1.909;
}

export function ParlaySlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<ParlaySlipLeg[]>(loadFromStorage);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    saveToStorage(legs);
  }, [legs]);

  const addLeg = useCallback((leg: ParlaySlipLeg): boolean => {
    let added = false;
    setLegs(prev => {
      if (prev.some(l => l.id === leg.id)) return prev;
      added = true;
      return [...prev, leg];
    });
    return added;
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setLegs(prev => prev.filter(l => l.id !== legId));
  }, []);

  const clearSlip = useCallback(() => {
    setLegs([]);
  }, []);

  const isInSlip = useCallback((legId: string) => {
    return legs.some(l => l.id === legId);
  }, [legs]);

  const totalOdds = legs.reduce((acc, leg) => acc * safeDecimalOdds(leg), 1);

  const totalAmericanOdds = totalOdds >= 2
    ? Math.round((totalOdds - 1) * 100)
    : totalOdds > 1
    ? Math.round(-100 / (totalOdds - 1))
    : 0;

  const toWin = totalOdds - 1;

  return (
    <ParlaySlipContext.Provider value={{
      legs,
      addLeg,
      removeLeg,
      clearSlip,
      isInSlip,
      totalOdds,
      totalAmericanOdds,
      toWin,
      legCount: legs.length,
      mobileOpen,
      setMobileOpen,
    }}>
      {children}
    </ParlaySlipContext.Provider>
  );
}

export function useParlaySlip() {
  const context = useContext(ParlaySlipContext);
  if (!context) {
    throw new Error("useParlaySlip must be used within ParlaySlipProvider");
  }
  return context;
}

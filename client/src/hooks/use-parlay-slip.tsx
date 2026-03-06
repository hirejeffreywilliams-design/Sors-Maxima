import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
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

export interface SlipData {
  id: string;
  name: string;
  legs: ParlaySlipLeg[];
  createdAt: string;
}

interface MultiSlipStorage {
  activeSlipId: string;
  slips: SlipData[];
}

interface ParlaySlipContextValue {
  legs: ParlaySlipLeg[];
  addLeg: (leg: ParlaySlipLeg) => boolean;
  removeLeg: (legId: string) => void;
  clearSlip: () => void;
  setSlipLegs: (legs: ParlaySlipLeg[]) => void;
  isInSlip: (legId: string) => boolean;
  totalOdds: number;
  totalAmericanOdds: number;
  toWin: number;
  legCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  slips: SlipData[];
  activeSlipId: string;
  createSlip: () => string;
  deleteSlip: (id: string) => void;
  switchSlip: (id: string) => void;
  renameSlip: (id: string, name: string) => void;
  canUseMultiSlip: boolean;
}

const ParlaySlipContext = createContext<ParlaySlipContextValue | null>(null);

const LEGACY_KEY = "sors_parlay_slip";
const MULTI_KEY = "sors_multi_slips";

function getMultiKey(username?: string): string {
  return username ? `${MULTI_KEY}_${username}` : MULTI_KEY;
}

function makeSingleSlip(legs: ParlaySlipLeg[] = []): SlipData {
  return { id: "slip-1", name: "Main Slip", legs, createdAt: new Date().toISOString() };
}

function loadMultiSlip(username?: string): MultiSlipStorage {
  try {
    const raw = localStorage.getItem(getMultiKey(username));
    if (raw) {
      const parsed = JSON.parse(raw) as MultiSlipStorage;
      if (parsed.slips && Array.isArray(parsed.slips) && parsed.slips.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Migrate legacy single-slip
  try {
    const legacyKey = username ? `${LEGACY_KEY}_${username}` : LEGACY_KEY;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      const legs = JSON.parse(legacyRaw) as ParlaySlipLeg[];
      if (Array.isArray(legs) && legs.length > 0) {
        const initial = makeSingleSlip(legs);
        return { activeSlipId: "slip-1", slips: [initial] };
      }
    }
  } catch {}

  return { activeSlipId: "slip-1", slips: [makeSingleSlip()] };
}

function saveMultiSlip(state: MultiSlipStorage, username?: string) {
  try {
    localStorage.setItem(getMultiKey(username), JSON.stringify(state));
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

function nextSlipId(): string {
  return `slip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ParlaySlipProvider({
  children,
  username,
  canUseMultiSlip = false,
}: {
  children: ReactNode;
  username?: string;
  canUseMultiSlip?: boolean;
}) {
  const [state, setState] = useState<MultiSlipStorage>(() => loadMultiSlip(username));
  const [mobileOpen, setMobileOpen] = useState(false);
  const prevUsername = useRef(username);

  useEffect(() => {
    if (prevUsername.current !== username) {
      prevUsername.current = username;
      setState(loadMultiSlip(username));
    }
  }, [username]);

  useEffect(() => {
    saveMultiSlip(state, username);
  }, [state, username]);

  const activeSlip = state.slips.find(s => s.id === state.activeSlipId) ?? state.slips[0];
  const legs = activeSlip?.legs ?? [];

  const updateActiveLegs = useCallback((updater: (legs: ParlaySlipLeg[]) => ParlaySlipLeg[]) => {
    setState(prev => {
      const slips = prev.slips.map(s =>
        s.id === prev.activeSlipId ? { ...s, legs: updater(s.legs) } : s
      );
      return { ...prev, slips };
    });
  }, []);

  const addLeg = useCallback((leg: ParlaySlipLeg): boolean => {
    let added = false;
    updateActiveLegs(prev => {
      if (prev.some(l => l.id === leg.id)) return prev;
      added = true;
      return [...prev, leg];
    });
    return added;
  }, [updateActiveLegs]);

  const removeLeg = useCallback((legId: string) => {
    updateActiveLegs(prev => prev.filter(l => l.id !== legId));
  }, [updateActiveLegs]);

  const clearSlip = useCallback(() => {
    updateActiveLegs(() => []);
  }, [updateActiveLegs]);

  const setSlipLegs = useCallback((newLegs: ParlaySlipLeg[]) => {
    updateActiveLegs(() => newLegs);
  }, [updateActiveLegs]);

  const isInSlip = useCallback((legId: string) => {
    return legs.some(l => l.id === legId);
  }, [legs]);

  const createSlip = useCallback((): string => {
    const id = nextSlipId();
    const newSlip: SlipData = { id, name: `Slip ${state.slips.length + 1}`, legs: [], createdAt: new Date().toISOString() };
    setState(prev => ({
      activeSlipId: id,
      slips: [...prev.slips, newSlip].slice(0, 5),
    }));
    return id;
  }, [state.slips.length]);

  const deleteSlip = useCallback((id: string) => {
    setState(prev => {
      if (prev.slips.length <= 1) return prev;
      const slips = prev.slips.filter(s => s.id !== id);
      const activeSlipId = prev.activeSlipId === id ? slips[0].id : prev.activeSlipId;
      return { activeSlipId, slips };
    });
  }, []);

  const switchSlip = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeSlipId: id }));
  }, []);

  const renameSlip = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      slips: prev.slips.map(s => s.id === id ? { ...s, name } : s),
    }));
  }, []);

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
      setSlipLegs,
      isInSlip,
      totalOdds,
      totalAmericanOdds,
      toWin,
      legCount: legs.length,
      mobileOpen,
      setMobileOpen,
      slips: state.slips,
      activeSlipId: state.activeSlipId,
      createSlip,
      deleteSlip,
      switchSlip,
      renameSlip,
      canUseMultiSlip,
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

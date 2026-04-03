import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export const SUPPORTED_SPORTS = [
  { id: "NFL",   label: "NFL",   emoji: "🏈" },
  { id: "NBA",   label: "NBA",   emoji: "🏀" },
  { id: "MLB",   label: "MLB",   emoji: "⚾" },
  { id: "NHL",   label: "NHL",   emoji: "🏒" },
  { id: "NCAAB", label: "NCAAB", emoji: "🏀" },
  { id: "NCAAF", label: "NCAAF", emoji: "🏈" },
  { id: "Soccer",label: "Soccer",emoji: "⚽" },
  { id: "MMA",   label: "MMA",   emoji: "🥊" },
] as const;

export type SportId = typeof SUPPORTED_SPORTS[number]["id"];

interface SportFocusContextValue {
  focusedSport: SportId | null;
  setFocusedSport: (sport: SportId | null) => void;
  clearFocus: () => void;
  isLoading: boolean;
}

const SportFocusContext = createContext<SportFocusContextValue | null>(null);

const STORAGE_KEY = "sors-sport-focus";

function isValidSport(value: unknown): value is SportId {
  return typeof value === "string" && SUPPORTED_SPORTS.some(s => s.id === value);
}

export function SportFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedSport, setFocusedSportState] = useState<SportId | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isValidSport(stored)) return stored;
    } catch { /* ignore */ }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/sport-focus", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { sportFocus: string | null } | null) => {
        if (!data) return;
        const serverSport = data.sportFocus;
        if (isValidSport(serverSport)) {
          setFocusedSportState(serverSport);
          try { localStorage.setItem(STORAGE_KEY, serverSport); } catch { /* ignore */ }
        } else if (serverSport === null) {
          setFocusedSportState(null);
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  const setFocusedSport = useCallback((sport: SportId | null) => {
    setFocusedSportState(sport);
    try {
      if (sport) {
        localStorage.setItem(STORAGE_KEY, sport);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }

    setIsLoading(true);
    apiRequest("PATCH", "/api/user/sport-focus", { sportFocus: sport })
      .catch(() => { /* non-blocking — local state is source of truth */ })
      .finally(() => setIsLoading(false));
  }, []);

  const clearFocus = useCallback(() => setFocusedSport(null), [setFocusedSport]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue;
        if (isValidSport(val)) {
          setFocusedSportState(val);
        } else {
          setFocusedSportState(null);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <SportFocusContext.Provider value={{ focusedSport, setFocusedSport, clearFocus, isLoading }}>
      {children}
    </SportFocusContext.Provider>
  );
}

export function useSportFocus(): SportFocusContextValue {
  const ctx = useContext(SportFocusContext);
  if (!ctx) {
    return {
      focusedSport: null,
      setFocusedSport: () => {},
      clearFocus: () => {},
      isLoading: false,
    };
  }
  return ctx;
}

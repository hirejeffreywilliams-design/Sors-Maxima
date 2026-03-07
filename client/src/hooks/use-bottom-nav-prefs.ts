import { useState, useCallback } from "react";

export interface NavItemDef {
  id: string;
  href: string;
  label: string;
  iconName: string;
}

export const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: "picks",     href: "/",               label: "Picks",     iconName: "Zap" },
  { id: "daily",     href: "/daily",           label: "Daily",     iconName: "Calendar" },
  { id: "tickets",   href: "/generate",        label: "Tickets",   iconName: "Ticket" },
  { id: "markets",   href: "/odds-center",     label: "Markets",   iconName: "TrendingUp" },
  { id: "live",      href: "/live",            label: "Live",      iconName: "Activity" },
  { id: "books",     href: "/sorsbooks",       label: "Books",     iconName: "Landmark" },
  { id: "props",     href: "/player-props",    label: "Props",     iconName: "Star" },
  { id: "community", href: "/community",       label: "Community", iconName: "Users" },
  { id: "watchlist", href: "/watchlist",       label: "Watchlist", iconName: "Eye" },
  { id: "record",    href: "/track-record",    label: "Record",    iconName: "BarChart2" },
  { id: "bankroll",  href: "/bankroll",        label: "Bankroll",  iconName: "Wallet" },
  { id: "profile",   href: "/profile",         label: "Profile",   iconName: "User" },
];

const DEFAULT_IDS = ["picks", "daily", "tickets", "books"];
const STORAGE_KEY = "sors_bottom_nav_items";

function loadPrefs(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.length <= 4) {
        const valid = parsed.filter(id => ALL_NAV_ITEMS.some(item => item.id === id));
        if (valid.length >= 2) return valid.slice(0, 4);
      }
    }
  } catch {}
  return DEFAULT_IDS;
}

export function useBottomNavPrefs() {
  const [selectedIds, setSelectedIds] = useState<string[]>(loadPrefs);

  const savePrefs = useCallback((ids: string[]) => {
    const limited = ids.slice(0, 4);
    setSelectedIds(limited);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(limited)); } catch {}
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      let next: string[];
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        next = prev.filter(x => x !== id);
      } else {
        if (prev.length >= 4) {
          next = [...prev.slice(1), id];
        } else {
          next = [...prev, id];
        }
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setSelectedIds(DEFAULT_IDS);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_IDS)); } catch {}
  }, []);

  const selectedItems = selectedIds
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter(Boolean) as NavItemDef[];

  return { selectedIds, selectedItems, toggleItem, savePrefs, resetToDefault };
}

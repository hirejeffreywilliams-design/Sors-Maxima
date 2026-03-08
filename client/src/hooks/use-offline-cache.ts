import { useState, useEffect } from "react";

export const CACHE_KEYS = {
  FEED: "/api/intelligence/feed",
  PICKS: "/api/precomputed-predictions",
  TRACK_RECORD: "/api/track-record",
  BANKROLL: "/api/settings/bankroll",
} as const;

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export function cacheApiResponse(key: string, data: any) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.error("Failed to cache API response", e);
  }
}

export function getCachedResponse(key: string) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return { data, timestamp: new Date(timestamp) };
  } catch (e) {
    return null;
  }
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(navigator.onLine ? new Date() : null);
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(navigator.onLine ? null : new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastOfflineAt(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline, lastOnlineAt, lastOfflineAt };
}

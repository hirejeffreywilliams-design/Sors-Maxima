import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useOfflineStatus, getCachedResponse, CACHE_KEYS } from "@/hooks/use-offline-cache";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

export function OfflineBanner() {
  const { isOnline, wasOffline, lastOnlineAt } = useOfflineStatus();
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowSyncing(true);
      const timer = setTimeout(() => setShowSyncing(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (showSyncing) {
    return (
      <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-300">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Back online — syncing latest data</span>
      </div>
    );
  }

  if (isOnline) return null;

  // Find the oldest cache timestamp to show "last synced"
  const caches = [
    getCachedResponse(CACHE_KEYS.FEED),
    getCachedResponse(CACHE_KEYS.PICKS),
    getCachedResponse(CACHE_KEYS.TRACK_RECORD),
    getCachedResponse(CACHE_KEYS.BANKROLL),
  ].filter(Boolean);

  const lastSync = caches.length > 0 
    ? new Date(Math.min(...caches.map(c => c!.timestamp.getTime())))
    : null;

  return (
    <div 
      className="bg-destructive/10 border-b border-destructive/20 p-4"
      data-testid="offline-banner"
    >
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <div className="relative">
              <WifiOff className="h-5 w-5 text-destructive" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-destructive">You're in Offline Mode</h3>
            <p className="text-sm text-muted-foreground">
              {lastSync 
                ? `Showing your last synced data from ${formatDistanceToNow(lastSync)} ago`
                : "Showing cached data. Connect to the internet for live updates."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-2xl">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Offline</p>
            <ul className="text-xs space-y-0.5">
              <li className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Your saved picks (last sync)
              </li>
              <li className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Bet slip and saved tickets
              </li>
              <li className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Track record and performance stats
              </li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requires Connection</p>
            <ul className="text-xs space-y-0.5">
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> Live odds and line movement
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> New pick generation
              </li>
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> Real-time scores
              </li>
            </ul>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
          className="shrink-0 gap-2 hover-elevate"
          data-testid="button-retry-connection"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </div>
    </div>
  );
}

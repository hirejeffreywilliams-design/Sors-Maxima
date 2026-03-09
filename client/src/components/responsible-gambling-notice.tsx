import { useState } from "react";
import { AlertTriangle, X, Phone } from "lucide-react";

interface Props {
  variant?: "banner" | "compact" | "footer";
  dismissible?: boolean;
  storageKey?: string;
}

export function ResponsibleGamblingNotice({
  variant = "banner",
  dismissible = true,
  storageKey = "rg-notice-dismissed",
}: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible) return false;
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(storageKey, "true"); } catch {}
    setDismissed(true);
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/80" data-testid="rg-notice-compact">
        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
        <span>Sports betting involves financial risk. 21+ only. Past performance does not guarantee future results.</span>
        {dismissible && (
          <button onClick={handleDismiss} className="ml-auto shrink-0 hover:text-amber-200" data-testid="rg-notice-dismiss">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className="text-[10px] text-muted-foreground/50 space-y-0.5 leading-relaxed" data-testid="rg-notice-footer">
        <p>⚠ Sports betting involves financial risk. Past performance does not guarantee future results.</p>
        <p>Must be 21+ to use this platform. If you have a gambling problem, call <span className="font-semibold text-muted-foreground/70">1-800-522-4700</span> or visit <span className="font-semibold text-muted-foreground/70">ncpgambling.org</span>.</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-start gap-3 p-3 rounded-lg border border-amber-500/25 bg-amber-500/8"
      data-testid="rg-notice-banner"
    >
      <div className="shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-semibold text-amber-300">Responsible Gambling Notice</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sports betting involves financial risk. Past performance does not guarantee future results. 
          This platform provides data-driven analysis — not financial advice. 
          Must be 21+ to participate.
        </p>
        <div className="flex items-center gap-1.5 pt-0.5">
          <Phone className="w-3 h-3 text-amber-400/60" />
          <span className="text-[11px] text-amber-400/70 font-medium">National Problem Gambling Helpline: 1-800-522-4700</span>
          <span className="text-[10px] text-muted-foreground/40">· ncpgambling.org</span>
        </div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          data-testid="rg-notice-dismiss-banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

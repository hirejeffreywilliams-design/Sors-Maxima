import { X, Lock, Zap, Crown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";

interface UpsellBannerProps {
  feature: string;
  currentUsage: number;
  limit: number;
  tierName: string;
}

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentTier: string;
  requiredTier: string;
}

export function UpsellBanner({
  feature,
  currentUsage,
  limit,
  tierName,
}: UpsellBannerProps) {
  const usagePercent = (currentUsage / limit) * 100;
  const isDismissed = sessionStorage.getItem(`upsell-banner-${feature}`) === "true";
  const isAtLimit = currentUsage >= limit;
  const isNearLimit = usagePercent >= 80;

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem(`upsell-banner-${feature}`, "true");
    window.location.reload();
  };

  const bannerVariant = isAtLimit ? "destructive" : "default";
  const bannerTitle = isAtLimit
    ? `Reached your daily limit of ${limit} ${feature}`
    : `You've used ${currentUsage} of ${limit} ${feature}`;
  const bannerDescription = isAtLimit
    ? "Upgrade to continue using this feature"
    : `Upgrade for unlimited access to ${feature}`;

  return (
    <Card
      className={`border-2 ${
        isAtLimit
          ? "border-destructive/50 bg-destructive/5"
          : "border-yellow-500/50 bg-yellow-500/5"
      } relative`}
      data-testid={`banner-upsell-${feature}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {isAtLimit ? (
                <span className="text-destructive">{bannerTitle}</span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">{bannerTitle}</span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{bannerDescription}</CardDescription>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
            data-testid={`button-dismiss-upsell-${feature}`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentUsage} of {limit} used</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <Progress
            value={usagePercent}
            className="h-2"
            data-testid={`progress-usage-${feature}`}
          />
        </div>

        <Link href="/pricing">
          <Button
            className="w-full gap-2"
            variant={isAtLimit ? "default" : "secondary"}
            size="sm"
            data-testid={`button-upgrade-${feature}`}
          >
            <Zap className="h-4 w-4" />
            Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function UpsellModal({
  open,
  onOpenChange,
  feature,
  currentTier,
  requiredTier,
}: UpsellModalProps) {
  const upgradeFeatures = [
    "Unlock this premium feature",
    "Access all tools in the Quantum tier",
    "Remove usage limits",
    "Get priority processing",
    "Early access to new features",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={`modal-upsell-${feature}`}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Feature Locked: {feature}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your current <Badge variant="outline">{currentTier}</Badge> plan doesn't include this feature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-500" />
              Upgrade to {requiredTier}
            </h4>
            <ul className="space-y-2">
              {upgradeFeatures.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  data-testid={`text-feature-${idx}`}
                >
                  <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Link href="/pricing" className="block">
              <Button
                className="w-full gap-2"
                variant="default"
                size="lg"
                data-testid={`button-upgrade-modal-${feature}`}
              >
                <Zap className="h-4 w-4" />
                Upgrade to {requiredTier}
              </Button>
            </Link>
            <Button
              className="w-full"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
              data-testid={`button-dismiss-modal-${feature}`}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

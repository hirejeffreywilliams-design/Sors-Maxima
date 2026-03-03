import { Lock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export type RequiredTier = "pro" | "elite" | "whale";

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  elite: 2,
  whale: 3,
};

const TIER_DISPLAY: Record<RequiredTier, string> = {
  pro: "Sharp",
  elite: "Edge",
  whale: "Max",
};

const TIER_PRICE: Record<RequiredTier, string> = {
  pro: "$49/mo",
  elite: "$99/mo",
  whale: "$249/mo",
};

const TIER_COLOR: Record<RequiredTier, string> = {
  pro: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  elite: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  whale: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

const TIER_BADGE: Record<RequiredTier, string> = {
  pro: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  elite: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  whale: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function useTier() {
  const { data: authData } = useQuery<{
    authenticated: boolean;
    tier?: string;
    isAdmin?: boolean;
  }>({ queryKey: ["/api/auth/check"], staleTime: 1000 * 60 });

  const rawTier = authData?.tier || "free";
  const isAdmin = authData?.isAdmin || false;

  return {
    tier: rawTier,
    isAdmin,
    canAccess: (required: RequiredTier) => {
      if (isAdmin) return true;
      return (TIER_ORDER[rawTier] || 0) >= TIER_ORDER[required];
    },
  };
}

interface TierGateProps {
  required: RequiredTier;
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function TierGate({ required, label, description, children }: TierGateProps) {
  const { canAccess } = useTier();

  if (canAccess(required)) {
    return <>{children}</>;
  }

  const tierName = TIER_DISPLAY[required];
  const tierPrice = TIER_PRICE[required];

  return (
    <Card
      className={`border ${TIER_COLOR[required]} bg-card/50`}
      data-testid={`tier-gate-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${TIER_BADGE[required]}`}
            >
              {tierName} Feature
            </Badge>
          </div>
          <h3 className="text-lg font-semibold">{label}</h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/pricing" className="flex-1">
            <Button className="w-full gap-2" size="sm">
              Upgrade to {tierName}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/pricing" className="flex-1">
            <Button variant="outline" className="w-full text-xs" size="sm">
              {tierPrice} — See All Features
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

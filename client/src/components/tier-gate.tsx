import { Lock, ArrowRight, Check, Star, Gem, Crown, Sparkles } from "lucide-react";
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

const TIER_ICON: Record<RequiredTier, any> = {
  pro: Star,
  elite: Gem,
  whale: Crown,
};

const TIER_COLORS = {
  pro: {
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    glow: "shadow-blue-500/10",
    icon: "text-blue-400",
    iconBg: "bg-blue-500/10",
    benefitsBg: "bg-blue-500/8 border-blue-500/20",
    accent: "text-blue-400",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  elite: {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    glow: "shadow-purple-500/10",
    icon: "text-purple-400",
    iconBg: "bg-purple-500/10",
    benefitsBg: "bg-purple-500/8 border-purple-500/20",
    accent: "text-purple-400",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  whale: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    glow: "shadow-amber-500/10",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/10",
    benefitsBg: "bg-amber-500/8 border-amber-500/20",
    accent: "text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
};

const TIER_BENEFITS: Record<RequiredTier, { headline: string; tagline: string; features: string[] }> = {
  pro: {
    headline: "Everything serious bettors need",
    tagline: "Core engine access from day one",
    features: [
      "Today's Best Tickets — pre-built daily parlays",
      "46-Factor Prediction Engine across 6 US sports",
      "A–F grade and +EV score on every pick",
      "Visual drag-and-drop parlay builder",
      "Pick tracker with full verified win/loss history",
      "Odds Center — live line movement & CLV tracking",
    ],
  },
  elite: {
    headline: "Full analytics suite unlocked",
    tagline: "For bettors who demand every edge",
    features: [
      "Sors Intelligence Cards — collect & showcase wins",
      "Strategy Advisor with auto-parlay builder",
      "MMA/UFC + 16 international soccer leagues",
      "Sors Books Hub — track all your book balances",
      "SGP Correlation Intelligence — avoid negative legs",
      "Player Props Analyzer with ML projections",
    ],
  },
  whale: {
    headline: "Zero limits. Maximum depth.",
    tagline: "The full platform — completely unrestricted",
    features: [
      "Life Changer™ Ticket — our biggest daily parlay",
      "Smart Pick Review Queue — fractional Kelly stakes",
      "Card Verification & Discord proof links",
      "Ticket Variation Engine — 5 strategic blueprints",
      "Live Cashout Advisor, CLV Tracker & Hedge Planner",
      "Progressive Hedge Planner + Custom Model Builder",
    ],
  },
};

export function useTier() {
  const { data: authData } = useQuery<{
    authenticated: boolean;
    tier?: string;
    isAdmin?: boolean;
    isFounder?: boolean;
    founderType?: string | null;
    founderNumber?: number | null;
  }>({ queryKey: ["/api/auth/check"], staleTime: 1000 * 60 });

  const rawTier = authData?.tier || "free";
  const isAdmin = authData?.isAdmin || false;
  const isFounder = authData?.isFounder || false;
  const founderType = authData?.founderType || null;
  const founderNumber = authData?.founderNumber || null;

  return {
    tier: rawTier,
    isAdmin,
    isFounder,
    founderType,
    founderNumber,
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
  compact?: boolean;
}

export function TierGate({ required, label, description, children, compact = false }: TierGateProps) {
  const { canAccess } = useTier();

  if (canAccess(required)) {
    return <>{children}</>;
  }

  const tierName = TIER_DISPLAY[required];
  const tierPrice = TIER_PRICE[required];
  const colors = TIER_COLORS[required];
  const benefits = TIER_BENEFITS[required];
  const TierIcon = TIER_ICON[required];

  if (compact) {
    return (
      <Card
        className={`border ${colors.border} ${colors.bg}`}
        data-testid={`tier-gate-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${colors.iconBg} shrink-0`}>
            <Lock className={`w-4 h-4 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className={`text-[10px] font-semibold ${colors.badge}`}>
                {tierName}
              </Badge>
              <span className="font-semibold text-sm truncate">{label}</span>
            </div>
            {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button size="sm" className={colors.button}>
              Upgrade <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border ${colors.border} ${colors.bg} shadow-lg ${colors.glow}`}
      data-testid={`tier-gate-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* Left: lock message + CTA */}
          <div className="flex-1 space-y-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${colors.iconBg} shrink-0`}>
                <Lock className={`w-6 h-6 ${colors.icon}`} />
              </div>
              <div>
                <Badge variant="outline" className={`text-xs font-semibold mb-2 ${colors.badge}`}>
                  <TierIcon className="w-3 h-3 mr-1.5" />
                  {tierName} Plan — {tierPrice}
                </Badge>
                <h3 className="text-xl font-bold leading-tight">{label}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{description}</p>
                )}
              </div>
            </div>

            <p className={`text-sm font-medium ${colors.accent}`}>
              Upgrade to {tierName} to unlock this feature — and everything else in the plan.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/pricing">
                <Button className={`gap-2 ${colors.button}`} data-testid={`button-upgrade-${required}`}>
                  <Sparkles className="w-4 h-4" />
                  Upgrade to {tierName}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="default" className={`text-xs border-current/20 ${colors.accent}`}>
                  Compare all plans
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {tierPrice} · 30-day money-back guarantee · Cancel anytime
            </p>
          </div>

          {/* Right: tier benefits list */}
          <div className={`w-full lg:w-72 shrink-0 rounded-xl border ${colors.benefitsBg} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <TierIcon className={`w-4 h-4 ${colors.icon}`} />
              <span className={`text-xs font-bold uppercase tracking-wide ${colors.accent}`}>
                What {tierName} unlocks
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground mb-3">{benefits.headline}</p>
            <div className="space-y-2.5">
              {benefits.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${colors.icon}`} />
                  <span className="text-xs text-muted-foreground leading-snug">{feature}</span>
                </div>
              ))}
            </div>
            <div className={`mt-4 pt-3 border-t border-current/10`}>
              <p className={`text-[11px] italic ${colors.accent} opacity-80`}>{benefits.tagline}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

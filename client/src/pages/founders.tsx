import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/use-seo";
import {
  Trophy,
  Crown,
  Star,
  Shield,
  Zap,
  Flame,
  Lock,
  ChevronRight,
  Users,
  Sparkles,
} from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo-gold.png";

interface FoundersStatus {
  isActive: boolean;
  launchedAt: string | null;
  memberSpotsTotal: number;
  memberSpotsClaimed: number;
  memberSpotsRemaining: number;
  enterpriseSpotsTotal: number;
  enterpriseSpotsClaimed: number;
  enterpriseSpotsRemaining: number;
  founders: PublicFounder[];
}

interface PublicFounder {
  founderNumber: number;
  founderType: "member" | "enterprise";
  username: string;
  displayName: string;
  joinedAt: string;
  tier: string;
}

const TIER_LABEL: Record<string, string> = { pro: "Sharp", elite: "Edge", whale: "Max", free: "Free" };
const TIER_COLOR: Record<string, string> = {
  pro: "text-blue-400",
  elite: "text-purple-400",
  whale: "text-amber-400",
  free: "text-gray-400",
};

const FOUNDER_BENEFITS = [
  { icon: Lock, title: "Price Locked Forever", description: "Your membership rate is locked in at the price you joined — never increases, regardless of future pricing changes." },
  { icon: Zap, title: "Early Access — Always", description: "Founders see every pick the moment it's generated, 15 minutes before the general member release window." },
  { icon: Star, title: "One Tier Upgrade", description: "Sharp Founders access Edge features. Edge Founders access Max. Max Founders are reserved for any future premium tier." },
  { icon: Sparkles, title: "Exclusive Founder Badge", description: "Your permanent Founder #XXX badge appears on your profile and throughout the platform. A mark of the original inner circle." },
  { icon: Trophy, title: "Referral Credits", description: "Earn credits toward your subscription for every active member you refer using your unique founder referral code." },
  { icon: Shield, title: "Priority Support", description: "Founders receive direct priority support access — no queue, no bots, direct to the team." },
];

function FounderCard({ founder }: { founder: PublicFounder }) {
  const isEnterprise = founder.founderType === "enterprise";
  return (
    <Card
      className={`group border transition-all hover:border-primary/40 ${isEnterprise ? "border-amber-500/30 bg-amber-500/5" : "border-border/60"}`}
      data-testid={`card-founder-${founder.founderNumber}`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          isEnterprise
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            : "bg-primary/10 text-primary border border-primary/20"
        }`} data-testid={`badge-founder-num-${founder.founderNumber}`}>
          #{founder.founderNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate" data-testid={`text-founder-name-${founder.founderNumber}`}>
              {founder.displayName}
            </span>
            {isEnterprise && (
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-medium ${TIER_COLOR[founder.tier] || "text-muted-foreground"}`}>
              {TIER_LABEL[founder.tier] || founder.tier}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(founder.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        {isEnterprise && (
          <Badge variant="outline" className="text-[9px] px-1.5 h-5 bg-amber-500/15 text-amber-300 border-amber-500/30 shrink-0">
            Enterprise
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function FoundersPage() {
  useSEO({
    title: "Founding 500 — Sors Maxima",
    description: "The original 500 members who shaped Sors Maxima. Lifetime price lock, early access, tier boost, and permanent founder recognition.",
  });

  const { data: status, isLoading } = useQuery<FoundersStatus>({
    queryKey: ["/api/founders/status"],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const memberPct = status ? Math.round((status.memberSpotsClaimed / status.memberSpotsTotal) * 100) : 0;
  const members = status?.founders.filter(f => f.founderType === "member") ?? [];
  const enterprise = status?.founders.filter(f => f.founderType === "enterprise") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md" data-testid="nav-founders">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-7 h-7 rounded-lg" />
              <span className="font-semibold text-sm text-foreground tracking-tight">Sors Maxima</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-xs hidden sm:flex" data-testid="nav-link-pricing">
                Pricing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs font-medium" data-testid="nav-button-login">
                Member Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b" data-testid="section-founders-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold tracking-wider uppercase">
            <Trophy className="w-3.5 h-3.5" />
            The Founding 500
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Original Members.<br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Locked In Forever.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The first 500 subscribers to join Sors Maxima during the Founders Window receive permanent price lock, a tier upgrade, early access to every pick, and lifetime founder recognition.
          </p>

          {isLoading ? (
            <div className="max-w-md mx-auto space-y-3">
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : status?.isActive ? (
            <div className="max-w-md mx-auto space-y-3" data-testid="section-slot-progress">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.memberSpotsClaimed} founders joined</span>
                <span className={`font-bold ${status.memberSpotsRemaining <= 50 ? "text-red-400" : status.memberSpotsRemaining <= 150 ? "text-amber-400" : "text-primary"}`}>
                  {status.memberSpotsRemaining} spots left
                </span>
              </div>
              <Progress value={memberPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {status.memberSpotsTotal} total member spots · {status.enterpriseSpotsRemaining} enterprise spots remaining
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="rounded-xl border border-border/50 bg-muted/30 px-6 py-4 text-sm text-muted-foreground" data-testid="badge-program-pending">
                <Lock className="w-4 h-4 mx-auto mb-2 opacity-50" />
                The Founders Program has not yet launched. Join our newsletter to be notified the moment it opens.
              </div>
            </div>
          )}

          {status?.isActive && status.memberSpotsRemaining > 0 && (
            <div className="flex items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2" data-testid="button-founders-join">
                  <Trophy className="w-4 h-4" />
                  Claim Your Founder Spot
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" data-testid="button-founders-login">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20" data-testid="section-founder-benefits">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Founder Benefits</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Everything that comes with your permanent founder number — for life.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FOUNDER_BENEFITS.map(b => (
            <Card key={b.title} className="border-border/60 hover:border-primary/30 transition-colors" data-testid={`card-benefit-${b.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{b.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {status?.isActive && (
        <section className="border-t bg-muted/20" data-testid="section-founders-wall">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">The Founders Wall</h2>
              <p className="text-muted-foreground mt-2">
                {status.founders.length > 0
                  ? `${status.founders.length} founders and counting.`
                  : "No founders yet — be the first."}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <>
                {enterprise.length > 0 && (
                  <div className="mb-8" data-testid="section-enterprise-founders">
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Enterprise Founders</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enterprise.map(f => <FounderCard key={f.founderNumber} founder={f} />)}
                    </div>
                  </div>
                )}

                {members.length > 0 && (
                  <div data-testid="section-member-founders">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                        Member Founders ({members.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {members.map(f => <FounderCard key={f.founderNumber} founder={f} />)}
                    </div>
                  </div>
                )}

                {status.founders.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground" data-testid="text-no-founders">
                    <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No founders yet.</p>
                    <p className="text-sm mt-1">Be the first to claim your founder spot.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className="border-t" data-testid="section-founders-footer-cta">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-16 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Secure Your Spot?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Once the 500 spots are gone, they're gone. Your membership rate, benefits, and founder number are yours permanently.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2" data-testid="button-footer-join-founders">
                <Trophy className="w-4 h-4" />
                Join the Founding 500
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" data-testid="button-footer-view-pricing">
                View All Plans
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            For entertainment and educational purposes only. Not gambling advice. Must be 21+.
          </p>
        </div>
      </section>
    </div>
  );
}

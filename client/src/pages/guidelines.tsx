import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, CreditCard, Heart, BookOpen, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  "Community Conduct": {
    icon: Users,
    color: "text-blue-400",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
  },
  "Card & Collectibles Policy": {
    icon: CreditCard,
    color: "text-amber-400",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
  },
  "Responsible Gambling & Legal": {
    icon: Heart,
    color: "text-emerald-400",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  "Account Policy": {
    icon: Shield,
    color: "text-purple-400",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
  },
  "Betting Intelligence Standards": {
    icon: BookOpen,
    color: "text-orange-400",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
  },
};

const DEFAULT_META = {
  icon: Scale,
  color: "text-gray-400",
  bg: "rgba(156,163,175,0.08)",
  border: "rgba(156,163,175,0.2)",
};

function CategorySection({ category, rules }: { category: string; rules: any[] }) {
  const [open, setOpen] = useState(true);
  const meta = CATEGORY_META[category] || DEFAULT_META;
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: meta.border }}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        style={{ background: meta.bg }}
        onClick={() => setOpen(!open)}
        data-testid={`category-${category.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1">
          <h3 className={`font-black text-sm ${meta.color}`}>{category}</h3>
          <p className="text-xs text-muted-foreground">{rules.length} rule{rules.length !== 1 ? "s" : ""}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="divide-y divide-border/30">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="px-5 py-4 bg-background/40" data-testid={`rule-${rule.id}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${meta.color}`}
                  style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                  {idx + 1}
                </div>
                <div>
                  <p className="font-bold text-sm">{rule.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{rule.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuidelinesPage() {
  const { data, isLoading } = useQuery<{ categories: Array<{ category: string; rules: any[] }> }>({
    queryKey: ["/api/guidelines"],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black">Platform Guidelines</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            These guidelines define the standards of conduct, acceptable use, and legal responsibilities for all Sors Maxima members. Membership is a privilege — these rules keep the platform safe, fair, and effective for everyone.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-400/20 text-xs">Members Only Platform</Badge>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 text-xs">Zero Tolerance Enforcement</Badge>
            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-400/20 text-xs">Updated Regularly</Badge>
          </div>
        </div>

        {/* Notice */}
        <Card className="border-amber-400/20 bg-amber-400/5">
          <CardContent className="py-4 px-5">
            <p className="text-sm text-amber-300/90">
              <span className="font-black text-amber-400">Important: </span>
              By accessing Sors Maxima, you agree to abide by these guidelines. Violations may result in immediate account suspension or permanent termination without refund. If you have questions, contact support before taking any action you are unsure about.
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-full h-24 rounded-2xl" />)}
          </div>
        ) : !data || data.categories.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Scale className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p className="text-muted-foreground">Guidelines are being loaded. Please check back shortly.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.categories.map(({ category, rules }) => (
              <CategorySection key={category} category={category} rules={rules} />
            ))}
          </div>
        )}

        {/* Footer note */}
        <Card className="border-border/30 bg-muted/10">
          <CardContent className="py-5 px-5 text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              These guidelines are subject to change. Members will be notified of material changes via platform announcement. Last reviewed by Sors Maxima administration.
            </p>
            <p className="text-xs text-muted-foreground">
              For responsible gambling support: <span className="font-bold text-emerald-400">ncpgambling.org</span> · 1-800-GAMBLER (1-800-426-2537)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

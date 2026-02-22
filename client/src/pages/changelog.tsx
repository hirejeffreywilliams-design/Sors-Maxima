import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Zap,
  Shield,
  Wrench,
  Bug,
  Star,
  TrendingUp,
  Users,
  Activity,
  GripVertical,
  UsersRound,
  Brain,
  CreditCard,
  Globe,
} from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  highlights: { text: string; icon: React.ComponentType<{ className?: string }>; tag?: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.5.0",
    date: "February 2026",
    type: "major",
    title: "Command Palette, Help Center & GDPR Tools",
    highlights: [
      { text: "Global search with Ctrl/Cmd+K to find any page, tool, or feature instantly", icon: Zap, tag: "new" },
      { text: "Help Center with searchable FAQ covering all features and responsible gaming", icon: Wrench, tag: "new" },
      { text: "User Profile page with account management and session control", icon: Users, tag: "new" },
      { text: "GDPR data export (JSON download) and account deletion", icon: Shield, tag: "new" },
      { text: "In-app feedback widget for bug reports and feature requests", icon: Star, tag: "new" },
      { text: "Cookie consent banner for GDPR/CCPA compliance", icon: Globe, tag: "new" },
      { text: "What's New changelog page to track all updates", icon: Megaphone, tag: "new" },
      { text: "Active session management - view and revoke login sessions", icon: Shield, tag: "new" },
    ],
  },
  {
    version: "2.4.0",
    date: "February 2026",
    type: "major",
    title: "Visual Builder on Home Page & Roster Integration",
    highlights: [
      { text: "Visual Parlay Builder moved to home page for quick access", icon: GripVertical, tag: "improved" },
      { text: "ESPN roster preloading at startup - 124 teams, 3,380+ players cached", icon: UsersRound, tag: "improved" },
      { text: "Real ESPN injury data integration replacing simulated injuries", icon: Activity, tag: "improved" },
      { text: "Team ID-based lookups replacing fragile string matching", icon: Wrench, tag: "fix" },
      { text: "Roster cache stats API endpoint for monitoring", icon: TrendingUp, tag: "new" },
    ],
  },
  {
    version: "2.3.0",
    date: "January 2026",
    type: "major",
    title: "Visual Parlay Builder Enhancements",
    highlights: [
      { text: "8-step interactive onboarding tutorial for first-time users", icon: Star, tag: "new" },
      { text: "Persistent symbol key/legend panel explaining all icons and badges", icon: Wrench, tag: "new" },
      { text: "Collapsible market sections per game card reducing clutter", icon: GripVertical, tag: "improved" },
      { text: "Full player props access with 'Show All' expansion", icon: TrendingUp, tag: "improved" },
      { text: "Same-game parlay detection with correlation warnings for same-game legs", icon: Brain, tag: "new" },
      { text: "What-If/Parlay Insurance calculator showing payout impact per leg", icon: Shield, tag: "new" },
    ],
  },
  {
    version: "2.2.0",
    date: "January 2026",
    type: "major",
    title: "Security Center & Admin Tools",
    highlights: [
      { text: "Error & Security Center with system health monitoring", icon: Shield, tag: "new" },
      { text: "25+ categorized error codes with admin troubleshooting guides", icon: Bug, tag: "new" },
      { text: "IP blocking system - automatic and manual with admin controls", icon: Shield, tag: "new" },
      { text: "AI-powered diagnostics for admin", icon: Brain, tag: "new" },
      { text: "AI Marketing Tools for content generation and growth analytics", icon: CreditCard, tag: "new" },
    ],
  },
  {
    version: "2.1.0",
    date: "January 2026",
    type: "minor",
    title: "Community & Social Features",
    highlights: [
      { text: "Tipster Communities with monetization (15% platform fee)", icon: Users, tag: "new" },
      { text: "Social Feed for sharing wins, analysis, and hot takes", icon: Star, tag: "new" },
      { text: "Copy Betting - follow and mirror top tipsters' picks", icon: TrendingUp, tag: "new" },
      { text: "Pick Competitions with weekly/monthly leaderboards", icon: Activity, tag: "new" },
      { text: "Referral Program with $10 credit per successful referral", icon: CreditCard, tag: "new" },
    ],
  },
  {
    version: "2.0.0",
    date: "January 2026",
    type: "major",
    title: "Sors Prediction Engine & Pro Tools",
    highlights: [
      { text: "Sors Prediction Engine analyzing 46 factors across 7 categories", icon: Brain, tag: "new" },
      { text: "Algorithm Training Center for backtesting before launch", icon: Wrench, tag: "new" },
      { text: "Continuous Learning Engine adapting prediction weights", icon: TrendingUp, tag: "new" },
      { text: "Arbitrage Finder for cross-sportsbook profit opportunities", icon: Zap, tag: "new" },
      { text: "Custom Model Builder for user-adjustable factor weights", icon: Wrench, tag: "new" },
      { text: "Export Bet Slip for 6 major sportsbooks", icon: Activity, tag: "new" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 2025",
    type: "major",
    title: "Initial Launch",
    highlights: [
      { text: "Smart Ticket Generator with AI-powered optimization", icon: Zap, tag: "new" },
      { text: "Simulation engine for probability analysis", icon: Brain, tag: "new" },
      { text: "Multi-sport coverage: NBA, NFL, MLB, NHL, NCAAB, NCAAF", icon: Activity, tag: "new" },
      { text: "Stripe-powered subscription billing with 4 tiers", icon: CreditCard, tag: "new" },
      { text: "Dark/light theme toggle", icon: Star, tag: "new" },
    ],
  },
];

const typeColors: Record<string, string> = {
  major: "bg-primary/10 text-primary",
  minor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  patch: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const tagColors: Record<string, string> = {
  new: "bg-green-500/10 text-green-600 dark:text-green-400",
  improved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  fix: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">What's New</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Track all updates, improvements, and new features in Sors Maxima
          </p>
        </header>

        <div className="space-y-6">
          {changelog.map((entry, idx) => (
            <Card key={entry.version} data-testid={`changelog-entry-${entry.version}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {entry.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[entry.type]}>{entry.type}</Badge>
                    <Badge variant="outline">v{entry.version}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{entry.date}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {entry.highlights.map((item, hIdx) => {
                    const Icon = item.icon;
                    return (
                      <li key={hIdx} className="flex items-start gap-2 text-sm">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="flex-1">{item.text}</span>
                        {item.tag && (
                          <Badge variant="secondary" className={`text-[10px] shrink-0 ${tagColors[item.tag] || ""}`}>
                            {item.tag}
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

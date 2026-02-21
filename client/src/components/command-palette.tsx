import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Zap,
  Activity,
  Wrench,
  UsersRound,
  Users,
  Trophy,
  Wallet,
  Settings,
  CreditCard,
  Shield,
  Brain,
  GraduationCap,
  GripVertical,
  BarChart3,
  TrendingUp,
  Target,
  Dice1,
  Calculator,
  FileText,
  HelpCircle,
  Bell,
  Megaphone,
  Search,
} from "lucide-react";

interface CommandItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string[];
}

const commandItems: CommandItem[] = [
  { label: "Smart Ticket Generator", href: "/", icon: Zap, group: "Pages", keywords: ["generate", "tickets", "ai", "smart"] },
  { label: "Visual Parlay Builder", href: "/", icon: GripVertical, group: "Pages", keywords: ["visual", "builder", "drag", "drop"] },
  { label: "Live Center", href: "/live", icon: Activity, group: "Pages", keywords: ["live", "scores", "momentum", "hedge"] },
  { label: "Pro Tools", href: "/tools", icon: Wrench, group: "Pages", keywords: ["tools", "odds", "ml", "correlation"] },
  { label: "Team Rosters", href: "/rosters", icon: UsersRound, group: "Pages", keywords: ["rosters", "teams", "players", "injury"] },
  { label: "Community", href: "/community", icon: Users, group: "Pages", keywords: ["social", "leaderboard", "tipsters", "copy"] },
  { label: "Rewards", href: "/rewards", icon: Trophy, group: "Pages", keywords: ["challenges", "achievements", "streaks", "competitions"] },
  { label: "Finance & Bankroll", href: "/bankroll", icon: Wallet, group: "Pages", keywords: ["bankroll", "bets", "roi", "tax"] },
  { label: "Settings", href: "/settings", icon: Settings, group: "Pages", keywords: ["notifications", "responsible", "backup", "language"] },
  { label: "Upgrade Plans", href: "/pricing", icon: CreditCard, group: "Pages", keywords: ["pricing", "subscribe", "pro", "elite"] },
  { label: "Help Center", href: "/help", icon: HelpCircle, group: "Pages", keywords: ["faq", "support", "help", "questions"] },
  { label: "What's New", href: "/changelog", icon: Megaphone, group: "Pages", keywords: ["changelog", "updates", "release", "new"] },
  { label: "My Profile", href: "/profile", icon: Shield, group: "Pages", keywords: ["profile", "account", "data", "export"] },

  { label: "Odds Comparison", href: "/tools", icon: TrendingUp, group: "Tools", keywords: ["odds", "compare", "sportsbook"] },
  { label: "ML Prop Projections", href: "/tools", icon: Brain, group: "Tools", keywords: ["machine learning", "props", "projections"] },
  { label: "Correlation Engine", href: "/tools", icon: Target, group: "Tools", keywords: ["correlation", "sgp", "same game"] },
  { label: "Arbitrage Finder", href: "/tools", icon: Calculator, group: "Tools", keywords: ["arbitrage", "guaranteed", "profit"] },
  { label: "Player Prop Lab", href: "/tools", icon: BarChart3, group: "Tools", keywords: ["player", "props", "stats", "matchup"] },
  { label: "Custom Model Builder", href: "/tools", icon: Dice1, group: "Tools", keywords: ["model", "weights", "factors", "custom"] },
  { label: "Export Bet Slip", href: "/tools", icon: FileText, group: "Tools", keywords: ["export", "draftkings", "fanduel", "betmgm"] },

  { label: "Admin Dashboard", href: "/admin", icon: Shield, group: "Admin", keywords: ["admin", "users", "fraud"] },
  { label: "AI Diagnostics", href: "/admin/diagnostics", icon: Brain, group: "Admin", keywords: ["diagnostics", "system", "ai"] },
  { label: "Marketing Tools", href: "/admin/marketing", icon: Megaphone, group: "Admin", keywords: ["marketing", "content", "growth"] },
  { label: "Security Center", href: "/admin/security", icon: Shield, group: "Admin", keywords: ["security", "errors", "ip", "blocking"] },
  { label: "Training Center", href: "/training", icon: GraduationCap, group: "Admin", keywords: ["training", "backtest", "algorithm"] },
  { label: "Growth Analytics", href: "/admin/growth", icon: TrendingUp, group: "Admin", keywords: ["growth", "funnel", "cohort", "retention", "cac", "mrr"] },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Settings, group: "Admin", keywords: ["flags", "ab test", "experiment", "rollout", "toggle"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setLocation(href);
    },
    [setLocation]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, tools, features..." data-testid="input-command-search" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {["Pages", "Tools", "Admin"].map((group) => {
          const items = commandItems.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <CommandGroup heading={group} key={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.label}
                    value={[item.label, ...(item.keywords || [])].join(" ")}
                    onSelect={() => handleSelect(item.href)}
                    data-testid={`command-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteButton({ onClick }: { onClick: () => void }) {
  return null;
}

export function SearchButton() {
  const handleClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 h-9 hover-elevate"
      data-testid="button-command-palette"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex pointer-events-none h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">&#8984;</span>K
      </kbd>
    </button>
  );
}

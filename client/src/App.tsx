import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ParlaySlipProvider } from "@/hooks/use-parlay-slip";
import { ParlaySlipDrawer } from "@/components/parlay-slip-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
const CommandCenter = lazy(() => import("@/pages/command-center"));
const AutoGenerator = lazy(() => import("@/pages/auto-generator"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const DailyParlays = lazy(() => import("@/pages/daily-parlays"));
const Tools = lazy(() => import("@/pages/tools"));
const Community = lazy(() => import("@/pages/community"));
const Rewards = lazy(() => import("@/pages/rewards"));
const Bankroll = lazy(() => import("@/pages/bankroll"));
const Live = lazy(() => import("@/pages/live"));
const Pricing = lazy(() => import("@/pages/pricing"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminDiagnostics = lazy(() => import("@/pages/admin-diagnostics"));
const AdminMarketing = lazy(() => import("@/pages/admin-marketing"));
const AdminSecurity = lazy(() => import("@/pages/admin-security"));
const AdminGrowth = lazy(() => import("@/pages/admin-growth"));
const AdminFeatureFlags = lazy(() => import("@/pages/admin-feature-flags"));
const LegalPage = lazy(() => import("@/pages/legal"));
const Settings = lazy(() => import("@/pages/settings"));
const TipsterCommunities = lazy(() => import("@/pages/tipster-communities"));
const TrainingCenter = lazy(() => import("@/pages/training-center"));
const RostersPage = lazy(() => import("@/pages/rosters"));
const HelpCenter = lazy(() => import("@/pages/help"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const ChangelogPage = lazy(() => import("@/pages/changelog"));
const AdminModelPerformance = lazy(() => import("@/pages/admin-model-performance"));
const AdminDataProvenance = lazy(() => import("@/pages/admin-data-provenance"));
const AdminRiskRegister = lazy(() => import("@/pages/admin-risk-register"));
const AdminFinancialProjections = lazy(() => import("@/pages/admin-financial-projections"));
const Roadmap = lazy(() => import("@/pages/roadmap"));
const AdminUserHealth = lazy(() => import("@/pages/admin-user-health"));
const AdminSupportDashboard = lazy(() => import("@/pages/admin-support"));
const AdminFraudDashboard = lazy(() => import("@/pages/admin-fraud"));
const AdminABTests = lazy(() => import("@/pages/admin-ab-tests"));
const AdminLifecycleCampaigns = lazy(() => import("@/pages/admin-lifecycle-campaigns"));
const AdminSegmentation = lazy(() => import("@/pages/admin-segmentation"));
const AdminPromos = lazy(() => import("@/pages/admin-promos"));
const AdminAcquisition = lazy(() => import("@/pages/admin-acquisition"));
const AdminAnalyticsDashboard = lazy(() => import("@/pages/admin-analytics"));
const AdminOrchestration = lazy(() => import("@/pages/admin-orchestration"));
const AdminAssistant = lazy(() => import("@/pages/admin-assistant"));
const AdminGuardian = lazy(() => import("@/pages/admin-guardian"));
const SportFactorAnalysis = lazy(() => import("@/pages/sport-factor-analysis"));
const PipelineIntelligence = lazy(() => import("@/pages/pipeline"));
const EVHeatmap = lazy(() => import("@/pages/ev-heatmap"));
const LineMovement = lazy(() => import("@/pages/line-movement"));
const PowerRankings = lazy(() => import("@/pages/power-rankings"));
const TicketHistory = lazy(() => import("@/pages/ticket-history"));
const BettingProfile = lazy(() => import("@/pages/betting-profile"));
const ProTools = lazy(() => import("@/pages/pro-tools"));
const CorrelationMatrix = lazy(() => import("@/pages/correlation-matrix"));
const SharedTickets = lazy(() => import("@/pages/shared-tickets"));
const OddsCenter = lazy(() => import("@/pages/odds-center"));
const PropParlayBuilder = lazy(() => import("@/pages/prop-parlay-builder"));
const StraightBets = lazy(() => import("@/pages/straight-bets"));
const SGPGenerator = lazy(() => import("@/pages/sgp-generator"));
const TeaserGenerator = lazy(() => import("@/pages/teaser-generator"));
const RoundRobinGenerator = lazy(() => import("@/pages/round-robin-generator"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const WatchlistPage = lazy(() => import("@/pages/watchlist"));
import { Zap, Wrench, LogOut, Users, Trophy, Wallet, Activity, CreditCard, Shield, Menu, X, Settings as SettingsIcon, Brain, GraduationCap, UsersRound, HelpCircle, Megaphone, User, LayoutGrid, Map, FlaskConical, GitBranch, Calendar, ChevronRight, Flame, TrendingUp, BarChart3, History, UserCog, Calculator, MoreHorizontal, Target, Layers, ArrowUpDown, Shuffle, Star } from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";
import { GeoComplianceBanner } from "@/components/geo-compliance-banner";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { NotificationsPanel } from "@/components/notifications-panel";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { CommandPalette, SearchButton } from "@/components/command-palette";
import { FeedbackWidget } from "@/components/feedback-widget";
import { useUTMCapture } from "@/lib/utm-tracker";
import { AgeVerificationGate } from "@/components/age-verification-gate";
import { ErrorRecoveryInterceptor } from "@/components/error-recovery-interceptor";
import { SupportChat } from "@/components/support-chat";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AdminGuard({ component: Component, authState }: { component: React.ComponentType; authState: AuthState }) {
  const [location] = useLocation();
  if (!authState.isAdmin) {
    return <NotFound />;
  }
  const isSubPage = location !== "/admin" && location.startsWith("/admin/");
  const pageName = isSubPage ? location.replace("/admin/", "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
  return (
    <>
      {isSubPage && (
        <div className="bg-muted/30 border-b px-4 sm:px-6 py-2">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-primary transition-colors" data-testid="breadcrumb-admin">Command Center</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium" data-testid="breadcrumb-current">{pageName}</span>
          </div>
        </div>
      )}
      <Component />
    </>
  );
}

function AdminApp({ onLogout, authState }: { onLogout: () => void; authState: AuthState }) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-8 h-8 rounded-lg" />
                <div className="hidden sm:block">
                  <span className="font-bold text-lg bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                    Sors Maxima
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">Admin</span>
                </div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {authState.username && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {authState.username}
              </span>
            )}
            <ThemeToggle />
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-xs" data-testid="button-exit-admin">
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">User App</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-admin-logout">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)]">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/admin">{() => <AdminGuard component={AdminDashboard} authState={authState} />}</Route>
            <Route path="/admin/diagnostics">{() => <AdminGuard component={AdminDiagnostics} authState={authState} />}</Route>
            <Route path="/admin/marketing">{() => <AdminGuard component={AdminMarketing} authState={authState} />}</Route>
            <Route path="/admin/security">{() => <AdminGuard component={AdminSecurity} authState={authState} />}</Route>
            <Route path="/admin/growth">{() => <AdminGuard component={AdminGrowth} authState={authState} />}</Route>
            <Route path="/admin/feature-flags">{() => <AdminGuard component={AdminFeatureFlags} authState={authState} />}</Route>
            <Route path="/admin/model-performance">{() => <AdminGuard component={AdminModelPerformance} authState={authState} />}</Route>
            <Route path="/admin/data-provenance">{() => <AdminGuard component={AdminDataProvenance} authState={authState} />}</Route>
            <Route path="/admin/risk-register">{() => <AdminGuard component={AdminRiskRegister} authState={authState} />}</Route>
            <Route path="/admin/financial-projections">{() => <AdminGuard component={AdminFinancialProjections} authState={authState} />}</Route>
            <Route path="/admin/user-health">{() => <AdminGuard component={AdminUserHealth} authState={authState} />}</Route>
            <Route path="/admin/support">{() => <AdminGuard component={AdminSupportDashboard} authState={authState} />}</Route>
            <Route path="/admin/fraud">{() => <AdminGuard component={AdminFraudDashboard} authState={authState} />}</Route>
            <Route path="/admin/ab-tests">{() => <AdminGuard component={AdminABTests} authState={authState} />}</Route>
            <Route path="/admin/lifecycle-campaigns">{() => <AdminGuard component={AdminLifecycleCampaigns} authState={authState} />}</Route>
            <Route path="/admin/segmentation">{() => <AdminGuard component={AdminSegmentation} authState={authState} />}</Route>
            <Route path="/admin/promos">{() => <AdminGuard component={AdminPromos} authState={authState} />}</Route>
            <Route path="/admin/acquisition">{() => <AdminGuard component={AdminAcquisition} authState={authState} />}</Route>
            <Route path="/admin/analytics-dashboard">{() => <AdminGuard component={AdminAnalyticsDashboard} authState={authState} />}</Route>
            <Route path="/admin/orchestration">{() => <AdminGuard component={AdminOrchestration} authState={authState} />}</Route>
            <Route path="/admin/assistant">{() => <AdminGuard component={AdminAssistant} authState={authState} />}</Route>
            <Route path="/admin/guardian">{() => <AdminGuard component={AdminGuardian} authState={authState} />}</Route>
            <Route path="/admin/training">{() => <AdminGuard component={TrainingCenter} authState={authState} />}</Route>
            <Route path="/admin/pipeline">{() => <AdminGuard component={PipelineIntelligence} authState={authState} />}</Route>
            <Route path="/admin/sport-analysis">{() => <AdminGuard component={SportFactorAnalysis} authState={authState} />}</Route>
            <Route path="/admin/correlation-matrix">{() => <AdminGuard component={CorrelationMatrix} authState={authState} />}</Route>
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}

function Router({ authState }: { authState: AuthState }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/generate" component={AutoGenerator} />
        <Route path="/builder" component={Dashboard} />
        <Route path="/daily" component={DailyParlays} />
        <Route path="/tools" component={Tools} />
        <Route path="/community" component={Community} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/bankroll" component={Bankroll} />
        <Route path="/live" component={Live} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/legal" component={LegalPage} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/settings" component={Settings} />
        <Route path="/tipster-communities" component={TipsterCommunities} />
        <Route path="/rosters" component={RostersPage} />
        <Route path="/help" component={HelpCenter} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/odds-center" component={OddsCenter} />
        <Route path="/ev-heatmap" component={EVHeatmap} />
        <Route path="/line-movement" component={LineMovement} />
        <Route path="/power-rankings" component={PowerRankings} />
        <Route path="/ticket-history" component={TicketHistory} />
        <Route path="/betting-profile" component={BettingProfile} />
        <Route path="/pro-tools" component={ProTools} />
        <Route path="/prop-parlay-builder" component={PropParlayBuilder} />
        <Route path="/straight-bets" component={StraightBets} />
        <Route path="/sgp" component={SGPGenerator} />
        <Route path="/teasers" component={TeaserGenerator} />
        <Route path="/round-robin" component={RoundRobinGenerator} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/watchlist" component={WatchlistPage} />
        <Route path="/shared-tickets" component={SharedTickets} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

interface AuthState {
  isAdmin?: boolean;
  username?: string;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId: string;
  tooltip: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", icon: Brain, label: "Intelligence", testId: "nav-command-center", tooltip: "Command Center - All intelligence at a glance" },
  { href: "/daily", icon: Calendar, label: "Picks", testId: "nav-daily", tooltip: "Daily Picks - Top picks from today's games" },
  { href: "/generate", icon: Zap, label: "Generate", testId: "nav-generate", tooltip: "Smart Ticket Generator - Build parlays from real data" },
  { href: "/live", icon: Activity, label: "Live", testId: "nav-live", tooltip: "Live Center - Track scores and games in real-time" },
  { href: "/odds-center", icon: TrendingUp, label: "Odds", testId: "nav-odds-center", tooltip: "Odds Center - EV heatmap, line movement, arbitrage" },
  { href: "/pro-tools", icon: Calculator, label: "Tools", testId: "nav-pro-tools", tooltip: "Pro Tools - Calculators, optimizers, analysis" },
  { href: "/admin", icon: Shield, label: "Admin", testId: "nav-admin", tooltip: "Admin Command Center - Business operations", adminOnly: true },
];

function MobileNav({ authState, onLogout, onClose }: { authState: AuthState; onLogout: () => void; onClose: () => void }) {
  const [location] = useLocation();
  
  const adminItems = navItems.filter(item => item.adminOnly);
  const userItems = navItems.filter(item => !item.adminOnly);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 py-4 overflow-y-auto">
        {authState.isAdmin && adminItems.length > 0 && (
          <div className="mb-2">
            <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-500">Admin</div>
            <nav className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}>
                    <div 
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'hover:bg-purple-500/5 text-purple-600 dark:text-purple-400'
                      }`}
                      data-testid={`mobile-${item.testId}`}
                      title={item.tooltip}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="mx-4 my-2 border-b" />
          </div>
        )}
        <nav className="space-y-1">
          {userItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                  data-testid={`mobile-${item.testId}`}
                  title={item.tooltip}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t pt-4 pb-6 px-4 space-y-3">
        <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Build</div>
        <nav className="space-y-1 pb-2">
          {([
            { href: "/builder", icon: LayoutGrid, label: "Parlay Builder", testId: "mobile-nav-builder" },
            { href: "/prop-parlay-builder", icon: Brain, label: "Prop Parlay Builder", testId: "mobile-nav-prop-parlay" },
            { href: "/straight-bets", icon: Target, label: "Straight Bets", testId: "mobile-nav-straight-bets" },
            { href: "/sgp", icon: Layers, label: "Same Game Parlays", testId: "mobile-nav-sgp" },
            { href: "/teasers", icon: ArrowUpDown, label: "Teasers", testId: "mobile-nav-teasers" },
            { href: "/round-robin", icon: Shuffle, label: "Round Robin", testId: "mobile-nav-round-robin" },
          ] as const).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div 
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Analyze</div>
        <nav className="space-y-1 pb-2">
          {([
            { href: "/ev-heatmap", icon: Flame, label: "EV Heatmap", testId: "mobile-nav-ev" },
            { href: "/line-movement", icon: TrendingUp, label: "Line Movement", testId: "mobile-nav-lines" },
            { href: "/power-rankings", icon: BarChart3, label: "Power Rankings", testId: "mobile-nav-rankings" },
            { href: "/rosters", icon: UsersRound, label: "Rosters & Injuries", testId: "mobile-nav-rosters" },
            { href: "/watchlist", icon: Star, label: "Watchlist", testId: "mobile-nav-watchlist" },
            { href: "/tools", icon: Wrench, label: "Tools & Calculators", testId: "mobile-nav-tools" },
          ] as const).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div 
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
        <nav className="space-y-1 pb-2">
          {([
            { href: "/bankroll", icon: Wallet, label: "Bankroll", testId: "mobile-nav-finance" },
            { href: "/ticket-history", icon: History, label: "Bet History", testId: "mobile-nav-history" },
            { href: "/betting-profile", icon: UserCog, label: "Betting Profile", testId: "mobile-nav-betting-profile" },
            { href: "/profile", icon: User, label: "My Profile", testId: "mobile-nav-profile" },
            { href: "/pricing", icon: CreditCard, label: "Plans & Pricing", testId: "mobile-nav-pricing" },
            { href: "/settings", icon: SettingsIcon, label: "Settings", testId: "mobile-nav-settings" },
            { href: "/help", icon: HelpCircle, label: "Help Center", testId: "mobile-nav-help" },
            { href: "/changelog", icon: Megaphone, label: "What's New", testId: "mobile-nav-changelog" },
          ] as const).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div 
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        {authState.username && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{authState.username}</span>
            {authState.isAdmin && (
              <span className="text-xs text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Admin</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { onLogout(); onClose(); }}
            className="flex-1 gap-2"
            data-testid="mobile-button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function DesktopNav({ authState }: { authState: AuthState }) {
  const [location] = useLocation();
  
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => {
        if (item.adminOnly && !authState.isAdmin) return null;
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <div>
                <Link href={item.href}>
                  <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    size="sm" 
                    className="gap-2"
                    data-testid={item.testId}
                    title={item.tooltip}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                </Link>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{item.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function BottomNav({ authState }: { authState: AuthState }) {
  const [location] = useLocation();
  
  const adminItem = navItems.find(item => item.adminOnly);
  let mobileNavItems: NavItem[];
  if (authState.isAdmin && adminItem) {
    mobileNavItems = [...navItems.slice(0, 4), adminItem];
  } else {
    mobileNavItems = navItems.slice(0, 5);
  }
  
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around gap-1 h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 touch-target ${
                  isActive ? 'text-primary' : item.adminOnly ? 'text-purple-500 dark:text-purple-400' : 'text-muted-foreground'
                }`}
                data-testid={`bottom-${item.testId}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AuthenticatedApp({ onLogout, authState }: { onLogout: () => void; authState: AuthState }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-screen-2xl mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent hidden sm:inline">
                  Sors Maxima
                </span>
              </div>
            </Link>
            
            <DesktopNav authState={authState} />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SearchButton />
            </div>
            {authState.username && (
              <span className="text-sm text-muted-foreground hidden lg:inline">
                {authState.username}
                {authState.isAdmin && (
                  <span className="ml-1 text-xs text-purple-500">(Admin)</span>
                )}
              </span>
            )}
            <NotificationsPanel />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2 hidden lg:flex"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">Logout</span>
            </Button>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-6 h-6 rounded" />
                    Sors Maxima
                  </SheetTitle>
                </SheetHeader>
                <MobileNav 
                  authState={authState} 
                  onLogout={handleLogout} 
                  onClose={() => setMobileMenuOpen(false)} 
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 pt-2">
        <GeoComplianceBanner />
      </div>
      
      <main className="min-h-[calc(100vh-3.5rem)] pb-20 lg:pb-0">
        <ParlaySlipProvider>
          <AgeVerificationGate>
            <Router authState={authState} />
          </AgeVerificationGate>
          <ParlaySlipDrawer />
        </ParlaySlipProvider>
      </main>
      
      <footer className="border-t bg-muted/30 py-4 px-4 lg:px-6 mb-16 lg:mb-0">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
            <div className="text-center max-w-xl">
              <p className="text-yellow-600 dark:text-yellow-500">
                For entertainment & educational purposes only. Not gambling advice. 
                No guarantees of profitability. Must be 21+. 
                If you have a gambling problem, call 1-800-522-4700.
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
              <span>© 2026 Sors Maxima</span>
              <Link href="/legal" className="hover:text-primary">Terms</Link>
              <Link href="/legal" className="hover:text-primary">Privacy</Link>
              <Link href="/legal" className="hover:text-primary">Disclaimer</Link>
              <Link href="/help" className="hover:text-primary">Help</Link>
              <Link href="/changelog" className="hover:text-primary">What's New</Link>
              <AffiliateDisclosure compact />
            </div>
          </div>
        </div>
      </footer>
      
      <BottomNav authState={authState} />
      <CommandPalette />
      <CookieConsentBanner />
      <FeedbackWidget />
      <ErrorRecoveryInterceptor />
      <SupportChat />
    </div>
  );
}

function PublicRoutes() {
  const [location] = useLocation();
  
  if (location === '/legal') {
    return <LegalPage />;
  }
  
  if (location === '/pricing') {
    return <Pricing />;
  }
  
  return null;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<AuthState>({});
  const [location] = useLocation();

  const { data: authData, isLoading, refetch } = useQuery<{ authenticated: boolean; isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
    retry: false,
    staleTime: 1000 * 60,
    enabled: location !== '/legal' && location !== '/pricing' && location !== '/help' && location !== '/changelog' && location !== '/login',
  });

  useUTMCapture();

  useEffect(() => {
    if (!isLoading && authData !== undefined) {
      setIsAuthenticated(authData?.authenticated || false);
      if (authData?.authenticated) {
        setAuthState({
          isAdmin: authData.isAdmin,
          username: authData.username
        });
      }
    }
  }, [authData, isLoading]);

  const handleLogin = () => {
    refetch();
    setIsAuthenticated(true);
  };

  if (location === '/legal') {
    return <LegalPage />;
  }

  if (location === '/pricing') {
    return <Pricing />;
  }

  if (location === '/help') {
    return <HelpCenter />;
  }

  if (location === '/changelog') {
    return <ChangelogPage />;
  }

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location === '/login') {
      return <LoginPage onLogin={handleLogin} />;
    }
    return <LandingPage />;
  }

  if (authState.isAdmin && location.startsWith('/admin')) {
    return <AdminApp onLogout={() => setIsAuthenticated(false)} authState={authState} />;
  }

  return <AuthenticatedApp onLogout={() => setIsAuthenticated(false)} authState={authState} />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

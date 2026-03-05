import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ParlaySlipProvider, useParlaySlip } from "@/hooks/use-parlay-slip";
import { ParlaySlipDrawer } from "@/components/parlay-slip-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
const TicketVariations = lazy(() => import("@/pages/ticket-variations"));
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
const AdminQualityWatchdog = lazy(() => import("@/pages/admin-quality-watchdog"));
const AdminPricingIntelligence = lazy(() => import("@/pages/admin-pricing-intelligence"));
const AdminLaunchControl = lazy(() => import("@/pages/admin-launch-control"));
const AdminOwnerPlaybook = lazy(() => import("@/pages/admin-owner-playbook"));
const AdminUpdatePlanner = lazy(() => import("@/pages/admin-update-planner"));
const AdminModelIntegrity = lazy(() => import("@/pages/admin-model-integrity"));
const AdminApiBudget = lazy(() => import("@/pages/admin-api-budget"));
const AdminAutonomous = lazy(() => import("@/pages/admin-autonomous"));
const SportFactorAnalysis = lazy(() => import("@/pages/sport-factor-analysis"));
const PipelineIntelligence = lazy(() => import("@/pages/pipeline"));
const PersonalizedInsights = lazy(() => import("@/pages/personalized-insights"));
const CorrelationMatrix = lazy(() => import("@/pages/correlation-matrix"));
const InternationalPage = lazy(() => import("@/pages/international"));
const MMAPage = lazy(() => import("@/pages/mma"));
const OddsCenter = lazy(() => import("@/pages/odds-center"));
const PropParlayBuilder = lazy(() => import("@/pages/prop-parlay-builder"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const PlatformIntelligencePage = lazy(() => import("@/pages/platform-intelligence"));
const WatchlistPage = lazy(() => import("@/pages/watchlist"));
const PlayerPropsPage = lazy(() => import("@/pages/player-props"));
const StrategyAdvisor = lazy(() => import("@/pages/strategy-advisor"));
const TrackRecordPage = lazy(() => import("@/pages/track-record"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
import { Zap, Wrench, LogOut, Users, Trophy, Wallet, Activity, CreditCard, Shield, Menu, Settings as SettingsIcon, Brain, UsersRound, HelpCircle, User, LayoutGrid, Calendar, ChevronRight, ChevronLeft, Home, TrendingUp, History, Calculator, Star, Database, Compass, MoreHorizontal, Globe, ChevronDown, BarChart2, BookOpen, Eye, Flame, LineChart, Ticket, Sword, MailWarning, X } from "lucide-react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";
import { GeoComplianceBanner } from "@/components/geo-compliance-banner";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { NotificationsPanel } from "@/components/notifications-panel";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { CommandPalette, SearchButton } from "@/components/command-palette";
import { FeedbackWidget } from "@/components/feedback-widget";
import { useUTMCapture } from "@/lib/utm-tracker";
import { ErrorRecoveryInterceptor } from "@/components/error-recovery-interceptor";
import { SupportChat } from "@/components/support-chat";
import { ErrorBoundary } from "@/components/error-boundary";

const ApplyPage = lazy(() => import("@/pages/apply"));

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

const AdminApplications = lazy(() => import("@/pages/admin-applications"));

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
    <ErrorBoundary>
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
              <Route path="/admin/quality-watchdog">{() => <AdminGuard component={AdminQualityWatchdog} authState={authState} />}</Route>
              <Route path="/admin/pricing-intelligence">{() => <AdminGuard component={AdminPricingIntelligence} authState={authState} />}</Route>
              <Route path="/admin/launch-control">{() => <AdminGuard component={AdminLaunchControl} authState={authState} />}</Route>
              <Route path="/admin/owner-playbook">{() => <AdminGuard component={AdminOwnerPlaybook} authState={authState} />}</Route>
              <Route path="/admin/update-planner">{() => <AdminGuard component={AdminUpdatePlanner} authState={authState} />}</Route>
              <Route path="/admin/model-integrity">{() => <AdminGuard component={AdminModelIntegrity} authState={authState} />}</Route>
              <Route path="/admin/api-budget">{() => <AdminGuard component={AdminApiBudget} authState={authState} />}</Route>
              <Route path="/admin/autonomous">{() => <AdminGuard component={AdminAutonomous} authState={authState} />}</Route>
              <Route path="/admin/applications">{() => <AdminGuard component={AdminApplications} authState={authState} />}</Route>
              <Route path="/admin/training">{() => <AdminGuard component={TrainingCenter} authState={authState} />}</Route>
              <Route path="/admin/pipeline">{() => <AdminGuard component={PipelineIntelligence} authState={authState} />}</Route>
              <Route path="/admin/sport-analysis">{() => <AdminGuard component={SportFactorAnalysis} authState={authState} />}</Route>
              <Route path="/admin/correlation-matrix">{() => <AdminGuard component={CorrelationMatrix} authState={authState} />}</Route>
              <Route path="/admin/platform-intelligence">{() => <AdminGuard component={PlatformIntelligencePage} authState={authState} />}</Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
      </main>
    </div>
    </ErrorBoundary>
  );
}

function OnboardingGuard({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const [location, setLocation] = useLocation();
  const { data: onboardingData } = useQuery<{ onboardingCompleted: boolean }>({
    queryKey: ['/api/user/onboarding'],
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !isAdmin,
  });

  useEffect(() => {
    if (isAdmin) return;
    const skipPaths = ['/onboarding', '/pricing', '/settings', '/profile', '/legal', '/help', '/verify-email', '/changelog', '/track-record'];
    if (onboardingData && !onboardingData.onboardingCompleted && !skipPaths.includes(location)) {
      setLocation('/onboarding');
    }
  }, [onboardingData, location, setLocation, isAdmin]);

  return <>{children}</>;
}

function Router({ authState }: { authState: AuthState }) {
  return (
    <ErrorBoundary>
    <OnboardingGuard isAdmin={authState.isAdmin}>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/generate" component={AutoGenerator} />
        <Route path="/strategy" component={StrategyAdvisor} />
        <Route path="/builder" component={Dashboard} />
        <Route path="/daily" component={DailyParlays} />
        <Route path="/tools" component={Tools} />
        <Route path="/community" component={Community} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/bankroll" component={Bankroll} />
        <Route path="/live" component={Live} />
        <Route path="/international" component={InternationalPage} />
        <Route path="/mma" component={MMAPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/apply" component={ApplyPage} />
        <Route path="/legal" component={LegalPage} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/settings" component={Settings} />
        <Route path="/tipster-communities">{() => { const [, setLocation] = useLocation(); setLocation("/community"); return null; }}</Route>
        <Route path="/rosters" component={RostersPage} />
        <Route path="/help" component={HelpCenter} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/odds-center" component={OddsCenter} />
        <Route path="/ev-heatmap">{() => { const [, setLocation] = useLocation(); setLocation("/odds-center"); return null; }}</Route>
        <Route path="/line-movement">{() => { const [, setLocation] = useLocation(); setLocation("/odds-center"); return null; }}</Route>
        <Route path="/power-rankings">{() => { const [, setLocation] = useLocation(); setLocation("/odds-center"); return null; }}</Route>
        <Route path="/ticket-history">{() => { const [, setLocation] = useLocation(); setLocation("/profile"); return null; }}</Route>
        <Route path="/betting-profile">{() => { const [, setLocation] = useLocation(); setLocation("/profile"); return null; }}</Route>
        <Route path="/bet-history">{() => { const [, setLocation] = useLocation(); setLocation("/profile"); return null; }}</Route>
        <Route path="/insights" component={PersonalizedInsights} />
        <Route path="/pro-tools">{() => { const [, setLocation] = useLocation(); setLocation("/tools"); return null; }}</Route>
        <Route path="/player-props" component={PlayerPropsPage} />
        <Route path="/prop-parlay-builder" component={PropParlayBuilder} />
        <Route path="/track-record" component={TrackRecordPage} />
        <Route path="/ticket-variations" component={TicketVariations} />
        <Route path="/straight-bets">{() => { const [, setLocation] = useLocation(); setLocation("/builder"); return null; }}</Route>
        <Route path="/sgp">{() => { const [, setLocation] = useLocation(); setLocation("/builder"); return null; }}</Route>
        <Route path="/teasers">{() => { const [, setLocation] = useLocation(); setLocation("/builder"); return null; }}</Route>
        <Route path="/round-robin">{() => { const [, setLocation] = useLocation(); setLocation("/builder"); return null; }}</Route>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/watchlist" component={WatchlistPage} />
        <Route path="/platform-intelligence">{() => authState.isAdmin ? <PlatformIntelligencePage /> : <NotFound />}</Route>
        <Route path="/shared-tickets">{() => { const [, setLocation] = useLocation(); setLocation("/community"); return null; }}</Route>
        <Route path="/verify-email" component={VerifyEmail} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
    </OnboardingGuard>
    </ErrorBoundary>
  );
}

interface AuthState {
  isAdmin?: boolean;
  username?: string;
  emailVerified?: boolean;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId: string;
  tooltip: string;
  adminOnly?: boolean;
}

// Map every secondary route → { label, parent }
const SECONDARY_ROUTES: Record<string, { label: string; parent: string }> = {
  "/watchlist":            { label: "Watchlist",            parent: "/" },
  "/insights":             { label: "My Insights",          parent: "/" },
  "/track-record":         { label: "Track Record",         parent: "/" },
  "/bankroll":             { label: "Bankroll Manager",     parent: "/" },
  "/rewards":              { label: "Rewards",              parent: "/" },
  "/profile":              { label: "My Profile",           parent: "/" },
  "/settings":             { label: "Settings",             parent: "/" },
  "/help":                 { label: "Help Center",          parent: "/" },
  "/changelog":            { label: "What's New",           parent: "/" },
  "/roadmap":              { label: "Roadmap",              parent: "/" },
  "/legal":                { label: "Legal",                parent: "/" },
  "/pricing":              { label: "Pricing & Plans",      parent: "/" },
  "/rosters":              { label: "Rosters & Injuries",   parent: "/tools" },
  "/sport-factor-analysis":{ label: "Factor Analysis",      parent: "/tools" },
  "/pipeline":             { label: "Intelligence Pipeline",parent: "/tools" },
  "/admin/platform-intelligence":{ label: "Platform Intelligence",parent: "/admin" },
  "/correlation-matrix":   { label: "Correlation Matrix",  parent: "/tools" },
  "/training":             { label: "Training Center",      parent: "/tools" },
  "/prop-parlay-builder":  { label: "Prop Parlay Builder",  parent: "/builder" },
  "/strategy":             { label: "Strategy Advisor",     parent: "/" },
  "/onboarding":           { label: "Onboarding",           parent: "/" },
  "/dashboard":            { label: "Dashboard",            parent: "/" },
};

const PRIMARY_NAV_HREFS = new Set(["/", "/daily", "/generate", "/strategy", "/player-props", "/builder", "/odds-center", "/live", "/international", "/mma", "/community", "/tools"]);

// Static parent labels (can't reference navItems since it's defined below)
const PARENT_LABELS: Record<string, string> = {
  "/":        "Home",
  "/tools":   "Tools",
  "/builder": "Builder",
  "/daily":   "Daily Picks",
  "/community": "Community",
};

function ContextualNavBar() {
  const [location] = useLocation();
  const route = SECONDARY_ROUTES[location];

  if (!route || PRIMARY_NAV_HREFS.has(location)) return null;

  const parentLabel = PARENT_LABELS[route.parent] ?? "Home";
  const parentHref = route.parent || "/";

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = parentHref;
    }
  };

  return (
    <div className="w-full border-b bg-muted/30" data-testid="contextual-nav-bar">
      <div className="max-w-screen-2xl mx-auto flex h-9 items-center gap-1.5 px-4 lg:px-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          data-testid="button-nav-back"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <span className="text-muted-foreground/30 text-xs select-none">·</span>

        {parentHref !== "/" ? (
          <>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0" data-testid="link-nav-home-crumb">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <Link href={parentHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0" data-testid="link-nav-parent">
              {parentLabel}
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          </>
        ) : (
          <>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0" data-testid="link-nav-home-crumb">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          </>
        )}

        <span className="text-sm font-medium truncate" data-testid="text-nav-current-page">{route.label}</span>

        <div className="ml-auto shrink-0">
          <Link href="/" data-testid="link-nav-home">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Go to Picks">
              <Home className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const navItems: NavItem[] = [
  { href: "/", icon: Zap, label: "Picks", testId: "nav-command-center", tooltip: "Command Center — all engines live" },
  { href: "/daily", icon: Calendar, label: "Daily", testId: "nav-daily", tooltip: "Today's top picks" },
  { href: "/generate", icon: Brain, label: "Build", testId: "nav-generate", tooltip: "Build parlays from real data" },
  { href: "/odds-center", icon: TrendingUp, label: "Markets", testId: "nav-odds-center", tooltip: "Odds, EV & line movement" },
  { href: "/tools", icon: Calculator, label: "Tools", testId: "nav-pro-tools", tooltip: "Analytics & calculators" },
  { href: "/community", icon: Users, label: "Community", testId: "nav-community", tooltip: "Leaderboards, social feed & tipsters" },
  { href: "/admin", icon: Shield, label: "Admin", testId: "nav-admin", tooltip: "Admin Command Center", adminOnly: true },
];

const BUILD_SUBITEMS = [
  { href: "/generate", icon: Brain, label: "Smart Generator", desc: "AI builds the optimal parlay for you" },
  { href: "/builder", icon: LayoutGrid, label: "Parlay Builder", desc: "Manually drag & drop your own ticket" },
  { href: "/strategy", icon: Compass, label: "Strategy Advisor", desc: "Expert guidance for your betting style" },
];

const MARKETS_SUBITEMS = [
  { href: "/odds-center", icon: TrendingUp, label: "Odds Center", desc: "EV heatmap, line movement & arbitrage" },
  { href: "/player-props", icon: Star, label: "Player Props", desc: "Over/under projections for every player" },
  { href: "/mma", icon: Sword, label: "MMA / UFC", desc: "Market-consensus fight picks with EV analysis" },
  { href: "/international", icon: Globe, label: "International", desc: "Soccer leagues, draws & underdog value" },
  { href: "/live", icon: Activity, label: "Live Scores", desc: "Real-time scores & in-game tracking" },
];

function MobileNavLink({ href, icon: Icon, label, testId, isActive, onClick }: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; testId: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`} data-testid={testId}>
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </div>
    </Link>
  );
}

function MobileNav({ authState, onLogout, onClose }: { authState: AuthState; onLogout: () => void; onClose: () => void }) {
  const [location] = useLocation();

  const navSection = (title: string, items: { href: string; icon: React.ComponentType<{className?:string}>; label: string; testId: string }[]) => (
    <div>
      <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <nav className="space-y-0.5">
        {items.map(item => (
          <MobileNavLink key={item.testId} href={item.href} icon={item.icon} label={item.label} testId={item.testId} isActive={location === item.href} onClick={onClose} />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 py-2 space-y-1">
        {authState.isAdmin && (
          <div>
            <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-500">Admin</div>
            <nav>
              <Link href="/admin" onClick={onClose}>
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${location === '/admin' ? 'bg-purple-500/15 text-purple-500' : 'hover:bg-purple-500/10 text-purple-500'}`} data-testid="mobile-nav-admin">
                  <Shield className="w-4 h-4" />
                  <span>Admin Center</span>
                </div>
              </Link>
            </nav>
          </div>
        )}

        {navSection("Picks", [
          { href: "/", icon: Zap, label: "Command Center", testId: "mobile-nav-picks" },
          { href: "/daily", icon: Calendar, label: "Daily Picks", testId: "mobile-nav-daily" },
        ])}

        {navSection("Build", [
          { href: "/generate", icon: Brain, label: "Smart Generator", testId: "mobile-nav-generate" },
          { href: "/builder", icon: LayoutGrid, label: "Parlay Builder", testId: "mobile-nav-builder" },
          { href: "/strategy", icon: Compass, label: "Strategy Advisor", testId: "mobile-nav-strategy" },
        ])}

        {navSection("Markets", [
          { href: "/odds-center", icon: TrendingUp, label: "Odds Center", testId: "mobile-nav-odds" },
          { href: "/player-props", icon: Star, label: "Player Props", testId: "mobile-nav-props" },
          { href: "/mma", icon: Sword, label: "MMA / UFC", testId: "mobile-nav-mma" },
          { href: "/international", icon: Globe, label: "International", testId: "mobile-nav-international" },
          { href: "/live", icon: Activity, label: "Live Scores", testId: "mobile-nav-live" },
        ])}

        {navSection("Discover", [
          { href: "/tools", icon: Calculator, label: "Tools & Analytics", testId: "mobile-nav-tools" },
          { href: "/community", icon: Users, label: "Community", testId: "mobile-nav-community" },
          { href: "/watchlist", icon: Eye, label: "My Watchlist", testId: "mobile-nav-watchlist" },
          { href: "/track-record", icon: BarChart2, label: "Track Record", testId: "mobile-nav-track-record" },
        ])}

        {navSection("Account", [
          { href: "/profile", icon: User, label: "My Profile", testId: "mobile-nav-profile" },
          { href: "/bankroll", icon: Wallet, label: "Bankroll Manager", testId: "mobile-nav-bankroll" },
          { href: "/insights", icon: LineChart, label: "My Insights", testId: "mobile-nav-insights" },
          { href: "/pricing", icon: CreditCard, label: "Plans & Pricing", testId: "mobile-nav-pricing" },
          { href: "/settings", icon: SettingsIcon, label: "Settings", testId: "mobile-nav-settings" },
          { href: "/help", icon: HelpCircle, label: "Help Center", testId: "mobile-nav-help" },
        ])}
      </div>

      <div className="border-t p-4 space-y-3">
        {authState.username && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {authState.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm font-medium">{authState.username}</div>
            {authState.isAdmin && <Badge variant="secondary" className="text-xs py-0">Admin</Badge>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => { onLogout(); onClose(); }} className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="mobile-button-logout">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function NavDropdown({ label, icon: Icon, testId, subitems, isActive }: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  subitems: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[];
  isActive: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-1.5" data-testid={testId}>
          <Icon className="w-4 h-4" />
          <span className="hidden xl:inline">{label}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1.5">
        {subitems.map(item => {
          const SubIcon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <DropdownMenuItem className="flex items-start gap-3 p-2.5 rounded-md cursor-pointer">
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <SubIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </DropdownMenuItem>
            </Link>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopNav({ authState }: { authState: AuthState }) {
  const [location] = useLocation();

  const isBuildActive = ["/generate", "/builder", "/strategy"].includes(location);
  const isMarketsActive = ["/odds-center", "/player-props", "/international", "/mma", "/live"].includes(location);

  const NavBtn = ({ href, icon: Icon, label, testId, tooltip }: { href: string; icon: React.ComponentType<{className?:string}>; label: string; testId: string; tooltip: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>
          <Button variant={location === href ? "secondary" : "ghost"} size="sm" className="gap-1.5" data-testid={testId}>
            <Icon className="w-4 h-4" />
            <span className="hidden xl:inline">{label}</span>
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom"><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  );

  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      <NavBtn href="/" icon={Zap} label="Picks" testId="nav-command-center" tooltip="Command Center — all engines live" />
      <NavBtn href="/daily" icon={Calendar} label="Daily" testId="nav-daily" tooltip="Today's top picks" />
      <NavDropdown label="Build" icon={Brain} testId="nav-build-dropdown" subitems={BUILD_SUBITEMS} isActive={isBuildActive} />
      <NavDropdown label="Markets" icon={TrendingUp} testId="nav-markets-dropdown" subitems={MARKETS_SUBITEMS} isActive={isMarketsActive} />
      <NavBtn href="/tools" icon={Calculator} label="Tools" testId="nav-pro-tools" tooltip="Analytics & calculators" />
      <NavBtn href="/community" icon={Users} label="Community" testId="nav-community" tooltip="Leaderboards, social feed & tipsters" />
      {authState.isAdmin && (
        <Link href="/admin">
          <Button variant={location === "/admin" ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-purple-500" data-testid="nav-admin">
            <Shield className="w-4 h-4" />
            <span className="hidden xl:inline">Admin</span>
          </Button>
        </Link>
      )}
    </nav>
  );
}

function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [location] = useLocation();
  const { legCount, setMobileOpen } = useParlaySlip();

  const coreItems = [
    { href: "/", icon: Zap, label: "Picks", testId: "bottom-nav-picks" },
    { href: "/daily", icon: Calendar, label: "Daily", testId: "bottom-nav-daily" },
    { href: "/generate", icon: Brain, label: "Build", testId: "bottom-nav-build" },
    { href: "/odds-center", icon: TrendingUp, label: "Markets", testId: "bottom-nav-markets" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around gap-0 h-16">
        {coreItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[56px] touch-target ${isActive ? 'text-primary' : 'text-muted-foreground'}`} data-testid={item.testId}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <button
          onClick={() => setMobileOpen(true)}
          className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[56px] touch-target text-primary"
          data-testid="bottom-nav-slip"
          aria-label="Open bet slip"
        >
          <div className="relative">
            <Ticket className="w-5 h-5" />
            {legCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                {legCount > 9 ? "9+" : legCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Slip</span>
        </button>

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[56px] touch-target text-muted-foreground"
          data-testid="bottom-nav-more"
          aria-label="More navigation"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

function MobileBackOrLogo() {
  const [location] = useLocation();
  const isSecondary = Boolean(SECONDARY_ROUTES[location]) && !PRIMARY_NAV_HREFS.has(location);

  if (isSecondary) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          data-testid="button-mobile-header-back"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent hidden sm:inline">
              Sors Maxima
            </span>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <Link href="/">
      <div className="flex items-center gap-2 cursor-pointer">
        <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-lg bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent hidden sm:inline">
          Sors Maxima
        </span>
      </div>
    </Link>
  );
}

function UserMenu({ authState, onLogout }: { authState: AuthState; onLogout: () => void }) {
  const initial = authState.username?.charAt(0).toUpperCase() ?? "U";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="hidden lg:flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
          data-testid="button-user-menu"
          aria-label="Account menu"
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
            {initial}
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 pb-2">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">{initial}</div>
          <div>
            <div className="text-sm font-medium leading-none">{authState.username}</div>
            {authState.isAdmin && <div className="text-xs text-purple-500 mt-0.5">Admin</div>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile"><DropdownMenuItem className="gap-2 cursor-pointer"><User className="w-4 h-4" />My Profile</DropdownMenuItem></Link>
        <Link href="/track-record"><DropdownMenuItem className="gap-2 cursor-pointer"><BarChart2 className="w-4 h-4" />Track Record</DropdownMenuItem></Link>
        <Link href="/watchlist"><DropdownMenuItem className="gap-2 cursor-pointer"><Eye className="w-4 h-4" />Watchlist</DropdownMenuItem></Link>
        <Link href="/bankroll"><DropdownMenuItem className="gap-2 cursor-pointer"><Wallet className="w-4 h-4" />Bankroll</DropdownMenuItem></Link>
        <Link href="/insights"><DropdownMenuItem className="gap-2 cursor-pointer"><LineChart className="w-4 h-4" />My Insights</DropdownMenuItem></Link>
        <DropdownMenuSeparator />
        <Link href="/pricing"><DropdownMenuItem className="gap-2 cursor-pointer"><CreditCard className="w-4 h-4" />Plans & Pricing</DropdownMenuItem></Link>
        <Link href="/settings"><DropdownMenuItem className="gap-2 cursor-pointer"><SettingsIcon className="w-4 h-4" />Settings</DropdownMenuItem></Link>
        <Link href="/help"><DropdownMenuItem className="gap-2 cursor-pointer"><HelpCircle className="w-4 h-4" />Help Center</DropdownMenuItem></Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmailVerificationBanner({ authState }: { authState: AuthState }) {
  const [, setLocation] = useLocation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (authState.isAdmin || authState.emailVerified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm mt-2" data-testid="banner-email-verification">
      <MailWarning className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="text-amber-700 dark:text-amber-400 flex-1">
        <span className="font-medium">Please verify your email address</span>
        {" "}— check your inbox for the verification code.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {sent ? (
          <span className="text-xs text-green-600 dark:text-green-400">Sent!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-xs underline text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 disabled:opacity-50"
            data-testid="button-resend-verification"
          >
            {sending ? "Sending..." : "Resend code"}
          </button>
        )}
        <button
          onClick={() => setLocation("/verify-email")}
          className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded font-medium transition-colors"
          data-testid="button-verify-email"
        >
          Verify now
        </button>
      </div>
    </div>
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-screen-2xl mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <MobileBackOrLogo />
            <DesktopNav authState={authState} />
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">
              <SearchButton />
            </div>
            <NotificationsPanel />
            <ThemeToggle />
            <UserMenu authState={authState} onLogout={handleLogout} />
            
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

      <ContextualNavBar />

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 pt-2">
        <GeoComplianceBanner />
        <EmailVerificationBanner authState={authState} />
      </div>
      
      <ParlaySlipProvider username={authState.username} canUseMultiSlip={authState.isAdmin || ["elite", "whale"].includes(authData?.tier ?? "")}>
        <main className="min-h-[calc(100vh-3.5rem)] pb-20 lg:pb-0">
          <Router authState={authState} />
        </main>

        <footer className="border-t bg-muted/30 py-4 px-4 lg:px-6 mb-16 lg:mb-0">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
              <div className="text-center max-w-2xl space-y-1">
                <p className="text-yellow-600 dark:text-yellow-500 font-medium">
                  For informational and entertainment purposes only. Statistical analysis — not gambling advice.
                  No guarantee of winnings. Past model performance does not predict future results.
                </p>
                <p className="text-muted-foreground/70">
                  Must be 21+ and located in a jurisdiction where sports betting is legal.
                  Please comply with all applicable local, state, and federal laws before placing any wager.
                  {" "}<span className="text-yellow-600 dark:text-yellow-500">Problem gambling? Call 1-800-522-4700 (NCPG) — free, confidential, 24/7.</span>
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                <span>© 2026 Sors Maxima</span>
                <Link href="/legal" className="hover:text-primary">Terms</Link>
                <Link href="/legal" className="hover:text-primary">Privacy</Link>
                <Link href="/legal" className="hover:text-primary">Disclaimer</Link>
                <Link href="/help" className="hover:text-primary">Help</Link>
                <Link href="/changelog" className="hover:text-primary">What's New</Link>
                <Link href="/roadmap" className="hover:text-primary">Roadmap</Link>
                <AffiliateDisclosure compact />
              </div>
            </div>
          </div>
        </footer>

        <ParlaySlipDrawer />
        <BottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
      </ParlaySlipProvider>

      <CommandPalette />
      <CookieConsentBanner />
      <FeedbackWidget />
      <ErrorRecoveryInterceptor />
      <SupportChat />
    </div>
  );
}

const PageSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function PublicRoutes() {
  const [location] = useLocation();
  
  if (location === '/legal') {
    return <Suspense fallback={<PageSpinner />}><LegalPage /></Suspense>;
  }
  
  if (location === '/pricing') {
    return <Suspense fallback={<PageSpinner />}><Pricing /></Suspense>;
  }
  
  return null;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<AuthState>({});
  const [location, setLocation] = useLocation();

  const { data: authData, isLoading, refetch } = useQuery<{ authenticated: boolean; isAdmin?: boolean; username?: string; tier?: string; emailVerified?: boolean }>({
    queryKey: ["/api/auth/check"],
    retry: false,
    staleTime: 1000 * 60,
    enabled: location !== '/legal' && location !== '/pricing' && location !== '/help' && location !== '/changelog' && location !== '/login' && location !== '/verify-email' && location !== '/apply' && location !== '/reset-password',
  });

  useUTMCapture();

  useEffect(() => {
    if (!isLoading && authData !== undefined) {
      setIsAuthenticated(authData?.authenticated || false);
      if (authData?.authenticated) {
        setAuthState({
          isAdmin: authData.isAdmin,
          username: authData.username,
          emailVerified: authData.emailVerified
        });
      }
    }
  }, [authData, isLoading]);

  const handleLogin = (isAdmin?: boolean, username?: string) => {
    setIsAuthenticated(true);
    if (isAdmin !== undefined || username !== undefined) {
      setAuthState({ isAdmin: isAdmin || false, username });
    }
    refetch();
    setLocation('/');
  };

  if (location === '/legal') {
    return <Suspense fallback={<PageSpinner />}><LegalPage /></Suspense>;
  }

  if (location === '/pricing') {
    return <Suspense fallback={<PageSpinner />}><Pricing /></Suspense>;
  }

  if (location === '/help') {
    return <Suspense fallback={<PageSpinner />}><HelpCenter /></Suspense>;
  }

  if (location === '/changelog') {
    return <Suspense fallback={<PageSpinner />}><ChangelogPage /></Suspense>;
  }

  if (location === '/track-record') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <TrackRecordPage />
      </Suspense>
    );
  }

  if (location === '/login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (location === '/reset-password') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  if (location === '/verify-email') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <VerifyEmail />
      </Suspense>
    );
  }

  if (location === '/apply') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <ApplyPage />
      </Suspense>
    );
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
    return <LandingPage />;
  }

  if (!authState.isAdmin) {
    const tier = authData?.tier;
    if (isLoading || !tier) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying subscription...</p>
          </div>
        </div>
      );
    }
    if (tier === 'free') {
      const exemptPaths = ['/pricing', '/settings', '/legal', '/help', '/changelog', '/track-record'];
      if (!exemptPaths.some(p => location === p || location.startsWith(p + '/'))) {
        return (
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <Pricing />
          </Suspense>
        );
      }
    }
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

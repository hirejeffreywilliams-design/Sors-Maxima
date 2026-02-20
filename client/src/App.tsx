import { useState, useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import NotFound from "@/pages/not-found";
import AutoGenerator from "@/pages/auto-generator";
import Dashboard from "@/pages/dashboard";
import BetHistory from "@/pages/bet-history";
import LoginPage from "@/pages/login";
import DailyParlays from "@/pages/daily-parlays";
import Tools from "@/pages/tools";
import Community from "@/pages/community";
import Rewards from "@/pages/rewards";
import Bankroll from "@/pages/bankroll";
import Live from "@/pages/live";
import Pricing from "@/pages/pricing";
import AdminDashboard from "@/pages/admin";
import AdminDiagnostics from "@/pages/admin-diagnostics";
import AdminMarketing from "@/pages/admin-marketing";
import AdminSecurity from "@/pages/admin-security";
import AdminGrowth from "@/pages/admin-growth";
import AdminFeatureFlags from "@/pages/admin-feature-flags";
import LandingPage from "@/pages/landing";
import LegalPage from "@/pages/legal";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import TipsterCommunities from "@/pages/tipster-communities";
import TrainingCenter from "@/pages/training-center";
import RostersPage from "@/pages/rosters";
import HelpCenter from "@/pages/help";
import ProfilePage from "@/pages/profile";
import ChangelogPage from "@/pages/changelog";
import AdminModelPerformance from "@/pages/admin-model-performance";
import AdminDataProvenance from "@/pages/admin-data-provenance";
import AdminRiskRegister from "@/pages/admin-risk-register";
import AdminFinancialProjections from "@/pages/admin-financial-projections";
import Roadmap from "@/pages/roadmap";
import AdminUserHealth from "@/pages/admin-user-health";
import AdminSupportDashboard from "@/pages/admin-support";
import AdminFraudDashboard from "@/pages/admin-fraud";
import AdminABTests from "@/pages/admin-ab-tests";
import AdminLifecycleCampaigns from "@/pages/admin-lifecycle-campaigns";
import AdminSegmentation from "@/pages/admin-segmentation";
import AdminPromos from "@/pages/admin-promos";
import AdminAcquisition from "@/pages/admin-acquisition";
import AdminAnalyticsDashboard from "@/pages/admin-analytics";
import AdminOrchestration from "@/pages/admin-orchestration";
import SportFactorAnalysis from "@/pages/sport-factor-analysis";
import PipelineIntelligence from "@/pages/pipeline";
import { Zap, Wrench, LogOut, Users, Trophy, Wallet, Activity, CreditCard, Shield, Menu, X, Settings as SettingsIcon, Brain, GraduationCap, UsersRound, HelpCircle, Megaphone, User, LayoutGrid, Map, FlaskConical, GitBranch } from "lucide-react";
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

function AdminGuard({ component: Component, authState }: { component: React.ComponentType; authState: AuthState }) {
  if (!authState.isAdmin) {
    return <NotFound />;
  }
  return <Component />;
}

function Router({ authState }: { authState: AuthState }) {
  return (
    <Switch>
      <Route path="/" component={AutoGenerator} />
      <Route path="/builder" component={Dashboard} />
      <Route path="/tracker" component={BetHistory} />
      <Route path="/daily" component={DailyParlays} />
      <Route path="/tools" component={Tools} />
      <Route path="/community" component={Community} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/bankroll" component={Bankroll} />
      <Route path="/live" component={Live} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/legal" component={LegalPage} />
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
      <Route path="/roadmap" component={Roadmap} />
      <Route path="/settings" component={Settings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/tipster-communities" component={TipsterCommunities} />
      <Route path="/training">{() => <AdminGuard component={TrainingCenter} authState={authState} />}</Route>
      <Route path="/rosters" component={RostersPage} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/changelog" component={ChangelogPage} />
      <Route path="/sport-analysis" component={SportFactorAnalysis} />
      <Route path="/pipeline" component={PipelineIntelligence} />
      <Route path="/landing" component={LandingPage} />
      <Route component={NotFound} />
    </Switch>
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
  { href: "/", icon: Zap, label: "Generate", testId: "nav-generate", tooltip: "AI-powered Smart Ticket Generator - Create optimized parlays" },
  { href: "/builder", icon: LayoutGrid, label: "Builder", testId: "nav-builder", tooltip: "Visual Parlay Builder - Drag-and-drop interface for building tickets" },
  { href: "/live", icon: Activity, label: "Live", testId: "nav-live", tooltip: "Live betting center - Track games and hedge in real-time" },
  { href: "/tools", icon: Wrench, label: "Tools", testId: "nav-tools", tooltip: "Pro tools - Odds comparison, correlations, ML projections" },
  { href: "/sport-analysis", icon: FlaskConical, label: "Factors", testId: "nav-sport-analysis", tooltip: "Sport Factor Analysis - Deep dive into 100+ factors across 14 sports" },
  { href: "/pipeline", icon: GitBranch, label: "Pipeline", testId: "nav-pipeline", tooltip: "Advanced Prediction Pipeline - 12-module intelligence engine" },
  { href: "/rosters", icon: UsersRound, label: "Rosters", testId: "nav-rosters", tooltip: "Live team rosters, coaches, and injury reports" },
  { href: "/community", icon: Users, label: "Community", testId: "nav-community", tooltip: "Social features - Leaderboards, tipsters, share picks" },
  { href: "/rewards", icon: Trophy, label: "Rewards", testId: "nav-rewards", tooltip: "Daily challenges, achievements, and paper trading" },
  { href: "/bankroll", icon: Wallet, label: "Finance", testId: "nav-finance", tooltip: "Track bets, ROI, multi-book balances, and taxes" },
  { href: "/settings", icon: SettingsIcon, label: "Settings", testId: "nav-settings", tooltip: "Notifications, responsible gaming, and backup" },
  { href: "/roadmap", icon: Map, label: "Roadmap", testId: "nav-roadmap", tooltip: "Product roadmap - See what's coming next" },
  { href: "/pricing", icon: CreditCard, label: "Upgrade", testId: "nav-pricing", tooltip: "Upgrade to Pro for unlimited features" },
  { href: "/admin", icon: Shield, label: "Admin", testId: "nav-admin", tooltip: "Admin dashboard - User management and stats", adminOnly: true },
  { href: "/admin/diagnostics", icon: Brain, label: "Diagnostics", testId: "nav-diagnostics", tooltip: "AI-powered system diagnostics", adminOnly: true },
  { href: "/training", icon: GraduationCap, label: "Training", testId: "nav-training", tooltip: "Algorithm Training Center - Test predictions before launch", adminOnly: true },
];

function MobileNav({ authState, onLogout, onClose }: { authState: AuthState; onLogout: () => void; onClose: () => void }) {
  const [location] = useLocation();
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && !authState.isAdmin) return null;
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
        <nav className="space-y-1 pb-2">
          {[
            { href: "/profile", icon: User, label: "My Profile", testId: "mobile-nav-profile" },
            { href: "/help", icon: HelpCircle, label: "Help Center", testId: "mobile-nav-help" },
            { href: "/changelog", icon: Megaphone, label: "What's New", testId: "mobile-nav-changelog" },
          ].map((item) => {
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
  
  const mobileNavItems = navItems.slice(0, 5).filter(item => !item.adminOnly || authState.isAdmin);
  
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 touch-target ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
        <AgeVerificationGate>
          <Router authState={authState} />
        </AgeVerificationGate>
      </main>
      
      <footer className="hidden lg:block border-t bg-muted/30 py-4 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span>© 2026 Sors Maxima</span>
              <Link href="/legal" className="hover:text-primary">Terms</Link>
              <Link href="/legal" className="hover:text-primary">Privacy</Link>
              <Link href="/legal" className="hover:text-primary">Disclaimer</Link>
              <Link href="/help" className="hover:text-primary">Help</Link>
              <Link href="/changelog" className="hover:text-primary">What's New</Link>
            </div>
            <div className="flex items-center gap-4">
              <AffiliateDisclosure compact />
            </div>
            <div className="text-center md:text-right max-w-xl">
              <p className="text-yellow-600 dark:text-yellow-500">
                For entertainment & educational purposes only. Not gambling advice. 
                No guarantees of profitability. Must be 21+. 
                If you have a gambling problem, call 1-800-522-4700.
              </p>
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

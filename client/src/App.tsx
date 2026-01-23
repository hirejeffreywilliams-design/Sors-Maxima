import { useState, useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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
import { TrendingUp, Zap, History, Wrench, LogOut, Settings, Users, Trophy, Wallet, Activity, CreditCard, Shield } from "lucide-react";

function Router() {
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
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function NavLink({ href, icon: Icon, children, testId }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; testId?: string }) {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link href={href}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        size="sm" 
        className="gap-2"
        data-testid={testId}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{children}</span>
      </Button>
    </Link>
  );
}

interface AuthState {
  isAdmin?: boolean;
  username?: string;
}

function AuthenticatedApp({ onLogout, authState }: { onLogout: () => void; authState: AuthState }) {
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
        <div className="max-w-screen-2xl mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                  Sors Maxima
                </span>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <NavLink href="/" icon={Zap} testId="nav-generate">Generate</NavLink>
              <NavLink href="/live" icon={Activity} testId="nav-live">Live</NavLink>
              <NavLink href="/tools" icon={Wrench} testId="nav-tools">Tools</NavLink>
              <NavLink href="/community" icon={Users} testId="nav-community">Social</NavLink>
              <NavLink href="/rewards" icon={Trophy} testId="nav-rewards">Rewards</NavLink>
              <NavLink href="/bankroll" icon={Wallet} testId="nav-bankroll">Bankroll</NavLink>
              <NavLink href="/tracker" icon={History} testId="nav-tracker">History</NavLink>
              <NavLink href="/pricing" icon={CreditCard} testId="nav-pricing">Upgrade</NavLink>
              {authState.isAdmin && (
                <NavLink href="/admin" icon={Shield} testId="nav-admin">Admin</NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {authState.username && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {authState.username}
                {authState.isAdmin && (
                  <span className="ml-1 text-xs text-purple-500">(Admin)</span>
                )}
              </span>
            )}
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)]">
        <Router />
      </main>
    </div>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<AuthState>({});

  const { data: authData, isLoading, refetch } = useQuery<{ authenticated: boolean; isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
    retry: false,
    staleTime: 1000 * 60,
  });

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
    return <LoginPage onLogin={handleLogin} />;
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

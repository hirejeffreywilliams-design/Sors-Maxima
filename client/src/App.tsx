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
import { TrendingUp, Zap, History, Wrench, LogOut, Settings } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AutoGenerator} />
      <Route path="/builder" component={Dashboard} />
      <Route path="/tracker" component={BetHistory} />
      <Route path="/daily" component={DailyParlays} />
      <Route path="/tools" component={Tools} />
      <Route component={NotFound} />
    </Switch>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link href={href}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        size="sm" 
        className={`gap-2 ${isActive ? "bg-primary/10 text-primary" : ""}`}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{children}</span>
      </Button>
    </Link>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
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
                  ParlayPro
                </span>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <NavLink href="/" icon={Zap}>Generate</NavLink>
              <NavLink href="/builder" icon={Settings}>Builder</NavLink>
              <NavLink href="/tools" icon={Wrench}>Pro Tools</NavLink>
              <NavLink href="/tracker" icon={History}>History</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
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

  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/check"],
    retry: false,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!isLoading && authData !== undefined) {
      setIsAuthenticated((authData as any)?.authenticated || false);
    }
  }, [authData, isLoading]);

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
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AuthenticatedApp onLogout={() => setIsAuthenticated(false)} />;
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

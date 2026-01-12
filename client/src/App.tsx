import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import BetHistory from "@/pages/bet-history";
import { TrendingUp, Home, History, Zap, Target, BarChart3 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tracker" component={BetHistory} />
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

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
                    <NavLink href="/" icon={Home}>Optimizer</NavLink>
                    <NavLink href="/tracker" icon={History}>Tracker</NavLink>
                  </nav>
                </div>
                <ThemeToggle />
              </div>
            </header>
            <main className="min-h-[calc(100vh-3.5rem)]">
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

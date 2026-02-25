import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Sparkles, BarChart3, Zap, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";
import { useSEO } from "@/hooks/use-seo";

const quickLinks = [
  { href: "/", label: "Smart Ticket Generator", description: "Build parlays from real ESPN data", icon: Sparkles },
  { href: "/builder", label: "Visual Parlay Builder", description: "Drag-and-drop ticket builder", icon: Zap },
  { href: "/tools", label: "Pro Tools", description: "Odds comparison & analytics", icon: BarChart3 },
];

export default function NotFound() {
  useSEO({ title: "Page Not Found", description: "The requested page could not be found" });
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate("/");
    }
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border/60">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src={sorsMaximaLogo}
                alt="Sors Maxima"
                className="w-16 h-16 rounded-xl"
                data-testid="img-logo"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent" data-testid="text-brand-name">
                Sors Maxima
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-not-found-message">
                This page doesn't exist. Taking you home in {countdown}s...
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Quick Links</p>
            <div className="grid gap-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover-elevate cursor-pointer"
                    data-testid={`link-quicknav-${link.href.replace("/", "") || "home"}`}
                  >
                    <div className="p-2 rounded-md bg-muted shrink-0">
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="gap-1"
              data-testid="button-go-back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go Back
            </Button>
            <Link href="/">
              <Button size="sm" className="gap-1" data-testid="button-go-home">
                <Home className="h-3.5 w-3.5" />
                Go Home Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Sparkles, BarChart3, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

const quickLinks = [
  { href: "/", label: "Smart Ticket Generator", icon: Sparkles },
  { href: "/builder", label: "Visual Parlay Builder", icon: Zap },
  { href: "/tools", label: "Pro Tools", icon: BarChart3 },
];

export default function NotFound() {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-5xl font-bold text-muted-foreground/30" data-testid="text-404-code">404</p>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-404-title">
              Page Not Found
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-404-description">
              This page doesn't exist. Redirecting to home in {countdown}s...
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Links</p>
            <div className="grid gap-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    data-testid={`link-quicknav-${link.href.replace("/", "") || "home"}`}
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
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

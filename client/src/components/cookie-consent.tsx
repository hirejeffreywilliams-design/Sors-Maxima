import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, X } from "lucide-react";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "sors-maxima-cookie-consent";

export function grantCookieConsent() {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, timestamp: Date.now() }));
  } catch {}
}

export function getCookieConsent(): { accepted: boolean } | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  const { data: authData } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/check"],
  });

  useEffect(() => {
    const consent = getCookieConsent();
    if (consent) return;

    if (authData?.authenticated) {
      grantCookieConsent();
      return;
    }

    if (authData?.authenticated === false) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [authData]);

  const handleAccept = () => {
    grantCookieConsent();
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: false, timestamp: Date.now() }));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-[60] flex justify-center pointer-events-none">
      <Card className="max-w-lg w-full p-4 pointer-events-auto shadow-lg border">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">We value your privacy</p>
              <p className="text-xs text-muted-foreground mt-1">
                We use cookies and similar technologies to improve your experience, analyze traffic, and personalize content.
                By accepting, you consent to our use of cookies as described in our{" "}
                <Link href="/legal" className="text-primary underline">Privacy Policy</Link>.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={handleAccept} data-testid="button-cookie-accept">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} data-testid="button-cookie-decline">
                Essential Only
              </Button>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={handleDecline} className="shrink-0" data-testid="button-cookie-dismiss">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, AlertTriangle, X } from "lucide-react";

interface GeoStatus {
  ip: string;
  proxyDetected: boolean;
  vpnSuspected: boolean;
  warning: string | null;
}

export function GeoComplianceBanner() {
  const [geoStatus, setGeoStatus] = useState<GeoStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkGeo = async () => {
      try {
        const res = await fetch("/api/geo/check");
        if (res.ok) {
          const data = await res.json();
          setGeoStatus(data);
        }
      } catch {
        // silently fail
      }
    };
    
    const wasDismissed = sessionStorage.getItem("sors_geo_dismissed");
    if (!wasDismissed) {
      checkGeo();
    }
  }, []);

  if (dismissed || !geoStatus?.vpnSuspected) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("sors_geo_dismissed", "true");
  };

  return (
    <Alert className="relative" data-testid="alert-geo-compliance">
      <MapPin className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Location Notice
      </AlertTitle>
      <AlertDescription className="text-xs">
        <p>
          We detected that you may be using a VPN or proxy service. Sports betting regulations 
          vary by jurisdiction. Please ensure you are accessing this platform from a location 
          where online sports betting analysis is legal.
        </p>
        <p className="mt-1 text-muted-foreground">
          Sors Maxima does not facilitate actual betting. This platform provides analysis tools 
          for educational purposes only.
        </p>
      </AlertDescription>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={handleDismiss}
        data-testid="button-dismiss-geo"
      >
        <X className="w-3 h-3" />
      </Button>
    </Alert>
  );
}

export function AgeVerificationGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const ageVerified = localStorage.getItem("sors_age_verified");
    if (ageVerified === "true") {
      setVerified(true);
    }
  }, []);

  const handleVerify = () => {
    localStorage.setItem("sors_age_verified", "true");
    setVerified(true);
  };

  if (verified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4" data-testid="age-verification-gate">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Age Verification</h1>
          <p className="text-muted-foreground">
            This platform provides sports betting analysis tools. You must be of 
            legal gambling age in your jurisdiction to proceed.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs text-left">
            By continuing, you confirm that you are at least 21 years old (or the legal 
            gambling age in your jurisdiction) and that online sports betting analysis is 
            legal in your location. This platform is for educational and informational 
            purposes only. Sors Maxima does not facilitate, process, or place any real bets.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button className="w-full" onClick={handleVerify} data-testid="button-verify-age">
            I am of legal age - Continue
          </Button>
          <p className="text-xs text-muted-foreground">
            If you are under the legal age, please exit this website immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

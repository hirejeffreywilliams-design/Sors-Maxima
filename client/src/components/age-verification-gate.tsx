import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AgeVerificationGateProps {
  children: React.ReactNode;
}

export function AgeVerificationGate({ children }: AgeVerificationGateProps) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [denied, setDenied] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem("ageVerified");
    if (stored === "true") {
      setVerified(true);
      setLoading(false);
      return;
    }
    fetch("/api/auth/age-status", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.verified) {
          setVerified(true);
          sessionStorage.setItem("ageVerified", "true");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleVerify = async () => {
    if (!dateOfBirth) return;
    try {
      const res = await apiRequest("POST", "/api/auth/verify-age", { dateOfBirth });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        sessionStorage.setItem("ageVerified", "true");
        toast({ title: "Age Verified", description: "Welcome to Sors Maxima." });
      } else {
        setDenied(true);
        toast({ title: "Access Denied", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not verify age. Please try again.", variant: "destructive" });
    }
  };

  if (loading) return null;
  if (verified) return <>{children}</>;

  if (denied) {
    return (
      <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Access Restricted</h2>
            <p className="text-muted-foreground">
              You must be 21 years or older to access this platform. Sports betting analysis tools are restricted to users of legal gambling age in their jurisdiction.
            </p>
            <p className="text-xs text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center p-4" data-testid="age-verification-gate">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <CardTitle>Age Verification Required</CardTitle>
          <CardDescription>
            You must be at least 21 years old to access sports betting analysis tools. Please verify your age to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              data-testid="input-date-of-birth"
            />
          </div>
          <Button className="w-full" onClick={handleVerify} disabled={!dateOfBirth} data-testid="button-verify-age">
            <CheckCircle className="w-4 h-4 mr-2" /> Verify Age
          </Button>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>By verifying, you confirm you are of legal gambling age in your jurisdiction.</p>
            <p>This platform provides analysis and education tools only. Users place wagers at licensed sportsbooks.</p>
          </div>
          <Badge variant="secondary" className="w-full justify-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            If you or someone you know has a gambling problem, call 1-800-522-4700
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

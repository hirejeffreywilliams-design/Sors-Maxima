import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const { data: status, isLoading: statusLoading } = useQuery<{ email: string }>({
    queryKey: ["/api/auth/verification-status"],
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email verified", description: "Your email has been successfully verified." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid or expired code",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Code sent", description: "A new verification code has been sent to your email." });
      setCooldown(data.cooldownSeconds || 60);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: error.message,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/check"], { authenticated: false });
      setLocation("/login");
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ variant: "destructive", title: "Invalid code", description: "Please enter a 6-digit code." });
      return;
    }
    verifyMutation.mutate(code);
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    return `${user.charAt(0)}***@${domain}`;
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md" data-testid="card-verify-email">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Email — Sors Maxima</CardTitle>
          <CardDescription>
            We sent a code to <span className="font-medium text-foreground">{maskEmail(status?.email || "")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4 flex flex-col items-center">
            <Input
              data-testid="input-verification-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono w-48 h-12"
            />
            {verifyMutation.isError && (
              <p className="text-sm text-destructive" data-testid="text-verification-error">
                {verifyMutation.error.message}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending || code.length !== 6}
              data-testid="button-verify-email"
            >
              {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resendMutation.mutate()}
            disabled={cooldown > 0 || resendMutation.isPending}
            data-testid="button-resend-code"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
          </Button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            data-testid="link-sign-out"
          >
            Sign out
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

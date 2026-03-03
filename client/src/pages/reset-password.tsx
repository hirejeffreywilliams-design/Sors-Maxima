import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import sorsMaximaLogo from "@/assets/sors-maxima-logo.png";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const allChecksPass = Object.values(passwordChecks).every(Boolean);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);

    if (!t) {
      setTokenValid(false);
      return;
    }

    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((data) => setTokenValid(data.valid === true))
      .catch(() => setTokenValid(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allChecksPass) {
      setError("Password must be at least 8 characters with uppercase, lowercase, and a number");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Password reset failed");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <a href="/" className="block w-fit mx-auto cursor-pointer hover:opacity-80 transition-opacity">
            <img src={sorsMaximaLogo} alt="Sors Maxima" className="w-16 h-16 rounded-2xl" />
          </a>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5" />
              Set New Password
            </CardTitle>
            <CardDescription>
              Choose a strong password for your account.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {tokenValid === null && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Verifying link...</span>
            </div>
          )}

          {tokenValid === false && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This reset link has expired or already been used. Please request a new one.
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Back to Sign In
              </Button>
            </div>
          )}

          {tokenValid === true && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Choose a strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoFocus
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[
                      { key: "length", label: "8+ characters" },
                      { key: "uppercase", label: "Uppercase letter" },
                      { key: "lowercase", label: "Lowercase letter" },
                      { key: "number", label: "Number" },
                    ].map(({ key, label }) => (
                      <div key={key} className={`flex items-center gap-1 text-xs ${passwordChecks[key as keyof typeof passwordChecks] ? "text-green-500" : "text-muted-foreground"}`}>
                        <CheckCircle2 className={`w-3 h-3 ${passwordChecks[key as keyof typeof passwordChecks] ? "opacity-100" : "opacity-30"}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !allChecksPass || newPassword !== confirmPassword}
                data-testid="button-submit-new-password"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                ) : "Update Password"}
              </Button>
            </form>
          )}

          {success && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">Password Updated</p>
                <p className="text-sm text-muted-foreground">
                  Your password has been changed. You can now sign in with your new credentials.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login-success"
              >
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

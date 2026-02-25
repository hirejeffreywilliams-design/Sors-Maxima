import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Shield,
  Download,
  Trash2,
  Key,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  LogOut,
  Mail,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

export default function ProfilePage() {
  useSEO({ title: "Profile", description: "Manage your account and preferences" });
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const { data: authData } = useQuery<{ authenticated: boolean; isAdmin?: boolean; username?: string }>({
    queryKey: ["/api/auth/check"],
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscription"],
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: tierInfo } = useQuery<any>({
    queryKey: ["/api/credits"],
  });

  const exportMutation = useMutation({
    mutationFn: () => fetch("/api/account/export", { credentials: "include" }).then((r) => r.json()),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sors-maxima-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data Exported", description: "Your data has been downloaded as a JSON file." });
    },
    onError: () => {
      toast({ title: "Export Failed", description: "Could not export your data. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/account"),
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Your account and data have been permanently removed." });
      window.location.href = "/";
    },
    onError: () => {
      toast({ title: "Deletion Failed", description: "Could not delete account. Please try again.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/account/change-password", data),
    onSuccess: () => {
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
    },
    onError: () => {
      toast({ title: "Password Change Failed", description: "Please check your current password and try again.", variant: "destructive" });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiRequest("POST", `/api/sessions/${sessionId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session Revoked", description: "The session has been terminated." });
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") return;
    deleteMutation.mutate();
  };

  const handleChangePassword = () => {
    if (!passwordCurrent || !passwordNew || passwordNew !== passwordConfirm) return;
    if (passwordNew.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: passwordCurrent, newPassword: passwordNew });
  };

  const tierName = subscription?.tier || tierInfo?.tier || "Free";
  const tierColors: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    elite: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    whale: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="min-h-full">
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your account, security, and data
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Username</Label>
                <p className="font-medium" data-testid="text-profile-username">{authData?.username || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{authData?.isAdmin ? "Administrator" : "User"}</p>
                  {authData?.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Subscription</Label>
                <Badge className={tierColors[tierName.toLowerCase()] || tierColors.free}>
                  {tierName}
                </Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Membership</Label>
                <p className="font-medium text-sm" data-testid="text-profile-access">
                  {tierInfo?.access || "Unrestricted member access"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordCurrent}
                onChange={(e) => setPasswordCurrent(e.target.value)}
                data-testid="input-password-current"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  data-testid="input-password-new"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  data-testid="input-password-confirm"
                />
              </div>
            </div>
            {passwordNew && passwordConfirm && passwordNew !== passwordConfirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
            <Button
              onClick={handleChangePassword}
              disabled={!passwordCurrent || !passwordNew || passwordNew !== passwordConfirm || changePasswordMutation.isPending}
              className="gap-2"
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Manage your login sessions across devices</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Session tracking data will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{session.device || "Unknown Device"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.lastActive || "Unknown"}
                          {session.current && (
                            <Badge variant="secondary" className="text-[10px] ml-1">Current</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        className="gap-1"
                        data-testid={`button-revoke-session-${session.id}`}
                      >
                        <LogOut className="w-3 h-3" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>Export your data or manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Export My Data</p>
                <p className="text-xs text-muted-foreground">
                  Download all your personal data including betting history, settings, and preferences as a JSON file. 
                  This is part of our GDPR/CCPA compliance.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="gap-2"
                  data-testid="button-export-data"
                >
                  {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download My Data
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data including betting history, 
              settings, community posts, and referral data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">Type <strong>DELETE</strong> to confirm:</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

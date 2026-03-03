import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  Shield, 
  DollarSign, 
  Download, 
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle,
  Ban,
  Plus,
  Trash2,
  Save,
  FileText,
  Gift,
  Globe,
  Smartphone,
  Monitor,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  Lock
} from "lucide-react";
import { ReferralProgram } from "@/components/referral-program";
import { LanguageSelector } from "@/components/language-selector";
import { StrategyCoach } from "@/components/strategy-coach";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSEO } from "@/hooks/use-seo";

interface TrustedDeviceInfo {
  id: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

function PrivacyConsent() {
  const { toast } = useToast();

  const { data: consent, isLoading } = useQuery<{ analytics: boolean; marketing: boolean; dataSharing: boolean }>({
    queryKey: ["/api/user/consent"],
  });

  const updateConsentMutation = useMutation({
    mutationFn: async (updates: { analytics?: boolean; marketing?: boolean; dataSharing?: boolean }) => {
      const res = await apiRequest("POST", "/api/user/consent", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/consent"] });
      toast({ title: "Privacy settings updated", description: "Your consent preferences have been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update privacy settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy & Consent
          </CardTitle>
          <CardDescription>Control how your data is collected and used. We respect your choices and comply with privacy regulations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium" data-testid="label-analytics-consent">Analytics Tracking</Label>
              <p className="text-xs text-muted-foreground">Allow us to collect usage data to improve the app experience. No personal information is shared with third parties.</p>
            </div>
            <Switch
              checked={consent?.analytics ?? true}
              onCheckedChange={(checked) => updateConsentMutation.mutate({ analytics: checked })}
              data-testid="switch-analytics-consent"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium" data-testid="label-marketing-consent">Marketing Communications</Label>
              <p className="text-xs text-muted-foreground">Receive personalized tips, promotions, and educational content about betting strategies via email and push notifications.</p>
            </div>
            <Switch
              checked={consent?.marketing ?? false}
              onCheckedChange={(checked) => updateConsentMutation.mutate({ marketing: checked })}
              data-testid="switch-marketing-consent"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium" data-testid="label-data-sharing-consent">Data Sharing</Label>
              <p className="text-xs text-muted-foreground">Allow anonymized usage patterns to be shared with partner sportsbooks for odds improvement. No personal data is ever shared.</p>
            </div>
            <Switch
              checked={consent?.dataSharing ?? false}
              onCheckedChange={(checked) => updateConsentMutation.mutate({ dataSharing: checked })}
              data-testid="switch-data-sharing-consent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Rights
          </CardTitle>
          <CardDescription>Under GDPR, CCPA, and other privacy regulations, you have the following rights:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium" data-testid="text-right-access">Right to Access</p>
              <p className="text-xs text-muted-foreground">Request a copy of all data we hold about you</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium" data-testid="text-right-erasure">Right to Erasure</p>
              <p className="text-xs text-muted-foreground">Request deletion of your personal data</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium" data-testid="text-right-portability">Data Portability</p>
              <p className="text-xs text-muted-foreground">Export your data in a machine-readable format</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium" data-testid="text-right-objection">Right to Object</p>
              <p className="text-xs text-muted-foreground">Object to processing of your data for certain purposes</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            To exercise any of these rights, please use the Backup tab to export your data, or contact our support team. We will respond within 30 days as required by law.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Affiliate Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="text-affiliate-disclosure">
            Sors Maxima is an analysis and educational tool only -- we are not a sportsbook. We may earn referral fees if you sign up with partner sportsbooks through links in our app. This does not affect our analysis or recommendations. All odds and probabilities are estimates and should not be treated as guarantees.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceManagement() {
  const { toast } = useToast();

  const { data: devices, isLoading } = useQuery<TrustedDeviceInfo[]>({
    queryKey: ["/api/devices"],
  });

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => apiRequest("POST", `/api/devices/${deviceId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Device removed from trusted list" });
    },
    onError: () => {
      toast({ title: "Failed to revoke device", variant: "destructive" });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/devices/revoke-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "All trusted devices revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke devices", variant: "destructive" });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout-all"),
    onSuccess: () => {
      window.location.reload();
    },
    onError: () => {
      toast({ title: "Failed to log out of all devices", variant: "destructive" });
    },
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const daysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-500" />
            Trusted Devices
          </CardTitle>
          <CardDescription>
            Devices you have chosen to remember. Trusted devices can sign in automatically without entering your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-devices">
              <Monitor className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No trusted devices</p>
              <p className="text-sm mt-1">When you log in and check "Remember this device", it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center justify-between gap-4 p-3 rounded-md border ${
                    device.current ? "border-primary/30 bg-primary/5" : ""
                  }`}
                  data-testid={`device-${device.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-device-name-${device.id}`}>
                          {device.deviceName}
                        </span>
                        {device.current && (
                          <Badge variant="secondary" className="text-xs">This device</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 break-words">
                        <span className="hidden sm:inline">IP: {device.ipAddress} · </span>
                        Last used {formatDate(device.lastUsedAt)} · Expires in {daysUntilExpiry(device.expiresAt)} days
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeMutation.mutate(device.id)}
                    disabled={revokeMutation.isPending}
                    data-testid={`button-revoke-device-${device.id}`}
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Security Actions
          </CardTitle>
          <CardDescription>
            Manage device trust and active sessions across all your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium text-sm">Revoke all trusted devices</p>
              <p className="text-xs text-muted-foreground">Remove trust from all devices. You will need to log in again on each device.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending || !devices || devices.length === 0}
              data-testid="button-revoke-all-devices"
            >
              {revokeAllMutation.isPending ? "Revoking..." : "Revoke All"}
            </Button>
          </div>
          <div className="border-t pt-3 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium text-sm">Log out of all devices</p>
              <p className="text-xs text-muted-foreground">End all sessions and revoke all trusted devices. You will be signed out everywhere.</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => logoutAllMutation.mutate()}
              disabled={logoutAllMutation.isPending}
              data-testid="button-logout-all-devices"
            >
              {logoutAllMutation.isPending ? "Logging out..." : "Log Out Everywhere"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Membership() {
  const { toast } = useToast();
  const { data: subscription, isLoading } = useQuery<{ tier: string; status: string; nextRenewal?: string }>({
    queryKey: ["/api/subscription"],
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const tier = subscription?.tier || "none";
  const status = subscription?.status || "none";

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "whale":
      case "max":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white">MAX</Badge>;
      case "elite":
      case "edge":
        return <Badge className="bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white">EDGE</Badge>;
      case "pro":
      case "sharp":
        return <Badge className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">SHARP</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const currentTier = (tier || "none").toLowerCase();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Membership Plan
          </CardTitle>
          <CardDescription>Manage your subscription and billing preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Current Tier</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold capitalize">
                  {currentTier === "none" ? "Free" : 
                   currentTier === "pro" || currentTier === "sharp" ? "Sharp" :
                   currentTier === "elite" || currentTier === "edge" ? "Edge" :
                   currentTier === "whale" || currentTier === "max" ? "Max" : currentTier}
                </span>
                {getTierBadge(currentTier)}
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-medium">Status</p>
              <Badge variant={status === "active" ? "default" : "secondary"} className="capitalize">
                {status}
              </Badge>
            </div>
          </div>

          {subscription?.nextRenewal && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Next renewal: {new Date(subscription.nextRenewal).toLocaleDateString()}
            </div>
          )}

          <div className="pt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
                variant="default"
              >
                {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Billing
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Available Upgrades</h4>
              <div className="flex flex-wrap gap-3">
                {(currentTier === "none" || currentTier === "free") && (
                  <>
                    <Button variant="outline" asChild data-testid="button-upgrade-sharp">
                      <a href="/pricing">Get Sharp</a>
                    </Button>
                    <Button variant="outline" asChild data-testid="button-upgrade-edge">
                      <a href="/pricing">Get Edge</a>
                    </Button>
                    <Button variant="outline" asChild data-testid="button-upgrade-max">
                      <a href="/pricing">Get Max</a>
                    </Button>
                  </>
                )}

                {(currentTier === "pro" || currentTier === "sharp") && (
                  <>
                    <Button variant="outline" asChild data-testid="button-upgrade-edge">
                      <a href="/pricing">Upgrade to Edge</a>
                    </Button>
                    <Button variant="outline" asChild data-testid="button-upgrade-max">
                      <a href="/pricing">Upgrade to Max</a>
                    </Button>
                  </>
                )}

                {(currentTier === "elite" || currentTier === "edge") && (
                  <Button variant="outline" asChild data-testid="button-upgrade-max">
                    <a href="/pricing">Upgrade to Max</a>
                  </Button>
                )}

                {(currentTier === "whale" || currentTier === "max") && (
                  <p className="text-sm text-muted-foreground italic">You are on the top tier. Maximum edge achieved.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  useSEO({ title: "Settings", description: "Customize your application preferences" });
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("security");
  const [addAlertDialogOpen, setAddAlertDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ alertType: "daily_limit", threshold: 100 });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  const { data: authData } = useQuery<{ isAdmin?: boolean; username?: string }>({ queryKey: ["/api/auth/check"] });
  const isAdmin = authData?.isAdmin ?? false;

  const changePwMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Password change failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Notification Preferences
  const { data: notifPrefs } = useQuery<any>({
    queryKey: ["/api/notifications/preferences"],
  });

  const updateNotifMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/notifications/preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
      toast({ title: "Preferences updated" });
    },
  });

  // Responsible Gaming
  const { data: responsibleGaming } = useQuery<any>({
    queryKey: ["/api/responsible-gaming"],
  });

  const updateRGMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/responsible-gaming", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/responsible-gaming"] });
      toast({ title: "Limits updated" });
    },
  });

  const coolOffMutation = useMutation({
    mutationFn: (days: number) => apiRequest("POST", "/api/responsible-gaming/cool-off", { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/responsible-gaming"] });
      toast({ title: "Cool-off period started" });
    },
  });

  // Bankroll Alerts
  const { data: bankrollAlerts = [] } = useQuery<any[]>({
    queryKey: ["/api/bankroll/alerts"],
  });

  const addAlertMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/bankroll/alerts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll/alerts"] });
      setAddAlertDialogOpen(false);
      toast({ title: "Alert created" });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/bankroll/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll/alerts"] });
      toast({ title: "Alert removed" });
    },
  });

  // Backups
  const { data: backups = [] } = useQuery<any[]>({
    queryKey: ["/api/backups"],
  });

  const createBackupMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/backups", { type: "manual" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({ title: "Backup created successfully" });
    },
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and limits</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="block md:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger data-testid="select-settings-tabs">
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="notifications">Alerts</SelectItem>
                <SelectItem value="responsible">Limits</SelectItem>
                <SelectItem value="privacy">Privacy</SelectItem>
                <SelectItem value="devices">Devices</SelectItem>
                <SelectItem value="backup">Backup</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:flex overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-8 h-auto">
              <TabsTrigger value="security" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-security">
                <KeyRound className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="membership" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-membership">
                <DollarSign className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Membership</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-notifications">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="responsible" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-responsible">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Limits</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-privacy">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-devices">
                <Smartphone className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Devices</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-backup">
                <Download className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
              <TabsTrigger value="referral" className="text-xs sm:text-sm py-2 gap-1 px-2 sm:px-3" data-testid="tab-referral">
                <Gift className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Referral</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="security" className="space-y-4 mt-4">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-amber-500" />
                    Admin Account Security
                  </CardTitle>
                  <CardDescription>Security settings for your admin account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-amber-800 dark:text-amber-300">Admin password is environment-managed</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          The admin account password is set via secure environment configuration and cannot be changed from within the app.
                          To update it, modify the <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-xs">ADMIN_PASSWORD</code> environment secret in your deployment settings.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Logged in as</p>
                        <p className="text-xs text-muted-foreground">{authData?.username ?? "admin"} · Administrator</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your account password. Use a strong password with uppercase, lowercase, and numbers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPw.current ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={pwForm.currentPassword}
                        onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                        data-testid="input-current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                        data-testid="button-toggle-current-password"
                      >
                        {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPw.newPw ? "text" : "password"}
                        placeholder="Min 8 chars, uppercase, lowercase, number"
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                        data-testid="input-new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw(s => ({ ...s, newPw: !s.newPw }))}
                        data-testid="button-toggle-new-password"
                      >
                        {showPw.newPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwForm.newPassword && (
                      <div className="space-y-1 text-xs">
                        <div className={`flex items-center gap-1.5 ${pwForm.newPassword.length >= 8 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          <CheckCircle className="h-3 w-3" /> At least 8 characters
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(pwForm.newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          <CheckCircle className="h-3 w-3" /> Uppercase letter
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[a-z]/.test(pwForm.newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          <CheckCircle className="h-3 w-3" /> Lowercase letter
                        </div>
                        <div className={`flex items-center gap-1.5 ${/[0-9]/.test(pwForm.newPassword) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          <CheckCircle className="h-3 w-3" /> A number
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPw.confirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={pwForm.confirmPassword}
                        onChange={(e) => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        data-testid="input-confirm-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                        data-testid="button-toggle-confirm-password"
                      >
                        {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                  <Button
                    onClick={() => changePwMutation.mutate(pwForm)}
                    disabled={
                      changePwMutation.isPending ||
                      !pwForm.currentPassword ||
                      !pwForm.newPassword ||
                      !pwForm.confirmPassword ||
                      pwForm.newPassword !== pwForm.confirmPassword ||
                      pwForm.newPassword.length < 8
                    }
                    className="w-full sm:w-auto"
                    data-testid="button-change-password"
                  >
                    {changePwMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                    ) : (
                      <><KeyRound className="h-4 w-4 mr-2" />Update Password</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="membership" className="mt-4">
            <Membership />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose which alerts you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Optimal Entry Alerts</Label>
                    <p className="text-sm text-muted-foreground">When a recommended bet hits optimal entry price</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.optimalEntryAlerts ?? true}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ optimalEntryAlerts: checked })}
                    data-testid="switch-optimal-entry"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Line Movement Alerts</Label>
                    <p className="text-sm text-muted-foreground">When lines move significantly</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.lineMovementAlerts ?? true}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ lineMovementAlerts: checked })}
                    data-testid="switch-line-movement"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Injury Alerts</Label>
                    <p className="text-sm text-muted-foreground">When key players are injured</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.injuryAlerts ?? true}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ injuryAlerts: checked })}
                    data-testid="switch-injury"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Steam Move Alerts</Label>
                    <p className="text-sm text-muted-foreground">When sharp money moves a line</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.steamMoveAlerts ?? false}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ steamMoveAlerts: checked })}
                    data-testid="switch-steam"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sharp Money Alerts</Label>
                    <p className="text-sm text-muted-foreground">When professional bettors bet</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.sharpMoneyAlerts ?? false}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ sharpMoneyAlerts: checked })}
                    data-testid="switch-sharp"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bankroll Alerts</Label>
                    <p className="text-sm text-muted-foreground">When you hit your limits</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.bankrollAlerts ?? true}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ bankrollAlerts: checked })}
                    data-testid="switch-bankroll"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Recap</Label>
                    <p className="text-sm text-muted-foreground">Summary of your betting activity</p>
                  </div>
                  <Switch
                    checked={notifPrefs?.dailyRecapAlerts ?? true}
                    onCheckedChange={(checked) => updateNotifMutation.mutate({ dailyRecapAlerts: checked })}
                    data-testid="switch-recap"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Language
                </CardTitle>
                <CardDescription>Select your preferred display language</CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSelector />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Bankroll Alerts
                </CardTitle>
                <CardDescription>Get notified when you approach your limits</CardDescription>
              </CardHeader>
              <CardContent>
                {bankrollAlerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No alerts configured</p>
                ) : (
                  <div className="space-y-2">
                    {bankrollAlerts.map((alert: any) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{alert.alertType.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground ml-2">${alert.threshold}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteAlertMutation.mutate(alert.id)}
                          data-testid={`button-delete-alert-${alert.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => setAddAlertDialogOpen(true)}
                  data-testid="button-add-alert"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Alert
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responsible" className="space-y-4 mt-4">
            <StrategyCoach />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Responsible Gaming Limits
                </CardTitle>
                <CardDescription>Set limits to keep your betting under control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Daily Bet Limit ($)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      defaultValue={responsibleGaming?.dailyBetLimit || ""}
                      onBlur={(e) => updateRGMutation.mutate({ dailyBetLimit: parseFloat(e.target.value) || null })}
                      data-testid="input-daily-limit"
                    />
                  </div>
                  <div>
                    <Label>Weekly Bet Limit ($)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      defaultValue={responsibleGaming?.weeklyBetLimit || ""}
                      onBlur={(e) => updateRGMutation.mutate({ weeklyBetLimit: parseFloat(e.target.value) || null })}
                      data-testid="input-weekly-limit"
                    />
                  </div>
                  <div>
                    <Label>Loss Limit ($)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      defaultValue={responsibleGaming?.lossLimit || ""}
                      onBlur={(e) => updateRGMutation.mutate({ lossLimit: parseFloat(e.target.value) || null })}
                      data-testid="input-loss-limit"
                    />
                  </div>
                  <div>
                    <Label>Session Time Limit (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      defaultValue={responsibleGaming?.sessionTimeLimit || ""}
                      onBlur={(e) => updateRGMutation.mutate({ sessionTimeLimit: parseInt(e.target.value) || null })}
                      data-testid="input-session-limit"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Take a Break
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => coolOffMutation.mutate(1)}
                      data-testid="button-cooloff-1"
                    >
                      24 Hours
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => coolOffMutation.mutate(7)}
                      data-testid="button-cooloff-7"
                    >
                      7 Days
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => coolOffMutation.mutate(30)}
                      data-testid="button-cooloff-30"
                    >
                      30 Days
                    </Button>
                  </div>
                  {responsibleGaming?.coolOffEndDate && (
                    <Badge variant="secondary" className="mt-2">
                      <Ban className="h-3 w-3 mr-1" />
                      Cool-off active until {new Date(responsibleGaming.coolOffEndDate).toLocaleDateString()}
                    </Badge>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <h3 className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Need Help?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      If you or someone you know has a gambling problem, call the National Problem Gambling Helpline:
                    </p>
                    <p className="font-bold text-lg mt-1">1-800-522-4700</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <PrivacyConsent />
          </TabsContent>

          <TabsContent value="devices" className="space-y-4 mt-4">
            <DeviceManagement />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Bet Backup & Recovery
                </CardTitle>
                <CardDescription>Never lose your betting history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                  className="w-full"
                  data-testid="button-create-backup"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createBackupMutation.isPending ? "Creating Backup..." : "Create New Backup"}
                </Button>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Recent Backups</h3>
                  {backups.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No backups yet</p>
                  ) : (
                    <div className="space-y-2">
                      {backups.map((backup: any) => (
                        <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">
                                {new Date(backup.createdAt).toLocaleDateString()}
                              </span>
                              <Badge variant="secondary">{backup.backupType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(backup.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            data-testid={`button-restore-${backup.id}`}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tax Export
                </CardTitle>
                <CardDescription>Export your betting history for tax purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[2024, 2025, 2026].map((year) => (
                    <Button 
                      key={year}
                      variant="outline"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", `/api/tax/${year}/generate`);
                          toast({ title: `Tax report for ${year} generated` });
                        } catch (err) {
                          toast({ title: "No betting data for this year", variant: "destructive" });
                        }
                      }}
                      data-testid={`button-tax-${year}`}
                    >
                      Export {year}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="space-y-4 mt-4">
            <ReferralProgram />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Alert Dialog */}
      <Dialog open={addAlertDialogOpen} onOpenChange={setAddAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bankroll Alert</DialogTitle>
            <DialogDescription>Get notified when you reach certain limits</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Alert Type</Label>
              <Select
                value={newAlert.alertType}
                onValueChange={(value) => setNewAlert({ ...newAlert, alertType: value })}
              >
                <SelectTrigger data-testid="select-alert-type">
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_limit">Daily Spending Limit</SelectItem>
                  <SelectItem value="weekly_limit">Weekly Spending Limit</SelectItem>
                  <SelectItem value="loss_streak">Loss Streak Alert</SelectItem>
                  <SelectItem value="win_target">Win Target</SelectItem>
                  <SelectItem value="bankroll_low">Low Bankroll Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Threshold ($)</Label>
              <Input
                type="number"
                value={newAlert.threshold}
                onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) || 0 })}
                data-testid="input-alert-threshold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAlertDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => addAlertMutation.mutate(newAlert)}
              disabled={!newAlert.threshold}
              data-testid="button-confirm-add-alert"
            >
              Add Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

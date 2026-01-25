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
  FileText
} from "lucide-react";
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

export default function Settings() {
  const { toast } = useToast();
  const [addAlertDialogOpen, setAddAlertDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ alertType: "daily_limit", threshold: 100 });

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

        <Tabs defaultValue="notifications">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 gap-1" data-testid="tab-notifications">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="responsible" className="text-xs sm:text-sm py-2 gap-1" data-testid="tab-responsible">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Limits</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="text-xs sm:text-sm py-2 gap-1" data-testid="tab-backup">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Backup</span>
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>

      {/* Add Sportsbook Account Dialog */}
      <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sportsbook Account</DialogTitle>
            <DialogDescription>Track your balance across multiple sportsbooks</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sportsbook</Label>
              <Select
                value={newAccount.sportsbookName}
                onValueChange={(value) => setNewAccount({ ...newAccount, sportsbookName: value })}
              >
                <SelectTrigger data-testid="select-sportsbook">
                  <SelectValue placeholder="Select sportsbook" />
                </SelectTrigger>
                <SelectContent>
                  {SPORTSBOOKS.map((book) => (
                    <SelectItem key={book} value={book}>{book}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Balance ($)</Label>
              <Input
                type="number"
                value={newAccount.accountBalance}
                onChange={(e) => setNewAccount({ ...newAccount, accountBalance: parseFloat(e.target.value) || 0 })}
                data-testid="input-account-balance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => addAccountMutation.mutate(newAccount)}
              disabled={!newAccount.sportsbookName}
              data-testid="button-confirm-add-account"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

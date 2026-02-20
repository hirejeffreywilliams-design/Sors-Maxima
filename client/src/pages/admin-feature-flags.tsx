import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flag, Settings, ToggleLeft, Plus, ArrowLeft, Percent, Loader2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFeatureFlags() {
  const { toast } = useToast();

  const [newFlagId, setNewFlagId] = useState("");
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagDescription, setNewFlagDescription] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(false);
  const [newFlagRollout, setNewFlagRollout] = useState(0);

  const { data: flags = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/admin/feature-flags"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/feature-flags/${id}`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
    },
    onError: () => {
      toast({ title: "Failed to toggle flag", variant: "destructive" });
    },
  });

  const rolloutMutation = useMutation({
    mutationFn: async ({ id, rolloutPercentage }: { id: string; rolloutPercentage: number }) => {
      const res = await apiRequest("PUT", `/api/admin/feature-flags/${id}`, { rolloutPercentage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
    },
    onError: () => {
      toast({ title: "Failed to update rollout", variant: "destructive" });
    },
  });

  const killMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/feature-flags/${id}/kill`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      toast({ title: "Kill switch activated - flag disabled and rollout set to 0%" });
    },
    onError: () => {
      toast({ title: "Failed to activate kill switch", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; enabled: boolean; rolloutPercentage: number }) => {
      const res = await apiRequest("POST", "/api/admin/feature-flags", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      toast({ title: "Feature flag created successfully" });
      setNewFlagId("");
      setNewFlagName("");
      setNewFlagDescription("");
      setNewFlagEnabled(false);
      setNewFlagRollout(0);
    },
    onError: () => {
      toast({ title: "Failed to create flag", variant: "destructive" });
    },
  });

  const getStatusBadge = (flag: FeatureFlag) => {
    if (!flag.enabled) {
      return <Badge variant="secondary" data-testid={`badge-status-${flag.id}`}>Disabled</Badge>;
    }
    if (flag.rolloutPercentage < 100) {
      return <Badge className="bg-yellow-500 text-black" data-testid={`badge-status-${flag.id}`}>Partial Rollout</Badge>;
    }
    return <Badge className="bg-green-600 text-white" data-testid={`badge-status-${flag.id}`}>Active</Badge>;
  };

  const totalFlags = flags.length;
  const activeCount = flags.filter((f) => f.enabled && f.rolloutPercentage >= 100).length;
  const partialCount = flags.filter((f) => f.enabled && f.rolloutPercentage < 100).length;

  const handleCreateFlag = () => {
    if (!newFlagId.trim() || !newFlagName.trim()) {
      toast({ title: "Flag ID and Name are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      id: newFlagId.trim(),
      name: newFlagName.trim(),
      description: newFlagDescription.trim(),
      enabled: newFlagEnabled,
      rolloutPercentage: newFlagRollout,
    });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
              Feature Flags & A/B Testing
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Manage feature rollouts, toggle features, and control A/B testing parameters
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card data-testid="card-stat-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              {totalFlags}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-active">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-green-500" />
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-partial">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partial Rollout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Percent className="h-5 w-5 text-yellow-500" />
              {partialCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-flags-table">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>Toggle features and adjust rollout percentages</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-flags">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-flags">
              No feature flags found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Rollout %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((flag) => (
                    <TableRow key={flag.id} data-testid={`row-flag-${flag.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-flag-name-${flag.id}`}>{flag.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{flag.description}</div>
                        <div className="text-xs text-muted-foreground">{flag.id}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground" data-testid={`text-flag-desc-${flag.id}`}>
                          {flag.description}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(flag)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: flag.id, enabled: checked })}
                          disabled={toggleMutation.isPending}
                          data-testid={`switch-flag-${flag.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Slider
                            value={[flag.rolloutPercentage]}
                            onValueCommit={(val) => rolloutMutation.mutate({ id: flag.id, rolloutPercentage: val[0] })}
                            max={100}
                            step={1}
                            className="w-20"
                            disabled={rolloutMutation.isPending}
                            data-testid={`slider-rollout-${flag.id}`}
                          />
                          <span className="text-sm text-muted-foreground w-10 text-right" data-testid={`text-rollout-${flag.id}`}>
                            {flag.rolloutPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => killMutation.mutate(flag.id)}
                          disabled={!flag.enabled || killMutation.isPending}
                          data-testid={`button-kill-${flag.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Kill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-create-flag">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Flag
          </CardTitle>
          <CardDescription>Add a new feature flag to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flag-id">Flag ID (slug)</Label>
              <Input
                id="flag-id"
                placeholder="e.g. new_feature"
                value={newFlagId}
                onChange={(e) => setNewFlagId(e.target.value)}
                data-testid="input-flag-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                placeholder="e.g. New Feature"
                value={newFlagName}
                onChange={(e) => setNewFlagName(e.target.value)}
                data-testid="input-flag-name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="flag-description">Description</Label>
              <Input
                id="flag-description"
                placeholder="Describe what this flag controls"
                value={newFlagDescription}
                onChange={(e) => setNewFlagDescription(e.target.value)}
                data-testid="input-flag-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial State</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newFlagEnabled}
                  onCheckedChange={setNewFlagEnabled}
                  data-testid="switch-new-flag-enabled"
                />
                <span className="text-sm text-muted-foreground">
                  {newFlagEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rollout Percentage: {newFlagRollout}%</Label>
              <Slider
                value={[newFlagRollout]}
                onValueChange={(val) => setNewFlagRollout(val[0])}
                max={100}
                step={1}
                data-testid="slider-new-flag-rollout"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleCreateFlag}
              disabled={createMutation.isPending}
              data-testid="button-create-flag"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Flag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

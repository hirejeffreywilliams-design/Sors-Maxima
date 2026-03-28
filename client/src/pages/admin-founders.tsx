import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { apiRequest } from "@/lib/queryClient";
import {
  Trophy,
  Users,
  Rocket,
  Gift,
  XCircle,
  CheckCircle,
  Copy,
  RefreshCw,
  Crown,
  Zap,
  Flame,
  AlertTriangle,
  Search,
} from "lucide-react";

interface FoundersStatus {
  isActive: boolean;
  launchedAt: string | null;
  memberSpotsTotal: number;
  memberSpotsClaimed: number;
  memberSpotsRemaining: number;
  enterpriseSpotsTotal: number;
  enterpriseSpotsClaimed: number;
  enterpriseSpotsRemaining: number;
  founders: PublicFounder[];
}

interface PublicFounder {
  founderNumber: number;
  founderType: "member" | "enterprise";
  username: string;
  displayName: string;
  joinedAt: string;
  tier: string;
}

interface AdminUser {
  id: number;
  username: string;
  tier?: string;
  subscription_tier?: string;
  email?: string;
  is_founder?: boolean;
}

const TIER_BADGE: Record<string, string> = {
  pro: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  elite: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  whale: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  free: "bg-gray-500/15 text-gray-400 border-gray-500/25",
};

const TIER_LABEL: Record<string, string> = { pro: "Sharp", elite: "Edge", whale: "Max", free: "Free" };

function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${TIER_BADGE[tier] || TIER_BADGE.free}`}>
      {TIER_LABEL[tier] || tier}
    </Badge>
  );
}

function TypeBadge({ type }: { type: "member" | "enterprise" }) {
  return type === "enterprise" ? (
    <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/40 gap-1">
      <Crown className="w-3 h-3" /> Enterprise
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs bg-primary/15 text-primary border-primary/30 gap-1">
      <Trophy className="w-3 h-3" /> Member
    </Badge>
  );
}

export default function AdminFounders() {
  useSEO({ title: "Founders Program — Admin | Sors Maxima" });

  const { toast } = useToast();
  const qc = useQueryClient();

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantType, setGrantType] = useState<"member" | "enterprise">("member");
  const [userSearch, setUserSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<PublicFounder | null>(null);

  const { data: status, isLoading, refetch } = useQuery<FoundersStatus>({
    queryKey: ["/api/admin/founders/status"],
    staleTime: 30 * 1000,
  });

  const { data: allUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 60 * 1000,
  });

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.username?.toLowerCase().includes(q) || String(u.id).includes(q) || u.email?.toLowerCase().includes(q);
  }).slice(0, 20);

  const launchMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/founders/launch", {}),
    onSuccess: () => {
      toast({ title: "Founders Program launched!", description: "Announcement emails are being sent to all active subscribers." });
      qc.invalidateQueries({ queryKey: ["/api/admin/founders/status"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Launch failed", description: err.message || "Could not launch program" });
    },
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, founderType }: { userId: number; founderType: string }) =>
      apiRequest("POST", "/api/admin/founders/grant", { userId, founderType }),
    onSuccess: (data: any) => {
      toast({
        title: "Founder granted!",
        description: `Founder #${data.founderNumber} assigned. Code: ${data.referralCode}`,
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/founders/status"] });
      setGrantOpen(false);
      setGrantUserId("");
      setUserSearch("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Grant failed", description: err.message || "Could not grant founder status" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/admin/founders/revoke/${userId}`, undefined),
    onSuccess: () => {
      toast({ title: "Founder revoked", description: "Founder status has been removed." });
      qc.invalidateQueries({ queryKey: ["/api/admin/founders/status"] });
      setRevokeTarget(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Revoke failed", description: err.message || "Could not revoke founder status" });
    },
  });

  const handleGrant = () => {
    const id = Number(grantUserId);
    if (!id || isNaN(id)) {
      toast({ variant: "destructive", title: "Invalid user ID", description: "Please enter or select a valid numeric user ID." });
      return;
    }
    grantMutation.mutate({ userId: id, founderType: grantType });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Copied!", description: code });
    });
  };

  const memberPct = status ? Math.round((status.memberSpotsClaimed / status.memberSpotsTotal) * 100) : 0;
  const entPct = status ? Math.round((status.enterpriseSpotsClaimed / status.enterpriseSpotsTotal) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid="admin-founders-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="heading-founders">
            <Trophy className="w-5 h-5 text-amber-400" />
            Founders Program
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the Founding 500 member and enterprise slots</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-founders">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          {!status?.isActive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold" data-testid="button-launch-founders">
                  <Rocket className="w-3.5 h-3.5" />
                  Launch Program
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Launch the Founders Program?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will activate the Founders Program and send announcement emails to all active Sharp, Edge, and Max subscribers.
                    This action cannot be undone. Make sure all pricing, benefits, and copy are finalized before proceeding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={() => launchMutation.mutate()}
                    data-testid="confirm-launch-founders"
                  >
                    {launchMutation.isPending ? "Launching..." : "Yes, Launch Now"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {status?.isActive && (
            <Button size="sm" className="gap-1.5" onClick={() => setGrantOpen(true)} data-testid="button-manual-grant">
              <Gift className="w-3.5 h-3.5" />
              Manual Grant
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : status && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-program-status">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Program Status</p>
                {status.isActive ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1" variant="outline" data-testid="badge-program-active">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/15 text-gray-400 border-gray-500/25 gap-1" data-testid="badge-program-inactive">
                    <AlertTriangle className="w-3.5 h-3.5" /> Not Launched
                  </Badge>
                )}
                {status.launchedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Launched {new Date(status.launchedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-member-slots">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Member Slots</p>
                  <span className="text-xs font-mono text-primary" data-testid="stat-member-claimed">{status.memberSpotsClaimed}/{status.memberSpotsTotal}</span>
                </div>
                <Progress value={memberPct} className="h-1.5" />
                <p className="text-2xl font-bold" data-testid="stat-member-remaining">{status.memberSpotsRemaining}</p>
                <p className="text-[10px] text-muted-foreground">spots remaining</p>
              </CardContent>
            </Card>

            <Card data-testid="card-enterprise-slots">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Enterprise Slots</p>
                  <span className="text-xs font-mono text-amber-400" data-testid="stat-enterprise-claimed">{status.enterpriseSpotsClaimed}/{status.enterpriseSpotsTotal}</span>
                </div>
                <Progress value={entPct} className="h-1.5" />
                <p className="text-2xl font-bold text-amber-400" data-testid="stat-enterprise-remaining">{status.enterpriseSpotsRemaining}</p>
                <p className="text-[10px] text-muted-foreground">spots remaining</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-founders">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Total Founders</p>
                <p className="text-3xl font-bold" data-testid="stat-total-founders">{status.founders.length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {status.founders.filter(f => f.founderType === "enterprise").length} enterprise ·{" "}
                  {status.founders.filter(f => f.founderType === "member").length} member
                </p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-founders-roster">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Founders Roster
                <Badge variant="outline" className="ml-auto text-xs">{status.founders.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {status.founders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No founders yet.</p>
                  {status.isActive ? (
                    <p className="text-xs mt-1">Founders are auto-granted on subscription or manually granted here.</p>
                  ) : (
                    <p className="text-xs mt-1">Launch the program first to begin granting founder status.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-xs">#</TableHead>
                        <TableHead className="text-xs">Username</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Tier</TableHead>
                        <TableHead className="text-xs">Referral Code</TableHead>
                        <TableHead className="text-xs">Joined</TableHead>
                        <TableHead className="w-20 text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {status.founders.map(f => (
                        <TableRow key={f.founderNumber} data-testid={`row-founder-${f.founderNumber}`}>
                          <TableCell className="font-mono text-xs font-bold text-primary" data-testid={`text-founder-num-${f.founderNumber}`}>
                            #{f.founderNumber}
                          </TableCell>
                          <TableCell className="font-medium text-sm" data-testid={`text-founder-username-${f.founderNumber}`}>
                            {f.username}
                          </TableCell>
                          <TableCell><TypeBadge type={f.founderType} /></TableCell>
                          <TableCell><TierBadge tier={f.tier} /></TableCell>
                          <TableCell>
                            <button
                              className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => copyCode(f.founderType === "enterprise"
                                ? `SORS-E${String(f.founderNumber).padStart(3, "0")}`
                                : `SORS-F${String(f.founderNumber).padStart(3, "0")}`)}
                              data-testid={`button-copy-code-${f.founderNumber}`}
                            >
                              {f.founderType === "enterprise"
                                ? `SORS-E${String(f.founderNumber).padStart(3, "0")}`
                                : `SORS-F${String(f.founderNumber).padStart(3, "0")}`}
                              <Copy className="w-3 h-3 opacity-50" />
                            </button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(f.joinedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => setRevokeTarget(f)}
                              data-testid={`button-revoke-${f.founderNumber}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
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
        </>
      )}

      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-manual-grant">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Manual Founder Grant
            </DialogTitle>
            <DialogDescription>
              Search for a user and select their founder type. Enterprise is reserved for co-founder deals — never auto-granted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Search User</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Search by username, email, or ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  data-testid="input-user-search"
                />
              </div>

              {userSearch.trim() && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
                  ) : filteredUsers.map(u => (
                    <button
                      key={u.id}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors ${String(u.id) === grantUserId ? "bg-primary/10" : ""}`}
                      onClick={() => { setGrantUserId(String(u.id)); setUserSearch(u.username); }}
                      data-testid={`option-user-${u.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{u.username}</span>
                        {u.is_founder && <Badge variant="outline" className="text-[9px] px-1 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">Founder</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TierBadge tier={u.subscription_tier || u.tier || "free"} />
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {u.id}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">User ID</Label>
              <Input
                placeholder="Numeric user ID"
                value={grantUserId}
                onChange={e => setGrantUserId(e.target.value)}
                type="number"
                data-testid="input-grant-user-id"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Founder Type</Label>
              <Select value={grantType} onValueChange={(v) => setGrantType(v as "member" | "enterprise")}>
                <SelectTrigger data-testid="select-founder-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member Founder (counts toward 500)</SelectItem>
                  <SelectItem value="enterprise">Enterprise Founder (co-founder deal, counts toward 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {grantType === "enterprise" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                Enterprise founders receive Max access + all future enterprise co-founder privileges. Reserved for formal business arrangements.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setGrantOpen(false); setGrantUserId(""); setUserSearch(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!grantUserId || grantMutation.isPending}
              data-testid="button-confirm-grant"
            >
              {grantMutation.isPending ? "Granting..." : "Grant Founder Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={open => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Founder Status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove founder status from <strong>{revokeTarget?.username}</strong> (Founder #{revokeTarget?.founderNumber}).
              Their referral code will be invalidated and the slot counter will decrement. This action can be re-granted if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const founder = revokeTarget;
                if (!founder) return;
                const userId = allUsers.find(u => u.username === founder.username)?.id;
                if (!userId) {
                  toast({ variant: "destructive", title: "User not found in admin list", description: "Refresh users and try again." });
                  setRevokeTarget(null);
                  return;
                }
                revokeMutation.mutate(userId);
              }}
              data-testid="confirm-revoke-founder"
            >
              {revokeMutation.isPending ? "Revoking..." : "Yes, Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

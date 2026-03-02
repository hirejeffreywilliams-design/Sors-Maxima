import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Application } from "@shared/schema";

export default function AdminApplications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ["/api/admin/applications"],
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/applications/${id}`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: "Application updated successfully" });
      setSelectedApp(null);
      setAdminNotes("");
      setReviewAction(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-600 no-default-hover-elevate">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="no-default-hover-elevate">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="no-default-hover-elevate">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tier Applications</h1>
          <p className="text-muted-foreground">Review and manage member applications for Edge and Max tiers.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            {applications.length} total applications received.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{app.username}</span>
                      <span className="text-xs text-muted-foreground">{app.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase font-bold">
                      {app.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {app.experience}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(app.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewAction("approved");
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewAction("rejected");
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setSelectedApp(app)}
                      >
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction ? `Review Application - ${selectedApp?.username}` : `Application Details - ${selectedApp?.username}`}
            </DialogTitle>
            <DialogDescription>
              User applying for <span className="font-bold uppercase">{selectedApp?.tier}</span> tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Username</p>
                <p className="text-sm">{selectedApp?.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                <p className="text-sm">{selectedApp?.email}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Experience</p>
              <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">{selectedApp?.experience}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Goals</p>
              <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">{selectedApp?.goals}</p>
            </div>

            {selectedApp?.status !== "pending" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Admin Notes</p>
                <p className="text-sm bg-muted/50 p-3 rounded-md mt-1 italic">
                  {selectedApp?.adminNotes || "No notes provided."}
                </p>
              </div>
            )}

            {reviewAction && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Admin Review Notes</p>
                <Textarea
                  placeholder="Add context for approval/rejection (sent to user in rejection email)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedApp(null)}>
              Cancel
            </Button>
            {reviewAction && (
              <Button
                variant={reviewAction === "approved" ? "default" : "destructive"}
                onClick={() =>
                  mutation.mutate({
                    id: selectedApp!.id,
                    status: reviewAction,
                    adminNotes,
                  })
                }
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : reviewAction === "approved" ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirm {reviewAction.charAt(0).toUpperCase() + reviewAction.slice(1)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

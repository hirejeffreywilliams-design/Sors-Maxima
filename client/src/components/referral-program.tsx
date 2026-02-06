import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Gift, Users, DollarSign, CheckCircle, Clock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Referral {
  name: string;
  date: string;
  status: "pending" | "completed";
  reward: number;
}

interface ReferralData {
  code: string;
  totalReferrals: number;
  conversions: number;
  earned: number;
  referrals: Referral[];
}

export function ReferralProgram() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral"],
  });

  const referralCode = data?.code || "SORS-XXXXXX";
  const referralLink = `https://sorsmaxima.com/ref/${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: "Referral code copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="p-6"><div className="h-32 animate-pulse bg-muted rounded-md" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Earn $10 credit per successful referral. Your referee gets $5 credit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Referral Code</label>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                readOnly
                className="font-mono"
                data-testid="input-referral-code"
              />
              <Button
                variant="outline"
                onClick={handleCopyCode}
                data-testid="button-copy-referral-code"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Referral Link</label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="text-sm"
                data-testid="input-referral-link"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
                data-testid="button-copy-referral-link"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-referrals">{data?.totalReferrals ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-conversions">{data?.conversions ?? 0}</p>
              <p className="text-sm text-muted-foreground">Conversions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-earned">${data?.earned ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold shrink-0">1</span>
              <div>
                <p className="font-medium">Share your referral code or link</p>
                <p className="text-sm text-muted-foreground">Send it to friends who are interested in smarter sports betting</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold shrink-0">2</span>
              <div>
                <p className="font-medium">They sign up and subscribe</p>
                <p className="text-sm text-muted-foreground">Your friend creates an account using your link and upgrades to any paid plan</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-bold shrink-0">3</span>
              <div>
                <p className="font-medium">You both earn credits</p>
                <p className="text-sm text-muted-foreground">You get $10 credit and your friend gets $5 credit applied to their account</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {(!data?.referrals || data.referrals.length === 0) ? (
            <p className="text-muted-foreground text-center py-4">No referrals yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrals.map((ref, i) => (
                  <TableRow key={i} data-testid={`row-referral-${i}`}>
                    <TableCell className="font-medium">{ref.name}</TableCell>
                    <TableCell className="text-muted-foreground">{ref.date}</TableCell>
                    <TableCell>
                      <Badge variant={ref.status === "completed" ? "default" : "secondary"} data-testid={`badge-referral-status-${i}`}>
                        {ref.status === "completed" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {ref.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ref.reward > 0 ? `$${ref.reward}` : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

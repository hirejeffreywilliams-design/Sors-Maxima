import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  Crown, 
  Star, 
  Plus, 
  Search, 
  Target,
  Wallet,
  Send,
  Check,
  Lock,
  MessageCircle,
  Zap,
  Gift
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useSEO } from "@/hooks/use-seo";

interface Community {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  bannerColor: string;
  isPublic: boolean;
  isPremium: boolean;
  monthlyPrice: number;
  memberCount: number;
  pickAccuracy: number;
  totalPicks: number;
  winningPicks: number;
  createdAt: string;
  tags: string[];
  discordWebhook?: string;
}

interface Pick {
  id: string;
  communityId: string;
  authorId: string;
  authorUsername: string;
  title: string;
  sport: string;
  description: string;
  odds: string;
  stake: number;
  confidence: 'low' | 'medium' | 'high' | 'max';
  status: 'pending' | 'won' | 'lost' | 'push' | 'void';
  isPremium: boolean;
  price: number;
  likes: number;
  createdAt: string;
}

interface CreatorEarnings {
  totalEarnings: number;
  pendingPayout: number;
  tips: number;
  subscriptions: number;
  paidPicks: number;
}

const confidenceColors = {
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  max: 'bg-red-500/10 text-red-500',
};

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  won: 'bg-green-500/10 text-green-500',
  lost: 'bg-red-500/10 text-red-500',
  push: 'bg-gray-500/10 text-gray-500',
  void: 'bg-gray-500/10 text-gray-500',
};

function CommunityCard({ community, onJoin }: { community: Community; onJoin: () => void }) {
  return (
    <Card className="hover-elevate cursor-pointer">
      <CardHeader className="pb-3">
        <div className={`w-full h-16 rounded-lg bg-gradient-to-r ${community.bannerColor} mb-3`} />
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {community.name}
              {community.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">{community.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {community.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{community.memberCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">{community.pickAccuracy.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
          <div>
            <div className="text-lg font-bold">{community.totalPicks}</div>
            <div className="text-xs text-muted-foreground">Picks</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>by @{community.creatorUsername}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {community.isPremium && community.monthlyPrice > 0 ? (
          <Button className="w-full gap-2" onClick={onJoin} data-testid={`button-join-${community.id}`}>
            <Lock className="w-4 h-4" />
            Subscribe ${community.monthlyPrice}/mo
          </Button>
        ) : (
          <Button variant="secondary" className="w-full gap-2" onClick={onJoin} data-testid={`button-join-${community.id}`}>
            <Plus className="w-4 h-4" />
            Join Free
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function PickCard({ pick, onTip }: { pick: Pick; onTip: () => void }) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {pick.title}
              {pick.isPremium && pick.price > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <DollarSign className="w-3 h-3" />
                  {pick.price}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              by @{pick.authorUsername} • {new Date(pick.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={statusColors[pick.status]}>{pick.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{pick.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{pick.sport}</Badge>
          <Badge variant="outline">{pick.odds}</Badge>
          <Badge variant="outline">{pick.stake}u</Badge>
          <Badge className={confidenceColors[pick.confidence]}>
            {pick.confidence.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={onTip} data-testid={`button-tip-${pick.id}`}>
          <Gift className="w-4 h-4" />
          Tip
        </Button>
        <Button variant="ghost" size="sm" className="gap-1">
          <MessageCircle className="w-4 h-4" />
          {pick.likes}
        </Button>
      </CardFooter>
    </Card>
  );
}

function CreateCommunityDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [tags, setTags] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/communities", {
        name,
        description,
        isPublic: true,
        isPremium,
        monthlyPrice: isPremium ? parseFloat(monthlyPrice) || 0 : 0,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        discordWebhook: discordWebhook || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Community Created", description: "Your tipster community is now live!" });
      setOpen(false);
      onCreated();
      setName("");
      setDescription("");
      setIsPremium(false);
      setMonthlyPrice("");
      setTags("");
      setDiscordWebhook("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create community", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-create-community">
          <Plus className="w-4 h-4" />
          Create Community
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Tipster Community</DialogTitle>
          <DialogDescription>
            Share your picks, build a following, and earn money from tips and subscriptions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Community Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Sharp NBA Plays"
              data-testid="input-community-name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Professional NBA analysis with proven track record..."
              data-testid="input-community-description"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input 
              id="tags" 
              value={tags} 
              onChange={(e) => setTags(e.target.value)}
              placeholder="NBA, Props, High Volume"
              data-testid="input-community-tags"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="premium">Premium Community</Label>
              <p className="text-xs text-muted-foreground">Charge monthly subscription</p>
            </div>
            <Switch 
              id="premium" 
              checked={isPremium} 
              onCheckedChange={setIsPremium}
              data-testid="switch-premium"
            />
          </div>
          {isPremium && (
            <div>
              <Label htmlFor="price">Monthly Price ($)</Label>
              <Input 
                id="price" 
                type="number" 
                value={monthlyPrice} 
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="29.99"
                data-testid="input-monthly-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You receive 85% • Platform keeps 15%
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="discord" className="flex items-center gap-2">
              <SiDiscord className="w-4 h-4" />
              Discord Webhook (optional)
            </Label>
            <Input 
              id="discord" 
              value={discordWebhook} 
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              data-testid="input-discord-webhook"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Picks will be auto-posted to your Discord server
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!name || !description || createMutation.isPending}
            data-testid="button-submit-community"
          >
            {createMutation.isPending ? "Creating..." : "Create Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TipDialog({ pick, onClose }: { pick: Pick | null; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const tipMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tips", {
        toUserId: pick?.authorId,
        toUsername: pick?.authorUsername,
        amount: parseFloat(amount),
        message,
        pickId: pick?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Tip Sent!", description: `$${amount} sent to @${pick?.authorUsername}` });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/earnings"] });
      onClose();
      setAmount("");
      setMessage("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send tip", variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!pick} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Tip to @{pick?.authorUsername}</DialogTitle>
          <DialogDescription>
            Support this tipster with a one-time tip for their pick.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {[5, 10, 25, 50].map((preset) => (
              <Button 
                key={preset}
                variant={amount === String(preset) ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(String(preset))}
                data-testid={`button-tip-preset-${preset}`}
              >
                ${preset}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="tip-amount">Custom Amount ($)</Label>
            <Input 
              id="tip-amount"
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              data-testid="input-tip-amount"
            />
          </div>
          <div>
            <Label htmlFor="tip-message">Message (optional)</Label>
            <Input 
              id="tip-message"
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Great pick! 🔥"
              data-testid="input-tip-message"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Creator receives 85% • Platform fee 15%
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => tipMutation.mutate()}
            disabled={!amount || parseFloat(amount) <= 0 || tipMutation.isPending}
            className="gap-2"
            data-testid="button-send-tip"
          >
            <Send className="w-4 h-4" />
            {tipMutation.isPending ? "Sending..." : `Send $${amount || 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TipsterCommunities() {
  useSEO({ title: "Tipster Communities", description: "Join and follow expert tipster communities" });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [tipPick, setTipPick] = useState<Pick | null>(null);

  const { data: communities = [] } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
  });

  const { data: earnings } = useQuery<CreatorEarnings>({
    queryKey: ["/api/creator/earnings"],
  });

  const { data: myCommunities = [] } = useQuery<Community[]>({
    queryKey: ["/api/creator/communities"],
  });

  const refetchAllCommunities = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/creator/communities"] });
  };

  const { data: picks = [] } = useQuery<Pick[]>({
    queryKey: ["/api/communities", selectedCommunity?.id, "picks"],
    enabled: !!selectedCommunity,
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/join`, {
        isPaid: false, // For now, just free joins
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Joined!", description: "You're now a member of this community" });
      refetchAllCommunities();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to join community", 
        variant: "destructive" 
      });
    },
  });

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
              <Users className="w-6 h-6 text-white" />
            </div>
            Tipster Communities
          </h1>
          <p className="text-muted-foreground mt-1">
            Join communities, share picks, and earn from your betting expertise
          </p>
        </div>
        <CreateCommunityDialog onCreated={refetchAllCommunities} />
      </div>

      <Tabs defaultValue="discover" className="space-y-4">
        <TabsList>
          <TabsTrigger value="discover" className="gap-2" data-testid="tab-discover">
            <Search className="w-4 h-4" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="my-communities" className="gap-2" data-testid="tab-my-communities">
            <Star className="w-4 h-4" />
            My Communities
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2" data-testid="tab-earnings">
            <Wallet className="w-4 h-4" />
            Earnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search communities by name, sport, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-communities"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community) => (
              <CommunityCard 
                key={community.id} 
                community={community}
                onJoin={() => joinMutation.mutate(community.id)}
              />
            ))}
          </div>

          {filteredCommunities.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No communities found matching your search</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-communities" className="space-y-4">
          {myCommunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCommunities.map((community) => (
                <Card key={community.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedCommunity(community)}>
                  <CardHeader className="pb-3">
                    <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${community.bannerColor} mb-2`} />
                    <CardTitle className="text-lg flex items-center gap-2">
                      {community.name}
                      <Badge variant="outline">Owner</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold">{community.memberCount}</div>
                        <div className="text-xs text-muted-foreground">Members</div>
                      </div>
                      <div>
                        <div className="font-bold text-green-500">{community.pickAccuracy.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div>
                        <div className="font-bold">{community.totalPicks}</div>
                        <div className="text-xs text-muted-foreground">Picks</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Communities Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first tipster community and start earning!
                </p>
                <CreateCommunityDialog onCreated={refetchAllCommunities} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  ${earnings?.totalEarnings.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Pending Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${earnings?.pendingPayout.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-500" />
                  From Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  ${earnings?.tips.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  From Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  ${earnings?.subscriptions.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Earnings Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Tips</h4>
                    <p className="text-sm text-muted-foreground">
                      Members can tip you for great picks. You receive 85%.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Subscriptions</h4>
                    <p className="text-sm text-muted-foreground">
                      Charge monthly for premium access. You receive 85%.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Paid Picks</h4>
                    <p className="text-sm text-muted-foreground">
                      Sell individual premium picks. You receive 85%.
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4" />
                Platform fee of 15% supports app development and maintenance
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TipDialog pick={tipPick} onClose={() => setTipPick(null)} />
    </div>
  );
}

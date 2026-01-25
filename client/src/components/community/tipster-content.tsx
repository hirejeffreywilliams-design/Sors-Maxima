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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Crown, 
  Star, 
  Plus, 
  Search, 
  Target,
  Wallet,
  Send,
  Lock,
  MessageCircle,
  Zap,
  Gift,
  DollarSign
} from "lucide-react";

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

function CreateCommunityDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("");
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
            Share picks and earn from tips/subscriptions (you get 85%).
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
              placeholder="Professional analysis..."
              data-testid="input-community-description"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input 
              id="tags" 
              value={tags} 
              onChange={(e) => setTags(e.target.value)}
              placeholder="NBA, Props"
              data-testid="input-community-tags"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="premium">Premium Community</Label>
              <p className="text-xs text-muted-foreground">Charge monthly</p>
            </div>
            <Switch id="premium" checked={isPremium} onCheckedChange={setIsPremium} data-testid="switch-premium" />
          </div>
          {isPremium && (
            <div>
              <Label htmlFor="price">Monthly Price ($)</Label>
              <Input id="price" type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} placeholder="29.99" data-testid="input-price" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} data-testid="button-submit-community">
            {createMutation.isPending ? "Creating..." : "Create Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TipsterContent() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

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

  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/join`, { isPaid: false });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Joined!", description: "You're now a member" });
      refetchAllCommunities();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join", variant: "destructive" });
    },
  });

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">Join communities, share picks, and earn from your expertise</p>
        <CreateCommunityDialog onCreated={refetchAllCommunities} />
      </div>

      <Tabs defaultValue="discover" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="discover" className="gap-1 text-xs sm:text-sm" data-testid="tab-discover">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="my-communities" className="gap-1 text-xs sm:text-sm" data-testid="tab-my-communities">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Mine</span>
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-1 text-xs sm:text-sm" data-testid="tab-earnings">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Earn</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search communities..."
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
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No communities found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-communities" className="space-y-4">
          {myCommunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCommunities.map((community) => (
                <Card key={community.id} className="hover-elevate">
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
              <CardContent className="p-8 text-center">
                <Crown className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Communities Yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">Create your first community and start earning!</p>
                <CreateCommunityDialog onCreated={refetchAllCommunities} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-green-500" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl font-bold text-green-500">
                  ${earnings?.totalEarnings.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl font-bold">
                  ${earnings?.pendingPayout.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <Gift className="w-3 h-3 text-purple-500" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl font-bold text-purple-500">
                  ${earnings?.tips.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-500" />
                  Subs
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl font-bold text-yellow-500">
                  ${earnings?.subscriptions.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How Earnings Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Tips</h4>
                    <p className="text-xs text-muted-foreground">You get 85%</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Subscriptions</h4>
                    <p className="text-xs text-muted-foreground">You get 85%</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Paid Picks</h4>
                    <p className="text-xs text-muted-foreground">You get 85%</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                Platform fee 15% supports app development
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

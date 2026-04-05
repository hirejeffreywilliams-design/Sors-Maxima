import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Zap,
  Users,
  Trophy,
  TrendingUp,
  Plus,
  Link2,
  Target,
  Flame,
  Award,
} from "lucide-react";

interface ChainMember {
  userId: number;
  position: number;
  joinedAt: string;
}

interface ChainPrediction {
  memberId: number;
  prediction: string;
  result: string | null;
  multiplierAtTime: number;
  createdAt: string;
}

interface Chain {
  id: number;
  name: string;
  sport: string;
  status: "open" | "active" | "completed";
  currentMultiplier: number;
  streakCount: number;
  maxMembers: number;
  createdAt: string;
}

interface ChainStatus {
  id: number;
  name: string;
  sport: string;
  status: string;
  currentMultiplier: number;
  streakCount: number;
  members: ChainMember[];
  predictions: ChainPrediction[];
}

interface LeaderboardEntry {
  id: number;
  name: string;
  sport: string;
  current_multiplier: number;
  streak_count: number;
  best_streak: number;
  member_count: number;
  badge_count: number;
  status: string;
}

const MULTIPLIER_COLORS: Record<number, string> = {
  1: "bg-zinc-600",
  1.5: "bg-blue-600",
  2: "bg-green-600",
  3: "bg-amber-600",
  5: "bg-red-600",
};

function getMultiplierColor(mult: number): string {
  if (mult >= 5) return "bg-red-600";
  if (mult >= 3) return "bg-amber-600";
  if (mult >= 2) return "bg-green-600";
  if (mult >= 1.5) return "bg-blue-600";
  return "bg-zinc-600";
}

export default function MomentumChains() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState("NBA");
  const [activeChainId, setActiveChainId] = useState<number | null>(null);
  const [predictionText, setPredictionText] = useState("");

  const { data: chains = [], isLoading } = useQuery<Chain[]>({
    queryKey: [filter === "all" ? "/api/chains" : `/api/chains?filter=${filter}`],
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/chains/leaderboard"],
  });

  const { data: activeChain } = useQuery<ChainStatus>({
    queryKey: [`/api/chains/${activeChainId}/status`],
    enabled: !!activeChainId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; sport: string }) => {
      const res = await apiRequest("POST", "/api/chains", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });
      setCreateOpen(false);
      setNewName("");
      toast({ title: "Chain created", description: "Your prediction chain is live!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (chainId: number) => {
      const res = await apiRequest("POST", `/api/chains/${chainId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });
      toast({ title: "Joined!", description: "You joined the prediction chain." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const predictMutation = useMutation({
    mutationFn: async ({ chainId, prediction }: { chainId: number; prediction: string }) => {
      const res = await apiRequest("POST", `/api/chains/${chainId}/predict`, { prediction });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chains/${activeChainId}/status`] });
      setPredictionText("");
      toast({ title: "Prediction submitted!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tools">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <Zap className="h-7 w-7 text-amber-500" />
        <h1 className="text-2xl font-bold">Momentum Chains</h1>
        <Badge variant="outline" className="ml-2">Beta</Badge>
      </div>

      <Tabs defaultValue="lobby" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lobby"><Users className="h-4 w-4 mr-1" /> Chain Lobby</TabsTrigger>
          <TabsTrigger value="active"><Flame className="h-4 w-4 mr-1" /> Active Chain</TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy className="h-4 w-4 mr-1" /> Leaderboard</TabsTrigger>
        </TabsList>

        {/* Chain Lobby */}
        <TabsContent value="lobby" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Chain
            </Button>
          </div>

          {isLoading && <p className="text-muted-foreground">Loading chains...</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chains.map((chain) => (
              <Card key={chain.id} className="hover:border-amber-500/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{chain.name}</CardTitle>
                    <Badge variant={chain.status === "open" ? "default" : chain.status === "active" ? "secondary" : "outline"}>
                      {chain.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-3 w-3" /> {chain.sport}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${getMultiplierColor(chain.currentMultiplier)} text-white`}>
                          {chain.currentMultiplier}x
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Flame className="h-3 w-3 text-orange-500" /> {chain.streakCount} streak
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {chain.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => joinMutation.mutate(chain.id)}>
                          <Link2 className="h-3 w-3 mr-1" /> Join
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setActiveChainId(chain.id)}>
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Chain Visualization */}
        <TabsContent value="active" className="space-y-4">
          {!activeChain ? (
            <p className="text-muted-foreground">Select a chain from the lobby to view it here.</p>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{activeChain.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge>{activeChain.sport}</Badge>
                      <span className={`text-sm font-bold px-3 py-1 rounded ${getMultiplierColor(activeChain.currentMultiplier)} text-white`}>
                        {activeChain.currentMultiplier}x Multiplier
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> {activeChain.members.length} members
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" /> {activeChain.streakCount} consecutive correct
                    </div>
                    {activeChain.streakCount >= 5 && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                        <Award className="h-3 w-3 mr-1" /> Resonance!
                      </Badge>
                    )}
                  </div>

                  {/* Multiplier progress bar */}
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-1">Multiplier Progress</div>
                    <div className="flex gap-1">
                      {[1, 1.5, 2, 3, 5].map((m, i) => (
                        <div
                          key={m}
                          className={`h-2 flex-1 rounded ${activeChain.currentMultiplier >= m ? getMultiplierColor(m) : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1x</span><span>1.5x</span><span>2x</span><span>3x</span><span>5x</span>
                    </div>
                  </div>

                  {/* Prediction timeline */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Prediction Timeline</h3>
                    {activeChain.predictions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No predictions yet. Be the first!</p>
                    )}
                    {activeChain.predictions.map((pred, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                        <div className={`w-2 h-2 rounded-full ${pred.result === "correct" ? "bg-green-500" : pred.result === "incorrect" ? "bg-red-500" : "bg-yellow-500"}`} />
                        <span className="text-sm flex-1">{pred.prediction}</span>
                        <Badge variant="outline" className="text-xs">{pred.multiplierAtTime}x</Badge>
                        <span className="text-xs text-muted-foreground">
                          {pred.result ?? "pending"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Submit prediction */}
                  {activeChain.status !== "completed" && (
                    <div className="flex gap-2 mt-4">
                      <Input
                        placeholder="Enter your prediction..."
                        value={predictionText}
                        onChange={(e) => setPredictionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && predictionText.trim()) {
                            predictMutation.mutate({ chainId: activeChain.id, prediction: predictionText.trim() });
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (predictionText.trim()) {
                            predictMutation.mutate({ chainId: activeChain.id, prediction: predictionText.trim() });
                          }
                        }}
                        disabled={!predictionText.trim() || predictMutation.isPending}
                      >
                        <Zap className="h-4 w-4 mr-1" /> Predict
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Top Prediction Chains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setActiveChainId(entry.id)}
                  >
                    <span className={`text-lg font-bold w-8 text-center ${i < 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-3">
                        <span>{entry.sport}</span>
                        <span>{entry.member_count} members</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-bold">{entry.best_streak} best streak</div>
                        <div className="text-xs text-muted-foreground">{entry.current_multiplier}x current</div>
                      </div>
                      {entry.badge_count > 0 && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                          <Award className="h-3 w-3 mr-1" /> {entry.badge_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No chains yet. Create the first one!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Chain Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Prediction Chain</DialogTitle>
            <DialogDescription>
              Start a new chain and invite friends. Build momentum with consecutive correct predictions!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Chain name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Select value={newSport} onValueChange={setNewSport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NBA">NBA</SelectItem>
                <SelectItem value="NFL">NFL</SelectItem>
                <SelectItem value="MLB">MLB</SelectItem>
                <SelectItem value="NHL">NHL</SelectItem>
                <SelectItem value="NCAAB">NCAAB</SelectItem>
                <SelectItem value="NCAAF">NCAAF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName, sport: newSport })}
              disabled={!newName.trim() || createMutation.isPending}
            >
              Create Chain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

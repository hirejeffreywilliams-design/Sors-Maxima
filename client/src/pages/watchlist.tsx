import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  StarOff,
  Search,
  Eye,
  Activity,
  Trophy,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Bell,
  BellOff,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";

interface WatchlistItem {
  id: string;
  type: "team" | "game" | "player";
  name: string;
  sport: string;
  details: string;
  addedAt: string;
  alerts: boolean;
}

interface WatchlistGame {
  id: string;
  name: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  status: string;
  homeScore: number;
  awayScore: number;
}

const POPULAR_TEAMS: Record<string, string[]> = {
  NBA: ["Lakers", "Celtics", "Warriors", "76ers", "Bucks", "Nuggets", "Heat", "Suns", "Knicks", "Mavericks"],
  NFL: ["Chiefs", "49ers", "Eagles", "Cowboys", "Bills", "Ravens", "Lions", "Dolphins", "Bengals", "Packers"],
  MLB: ["Yankees", "Dodgers", "Astros", "Braves", "Mets", "Phillies", "Rangers", "Cardinals", "Red Sox", "Cubs"],
  NHL: ["Oilers", "Panthers", "Rangers", "Bruins", "Avalanche", "Stars", "Lightning", "Maple Leafs", "Hurricanes", "Golden Knights"],
};

export default function WatchlistPage() {
  useSEO({ title: "Watchlist", description: "Track your favorite games and betting opportunities" });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("teams");
  const [activeSport, setActiveSport] = useState("NBA");

  const { data: watchlist, isLoading: watchlistLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/user/watchlist"],
  });

  const { data: liveGames, isLoading: gamesLoading } = useQuery<WatchlistGame[]>({
    queryKey: ["/api/user/watchlist/live"],
    refetchInterval: 60000,
  });

  const addItem = useMutation({
    mutationFn: async (item: { type: string; name: string; sport: string }) => {
      return apiRequest("POST", "/api/user/watchlist", item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      toast({ title: "Added to watchlist" });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/user/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const toggleAlerts = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/user/watchlist/${id}/alerts`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
    },
  });

  const items = watchlist || [];
  const teamItems = items.filter(i => i.type === "team");
  const gameItems = items.filter(i => i.type === "game");

  const isTeamWatched = (name: string) => items.some(i => i.type === "team" && i.name === name);

  const filteredTeams = POPULAR_TEAMS[activeSport]?.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="page-watchlist">
      <PageHero
        title="Watchlist"
        subtitle="Track your favorite teams and games in one place"
        description="Search for any team and save them here. Once added, upcoming games for your tracked teams appear automatically with current odds and any available model picks. Use the notification toggle on each team to get alerts when their odds move significantly. This page is your shortlist before building a daily parlay."
        badge="Monitoring"
        variant="blue"
        icon={<Star className="w-6 h-6" />}
        actions={
          <Badge variant="secondary" className="gap-1">
            <Eye className="w-3 h-3" />
            {items.length} items tracked
          </Badge>
        }
        data-testid="text-watchlist-title"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="teams" data-testid="tab-watchlist-teams">
            <Trophy className="w-4 h-4 mr-1" />
            Teams ({teamItems.length})
          </TabsTrigger>
          <TabsTrigger value="games" data-testid="tab-watchlist-games">
            <Activity className="w-4 h-4 mr-1" />
            Live Games
          </TabsTrigger>
          <TabsTrigger value="discover" data-testid="tab-watchlist-discover">
            <Plus className="w-4 h-4 mr-1" />
            Add Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          {watchlistLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : teamItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No teams yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Add teams to your watchlist to see their games and stats at a glance</p>
                <Button onClick={() => setActiveTab("discover")} data-testid="button-add-first-team">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your First Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamItems.map((item) => (
                <Card key={item.id} className="group hover:border-primary/30 transition-colors" data-testid={`card-watchlist-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">{item.sport}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleAlerts.mutate(item.id)}
                          data-testid={`button-toggle-alerts-${item.id}`}
                        >
                          {item.alerts ? (
                            <Bell className="w-4 h-4 text-primary" />
                          ) : (
                            <BellOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem.mutate(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          {gamesLoading ? (
            <Card className="animate-pulse"><CardContent className="p-8"><div className="h-32 bg-muted rounded" /></CardContent></Card>
          ) : (liveGames || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No live games for your watchlist</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  When your watched teams play, their games will appear here with live scores
                </p>
                <Link href="/live">
                  <Button variant="outline" className="mt-4" data-testid="button-view-all-live">
                    View All Live Games
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(liveGames || []).map((game) => (
                <Card key={game.id} className="hover:border-primary/30 transition-colors" data-testid={`card-live-game-${game.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant={game.status === "in" ? "default" : "secondary"} className="shrink-0">
                          {game.status === "in" ? "LIVE" : game.status === "pre" ? "Upcoming" : "Final"}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{game.awayTeam} @ {game.homeTeam}</p>
                          <p className="text-xs text-muted-foreground">{game.sport}</p>
                        </div>
                      </div>
                      {game.status !== "pre" && (
                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums">{game.awayScore} - {game.homeScore}</p>
                        </div>
                      )}
                      {game.status === "pre" && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(game.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add Teams to Your Watchlist</CardTitle>
              <CardDescription>Select a sport and add teams you want to follow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(POPULAR_TEAMS).map((sport) => (
                  <Button
                    key={sport}
                    variant={activeSport === sport ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveSport(sport)}
                    data-testid={`button-sport-filter-${sport}`}
                  >
                    {sport}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-teams"
                />
              </div>

              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredTeams.map((team) => {
                    const watched = isTeamWatched(team);
                    return (
                      <button
                        key={team}
                        onClick={() => {
                          if (watched) {
                            const item = items.find(i => i.type === "team" && i.name === team);
                            if (item) removeItem.mutate(item.id);
                          } else {
                            addItem.mutate({ type: "team", name: team, sport: activeSport });
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                          watched
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`button-team-${team}`}
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">{team}</span>
                        </div>
                        {watched ? (
                          <Star className="w-4 h-4 fill-primary text-primary" />
                        ) : (
                          <StarOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

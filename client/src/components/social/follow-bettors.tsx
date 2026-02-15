import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, UserCheck, Search, TrendingUp, Star, 
  Bell, BellOff, Copy, Flame, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface Bettor {
  id: string;
  username: string;
  specialty: string[];
  roi: number;
  winRate: number;
  followers: number;
  isFollowing: boolean;
  hasNotifications: boolean;
  recentPicks: number;
  streak: number;
  verified: boolean;
}

const mockBettors: Bettor[] = [
  { 
    id: "1", username: "NFLSharp", specialty: ["NFL", "Props"], roi: 28.5, 
    winRate: 59, followers: 2340, isFollowing: true, hasNotifications: true,
    recentPicks: 12, streak: 6, verified: true
  },
  { 
    id: "2", username: "NBAWhisperer", specialty: ["NBA", "Totals"], roi: 24.2, 
    winRate: 57, followers: 1890, isFollowing: true, hasNotifications: false,
    recentPicks: 8, streak: 3, verified: true
  },
  { 
    id: "3", username: "PropMaster", specialty: ["Player Props", "SGP"], roi: 32.1, 
    winRate: 55, followers: 3210, isFollowing: false, hasNotifications: false,
    recentPicks: 15, streak: 4, verified: true
  },
  { 
    id: "4", username: "UnderdogKing", specialty: ["NFL", "NBA", "Underdogs"], roi: 45.8, 
    winRate: 48, followers: 1560, isFollowing: false, hasNotifications: false,
    recentPicks: 6, streak: 2, verified: false
  },
  { 
    id: "5", username: "HockeyEdge", specialty: ["NHL", "Puck Lines"], roi: 19.4, 
    winRate: 56, followers: 890, isFollowing: false, hasNotifications: false,
    recentPicks: 9, streak: 0, verified: true
  },
];

export function FollowBettors() {
  const [bettors, setBettors] = useState<Bettor[]>(mockBettors);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFollow = (id: string) => {
    setBettors(prev => prev.map(b => 
      b.id === id ? { ...b, isFollowing: !b.isFollowing } : b
    ));
  };

  const toggleNotifications = (id: string) => {
    setBettors(prev => prev.map(b => 
      b.id === id ? { ...b, hasNotifications: !b.hasNotifications } : b
    ));
  };

  const filteredBettors = bettors.filter(b => 
    b.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.specialty.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const following = bettors.filter(b => b.isFollowing);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
          <UserPlus className="w-5 h-5 text-blue-500" />
          Follow Top Bettors
          <QuantumBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search bettors or specialties..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-bettors"
          />
        </div>

        {following.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium">Following</span>
              <Badge variant="outline">{following.length}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              {following.map((b) => (
                <Badge key={b.id} variant="secondary" className="gap-1">
                  {b.username}
                  {b.hasNotifications && <Bell className="w-3 h-3" />}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredBettors.map((bettor) => (
            <div
              key={bettor.id}
              className="rounded-lg bg-muted/30 hover-elevate"
            >
              <div className="hidden sm:flex items-center gap-3 p-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    {bettor.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{bettor.username}</span>
                    {bettor.verified && (
                      <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-500 border-blue-500/30">
                        <Star className="w-3 h-3 fill-current" />
                        Verified
                      </Badge>
                    )}
                    {bettor.streak >= 5 && (
                      <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-500 border-orange-500/30">
                        <Flame className="w-3 h-3" />
                        {bettor.streak}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {bettor.specialty.map((s, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{bettor.followers.toLocaleString()} followers</span>
                    <span>{bettor.recentPicks} picks this week</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-bold ${bettor.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                    +{bettor.roi}% ROI
                  </p>
                  <p className="text-xs text-muted-foreground">{bettor.winRate}% win</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={bettor.isFollowing ? "secondary" : "default"}
                    onClick={() => toggleFollow(bettor.id)}
                    data-testid={`button-follow-${bettor.id}`}
                  >
                    {bettor.isFollowing ? (
                      <><UserCheck className="w-4 h-4 mr-1" /> Following</>
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-1" /> Follow</>
                    )}
                  </Button>
                  {bettor.isFollowing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleNotifications(bettor.id)}
                      data-testid={`button-notify-${bettor.id}`}
                    >
                      {bettor.hasNotifications ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="sm:hidden p-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm">
                      {bettor.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm truncate">{bettor.username}</span>
                      {bettor.verified && (
                        <Star className="w-3.5 h-3.5 text-blue-500 fill-blue-500 shrink-0" />
                      )}
                      {bettor.streak >= 5 && (
                        <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-orange-500/30">
                          <Flame className="w-2.5 h-2.5" />
                          {bettor.streak}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {bettor.specialty.map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${bettor.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                      +{bettor.roi}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">{bettor.winRate}% win</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{bettor.followers.toLocaleString()} followers</span>
                    <span>{bettor.recentPicks} picks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {bettor.isFollowing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleNotifications(bettor.id)}
                        className="px-2"
                        data-testid={`button-notify-${bettor.id}`}
                      >
                        {bettor.hasNotifications ? (
                          <Bell className="w-3.5 h-3.5" />
                        ) : (
                          <BellOff className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={bettor.isFollowing ? "secondary" : "default"}
                      onClick={() => toggleFollow(bettor.id)}
                      data-testid={`button-follow-${bettor.id}`}
                    >
                      {bettor.isFollowing ? (
                        <><UserCheck className="w-3.5 h-3.5 mr-1" /> Following</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

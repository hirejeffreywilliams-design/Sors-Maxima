import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, Users, Medal, Crown, ChevronDown, ChevronUp, Swords, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  correct: number;
}

interface Competition {
  id: string;
  title: string;
  sport: string;
  entries: number;
  maxEntries: number;
  prizePool: string;
  endTime: string;
  leaderboard: LeaderboardEntry[];
  entered: boolean;
}

export function PickCompetitions() {
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({ queryKey: ["/api/social/competitions"] });
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const joinMutation = useMutation({
    mutationFn: async ({ compId, username }: { compId: string; username: string }) => {
      await apiRequest("POST", `/api/social/competitions/${compId}/join`, { username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/competitions"] });
    },
  });

  const getTimeRemaining = (endTime: string) => {
    const diffMs = new Date(endTime).getTime() - Date.now();
    if (diffMs <= 0) return "Ended";
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Swords className="w-5 h-5 text-purple-500" />
            Pick Competitions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeEntries = competitions.filter((c) => c.entered);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Swords className="w-5 h-5 text-purple-500" />
          Pick Competitions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0" />
          <span>Data source: Live API</span>
        </div>

        {competitions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No competitions available</p>
          </div>
        ) : (
          <>
            {activeEntries.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium">Your Active Entries</p>
                  {activeEntries.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between gap-2 flex-wrap"
                      data-testid={`active-entry-${comp.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs" data-testid={`badge-active-sport-${comp.id}`}>{comp.sport}</Badge>
                        <span className="text-sm">{comp.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{getTimeRemaining(comp.endTime)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {competitions.map((comp) => (
                <Card key={comp.id} data-testid={`competition-card-${comp.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`competition-name-${comp.id}`}>
                            {comp.title}
                          </span>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-sport-${comp.id}`}>{comp.sport}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1" data-testid={`text-entries-${comp.id}`}>
                            <Users className="w-3 h-3" />
                            {comp.entries.toLocaleString()} / {comp.maxEntries.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1" data-testid={`text-prize-${comp.id}`}>
                            <Trophy className="w-3 h-3" />
                            {comp.prizePool}
                          </span>
                          <span className="flex items-center gap-1" data-testid={`text-time-${comp.id}`}>
                            <Clock className="w-3 h-3" />
                            {getTimeRemaining(comp.endTime)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={comp.entered ? "default" : "outline"}
                        size="sm"
                        onClick={() => joinMutation.mutate({ compId: comp.id, username: "User" })}
                        disabled={comp.entered || joinMutation.isPending}
                        className={`toggle-elevate ${comp.entered ? "toggle-elevated" : ""}`}
                        data-testid={`button-enter-competition-${comp.id}`}
                      >
                        {comp.entered ? "Entered" : "Enter"}
                      </Button>
                    </div>

                    <Progress value={(comp.entries / comp.maxEntries) * 100} className="h-1.5" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
                      className="gap-1 w-full justify-center"
                      data-testid={`button-toggle-leaderboard-${comp.id}`}
                    >
                      {expandedComp === comp.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Leaderboard
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          View Leaderboard
                        </>
                      )}
                    </Button>

                    {expandedComp === comp.id && (
                      <div className="space-y-2 pt-1">
                        {comp.leaderboard.map((entry) => (
                          <div
                            key={entry.rank}
                            className={`flex items-center gap-3 p-2 rounded-md ${
                              entry.rank <= 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : "bg-muted/30"
                            }`}
                            data-testid={`leaderboard-entry-${comp.id}-${entry.rank}`}
                          >
                            <div className="w-6 flex justify-center">
                              {getRankIcon(entry.rank)}
                            </div>
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-muted">
                                {entry.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate">{entry.username}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{entry.correct} correct</span>
                              <span className="font-medium">{entry.points} pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

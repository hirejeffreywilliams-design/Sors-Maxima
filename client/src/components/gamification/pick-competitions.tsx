import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Users, Medal, Crown, ChevronDown, ChevronUp, Swords } from "lucide-react";

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
  endTime: Date;
  leaderboard: LeaderboardEntry[];
  entered: boolean;
}

const initialCompetitions: Competition[] = [
  {
    id: "comp-1",
    title: "NFL Sunday Showdown",
    sport: "NFL",
    entries: 1247,
    maxEntries: 2000,
    prizePool: "$5,000",
    endTime: new Date(Date.now() + 172800000),
    leaderboard: [
      { rank: 1, username: "SharpShooter99", points: 285, correct: 12 },
      { rank: 2, username: "ParlayKing", points: 260, correct: 11 },
      { rank: 3, username: "EdgeMaster", points: 245, correct: 10 },
      { rank: 4, username: "BetWizard", points: 230, correct: 10 },
      { rank: 5, username: "MoneyMoves", points: 215, correct: 9 },
    ],
    entered: true,
  },
  {
    id: "comp-2",
    title: "NBA Props Challenge",
    sport: "NBA",
    entries: 856,
    maxEntries: 1500,
    prizePool: "$3,000",
    endTime: new Date(Date.now() + 86400000),
    leaderboard: [
      { rank: 1, username: "PropMaster", points: 320, correct: 14 },
      { rank: 2, username: "StatGuru", points: 290, correct: 13 },
      { rank: 3, username: "CourtVision", points: 275, correct: 12 },
      { rank: 4, username: "HoopsEdge", points: 250, correct: 11 },
      { rank: 5, username: "ValueSeeker", points: 240, correct: 10 },
    ],
    entered: false,
  },
  {
    id: "comp-3",
    title: "MLB Weekly Marathon",
    sport: "MLB",
    entries: 432,
    maxEntries: 1000,
    prizePool: "$2,500",
    endTime: new Date(Date.now() + 432000000),
    leaderboard: [
      { rank: 1, username: "DiamondPicks", points: 180, correct: 8 },
      { rank: 2, username: "BaseballBrain", points: 165, correct: 7 },
      { rank: 3, username: "RunLineKing", points: 150, correct: 7 },
      { rank: 4, username: "TotalGuru", points: 140, correct: 6 },
      { rank: 5, username: "LiveTracker", points: 130, correct: 6 },
    ],
    entered: false,
  },
  {
    id: "comp-4",
    title: "NHL Puck Drop Pick'em",
    sport: "NHL",
    entries: 298,
    maxEntries: 500,
    prizePool: "$1,500",
    endTime: new Date(Date.now() + 259200000),
    leaderboard: [
      { rank: 1, username: "IceEdge", points: 210, correct: 9 },
      { rank: 2, username: "PuckSharp", points: 195, correct: 8 },
      { rank: 3, username: "NetFinder", points: 180, correct: 8 },
      { rank: 4, username: "OddsWatch", points: 170, correct: 7 },
      { rank: 5, username: "BetAlert", points: 155, correct: 7 },
    ],
    entered: true,
  },
];

export function PickCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const enterCompetition = (compId: string) => {
    setCompetitions((prev) =>
      prev.map((c) =>
        c.id === compId ? { ...c, entered: true, entries: c.entries + 1 } : c
      )
    );
  };

  const getTimeRemaining = (endTime: Date) => {
    const diffMs = endTime.getTime() - Date.now();
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
                    onClick={() => enterCompetition(comp.id)}
                    disabled={comp.entered}
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
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  ChevronRight,
  ArrowLeft,
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  Loader2,
  User,
  Hash,
  Ruler,
  Weight,
  GraduationCap,
  Calendar,
} from "lucide-react";
import type { Sport } from "@shared/schema";

interface ESPNTeam {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  location: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
}

interface ESPNPlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jersey?: string;
  position: { abbreviation: string; displayName: string };
  age?: number;
  height?: string;
  weight?: string;
  experience?: number;
  college?: string;
  birthDate?: string;
  status?: { type: string; name: string };
  headshot?: string;
}

interface ESPNCoach {
  id: string;
  firstName: string;
  lastName: string;
  experience?: number;
}

interface TeamRoster {
  team: ESPNTeam;
  coach: ESPNCoach[];
  players: ESPNPlayer[];
  lastUpdated: string;
}

const sportOptions: { id: Sport; name: string }[] = [
  { id: "NBA", name: "NBA" },
  { id: "NFL", name: "NFL" },
  { id: "MLB", name: "MLB" },
  { id: "NHL", name: "NHL" },
  { id: "NCAAF", name: "NCAAF" },
  { id: "NCAAB", name: "NCAAB" },
];

const statusConfig: Record<string, { color: string; icon: typeof Activity }> = {
  active: { color: "text-green-500", icon: Activity },
  "day-to-day": { color: "text-yellow-500", icon: AlertTriangle },
  out: { color: "text-red-500", icon: AlertTriangle },
  injured: { color: "text-red-500", icon: AlertTriangle },
  suspended: { color: "text-orange-500", icon: Shield },
};

function TeamCard({ team, onClick }: { team: ESPNTeam; onClick: () => void }) {
  return (
    <Card
      className="hover-elevate cursor-pointer overflow-visible"
      onClick={onClick}
      data-testid={`card-team-${team.abbreviation}`}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          {team.logo && <AvatarImage src={team.logo} alt={team.displayName} />}
          <AvatarFallback
            style={{ backgroundColor: team.color || undefined, color: "#fff" }}
            className="text-xs font-bold"
          >
            {team.abbreviation}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{team.displayName}</div>
          <div className="text-xs text-muted-foreground">{team.abbreviation}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </CardContent>
    </Card>
  );
}

function PlayerRow({ player }: { player: ESPNPlayer }) {
  const statusType = player.status?.type?.toLowerCase() || "active";
  const config = statusConfig[statusType] || statusConfig.active;
  const StatusIcon = config.icon;
  const isActive = statusType === "active";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md border hover-elevate"
      data-testid={`row-player-${player.id}`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        {player.headshot && <AvatarImage src={player.headshot} alt={player.fullName} />}
        <AvatarFallback className="text-xs">
          {player.firstName?.[0]}{player.lastName?.[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{player.fullName}</span>
          {player.jersey && (
            <Badge variant="outline" className="text-xs">
              <Hash className="w-3 h-3 mr-0.5" />
              {player.jersey}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {player.position.abbreviation}
          </Badge>
          {!isActive && player.status && (
            <Badge
              variant="outline"
              className={`text-xs ${config.color}`}
            >
              <StatusIcon className="w-3 h-3 mr-0.5" />
              {player.status.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {player.age && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {player.age} yrs
            </span>
          )}
          {player.height && (
            <span className="flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              {player.height}
            </span>
          )}
          {player.weight && (
            <span className="flex items-center gap-1">
              <Weight className="w-3 h-3" />
              {player.weight}
            </span>
          )}
          {player.college && (
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {player.college}
            </span>
          )}
          {player.experience !== undefined && player.experience > 0 && (
            <span>Exp: {player.experience} yr{player.experience !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function RosterView({ sport, teamId, onBack }: { sport: Sport; teamId: string; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");

  const { data: roster, isLoading } = useQuery<TeamRoster>({
    queryKey: ["/api/teams", sport, teamId, "roster"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${sport}/${teamId}/roster`);
      if (!res.ok) throw new Error("Failed to fetch roster");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading roster...</span>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Roster not available</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  const positions = Array.from(new Set(roster.players.map((p) => p.position.abbreviation))).sort();

  const filtered = roster.players.filter((p) => {
    const matchSearch = !search || p.fullName.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.position.abbreviation === posFilter;
    return matchSearch && matchPos;
  });

  const activeCount = roster.players.filter(
    (p) => !p.status || p.status.type === "active"
  ).length;
  const injuredCount = roster.players.filter(
    (p) => p.status && p.status.type !== "active"
  ).length;

  const updatedTime = new Date(roster.lastUpdated).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-teams">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="h-12 w-12">
          {roster.team.logo && <AvatarImage src={roster.team.logo} alt={roster.team.displayName} />}
          <AvatarFallback
            style={{ backgroundColor: roster.team.color || undefined, color: "#fff" }}
            className="font-bold"
          >
            {roster.team.abbreviation}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{roster.team.displayName}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{sport}</span>
            <span>|</span>
            <span>{roster.players.length} players</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {roster.coach.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Head Coach</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {roster.coach[0].firstName} {roster.coach[0].lastName}
                  </div>
                  {roster.coach[0].experience && (
                    <div className="text-xs text-muted-foreground">
                      {roster.coach[0].experience} yrs experience
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active</div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Injured / Out</div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold">{injuredCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-players"
          />
        </div>
        <ScrollArea className="max-w-full">
          <div className="flex items-center gap-1">
            <Button
              variant={posFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPosFilter("all")}
            >
              All
            </Button>
            {positions.map((pos) => (
              <Button
                key={pos}
                variant={posFilter === pos ? "default" : "outline"}
                size="sm"
                onClick={() => setPosFilter(pos)}
              >
                {pos}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No players found
          </div>
        ) : (
          filtered.map((player) => <PlayerRow key={player.id} player={player} />)
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
        <Clock className="w-3 h-3" />
        Updated: {updatedTime}
      </div>
    </div>
  );
}

export default function RostersPage() {
  const [selectedSport, setSelectedSport] = useState<Sport>("NBA");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

  const { data: teams = [], isLoading: teamsLoading } = useQuery<ESPNTeam[]>({
    queryKey: ["/api/teams", selectedSport],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedSport}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const filteredTeams = teams.filter((t) =>
    !teamSearch || t.displayName.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="min-h-full">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Rosters
          </h1>
          <p className="text-sm text-muted-foreground">
            Live rosters, coaching staff, and injury statuses updated in real time
          </p>
        </header>

        {selectedTeamId ? (
          <RosterView
            sport={selectedSport}
            teamId={selectedTeamId}
            onBack={() => setSelectedTeamId(null)}
          />
        ) : (
          <div className="space-y-4">
            <Tabs
              value={selectedSport}
              onValueChange={(v) => {
                setSelectedSport(v as Sport);
                setTeamSearch("");
              }}
            >
              <TabsList>
                {sportOptions.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} data-testid={`tab-sport-${s.id}`}>
                    {s.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${selectedSport} teams...`}
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-teams"
              />
            </div>

            {teamsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading {selectedSport} teams...</span>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                No teams found
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onClick={() => setSelectedTeamId(team.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

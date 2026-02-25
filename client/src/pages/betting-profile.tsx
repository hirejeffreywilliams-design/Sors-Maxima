import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Heart, Star, Trophy, Target, Shield, Zap, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type RiskTolerance = "conservative" | "moderate" | "aggressive";
type BankrollStrategy = "flat" | "percentage" | "kelly";
type BetFrequency = "1-2" | "3-5" | "5+";

interface BettingProfileData {
  riskTolerance: RiskTolerance;
  preferredBetTypes: string[];
  bankrollStrategy: BankrollStrategy;
  betFrequency: BetFrequency;
  favoriteTeams: string[];
  favoriteLeagues: string[];
}

const defaultProfile: BettingProfileData = {
  riskTolerance: "moderate",
  preferredBetTypes: [],
  bankrollStrategy: "flat",
  betFrequency: "1-2",
  favoriteTeams: [],
  favoriteLeagues: [],
};

const betTypeOptions = ["Moneylines", "Spreads", "Props", "Totals", "Mix of everything"];

const teamsByLeague: Record<string, string[]> = {
  NBA: ["Lakers", "Celtics", "Warriors", "Bucks", "76ers", "Nuggets", "Heat", "Suns", "Knicks", "Mavericks"],
  NFL: ["Chiefs", "49ers", "Eagles", "Cowboys", "Bills", "Ravens", "Dolphins", "Lions", "Bengals", "Jets"],
  MLB: ["Yankees", "Dodgers", "Astros", "Braves", "Mets", "Phillies", "Padres", "Rangers", "Orioles", "Twins"],
  NHL: ["Bruins", "Avalanche", "Panthers", "Rangers", "Oilers", "Stars", "Hurricanes", "Devils", "Maple Leafs", "Golden Knights"],
  NCAAB: ["Duke", "UNC", "Kansas", "Kentucky", "Gonzaga", "UConn", "Houston", "Purdue", "Alabama", "Tennessee"],
};

const leagueOptions = [
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
  { id: "MLB", label: "MLB" },
  { id: "NHL", label: "NHL" },
  { id: "NCAAB", label: "NCAAB" },
  { id: "NCAAF", label: "NCAAF" },
  { id: "Soccer_EPL", label: "EPL" },
  { id: "Soccer_LALIGA", label: "La Liga" },
  { id: "Soccer_BUNDESLIGA", label: "Bundesliga" },
  { id: "Soccer_SERIEA", label: "Serie A" },
  { id: "Soccer_LIGUE1", label: "Ligue 1" },
  { id: "Soccer_MLS", label: "MLS" },
  { id: "Soccer_UCL", label: "Champions League" },
];

function getProfileType(profile: BettingProfileData): { name: string; icon: JSX.Element; tips: string[] } {
  if (profile.betFrequency === "5+") {
    return {
      name: "The Grinder",
      icon: <Zap className="w-5 h-5" />,
      tips: [
        "Track every bet meticulously to spot patterns",
        "Set strict daily loss limits to protect your bankroll",
        "Focus on high-volume, lower-risk plays for consistency",
        "Take breaks to avoid fatigue-driven decisions",
      ],
    };
  }
  if (profile.riskTolerance === "aggressive") {
    return {
      name: "The High Roller",
      icon: <Trophy className="w-5 h-5" />,
      tips: [
        "Always have a hedge plan for your biggest bets",
        "Never risk more than 10% of your bankroll on a single play",
        "Look for correlated parlays to maximize upside",
        "Use alt lines strategically for better value",
      ],
    };
  }
  if (profile.riskTolerance === "conservative") {
    return {
      name: "The Sniper",
      icon: <Target className="w-5 h-5" />,
      tips: [
        "Wait for the best lines before placing bets",
        "Stick to 1-3 leg parlays for the highest hit rate",
        "Focus on moneylines and spreads for reliable edges",
        "Bankroll preservation is your greatest weapon",
      ],
    };
  }
  return {
    name: "The Balanced Bettor",
    icon: <Shield className="w-5 h-5" />,
    tips: [
      "Mix straight bets with occasional parlays",
      "Use the Kelly Criterion or percentage betting for optimal sizing",
      "Diversify across sports and bet types",
      "Review your results weekly and adjust strategy",
    ],
  };
}

export default function BettingProfile() {
  useSEO({ title: "Betting Profile", description: "Your betting preferences and style analysis" });
  const { toast } = useToast();

  const { data: savedProfile, isLoading } = useQuery<BettingProfileData>({
    queryKey: ['/api/user/betting-profile'],
  });

  const [profile, setProfile] = useState<BettingProfileData | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[] | null>(null);
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[] | null>(null);

  const currentProfile = profile ?? savedProfile ?? defaultProfile;
  const currentTeams = favoriteTeams ?? savedProfile?.favoriteTeams ?? [];
  const currentLeagues = favoriteLeagues ?? savedProfile?.favoriteLeagues ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: BettingProfileData) => {
      const res = await apiRequest("POST", "/api/user/betting-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/betting-profile'] });
      toast({ title: "Profile saved!", description: "Your betting preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile. Please try again.", variant: "destructive" });
    },
  });

  const toggleBetType = (bt: string) => {
    const prev = profile ?? savedProfile ?? defaultProfile;
    setProfile({
      ...prev,
      preferredBetTypes: prev.preferredBetTypes.includes(bt)
        ? prev.preferredBetTypes.filter(t => t !== bt)
        : [...prev.preferredBetTypes, bt],
    });
  };

  const toggleTeam = (team: string) => {
    const prev = favoriteTeams ?? savedProfile?.favoriteTeams ?? [];
    setFavoriteTeams(
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const toggleLeague = (league: string) => {
    const prev = favoriteLeagues ?? savedProfile?.favoriteLeagues ?? [];
    setFavoriteLeagues(
      prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]
    );
  };

  const saveProfile = () => {
    saveMutation.mutate({
      ...currentProfile,
      favoriteTeams: currentTeams,
      favoriteLeagues: currentLeagues,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" data-testid="betting-profile-page">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Card><CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  const profileType = getProfileType(currentProfile);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" data-testid="betting-profile-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <User className="w-6 h-6" />
          Betting Profile
        </h1>
        <p className="text-sm text-muted-foreground">Customize your betting style, favorite teams, and leagues</p>
      </div>

      <Card data-testid="card-betting-quiz">
        <CardContent className="p-5 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Betting Style Quiz
          </h2>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q1">Q1: What is your risk tolerance?</p>
              <div className="flex flex-wrap gap-2">
                {(["conservative", "moderate", "aggressive"] as RiskTolerance[]).map(option => (
                  <Button
                    key={option}
                    variant={currentProfile.riskTolerance === option ? "default" : "outline"}
                    size="sm"
                    className={`capitalize toggle-elevate ${currentProfile.riskTolerance === option ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), riskTolerance: option }))}
                    data-testid={`button-risk-${option}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q2">Q2: Preferred bet types (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {betTypeOptions.map(bt => (
                  <Button
                    key={bt}
                    variant={currentProfile.preferredBetTypes.includes(bt) ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.preferredBetTypes.includes(bt) ? "toggle-elevated" : ""}`}
                    onClick={() => toggleBetType(bt)}
                    data-testid={`button-bettype-${bt.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {bt}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q3">Q3: Bankroll strategy</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "flat" as BankrollStrategy, label: "Flat betting" },
                  { value: "percentage" as BankrollStrategy, label: "Percentage" },
                  { value: "kelly" as BankrollStrategy, label: "Kelly Criterion" },
                ]).map(option => (
                  <Button
                    key={option.value}
                    variant={currentProfile.bankrollStrategy === option.value ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.bankrollStrategy === option.value ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), bankrollStrategy: option.value }))}
                    data-testid={`button-bankroll-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium" data-testid="text-q4">Q4: Bet frequency</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "1-2" as BetFrequency, label: "1-2 per day" },
                  { value: "3-5" as BetFrequency, label: "3-5 per day" },
                  { value: "5+" as BetFrequency, label: "5+ per day" },
                ]).map(option => (
                  <Button
                    key={option.value}
                    variant={currentProfile.betFrequency === option.value ? "default" : "outline"}
                    size="sm"
                    className={`toggle-elevate ${currentProfile.betFrequency === option.value ? "toggle-elevated" : ""}`}
                    onClick={() => setProfile(prev => ({ ...(prev ?? savedProfile ?? defaultProfile), betFrequency: option.value }))}
                    data-testid={`button-frequency-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid="profile-result">
            <div className="flex items-center gap-2">
              {profileType.icon}
              <span className="text-lg font-bold" data-testid="text-profile-type">{profileType.name}</span>
            </div>
            <ul className="space-y-1.5">
              {profileType.tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-tip-${i}`}>
                  <Star className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={saveProfile} className="w-full gap-2" disabled={saveMutation.isPending} data-testid="button-save-profile">
            <Shield className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-favorite-teams">
        <CardContent className="p-5 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorite Teams
          </h2>
          <p className="text-sm text-muted-foreground">Select your favorite teams to prioritize them in ticket generation</p>

          {Object.entries(teamsByLeague).map(([league, teams]) => (
            <div key={league} className="space-y-2">
              <h3 className="text-sm font-semibold" data-testid={`text-league-header-${league}`}>{league}</h3>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => {
                  const key = `${league}-${team}`;
                  const selected = currentTeams.includes(key);
                  return (
                    <Badge
                      key={key}
                      variant={selected ? "default" : "outline"}
                      className={`cursor-pointer gap-1 toggle-elevate ${selected ? "toggle-elevated" : ""}`}
                      onClick={() => toggleTeam(key)}
                      data-testid={`badge-team-${key}`}
                    >
                      {selected && <Star className="w-3 h-3" />}
                      {team}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="card-favorite-leagues">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Favorite Leagues
          </h2>
          <p className="text-sm text-muted-foreground">Selected leagues will auto-populate the sport selector on the generator page</p>

          <div className="flex flex-wrap gap-2">
            {leagueOptions.map(league => {
              const selected = currentLeagues.includes(league.id);
              return (
                <Button
                  key={league.id}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className={`toggle-elevate ${selected ? "toggle-elevated" : ""}`}
                  onClick={() => toggleLeague(league.id)}
                  data-testid={`button-league-${league.id}`}
                >
                  {selected && <Star className="w-3.5 h-3.5 mr-1" />}
                  {league.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Sport } from "@shared/schema";

export interface LiveGame {
  id: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "scheduled" | "in_progress" | "final" | "postponed";
  startTime: Date;
  period?: string;
  timeRemaining?: string;
  odds?: {
    homeMoneyline: number;
    awayMoneyline: number;
    spread: number;
    total: number;
  };
}

export interface GameResult {
  gameId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: "home" | "away" | "tie";
  completedAt: Date;
}

const NBA_TEAMS = [
  "Lakers", "Celtics", "Warriors", "Nuggets", "Bucks", "Heat", "76ers", "Knicks",
  "Suns", "Mavericks", "Cavaliers", "Kings", "Pelicans", "Clippers", "Nets", "Hawks"
];

const NFL_TEAMS = [
  "Chiefs", "49ers", "Eagles", "Cowboys", "Bills", "Dolphins", "Ravens", "Bengals",
  "Lions", "Packers", "Jets", "Patriots", "Steelers", "Browns", "Raiders", "Chargers"
];

const MLB_TEAMS = [
  "Yankees", "Red Sox", "Dodgers", "Giants", "Astros", "Rangers", "Braves", "Phillies",
  "Cubs", "Cardinals", "Mets", "Padres", "Mariners", "Orioles", "Twins", "Guardians"
];

const NHL_TEAMS = [
  "Bruins", "Maple Leafs", "Rangers", "Devils", "Avalanche", "Stars", "Panthers", "Lightning",
  "Oilers", "Flames", "Hurricanes", "Capitals", "Penguins", "Red Wings", "Kraken", "Golden Knights"
];

const NCAAB_TEAMS = [
  "Duke", "North Carolina", "Kentucky", "Kansas", "UCLA", "Gonzaga", "Villanova", "UConn",
  "Michigan State", "Michigan", "Arizona", "Purdue", "Houston", "Alabama", "Tennessee", "Baylor"
];

const NCAAF_TEAMS = [
  "Alabama", "Georgia", "Ohio State", "Michigan", "Clemson", "Florida State", "Texas", "Oklahoma",
  "USC", "Notre Dame", "Oregon", "Penn State", "LSU", "Florida", "Auburn", "Tennessee"
];

const TEAMS_BY_SPORT: Record<Sport, string[]> = {
  NBA: NBA_TEAMS,
  NFL: NFL_TEAMS,
  MLB: MLB_TEAMS,
  NHL: NHL_TEAMS,
  NCAAB: NCAAB_TEAMS,
  NCAAF: NCAAF_TEAMS,
};

function getRandomTeams(sport: Sport): { home: string; away: string } {
  const teams = TEAMS_BY_SPORT[sport];
  const homeIdx = Math.floor(Math.random() * teams.length);
  let awayIdx = Math.floor(Math.random() * teams.length);
  while (awayIdx === homeIdx) {
    awayIdx = Math.floor(Math.random() * teams.length);
  }
  return { home: teams[homeIdx], away: teams[awayIdx] };
}

function generateRealisticScore(sport: Sport, status: "in_progress" | "final"): { home: number; away: number } {
  const multiplier = status === "final" ? 1 : Math.random() * 0.8 + 0.2;
  
  switch (sport) {
    case "NBA":
      return {
        home: Math.floor((85 + Math.random() * 40) * multiplier),
        away: Math.floor((85 + Math.random() * 40) * multiplier),
      };
    case "NFL":
      return {
        home: Math.floor((14 + Math.random() * 24) * multiplier),
        away: Math.floor((14 + Math.random() * 24) * multiplier),
      };
    case "MLB":
      return {
        home: Math.floor((2 + Math.random() * 8) * multiplier),
        away: Math.floor((2 + Math.random() * 8) * multiplier),
      };
    case "NHL":
      return {
        home: Math.floor((1 + Math.random() * 5) * multiplier),
        away: Math.floor((1 + Math.random() * 5) * multiplier),
      };
    case "NCAAB":
      return {
        home: Math.floor((55 + Math.random() * 35) * multiplier),
        away: Math.floor((55 + Math.random() * 35) * multiplier),
      };
    case "NCAAF":
      return {
        home: Math.floor((14 + Math.random() * 28) * multiplier),
        away: Math.floor((14 + Math.random() * 28) * multiplier),
      };
    default:
      return { home: 0, away: 0 };
  }
}

function generateMoneyline(): number {
  const isFavorite = Math.random() > 0.5;
  if (isFavorite) {
    return -(100 + Math.floor(Math.random() * 200));
  }
  return 100 + Math.floor(Math.random() * 200);
}

class LiveSportsDataService {
  private games: Map<string, LiveGame> = new Map();
  private completedGames: GameResult[] = [];
  private simulationInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(games: LiveGame[]) => void> = new Set();

  constructor() {
    this.initializeGames();
  }

  private initializeGames() {
    const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    
    for (const sport of sports) {
      const gamesCount = 2 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < gamesCount; i++) {
        const teams = getRandomTeams(sport);
        const status = Math.random() > 0.3 ? "in_progress" : "scheduled";
        const scores = status === "in_progress" ? generateRealisticScore(sport, "in_progress") : { home: 0, away: 0 };
        
        const game: LiveGame = {
          id: `${sport}-${Date.now()}-${i}`,
          sport,
          homeTeam: teams.home,
          awayTeam: teams.away,
          homeScore: scores.home,
          awayScore: scores.away,
          status,
          startTime: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
          period: status === "in_progress" ? this.getRandomPeriod(sport) : undefined,
          timeRemaining: status === "in_progress" ? `${Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
          odds: {
            homeMoneyline: generateMoneyline(),
            awayMoneyline: generateMoneyline(),
            spread: (Math.random() > 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 10) + 0.5),
            total: this.getTotalLine(sport),
          },
        };
        
        this.games.set(game.id, game);
      }
    }
  }

  private getRandomPeriod(sport: Sport): string {
    switch (sport) {
      case "NBA":
      case "NCAAB":
        return `Q${1 + Math.floor(Math.random() * 4)}`;
      case "NFL":
      case "NCAAF":
        return `Q${1 + Math.floor(Math.random() * 4)}`;
      case "MLB":
        return `${1 + Math.floor(Math.random() * 9)} Inn`;
      case "NHL":
        return `P${1 + Math.floor(Math.random() * 3)}`;
      default:
        return "Live";
    }
  }

  private getTotalLine(sport: Sport): number {
    switch (sport) {
      case "NBA": return 210 + Math.floor(Math.random() * 30);
      case "NFL": return 40 + Math.floor(Math.random() * 15);
      case "MLB": return 7 + Math.floor(Math.random() * 4);
      case "NHL": return 5 + Math.floor(Math.random() * 2);
      case "NCAAB": return 130 + Math.floor(Math.random() * 20);
      case "NCAAF": return 45 + Math.floor(Math.random() * 20);
      default: return 0;
    }
  }

  startSimulation() {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(() => {
      this.updateGames();
    }, 30000);

    console.log("[LiveSports] Real-time game simulation started");
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      console.log("[LiveSports] Game simulation stopped");
    }
  }

  private updateGames() {
    const updatedGames: LiveGame[] = [];
    const gameEntries = Array.from(this.games.entries());

    for (const [id, game] of gameEntries) {
      if (game.status === "scheduled") {
        if (Math.random() > 0.7) {
          game.status = "in_progress";
          game.period = this.getRandomPeriod(game.sport);
          game.timeRemaining = "12:00";
        }
      } else if (game.status === "in_progress") {
        const scoreIncrease = Math.random();
        if (scoreIncrease > 0.6) {
          game.homeScore += this.getScoreIncrement(game.sport);
        }
        if (scoreIncrease > 0.5) {
          game.awayScore += this.getScoreIncrement(game.sport);
        }

        if (Math.random() > 0.85) {
          game.status = "final";
          const finalScores = generateRealisticScore(game.sport, "final");
          game.homeScore = Math.max(game.homeScore, finalScores.home);
          game.awayScore = Math.max(game.awayScore, finalScores.away);

          const result: GameResult = {
            gameId: game.id,
            sport: game.sport,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            winner: game.homeScore > game.awayScore ? "home" : game.homeScore < game.awayScore ? "away" : "tie",
            completedAt: new Date(),
          };
          this.completedGames.push(result);

          const teams = getRandomTeams(game.sport);
          const newGame: LiveGame = {
            id: `${game.sport}-${Date.now()}-new`,
            sport: game.sport,
            homeTeam: teams.home,
            awayTeam: teams.away,
            homeScore: 0,
            awayScore: 0,
            status: "scheduled",
            startTime: new Date(Date.now() + Math.random() * 2 * 60 * 60 * 1000),
            odds: {
              homeMoneyline: generateMoneyline(),
              awayMoneyline: generateMoneyline(),
              spread: (Math.random() > 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 10) + 0.5),
              total: this.getTotalLine(game.sport),
            },
          };
          this.games.delete(id);
          this.games.set(newGame.id, newGame);
        }
      }

      updatedGames.push(game);
    }

    this.notifyListeners();
  }

  private getScoreIncrement(sport: Sport): number {
    switch (sport) {
      case "NBA":
      case "NCAAB":
        return Math.floor(Math.random() * 3) + 1;
      case "NFL":
      case "NCAAF":
        return [3, 6, 7][Math.floor(Math.random() * 3)];
      case "MLB":
        return 1;
      case "NHL":
        return 1;
      default:
        return 1;
    }
  }

  subscribe(listener: (games: LiveGame[]) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notifyListeners() {
    const games = this.getLiveGames();
    this.listeners.forEach(l => l(games));
  }

  getLiveGames(): LiveGame[] {
    return Array.from(this.games.values());
  }

  getGamesBySport(sport: Sport): LiveGame[] {
    return this.getLiveGames().filter(g => g.sport === sport);
  }

  getCompletedGames(): GameResult[] {
    return [...this.completedGames];
  }

  getRecentResults(limit: number = 20): GameResult[] {
    return this.completedGames.slice(-limit);
  }

  clearCompletedGames() {
    this.completedGames = [];
  }

  refreshGames() {
    this.games.clear();
    this.initializeGames();
    this.notifyListeners();
  }
}

export const liveSportsData = new LiveSportsDataService();

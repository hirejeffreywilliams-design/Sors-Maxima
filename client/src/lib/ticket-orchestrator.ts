import type { Sport, ParlayLeg, GeneratedParlay } from "@shared/schema";

export interface TicketRequest {
  sports: Sport[];
  bankroll: number;
  riskLevel: "conservative" | "moderate" | "aggressive";
  maxLegs: number;
  includeProps: boolean;
}

export interface AnalysisFactors {
  quantumCoachingScore: number;
  quantumPlayerScore: number;
  quantumTeamScore: number;
  mlProjectionScore: number;
  correlationScore: number;
  sharpMoneyScore: number;
  lineValueScore: number;
  momentumScore: number;
  situationalScore: number;
  cashoutEligibility: number;
}

export interface GeneratedTicket {
  id: string;
  name: string;
  sport: Sport;
  legs: TicketLeg[];
  totalOdds: number;
  americanOdds: number;
  winProbability: number;
  expectedValue: number;
  confidenceScore: number;
  recommendedStake: number;
  potentialPayout: number;
  riskRating: "low" | "medium" | "high";
  analysisFactors: AnalysisFactors;
  rationale: string[];
  cashoutProbability: number;
  grade: string;
}

export interface TicketLeg {
  id: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  line?: number;
  decimalOdds: number;
  americanOdds: number;
  winProbability: number;
  edgePercent: number;
  playerName?: string;
  propCategory?: string;
  analysis: {
    sharpAction: boolean;
    lineMovement: "steam" | "reverse" | "stable";
    publicPercent: number;
    confidenceLevel: "high" | "medium" | "low";
  };
}

const teamsByLeague: Record<Sport, { name: string; city: string }[]> = {
  NBA: [
    { name: "Lakers", city: "Los Angeles" },
    { name: "Celtics", city: "Boston" },
    { name: "Warriors", city: "Golden State" },
    { name: "Nuggets", city: "Denver" },
    { name: "Bucks", city: "Milwaukee" },
    { name: "76ers", city: "Philadelphia" },
    { name: "Heat", city: "Miami" },
    { name: "Suns", city: "Phoenix" },
    { name: "Mavericks", city: "Dallas" },
    { name: "Cavaliers", city: "Cleveland" },
  ],
  NFL: [
    { name: "Chiefs", city: "Kansas City" },
    { name: "49ers", city: "San Francisco" },
    { name: "Eagles", city: "Philadelphia" },
    { name: "Bills", city: "Buffalo" },
    { name: "Cowboys", city: "Dallas" },
    { name: "Ravens", city: "Baltimore" },
    { name: "Lions", city: "Detroit" },
    { name: "Dolphins", city: "Miami" },
    { name: "Bengals", city: "Cincinnati" },
    { name: "Packers", city: "Green Bay" },
  ],
  MLB: [
    { name: "Dodgers", city: "Los Angeles" },
    { name: "Yankees", city: "New York" },
    { name: "Braves", city: "Atlanta" },
    { name: "Astros", city: "Houston" },
    { name: "Rangers", city: "Texas" },
    { name: "Phillies", city: "Philadelphia" },
    { name: "Orioles", city: "Baltimore" },
    { name: "Rays", city: "Tampa Bay" },
    { name: "Twins", city: "Minnesota" },
    { name: "Mariners", city: "Seattle" },
  ],
  NHL: [
    { name: "Panthers", city: "Florida" },
    { name: "Oilers", city: "Edmonton" },
    { name: "Bruins", city: "Boston" },
    { name: "Rangers", city: "New York" },
    { name: "Avalanche", city: "Colorado" },
    { name: "Stars", city: "Dallas" },
    { name: "Maple Leafs", city: "Toronto" },
    { name: "Lightning", city: "Tampa Bay" },
    { name: "Jets", city: "Winnipeg" },
    { name: "Golden Knights", city: "Vegas" },
  ],
  NCAAB: [
    { name: "Huskies", city: "UConn" },
    { name: "Wildcats", city: "Kansas" },
    { name: "Blue Devils", city: "Duke" },
    { name: "Tar Heels", city: "UNC" },
    { name: "Boilermakers", city: "Purdue" },
    { name: "Volunteers", city: "Tennessee" },
    { name: "Crimson Tide", city: "Alabama" },
    { name: "Cougars", city: "Houston" },
    { name: "Tigers", city: "Auburn" },
    { name: "Wildcats", city: "Kentucky" },
  ],
  NCAAF: [
    { name: "Wolverines", city: "Michigan" },
    { name: "Huskies", city: "Washington" },
    { name: "Longhorns", city: "Texas" },
    { name: "Crimson Tide", city: "Alabama" },
    { name: "Bulldogs", city: "Georgia" },
    { name: "Buckeyes", city: "Ohio State" },
    { name: "Tigers", city: "Clemson" },
    { name: "Nittany Lions", city: "Penn State" },
    { name: "Ducks", city: "Oregon" },
    { name: "Seminoles", city: "Florida State" },
  ],
};

const playersBySport: Record<Sport, { name: string; team: string; position: string }[]> = {
  NBA: [
    { name: "LeBron James", team: "Lakers", position: "SF" },
    { name: "Stephen Curry", team: "Warriors", position: "PG" },
    { name: "Jayson Tatum", team: "Celtics", position: "SF" },
    { name: "Nikola Jokic", team: "Nuggets", position: "C" },
    { name: "Giannis Antetokounmpo", team: "Bucks", position: "PF" },
    { name: "Luka Doncic", team: "Mavericks", position: "PG" },
    { name: "Joel Embiid", team: "76ers", position: "C" },
    { name: "Kevin Durant", team: "Suns", position: "SF" },
    { name: "Devin Booker", team: "Suns", position: "SG" },
    { name: "Jimmy Butler", team: "Heat", position: "SF" },
  ],
  NFL: [
    { name: "Patrick Mahomes", team: "Chiefs", position: "QB" },
    { name: "Josh Allen", team: "Bills", position: "QB" },
    { name: "Jalen Hurts", team: "Eagles", position: "QB" },
    { name: "Travis Kelce", team: "Chiefs", position: "TE" },
    { name: "Tyreek Hill", team: "Dolphins", position: "WR" },
    { name: "Justin Jefferson", team: "Vikings", position: "WR" },
    { name: "Ja'Marr Chase", team: "Bengals", position: "WR" },
    { name: "Christian McCaffrey", team: "49ers", position: "RB" },
    { name: "CeeDee Lamb", team: "Cowboys", position: "WR" },
    { name: "Lamar Jackson", team: "Ravens", position: "QB" },
  ],
  MLB: [
    { name: "Shohei Ohtani", team: "Dodgers", position: "DH" },
    { name: "Aaron Judge", team: "Yankees", position: "RF" },
    { name: "Ronald Acuna Jr.", team: "Braves", position: "RF" },
    { name: "Mookie Betts", team: "Dodgers", position: "RF" },
    { name: "Freddie Freeman", team: "Dodgers", position: "1B" },
    { name: "Corey Seager", team: "Rangers", position: "SS" },
    { name: "Mike Trout", team: "Angels", position: "CF" },
    { name: "Julio Rodriguez", team: "Mariners", position: "CF" },
    { name: "Juan Soto", team: "Yankees", position: "RF" },
    { name: "Trea Turner", team: "Phillies", position: "SS" },
  ],
  NHL: [
    { name: "Connor McDavid", team: "Oilers", position: "C" },
    { name: "Nathan MacKinnon", team: "Avalanche", position: "C" },
    { name: "Leon Draisaitl", team: "Oilers", position: "C" },
    { name: "Auston Matthews", team: "Maple Leafs", position: "C" },
    { name: "Nikita Kucherov", team: "Lightning", position: "RW" },
    { name: "David Pastrnak", team: "Bruins", position: "RW" },
    { name: "Aleksander Barkov", team: "Panthers", position: "C" },
    { name: "Matthew Tkachuk", team: "Panthers", position: "LW" },
    { name: "Jack Eichel", team: "Golden Knights", position: "C" },
    { name: "Miro Heiskanen", team: "Stars", position: "D" },
  ],
  NCAAB: [
    { name: "Zach Edey", team: "Boilermakers", position: "C" },
    { name: "Hunter Dickinson", team: "Jayhawks", position: "C" },
    { name: "Tristen Newton", team: "Huskies", position: "G" },
    { name: "Kyle Filipowski", team: "Blue Devils", position: "F" },
    { name: "Dalton Knecht", team: "Volunteers", position: "G" },
    { name: "Armando Bacot", team: "Tar Heels", position: "C" },
    { name: "Johni Broome", team: "Tigers", position: "F" },
    { name: "RJ Davis", team: "Tar Heels", position: "G" },
    { name: "Mark Sears", team: "Crimson Tide", position: "G" },
    { name: "Tyler Kolek", team: "Marquette", position: "G" },
  ],
  NCAAF: [
    { name: "Jalen Milroe", team: "Crimson Tide", position: "QB" },
    { name: "Quinn Ewers", team: "Longhorns", position: "QB" },
    { name: "Carson Beck", team: "Bulldogs", position: "QB" },
    { name: "Bo Nix", team: "Ducks", position: "QB" },
    { name: "Jayden Daniels", team: "Tigers", position: "QB" },
    { name: "Michael Penix Jr.", team: "Huskies", position: "QB" },
    { name: "Drake Maye", team: "Tar Heels", position: "QB" },
    { name: "J.J. McCarthy", team: "Wolverines", position: "QB" },
    { name: "Caleb Williams", team: "Trojans", position: "QB" },
    { name: "Marvin Harrison Jr.", team: "Buckeyes", position: "WR" },
  ],
};

const propsBySport: Record<Sport, string[]> = {
  NBA: ["Points", "Rebounds", "Assists", "3-Pointers", "Pts+Rebs+Asts", "Steals+Blocks"],
  NFL: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Receptions", "TDs", "Passing TDs"],
  MLB: ["Hits", "RBIs", "Runs", "Total Bases", "Strikeouts (P)", "Hits Allowed"],
  NHL: ["Goals", "Assists", "Points", "Shots on Goal", "Saves"],
  NCAAB: ["Points", "Rebounds", "Assists", "3-Pointers"],
  NCAAF: ["Passing Yards", "Rushing Yards", "Receiving Yards", "TDs"],
};

function generateRandomOdds(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

function calculateCombinedOdds(legs: TicketLeg[]): number {
  return legs.reduce((acc, leg) => acc * leg.decimalOdds, 1);
}

function simulateQuantumCoachingScore(): number {
  return 0.6 + Math.random() * 0.35;
}

function simulateQuantumPlayerScore(): number {
  return 0.55 + Math.random() * 0.4;
}

function simulateQuantumTeamScore(): number {
  return 0.5 + Math.random() * 0.45;
}

function simulateMLProjectionScore(): number {
  return 0.65 + Math.random() * 0.3;
}

function simulateCorrelationScore(): number {
  return 0.4 + Math.random() * 0.5;
}

function simulateSharpMoneyScore(): number {
  return 0.5 + Math.random() * 0.45;
}

function generateLeg(sport: Sport, marketType: "moneyline" | "spread" | "total" | "prop", includeProps: boolean): TicketLeg {
  const teams = teamsByLeague[sport];
  const homeTeamIdx = Math.floor(Math.random() * teams.length);
  let awayTeamIdx = Math.floor(Math.random() * teams.length);
  while (awayTeamIdx === homeTeamIdx) {
    awayTeamIdx = Math.floor(Math.random() * teams.length);
  }
  
  const homeTeam = teams[homeTeamIdx];
  const awayTeam = teams[awayTeamIdx];
  const isHomeTeam = Math.random() > 0.5;
  const selectedTeam = isHomeTeam ? homeTeam : awayTeam;
  const opponent = isHomeTeam ? awayTeam : homeTeam;
  
  let market = "";
  let outcome = "";
  let line: number | undefined;
  let decimalOdds = 1.91;
  let playerName: string | undefined;
  let propCategory: string | undefined;
  
  if (marketType === "moneyline") {
    market = "Moneyline";
    decimalOdds = generateRandomOdds(1.4, 2.8);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  } else if (marketType === "spread") {
    market = "Spread";
    const spreadValue = Math.round((Math.random() * 14 - 7) * 2) / 2;
    line = spreadValue;
    decimalOdds = generateRandomOdds(1.85, 1.95);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ${spreadValue > 0 ? "+" : ""}${spreadValue}`;
  } else if (marketType === "total") {
    market = "Total";
    const totalMap: Record<Sport, { min: number; max: number }> = {
      NBA: { min: 210, max: 240 },
      NFL: { min: 38, max: 52 },
      MLB: { min: 6.5, max: 10.5 },
      NHL: { min: 5, max: 7 },
      NCAAB: { min: 130, max: 160 },
      NCAAF: { min: 45, max: 65 },
    };
    const range = totalMap[sport];
    const totalValue = Math.round((Math.random() * (range.max - range.min) + range.min) * 2) / 2;
    line = totalValue;
    const isOver = Math.random() > 0.5;
    decimalOdds = generateRandomOdds(1.85, 1.95);
    outcome = `${isOver ? "Over" : "Under"} ${totalValue}`;
  } else if (marketType === "prop" && includeProps) {
    market = "Player Prop";
    const players = playersBySport[sport];
    const player = players[Math.floor(Math.random() * players.length)];
    const props = propsBySport[sport];
    const prop = props[Math.floor(Math.random() * props.length)];
    playerName = player.name;
    propCategory = prop;
    
    const propLineRanges: Record<string, { min: number; max: number }> = {
      "Points": { min: 15, max: 35 },
      "Rebounds": { min: 4, max: 14 },
      "Assists": { min: 3, max: 12 },
      "3-Pointers": { min: 1.5, max: 5.5 },
      "Pts+Rebs+Asts": { min: 25, max: 55 },
      "Steals+Blocks": { min: 1.5, max: 4.5 },
      "Passing Yards": { min: 200, max: 320 },
      "Rushing Yards": { min: 40, max: 100 },
      "Receiving Yards": { min: 40, max: 90 },
      "Receptions": { min: 3.5, max: 8.5 },
      "TDs": { min: 0.5, max: 1.5 },
      "Passing TDs": { min: 1.5, max: 2.5 },
      "Hits": { min: 0.5, max: 2.5 },
      "RBIs": { min: 0.5, max: 1.5 },
      "Runs": { min: 0.5, max: 1.5 },
      "Total Bases": { min: 1.5, max: 3.5 },
      "Strikeouts (P)": { min: 4.5, max: 8.5 },
      "Hits Allowed": { min: 4.5, max: 7.5 },
      "Goals": { min: 0.5, max: 1.5 },
      "Shots on Goal": { min: 2.5, max: 5.5 },
      "Saves": { min: 24.5, max: 32.5 },
    };
    
    const range = propLineRanges[prop] || { min: 5, max: 25 };
    const propLine = Math.round((Math.random() * (range.max - range.min) + range.min) * 2) / 2;
    line = propLine;
    const isOver = Math.random() > 0.5;
    decimalOdds = generateRandomOdds(1.7, 2.2);
    outcome = `${player.name} ${isOver ? "Over" : "Under"} ${propLine} ${prop}`;
  } else {
    market = "Moneyline";
    decimalOdds = generateRandomOdds(1.4, 2.8);
    outcome = `${selectedTeam.city} ${selectedTeam.name} ML`;
  }
  
  const americanOdds = decimalToAmerican(decimalOdds);
  const winProbability = 0.4 + Math.random() * 0.25;
  const edgePercent = (Math.random() * 12 - 2);
  
  return {
    id: crypto.randomUUID(),
    team: `${selectedTeam.city} ${selectedTeam.name}`,
    opponent: `${opponent.city} ${opponent.name}`,
    market,
    outcome,
    line,
    decimalOdds,
    americanOdds,
    winProbability,
    edgePercent,
    playerName,
    propCategory,
    analysis: {
      sharpAction: Math.random() > 0.6,
      lineMovement: ["steam", "reverse", "stable"][Math.floor(Math.random() * 3)] as "steam" | "reverse" | "stable",
      publicPercent: Math.round(Math.random() * 40 + 30),
      confidenceLevel: ["high", "medium", "low"][Math.floor(Math.random() * 3)] as "high" | "medium" | "low",
    },
  };
}

function generateTicketName(sport: Sport, index: number, riskLevel: string): string {
  const prefixes = {
    conservative: ["Safe", "Steady", "Solid", "Reliable", "Stable"],
    moderate: ["Balanced", "Smart", "Sharp", "Strategic", "Calculated"],
    aggressive: ["Power", "High-Value", "Bold", "Premium", "Elite"],
  };
  
  const sportEmoji: Record<Sport, string> = {
    NBA: "",
    NFL: "",
    MLB: "",
    NHL: "",
    NCAAB: "",
    NCAAF: "",
  };
  
  const prefix = prefixes[riskLevel as keyof typeof prefixes][Math.floor(Math.random() * 5)];
  return `${prefix} ${sport} Ticket #${index + 1}`;
}

function calculateGrade(confidenceScore: number, ev: number): string {
  const score = confidenceScore * 50 + Math.max(0, ev) * 50;
  if (score >= 85) return "A+";
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 65) return "B";
  if (score >= 60) return "B-";
  if (score >= 55) return "C+";
  if (score >= 50) return "C";
  return "C-";
}

function generateRationale(ticket: Omit<GeneratedTicket, "rationale">): string[] {
  const rationale: string[] = [];
  
  if (ticket.analysisFactors.sharpMoneyScore > 0.75) {
    rationale.push("Sharp money detected on multiple legs");
  }
  if (ticket.analysisFactors.quantumCoachingScore > 0.8) {
    rationale.push("Coaching patterns favor this outcome");
  }
  if (ticket.analysisFactors.quantumPlayerScore > 0.8) {
    rationale.push("Player performance metrics highly favorable");
  }
  if (ticket.analysisFactors.mlProjectionScore > 0.8) {
    rationale.push("ML models project strong edge");
  }
  if (ticket.analysisFactors.correlationScore > 0.7) {
    rationale.push("Positive correlations between legs boost probability");
  }
  if (ticket.expectedValue > 0.1) {
    rationale.push(`+EV opportunity: ${(ticket.expectedValue * 100).toFixed(1)}% edge`);
  }
  if (ticket.cashoutProbability > 0.85) {
    rationale.push("High cashout eligibility across platforms");
  }
  if (ticket.legs.some(l => l.analysis.sharpAction)) {
    rationale.push("Professional bettors backing key selections");
  }
  if (ticket.legs.some(l => l.analysis.lineMovement === "steam")) {
    rationale.push("Steam move detected - line moving favorably");
  }
  
  if (rationale.length === 0) {
    rationale.push("Balanced risk/reward profile");
    rationale.push("Diversified market selection");
  }
  
  return rationale;
}

export function generateTickets(request: TicketRequest): GeneratedTicket[] {
  const tickets: GeneratedTicket[] = [];
  const ticketsPerSport = Math.ceil(6 / request.sports.length);
  
  const legCountsByRisk = {
    conservative: [2, 3],
    moderate: [3, 4, 5],
    aggressive: [4, 5, 6],
  };
  
  const legCounts = legCountsByRisk[request.riskLevel];
  
  for (const sport of request.sports) {
    for (let i = 0; i < ticketsPerSport; i++) {
      const numLegs = Math.min(
        legCounts[Math.floor(Math.random() * legCounts.length)],
        request.maxLegs
      );
      
      const marketTypes: ("moneyline" | "spread" | "total" | "prop")[] = ["moneyline", "spread", "total"];
      if (request.includeProps) {
        marketTypes.push("prop");
      }
      
      const legs: TicketLeg[] = [];
      for (let j = 0; j < numLegs; j++) {
        const marketType = marketTypes[Math.floor(Math.random() * marketTypes.length)];
        legs.push(generateLeg(sport, marketType, request.includeProps));
      }
      
      const totalOdds = calculateCombinedOdds(legs);
      const americanOdds = decimalToAmerican(totalOdds);
      
      const analysisFactors: AnalysisFactors = {
        quantumCoachingScore: simulateQuantumCoachingScore(),
        quantumPlayerScore: simulateQuantumPlayerScore(),
        quantumTeamScore: simulateQuantumTeamScore(),
        mlProjectionScore: simulateMLProjectionScore(),
        correlationScore: simulateCorrelationScore(),
        sharpMoneyScore: simulateSharpMoneyScore(),
        lineValueScore: 0.5 + Math.random() * 0.4,
        momentumScore: 0.4 + Math.random() * 0.5,
        situationalScore: 0.5 + Math.random() * 0.4,
        cashoutEligibility: 0.7 + Math.random() * 0.25,
      };
      
      const avgFactorScore = Object.values(analysisFactors).reduce((a, b) => a + b, 0) / Object.values(analysisFactors).length;
      const confidenceScore = Math.min(0.95, avgFactorScore * (0.9 + Math.random() * 0.2));
      
      const impliedProb = 1 / totalOdds;
      const winProbability = Math.min(0.85, impliedProb * (1 + (avgFactorScore - 0.5) * 0.4));
      const expectedValue = (winProbability * totalOdds) - 1;
      
      const kellyFraction = Math.max(0, (winProbability * (totalOdds - 1) - (1 - winProbability)) / (totalOdds - 1));
      const adjustedKelly = kellyFraction * 0.25;
      const recommendedStake = Math.round(request.bankroll * Math.min(adjustedKelly, 0.05) * 100) / 100;
      const potentialPayout = Math.round(recommendedStake * totalOdds * 100) / 100;
      
      const riskRating: "low" | "medium" | "high" = 
        numLegs <= 2 ? "low" : 
        numLegs <= 4 ? "medium" : "high";
      
      const baseTicket = {
        id: crypto.randomUUID(),
        name: generateTicketName(sport, i, request.riskLevel),
        sport,
        legs,
        totalOdds,
        americanOdds,
        winProbability,
        expectedValue,
        confidenceScore,
        recommendedStake: Math.max(recommendedStake, 5),
        potentialPayout,
        riskRating,
        analysisFactors,
        cashoutProbability: analysisFactors.cashoutEligibility,
        grade: calculateGrade(confidenceScore, expectedValue),
      };
      
      const ticket: GeneratedTicket = {
        ...baseTicket,
        rationale: generateRationale(baseTicket as Omit<GeneratedTicket, "rationale">),
      };
      
      tickets.push(ticket);
    }
  }
  
  return tickets.sort((a, b) => {
    const scoreA = a.confidenceScore * 0.4 + Math.max(0, a.expectedValue) * 0.3 + a.winProbability * 0.3;
    const scoreB = b.confidenceScore * 0.4 + Math.max(0, b.expectedValue) * 0.3 + b.winProbability * 0.3;
    return scoreB - scoreA;
  });
}

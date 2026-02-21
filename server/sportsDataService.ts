// Sports Data Service - Integrates real-time odds and sports data
// Uses The Odds API (500 free requests/month) for betting odds

interface OddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

interface NormalizedGame {
  id: string;
  sport: string;
  sportTitle: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  odds: {
    bookmaker: string;
    moneyline: {
      home: number;
      away: number;
    } | null;
    spread: {
      home: number;
      homePoint: number;
      away: number;
      awayPoint: number;
    } | null;
    totals: {
      over: number;
      overPoint: number;
      under: number;
      underPoint: number;
    } | null;
  }[];
}

// Cache for API responses to minimize API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Sport key mappings for The Odds API
const SPORT_KEYS: Record<string, string> = {
  'NBA': 'basketball_nba',
  'NFL': 'americanfootball_nfl',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'NCAAB': 'basketball_ncaab',
  'NCAAF': 'americanfootball_ncaaf',
};

class SportsDataService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.the-odds-api.com/v4';
  private requestsRemaining: number | null = null;
  private requestsUsed: number | null = null;

  constructor() {
    this.apiKey = process.env.THE_ODDS_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getApiStatus(): { available: boolean; requestsRemaining: number | null; requestsUsed: number | null } {
    return {
      available: this.isAvailable(),
      requestsRemaining: this.requestsRemaining,
      requestsUsed: this.requestsUsed,
    };
  }

  private getCacheKey(endpoint: string, params: Record<string, string>): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    cache.set(key, { data, timestamp: Date.now() });
  }

  async fetchOdds(sport: string): Promise<NormalizedGame[]> {
    const sportKey = SPORT_KEYS[sport.toUpperCase()];
    if (!sportKey) {
      console.log(`[SportsData] Unknown sport: ${sport}`);
      return [];
    }

    if (!this.apiKey) {
      console.log('[SportsData] No API key configured, returning demo data');
      return this.getDemoOdds(sport);
    }

    const cacheKey = this.getCacheKey('odds', { sport: sportKey });
    const cached = this.getFromCache<NormalizedGame[]>(cacheKey);
    if (cached) {
      console.log(`[SportsData] Returning cached odds for ${sport}`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/sports/${sportKey}/odds`;
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
      });

      console.log(`[SportsData] Fetching live odds for ${sport}...`);
      const response = await fetch(`${url}?${params}`);

      // Track API usage from headers
      this.requestsRemaining = parseInt(response.headers.get('x-requests-remaining') || '0');
      this.requestsUsed = parseInt(response.headers.get('x-requests-used') || '0');
      console.log(`[SportsData] API requests remaining: ${this.requestsRemaining}, used: ${this.requestsUsed}`);

      if (!response.ok) {
        console.error(`[SportsData] API error: ${response.status} ${response.statusText}`);
        return this.getDemoOdds(sport);
      }

      const games: OddsApiGame[] = await response.json();
      const normalized = this.normalizeOdds(games);
      
      this.setCache(cacheKey, normalized);
      console.log(`[SportsData] Fetched ${normalized.length} games for ${sport}`);
      
      return normalized;
    } catch (error) {
      console.error('[SportsData] Error fetching odds:', error);
      return this.getDemoOdds(sport);
    }
  }

  private normalizeOdds(games: OddsApiGame[]): NormalizedGame[] {
    return games.map(game => ({
      id: game.id,
      sport: game.sport_key,
      sportTitle: game.sport_title,
      startTime: game.commence_time,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      odds: game.bookmakers.map(bookmaker => {
        const h2h = bookmaker.markets.find(m => m.key === 'h2h');
        const spreads = bookmaker.markets.find(m => m.key === 'spreads');
        const totals = bookmaker.markets.find(m => m.key === 'totals');

        const homeH2h = h2h?.outcomes.find(o => o.name === game.home_team);
        const awayH2h = h2h?.outcomes.find(o => o.name === game.away_team);
        
        const homeSpread = spreads?.outcomes.find(o => o.name === game.home_team);
        const awaySpread = spreads?.outcomes.find(o => o.name === game.away_team);
        
        const over = totals?.outcomes.find(o => o.name === 'Over');
        const under = totals?.outcomes.find(o => o.name === 'Under');

        return {
          bookmaker: bookmaker.title,
          moneyline: homeH2h && awayH2h ? {
            home: homeH2h.price,
            away: awayH2h.price,
          } : null,
          spread: homeSpread && awaySpread ? {
            home: homeSpread.price,
            homePoint: homeSpread.point || 0,
            away: awaySpread.price,
            awayPoint: awaySpread.point || 0,
          } : null,
          totals: over && under ? {
            over: over.price,
            overPoint: over.point || 0,
            under: under.price,
            underPoint: under.point || 0,
          } : null,
        };
      }),
    }));
  }

  async fetchAllSportsOdds(): Promise<Record<string, NormalizedGame[]>> {
    const results: Record<string, NormalizedGame[]> = {};
    
    for (const sport of Object.keys(SPORT_KEYS)) {
      results[sport] = await this.fetchOdds(sport);
    }
    
    return results;
  }

  async getAvailableSports(): Promise<{ key: string; title: string; active: boolean }[]> {
    if (!this.apiKey) {
      return Object.entries(SPORT_KEYS).map(([title, key]) => ({
        key,
        title,
        active: true,
      }));
    }

    const cacheKey = 'sports';
    const cached = this.getFromCache<{ key: string; title: string; active: boolean }[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/sports?apiKey=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const sports = await response.json();
      this.setCache(cacheKey, sports);
      return sports;
    } catch (error) {
      console.error('[SportsData] Error fetching sports:', error);
      return Object.entries(SPORT_KEYS).map(([title, key]) => ({
        key,
        title,
        active: true,
      }));
    }
  }

  // Demo data fallback when API is not available
  private getDemoOdds(sport: string): NormalizedGame[] {
    const now = new Date();
    const teams = this.getTeamsForSport(sport);
    
    return teams.map((matchup, index) => ({
      id: `demo_${sport}_${index}`,
      sport: SPORT_KEYS[sport.toUpperCase()] || sport,
      sportTitle: sport,
      startTime: new Date(now.getTime() + (index + 1) * 3600000).toISOString(),
      homeTeam: matchup.home,
      awayTeam: matchup.away,
      odds: [
        {
          bookmaker: 'DraftKings',
          moneyline: {
            home: this.randomOdds(),
            away: this.randomOdds(),
          },
          spread: {
            home: -110,
            homePoint: this.randomSpread(),
            away: -110,
            awayPoint: -this.randomSpread(),
          },
          totals: {
            over: -110,
            overPoint: this.randomTotal(sport),
            under: -110,
            underPoint: this.randomTotal(sport),
          },
        },
        {
          bookmaker: 'FanDuel',
          moneyline: {
            home: this.randomOdds(),
            away: this.randomOdds(),
          },
          spread: {
            home: -110,
            homePoint: this.randomSpread(),
            away: -110,
            awayPoint: -this.randomSpread(),
          },
          totals: {
            over: -110,
            overPoint: this.randomTotal(sport),
            under: -110,
            underPoint: this.randomTotal(sport),
          },
        },
      ],
    }));
  }

  private getTeamsForSport(sport: string): { home: string; away: string }[] {
    const teams: Record<string, { home: string; away: string }[]> = {
      NBA: [
        { home: 'New York Knicks', away: 'Milwaukee Bucks' },
        { home: 'Dallas Mavericks', away: 'Phoenix Suns' },
        { home: 'Miami Heat', away: 'Milwaukee Bucks' },
        { home: 'Denver Nuggets', away: 'Dallas Mavericks' },
      ],
      NFL: [
        { home: 'Kansas City Chiefs', away: 'Buffalo Bills' },
        { home: 'San Francisco 49ers', away: 'Philadelphia Eagles' },
        { home: 'Dallas Cowboys', away: 'New York Giants' },
        { home: 'Baltimore Ravens', away: 'Cincinnati Bengals' },
      ],
      MLB: [
        { home: 'New York Yankees', away: 'Boston Red Sox' },
        { home: 'Los Angeles Dodgers', away: 'San Francisco Giants' },
        { home: 'Houston Astros', away: 'Texas Rangers' },
        { home: 'Atlanta Braves', away: 'Philadelphia Phillies' },
      ],
      NHL: [
        { home: 'Vegas Golden Knights', away: 'Colorado Avalanche' },
        { home: 'Boston Bruins', away: 'Toronto Maple Leafs' },
        { home: 'Edmonton Oilers', away: 'Vancouver Canucks' },
        { home: 'Florida Panthers', away: 'Tampa Bay Lightning' },
      ],
      NCAAB: [
        { home: 'Duke Blue Devils', away: 'North Carolina Tar Heels' },
        { home: 'Kentucky Wildcats', away: 'Kansas Jayhawks' },
        { home: 'Gonzaga Bulldogs', away: 'UCLA Bruins' },
        { home: 'UConn Huskies', away: 'Villanova Wildcats' },
      ],
      NCAAF: [
        { home: 'Alabama Crimson Tide', away: 'Georgia Bulldogs' },
        { home: 'Ohio State Buckeyes', away: 'Michigan Wolverines' },
        { home: 'Texas Longhorns', away: 'Oklahoma Sooners' },
        { home: 'USC Trojans', away: 'Oregon Ducks' },
      ],
    };
    
    return teams[sport.toUpperCase()] || teams.NBA;
  }

  private randomOdds(): number {
    const base = Math.random() > 0.5 ? 1 : -1;
    return base * (Math.floor(Math.random() * 200) + 100);
  }

  private randomSpread(): number {
    return (Math.floor(Math.random() * 14) - 7) + 0.5;
  }

  private randomTotal(sport: string): number {
    const totals: Record<string, number> = {
      NBA: 220 + Math.floor(Math.random() * 30),
      NFL: 42 + Math.floor(Math.random() * 12),
      MLB: 8 + Math.floor(Math.random() * 4),
      NHL: 5 + Math.floor(Math.random() * 3),
      NCAAB: 140 + Math.floor(Math.random() * 20),
      NCAAF: 48 + Math.floor(Math.random() * 15),
    };
    return totals[sport.toUpperCase()] || 200;
  }

  // Clear cache for fresh data
  clearCache(): void {
    cache.clear();
    console.log('[SportsData] Cache cleared');
  }
}

export const sportsDataService = new SportsDataService();

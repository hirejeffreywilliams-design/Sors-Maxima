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
    this.apiKey = process.env.THE_ODDS_API_KEY?.trim() || null;
  }

  isAvailable(): boolean {
    return !!(this.apiKey || process.env.THE_ODDS_API_KEY?.trim());
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

  private getDemoOdds(sport: string): NormalizedGame[] {
    console.log(`[SportsData] No live odds available for ${sport} — returning empty (use ESPN-derived odds from Intelligence Hub)`);
    return [];
  }

  clearCache(): void {
    cache.clear();
    console.log('[SportsData] Cache cleared');
  }
}

export const sportsDataService = new SportsDataService();

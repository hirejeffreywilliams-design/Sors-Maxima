import { useState } from "react";

const NBA_ABBR: Record<string, string> = {
  "atlanta hawks": "atl", "boston celtics": "bos", "brooklyn nets": "bkn",
  "charlotte hornets": "cha", "chicago bulls": "chi", "cleveland cavaliers": "cle",
  "dallas mavericks": "dal", "denver nuggets": "den", "detroit pistons": "det",
  "golden state warriors": "gs", "houston rockets": "hou", "indiana pacers": "ind",
  "los angeles clippers": "lac", "la clippers": "lac", "los angeles lakers": "lal",
  "la lakers": "lal", "memphis grizzlies": "mem", "miami heat": "mia",
  "milwaukee bucks": "mil", "minnesota timberwolves": "min", "new orleans pelicans": "no",
  "new york knicks": "ny", "oklahoma city thunder": "okc", "orlando magic": "orl",
  "philadelphia 76ers": "phi", "philadelphia sixers": "phi", "phoenix suns": "phx",
  "portland trail blazers": "por", "sacramento kings": "sac", "san antonio spurs": "sa",
  "toronto raptors": "tor", "utah jazz": "utah", "washington wizards": "wsh",
  "hawks": "atl", "celtics": "bos", "nets": "bkn", "hornets": "cha", "bulls": "chi",
  "cavaliers": "cle", "cavs": "cle", "mavericks": "dal", "mavs": "dal",
  "nuggets": "den", "pistons": "det", "warriors": "gs", "rockets": "hou",
  "pacers": "ind", "clippers": "lac", "lakers": "lal", "grizzlies": "mem",
  "heat": "mia", "bucks": "mil", "timberwolves": "min", "wolves": "min",
  "pelicans": "no", "knicks": "ny", "thunder": "okc", "magic": "orl",
  "76ers": "phi", "sixers": "phi", "suns": "phx", "blazers": "por",
  "kings": "sac", "spurs": "sa", "raptors": "tor", "jazz": "utah", "wizards": "wsh",
};

const NFL_ABBR: Record<string, string> = {
  "arizona cardinals": "ari", "atlanta falcons": "atl", "baltimore ravens": "bal",
  "buffalo bills": "buf", "carolina panthers": "car", "chicago bears": "chi",
  "cincinnati bengals": "cin", "cleveland browns": "cle", "dallas cowboys": "dal",
  "denver broncos": "den", "detroit lions": "det", "green bay packers": "gb",
  "houston texans": "hou", "indianapolis colts": "ind", "jacksonville jaguars": "jax",
  "kansas city chiefs": "kc", "las vegas raiders": "lv", "oakland raiders": "lv",
  "los angeles chargers": "lac", "la chargers": "lac", "los angeles rams": "lar",
  "la rams": "lar", "miami dolphins": "mia", "minnesota vikings": "min",
  "new england patriots": "ne", "new orleans saints": "no", "new york giants": "nyg",
  "new york jets": "nyj", "philadelphia eagles": "phi", "pittsburgh steelers": "pit",
  "san francisco 49ers": "sf", "san francisco 49'ers": "sf", "seattle seahawks": "sea",
  "tampa bay buccaneers": "tb", "tennessee titans": "ten", "washington commanders": "wsh",
  "washington football team": "wsh",
  "cardinals": "ari", "falcons": "atl", "ravens": "bal", "bills": "buf",
  "panthers": "car", "bears": "chi", "bengals": "cin", "browns": "cle",
  "cowboys": "dal", "broncos": "den", "lions": "det", "packers": "gb",
  "texans": "hou", "colts": "ind", "jaguars": "jax", "chiefs": "kc",
  "raiders": "lv", "chargers": "lac", "rams": "lar", "dolphins": "mia",
  "vikings": "min", "patriots": "ne", "saints": "no", "giants": "nyg",
  "jets": "nyj", "eagles": "phi", "steelers": "pit", "49ers": "sf",
  "niners": "sf", "seahawks": "sea", "buccaneers": "tb", "bucs": "tb",
  "titans": "ten", "commanders": "wsh",
};

const MLB_ABBR: Record<string, string> = {
  "arizona diamondbacks": "ari", "atlanta braves": "atl", "baltimore orioles": "bal",
  "boston red sox": "bos", "chicago cubs": "chc", "chicago white sox": "chw",
  "cincinnati reds": "cin", "cleveland guardians": "cle", "cleveland indians": "cle",
  "colorado rockies": "col", "detroit tigers": "det", "houston astros": "hou",
  "kansas city royals": "kc", "los angeles angels": "laa", "la angels": "laa",
  "los angeles dodgers": "lad", "la dodgers": "lad", "miami marlins": "mia",
  "milwaukee brewers": "mil", "minnesota twins": "min", "new york mets": "nym",
  "new york yankees": "nyy", "oakland athletics": "oak", "philadelphia phillies": "phi",
  "pittsburgh pirates": "pit", "san diego padres": "sd", "san francisco giants": "sf",
  "seattle mariners": "sea", "st. louis cardinals": "stl", "st louis cardinals": "stl",
  "tampa bay rays": "tb", "texas rangers": "tex", "toronto blue jays": "tor",
  "washington nationals": "wsh",
  "diamondbacks": "ari", "d-backs": "ari", "braves": "atl", "orioles": "bal",
  "red sox": "bos", "cubs": "chc", "white sox": "chw", "reds": "cin",
  "guardians": "cle", "rockies": "col", "tigers": "det", "astros": "hou",
  "royals": "kc", "angels": "laa", "dodgers": "lad", "marlins": "mia",
  "brewers": "mil", "twins": "min", "mets": "nym", "yankees": "nyy",
  "athletics": "oak", "a's": "oak", "phillies": "phi", "pirates": "pit",
  "padres": "sd", "giants": "sf", "mariners": "sea", "cardinals": "stl",
  "rays": "tb", "rangers": "tex", "blue jays": "tor", "nationals": "wsh",
};

const NHL_ABBR: Record<string, string> = {
  "anaheim ducks": "ana", "boston bruins": "bos", "buffalo sabres": "buf",
  "calgary flames": "cgy", "carolina hurricanes": "car", "chicago blackhawks": "chi",
  "colorado avalanche": "col", "columbus blue jackets": "cbj", "dallas stars": "dal",
  "detroit red wings": "det", "edmonton oilers": "edm", "florida panthers": "fla",
  "los angeles kings": "la", "la kings": "la", "minnesota wild": "min",
  "montreal canadiens": "mtl", "nashville predators": "nsh", "new jersey devils": "nj",
  "new york islanders": "nyi", "new york rangers": "nyr", "ottawa senators": "ott",
  "philadelphia flyers": "phi", "pittsburgh penguins": "pit", "san jose sharks": "sj",
  "seattle kraken": "sea", "st. louis blues": "stl", "st louis blues": "stl",
  "tampa bay lightning": "tb", "toronto maple leafs": "tor", "utah hockey club": "utah",
  "vancouver canucks": "van", "vegas golden knights": "vgk", "golden knights": "vgk",
  "washington capitals": "wsh", "winnipeg jets": "wpg",
  "ducks": "ana", "bruins": "bos", "sabres": "buf", "flames": "cgy",
  "hurricanes": "car", "canes": "car", "blackhawks": "chi", "hawks": "chi",
  "avalanche": "col", "avs": "col", "blue jackets": "cbj", "stars": "dal",
  "red wings": "det", "oilers": "edm", "panthers": "fla", "kings": "la",
  "wild": "min", "canadiens": "mtl", "habs": "mtl", "predators": "nsh",
  "preds": "nsh", "devils": "nj", "islanders": "nyi", "isles": "nyi",
  "rangers": "nyr", "senators": "ott", "sens": "ott", "flyers": "phi",
  "penguins": "pit", "pens": "pit", "sharks": "sj", "kraken": "sea",
  "blues": "stl", "lightning": "tb", "bolts": "tb", "maple leafs": "tor",
  "leafs": "tor", "canucks": "van", "capitals": "wsh", "caps": "wsh", "jets": "wpg",
};

const SPORT_MAP: Record<string, Record<string, string>> = {
  NBA: NBA_ABBR, NFL: NFL_ABBR, MLB: MLB_ABBR, NHL: NHL_ABBR,
  NCAAB: NBA_ABBR, NCAAF: NFL_ABBR,
};

const ESPN_LEAGUE: Record<string, string> = {
  NBA: "nba", NFL: "nfl", MLB: "mlb", NHL: "nhl",
  NCAAB: "college-basketball", NCAAF: "ncaa",
};

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀", NCAAB: "🏀", NFL: "🏈", NCAAF: "🏈",
  MLB: "⚾", NHL: "🏒", MLS: "⚽", MMA: "🥊",
};

export function getTeamAbbr(teamName: string, sport: string): string | null {
  if (!teamName) return null;
  const map = SPORT_MAP[sport?.toUpperCase()] ?? {};
  const key = teamName.toLowerCase().trim();
  if (map[key]) return map[key];
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  const words = key.split(/\s+/);
  for (const word of words.reverse()) {
    if (word.length >= 4) {
      for (const [k, v] of Object.entries(map)) {
        if (k.includes(word)) return v;
      }
    }
  }
  return null;
}

export function getEspnLogoUrl(sport: string, abbr: string): string {
  const league = ESPN_LEAGUE[sport?.toUpperCase()];
  if (!league) return "";
  return `https://a.espncdn.com/i/teamlogos/${league}/500/${abbr}.png`;
}

interface TeamLogoProps {
  team: string;
  sport: string;
  size?: number;
  className?: string;
}

export function TeamLogo({ team, sport, size = 28, className = "" }: TeamLogoProps) {
  const [err, setErr] = useState(false);
  const abbr = getTeamAbbr(team, sport);
  const logoUrl = abbr ? getEspnLogoUrl(sport, abbr) : "";
  const sportKey = sport?.toUpperCase();
  const fallbackEmoji = SPORT_EMOJI[sportKey] ?? "🎯";

  const shortName = abbr?.toUpperCase() || team?.slice(0, 3).toUpperCase() || "?";

  if (!logoUrl || err) {
    return (
      <div
        className={`rounded-lg flex items-center justify-center bg-muted border border-border/40 shrink-0 font-bold overflow-hidden ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        title={team}
        data-testid={`team-logo-fallback-${abbr || "?"}`}
      >
        {abbr ? (
          <span className="text-muted-foreground">{shortName}</span>
        ) : (
          <span style={{ fontSize: size * 0.5 }}>{fallbackEmoji}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={team}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
      data-testid={`team-logo-${abbr}`}
      title={team}
    />
  );
}

interface MatchupLogosProps {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  size?: number;
}

export function MatchupLogos({ homeTeam, awayTeam, sport, size = 24 }: MatchupLogosProps) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <TeamLogo team={awayTeam} sport={sport} size={size} />
      <span className="text-muted-foreground/50 text-[9px] font-bold leading-none px-0.5">@</span>
      <TeamLogo team={homeTeam} sport={sport} size={size} />
    </div>
  );
}

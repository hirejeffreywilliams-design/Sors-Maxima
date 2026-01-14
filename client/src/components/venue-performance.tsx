import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { MapPin, Cloud, Wind, Thermometer, Mountain, TrendingUp, TrendingDown, Home, Plane } from "lucide-react";

interface VenueProfile {
  id: string;
  venue: string;
  city: string;
  sport: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  venueType: "dome" | "outdoor" | "retractable";
  surface: string;
  altitude: number;
  weather?: { temp: number; wind: number; precipitation: number; conditions: string };
  homeAdvantage: number;
  avgTotal: number;
  overRate: number;
  homeTeamRecord: string;
  awayTeamRecord: string;
  factors: { factor: string; impact: "positive" | "negative" | "neutral"; description: string }[];
  recommendation: string;
}

function getMockVenues(): VenueProfile[] {
  return [
    {
      id: "1",
      venue: "Arrowhead Stadium",
      city: "Kansas City, MO",
      sport: "NFL",
      game: "Chiefs vs Raiders",
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      venueType: "outdoor",
      surface: "Grass",
      altitude: 820,
      weather: { temp: 28, wind: 15, precipitation: 10, conditions: "Cloudy" },
      homeAdvantage: 68,
      avgTotal: 48.2,
      overRate: 54,
      homeTeamRecord: "8-1",
      awayTeamRecord: "2-7",
      factors: [
        { factor: "Crowd Noise", impact: "positive", description: "Loudest stadium in NFL - 142.2 dB record" },
        { factor: "Cold Weather", impact: "positive", description: "KC 12-3 in games under 35°F" },
        { factor: "Wind", impact: "negative", description: "15+ mph wind affects passing" },
      ],
      recommendation: "Strong home edge. Weather favors KC's run game. Consider Under if wind increases.",
    },
    {
      id: "2",
      venue: "Ball Arena",
      city: "Denver, CO",
      sport: "NBA",
      game: "Nuggets vs Lakers",
      homeTeam: "Nuggets",
      awayTeam: "Lakers",
      venueType: "dome",
      surface: "Hardwood",
      altitude: 5280,
      homeAdvantage: 72,
      avgTotal: 228.4,
      overRate: 48,
      homeTeamRecord: "18-3",
      awayTeamRecord: "12-9",
      factors: [
        { factor: "Altitude", impact: "positive", description: "5,280 ft - opponents fatigue faster" },
        { factor: "Travel", impact: "positive", description: "LAL flying in same day" },
        { factor: "Back-to-Back", impact: "positive", description: "Lakers on B2B, Nuggets rested" },
      ],
      recommendation: "Major altitude + rest advantage. Nuggets dominate at home. Lakers struggle late.",
    },
    {
      id: "3",
      venue: "Hard Rock Stadium",
      city: "Miami, FL",
      sport: "NFL",
      game: "Dolphins vs Bills",
      homeTeam: "Dolphins",
      awayTeam: "Bills",
      venueType: "outdoor",
      surface: "Grass",
      altitude: 6,
      weather: { temp: 82, wind: 8, precipitation: 20, conditions: "Partly Cloudy" },
      homeAdvantage: 58,
      avgTotal: 50.8,
      overRate: 58,
      homeTeamRecord: "6-2",
      awayTeamRecord: "5-4",
      factors: [
        { factor: "Heat", impact: "positive", description: "82°F - cold weather teams struggle" },
        { factor: "Humidity", impact: "positive", description: "85% humidity affects conditioning" },
        { factor: "Travel", impact: "positive", description: "Bills traveling from Buffalo" },
      ],
      recommendation: "Heat advantage for MIA. Higher scoring game likely. Buffalo may fade late.",
    },
    {
      id: "4",
      venue: "Rogers Centre",
      city: "Toronto, ON",
      sport: "MLB",
      game: "Blue Jays vs Yankees",
      homeTeam: "Blue Jays",
      awayTeam: "Yankees",
      venueType: "retractable",
      surface: "Turf",
      altitude: 249,
      homeAdvantage: 54,
      avgTotal: 9.2,
      overRate: 52,
      homeTeamRecord: "42-38",
      awayTeamRecord: "45-35",
      factors: [
        { factor: "Turf", impact: "neutral", description: "Faster surface - more hits" },
        { factor: "Roof Status", impact: "neutral", description: "Roof closed - controlled environment" },
        { factor: "Border Crossing", impact: "positive", description: "Some players skip Canada trips" },
      ],
      recommendation: "Turf leads to slightly higher scoring. Check Yankees travel roster.",
    },
    {
      id: "5",
      venue: "Lambeau Field",
      city: "Green Bay, WI",
      sport: "NFL",
      game: "Packers vs Bears",
      homeTeam: "Packers",
      awayTeam: "Bears",
      venueType: "outdoor",
      surface: "Grass",
      altitude: 634,
      weather: { temp: 18, wind: 22, precipitation: 40, conditions: "Snow" },
      homeAdvantage: 75,
      avgTotal: 42.5,
      overRate: 38,
      homeTeamRecord: "7-2",
      awayTeamRecord: "4-5",
      factors: [
        { factor: "Frozen Tundra", impact: "positive", description: "GB 28-5 in snow games since 2000" },
        { factor: "Wind", impact: "negative", description: "22 mph gusts - passing game limited" },
        { factor: "Rivalry", impact: "neutral", description: "Bears historically competitive here" },
      ],
      recommendation: "Snow game = run-heavy. Strong Under spot. GB has clear weather advantage.",
    },
  ];
}

export function VenuePerformance() {
  const [venues] = useState<VenueProfile[]>(getMockVenues());
  const [sport, setSport] = useState("all");

  const filtered = sport === "all" ? venues : venues.filter(v => v.sport === sport);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-medium">Venue-Specific Performance Data</span>
          <Badge variant="outline">Location Analysis</Badge>
        </div>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="w-32" data-testid="select-venue-sport">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
            <SelectItem value="NHL">NHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map(venue => (
          <Card key={venue.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{venue.sport}</Badge>
                    <span className="font-semibold">{venue.venue}</span>
                    <Badge variant="outline">{venue.venueType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{venue.city} • {venue.game}</p>
                </div>
                {venue.weather && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-4 h-4 text-orange-500" />
                      <span>{venue.weather.temp}°F</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind className="w-4 h-4 text-blue-500" />
                      <span>{venue.weather.wind} mph</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cloud className="w-4 h-4 text-gray-500" />
                      <span>{venue.weather.conditions}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Home Advantage</p>
                  <p className={`font-bold text-lg ${venue.homeAdvantage >= 65 ? "text-green-500" : ""}`}>
                    {venue.homeAdvantage}%
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Avg Total</p>
                  <p className="font-bold text-lg">{venue.avgTotal}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Over Rate</p>
                  <p className={`font-bold text-lg ${venue.overRate > 55 ? "text-green-500" : venue.overRate < 45 ? "text-red-500" : ""}`}>
                    {venue.overRate}%
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Home className="w-3 h-3" /> Record
                  </p>
                  <p className="font-bold text-lg text-green-500">{venue.homeTeamRecord}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Plane className="w-3 h-3" /> Record
                  </p>
                  <p className="font-bold text-lg text-red-500">{venue.awayTeamRecord}</p>
                </div>
              </div>

              {venue.altitude > 1000 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg mb-3 text-sm">
                  <Mountain className="w-4 h-4 text-yellow-500" />
                  <span>High Altitude: {venue.altitude.toLocaleString()} ft - affects conditioning and ball flight</span>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {venue.factors.map((factor, i) => (
                  <div 
                    key={i}
                    className={`p-2 rounded-lg flex items-center justify-between ${
                      factor.impact === "positive" ? "bg-green-500/10" :
                      factor.impact === "negative" ? "bg-red-500/10" :
                      "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {factor.impact === "positive" ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : factor.impact === "negative" ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
                      )}
                      <span className="font-medium text-sm">{factor.factor}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{factor.description}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm">{venue.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

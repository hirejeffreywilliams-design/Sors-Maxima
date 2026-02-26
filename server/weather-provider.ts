const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

export interface VenueWeather {
  venue: string;
  city: string;
  state?: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    temperatureUnit: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
    precipitation: number;
    weatherCode: number;
    weatherDescription: string;
    cloudCover: number;
    isOutdoor: boolean;
  };
  gameTime?: {
    temperature: number;
    feelsLike: number;
    windSpeed: number;
    precipitation: number;
    precipitationProbability: number;
    weatherDescription: string;
  };
  bettingImpact: {
    level: "none" | "low" | "moderate" | "high" | "extreme";
    factors: string[];
    totalAdjustment: number;
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Freezing light drizzle",
  57: "Freezing dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing light rain",
  67: "Freezing heavy rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const VENUE_COORDINATES: Record<string, { lat: number; lon: number; city: string; state: string; outdoor: boolean }> = {
  "Arrowhead Stadium": { lat: 39.0489, lon: -94.4839, city: "Kansas City", state: "MO", outdoor: true },
  "GEHA Field at Arrowhead Stadium": { lat: 39.0489, lon: -94.4839, city: "Kansas City", state: "MO", outdoor: true },
  "Allegiant Stadium": { lat: 36.0908, lon: -115.1833, city: "Las Vegas", state: "NV", outdoor: false },
  "AT&T Stadium": { lat: 32.7473, lon: -97.0945, city: "Arlington", state: "TX", outdoor: false },
  "Bank of America Stadium": { lat: 35.2258, lon: -80.8528, city: "Charlotte", state: "NC", outdoor: true },
  "Caesars Superdome": { lat: 29.9511, lon: -90.0812, city: "New Orleans", state: "LA", outdoor: false },
  "Empower Field at Mile High": { lat: 39.7439, lon: -105.0200, city: "Denver", state: "CO", outdoor: true },
  "FedExField": { lat: 38.9076, lon: -76.8645, city: "Landover", state: "MD", outdoor: true },
  "Ford Field": { lat: 42.3400, lon: -83.0456, city: "Detroit", state: "MI", outdoor: false },
  "Gillette Stadium": { lat: 42.0909, lon: -71.2643, city: "Foxborough", state: "MA", outdoor: true },
  "Hard Rock Stadium": { lat: 25.9580, lon: -80.2389, city: "Miami Gardens", state: "FL", outdoor: true },
  "Highmark Stadium": { lat: 42.7738, lon: -78.7870, city: "Orchard Park", state: "NY", outdoor: true },
  "Huntington Bank Field": { lat: 41.5061, lon: -81.6995, city: "Cleveland", state: "OH", outdoor: true },
  "Levi's Stadium": { lat: 37.4033, lon: -121.9694, city: "Santa Clara", state: "CA", outdoor: true },
  "Lincoln Financial Field": { lat: 39.9008, lon: -75.1675, city: "Philadelphia", state: "PA", outdoor: true },
  "Lumen Field": { lat: 47.5952, lon: -122.3316, city: "Seattle", state: "WA", outdoor: true },
  "Lucas Oil Stadium": { lat: 39.7601, lon: -86.1639, city: "Indianapolis", state: "IN", outdoor: false },
  "Mercedes-Benz Stadium": { lat: 33.7554, lon: -84.4010, city: "Atlanta", state: "GA", outdoor: false },
  "MetLife Stadium": { lat: 40.8128, lon: -74.0742, city: "East Rutherford", state: "NJ", outdoor: true },
  "NRG Stadium": { lat: 29.6847, lon: -95.4107, city: "Houston", state: "TX", outdoor: false },
  "Nissan Stadium": { lat: 36.1665, lon: -86.7713, city: "Nashville", state: "TN", outdoor: true },
  "Paycor Stadium": { lat: 39.0955, lon: -84.5161, city: "Cincinnati", state: "OH", outdoor: true },
  "Raymond James Stadium": { lat: 27.9759, lon: -82.5033, city: "Tampa", state: "FL", outdoor: true },
  "SoFi Stadium": { lat: 33.9535, lon: -118.3392, city: "Inglewood", state: "CA", outdoor: false },
  "Soldier Field": { lat: 41.8623, lon: -87.6167, city: "Chicago", state: "IL", outdoor: true },
  "State Farm Stadium": { lat: 33.5276, lon: -112.2626, city: "Glendale", state: "AZ", outdoor: false },
  "U.S. Bank Stadium": { lat: 44.9736, lon: -93.2575, city: "Minneapolis", state: "MN", outdoor: false },
  "Acrisure Stadium": { lat: 40.4468, lon: -80.0158, city: "Pittsburgh", state: "PA", outdoor: true },
  "EverBank Stadium": { lat: 30.3239, lon: -81.6373, city: "Jacksonville", state: "FL", outdoor: true },

  "Madison Square Garden": { lat: 40.7505, lon: -73.9934, city: "New York", state: "NY", outdoor: false },
  "Crypto.com Arena": { lat: 34.0430, lon: -118.2673, city: "Los Angeles", state: "CA", outdoor: false },
  "United Center": { lat: 41.8807, lon: -87.6742, city: "Chicago", state: "IL", outdoor: false },
  "TD Garden": { lat: 42.3662, lon: -71.0621, city: "Boston", state: "MA", outdoor: false },
  "Chase Center": { lat: 37.7680, lon: -122.3877, city: "San Francisco", state: "CA", outdoor: false },
  "Barclays Center": { lat: 40.6826, lon: -73.9754, city: "Brooklyn", state: "NY", outdoor: false },
  "Ball Arena": { lat: 39.7487, lon: -105.0077, city: "Denver", state: "CO", outdoor: false },
  "Fiserv Forum": { lat: 43.0451, lon: -87.9174, city: "Milwaukee", state: "WI", outdoor: false },
  "State Farm Arena": { lat: 33.7573, lon: -84.3963, city: "Atlanta", state: "GA", outdoor: false },
  "American Airlines Center": { lat: 32.7905, lon: -96.8103, city: "Dallas", state: "TX", outdoor: false },
  "Toyota Center": { lat: 29.7508, lon: -95.3621, city: "Houston", state: "TX", outdoor: false },
  "Wells Fargo Center": { lat: 39.9012, lon: -75.1720, city: "Philadelphia", state: "PA", outdoor: false },
  "Target Center": { lat: 44.9795, lon: -93.2761, city: "Minneapolis", state: "MN", outdoor: false },
  "Paycom Center": { lat: 35.4634, lon: -97.5151, city: "Oklahoma City", state: "OK", outdoor: false },
  "Scotiabank Arena": { lat: 43.6435, lon: -79.3791, city: "Toronto", state: "ON", outdoor: false },
  "Kaseya Center": { lat: 25.7814, lon: -80.1870, city: "Miami", state: "FL", outdoor: false },
  "Smoothie King Center": { lat: 29.9490, lon: -90.0821, city: "New Orleans", state: "LA", outdoor: false },
  "Gainbridge Fieldhouse": { lat: 39.7640, lon: -86.1555, city: "Indianapolis", state: "IN", outdoor: false },
  "Rocket Mortgage FieldHouse": { lat: 41.4964, lon: -81.6882, city: "Cleveland", state: "OH", outdoor: false },
  "Capital One Arena": { lat: 38.8982, lon: -77.0209, city: "Washington", state: "DC", outdoor: false },
  "Little Caesars Arena": { lat: 42.3411, lon: -83.0553, city: "Detroit", state: "MI", outdoor: false },

  "Yankee Stadium": { lat: 40.8296, lon: -73.9262, city: "Bronx", state: "NY", outdoor: true },
  "Dodger Stadium": { lat: 34.0739, lon: -118.2400, city: "Los Angeles", state: "CA", outdoor: true },
  "Fenway Park": { lat: 42.3467, lon: -71.0972, city: "Boston", state: "MA", outdoor: true },
  "Wrigley Field": { lat: 41.9484, lon: -87.6553, city: "Chicago", state: "IL", outdoor: true },
  "Oracle Park": { lat: 37.7786, lon: -122.3893, city: "San Francisco", state: "CA", outdoor: true },
  "Coors Field": { lat: 39.7559, lon: -104.9942, city: "Denver", state: "CO", outdoor: true },
  "Citizens Bank Park": { lat: 39.9061, lon: -75.1665, city: "Philadelphia", state: "PA", outdoor: true },
  "Minute Maid Park": { lat: 29.7573, lon: -95.3555, city: "Houston", state: "TX", outdoor: false },
  "T-Mobile Park": { lat: 47.5914, lon: -122.3325, city: "Seattle", state: "WA", outdoor: false },
  "Truist Park": { lat: 33.8907, lon: -84.4677, city: "Atlanta", state: "GA", outdoor: true },
  "Globe Life Field": { lat: 32.7472, lon: -97.0836, city: "Arlington", state: "TX", outdoor: false },
  "Petco Park": { lat: 32.7076, lon: -117.1570, city: "San Diego", state: "CA", outdoor: true },
  "PNC Park": { lat: 40.4469, lon: -80.0058, city: "Pittsburgh", state: "PA", outdoor: true },
  "Busch Stadium": { lat: 38.6226, lon: -90.1928, city: "St. Louis", state: "MO", outdoor: true },
  "Great American Ball Park": { lat: 39.0975, lon: -84.5086, city: "Cincinnati", state: "OH", outdoor: true },
  "Progressive Field": { lat: 41.4962, lon: -81.6852, city: "Cleveland", state: "OH", outdoor: true },
  "Comerica Park": { lat: 42.3390, lon: -83.0485, city: "Detroit", state: "MI", outdoor: true },
  "Target Field": { lat: 44.9818, lon: -93.2776, city: "Minneapolis", state: "MN", outdoor: true },
  "Kauffman Stadium": { lat: 39.0517, lon: -94.4803, city: "Kansas City", state: "MO", outdoor: true },
};

interface WeatherCache {
  data: VenueWeather;
  timestamp: number;
}

const weatherCache = new Map<string, WeatherCache>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000;

function getWeatherImpact(weather: VenueWeather["current"]): VenueWeather["bettingImpact"] {
  const factors: string[] = [];
  let adjustment = 0;

  if (!weather.isOutdoor) {
    return { level: "none", factors: ["Indoor venue — weather has no impact"], totalAdjustment: 0 };
  }

  if (weather.windSpeed > 25) {
    factors.push(`High winds (${weather.windSpeed} mph) — affects passing and kicking accuracy`);
    adjustment += 3;
  } else if (weather.windSpeed > 15) {
    factors.push(`Moderate winds (${weather.windSpeed} mph) — may affect deep passing`);
    adjustment += 1;
  }

  if (weather.precipitation > 2) {
    factors.push(`Heavy precipitation (${weather.precipitation}mm) — wet ball, slippery field`);
    adjustment += 4;
  } else if (weather.precipitation > 0.5) {
    factors.push(`Light precipitation (${weather.precipitation}mm) — slightly wet conditions`);
    adjustment += 1;
  }

  if (weather.temperature < 25) {
    factors.push(`Extreme cold (${weather.temperature}°F) — affects grip, ball flight, player performance`);
    adjustment += 3;
  } else if (weather.temperature < 40) {
    factors.push(`Cold conditions (${weather.temperature}°F) — reduced ball elasticity`);
    adjustment += 1;
  } else if (weather.temperature > 95) {
    factors.push(`Extreme heat (${weather.temperature}°F) — fatigue and dehydration risk`);
    adjustment += 2;
  }

  if (weather.humidity > 85) {
    factors.push(`High humidity (${weather.humidity}%) — increased fatigue`);
    adjustment += 1;
  }

  if (weather.weatherCode >= 95) {
    factors.push(`Thunderstorm conditions — potential delays, dangerous play`);
    adjustment += 5;
  }

  let level: VenueWeather["bettingImpact"]["level"] = "none";
  if (adjustment >= 8) level = "extreme";
  else if (adjustment >= 5) level = "high";
  else if (adjustment >= 3) level = "moderate";
  else if (adjustment >= 1) level = "low";

  if (factors.length === 0) {
    factors.push("Clear conditions — no significant weather impact expected");
  }

  return { level, factors, totalAdjustment: adjustment };
}

export async function getVenueWeather(venueName: string, gameTimeISO?: string): Promise<VenueWeather | null> {
  const cacheKey = `${venueName}-${gameTimeISO || "now"}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  let venueInfo = VENUE_COORDINATES[venueName];
  if (!venueInfo) {
    const lowerName = venueName.toLowerCase();
    const match = Object.entries(VENUE_COORDINATES).find(([key]) =>
      lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)
    );
    if (match) venueInfo = match[1];
  }

  if (!venueInfo) return null;

  try {
    const params = new URLSearchParams({
      latitude: venueInfo.lat.toString(),
      longitude: venueInfo.lon.toString(),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "mm",
      timezone: "auto",
      forecast_days: "3",
    });

    const response = await fetch(`${OPEN_METEO_BASE}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const current = data.current;

    const result: VenueWeather = {
      venue: venueName,
      city: venueInfo.city,
      state: venueInfo.state,
      latitude: venueInfo.lat,
      longitude: venueInfo.lon,
      current: {
        temperature: Math.round(current.temperature_2m),
        temperatureUnit: "°F",
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        windGusts: Math.round(current.wind_gusts_10m),
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        weatherDescription: WEATHER_CODES[current.weather_code] || "Unknown",
        cloudCover: current.cloud_cover,
        isOutdoor: venueInfo.outdoor,
      },
      bettingImpact: { level: "none", factors: [], totalAdjustment: 0 },
    };

    if (gameTimeISO && data.hourly) {
      const gameHour = new Date(gameTimeISO).getHours();
      const hourlyTimes: string[] = data.hourly.time || [];
      const gameDate = gameTimeISO.split("T")[0];
      const matchIdx = hourlyTimes.findIndex((t: string) => {
        const tDate = t.split("T")[0];
        const tHour = new Date(t).getHours();
        return tDate === gameDate && tHour === gameHour;
      });

      if (matchIdx >= 0) {
        result.gameTime = {
          temperature: Math.round(data.hourly.temperature_2m[matchIdx]),
          feelsLike: Math.round(data.hourly.apparent_temperature[matchIdx]),
          windSpeed: Math.round(data.hourly.wind_speed_10m[matchIdx]),
          precipitation: data.hourly.precipitation[matchIdx],
          precipitationProbability: data.hourly.precipitation_probability[matchIdx],
          weatherDescription: WEATHER_CODES[data.hourly.weather_code[matchIdx]] || "Unknown",
        };
      }
    }

    result.bettingImpact = getWeatherImpact(result.current);

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    // Suppress verbose weather error logs
    return null;
  }
}

export async function getWeatherForGames(
  games: Array<{ venue?: string; startTime?: string }>
): Promise<Map<string, VenueWeather>> {
  const results = new Map<string, VenueWeather>();
  const fetches = games
    .filter((g) => g.venue)
    .map(async (game) => {
      const weather = await getVenueWeather(game.venue!, game.startTime);
      if (weather) results.set(game.venue!, weather);
    });
  await Promise.allSettled(fetches);
  return results;
}

export function getKnownVenues(): string[] {
  return Object.keys(VENUE_COORDINATES);
}

export function isOutdoorVenue(venueName: string): boolean {
  const info = VENUE_COORDINATES[venueName];
  return info?.outdoor ?? true;
}

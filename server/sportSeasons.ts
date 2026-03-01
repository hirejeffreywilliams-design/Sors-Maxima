import type { Sport } from "@shared/schema";

interface SeasonWindow {
  startMonth: number;
  endMonth: number;
}

const SEASON_WINDOWS: Record<string, SeasonWindow[]> = {
  NBA:   [{ startMonth: 10, endMonth: 12 }, { startMonth: 1, endMonth: 6 }],
  NFL:   [{ startMonth: 8, endMonth: 12 }, { startMonth: 1, endMonth: 2 }],
  MLB:   [{ startMonth: 4, endMonth: 11 }],
  NHL:   [{ startMonth: 10, endMonth: 12 }, { startMonth: 1, endMonth: 6 }],
  NCAAB: [{ startMonth: 11, endMonth: 12 }, { startMonth: 1, endMonth: 4 }],
  NCAAF: [{ startMonth: 8, endMonth: 12 }, { startMonth: 1, endMonth: 1 }],
};

const ALL_SPORTS: Sport[] = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];

export function isSportInSeason(sport: Sport, date?: Date): boolean {
  const now = date || new Date();
  const month = now.getMonth() + 1;
  const windows = SEASON_WINDOWS[sport];
  if (!windows) return false;
  return windows.some(w => {
    if (w.startMonth <= w.endMonth) {
      return month >= w.startMonth && month <= w.endMonth;
    }
    return month >= w.startMonth || month <= w.endMonth;
  });
}

export function getInSeasonSports(date?: Date): Sport[] {
  return ALL_SPORTS.filter(sport => isSportInSeason(sport, date));
}

export function getAllSports(): Sport[] {
  return [...ALL_SPORTS];
}

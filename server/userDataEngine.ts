import { randomUUID } from "crypto";

export interface BetRecord {
  id: string;
  oddsFormat: "american" | "decimal";
  sport: string;
  date: string;
  sportsbook: string;
  stake: number;
  result: "won" | "lost" | "pending" | "push";
  payout: number;
  profit: number;
  legs: {
    team: string;
    opponent: string;
    market: string;
    selection: string;
    odds: number;
    result: "won" | "lost" | "pending" | "push";
  }[];
  tags?: string[];
  notes?: string;
  clvAtClose?: number;
}

export interface SportsbookBalance {
  id: string;
  name: string;
  balance: number;
  pendingBets: number;
  bonus: number;
  lastUpdated: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "betting" | "social" | "streak" | "milestone" | "special";
  progress: number;
  total: number;
  unlocked: boolean;
  unlockedAt?: string;
  xp: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly";
  category: string;
  progress: number;
  total: number;
  reward: number;
  rewardType: "xp" | "credits" | "badge";
  expiresAt: string;
  completed: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string;
  weeklyActivity: boolean[];
  monthlyStats: { month: string; daysActive: number; betsPlaced: number }[];
}

export interface PaperBet {
  id: string;
  sport: string;
  selection: string;
  odds: number;
  stake: number;
  result: "won" | "lost" | "pending";
  payout: number;
  date: string;
}

export interface PaperAccount {
  balance: number;
  totalBets: number;
  wins: number;
  losses: number;
  roi: number;
  startingBalance: number;
}

export interface UserAlert {
  id: string;
  type: "line_move" | "injury" | "weather" | "value" | "sharp_action" | "custom";
  title: string;
  message: string;
  sport?: string;
  team?: string;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  active: boolean;
  conditions: Record<string, unknown>;
}

const userBets = new Map<string, BetRecord[]>();
const userSportsbooks = new Map<string, SportsbookBalance[]>();
const userAchievements = new Map<string, Achievement[]>();
const userChallenges = new Map<string, Challenge[]>();
const userStreaks = new Map<string, StreakData>();
const userPaperAccounts = new Map<string, PaperAccount>();
const userPaperBets = new Map<string, PaperBet[]>();
const userAlerts = new Map<string, UserAlert[]>();

function getUserId(sessionId?: string): string {
  return sessionId || "default";
}

function getDefaultAchievements(): Achievement[] {
  return [
    { id: "first_bet", name: "First Step", description: "Track your first bet", icon: "trophy", category: "milestone", progress: 0, total: 1, unlocked: false, xp: 50 },
    { id: "ten_bets", name: "Getting Started", description: "Track 10 bets", icon: "target", category: "milestone", progress: 0, total: 10, unlocked: false, xp: 100 },
    { id: "fifty_bets", name: "Dedicated Bettor", description: "Track 50 bets", icon: "award", category: "milestone", progress: 0, total: 50, unlocked: false, xp: 250 },
    { id: "hundred_bets", name: "Centurion", description: "Track 100 bets", icon: "crown", category: "milestone", progress: 0, total: 100, unlocked: false, xp: 500 },
    { id: "first_win", name: "Winner", description: "Win your first bet", icon: "star", category: "betting", progress: 0, total: 1, unlocked: false, xp: 50 },
    { id: "five_streak", name: "Hot Hand", description: "Win 5 bets in a row", icon: "flame", category: "streak", progress: 0, total: 5, unlocked: false, xp: 200 },
    { id: "ten_streak", name: "On Fire", description: "Win 10 bets in a row", icon: "zap", category: "streak", progress: 0, total: 10, unlocked: false, xp: 500 },
    { id: "positive_roi", name: "Sharp Bettor", description: "Maintain positive ROI over 20+ bets", icon: "trending-up", category: "betting", progress: 0, total: 20, unlocked: false, xp: 300 },
    { id: "multi_sport", name: "Versatile", description: "Place bets across 4 different sports", icon: "globe", category: "betting", progress: 0, total: 4, unlocked: false, xp: 150 },
    { id: "parlay_win", name: "Parlay King", description: "Win a 4+ leg parlay", icon: "layers", category: "betting", progress: 0, total: 1, unlocked: false, xp: 300 },
    { id: "week_active", name: "Consistent", description: "Be active 7 days in a row", icon: "calendar", category: "streak", progress: 0, total: 7, unlocked: false, xp: 150 },
    { id: "community_join", name: "Social Bettor", description: "Join the community leaderboard", icon: "users", category: "social", progress: 0, total: 1, unlocked: false, xp: 50 },
    { id: "first_share", name: "Show Off", description: "Share a winning ticket", icon: "share-2", category: "social", progress: 0, total: 1, unlocked: false, xp: 75 },
    { id: "paper_profit", name: "Paper Profit", description: "Earn $500 profit in paper trading", icon: "file-text", category: "special", progress: 0, total: 500, unlocked: false, xp: 200 },
    { id: "ev_hunter", name: "+EV Hunter", description: "Place 10 positive EV bets", icon: "search", category: "betting", progress: 0, total: 10, unlocked: false, xp: 250 },
  ];
}

function getDefaultChallenges(): Challenge[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return [
    { id: "daily_track", title: "Daily Tracker", description: "Log at least 1 bet today", type: "daily", category: "tracking", progress: 0, total: 1, reward: 25, rewardType: "xp", expiresAt: endOfDay.toISOString(), completed: false },
    { id: "daily_analysis", title: "Analyze This", description: "Generate a ticket using the smart generator", type: "daily", category: "analysis", progress: 0, total: 1, reward: 30, rewardType: "xp", expiresAt: endOfDay.toISOString(), completed: false },
    { id: "daily_roster", title: "Scout Report", description: "Check rosters for 2 different teams", type: "daily", category: "research", progress: 0, total: 2, reward: 20, rewardType: "xp", expiresAt: endOfDay.toISOString(), completed: false },
    { id: "weekly_bets", title: "Weekly Warrior", description: "Track 10 bets this week", type: "weekly", category: "tracking", progress: 0, total: 10, reward: 150, rewardType: "xp", expiresAt: endOfWeek.toISOString(), completed: false },
    { id: "weekly_sports", title: "Multi-Sport Week", description: "Place bets on 3 different sports", type: "weekly", category: "variety", progress: 0, total: 3, reward: 100, rewardType: "xp", expiresAt: endOfWeek.toISOString(), completed: false },
    { id: "weekly_positive", title: "Green Week", description: "End the week with positive ROI", type: "weekly", category: "performance", progress: 0, total: 1, reward: 200, rewardType: "xp", expiresAt: endOfWeek.toISOString(), completed: false },
  ];
}

function getDefaultStreakData(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    totalDaysActive: 0,
    lastActiveDate: "",
    weeklyActivity: [false, false, false, false, false, false, false],
    monthlyStats: [],
  };
}

function updateAchievementProgress(userId: string): void {
  const achievements = userAchievements.get(userId);
  const bets = userBets.get(userId) || [];
  if (!achievements) return;

  const totalBets = bets.length;
  const wins = bets.filter(b => b.result === "won").length;
  const sports = new Set(bets.map(b => b.sport));
  const totalProfit = bets.reduce((sum, b) => sum + b.profit, 0);
  const paperBets = userPaperBets.get(userId) || [];
  const paperProfit = paperBets.reduce((sum, b) => sum + (b.result === "won" ? b.payout - b.stake : b.result === "lost" ? -b.stake : 0), 0);

  for (const a of achievements) {
    if (a.unlocked) continue;
    switch (a.id) {
      case "first_bet": a.progress = Math.min(totalBets, 1); break;
      case "ten_bets": a.progress = Math.min(totalBets, 10); break;
      case "fifty_bets": a.progress = Math.min(totalBets, 50); break;
      case "hundred_bets": a.progress = Math.min(totalBets, 100); break;
      case "first_win": a.progress = Math.min(wins, 1); break;
      case "multi_sport": a.progress = Math.min(sports.size, 4); break;
      case "positive_roi": a.progress = totalBets >= 20 && totalProfit > 0 ? 20 : Math.min(totalBets, 19); break;
      case "parlay_win": a.progress = bets.filter(b => b.result === "won" && b.legs.length >= 4).length > 0 ? 1 : 0; break;
      case "paper_profit": a.progress = Math.min(Math.max(0, Math.floor(paperProfit)), 500); break;
      case "ev_hunter": {
        const evBets = bets.filter(b => b.tags?.includes("positive_ev"));
        a.progress = Math.min(evBets.length, 10);
        break;
      }
    }
    if (a.progress >= a.total) {
      a.unlocked = true;
      a.unlockedAt = new Date().toISOString();
    }
  }
}

export function getBets(sessionId?: string): BetRecord[] {
  const userId = getUserId(sessionId);
  return userBets.get(userId) || [];
}

export function addBet(bet: Omit<BetRecord, "id">, sessionId?: string): BetRecord {
  const userId = getUserId(sessionId);
  const bets = userBets.get(userId) || [];
  const newBet: BetRecord = { ...bet, id: randomUUID() };
  bets.push(newBet);
  userBets.set(userId, bets);
  updateStreakActivity(userId);
  updateAchievementProgress(userId);
  updateChallengeProgress(userId, "bet_placed", bet.sport);
  return newBet;
}

export function updateBet(id: string, updates: Partial<BetRecord>, sessionId?: string): BetRecord | null {
  const userId = getUserId(sessionId);
  const bets = userBets.get(userId) || [];
  const idx = bets.findIndex(b => b.id === id);
  if (idx === -1) return null;
  bets[idx] = { ...bets[idx], ...updates };
  userBets.set(userId, bets);
  updateAchievementProgress(userId);
  return bets[idx];
}

export function deleteBet(id: string, sessionId?: string): boolean {
  const userId = getUserId(sessionId);
  const bets = userBets.get(userId) || [];
  const filtered = bets.filter(b => b.id !== id);
  if (filtered.length === bets.length) return false;
  userBets.set(userId, filtered);
  return true;
}

export function getBetStats(sessionId?: string) {
  const bets = getBets(sessionId);
  const resolved = bets.filter(b => b.result !== "pending");
  const wins = resolved.filter(b => b.result === "won").length;
  const losses = resolved.filter(b => b.result === "lost").length;
  const pushes = resolved.filter(b => b.result === "push").length;
  const totalStaked = resolved.reduce((sum, b) => sum + b.stake, 0);
  const totalProfit = resolved.reduce((sum, b) => sum + b.profit, 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const avgOdds = resolved.length > 0 ? resolved.reduce((sum, b) => sum + (b.legs[0]?.odds || 0), 0) / resolved.length : 0;

  const bySport: Record<string, { bets: number; wins: number; profit: number; staked: number }> = {};
  const byMarket: Record<string, { bets: number; wins: number; profit: number; staked: number }> = {};
  const byMonth: { period: string; roi: number; profit: number; bets: number }[] = [];

  for (const bet of resolved) {
    if (!bySport[bet.sport]) bySport[bet.sport] = { bets: 0, wins: 0, profit: 0, staked: 0 };
    bySport[bet.sport].bets++;
    if (bet.result === "won") bySport[bet.sport].wins++;
    bySport[bet.sport].profit += bet.profit;
    bySport[bet.sport].staked += bet.stake;

    const market = bet.legs[0]?.market || "other";
    if (!byMarket[market]) byMarket[market] = { bets: 0, wins: 0, profit: 0, staked: 0 };
    byMarket[market].bets++;
    if (bet.result === "won") byMarket[market].wins++;
    byMarket[market].profit += bet.profit;
    byMarket[market].staked += bet.stake;
  }

  const monthMap = new Map<string, { profit: number; staked: number; count: number }>();
  for (const bet of resolved) {
    const d = new Date(bet.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) || { profit: 0, staked: 0, count: 0 };
    entry.profit += bet.profit;
    entry.staked += bet.stake;
    entry.count++;
    monthMap.set(key, entry);
  }
  for (const [period, data] of Array.from(monthMap.entries())) {
    byMonth.push({
      period,
      roi: data.staked > 0 ? (data.profit / data.staked) * 100 : 0,
      profit: data.profit,
      bets: data.count,
    });
  }
  byMonth.sort((a, b) => a.period.localeCompare(b.period));

  return {
    totalBets: bets.length,
    resolvedBets: resolved.length,
    pendingBets: bets.filter(b => b.result === "pending").length,
    wins, losses, pushes,
    winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 0,
    totalStaked: Math.round(totalStaked * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    avgOdds: Math.round(avgOdds),
    bySport: Object.entries(bySport).map(([sport, s]) => ({
      sport, ...s,
      roi: s.staked > 0 ? Math.round((s.profit / s.staked) * 10000) / 100 : 0,
      winRate: s.bets > 0 ? Math.round((s.wins / s.bets) * 10000) / 100 : 0,
    })),
    byMarket: Object.entries(byMarket).map(([market, m]) => ({
      market, ...m,
      roi: m.staked > 0 ? Math.round((m.profit / m.staked) * 10000) / 100 : 0,
      winRate: m.bets > 0 ? Math.round((m.wins / m.bets) * 10000) / 100 : 0,
    })),
    byMonth,
  };
}

export function getTaxSummary(sessionId?: string) {
  const bets = getBets(sessionId);
  const resolved = bets.filter(b => b.result !== "pending");
  const yearMap = new Map<string, { grossWinnings: number; totalWagered: number; netProfit: number; totalBets: number }>();
  for (const bet of resolved) {
    const year = new Date(bet.date).getFullYear().toString();
    const entry = yearMap.get(year) || { grossWinnings: 0, totalWagered: 0, netProfit: 0, totalBets: 0 };
    entry.totalWagered += bet.stake;
    entry.totalBets++;
    if (bet.profit > 0) entry.grossWinnings += bet.payout;
    entry.netProfit += bet.profit;
    yearMap.set(year, entry);
  }
  return Array.from(yearMap.entries()).map(([year, data]) => ({
    year,
    ...data,
    grossWinnings: Math.round(data.grossWinnings * 100) / 100,
    totalWagered: Math.round(data.totalWagered * 100) / 100,
    netProfit: Math.round(data.netProfit * 100) / 100,
  })).sort((a, b) => b.year.localeCompare(a.year));
}

export function getSportsbooks(sessionId?: string): SportsbookBalance[] {
  const userId = getUserId(sessionId);
  if (!userSportsbooks.has(userId)) {
    userSportsbooks.set(userId, [
      { id: randomUUID(), name: "DraftKings", balance: 0, pendingBets: 0, bonus: 0, lastUpdated: new Date().toISOString() },
      { id: randomUUID(), name: "FanDuel", balance: 0, pendingBets: 0, bonus: 0, lastUpdated: new Date().toISOString() },
      { id: randomUUID(), name: "BetMGM", balance: 0, pendingBets: 0, bonus: 0, lastUpdated: new Date().toISOString() },
      { id: randomUUID(), name: "Caesars", balance: 0, pendingBets: 0, bonus: 0, lastUpdated: new Date().toISOString() },
    ]);
  }
  return userSportsbooks.get(userId)!;
}

export function updateSportsbook(id: string, updates: Partial<SportsbookBalance>, sessionId?: string): SportsbookBalance | null {
  const userId = getUserId(sessionId);
  const books = userSportsbooks.get(userId) || [];
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) return null;
  books[idx] = { ...books[idx], ...updates, lastUpdated: new Date().toISOString() };
  return books[idx];
}

export function addSportsbook(name: string, sessionId?: string): SportsbookBalance {
  const userId = getUserId(sessionId);
  const books = userSportsbooks.get(userId) || [];
  const newBook: SportsbookBalance = { id: randomUUID(), name, balance: 0, pendingBets: 0, bonus: 0, lastUpdated: new Date().toISOString() };
  books.push(newBook);
  userSportsbooks.set(userId, books);
  return newBook;
}

export function getAchievements(sessionId?: string): Achievement[] {
  const userId = getUserId(sessionId);
  if (!userAchievements.has(userId)) {
    userAchievements.set(userId, getDefaultAchievements());
  }
  updateAchievementProgress(userId);
  return userAchievements.get(userId)!;
}

export function getChallenges(sessionId?: string): Challenge[] {
  const userId = getUserId(sessionId);
  if (!userChallenges.has(userId)) {
    userChallenges.set(userId, getDefaultChallenges());
  }
  const challenges = userChallenges.get(userId)!;
  const now = new Date();
  for (const c of challenges) {
    if (new Date(c.expiresAt) < now && !c.completed) {
      c.progress = 0;
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      c.expiresAt = c.type === "daily" ? endOfDay.toISOString() : endOfWeek.toISOString();
    }
  }
  return challenges;
}

function updateChallengeProgress(userId: string, action: string, sport?: string): void {
  const challenges = userChallenges.get(userId);
  if (!challenges) return;
  for (const c of challenges) {
    if (c.completed) continue;
    if (action === "bet_placed" && (c.id === "daily_track" || c.id === "weekly_bets")) {
      c.progress = Math.min(c.progress + 1, c.total);
    }
    if (action === "bet_placed" && c.id === "weekly_sports" && sport) {
      c.progress = Math.min(c.progress + 1, c.total);
    }
    if (action === "ticket_generated" && c.id === "daily_analysis") {
      c.progress = Math.min(c.progress + 1, c.total);
    }
    if (c.progress >= c.total) c.completed = true;
  }
}

export function triggerChallengeAction(action: string, sport?: string, sessionId?: string): void {
  const userId = getUserId(sessionId);
  if (!userChallenges.has(userId)) getChallenges(sessionId);
  updateChallengeProgress(userId, action, sport);
}

export function getStreakData(sessionId?: string): StreakData {
  const userId = getUserId(sessionId);
  if (!userStreaks.has(userId)) {
    userStreaks.set(userId, getDefaultStreakData());
  }
  return userStreaks.get(userId)!;
}

function updateStreakActivity(userId: string): void {
  const streak = userStreaks.get(userId) || getDefaultStreakData();
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  if (streak.lastActiveDate !== today) {
    streak.totalDaysActive++;
    const lastDate = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    const todayDate = new Date(today);
    if (lastDate && (todayDate.getTime() - lastDate.getTime()) <= 86400000 * 1.5) {
      streak.currentStreak++;
    } else {
      streak.currentStreak = 1;
    }
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastActiveDate = today;
    streak.weeklyActivity[dayOfWeek] = true;
  }
  userStreaks.set(userId, streak);
}

export function getPaperAccount(sessionId?: string): PaperAccount {
  const userId = getUserId(sessionId);
  if (!userPaperAccounts.has(userId)) {
    userPaperAccounts.set(userId, { balance: 10000, totalBets: 0, wins: 0, losses: 0, roi: 0, startingBalance: 10000 });
  }
  return userPaperAccounts.get(userId)!;
}

export function getPaperBets(sessionId?: string): PaperBet[] {
  const userId = getUserId(sessionId);
  return userPaperBets.get(userId) || [];
}

export function placePaperBet(bet: Omit<PaperBet, "id" | "result" | "payout" | "date">, sessionId?: string): PaperBet | null {
  const userId = getUserId(sessionId);
  const account = getPaperAccount(sessionId);
  if (bet.stake > account.balance) return null;

  const newBet: PaperBet = {
    ...bet,
    id: randomUUID(),
    result: "pending",
    payout: 0,
    date: new Date().toISOString(),
  };

  account.balance -= bet.stake;
  account.totalBets++;

  const bets = userPaperBets.get(userId) || [];
  bets.push(newBet);
  userPaperBets.set(userId, bets);
  userPaperAccounts.set(userId, account);

  return newBet;
}

export function resolvePaperBet(betId: string, result: "won" | "lost", sessionId?: string): PaperBet | null {
  const userId = getUserId(sessionId);
  const bets = userPaperBets.get(userId) || [];
  const account = getPaperAccount(sessionId);
  const bet = bets.find(b => b.id === betId);
  if (!bet || bet.result !== "pending") return null;

  bet.result = result;
  if (result === "won") {
    bet.payout = bet.stake * bet.odds;
    account.balance += bet.payout;
    account.wins++;
  } else {
    bet.payout = 0;
    account.losses++;
  }

  const totalProfit = account.balance - account.startingBalance;
  account.roi = account.startingBalance > 0 ? (totalProfit / account.startingBalance) * 100 : 0;

  userPaperAccounts.set(userId, account);
  updateAchievementProgress(userId);
  return bet;
}

export function getAlerts(sessionId?: string): UserAlert[] {
  const userId = getUserId(sessionId);
  return userAlerts.get(userId) || [];
}

export function addAlert(alert: Omit<UserAlert, "id" | "triggered" | "createdAt">, sessionId?: string): UserAlert {
  const userId = getUserId(sessionId);
  const alerts = userAlerts.get(userId) || [];
  const newAlert: UserAlert = { ...alert, id: randomUUID(), triggered: false, createdAt: new Date().toISOString() };
  alerts.push(newAlert);
  userAlerts.set(userId, alerts);
  return newAlert;
}

export function deleteAlert(id: string, sessionId?: string): boolean {
  const userId = getUserId(sessionId);
  const alerts = userAlerts.get(userId) || [];
  const filtered = alerts.filter(a => a.id !== id);
  if (filtered.length === alerts.length) return false;
  userAlerts.set(userId, filtered);
  return true;
}

export function toggleAlert(id: string, sessionId?: string): UserAlert | null {
  const userId = getUserId(sessionId);
  const alerts = userAlerts.get(userId) || [];
  const alert = alerts.find(a => a.id === id);
  if (!alert) return null;
  alert.active = !alert.active;
  return alert;
}

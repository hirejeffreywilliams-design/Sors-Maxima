import { randomUUID } from "crypto";

export interface LeaderboardEntry {
  id: string;
  username: string;
  rank: number;
  winRate: number;
  profit: number;
  totalBets: number;
  streak: number;
  roi: number;
  badge: string;
  joinedAt: string;
}

export interface SocialBettor {
  id: string;
  username: string;
  winRate: number;
  totalBets: number;
  profit: number;
  roi: number;
  specialties: string[];
  isFollowing: boolean;
  followers: number;
}

export interface SharedTicket {
  id: string;
  userId: string;
  username: string;
  sport: string;
  legs: { team: string; market: string; selection: string; odds: number; result?: string }[];
  totalOdds: number;
  stake: number;
  result: "won" | "lost" | "pending";
  payout: number;
  likes: number;
  comments: number;
  sharedAt: string;
}

export interface FeedItem {
  id: string;
  type: "bet_won" | "achievement" | "streak" | "tip_shared" | "joined";
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  sport: string;
  entryFee: number;
  prizePool: number;
  participants: number;
  maxParticipants: number;
  startsAt: string;
  endsAt: string;
  status: "upcoming" | "active" | "completed";
  leaderboard: { username: string; picks: number; correct: number; winRate: number }[];
}

const leaderboard: LeaderboardEntry[] = [];
const socialBettors: SocialBettor[] = [];
const sharedTickets: SharedTicket[] = [];
const feedItems: FeedItem[] = [];
const competitions: Competition[] = [];
const followedUsers = new Map<string, Set<string>>();

function ensureInitialData(): void {
  if (leaderboard.length > 0) return;

  const names = ["SharpShooter", "ParlaySam", "ValueHunter", "StatsMaster", "OddsOracle", "LineWatcher", "PropKing", "BetBrain", "EdgeFinder", "DataDriven"];
  for (let i = 0; i < names.length; i++) {
    leaderboard.push({
      id: randomUUID(),
      username: names[i],
      rank: i + 1,
      winRate: 45 + (10 - i) * 2,
      profit: Math.round((1000 - i * 100) * 100) / 100,
      totalBets: 150 + Math.floor(i * 20),
      streak: Math.max(0, 8 - i),
      roi: Math.round((15 - i * 1.5) * 100) / 100,
      badge: i < 3 ? "elite" : i < 6 ? "pro" : "starter",
      joinedAt: new Date(Date.now() - (30 + i * 10) * 86400000).toISOString(),
    });

    socialBettors.push({
      id: leaderboard[i].id,
      username: names[i],
      winRate: leaderboard[i].winRate,
      totalBets: leaderboard[i].totalBets,
      profit: leaderboard[i].profit,
      roi: leaderboard[i].roi,
      specialties: [["NBA", "NFL", "MLB", "NHL"][i % 4], ["Moneyline", "Spread", "Props", "Totals"][i % 4]],
      isFollowing: false,
      followers: Math.floor(50 + (10 - i) * 15),
    });
  }

  feedItems.push(
    { id: randomUUID(), type: "bet_won", userId: leaderboard[0].id, username: "SharpShooter", message: "Won a 4-leg NBA parlay (+850)", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: randomUUID(), type: "streak", userId: leaderboard[1].id, username: "ParlaySam", message: "Hit a 7-game winning streak!", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: randomUUID(), type: "achievement", userId: leaderboard[2].id, username: "ValueHunter", message: "Unlocked 'Sharp Bettor' achievement", timestamp: new Date(Date.now() - 14400000).toISOString() },
    { id: randomUUID(), type: "tip_shared", userId: leaderboard[3].id, username: "StatsMaster", message: "Shared an MLB analysis for today's games", timestamp: new Date(Date.now() - 21600000).toISOString() },
  );

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  competitions.push(
    {
      id: randomUUID(), name: "Daily NBA Challenge", description: "Pick winners for today's NBA games. Most correct picks wins.",
      sport: "NBA", entryFee: 0, prizePool: 0, participants: 24, maxParticipants: 100,
      startsAt: now.toISOString(), endsAt: tomorrow.toISOString(), status: "active",
      leaderboard: [
        { username: "SharpShooter", picks: 5, correct: 4, winRate: 80 },
        { username: "ParlaySam", picks: 5, correct: 3, winRate: 60 },
        { username: "ValueHunter", picks: 4, correct: 3, winRate: 75 },
      ],
    },
    {
      id: randomUUID(), name: "Weekly Sports Pick'em", description: "Pick winners across all sports this week. Highest accuracy wins.",
      sport: "All", entryFee: 0, prizePool: 0, participants: 42, maxParticipants: 200,
      startsAt: now.toISOString(), endsAt: nextWeek.toISOString(), status: "active",
      leaderboard: [
        { username: "DataDriven", picks: 12, correct: 9, winRate: 75 },
        { username: "OddsOracle", picks: 15, correct: 10, winRate: 67 },
        { username: "StatsMaster", picks: 10, correct: 7, winRate: 70 },
      ],
    },
  );
}

export function getLeaderboard(timeframe?: string): LeaderboardEntry[] {
  ensureInitialData();
  return leaderboard;
}

export function getSocialBettors(sessionId?: string): SocialBettor[] {
  ensureInitialData();
  const userId = sessionId || "default";
  const following = followedUsers.get(userId) || new Set();
  return socialBettors.map(b => ({ ...b, isFollowing: following.has(b.id) }));
}

export function followBettor(bettorId: string, sessionId?: string): boolean {
  const userId = sessionId || "default";
  if (!followedUsers.has(userId)) followedUsers.set(userId, new Set());
  const following = followedUsers.get(userId)!;
  if (following.has(bettorId)) {
    following.delete(bettorId);
    const bettor = socialBettors.find(b => b.id === bettorId);
    if (bettor) bettor.followers = Math.max(0, bettor.followers - 1);
    return false;
  }
  following.add(bettorId);
  const bettor = socialBettors.find(b => b.id === bettorId);
  if (bettor) bettor.followers++;
  return true;
}

export function getSharedTickets(): SharedTicket[] {
  ensureInitialData();
  return sharedTickets;
}

export function shareTicket(ticket: Omit<SharedTicket, "id" | "likes" | "comments" | "sharedAt">, sessionId?: string): SharedTicket {
  ensureInitialData();
  const shared: SharedTicket = { ...ticket, id: randomUUID(), likes: 0, comments: 0, sharedAt: new Date().toISOString() };
  sharedTickets.unshift(shared);

  feedItems.unshift({
    id: randomUUID(),
    type: "bet_won",
    userId: ticket.userId,
    username: ticket.username,
    message: `Shared a ${ticket.legs.length}-leg ${ticket.sport} ticket (${ticket.result === "won" ? "WON" : ticket.result})`,
    timestamp: new Date().toISOString(),
  });

  return shared;
}

export function likeTicket(ticketId: string): boolean {
  const ticket = sharedTickets.find(t => t.id === ticketId);
  if (!ticket) return false;
  ticket.likes++;
  return true;
}

export function getFeed(): FeedItem[] {
  ensureInitialData();
  return feedItems.slice(0, 50);
}

export function addFeedItem(item: Omit<FeedItem, "id" | "timestamp">): FeedItem {
  const newItem: FeedItem = { ...item, id: randomUUID(), timestamp: new Date().toISOString() };
  feedItems.unshift(newItem);
  if (feedItems.length > 200) feedItems.splice(200);
  return newItem;
}

export function getCompetitions(): Competition[] {
  ensureInitialData();
  const now = new Date();
  for (const c of competitions) {
    if (new Date(c.endsAt) < now && c.status === "active") c.status = "completed";
    if (new Date(c.startsAt) > now && c.status !== "upcoming") c.status = "upcoming";
  }
  return competitions;
}

export function joinCompetition(competitionId: string, username: string): boolean {
  const comp = competitions.find(c => c.id === competitionId);
  if (!comp || comp.status !== "active" || comp.participants >= comp.maxParticipants) return false;
  if (comp.leaderboard.some(e => e.username === username)) return false;
  comp.participants++;
  comp.leaderboard.push({ username, picks: 0, correct: 0, winRate: 0 });
  return true;
}

export function getCopyBettors(sessionId?: string): (SocialBettor & { recentPicks: { sport: string; selection: string; odds: number; result: string }[] })[] {
  ensureInitialData();
  const userId = sessionId || "default";
  const following = followedUsers.get(userId) || new Set();
  return socialBettors.slice(0, 5).map(b => ({
    ...b,
    isFollowing: following.has(b.id),
    recentPicks: [
      { sport: "NBA", selection: "Lakers ML", odds: -150, result: "won" },
      { sport: "NFL", selection: "Chiefs -3.5", odds: -110, result: "pending" },
    ],
  }));
}

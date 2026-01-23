import { db } from "./db";
import {
  bankrollAlerts,
  betHistory,
  userAnalytics,
  notificationPreferences,
  sportsbookAccounts,
  responsibleGaming,
  betBackups,
  oddsSnapshots,
  taxRecords,
  type InsertBankrollAlert,
  type InsertBetHistory,
  type InsertNotificationPreferences,
  type InsertSportsbookAccount,
  type InsertResponsibleGaming,
} from "./dbSchema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { logError, logInfo } from "./errorLogger";

// Bankroll Alerts Service
export async function createBankrollAlert(data: InsertBankrollAlert) {
  try {
    const [result] = await db.insert(bankrollAlerts).values(data).returning();
    return result;
  } catch (error: any) {
    logError(error, { context: "createBankrollAlert" });
    throw error;
  }
}

export async function getUserBankrollAlerts(userId: number) {
  return db.select().from(bankrollAlerts).where(eq(bankrollAlerts.userId, userId));
}

export async function updateBankrollAlert(id: number, data: Partial<InsertBankrollAlert>) {
  const [result] = await db.update(bankrollAlerts).set(data).where(eq(bankrollAlerts.id, id)).returning();
  return result;
}

export async function deleteBankrollAlert(id: number) {
  await db.delete(bankrollAlerts).where(eq(bankrollAlerts.id, id));
}

// Bet History Service
export async function recordBet(data: InsertBetHistory) {
  try {
    const [result] = await db.insert(betHistory).values(data).returning();
    await updateUserAnalytics(data.userId);
    return result;
  } catch (error: any) {
    logError(error, { context: "recordBet" });
    throw error;
  }
}

export async function getUserBetHistory(userId: number, limit = 50) {
  return db.select()
    .from(betHistory)
    .where(eq(betHistory.userId, userId))
    .orderBy(desc(betHistory.placedAt))
    .limit(limit);
}

export async function settleBet(id: number, result: "won" | "lost" | "push", actualPayout: number) {
  const [bet] = await db.update(betHistory)
    .set({ 
      result, 
      actualPayout,
      actualOutcome: result === "won",
      settledAt: new Date()
    })
    .where(eq(betHistory.id, id))
    .returning();
  
  if (bet) {
    await updateUserAnalytics(bet.userId);
  }
  return bet;
}

export async function getBetGradingStats(userId: number) {
  const history = await db.select().from(betHistory).where(eq(betHistory.userId, userId));
  
  const gradeStats: Record<string, { total: number; wins: number; accuracy: number }> = {};
  
  for (const bet of history) {
    if (!bet.grade || !bet.result || bet.result === "pending") continue;
    
    if (!gradeStats[bet.grade]) {
      gradeStats[bet.grade] = { total: 0, wins: 0, accuracy: 0 };
    }
    
    gradeStats[bet.grade].total++;
    if (bet.result === "won") {
      gradeStats[bet.grade].wins++;
    }
    gradeStats[bet.grade].accuracy = gradeStats[bet.grade].wins / gradeStats[bet.grade].total;
  }
  
  return gradeStats;
}

// User Analytics Service
async function updateUserAnalytics(userId: number) {
  try {
    const history = await db.select().from(betHistory).where(eq(betHistory.userId, userId));
    
    let totalBets = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalPushes = 0;
    let totalStaked = 0;
    let totalProfit = 0;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;
    let totalOdds = 0;
    
    const sportPerformance: Record<string, { bets: number; profit: number }> = {};
    const betTypePerformance: Record<string, { bets: number; profit: number }> = {};
    
    for (const bet of history) {
      if (bet.result === "pending") continue;
      
      totalBets++;
      totalStaked += bet.stake;
      totalOdds += bet.odds;
      
      const profit = (bet.actualPayout || 0) - bet.stake;
      totalProfit += profit;
      
      if (!sportPerformance[bet.sport]) {
        sportPerformance[bet.sport] = { bets: 0, profit: 0 };
      }
      sportPerformance[bet.sport].bets++;
      sportPerformance[bet.sport].profit += profit;
      
      if (!betTypePerformance[bet.betType]) {
        betTypePerformance[bet.betType] = { bets: 0, profit: 0 };
      }
      betTypePerformance[bet.betType].bets++;
      betTypePerformance[bet.betType].profit += profit;
      
      if (bet.result === "won") {
        totalWins++;
        tempWinStreak++;
        tempLossStreak = 0;
        currentStreak = tempWinStreak;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (bet.result === "lost") {
        totalLosses++;
        tempLossStreak++;
        tempWinStreak = 0;
        currentStreak = -tempLossStreak;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      } else {
        totalPushes++;
      }
    }
    
    const bestSport = Object.entries(sportPerformance)
      .sort((a, b) => b[1].profit - a[1].profit)[0]?.[0] || null;
    
    const bestBetType = Object.entries(betTypePerformance)
      .sort((a, b) => b[1].profit - a[1].profit)[0]?.[0] || null;
    
    const existing = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, userId)).limit(1);
    
    const analyticsData = {
      userId,
      totalBets,
      totalWins,
      totalLosses,
      totalPushes,
      totalStaked,
      totalProfit,
      roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
      winRate: totalBets > 0 ? (totalWins / totalBets) * 100 : 0,
      avgOdds: totalBets > 0 ? totalOdds / totalBets : 0,
      bestSport,
      bestBetType,
      currentStreak,
      longestWinStreak,
      longestLossStreak,
      updatedAt: new Date(),
    };
    
    if (existing.length > 0) {
      await db.update(userAnalytics).set(analyticsData).where(eq(userAnalytics.userId, userId));
    } else {
      await db.insert(userAnalytics).values(analyticsData);
    }
  } catch (error: any) {
    logError(error, { context: "updateUserAnalytics", userId });
  }
}

export async function getUserAnalytics(userId: number) {
  const [analytics] = await db.select().from(userAnalytics).where(eq(userAnalytics.userId, userId)).limit(1);
  return analytics || {
    totalBets: 0,
    totalWins: 0,
    totalLosses: 0,
    totalPushes: 0,
    totalStaked: 0,
    totalProfit: 0,
    roi: 0,
    winRate: 0,
    avgOdds: 0,
    bestSport: null,
    bestBetType: null,
    currentStreak: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
  };
}

// Notification Preferences Service
export async function getNotificationPreferences(userId: number) {
  const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return prefs || {
    optimalEntryAlerts: true,
    lineMovementAlerts: true,
    injuryAlerts: true,
    steamMoveAlerts: false,
    sharpMoneyAlerts: false,
    bankrollAlerts: true,
    dailyRecapAlerts: true,
    emailNotifications: true,
    pushNotifications: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  };
}

export async function updateNotificationPreferences(userId: number, data: Partial<InsertNotificationPreferences>) {
  const existing = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  
  if (existing.length > 0) {
    const [result] = await db.update(notificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return result;
  } else {
    const [result] = await db.insert(notificationPreferences).values({ userId, ...data }).returning();
    return result;
  }
}

// Sportsbook Accounts Service
export async function addSportsbookAccount(data: InsertSportsbookAccount) {
  const [result] = await db.insert(sportsbookAccounts).values(data).returning();
  return result;
}

export async function getUserSportsbookAccounts(userId: number) {
  return db.select().from(sportsbookAccounts).where(eq(sportsbookAccounts.userId, userId));
}

export async function updateSportsbookAccount(id: number, data: Partial<InsertSportsbookAccount>) {
  const [result] = await db.update(sportsbookAccounts)
    .set({ ...data, lastUpdated: new Date() })
    .where(eq(sportsbookAccounts.id, id))
    .returning();
  return result;
}

export async function deleteSportsbookAccount(id: number) {
  await db.delete(sportsbookAccounts).where(eq(sportsbookAccounts.id, id));
}

export async function getTotalBankroll(userId: number) {
  const accounts = await getUserSportsbookAccounts(userId);
  return accounts.reduce((total, acc) => total + acc.accountBalance, 0);
}

// Responsible Gaming Service
export async function getResponsibleGamingSettings(userId: number) {
  const [settings] = await db.select().from(responsibleGaming).where(eq(responsibleGaming.userId, userId)).limit(1);
  return settings || {
    dailyDepositLimit: null,
    weeklyDepositLimit: null,
    monthlyDepositLimit: null,
    dailyBetLimit: null,
    weeklyBetLimit: null,
    lossLimit: null,
    sessionTimeLimit: null,
    coolOffEndDate: null,
    selfExclusionEndDate: null,
    realityCheckInterval: null,
  };
}

export async function updateResponsibleGamingSettings(userId: number, data: Partial<InsertResponsibleGaming>) {
  const existing = await db.select().from(responsibleGaming).where(eq(responsibleGaming.userId, userId)).limit(1);
  
  if (existing.length > 0) {
    const [result] = await db.update(responsibleGaming)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(responsibleGaming.userId, userId))
      .returning();
    return result;
  } else {
    const [result] = await db.insert(responsibleGaming).values({ userId, ...data }).returning();
    return result;
  }
}

export async function startCoolOffPeriod(userId: number, days: number) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  return updateResponsibleGamingSettings(userId, { coolOffEndDate: endDate });
}

export async function startSelfExclusion(userId: number, months: number) {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  return updateResponsibleGamingSettings(userId, { selfExclusionEndDate: endDate });
}

export async function checkUserCanBet(userId: number): Promise<{ canBet: boolean; reason?: string }> {
  const settings = await getResponsibleGamingSettings(userId);
  const now = new Date();
  
  if (settings.coolOffEndDate && new Date(settings.coolOffEndDate) > now) {
    return { canBet: false, reason: `Cool-off period active until ${settings.coolOffEndDate}` };
  }
  
  if (settings.selfExclusionEndDate && new Date(settings.selfExclusionEndDate) > now) {
    return { canBet: false, reason: `Self-exclusion active until ${settings.selfExclusionEndDate}` };
  }
  
  return { canBet: true };
}

// Bet Backup Service
export async function createBetBackup(userId: number, type: "auto" | "manual" = "manual") {
  const history = await getUserBetHistory(userId, 1000);
  const analytics = await getUserAnalytics(userId);
  const accounts = await getUserSportsbookAccounts(userId);
  
  const backupData = {
    betHistory: history,
    analytics,
    sportsbookAccounts: accounts,
    exportedAt: new Date().toISOString(),
  };
  
  const [result] = await db.insert(betBackups).values({
    userId,
    backupData,
    backupType: type,
  }).returning();
  
  return result;
}

export async function getUserBackups(userId: number) {
  return db.select()
    .from(betBackups)
    .where(eq(betBackups.userId, userId))
    .orderBy(desc(betBackups.createdAt))
    .limit(10);
}

export async function restoreFromBackup(userId: number, backupId: number) {
  const [backup] = await db.select().from(betBackups).where(
    and(eq(betBackups.id, backupId), eq(betBackups.userId, userId))
  ).limit(1);
  
  if (!backup) {
    throw new Error("Backup not found");
  }
  
  return backup.backupData;
}

// Odds Comparison Service
export async function saveOddsSnapshot(data: {
  eventId: string;
  sport: string;
  market: string;
  outcome: string;
  odds: Record<string, number>;
}) {
  let bestOdds = 0;
  let bestBook = "";
  
  const bookMapping: Record<string, keyof typeof oddsData> = {
    draftkings: "draftkingsOdds",
    fanduel: "fanduelOdds",
    betmgm: "betmgmOdds",
    caesars: "caesarsOdds",
    pointsbet: "pointsbetOdds",
    betrivers: "betRiversOdds",
  };
  
  const oddsData: any = {
    eventId: data.eventId,
    sport: data.sport,
    market: data.market,
    outcome: data.outcome,
  };
  
  for (const [book, odds] of Object.entries(data.odds)) {
    const field = bookMapping[book.toLowerCase()];
    if (field) {
      oddsData[field] = odds;
      if (odds > bestOdds) {
        bestOdds = odds;
        bestBook = book;
      }
    }
  }
  
  oddsData.bestOdds = bestOdds;
  oddsData.bestBook = bestBook;
  
  const [result] = await db.insert(oddsSnapshots).values(oddsData).returning();
  return result;
}

export async function getLatestOdds(eventId: string, market: string) {
  const [snapshot] = await db.select()
    .from(oddsSnapshots)
    .where(and(eq(oddsSnapshots.eventId, eventId), eq(oddsSnapshots.market, market)))
    .orderBy(desc(oddsSnapshots.capturedAt))
    .limit(1);
  return snapshot;
}

// Tax Records Service
export async function getTaxRecord(userId: number, year: number) {
  const [record] = await db.select().from(taxRecords)
    .where(and(eq(taxRecords.userId, userId), eq(taxRecords.taxYear, year)))
    .limit(1);
  return record;
}

export async function generateTaxReport(userId: number, year: number) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  const history = await db.select().from(betHistory)
    .where(and(
      eq(betHistory.userId, userId),
      gte(betHistory.placedAt, startDate),
      lte(betHistory.placedAt, endDate)
    ));
  
  let totalWinnings = 0;
  let totalLosses = 0;
  let totalBets = 0;
  const detailedRecords: any[] = [];
  
  for (const bet of history) {
    if (bet.result === "pending") continue;
    
    totalBets++;
    const profit = (bet.actualPayout || 0) - bet.stake;
    
    if (profit > 0) {
      totalWinnings += profit;
    } else {
      totalLosses += Math.abs(profit);
    }
    
    detailedRecords.push({
      date: bet.placedAt,
      sport: bet.sport,
      stake: bet.stake,
      odds: bet.odds,
      result: bet.result,
      payout: bet.actualPayout,
      profit,
    });
  }
  
  const reportData = {
    year,
    totalWinnings,
    totalLosses,
    netProfit: totalWinnings - totalLosses,
    totalBets,
    detailedRecords,
    generatedAt: new Date().toISOString(),
  };
  
  const existing = await getTaxRecord(userId, year);
  
  if (existing) {
    const [result] = await db.update(taxRecords)
      .set({
        totalWinnings,
        totalLosses,
        netProfit: totalWinnings - totalLosses,
        totalBets,
        reportData,
        reportGenerated: true,
        updatedAt: new Date(),
      })
      .where(eq(taxRecords.id, existing.id))
      .returning();
    return result;
  } else {
    const [result] = await db.insert(taxRecords).values({
      userId,
      taxYear: year,
      totalWinnings,
      totalLosses,
      netProfit: totalWinnings - totalLosses,
      totalBets,
      reportData,
      reportGenerated: true,
    }).returning();
    return result;
  }
}

export async function exportBetSlip(legs: any[], stake: number, sportsbook: string) {
  const slipText = legs.map((leg, i) => {
    return `${i + 1}. ${leg.outcome} @ ${leg.americanOdds > 0 ? '+' : ''}${leg.americanOdds}`;
  }).join('\n');
  
  return {
    text: `📋 Bet Slip\n${slipText}\n\nStake: $${stake.toFixed(2)}\nSportsbook: ${sportsbook}`,
    json: { legs, stake, sportsbook, createdAt: new Date().toISOString() },
  };
}

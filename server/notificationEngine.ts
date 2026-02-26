import { getAllSportsScoreboard, type ESPNScoreboardGame } from "./espn-scoreboard-provider";
import { broadcastEvent } from "./sseManager";
import { logError } from "./errorLogger";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { getAllCachedGameProps, type RealPlayerProp } from "./odds-provider";

export interface PropLineSnapshot {
  playerName: string;
  market: string;
  consensusLine: number;
  bestOverOdds: number;
  bestUnderOdds: number;
  bookmakerCount: number;
  timestamp: number;
}

export interface PropMovement {
  playerName: string;
  market: string;
  marketLabel: string;
  gameKey: string;
  previousLine: number;
  currentLine: number;
  lineShift: number;
  previousOverOdds: number;
  currentOverOdds: number;
  oddsShift: number;
  velocity: "slow" | "moderate" | "fast" | "steam";
  sharpAction: boolean;
  direction: "up" | "down" | "stable";
  detectedAt: string;
}

const propLineSnapshots = new Map<string, PropLineSnapshot>();
const recentPropMovements: PropMovement[] = [];
const MAX_PROP_MOVEMENTS = 100;
let propMonitorInterval: NodeJS.Timeout | null = null;

export interface CustomNotification {
  id: number;
  type: "game_start" | "score_change" | "parlay_hit" | "parlay_miss" | "line_movement" | "sharp_money" | "injury_report";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  gameId?: string;
  sport?: string;
  meta?: Record<string, any>;
}

interface GameSubscription {
  gameId: string;
  userId: string;
  sport: string;
  gameName: string;
  alerts: {
    gameStart: boolean;
    scoreChange: boolean;
  };
  subscribedAt: string;
}

interface ParlayWatch {
  ticketId: string;
  userId: string;
  legs: ParlayLeg[];
  createdAt: string;
}

interface ParlayLeg {
  id: string;
  gameId?: string;
  team: string;
  opponent: string;
  market: string;
  outcome: string;
  status: "pending" | "won" | "lost" | "push";
}

interface GameSnapshot {
  id: string;
  homeScore: number;
  awayScore: number;
  state: string;
  period: number;
  clock: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  detail: string;
}

const gameSubscriptions = new Map<string, GameSubscription[]>();
const parlayWatches = new Map<string, ParlayWatch>();
const notifications: CustomNotification[] = [];
let notifIdCounter = 1;
let previousGameSnapshots = new Map<string, GameSnapshot>();
let monitorInterval: NodeJS.Timeout | null = null;

function addNotification(notif: Omit<CustomNotification, "id" | "timestamp" | "read">): CustomNotification {
  const full: CustomNotification = {
    ...notif,
    id: notifIdCounter++,
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(full);
  if (notifications.length > 200) {
    notifications.length = 150;
  }
  broadcastEvent("notification", {
    type: "notification",
    notification: full,
    timestamp: full.timestamp,
  });
  return full;
}

function takeGameSnapshot(game: ESPNScoreboardGame): GameSnapshot {
  return {
    id: game.id,
    homeScore: game.homeTeam.score ?? 0,
    awayScore: game.awayTeam.score ?? 0,
    state: game.status.state,
    period: game.status.period,
    clock: game.status.clock,
    homeTeam: game.homeTeam.shortDisplayName || game.homeTeam.displayName,
    awayTeam: game.awayTeam.shortDisplayName || game.awayTeam.displayName,
    sport: game.sport,
    detail: game.status.detail || "",
  };
}

async function monitorGames(): Promise<void> {
  try {
    const allGames = await getAllSportsScoreboard();
    const currentSnapshots = new Map<string, GameSnapshot>();

    for (const game of allGames) {
      const snap = takeGameSnapshot(game);
      currentSnapshots.set(game.id, snap);
      const prev = previousGameSnapshots.get(game.id);

      if (!prev) continue;

      const subs = getSubscriptionsForGame(game.id);
      if (subs.length === 0) continue;

      if (prev.state === "pre" && snap.state === "in") {
        for (const sub of subs) {
          if (sub.alerts.gameStart) {
            addNotification({
              type: "game_start",
              title: "Game Started!",
              description: `${snap.awayTeam} @ ${snap.homeTeam} is now live`,
              gameId: game.id,
              sport: snap.sport,
              meta: { homeTeam: snap.homeTeam, awayTeam: snap.awayTeam },
            });
          }
        }
      }

      const scoreChanged =
        prev.homeScore !== snap.homeScore || prev.awayScore !== snap.awayScore;

      if (scoreChanged && snap.state === "in") {
        for (const sub of subs) {
          if (sub.alerts.scoreChange) {
            const scoringTeam = prev.homeScore !== snap.homeScore ? snap.homeTeam : snap.awayTeam;
            const pointsScored = snap.state === "in"
              ? (snap.homeScore + snap.awayScore) - (prev.homeScore + prev.awayScore)
              : 0;
            addNotification({
              type: "score_change",
              title: `Score Update`,
              description: `${snap.awayTeam} ${snap.awayScore} - ${snap.homeTeam} ${snap.homeScore} (${snap.detail})`,
              gameId: game.id,
              sport: snap.sport,
              meta: {
                homeTeam: snap.homeTeam,
                awayTeam: snap.awayTeam,
                homeScore: snap.homeScore,
                awayScore: snap.awayScore,
                scoringTeam,
                pointsScored,
                period: snap.period,
                clock: snap.clock,
              },
            });
          }
        }
      }

      if (prev.state === "in" && snap.state === "post") {
        for (const sub of subs) {
          const winner = snap.homeScore > snap.awayScore ? snap.homeTeam : snap.awayTeam;
          addNotification({
            type: "game_start",
            title: "Game Final",
            description: `${snap.awayTeam} ${snap.awayScore} - ${snap.homeTeam} ${snap.homeScore} | ${winner} wins`,
            gameId: game.id,
            sport: snap.sport,
            meta: {
              homeTeam: snap.homeTeam,
              awayTeam: snap.awayTeam,
              homeScore: snap.homeScore,
              awayScore: snap.awayScore,
              winner,
              final: true,
            },
          });
        }
      }
    }

    checkParlayLegs(allGames);

    previousGameSnapshots = currentSnapshots;
  } catch (err) {
    logError("[NotificationEngine] Monitor cycle error", { error: String(err) });
  }
}

function checkParlayLegs(allGames: ESPNScoreboardGame[]): void {
  const completedGames = allGames.filter(g => g.status.state === "post");
  if (completedGames.length === 0) return;

  for (const [ticketId, watch] of Array.from(parlayWatches.entries())) {
    let changed = false;
    for (const leg of watch.legs) {
      if (leg.status !== "pending") continue;

      const matchedGame = completedGames.find(g => {
        const homeShort = g.homeTeam.shortDisplayName || g.homeTeam.displayName;
        const awayShort = g.awayTeam.shortDisplayName || g.awayTeam.displayName;
        return (
          homeShort === leg.team || awayShort === leg.team ||
          homeShort === leg.opponent || awayShort === leg.opponent ||
          (leg.gameId && g.id === leg.gameId)
        );
      });

      if (!matchedGame) continue;

      const homeScore = matchedGame.homeTeam.score ?? 0;
      const awayScore = matchedGame.awayTeam.score ?? 0;
      const homeShort = matchedGame.homeTeam.shortDisplayName || matchedGame.homeTeam.displayName;
      const awayShort = matchedGame.awayTeam.shortDisplayName || matchedGame.awayTeam.displayName;
      const teamIsHome = homeShort === leg.team;
      const teamScore = teamIsHome ? homeScore : awayScore;
      const oppScore = teamIsHome ? awayScore : homeScore;

      let result: "won" | "lost" | "push" = "pending" as any;

      if (leg.market === "moneyline" || leg.market === "match_winner" || leg.market === "h2h") {
        if (teamScore > oppScore) result = "won";
        else if (teamScore < oppScore) result = "lost";
        else result = "push";
      } else if (leg.market === "spread") {
        result = "pending" as any;
      } else if (leg.market === "total" || leg.market === "total_over_under") {
        result = "pending" as any;
      }

      if (result === ("pending" as any)) continue;

      leg.status = result;
      changed = true;

      const gameName = `${awayShort} @ ${homeShort}`;

      if (result === "won") {
        addNotification({
          type: "parlay_hit",
          title: "Leg Hit!",
          description: `${leg.team} ${leg.market} hit in ${gameName} (${awayScore}-${homeScore})`,
          sport: matchedGame.sport,
          gameId: matchedGame.id,
          meta: {
            ticketId,
            legId: leg.id,
            team: leg.team,
            market: leg.market,
            result: "won",
          },
        });
      } else if (result === "lost") {
        addNotification({
          type: "parlay_miss",
          title: "Leg Missed",
          description: `${leg.team} ${leg.market} missed in ${gameName} (${awayScore}-${homeScore})`,
          sport: matchedGame.sport,
          gameId: matchedGame.id,
          meta: {
            ticketId,
            legId: leg.id,
            team: leg.team,
            market: leg.market,
            result: "lost",
          },
        });
      } else if (result === "push") {
        addNotification({
          type: "parlay_hit",
          title: "Leg Push",
          description: `${leg.team} ${leg.market} pushed in ${gameName} (${awayScore}-${homeScore})`,
          sport: matchedGame.sport,
          gameId: matchedGame.id,
          meta: {
            ticketId,
            legId: leg.id,
            team: leg.team,
            market: leg.market,
            result: "push",
          },
        });
      }
    }

    if (changed) {
      const allSettled = watch.legs.every(l => l.status !== "pending");
      if (allSettled) {
        const allWon = watch.legs.every(l => l.status === "won" || l.status === "push");
        const anyLost = watch.legs.some(l => l.status === "lost");
        if (allWon) {
          addNotification({
            type: "parlay_hit",
            title: "Parlay Winner!",
            description: `All ${watch.legs.length} legs hit on ticket ${ticketId.slice(0, 8)}!`,
            meta: { ticketId, legs: watch.legs.length, result: "won" },
          });
        } else if (anyLost) {
          const hitCount = watch.legs.filter(l => l.status === "won").length;
          addNotification({
            type: "parlay_miss",
            title: "Parlay Lost",
            description: `Ticket ${ticketId.slice(0, 8)} missed (${hitCount}/${watch.legs.length} legs hit)`,
            meta: { ticketId, legs: watch.legs.length, hit: hitCount, result: "lost" },
          });
        }
        parlayWatches.delete(ticketId);
      }
    }
  }
}

function getSubscriptionsForGame(gameId: string): GameSubscription[] {
  return gameSubscriptions.get(gameId) || [];
}

export async function subscribeToGame(
  userId: string,
  gameId: string,
  sport: string,
  gameName: string,
  alerts: { gameStart: boolean; scoreChange: boolean } = { gameStart: true, scoreChange: true }
): Promise<GameSubscription> {
  if (!gameSubscriptions.has(gameId)) {
    gameSubscriptions.set(gameId, []);
  }
  const subs = gameSubscriptions.get(gameId)!;
  const existing = subs.find(s => s.userId === userId);
  if (existing) {
    existing.alerts = alerts;
    try {
      await db.execute(sql`
        UPDATE notification_subscriptions
        SET alert_game_start = ${alerts.gameStart}, alert_score_change = ${alerts.scoreChange}
        WHERE game_id = ${gameId} AND user_id = ${userId}
      `);
    } catch (e: any) { logError("[NotificationEngine] DB update error", { error: e.message }); }
    return existing;
  }
  const sub: GameSubscription = {
    gameId,
    userId,
    sport,
    gameName,
    alerts,
    subscribedAt: new Date().toISOString(),
  };
  subs.push(sub);
  try {
    await db.execute(sql`
      INSERT INTO notification_subscriptions (game_id, user_id, sport, game_name, alert_game_start, alert_score_change)
      VALUES (${gameId}, ${userId}, ${sport}, ${gameName}, ${alerts.gameStart}, ${alerts.scoreChange})
      ON CONFLICT (game_id, user_id) DO UPDATE SET
        alert_game_start = EXCLUDED.alert_game_start,
        alert_score_change = EXCLUDED.alert_score_change
    `);
  } catch (e: any) { logError("[NotificationEngine] DB insert error", { error: e.message }); }
  return sub;
}

export async function unsubscribeFromGame(userId: string, gameId: string): Promise<boolean> {
  const subs = gameSubscriptions.get(gameId);
  if (!subs) return false;
  const idx = subs.findIndex(s => s.userId === userId);
  if (idx === -1) return false;
  subs.splice(idx, 1);
  if (subs.length === 0) gameSubscriptions.delete(gameId);
  try {
    await db.execute(sql`DELETE FROM notification_subscriptions WHERE game_id = ${gameId} AND user_id = ${userId}`);
  } catch (e: any) { logError("[NotificationEngine] DB delete error", { error: e.message }); }
  return true;
}

export async function getUserGameSubscriptions(userId: string): Promise<GameSubscription[]> {
  const result: GameSubscription[] = [];
  for (const [, subs] of Array.from(gameSubscriptions.entries())) {
    for (const sub of subs) {
      if (sub.userId === userId) result.push(sub);
    }
  }
  return result;
}

export function watchParlay(ticketId: string, userId: string, legs: ParlayLeg[]): ParlayWatch {
  const watch: ParlayWatch = {
    ticketId,
    userId,
    legs: legs.map(l => ({ ...l, status: l.status || "pending" })),
    createdAt: new Date().toISOString(),
  };
  parlayWatches.set(ticketId, watch);
  return watch;
}

export function unwatchParlay(ticketId: string): boolean {
  return parlayWatches.delete(ticketId);
}

export function getUserParlayWatches(userId: string): ParlayWatch[] {
  const result: ParlayWatch[] = [];
  for (const [, watch] of Array.from(parlayWatches.entries())) {
    if (watch.userId === userId) result.push(watch);
  }
  return result;
}

export function getNotifications(limit = 50, types?: string[]): CustomNotification[] {
  let filtered = notifications;
  if (types && types.length > 0) {
    filtered = notifications.filter(n => types.includes(n.type));
  }
  return filtered.slice(0, limit);
}

export function markNotificationsRead(ids?: number[]): void {
  if (ids && ids.length > 0) {
    for (const n of notifications) {
      if (ids.includes(n.id)) n.read = true;
    }
  } else {
    for (const n of notifications) {
      n.read = true;
    }
  }
}

export function getNotificationStats() {
  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    gameSubscriptions: Array.from(gameSubscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
    parlayWatches: parlayWatches.size,
    byType: {
      game_start: notifications.filter(n => n.type === "game_start").length,
      score_change: notifications.filter(n => n.type === "score_change").length,
      parlay_hit: notifications.filter(n => n.type === "parlay_hit").length,
      parlay_miss: notifications.filter(n => n.type === "parlay_miss").length,
      line_movement: notifications.filter(n => n.type === "line_movement").length,
      sharp_money: notifications.filter(n => n.type === "sharp_money").length,
    },
  };
}

async function loadSubscriptionsFromDB(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT * FROM notification_subscriptions`);
    const rows = (result as any).rows || [];
    for (const row of rows) {
      const sub: GameSubscription = {
        gameId: row.game_id,
        userId: row.user_id,
        sport: row.sport,
        gameName: row.game_name || "",
        alerts: {
          gameStart: row.alert_game_start ?? true,
          scoreChange: row.alert_score_change ?? true,
        },
        subscribedAt: row.subscribed_at ? new Date(row.subscribed_at).toISOString() : new Date().toISOString(),
      };
      if (!gameSubscriptions.has(sub.gameId)) {
        gameSubscriptions.set(sub.gameId, []);
      }
      gameSubscriptions.get(sub.gameId)!.push(sub);
    }
    if (rows.length > 0) {
      console.log(`[NotificationEngine] Loaded ${rows.length} game subscriptions from database`);
    }
  } catch (e: any) {
    logError("[NotificationEngine] Failed to load subscriptions from DB", { error: e.message });
  }
}

function monitorPropLines(): void {
  try {
    const allCachedProps = getAllCachedGameProps();
    if (allCachedProps.size === 0) return;

    const now = Date.now();
    let newMovements = 0;

    for (const [gameKey, props] of allCachedProps) {
      const consolidated = new Map<string, { consensusLine: number; bestOverOdds: number; bestUnderOdds: number; bookmakerCount: number; marketLabel: string }>();

      for (const prop of props) {
        const key = `${prop.playerName}|${prop.market}`;
        const existing = consolidated.get(key);
        if (!existing) {
          consolidated.set(key, {
            consensusLine: prop.consensusLine,
            bestOverOdds: prop.bestOver.odds,
            bestUnderOdds: prop.bestUnder.odds,
            bookmakerCount: prop.allBookmakers.length,
            marketLabel: prop.marketLabel,
          });
        } else {
          if (prop.bestOver.odds > existing.bestOverOdds) existing.bestOverOdds = prop.bestOver.odds;
          if (prop.bestUnder.odds > existing.bestUnderOdds) existing.bestUnderOdds = prop.bestUnder.odds;
          existing.bookmakerCount = Math.max(existing.bookmakerCount, prop.allBookmakers.length);
          existing.consensusLine = (existing.consensusLine + prop.consensusLine) / 2;
        }
      }

      for (const [key, current] of consolidated) {
        const snapshotKey = `${gameKey}|${key}`;
        const prev = propLineSnapshots.get(snapshotKey);

        propLineSnapshots.set(snapshotKey, {
          playerName: key.split("|")[0],
          market: key.split("|")[1],
          consensusLine: current.consensusLine,
          bestOverOdds: current.bestOverOdds,
          bestUnderOdds: current.bestUnderOdds,
          bookmakerCount: current.bookmakerCount,
          timestamp: now,
        });

        if (!prev) continue;

        const lineShift = Math.abs(current.consensusLine - prev.consensusLine);
        const overOddsShift = Math.abs(current.bestOverOdds - prev.bestOverOdds);
        const underOddsShift = Math.abs(current.bestUnderOdds - prev.bestUnderOdds);
        const oddsShift = Math.max(overOddsShift, underOddsShift);
        const timeDelta = (now - prev.timestamp) / 60_000;

        if (timeDelta < 1) continue;

        const lineVelocity = lineShift / Math.max(timeDelta, 1);
        const isSignificantLine = lineShift >= 0.5;
        const isSignificantOdds = oddsShift >= 15;

        if (!isSignificantLine && !isSignificantOdds) continue;

        let velocity: PropMovement["velocity"] = "slow";
        if (lineVelocity > 1.5 || (isSignificantOdds && oddsShift >= 40)) velocity = "steam";
        else if (lineVelocity > 0.8 || (isSignificantOdds && oddsShift >= 25)) velocity = "fast";
        else if (lineVelocity > 0.3 || isSignificantOdds) velocity = "moderate";

        const sharpAction = velocity === "steam" || velocity === "fast" || (isSignificantLine && isSignificantOdds);

        const direction: PropMovement["direction"] =
          current.consensusLine > prev.consensusLine + 0.25 ? "up" :
          current.consensusLine < prev.consensusLine - 0.25 ? "down" : "stable";

        const playerName = key.split("|")[0];
        const market = key.split("|")[1];

        const movement: PropMovement = {
          playerName,
          market,
          marketLabel: current.marketLabel,
          gameKey,
          previousLine: prev.consensusLine,
          currentLine: current.consensusLine,
          lineShift: Math.round(lineShift * 10) / 10,
          previousOverOdds: prev.bestOverOdds,
          currentOverOdds: current.bestOverOdds,
          oddsShift: Math.round(oddsShift),
          velocity,
          sharpAction,
          direction,
          detectedAt: new Date().toISOString(),
        };

        recentPropMovements.unshift(movement);
        if (recentPropMovements.length > MAX_PROP_MOVEMENTS) {
          recentPropMovements.length = MAX_PROP_MOVEMENTS;
        }
        newMovements++;

        if (sharpAction) {
          const dirLabel = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
          const notifType = velocity === "steam" ? "sharp_money" : "line_movement";

          addNotification({
            type: notifType as any,
            title: velocity === "steam" ? "Steam Move — Player Prop" : "Sharp Prop Line Movement",
            description: `${playerName} ${current.marketLabel} ${prev.consensusLine} → ${current.consensusLine} ${dirLabel} (${gameKey})`,
            sport: undefined,
            meta: {
              playerName,
              market,
              marketLabel: current.marketLabel,
              gameKey,
              previousLine: prev.consensusLine,
              currentLine: current.consensusLine,
              lineShift: movement.lineShift,
              oddsShift: movement.oddsShift,
              velocity,
              direction,
              propMovement: true,
            },
          });

          broadcastEvent("prop-sharp-movement", {
            type: "prop-sharp-movement",
            timestamp: new Date().toISOString(),
            movement,
          }, "alerts");
        }
      }
    }

    if (newMovements > 0) {
      console.log(`[NotificationEngine] Detected ${newMovements} prop line movement(s)`);
    }
  } catch (err) {
    logError("[NotificationEngine] Prop monitor cycle error", { error: String(err) });
  }
}

export function getRecentPropMovements(options?: { sharpOnly?: boolean; limit?: number }): PropMovement[] {
  let movements = recentPropMovements;
  if (options?.sharpOnly) {
    movements = movements.filter(m => m.sharpAction);
  }
  return movements.slice(0, options?.limit || 25);
}

export function getPropMovementsForPlayer(playerName: string): PropMovement[] {
  const needle = playerName.toLowerCase().trim();
  return recentPropMovements.filter(m => {
    const name = m.playerName.toLowerCase();
    return name === needle || name.includes(needle) || needle.includes(name);
  });
}

export function getSharpPropAlerts(): PropMovement[] {
  return recentPropMovements.filter(m => m.sharpAction);
}

export async function startNotificationEngine(): Promise<void> {
  if (monitorInterval) return;
  console.log("[NotificationEngine] Starting game & parlay monitor (30s interval)...");

  await loadSubscriptionsFromDB();

  try {
    const allGames = await getAllSportsScoreboard();
    for (const game of allGames) {
      previousGameSnapshots.set(game.id, takeGameSnapshot(game));
    }
    console.log(`[NotificationEngine] Initialized with ${allGames.length} game snapshots`);
  } catch (err) {
    logError("[NotificationEngine] Failed to initialize snapshots", { error: String(err) });
  }

  monitorInterval = setInterval(monitorGames, 30_000);

  if (!propMonitorInterval) {
    propMonitorInterval = setInterval(monitorPropLines, 60_000);
    console.log("[NotificationEngine] Prop line monitor started (60s interval)");
  }
}

export function stopNotificationEngine(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  if (propMonitorInterval) {
    clearInterval(propMonitorInterval);
    propMonitorInterval = null;
  }
  console.log("[NotificationEngine] Stopped.");
}

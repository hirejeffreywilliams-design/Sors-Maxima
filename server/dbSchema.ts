// Re-export all database tables and types from shared/schema.ts
// This maintains backwards compatibility with existing server imports

import { pgTable, serial, integer, varchar, text, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  tier: varchar("tier", { length: 50 }).notNull(),
  experience: varchar("experience", { length: 255 }).notNull(),
  goals: text("goals").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  adminNotes: true
});

export {
  users,
  subscriptions,
  predictions,
  modelWeights,
  learningLogs,
  bankrollAlerts,
  betHistory,
  userAnalytics,
  notificationPreferences,
  sportsbookAccounts,
  responsibleGaming,
  betBackups,
  oddsSnapshots,
  taxRecords,
  tokenStore,
  usersRelations,
  subscriptionsRelations,
  predictionsRelations,
  insertUserSchema,
  insertSubscriptionSchema,
  insertPredictionSchema,
  insertModelWeightSchema,
  insertLearningLogSchema,
  insertBankrollAlertSchema,
  insertBetHistorySchema,
  insertUserAnalyticsSchema,
  insertNotificationPreferencesSchema,
  insertSportsbookAccountSchema,
  insertResponsibleGamingSchema,
  insertBetBackupSchema,
  insertOddsSnapshotSchema,
  insertTaxRecordSchema,
  ecosystemLinks,
  insertEcosystemLinkSchema,
  syncedAchievements,
  insertSyncedAchievementSchema,
  enrichedContextCache,
  insertEnrichedContextCacheSchema,
  emotionalSnapshots,
  insertEmotionalSnapshotSchema,
  emotionPredictionCorrelation,
  insertEmotionPredictionCorrelationSchema,
  coolDownEvents,
  insertCoolDownEventSchema,
} from "@shared/schema";

export type {
  InsertUser,
  User,
  InsertSubscription,
  Subscription,
  InsertPrediction,
  Prediction,
  InsertModelWeight,
  ModelWeight,
  InsertLearningLog,
  LearningLog,
  InsertBankrollAlert,
  BankrollAlert,
  InsertBetHistory,
  BetHistory,
  InsertUserAnalytics,
  UserAnalytics,
  InsertNotificationPreferences,
  NotificationPreferences,
  InsertSportsbookAccount,
  SportsbookAccount,
  InsertResponsibleGaming,
  ResponsibleGaming,
  InsertBetBackup,
  BetBackup,
  InsertOddsSnapshot,
  OddsSnapshot,
  InsertTaxRecord,
  TaxRecord,
  InsertEcosystemLink,
  EcosystemLink,
  InsertSyncedAchievement,
  SyncedAchievement,
  InsertEnrichedContextCache,
  EnrichedContextCache,
  InsertEmotionalSnapshot,
  EmotionalSnapshot,
  InsertEmotionPredictionCorrelation,
  EmotionPredictionCorrelation,
  InsertCoolDownEvent,
  CoolDownEvent,
} from "@shared/schema";

export const tradingCards = pgTable("trading_cards", {
  id: varchar("id", { length: 50 }).primaryKey(),
  pickId: text("pick_id"),
  sport: text("sport").notNull(),
  pick: text("pick").notNull(),
  grade: text("grade").notNull(),
  betType: text("bet_type").notNull(),
  odds: real("odds").notNull(),
  confidence: real("confidence").notNull(),
  ev: real("ev").notNull(),
  game: text("game").notNull(),
  gameTime: timestamp("game_time").notNull(),
  maxCopies: integer("max_copies").notNull(),
  copiesIssued: integer("copies_issued").default(0).notNull(),
  settledResult: text("settled_result").default("pending"),
  cardType: text("card_type").default("member"),
  isFrozen: boolean("is_frozen").default(false),
  frozenReason: text("frozen_reason"),
  frozenAt: timestamp("frozen_at"),
  frozenBy: integer("frozen_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userCardCollections = pgTable("user_card_collections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cardId: varchar("card_id", { length: 50 }).notNull(),
  instanceNumber: integer("instance_number").notNull(),
  acquiredVia: text("acquired_via").notNull(),
  acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
  isShowcase: boolean("is_showcase").default(false).notNull(),
  cardSignature: text("card_signature"),
  isPublicShowcase: boolean("is_public_showcase").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false),
  isRevoked: boolean("is_revoked").default(false),
  revokedReason: text("revoked_reason"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: integer("revoked_by"),
});

export const cardTrades = pgTable("card_trades", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  offeredCollectionIds: jsonb("offered_collection_ids").default([]).notNull(),
  requestedCardId: varchar("requested_card_id", { length: 50 }),
  message: text("message"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardAuditLog = pgTable("card_audit_log", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(),
  cardId: text("card_id"),
  collectionId: integer("collection_id"),
  targetUserId: integer("target_user_id"),
  adminId: integer("admin_id"),
  reason: text("reason"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradingCardSchema = createInsertSchema(tradingCards);
export const insertUserCardCollectionSchema = createInsertSchema(userCardCollections);
export const insertCardTradeSchema = createInsertSchema(cardTrades);
export const insertCardAuditLogSchema = createInsertSchema(cardAuditLog);

export type TradingCard = typeof tradingCards.$inferSelect;
export type UserCardCollection = typeof userCardCollections.$inferSelect;
export type CardTrade = typeof cardTrades.$inferSelect;

export type InsertTradingCard = z.infer<typeof insertTradingCardSchema>;
export type InsertUserCardCollection = z.infer<typeof insertUserCardCollectionSchema>;
export type InsertCardTrade = z.infer<typeof insertCardTradeSchema>;

// === Momentum Multiplier — Prediction Chains ===

export const predictionChains = pgTable("prediction_chains", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  creatorId: integer("creator_id").notNull(),
  sport: varchar("sport", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  currentMultiplier: real("current_multiplier").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  maxMembers: integer("max_members").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chainMembers = pgTable("chain_members", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  userId: integer("user_id").notNull(),
  position: integer("position").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const chainPredictions = pgTable("chain_predictions", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  memberId: integer("member_id").notNull(),
  prediction: text("prediction").notNull(),
  result: varchar("result", { length: 20 }),
  multiplierAtTime: real("multiplier_at_time").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chainStreaks = pgTable("chain_streaks", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  length: integer("length").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const resonanceBadges = pgTable("resonance_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chainId: integer("chain_id").notNull(),
  streakLength: integer("streak_length").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const insertPredictionChainSchema = createInsertSchema(predictionChains).omit({ id: true, createdAt: true });
export const insertChainMemberSchema = createInsertSchema(chainMembers).omit({ id: true, joinedAt: true });
export const insertChainPredictionSchema = createInsertSchema(chainPredictions).omit({ id: true, createdAt: true });

export type PredictionChain = typeof predictionChains.$inferSelect;
export type ChainMember = typeof chainMembers.$inferSelect;
export type ChainPrediction = typeof chainPredictions.$inferSelect;
export type ChainStreak = typeof chainStreaks.$inferSelect;
export type ResonanceBadge = typeof resonanceBadges.$inferSelect;

// === Quantum Replay — Decision Auditing ===

export const replayData = pgTable("replay_data", {
  id: serial("id").primaryKey(),
  predictionId: integer("prediction_id").notNull(),
  factorWeights: jsonb("factor_weights").notNull().default({}),
  decisionPath: jsonb("decision_path").notNull().default([]),
  outcome: varchar("outcome", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const factorAttributions = pgTable("factor_attributions", {
  id: serial("id").primaryKey(),
  replayId: integer("replay_id").notNull(),
  factorName: varchar("factor_name", { length: 100 }).notNull(),
  weight: real("weight").notNull(),
  contribution: real("contribution").notNull(),
  rank: integer("rank").notNull(),
});

export const whatIfScenarios = pgTable("what_if_scenarios", {
  id: serial("id").primaryKey(),
  replayId: integer("replay_id").notNull(),
  modifiedFactors: jsonb("modified_factors").notNull().default({}),
  originalPrediction: real("original_prediction").notNull(),
  modifiedPrediction: real("modified_prediction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const factorAccuracyHistory = pgTable("factor_accuracy_history", {
  id: serial("id").primaryKey(),
  factorName: varchar("factor_name", { length: 100 }).notNull(),
  period: varchar("period", { length: 50 }).notNull(),
  accuracyRate: real("accuracy_rate").notNull(),
  sampleSize: integer("sample_size").notNull(),
});

export const insertReplayDataSchema = createInsertSchema(replayData).omit({ id: true, createdAt: true });
export const insertFactorAttributionSchema = createInsertSchema(factorAttributions).omit({ id: true });
export const insertWhatIfScenarioSchema = createInsertSchema(whatIfScenarios).omit({ id: true, createdAt: true });
export const insertFactorAccuracyHistorySchema = createInsertSchema(factorAccuracyHistory).omit({ id: true });

export type ReplayData = typeof replayData.$inferSelect;
export type FactorAttribution = typeof factorAttributions.$inferSelect;
export type WhatIfScenario = typeof whatIfScenarios.$inferSelect;
export type FactorAccuracyHistoryRecord = typeof factorAccuracyHistory.$inferSelect;

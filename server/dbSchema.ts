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

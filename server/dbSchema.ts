// Re-export all database tables and types from shared/schema.ts
// This maintains backwards compatibility with existing server imports

import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

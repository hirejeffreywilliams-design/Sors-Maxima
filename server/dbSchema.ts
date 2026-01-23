import { pgTable, serial, varchar, text, timestamp, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  tier: varchar("tier", { length: 20 }).default("free").notNull(),
  status: varchar("status", { length: 20 }).default("none").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  ticketId: varchar("ticket_id", { length: 100 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sport: varchar("sport", { length: 20 }).notNull(),
  legs: jsonb("legs").notNull(),
  predictedWinProb: real("predicted_win_prob").notNull(),
  predictedEv: real("predicted_ev").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  grade: varchar("grade", { length: 5 }),
  actualResult: varchar("actual_result", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  settledAt: timestamp("settled_at"),
});

export const modelWeights = pgTable("model_weights", {
  id: serial("id").primaryKey(),
  factorName: varchar("factor_name", { length: 100 }).unique().notNull(),
  weight: real("weight").default(1.0).notNull(),
  totalPredictions: integer("total_predictions").default(0).notNull(),
  correctPredictions: integer("correct_predictions").default(0).notNull(),
  accuracy: real("accuracy").default(0.5).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const learningLogs = pgTable("learning_logs", {
  id: serial("id").primaryKey(),
  cycleNumber: integer("cycle_number").notNull(),
  predictionsAnalyzed: integer("predictions_analyzed").default(0).notNull(),
  weightsAdjusted: integer("weights_adjusted").default(0).notNull(),
  overallAccuracy: real("overall_accuracy"),
  topPerformingFactor: varchar("top_performing_factor", { length: 100 }),
  bottomPerformingFactor: varchar("bottom_performing_factor", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  predictions: many(predictions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export const insertModelWeightSchema = createInsertSchema(modelWeights).omit({ id: true, lastUpdated: true });
export type InsertModelWeight = z.infer<typeof insertModelWeightSchema>;
export type ModelWeight = typeof modelWeights.$inferSelect;

export const insertLearningLogSchema = createInsertSchema(learningLogs).omit({ id: true, createdAt: true });
export type InsertLearningLog = z.infer<typeof insertLearningLogSchema>;
export type LearningLog = typeof learningLogs.$inferSelect;

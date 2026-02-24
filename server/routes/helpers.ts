import type { Request, Response, NextFunction } from "express";
import { idempotencyStore } from "../idempotency";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
    username?: string;
    userId?: string;
    isAdmin?: boolean;
    role?: 'user' | 'admin';
  }
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAuthenticated || !req.session?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.headers["x-idempotency-key"] as string;
  if (!rawKey) {
    return next();
  }

  const userId = (req.session as any)?.username || "anon";
  const scopedKey = `${userId}:${rawKey}`;

  const existing = idempotencyStore.get(scopedKey);
  if (existing) {
    return res.status(existing.response.status).json(existing.response.body);
  }

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function (body: any) {
    idempotencyStore.set(scopedKey, res.statusCode, body);
    return originalJson(body);
  };

  res.send = function (body: any) {
    try {
      const parsed = typeof body === "string" ? JSON.parse(body) : body;
      idempotencyStore.set(scopedKey, res.statusCode, parsed);
    } catch {
      idempotencyStore.set(scopedKey, res.statusCode, { raw: true });
    }
    return originalSend(body);
  };

  next();
}

export const creditUsageTracker = new Map<string, number>();

export const abTestCreateSchema = z.object({
  name: z.string().min(1).max(200),
  hypothesis: z.string().min(1),
  status: z.enum(["draft", "running", "paused", "completed"]),
  category: z.enum(["acquisition", "onboarding", "activation", "retention", "monetization", "referral"]),
  variants: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), isControl: z.boolean(), trafficPercent: z.number(), impressions: z.number().default(0), conversions: z.number().default(0), revenue: z.number().default(0) })).min(2),
  targetAudience: z.string().min(1),
  successMetric: z.string().min(1),
  secondaryMetrics: z.array(z.string()).default([]),
  trafficSplit: z.number().min(1).max(100),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  notes: z.string().default(""),
});

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  status: z.enum(["active", "paused", "draft", "archived"]),
  category: z.enum(["onboarding", "activation", "retention", "reactivation", "monetization", "win_loss"]),
  trigger: z.object({ type: z.enum(["event", "time", "segment", "behavioral"]), condition: z.string(), delay: z.string().optional() }),
  steps: z.array(z.object({ id: z.string(), channel: z.enum(["email", "push", "in_app", "sms"]), subject: z.string(), body: z.string(), delay: z.string(), sent: z.number().default(0), opened: z.number().default(0), clicked: z.number().default(0), converted: z.number().default(0) })).min(1),
  targetSegment: z.string().min(1),
  enrolledUsers: z.number().default(0),
  completedUsers: z.number().default(0),
  conversionRate: z.number().default(0),
  revenue: z.number().default(0),
});

export const segmentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum(["behavioral", "demographic", "value", "lifecycle", "custom"]),
  rules: z.array(z.object({ field: z.string(), operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "in", "between"]), value: z.union([z.string(), z.number(), z.array(z.string())]) })).min(1),
  estimatedSize: z.number().default(0),
  actualSize: z.number().default(0),
  isActive: z.boolean().default(true),
  dynamicOffer: z.any().nullable().default(null),
});

export const promoCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum(["welcome_bonus", "deposit_match", "free_bet", "odds_boost", "cashback", "loyalty_reward", "time_limited", "referral_bonus"]),
  status: z.enum(["active", "scheduled", "expired", "paused", "draft"]),
  value: z.number().min(0),
  valueType: z.enum(["percentage", "fixed", "multiplier"]),
  maxPayout: z.number().min(0),
  wageringRequirement: z.number().min(0),
  minDeposit: z.number().min(0),
  targetSegment: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  terms: z.string().min(1),
});

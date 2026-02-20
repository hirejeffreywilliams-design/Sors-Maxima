import { randomBytes } from "crypto";

export interface SegmentRule {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in" | "between";
  value: string | number | string[];
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  type: "behavioral" | "demographic" | "value" | "lifecycle" | "custom";
  rules: SegmentRule[];
  estimatedSize: number;
  actualSize: number;
  isActive: boolean;
  dynamicOffer: DynamicOffer | null;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicOffer {
  id: string;
  title: string;
  description: string;
  type: "discount" | "free_bet" | "boost" | "cashback" | "tier_upgrade";
  value: number;
  expiresIn: string;
  conditions: string;
}

export interface PersonalizationRule {
  id: string;
  name: string;
  trigger: string;
  segmentId: string;
  action: string;
  priority: number;
  isActive: boolean;
  impressions: number;
  conversions: number;
  revenue: number;
}

const segments = new Map<string, UserSegment>();
const rules = new Map<string, PersonalizationRule>();

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function seed() {
  const segmentData: UserSegment[] = [
    {
      id: genId("seg"), name: "High-Value Whales", description: "Users with lifetime spend > $1000 and weekly activity",
      type: "value",
      rules: [
        { field: "lifetime_spend", operator: "greater_than", value: 1000 },
        { field: "bets_last_7d", operator: "greater_than", value: 5 },
      ],
      estimatedSize: 420, actualSize: 385, isActive: true,
      dynamicOffer: { id: genId("off"), title: "VIP Cashback Boost", description: "Exclusive 10% cashback on all bets this weekend", type: "cashback", value: 10, expiresIn: "48h", conditions: "Min bet $25" },
      createdAt: "2026-01-10", updatedAt: "2026-02-20",
    },
    {
      id: genId("seg"), name: "At-Risk Churners", description: "Active users whose activity dropped 50%+ in the last 2 weeks",
      type: "behavioral",
      rules: [
        { field: "activity_change_14d", operator: "less_than", value: -50 },
        { field: "subscription_status", operator: "equals", value: "active" },
      ],
      estimatedSize: 680, actualSize: 623, isActive: true,
      dynamicOffer: { id: genId("off"), title: "We Miss You Bonus", description: "Get a $20 free bet on your next parlay", type: "free_bet", value: 20, expiresIn: "7d", conditions: "Min 3-leg parlay" },
      createdAt: "2026-01-15", updatedAt: "2026-02-19",
    },
    {
      id: genId("seg"), name: "Trial Users Day 1-3", description: "Users in first 3 days of trial - highest conversion window",
      type: "lifecycle",
      rules: [
        { field: "trial_day", operator: "between", value: [1, 3] as any },
        { field: "subscription_tier", operator: "equals", value: "free" },
      ],
      estimatedSize: 1200, actualSize: 1085, isActive: true,
      dynamicOffer: { id: genId("off"), title: "Early Bird Discount", description: "Upgrade in your first 3 days and save 40%", type: "discount", value: 40, expiresIn: "72h", conditions: "First-time subscribers only" },
      createdAt: "2026-01-05", updatedAt: "2026-02-20",
    },
    {
      id: genId("seg"), name: "Parlay Power Users", description: "Users who build 5+ parlays per week with 3+ legs",
      type: "behavioral",
      rules: [
        { field: "parlays_per_week", operator: "greater_than", value: 5 },
        { field: "avg_legs_per_parlay", operator: "greater_than", value: 3 },
      ],
      estimatedSize: 890, actualSize: 812, isActive: true,
      dynamicOffer: { id: genId("off"), title: "Parlay Boost", description: "25% profit boost on your next 5+ leg parlay", type: "boost", value: 25, expiresIn: "24h", conditions: "5+ leg parlays only" },
      createdAt: "2026-01-20", updatedAt: "2026-02-18",
    },
    {
      id: genId("seg"), name: "NFL Enthusiasts", description: "Users who primarily bet on NFL games (70%+ of bets)",
      type: "behavioral",
      rules: [
        { field: "sport_preference", operator: "equals", value: "NFL" },
        { field: "nfl_bet_percentage", operator: "greater_than", value: 70 },
      ],
      estimatedSize: 2100, actualSize: 1945, isActive: true,
      dynamicOffer: null,
      createdAt: "2026-01-12", updatedAt: "2026-02-17",
    },
    {
      id: genId("seg"), name: "Weekend Warriors", description: "Users who are primarily active Fri-Sun",
      type: "behavioral",
      rules: [
        { field: "weekend_activity_pct", operator: "greater_than", value: 75 },
        { field: "total_sessions_30d", operator: "greater_than", value: 8 },
      ],
      estimatedSize: 1500, actualSize: 1382, isActive: true,
      dynamicOffer: { id: genId("off"), title: "Weekend Special", description: "Double your free bet credits this Saturday", type: "free_bet", value: 50, expiresIn: "weekend", conditions: "Active on Saturday" },
      createdAt: "2026-01-25", updatedAt: "2026-02-20",
    },
    {
      id: genId("seg"), name: "New Depositors", description: "Users who made their first deposit in the last 7 days",
      type: "lifecycle",
      rules: [
        { field: "first_deposit_age", operator: "less_than", value: 7 },
        { field: "has_deposited", operator: "equals", value: "true" },
      ],
      estimatedSize: 340, actualSize: 312, isActive: true,
      dynamicOffer: { id: genId("off"), title: "First Bet Insurance", description: "Your first bet is on us up to $50 if it loses", type: "cashback", value: 50, expiresIn: "7d", conditions: "First bet only" },
      createdAt: "2026-02-01", updatedAt: "2026-02-20",
    },
    {
      id: genId("seg"), name: "Price Sensitive Users", description: "Users who only upgrade during promotions or discounts",
      type: "value",
      rules: [
        { field: "upgraded_during_promo", operator: "equals", value: "true" },
        { field: "viewed_pricing_page", operator: "greater_than", value: 5 },
      ],
      estimatedSize: 560, actualSize: 498, isActive: false,
      dynamicOffer: null,
      createdAt: "2026-02-05", updatedAt: "2026-02-15",
    },
  ];

  const ruleData: PersonalizationRule[] = [
    { id: genId("pr"), name: "Show VIP badge for whales", trigger: "page.load", segmentId: segmentData[0].id, action: "display_vip_badge", priority: 1, isActive: true, impressions: 12400, conversions: 0, revenue: 0 },
    { id: genId("pr"), name: "Churn prevention popup", trigger: "session.start", segmentId: segmentData[1].id, action: "show_retention_offer", priority: 2, isActive: true, impressions: 3200, conversions: 480, revenue: 9600 },
    { id: genId("pr"), name: "Trial upgrade banner", trigger: "page.load", segmentId: segmentData[2].id, action: "show_upgrade_banner", priority: 3, isActive: true, impressions: 8900, conversions: 1068, revenue: 53400 },
    { id: genId("pr"), name: "Parlay boost notification", trigger: "parlay.created", segmentId: segmentData[3].id, action: "offer_parlay_boost", priority: 4, isActive: true, impressions: 4500, conversions: 675, revenue: 33750 },
    { id: genId("pr"), name: "NFL content highlight", trigger: "dashboard.load", segmentId: segmentData[4].id, action: "personalize_sport_content", priority: 5, isActive: true, impressions: 15200, conversions: 2280, revenue: 0 },
    { id: genId("pr"), name: "Weekend countdown timer", trigger: "friday.evening", segmentId: segmentData[5].id, action: "show_weekend_countdown", priority: 6, isActive: true, impressions: 6800, conversions: 1020, revenue: 20400 },
  ];

  segmentData.forEach((s) => segments.set(s.id, s));
  ruleData.forEach((r) => rules.set(r.id, r));
}

seed();

export function getAllSegments(filters?: { type?: string; active?: boolean }): UserSegment[] {
  let result = Array.from(segments.values());
  if (filters?.type) result = result.filter((s) => s.type === filters.type);
  if (filters?.active !== undefined) result = result.filter((s) => s.isActive === filters.active);
  return result.sort((a, b) => b.actualSize - a.actualSize);
}

export function getSegment(id: string): UserSegment | undefined {
  return segments.get(id);
}

export function createSegment(data: Omit<UserSegment, "id" | "createdAt" | "updatedAt">): UserSegment {
  const seg: UserSegment = { ...data, id: genId("seg"), createdAt: new Date().toISOString().split("T")[0], updatedAt: new Date().toISOString().split("T")[0] };
  segments.set(seg.id, seg);
  return seg;
}

export function updateSegment(id: string, updates: Partial<UserSegment>): UserSegment | null {
  const seg = segments.get(id);
  if (!seg) return null;
  const updated = { ...seg, ...updates, id: seg.id, createdAt: seg.createdAt, updatedAt: new Date().toISOString().split("T")[0] };
  segments.set(id, updated);
  return updated;
}

export function getAllPersonalizationRules(): PersonalizationRule[] {
  return Array.from(rules.values()).sort((a, b) => a.priority - b.priority);
}

export function getSegmentationStats() {
  const allSegs = Array.from(segments.values());
  const allRules = Array.from(rules.values());
  const activeSegs = allSegs.filter((s) => s.isActive);
  return {
    totalSegments: allSegs.length,
    activeSegments: activeSegs.length,
    totalUsers: activeSegs.reduce((s, seg) => s + seg.actualSize, 0),
    totalRules: allRules.length,
    activeRules: allRules.filter((r) => r.isActive).length,
    totalImpressions: allRules.reduce((s, r) => s + r.impressions, 0),
    totalConversions: allRules.reduce((s, r) => s + r.conversions, 0),
    totalRevenue: allRules.reduce((s, r) => s + r.revenue, 0),
    offersActive: activeSegs.filter((s) => s.dynamicOffer).length,
    byType: {
      behavioral: allSegs.filter((s) => s.type === "behavioral").length,
      demographic: allSegs.filter((s) => s.type === "demographic").length,
      value: allSegs.filter((s) => s.type === "value").length,
      lifecycle: allSegs.filter((s) => s.type === "lifecycle").length,
      custom: allSegs.filter((s) => s.type === "custom").length,
    },
  };
}

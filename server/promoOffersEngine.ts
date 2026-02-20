import { randomBytes } from "crypto";

export interface PromoOffer {
  id: string;
  name: string;
  description: string;
  type: "welcome_bonus" | "deposit_match" | "free_bet" | "odds_boost" | "cashback" | "loyalty_reward" | "time_limited" | "referral_bonus";
  status: "active" | "scheduled" | "expired" | "paused" | "draft";
  value: number;
  valueType: "percentage" | "fixed" | "multiplier";
  maxPayout: number;
  wageringRequirement: number;
  minDeposit: number;
  targetSegment: string;
  startDate: string;
  endDate: string;
  totalClaimed: number;
  totalRedeemed: number;
  totalCost: number;
  totalRevenue: number;
  roi: number;
  createdAt: string;
  terms: string;
}

const offers = new Map<string, PromoOffer>();

function genId(): string {
  return `promo_${randomBytes(8).toString("hex")}`;
}

function seed() {
  const data: PromoOffer[] = [
    {
      id: genId(), name: "Welcome $100 Free Bet", description: "New user welcome bonus - $100 in free bets on first deposit",
      type: "welcome_bonus", status: "active", value: 100, valueType: "fixed", maxPayout: 500, wageringRequirement: 3, minDeposit: 25,
      targetSegment: "New registrations", startDate: "2026-01-01", endDate: "2026-12-31",
      totalClaimed: 2840, totalRedeemed: 1988, totalCost: 198800, totalRevenue: 596400, roi: 200,
      createdAt: "2025-12-28", terms: "New users only. Min deposit $25. Free bet must be used within 7 days. 3x wagering requirement on winnings.",
    },
    {
      id: genId(), name: "100% First Deposit Match", description: "Match first deposit up to $250",
      type: "deposit_match", status: "active", value: 100, valueType: "percentage", maxPayout: 250, wageringRequirement: 5, minDeposit: 10,
      targetSegment: "First-time depositors", startDate: "2026-01-15", endDate: "2026-03-31",
      totalClaimed: 1520, totalRedeemed: 912, totalCost: 228000, totalRevenue: 456000, roi: 100,
      createdAt: "2026-01-12", terms: "First deposit only. Max match $250. 5x wagering on bonus amount. 30-day expiry.",
    },
    {
      id: genId(), name: "Weekend Parlay Boost", description: "25% profit boost on all parlays placed Fri-Sun",
      type: "odds_boost", status: "active", value: 25, valueType: "percentage", maxPayout: 1000, wageringRequirement: 1, minDeposit: 0,
      targetSegment: "Active subscribers (Sharp+)", startDate: "2026-02-01", endDate: "2026-04-30",
      totalClaimed: 3680, totalRedeemed: 3312, totalCost: 82800, totalRevenue: 331200, roi: 300,
      createdAt: "2026-01-28", terms: "Applies to parlays with 3+ legs placed Friday 6pm to Sunday 11:59pm. Max boost payout $1000.",
    },
    {
      id: genId(), name: "Losing Streak Cashback", description: "10% cashback on net losses over $100 in a week",
      type: "cashback", status: "active", value: 10, valueType: "percentage", maxPayout: 200, wageringRequirement: 2, minDeposit: 0,
      targetSegment: "All active users", startDate: "2026-02-01", endDate: "2026-06-30",
      totalClaimed: 890, totalRedeemed: 712, totalCost: 71200, totalRevenue: 142400, roi: 100,
      createdAt: "2026-01-30", terms: "Calculated weekly (Mon-Sun). Min net loss $100. Max cashback $200. 2x wagering on cashback amount.",
    },
    {
      id: genId(), name: "Super Bowl Special: 3x Odds Boost", description: "Triple odds on your first Super Bowl bet",
      type: "time_limited", status: "expired", value: 3, valueType: "multiplier", maxPayout: 5000, wageringRequirement: 1, minDeposit: 0,
      targetSegment: "All users", startDate: "2026-02-08", endDate: "2026-02-09",
      totalClaimed: 8420, totalRedeemed: 7578, totalCost: 378900, totalRevenue: 947250, roi: 150,
      createdAt: "2026-02-01", terms: "First Super Bowl bet only. Max bet $100. Boost applied automatically.",
    },
    {
      id: genId(), name: "Refer-a-Friend $50 Bonus", description: "Both referrer and referee get $25 in free bets",
      type: "referral_bonus", status: "active", value: 50, valueType: "fixed", maxPayout: 250, wageringRequirement: 2, minDeposit: 25,
      targetSegment: "All users", startDate: "2026-01-01", endDate: "2026-12-31",
      totalClaimed: 1240, totalRedeemed: 868, totalCost: 43400, totalRevenue: 173600, roi: 300,
      createdAt: "2025-12-20", terms: "Referee must deposit min $25. Both parties get $25 free bet. Max 10 referrals per user. 2x wagering.",
    },
    {
      id: genId(), name: "March Madness Bracket Challenge", description: "Free entry to bracket challenge with $10K prize pool",
      type: "time_limited", status: "scheduled", value: 0, valueType: "fixed", maxPayout: 5000, wageringRequirement: 0, minDeposit: 0,
      targetSegment: "All subscribers", startDate: "2026-03-15", endDate: "2026-04-07",
      totalClaimed: 0, totalRedeemed: 0, totalCost: 0, totalRevenue: 0, roi: 0,
      createdAt: "2026-02-15", terms: "Free entry for all subscribers. Top 10 win prizes. Must have active subscription.",
    },
    {
      id: genId(), name: "Loyalty Diamond Tier: Monthly Bonus", description: "Recurring monthly $200 free bet for Diamond loyalty members",
      type: "loyalty_reward", status: "active", value: 200, valueType: "fixed", maxPayout: 1000, wageringRequirement: 3, minDeposit: 0,
      targetSegment: "Diamond loyalty tier", startDate: "2026-01-01", endDate: "2026-12-31",
      totalClaimed: 145, totalRedeemed: 130, totalCost: 26000, totalRevenue: 130000, roi: 400,
      createdAt: "2025-12-15", terms: "Diamond tier members only. Credited first of each month. 3x wagering. 30-day expiry.",
    },
  ];
  data.forEach((o) => offers.set(o.id, o));
}

seed();

export function getAllOffers(filters?: { type?: string; status?: string }): PromoOffer[] {
  let result = Array.from(offers.values());
  if (filters?.type) result = result.filter((o) => o.type === filters.type);
  if (filters?.status) result = result.filter((o) => o.status === filters.status);
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOffer(id: string): PromoOffer | undefined {
  return offers.get(id);
}

export function createOffer(data: Omit<PromoOffer, "id" | "createdAt" | "totalClaimed" | "totalRedeemed" | "totalCost" | "totalRevenue" | "roi">): PromoOffer {
  const offer: PromoOffer = { ...data, id: genId(), createdAt: new Date().toISOString().split("T")[0], totalClaimed: 0, totalRedeemed: 0, totalCost: 0, totalRevenue: 0, roi: 0 };
  offers.set(offer.id, offer);
  return offer;
}

export function updateOffer(id: string, updates: Partial<PromoOffer>): PromoOffer | null {
  const offer = offers.get(id);
  if (!offer) return null;
  const updated = { ...offer, ...updates, id: offer.id, createdAt: offer.createdAt };
  offers.set(id, updated);
  return updated;
}

export function deleteOffer(id: string): boolean {
  return offers.delete(id);
}

export function getPromoStats() {
  const all = Array.from(offers.values());
  const active = all.filter((o) => o.status === "active");
  return {
    total: all.length,
    active: active.length,
    scheduled: all.filter((o) => o.status === "scheduled").length,
    expired: all.filter((o) => o.status === "expired").length,
    totalClaimed: all.reduce((s, o) => s + o.totalClaimed, 0),
    totalRedeemed: all.reduce((s, o) => s + o.totalRedeemed, 0),
    totalCost: all.reduce((s, o) => s + o.totalCost, 0),
    totalRevenue: all.reduce((s, o) => s + o.totalRevenue, 0),
    avgRoi: active.reduce((s, o) => s + o.roi, 0) / Math.max(active.length, 1),
    redemptionRate: all.reduce((s, o) => s + o.totalClaimed, 0) > 0 ? Math.round(all.reduce((s, o) => s + o.totalRedeemed, 0) / all.reduce((s, o) => s + o.totalClaimed, 0) * 100) : 0,
    byType: {
      welcome_bonus: all.filter((o) => o.type === "welcome_bonus").length,
      deposit_match: all.filter((o) => o.type === "deposit_match").length,
      free_bet: all.filter((o) => o.type === "free_bet").length,
      odds_boost: all.filter((o) => o.type === "odds_boost").length,
      cashback: all.filter((o) => o.type === "cashback").length,
      loyalty_reward: all.filter((o) => o.type === "loyalty_reward").length,
      time_limited: all.filter((o) => o.type === "time_limited").length,
      referral_bonus: all.filter((o) => o.type === "referral_bonus").length,
    },
  };
}

import { randomBytes } from "crypto";

export interface CampaignTrigger {
  type: "event" | "time" | "segment" | "behavioral";
  condition: string;
  delay?: string;
}

export interface CampaignStep {
  id: string;
  channel: "email" | "push" | "in_app" | "sms";
  subject: string;
  body: string;
  delay: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface LifecycleCampaign {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft" | "archived";
  category: "onboarding" | "activation" | "retention" | "reactivation" | "monetization" | "win_loss";
  trigger: CampaignTrigger;
  steps: CampaignStep[];
  targetSegment: string;
  enrolledUsers: number;
  completedUsers: number;
  conversionRate: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

const campaigns = new Map<string, LifecycleCampaign>();

function genId(): string {
  return `lc_${randomBytes(8).toString("hex")}`;
}

function seed() {
  const data: LifecycleCampaign[] = [
    {
      id: genId(), name: "Welcome Onboarding Flow", description: "5-step welcome series for new signups guiding them from registration to first bet",
      status: "active", category: "onboarding",
      trigger: { type: "event", condition: "user.registered" },
      steps: [
        { id: "s1", channel: "email", subject: "Welcome to Sors Maxima - Your Edge Starts Now", body: "Hi {{name}}, welcome! Here's how to get started with quantum-powered predictions...", delay: "immediate", sent: 8420, opened: 5894, clicked: 3536, converted: 2122 },
        { id: "s2", channel: "push", subject: "Your free analysis is ready!", body: "We've analyzed today's top games. Tap to see your personalized picks.", delay: "24h", sent: 7200, opened: 4320, clicked: 2592, converted: 1555 },
        { id: "s3", channel: "email", subject: "Pro tip: How top bettors use Sors Maxima", body: "Discover the 3 features that power users swear by...", delay: "3d", sent: 6800, opened: 3400, clicked: 1700, converted: 850 },
        { id: "s4", channel: "in_app", subject: "Unlock Premium Features", body: "You've been using Sors Maxima for 5 days. Ready to go pro?", delay: "5d", sent: 5500, opened: 5500, clicked: 2200, converted: 660 },
        { id: "s5", channel: "email", subject: "Last chance: Your trial ends in 2 days", body: "Don't lose access to AI predictions. Upgrade now and save 20%.", delay: "5d", sent: 4800, opened: 2880, clicked: 1728, converted: 518 },
      ],
      targetSegment: "All new registrations", enrolledUsers: 8420, completedUsers: 4800, conversionRate: 25.2, revenue: 143200, createdAt: "2026-01-01", updatedAt: "2026-02-20",
    },
    {
      id: genId(), name: "Win Celebration & Upsell", description: "Triggered after a user wins a parlay, celebrating and suggesting next bet",
      status: "active", category: "win_loss",
      trigger: { type: "behavioral", condition: "parlay.won", delay: "1h" },
      steps: [
        { id: "s1", channel: "push", subject: "Congrats! You hit your parlay! 🎉", body: "You won ${{amount}}! Your Power Score was {{score}}. See what's hot next.", delay: "1h", sent: 3200, opened: 2560, clicked: 1792, converted: 1075 },
        { id: "s2", channel: "email", subject: "Your winning streak analysis", body: "You're on a {{streak}}-win streak. Here's what our AI predicts next...", delay: "4h", sent: 2800, opened: 1680, clicked: 840, converted: 420 },
      ],
      targetSegment: "Users with recent parlay wins", enrolledUsers: 3200, completedUsers: 2800, conversionRate: 33.6, revenue: 89400, createdAt: "2026-01-15", updatedAt: "2026-02-18",
    },
    {
      id: genId(), name: "Loss Recovery & Engagement", description: "Re-engage users after losing streaks with educational content and safe bet suggestions",
      status: "active", category: "win_loss",
      trigger: { type: "behavioral", condition: "consecutive_losses >= 3" },
      steps: [
        { id: "s1", channel: "email", subject: "Smart betting strategies for tough stretches", body: "Every bettor faces losing streaks. Here are 3 strategies to protect your bankroll...", delay: "2h", sent: 1800, opened: 1080, clicked: 540, converted: 270 },
        { id: "s2", channel: "push", subject: "High-confidence picks for today", body: "We found {{count}} bets with 85%+ confidence. Conservative picks to rebuild.", delay: "24h", sent: 1500, opened: 900, clicked: 450, converted: 225 },
        { id: "s3", channel: "in_app", subject: "Bankroll protection tips", body: "Enable our responsible gaming tools to set daily limits and protect your balance.", delay: "48h", sent: 1200, opened: 1200, clicked: 360, converted: 108 },
      ],
      targetSegment: "Users with 3+ consecutive losses", enrolledUsers: 1800, completedUsers: 1200, conversionRate: 15.0, revenue: 28500, createdAt: "2026-01-20", updatedAt: "2026-02-19",
    },
    {
      id: genId(), name: "Dormant User Reactivation", description: "Win back users who haven't placed a bet in 14+ days",
      status: "active", category: "reactivation",
      trigger: { type: "time", condition: "last_bet > 14 days" },
      steps: [
        { id: "s1", channel: "email", subject: "We miss you! Here's what you've been missing", body: "{{name}}, a lot has changed since your last visit. See {{count}} new features...", delay: "14d", sent: 4200, opened: 1680, clicked: 672, converted: 269 },
        { id: "s2", channel: "push", subject: "Your favorite team plays tonight!", body: "{{team}} is playing at {{time}}. We've got exclusive insights.", delay: "17d", sent: 3500, opened: 1400, clicked: 560, converted: 224 },
        { id: "s3", channel: "email", subject: "Special offer: 50% off your next month", body: "Come back and save 50% on any plan. Offer expires in 48 hours.", delay: "21d", sent: 3000, opened: 1500, clicked: 900, converted: 360 },
        { id: "s4", channel: "push", subject: "Last chance: Your exclusive offer expires today", body: "Your 50% discount expires at midnight. Don't miss out.", delay: "23d", sent: 2500, opened: 1250, clicked: 625, converted: 188 },
      ],
      targetSegment: "Users inactive 14+ days", enrolledUsers: 4200, completedUsers: 2500, conversionRate: 8.6, revenue: 62400, createdAt: "2026-01-10", updatedAt: "2026-02-20",
    },
    {
      id: genId(), name: "Trial-to-Paid Conversion", description: "Targeted campaign to convert trial users before expiry with urgency and value messaging",
      status: "active", category: "monetization",
      trigger: { type: "event", condition: "trial.started" },
      steps: [
        { id: "s1", channel: "email", subject: "Day 3: You've unlocked {{count}} winning picks", body: "In just 3 days, our AI engine found {{count}} high-value opportunities for you. Imagine a full month...", delay: "3d", sent: 5600, opened: 3360, clicked: 1680, converted: 672 },
        { id: "s2", channel: "in_app", subject: "Trial milestone: Your accuracy report", body: "Your trial picks so far: {{wins}}/{{total}} won ({{rate}}%). Upgrade to keep this edge.", delay: "5d", sent: 4800, opened: 4800, clicked: 1920, converted: 576 },
        { id: "s3", channel: "push", subject: "⚡ Trial ending in 48 hours", body: "Your quantum-powered trial ends soon. Lock in your rate now.", delay: "5d", sent: 4200, opened: 2940, clicked: 1470, converted: 441 },
        { id: "s4", channel: "email", subject: "Your trial ends tomorrow - exclusive offer inside", body: "Last chance to upgrade at launch pricing. Save 30% with annual plan.", delay: "6d", sent: 3800, opened: 2280, clicked: 1368, converted: 547 },
      ],
      targetSegment: "Active trial users", enrolledUsers: 5600, completedUsers: 3800, conversionRate: 12.0, revenue: 186400, createdAt: "2026-01-05", updatedAt: "2026-02-20",
    },
    {
      id: genId(), name: "In-Play Bet Nudge", description: "Real-time nudges during live games when betting opportunities arise",
      status: "paused", category: "retention",
      trigger: { type: "behavioral", condition: "user.watching_game && momentum_shift" },
      steps: [
        { id: "s1", channel: "push", subject: "Live opportunity: {{team}} momentum shift!", body: "{{team}} just scored! Our model sees a live betting opportunity. Tap to view.", delay: "immediate", sent: 2400, opened: 1920, clicked: 1344, converted: 806 },
      ],
      targetSegment: "Users with Live Center open", enrolledUsers: 2400, completedUsers: 2400, conversionRate: 33.6, revenue: 48360, createdAt: "2026-02-01", updatedAt: "2026-02-15",
    },
    {
      id: genId(), name: "Weekly Digest & Picks", description: "Weekly summary of performance with curated picks for the week ahead",
      status: "draft", category: "retention",
      trigger: { type: "time", condition: "every Monday 9am" },
      steps: [
        { id: "s1", channel: "email", subject: "Your Week {{week}} Performance + Top Picks", body: "Last week: {{wins}}/{{total}} picks hit. This week's top opportunities...", delay: "immediate", sent: 0, opened: 0, clicked: 0, converted: 0 },
      ],
      targetSegment: "All active subscribers", enrolledUsers: 0, completedUsers: 0, conversionRate: 0, revenue: 0, createdAt: "2026-02-18", updatedAt: "2026-02-18",
    },
  ];
  data.forEach((c) => campaigns.set(c.id, c));
}

seed();

export function getAllCampaigns(filters?: { status?: string; category?: string }): LifecycleCampaign[] {
  let result = Array.from(campaigns.values());
  if (filters?.status) result = result.filter((c) => c.status === filters.status);
  if (filters?.category) result = result.filter((c) => c.category === filters.category);
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCampaign(id: string): LifecycleCampaign | undefined {
  return campaigns.get(id);
}

export function createCampaign(data: Omit<LifecycleCampaign, "id" | "createdAt" | "updatedAt">): LifecycleCampaign {
  const campaign: LifecycleCampaign = {
    ...data,
    id: genId(),
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
  };
  campaigns.set(campaign.id, campaign);
  return campaign;
}

export function updateCampaign(id: string, updates: Partial<LifecycleCampaign>): LifecycleCampaign | null {
  const campaign = campaigns.get(id);
  if (!campaign) return null;
  const updated = { ...campaign, ...updates, id: campaign.id, createdAt: campaign.createdAt, updatedAt: new Date().toISOString().split("T")[0] };
  campaigns.set(id, updated);
  return updated;
}

export function deleteCampaign(id: string): boolean {
  return campaigns.delete(id);
}

export function getCampaignStats() {
  const all = Array.from(campaigns.values());
  const active = all.filter((c) => c.status === "active");
  return {
    total: all.length,
    active: active.length,
    paused: all.filter((c) => c.status === "paused").length,
    draft: all.filter((c) => c.status === "draft").length,
    totalEnrolled: active.reduce((s, c) => s + c.enrolledUsers, 0),
    totalRevenue: all.reduce((s, c) => s + c.revenue, 0),
    avgConversionRate: active.reduce((s, c) => s + c.conversionRate, 0) / Math.max(active.length, 1),
    totalSent: all.reduce((s, c) => s + c.steps.reduce((ss, st) => ss + st.sent, 0), 0),
    totalOpened: all.reduce((s, c) => s + c.steps.reduce((ss, st) => ss + st.opened, 0), 0),
    totalClicked: all.reduce((s, c) => s + c.steps.reduce((ss, st) => ss + st.clicked, 0), 0),
    byCategory: {
      onboarding: all.filter((c) => c.category === "onboarding").length,
      activation: all.filter((c) => c.category === "activation").length,
      retention: all.filter((c) => c.category === "retention").length,
      reactivation: all.filter((c) => c.category === "reactivation").length,
      monetization: all.filter((c) => c.category === "monetization").length,
      win_loss: all.filter((c) => c.category === "win_loss").length,
    },
    topPerformer: active.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.name || "None",
  };
}

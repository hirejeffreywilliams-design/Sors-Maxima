import { randomBytes } from "crypto";

export interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  status: "draft" | "running" | "paused" | "completed";
  category: "acquisition" | "onboarding" | "activation" | "retention" | "monetization" | "referral";
  variants: ABVariant[];
  targetAudience: string;
  successMetric: string;
  secondaryMetrics: string[];
  trafficSplit: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  results: ABTestResults | null;
  notes: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficPercent: number;
  impressions: number;
  conversions: number;
  revenue: number;
}

export interface ABTestResults {
  winner: string | null;
  confidence: number;
  uplift: number;
  sampleSize: number;
  significanceReached: boolean;
  calculatedAt: string;
}

const tests = new Map<string, ABTest>();

function generateId(): string {
  return `abt_${randomBytes(8).toString("hex")}`;
}

function seedTests() {
  const seeds: ABTest[] = [
    {
      id: generateId(),
      name: "Welcome Bonus: $50 vs $100 Free Bet",
      hypothesis: "A higher welcome bonus ($100) will increase first-deposit conversion by 25% without significantly increasing bonus abuse",
      status: "running",
      category: "onboarding",
      variants: [
        { id: "v1", name: "Control ($50 Free Bet)", description: "Current $50 free bet welcome offer", isControl: true, trafficPercent: 50, impressions: 4280, conversions: 642, revenue: 32100 },
        { id: "v2", name: "Treatment ($100 Free Bet)", description: "New $100 free bet welcome offer with 3x wagering requirement", isControl: false, trafficPercent: 50, impressions: 4310, conversions: 819, revenue: 40950 },
      ],
      targetAudience: "New registrations, US market",
      successMetric: "First deposit conversion rate",
      secondaryMetrics: ["Average deposit amount", "7-day retention", "Bonus abuse rate"],
      trafficSplit: 50,
      startDate: "2026-02-01",
      endDate: null,
      createdAt: "2026-01-28",
      results: { winner: "v2", confidence: 94.2, uplift: 27.6, sampleSize: 8590, significanceReached: false, calculatedAt: "2026-02-20" },
      notes: "Approaching 95% confidence. Monitor bonus abuse rate closely.",
    },
    {
      id: generateId(),
      name: "Signup Flow: 3-Step vs 5-Step",
      hypothesis: "Reducing signup steps from 5 to 3 will increase registration completion rate by 15%",
      status: "completed",
      category: "onboarding",
      variants: [
        { id: "v1", name: "Control (5-step)", description: "Current 5-step signup: email, password, profile, verification, preferences", isControl: true, trafficPercent: 50, impressions: 12400, conversions: 6820, revenue: 0 },
        { id: "v2", name: "Treatment (3-step)", description: "Streamlined: email+password, verification, preferences (profile deferred)", isControl: false, trafficPercent: 50, impressions: 12350, conversions: 8645, revenue: 0 },
      ],
      targetAudience: "All new visitors",
      successMetric: "Registration completion rate",
      secondaryMetrics: ["Time to complete signup", "Profile completion rate at 7 days"],
      trafficSplit: 50,
      startDate: "2026-01-05",
      endDate: "2026-02-05",
      createdAt: "2026-01-03",
      results: { winner: "v2", confidence: 99.1, uplift: 22.4, sampleSize: 24750, significanceReached: true, calculatedAt: "2026-02-05" },
      notes: "Strong winner. 3-step signup rolled out to 100%.",
    },
    {
      id: generateId(),
      name: "Push Notification Timing: Morning vs Pre-Game",
      hypothesis: "Sending push notifications 30 min before game time instead of morning will increase bet placement rate by 20%",
      status: "running",
      category: "retention",
      variants: [
        { id: "v1", name: "Morning (9am local)", description: "Daily digest at 9am local time", isControl: true, trafficPercent: 50, impressions: 8920, conversions: 1070, revenue: 53500 },
        { id: "v2", name: "Pre-Game (30min)", description: "Triggered 30 min before user's favorite team plays", isControl: false, trafficPercent: 50, impressions: 8880, conversions: 1598, revenue: 79900 },
      ],
      targetAudience: "Active users with notification permission",
      successMetric: "Bet placement within 2 hours of notification",
      secondaryMetrics: ["Notification open rate", "Avg bet size", "Notification opt-out rate"],
      trafficSplit: 50,
      startDate: "2026-02-10",
      endDate: null,
      createdAt: "2026-02-08",
      results: { winner: "v2", confidence: 98.7, uplift: 49.3, sampleSize: 17800, significanceReached: true, calculatedAt: "2026-02-20" },
      notes: "Strong signal. Pre-game timing significantly outperforms morning digest.",
    },
    {
      id: generateId(),
      name: "Referral Reward: Cash vs Free Bet Credits",
      hypothesis: "Offering $25 free bet credits instead of $10 cash will increase referral completion rate by 30% while maintaining better unit economics",
      status: "draft",
      category: "referral",
      variants: [
        { id: "v1", name: "Control ($10 cash)", description: "Current $10 cash reward for successful referral", isControl: true, trafficPercent: 50, impressions: 0, conversions: 0, revenue: 0 },
        { id: "v2", name: "Treatment ($25 free bet)", description: "$25 in free bet credits with 2x wagering requirement", isControl: false, trafficPercent: 50, impressions: 0, conversions: 0, revenue: 0 },
      ],
      targetAudience: "All users eligible for referral program",
      successMetric: "Referral completion rate (referred user makes first deposit)",
      secondaryMetrics: ["Referral share rate", "Cost per acquired user", "Referred user 30-day LTV"],
      trafficSplit: 50,
      startDate: null,
      endDate: null,
      createdAt: "2026-02-18",
      results: null,
      notes: "Pending approval. Need to coordinate with finance team on free bet credit accounting.",
    },
    {
      id: generateId(),
      name: "Parlay Builder: Auto-Suggest vs Manual Only",
      hypothesis: "Adding AI-powered leg suggestions in the parlay builder will increase average parlay size by 0.5 legs and boost ticket submission rate by 15%",
      status: "running",
      category: "activation",
      variants: [
        { id: "v1", name: "Manual Only", description: "Current parlay builder without suggestions", isControl: true, trafficPercent: 50, impressions: 3200, conversions: 1280, revenue: 64000 },
        { id: "v2", name: "AI Auto-Suggest", description: "Parlay builder with contextual AI suggestions after each leg", isControl: false, trafficPercent: 50, impressions: 3180, conversions: 1590, revenue: 87450 },
      ],
      targetAudience: "Users who open parlay builder",
      successMetric: "Ticket submission rate",
      secondaryMetrics: ["Avg legs per parlay", "Avg ticket value", "Win rate"],
      trafficSplit: 50,
      startDate: "2026-02-12",
      endDate: null,
      createdAt: "2026-02-10",
      results: { winner: "v2", confidence: 97.8, uplift: 24.2, sampleSize: 6380, significanceReached: true, calculatedAt: "2026-02-20" },
      notes: "AI suggestions driving higher engagement. Consider adding more suggestion types.",
    },
    {
      id: generateId(),
      name: "Landing Page: Social Proof vs Feature Focus",
      hypothesis: "Leading with social proof (win stories, user count) instead of feature lists will increase signup rate by 20%",
      status: "paused",
      category: "acquisition",
      variants: [
        { id: "v1", name: "Feature-Focused", description: "Current landing with feature highlights and screenshots", isControl: true, trafficPercent: 50, impressions: 6500, conversions: 455, revenue: 0 },
        { id: "v2", name: "Social Proof", description: "Landing with user testimonials, win stories, live user count", isControl: false, trafficPercent: 50, impressions: 6480, conversions: 518, revenue: 0 },
      ],
      targetAudience: "Organic search visitors",
      successMetric: "Signup conversion rate",
      secondaryMetrics: ["Bounce rate", "Time on page", "Scroll depth"],
      trafficSplit: 50,
      startDate: "2026-02-05",
      endDate: null,
      createdAt: "2026-02-03",
      results: { winner: "v2", confidence: 88.5, uplift: 13.8, sampleSize: 12980, significanceReached: false, calculatedAt: "2026-02-15" },
      notes: "Paused due to landing page redesign. Will resume after new design is finalized.",
    },
  ];
  seeds.forEach((t) => tests.set(t.id, t));
}

seedTests();

export function getAllTests(filters?: { status?: string; category?: string }): ABTest[] {
  let result = Array.from(tests.values());
  if (filters?.status) result = result.filter((t) => t.status === filters.status);
  if (filters?.category) result = result.filter((t) => t.category === filters.category);
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTest(id: string): ABTest | undefined {
  return tests.get(id);
}

export function createTest(data: Omit<ABTest, "id" | "createdAt" | "results">): ABTest {
  const test: ABTest = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString().split("T")[0],
    results: null,
  };
  tests.set(test.id, test);
  return test;
}

export function updateTest(id: string, updates: Partial<ABTest>): ABTest | null {
  const test = tests.get(id);
  if (!test) return null;
  const updated = { ...test, ...updates, id: test.id, createdAt: test.createdAt };
  tests.set(id, updated);
  return updated;
}

export function deleteTest(id: string): boolean {
  return tests.delete(id);
}

export function getTestStats() {
  const all = Array.from(tests.values());
  return {
    total: all.length,
    running: all.filter((t) => t.status === "running").length,
    completed: all.filter((t) => t.status === "completed").length,
    draft: all.filter((t) => t.status === "draft").length,
    paused: all.filter((t) => t.status === "paused").length,
    avgConfidence: all.filter((t) => t.results).reduce((sum, t) => sum + (t.results?.confidence || 0), 0) / Math.max(all.filter((t) => t.results).length, 1),
    totalImpressions: all.reduce((sum, t) => sum + t.variants.reduce((vs, v) => vs + v.impressions, 0), 0),
    significantResults: all.filter((t) => t.results?.significanceReached).length,
    avgUplift: all.filter((t) => t.results?.significanceReached).reduce((sum, t) => sum + (t.results?.uplift || 0), 0) / Math.max(all.filter((t) => t.results?.significanceReached).length, 1),
    byCategory: {
      acquisition: all.filter((t) => t.category === "acquisition").length,
      onboarding: all.filter((t) => t.category === "onboarding").length,
      activation: all.filter((t) => t.category === "activation").length,
      retention: all.filter((t) => t.category === "retention").length,
      monetization: all.filter((t) => t.category === "monetization").length,
      referral: all.filter((t) => t.category === "referral").length,
    },
  };
}

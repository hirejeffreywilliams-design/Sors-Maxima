import { stripeService } from "./stripeService";

const TIER_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 49, yearly: 468 },
  elite: { monthly: 99, yearly: 948 },
  whale: { monthly: 249, yearly: 2388 },
};

const TIER_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Sharp",
  elite: "Edge",
  whale: "Max",
};

const COST_STRUCTURE = {
  infrastructure: 0.15,
  dataApis: 0.05,
  stripeFees: 0.029,
  stripeFixed: 0.30,
  marketing: 0.20,
  legal: 0.05,
};

const TAX_RATE = 0.35;

async function getSubscriberData() {
  const allSubs = await stripeService.getAllSubscriptions();
  const tierCounts: Record<string, number> = { free: 0, pro: 0, elite: 0, whale: 0 };
  let totalPaid = 0;

  for (const sub of allSubs) {
    const tier = sub.subscriptionTier || "free";
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    if (tier !== "free") totalPaid++;
  }

  const totalSubs = allSubs.length || Object.values(tierCounts).reduce((a, b) => a + b, 0);
  return { tierCounts, totalSubs, totalPaid };
}

function calculateMRR(tierCounts: Record<string, number>) {
  let mrr = 0;
  for (const [tier, count] of Object.entries(tierCounts)) {
    mrr += (TIER_PRICES[tier as keyof typeof TIER_PRICES]?.monthly || 0) * count;
  }
  return mrr;
}

function calculateCosts(grossRevenue: number, paidSubscribers: number) {
  const infrastructure = grossRevenue * COST_STRUCTURE.infrastructure;
  const dataApis = grossRevenue * COST_STRUCTURE.dataApis;
  const stripeFees = grossRevenue * COST_STRUCTURE.stripeFees + paidSubscribers * COST_STRUCTURE.stripeFixed;
  const marketing = grossRevenue * COST_STRUCTURE.marketing;
  const legal = grossRevenue * COST_STRUCTURE.legal;
  const totalCosts = infrastructure + dataApis + stripeFees + marketing + legal;
  const preTaxProfit = grossRevenue - totalCosts;
  const taxes = Math.max(0, preTaxProfit * TAX_RATE);
  const takeHome = preTaxProfit - taxes;

  return {
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    infrastructure: Math.round(infrastructure * 100) / 100,
    dataApis: Math.round(dataApis * 100) / 100,
    stripeFees: Math.round(stripeFees * 100) / 100,
    marketing: Math.round(marketing * 100) / 100,
    legal: Math.round(legal * 100) / 100,
    totalCosts: Math.round(totalCosts * 100) / 100,
    preTaxProfit: Math.round(preTaxProfit * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    takeHome: Math.round(takeHome * 100) / 100,
    costPercentage: grossRevenue > 0 ? Math.round((totalCosts / grossRevenue) * 1000) / 10 : 0,
    profitMargin: grossRevenue > 0 ? Math.round((takeHome / grossRevenue) * 1000) / 10 : 0,
  };
}

function calculateValuation(arr: number, monthlyGrowthRate: number) {
  const annualGrowthRate = Math.pow(1 + monthlyGrowthRate, 12) - 1;
  const annualGrowthPct = annualGrowthRate * 100;
  let revenueMultiple: number;
  let multipleReason: string;

  if (annualGrowthPct > 100) {
    revenueMultiple = 20;
    multipleReason = "Hyper-growth (>100% YoY) — premium SaaS multiple";
  } else if (annualGrowthPct > 50) {
    revenueMultiple = 12;
    multipleReason = "High growth (50-100% YoY) — strong SaaS multiple";
  } else if (annualGrowthPct > 20) {
    revenueMultiple = 8;
    multipleReason = "Moderate growth (20-50% YoY) — solid SaaS multiple";
  } else {
    revenueMultiple = 5;
    multipleReason = "Steady growth (<20% YoY) — standard SaaS multiple";
  }

  const estimatedValuation = Math.round(arr * revenueMultiple);

  return {
    arr: Math.round(arr),
    annualGrowthRate: Math.round(annualGrowthPct * 10) / 10,
    revenueMultiple,
    multipleReason,
    estimatedValuation,
    valuationFormatted: estimatedValuation >= 1000000
      ? `$${(estimatedValuation / 1000000).toFixed(1)}M`
      : estimatedValuation >= 1000
        ? `$${(estimatedValuation / 1000).toFixed(0)}K`
        : `$${estimatedValuation}`,
  };
}

export async function getPricingIntelligence() {
  const { tierCounts, totalSubs, totalPaid } = await getSubscriberData();
  const currentMRR = calculateMRR(tierCounts);
  const currentARR = currentMRR * 12;
  const arpu = totalSubs > 0 ? currentMRR / totalSubs : 0;
  const paidArpu = totalPaid > 0 ? currentMRR / totalPaid : 0;

  const tierRevenue: Record<string, { count: number; revenue: number; percentage: number; displayName: string; price: number }> = {};
  for (const [tier, count] of Object.entries(tierCounts)) {
    const price = TIER_PRICES[tier as keyof typeof TIER_PRICES]?.monthly || 0;
    const revenue = price * count;
    tierRevenue[tier] = {
      count,
      revenue,
      percentage: currentMRR > 0 ? Math.round((revenue / currentMRR) * 1000) / 10 : 0,
      displayName: TIER_NAMES[tier] || tier,
      price,
    };
  }

  const priceSensitivity: Record<string, { adjustments: { change: string; newPrice: number; projectedMRR: number; mrrDelta: number }[] }> = {};
  for (const tier of ["pro", "elite", "whale"]) {
    const basePrice = TIER_PRICES[tier as keyof typeof TIER_PRICES]?.monthly || 0;
    const baseCount = tierCounts[tier] || 0;
    const adjustments = [-0.2, -0.1, 0, 0.1, 0.2, 0.3].map(pctChange => {
      const newPrice = Math.round(basePrice * (1 + pctChange));
      const elasticity = tier === "whale" ? -0.3 : tier === "elite" ? -0.5 : -0.8;
      const countChange = pctChange !== 0 ? Math.round(baseCount * (1 + elasticity * pctChange)) : baseCount;
      const adjustedCount = Math.max(0, countChange);
      const tierMRR = newPrice * adjustedCount;
      const baseMRR = basePrice * baseCount;
      return {
        change: pctChange === 0 ? "Current" : `${pctChange > 0 ? "+" : ""}${Math.round(pctChange * 100)}%`,
        newPrice,
        projectedMRR: tierMRR,
        mrrDelta: tierMRR - baseMRR,
      };
    });
    priceSensitivity[tier] = { adjustments };
  }

  const annualUpsellOpportunity = {
    monthlySubscribers: totalPaid,
    annualSavings: "20%",
    ifConverted25Pct: Math.round(totalPaid * 0.25 * paidArpu * 12 * 0.2),
    ifConverted50Pct: Math.round(totalPaid * 0.50 * paidArpu * 12 * 0.2),
    recommendation: "Offer annual billing prominently during onboarding and after 3 months of active use. Annual subscribers have 2-3x lower churn.",
  };

  return {
    currentMRR: Math.round(currentMRR * 100) / 100,
    currentARR: Math.round(currentARR * 100) / 100,
    totalSubscribers: totalSubs,
    paidSubscribers: totalPaid,
    arpu: Math.round(arpu * 100) / 100,
    paidArpu: Math.round(paidArpu * 100) / 100,
    tierRevenue,
    priceSensitivity,
    annualUpsellOpportunity,
    generatedAt: new Date().toISOString(),
  };
}

export async function getOwnerWealthProjection() {
  const { tierCounts, totalSubs, totalPaid } = await getSubscriberData();
  const currentMRR = calculateMRR(tierCounts);
  const monthlyBreakdown = calculateCosts(currentMRR, totalPaid);

  const assumedGrowthRate = 0.08;
  const valuation = calculateValuation(currentMRR * 12, assumedGrowthRate);

  const milestones = [
    { label: "$1K MRR", target: 1000, current: currentMRR, reached: currentMRR >= 1000 },
    { label: "$5K MRR", target: 5000, current: currentMRR, reached: currentMRR >= 5000 },
    { label: "$10K MRR", target: 10000, current: currentMRR, reached: currentMRR >= 10000 },
    { label: "$50K MRR", target: 50000, current: currentMRR, reached: currentMRR >= 50000 },
    { label: "$100K MRR", target: 100000, current: currentMRR, reached: currentMRR >= 100000 },
    { label: "$1M ARR", target: 1000000 / 12, current: currentMRR, reached: currentMRR >= 1000000 / 12 },
  ].map(m => ({
    ...m,
    progress: Math.min(100, Math.round((m.current / m.target) * 1000) / 10),
    monthsAway: m.reached ? 0 : (assumedGrowthRate > 0
      ? Math.ceil(Math.log(m.target / Math.max(m.current, 1)) / Math.log(1 + assumedGrowthRate))
      : Infinity),
  }));

  const wealthProjection = [6, 12, 24, 36, 60].map(months => {
    let projectedMRR = Math.max(currentMRR, 1);
    let cumulativeTakeHome = 0;
    for (let m = 1; m <= months; m++) {
      projectedMRR *= (1 + assumedGrowthRate);
      const projectedPaid = Math.ceil(totalPaid * Math.pow(1 + assumedGrowthRate, m));
      const costs = calculateCosts(projectedMRR, projectedPaid);
      cumulativeTakeHome += costs.takeHome;
    }
    return {
      months,
      label: months < 12 ? `${months}mo` : `${months / 12}yr`,
      projectedMRR: Math.round(projectedMRR),
      monthlyTakeHome: Math.round(calculateCosts(projectedMRR, Math.ceil(totalPaid * Math.pow(1 + assumedGrowthRate, months))).takeHome),
      cumulativeWealth: Math.round(cumulativeTakeHome),
      projectedARR: Math.round(projectedMRR * 12),
      projectedValuation: calculateValuation(projectedMRR * 12, assumedGrowthRate).estimatedValuation,
    };
  });

  const subscriberMilestones = [100, 500, 1000, 5000, 10000, 50000].map(targetSubs => {
    const tierMix = { pro: 0.50, elite: 0.35, whale: 0.15 };
    const avgPrice = tierMix.pro * 49 + tierMix.elite * 99 + tierMix.whale * 249;
    const paidSubs = Math.round(targetSubs * 0.7);
    const projMRR = Math.round(paidSubs * avgPrice);
    const costs = calculateCosts(projMRR, paidSubs);
    return {
      subscribers: targetSubs,
      paidSubscribers: paidSubs,
      mrr: projMRR,
      arr: projMRR * 12,
      monthlyCosts: costs.totalCosts,
      monthlyProfit: costs.preTaxProfit,
      monthlyTakeHome: costs.takeHome,
      annualTakeHome: Math.round(costs.takeHome * 12),
      valuation: calculateValuation(projMRR * 12, assumedGrowthRate).estimatedValuation,
    };
  });

  return {
    currentMRR: Math.round(currentMRR * 100) / 100,
    currentARR: Math.round(currentMRR * 12 * 100) / 100,
    totalSubscribers: totalSubs,
    paidSubscribers: totalPaid,
    monthlyBreakdown,
    valuation,
    milestones,
    wealthProjection,
    subscriberMilestones,
    assumptions: {
      monthlyGrowthRate: `${assumedGrowthRate * 100}%`,
      taxRate: `${TAX_RATE * 100}%`,
      costBreakdown: COST_STRUCTURE,
      tierMixAssumption: "50% Sharp, 35% Edge, 15% Max (industry average for tiered SaaS)",
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getCompetitorBenchmark() {
  const competitors = [
    {
      name: "Action Network",
      monthlyPrice: "$9.99",
      annualPrice: "$59.99/yr",
      tier: "Basic",
      features: ["Odds comparison", "Bet tracker", "Expert picks", "Basic analytics"],
      strengths: ["Large user base", "Brand recognition", "Media content"],
      weaknesses: ["No AI predictions", "No Monte Carlo", "Limited analytics depth"],
      yourAdvantage: "46-factor AI engine, real-time simulations, deeper statistical analysis",
    },
    {
      name: "OddsJam",
      monthlyPrice: "$49-$199",
      annualPrice: "$468-$1,908/yr",
      tier: "Premium",
      features: ["Positive EV finder", "Arbitrage scanner", "Odds screen", "Real-time alerts"],
      strengths: ["Strong +EV tools", "Real-time data", "Arbitrage focus"],
      weaknesses: ["No AI assistant", "No parlay builder", "No custom model building"],
      yourAdvantage: "AI-powered assistant, visual parlay builder, custom model weights, Monte Carlo simulations",
    },
    {
      name: "BettingPros",
      monthlyPrice: "Free-$10",
      annualPrice: "Free-$99/yr",
      tier: "Budget",
      features: ["Consensus picks", "Computer picks", "Odds comparison", "News"],
      strengths: ["Free tier", "Simple UI", "CBS Sports backing"],
      weaknesses: ["Basic algorithms", "No real-time alerts", "No bankroll tools"],
      yourAdvantage: "Advanced Monte Carlo, Quantum Fusion engine, real-time SSE updates, bankroll simulator",
    },
    {
      name: "Unabated",
      monthlyPrice: "$99-$249",
      annualPrice: "$948-$2,388/yr",
      tier: "Professional",
      features: ["Screen builder", "Closing line value", "Market analysis", "True odds calculator"],
      strengths: ["Professional-grade tools", "CLV tracking", "Market efficiency analysis"],
      weaknesses: ["Steep learning curve", "No AI features", "No community"],
      yourAdvantage: "AI-powered simplicity, community features, personalized betting DNA profile",
    },
    {
      name: "DarkHorse Odds",
      monthlyPrice: "$29-$99",
      annualPrice: "$288-$948/yr",
      tier: "Mid-range",
      features: ["Odds comparison", "Line movement", "Bet tracking", "Analytics"],
      strengths: ["Clean interface", "Good line movement tools", "Multiple sports"],
      weaknesses: ["Limited AI", "No simulation engine", "No custom models"],
      yourAdvantage: "900K Monte Carlo simulations, 46-factor prediction, real-time edge alerts",
    },
    {
      name: "SharpSide",
      monthlyPrice: "$39",
      annualPrice: "$390/yr",
      tier: "Mid-range",
      features: ["Sharp action tracking", "Line movement", "Consensus data", "Bet signals"],
      strengths: ["Sharp money tracking", "Clean UI", "Focused product"],
      weaknesses: ["Single tier", "No AI tools", "Limited customization"],
      yourAdvantage: "Three tiers for every bettor level, AI assistant, custom model building",
    },
  ];

  const { tierCounts, totalPaid } = await getSubscriberData();
  const currentMRR = calculateMRR(tierCounts);

  const positioning = {
    category: "Premium AI-Powered Betting Intelligence",
    pricePosition: "Premium tier ($49-$249/mo) — justified by AI depth, real-time simulations, and 46-factor engine",
    keyDifferentiators: [
      "Only platform with Quantum Fusion 46-factor prediction engine",
      "900K+ Monte Carlo simulations per cycle",
      "Real-time SSE updates with sub-second latency",
      "AI-powered betting assistant with personalized strategy",
      "Custom model builder — users tune all 46 weights",
      "Multi-book odds comparison across 6+ sportsbooks",
      "Automated bet grading (A-F) with reasoning",
    ],
    marketGaps: [
      "No competitor offers AI-powered parlay optimization with Monte Carlo validation",
      "No competitor provides personalized Betting DNA profiles",
      "Custom model weight tuning is unique to Sors Maxima",
      "Community consensus + AI prediction fusion is a unique moat",
    ],
    risks: [
      "Larger players (ESPN, DraftKings) could add AI features",
      "Regulatory changes could impact sports betting tools",
      "API costs scale with users — need to monitor margins",
    ],
  };

  return { competitors, positioning, generatedAt: new Date().toISOString() };
}

export async function getPricingRecommendations() {
  const { tierCounts, totalSubs, totalPaid } = await getSubscriberData();
  const currentMRR = calculateMRR(tierCounts);
  const freeToTotal = totalSubs > 0 ? tierCounts.free / totalSubs : 0;
  const currentStage = totalSubs < 100 ? "launch" : totalSubs < 1000 ? "traction" : totalSubs < 10000 ? "growth" : "scale";

  const recommendations: {
    id: string;
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    title: string;
    description: string;
    expectedImpact: string;
    implementation: string;
    timeframe: string;
  }[] = [];

  if (currentStage === "launch") {
    recommendations.push({
      id: "launch-1",
      priority: "critical",
      category: "Pricing",
      title: "Keep Current Prices — Focus on Value Proof",
      description: "At launch stage, don't change prices. Focus on proving value to early adopters. Every happy customer becomes a testimonial.",
      expectedImpact: "Foundation for 10x growth — validated pricing lets you scale confidently",
      implementation: "Collect user testimonials, track ROI metrics for users, build case studies",
      timeframe: "Ongoing until 100+ subscribers",
    });
    recommendations.push({
      id: "launch-2",
      priority: "high",
      category: "Growth",
      title: "Launch Limited-Time Founding Member Discount",
      description: "Offer first 50 subscribers 25% off their first 3 months on any tier. Creates urgency and rewards early adopters without devaluing the product long-term.",
      expectedImpact: "+30-50% early subscriber conversion rate",
      implementation: "Create Stripe coupon codes, add countdown timer on pricing page, email campaign",
      timeframe: "1-2 weeks",
    });
    recommendations.push({
      id: "launch-3",
      priority: "high",
      category: "Revenue",
      title: "Add Founding Member Annual Discount",
      description: "Offer early subscribers 30% off annual plans (instead of 20%). Create urgency with 'first 100 members only' messaging. This locks in recurring revenue and reduces churn.",
      expectedImpact: "+40% annual conversion, 12 months of guaranteed revenue per customer",
      implementation: "Create special Stripe coupon, add landing page countdown, email announcement",
      timeframe: "1 week",
    });
  }

  if (currentStage === "traction") {
    recommendations.push({
      id: "traction-1",
      priority: "high",
      category: "Pricing",
      title: "Introduce Usage-Based Add-On: API Access",
      description: "Offer API access for $29/mo add-on to any tier. Power users and content creators will pay for programmatic access to your prediction engine.",
      expectedImpact: "+$29 ARPU per API user, targets 5-10% of subscriber base",
      implementation: "Build API key management, rate limiting, usage dashboard",
      timeframe: "2-4 weeks",
    });
    recommendations.push({
      id: "traction-2",
      priority: "high",
      category: "Pricing",
      title: "Raise Max Tier to $299/mo",
      description: "Your Max tier at $249 is underpriced for the value delivered. Whales are price-insensitive — they pay for edge, not savings. A $50 increase has minimal churn impact.",
      expectedImpact: `+$${(tierCounts.whale || 0) * 50}/mo MRR immediately, ~2% churn risk on whale tier`,
      implementation: "Grandfather existing whale subscribers at $249, new subscribers at $299",
      timeframe: "1 day (price change), 30 days (monitor churn)",
    });
  }

  if (currentStage === "growth" || currentStage === "scale") {
    recommendations.push({
      id: "growth-1",
      priority: "critical",
      category: "Pricing",
      title: "Implement Price Anchoring with Enterprise Tier",
      description: "Add a $499/mo 'Syndicate' tier with white-label features, team accounts, and dedicated support. Even if nobody buys it, it makes Max look like a deal.",
      expectedImpact: "+15-25% Max tier conversion (price anchoring effect)",
      implementation: "Design tier features, create Stripe product, update pricing page",
      timeframe: "2-3 weeks",
    });
    recommendations.push({
      id: "growth-2",
      priority: "high",
      category: "Revenue",
      title: "Launch Referral Program with Revenue Share",
      description: "Give existing subscribers 20% commission on referrals for 12 months. Your best customers are your best salespeople.",
      expectedImpact: "+20-30% organic growth, $0 upfront CAC on referral users",
      implementation: "Build referral tracking, unique referral codes, payout system",
      timeframe: "3-4 weeks",
    });
  }

  if (freeToTotal > 0.6) {
    recommendations.push({
      id: "conversion-1",
      priority: "high",
      category: "Conversion",
      title: "Gate High-Value Features Behind Paywall",
      description: `${Math.round(freeToTotal * 100)}% of your users are on free tier. Tighten the free tier: remove edge alerts, limit preview data, and show 'blurred' premium picks to create FOMO.`,
      expectedImpact: "+20-40% free-to-paid conversion",
      implementation: "Update free tier limits in feature flags, add blur overlays on premium content",
      timeframe: "1-2 weeks",
    });
  }

  recommendations.push({
    id: "always-1",
    priority: "medium",
    category: "Revenue",
    title: "Push Annual Billing Aggressively",
    description: "After 90 days of active monthly usage, show in-app prompt: 'You've spent $X so far. Save 20% with annual billing.' Repeat quarterly.",
    expectedImpact: "Annual subscribers churn at 1/3 the rate of monthly. Each conversion extends average lifetime by 8+ months.",
    implementation: "Add in-app notification after 90 days, email campaign at 90/180/365 days",
    timeframe: "1-2 weeks",
  });

  recommendations.push({
    id: "always-2",
    priority: "medium",
    category: "Revenue",
    title: "Win-Back Campaign for Churned Users",
    description: "When users cancel, offer 40% off for 3 months to win them back. SaaS win-back campaigns have 10-15% success rate.",
    expectedImpact: "Recover 10-15% of churned revenue at reduced margin (still profitable)",
    implementation: "Stripe webhook on cancellation → trigger email sequence → special discount link",
    timeframe: "1-2 weeks",
  });

  return {
    currentStage,
    totalSubscribers: totalSubs,
    paidSubscribers: totalPaid,
    currentMRR: Math.round(currentMRR * 100) / 100,
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    generatedAt: new Date().toISOString(),
  };
}

export async function getGrowthStageStrategy() {
  const { tierCounts, totalSubs, totalPaid } = await getSubscriberData();
  const currentMRR = calculateMRR(tierCounts);
  const assumedGrowthRate = 0.08;

  const stages = [
    {
      id: "launch",
      name: "Launch",
      range: "0 — 100 subscribers",
      subscriberMin: 0,
      subscriberMax: 100,
      description: "Prove product-market fit. Every user interaction is a learning opportunity. Don't optimize for revenue yet — optimize for retention and feedback.",
      pricingActions: [
        "Keep prices stable — validate willingness to pay",
        "Offer founding member discounts to early subscribers",
        "Create founding member perks (lifetime price lock)",
        "Test pricing page copy and layouts",
      ],
      marketingBudget: {
        contentMarketing: 40,
        paidAds: 10,
        communityBuilding: 30,
        partnerships: 20,
      },
      productFocus: [
        "Polish onboarding flow — reduce time-to-value under 5 minutes",
        "Build social proof (testimonials, case studies, bet track records)",
        "Add analytics to track which features drive retention",
        "Implement NPS surveys at day 7, 30, 90",
      ],
      keyMetrics: ["Trial-to-paid conversion rate", "Day 7 retention", "Feature adoption rate", "NPS score"],
      monthsToNext: Math.ceil(Math.log(100 / Math.max(totalSubs, 1)) / Math.log(1 + assumedGrowthRate)),
    },
    {
      id: "traction",
      name: "Traction",
      range: "100 — 1,000 subscribers",
      subscriberMin: 100,
      subscriberMax: 1000,
      description: "You have product-market fit signal. Now systematize acquisition and start optimizing revenue per user. Begin building your growth engine.",
      pricingActions: [
        "A/B test 10-15% price increases on new subscribers",
        "Introduce annual billing prominently",
        "Consider usage-based add-ons (API access, premium data feeds)",
        "Raise Max tier price — whales are price-insensitive",
        "Implement grandfathering for loyal early users",
      ],
      marketingBudget: {
        contentMarketing: 30,
        paidAds: 25,
        communityBuilding: 20,
        partnerships: 15,
        affiliates: 10,
      },
      productFocus: [
        "Build referral program",
        "Add team/group accounts",
        "Launch affiliate program for sports content creators",
        "Develop email nurture sequences for each lifecycle stage",
      ],
      keyMetrics: ["Monthly growth rate", "CAC by channel", "LTV:CAC ratio", "Expansion revenue"],
      monthsToNext: Math.ceil(Math.log(1000 / Math.max(totalSubs, 1)) / Math.log(1 + assumedGrowthRate)),
    },
    {
      id: "growth",
      name: "Growth",
      range: "1,000 — 10,000 subscribers",
      subscriberMin: 1000,
      subscriberMax: 10000,
      description: "Scale what works. Invest heavily in the acquisition channels with best LTV:CAC. Start thinking about international expansion and enterprise features.",
      pricingActions: [
        "Introduce Enterprise/Syndicate tier ($499+/mo)",
        "Implement dynamic pricing by market segment",
        "Offer volume discounts for group purchases",
        "Launch seasonal promotions (NFL/March Madness)",
        "Test removing free tier or making it more restrictive",
      ],
      marketingBudget: {
        contentMarketing: 20,
        paidAds: 35,
        communityBuilding: 10,
        partnerships: 15,
        affiliates: 15,
        events: 5,
      },
      productFocus: [
        "Hire customer success team",
        "Build self-serve enterprise features",
        "Expand to international sports markets",
        "Launch mobile app",
        "Build public API for third-party integrations",
      ],
      keyMetrics: ["Net revenue retention", "Payback period", "Gross margin", "Rule of 40"],
      monthsToNext: Math.ceil(Math.log(10000 / Math.max(totalSubs, 1)) / Math.log(1 + assumedGrowthRate)),
    },
    {
      id: "scale",
      name: "Scale",
      range: "10,000+ subscribers",
      subscriberMin: 10000,
      subscriberMax: Infinity,
      description: "You're a market leader. Focus on maximizing revenue per user, building moats, and preparing for potential exit. Every percentage point of margin matters at this scale.",
      pricingActions: [
        "Optimize pricing annually with data-driven analysis",
        "Launch white-label platform for B2B partners",
        "Create marketplace for user-generated models/strategies",
        "Implement premium support tiers ($50-100/mo add-on)",
        "Consider geographic pricing for international markets",
      ],
      marketingBudget: {
        contentMarketing: 15,
        paidAds: 30,
        brandBuilding: 15,
        partnerships: 15,
        affiliates: 15,
        events: 10,
      },
      productFocus: [
        "Build platform moats (proprietary data, network effects)",
        "Launch marketplace for user strategies",
        "International expansion (UK, Australia, Canada)",
        "Consider acquisition of complementary tools",
        "Prepare for potential Series A or strategic exit",
      ],
      keyMetrics: ["ARR", "Net revenue retention >120%", "Gross margin >75%", "LTV:CAC >5x"],
      monthsToNext: 0,
    },
  ];

  const currentStage = totalSubs < 100 ? "launch" : totalSubs < 1000 ? "traction" : totalSubs < 10000 ? "growth" : "scale";

  const pricingExperiments = [
    {
      name: "Anchoring Test",
      description: "Add a $499 'Syndicate' tier to the pricing page. Measure if Max tier conversions increase (price anchoring effect).",
      expectedImpact: "+15-25% Max tier conversion",
      difficulty: "Easy",
      timeToImplement: "1 week",
    },
    {
      name: "Annual Nudge Test",
      description: "A/B test showing annual pricing as default vs monthly as default on the pricing page.",
      expectedImpact: "+30-50% annual subscription rate",
      difficulty: "Easy",
      timeToImplement: "2 days",
    },
    {
      name: "Free Tier Restriction Test",
      description: "Restrict free tier preview data to 3 games max. Measure free-to-paid conversion rate change.",
      expectedImpact: "+20-40% conversion, -10-15% free signups",
      difficulty: "Easy",
      timeToImplement: "1 day",
    },
    {
      name: "Decoy Pricing Test",
      description: "Modify Edge tier to be slightly less attractive relative to Max, making Max feel like better value.",
      expectedImpact: "+10-15% Max tier conversions",
      difficulty: "Medium",
      timeToImplement: "1 week",
    },
    {
      name: "Win-Back Discount Test",
      description: "Test 30% vs 40% vs 50% discount for churned users. Find the minimum discount that wins them back.",
      expectedImpact: "Recover 10-15% of churned revenue",
      difficulty: "Medium",
      timeToImplement: "2 weeks",
    },
    {
      name: "Usage-Based Add-On Test",
      description: "Offer API access at $29/mo to all tiers. Measure adoption and willingness to pay for data access.",
      expectedImpact: "+$29 ARPU on 5-10% of subscribers",
      difficulty: "Hard",
      timeToImplement: "3-4 weeks",
    },
  ];

  return {
    currentStage,
    totalSubscribers: totalSubs,
    paidSubscribers: totalPaid,
    currentMRR: Math.round(currentMRR * 100) / 100,
    stages,
    pricingExperiments,
    generatedAt: new Date().toISOString(),
  };
}

export interface ChannelMetrics {
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  signups: number;
  deposits: number;
  firstBets: number;
  revenue: number;
  cac: number;
  ltv: number;
  roas: number;
  conversionRate: number;
  ctr: number;
  trend: "up" | "down" | "stable";
}

export interface KPIForecast {
  period: string;
  installs: number;
  signups: number;
  depositRate: number;
  firstWeekRetention: number;
  cac: number;
  ltv: number;
  revenue: number;
  netRevenue: number;
}

export interface CohortLTV {
  cohort: string;
  day0: number;
  day7: number;
  day14: number;
  day30: number;
  day60: number;
  day90: number;
  projected365: number;
  userCount: number;
}

export interface AttributionData {
  source: string;
  medium: string;
  campaign: string;
  signups: number;
  deposits: number;
  revenue: number;
  conversionRate: number;
}

function getChannelMetrics(): ChannelMetrics[] {
  return [
    { channel: "Meta Ads", spend: 45000, impressions: 2800000, clicks: 84000, signups: 4200, deposits: 1260, firstBets: 1008, revenue: 126000, cac: 35.71, ltv: 142, roas: 2.8, conversionRate: 30, ctr: 3.0, trend: "up" },
    { channel: "Google Ads", spend: 38000, impressions: 1900000, clicks: 57000, signups: 2850, deposits: 855, firstBets: 684, revenue: 102600, cac: 44.44, ltv: 156, roas: 2.7, conversionRate: 30, ctr: 3.0, trend: "stable" },
    { channel: "TikTok Ads", spend: 22000, impressions: 4200000, clicks: 126000, signups: 3780, deposits: 756, firstBets: 605, revenue: 60480, cac: 29.10, ltv: 98, roas: 2.75, conversionRate: 20, ctr: 3.0, trend: "up" },
    { channel: "YouTube", spend: 15000, impressions: 850000, clicks: 17000, signups: 680, deposits: 272, firstBets: 218, revenue: 40800, cac: 55.15, ltv: 185, roas: 2.72, conversionRate: 40, ctr: 2.0, trend: "stable" },
    { channel: "Affiliates", spend: 28000, impressions: 1200000, clicks: 48000, signups: 2400, deposits: 960, firstBets: 768, revenue: 115200, cac: 29.17, ltv: 168, roas: 4.11, conversionRate: 40, ctr: 4.0, trend: "up" },
    { channel: "Influencers", spend: 18000, impressions: 3500000, clicks: 70000, signups: 2100, deposits: 630, firstBets: 504, revenue: 63000, cac: 28.57, ltv: 112, roas: 3.5, conversionRate: 30, ctr: 2.0, trend: "up" },
    { channel: "Organic Search", spend: 5000, impressions: 450000, clicks: 22500, signups: 1800, deposits: 720, firstBets: 576, revenue: 86400, cac: 6.94, ltv: 195, roas: 17.28, conversionRate: 40, ctr: 5.0, trend: "up" },
    { channel: "Email Marketing", spend: 3000, impressions: 180000, clicks: 14400, signups: 576, deposits: 288, firstBets: 230, revenue: 43200, cac: 10.42, ltv: 210, roas: 14.4, conversionRate: 50, ctr: 8.0, trend: "stable" },
    { channel: "Social Organic", spend: 2000, impressions: 620000, clicks: 12400, signups: 496, deposits: 149, firstBets: 119, revenue: 14900, cac: 13.42, ltv: 135, roas: 7.45, conversionRate: 30, ctr: 2.0, trend: "down" },
    { channel: "Direct/Brand", spend: 0, impressions: 0, clicks: 0, signups: 3200, deposits: 1600, firstBets: 1280, revenue: 240000, cac: 0, ltv: 225, roas: 0, conversionRate: 50, ctr: 0, trend: "up" },
  ];
}

function getKPIForecasts(): KPIForecast[] {
  return [
    { period: "30-day", installs: 28000, signups: 22400, depositRate: 32, firstWeekRetention: 65, cac: 28.5, ltv: 148, revenue: 485000, netRevenue: 287000 },
    { period: "60-day", installs: 62000, signups: 49600, depositRate: 35, firstWeekRetention: 68, cac: 26.2, ltv: 158, revenue: 1150000, netRevenue: 728000 },
    { period: "90-day", installs: 105000, signups: 84000, depositRate: 38, firstWeekRetention: 72, cac: 24.0, ltv: 172, revenue: 2280000, netRevenue: 1560000 },
  ];
}

function getCohortLTVData(): CohortLTV[] {
  return [
    { cohort: "Dec 2025", day0: 0, day7: 12.5, day14: 28.4, day30: 52.8, day60: 89.2, day90: 118.5, projected365: 285, userCount: 4200 },
    { cohort: "Jan W1", day0: 0, day7: 14.2, day14: 31.8, day30: 58.4, day60: 95.6, day90: 128.4, projected365: 310, userCount: 3800 },
    { cohort: "Jan W2", day0: 0, day7: 13.8, day14: 30.2, day30: 55.2, day60: 92.8, day90: null as any, projected365: 298, userCount: 4100 },
    { cohort: "Jan W3", day0: 0, day7: 15.1, day14: 33.6, day30: 61.2, day60: null as any, day90: null as any, projected365: 325, userCount: 3600 },
    { cohort: "Jan W4", day0: 0, day7: 14.8, day14: 32.4, day30: 58.9, day60: null as any, day90: null as any, projected365: 315, userCount: 3900 },
    { cohort: "Feb W1", day0: 0, day7: 16.2, day14: 35.8, day30: null as any, day60: null as any, day90: null as any, projected365: 342, userCount: 4500 },
    { cohort: "Feb W2", day0: 0, day7: 15.5, day14: 34.2, day30: null as any, day60: null as any, day90: null as any, projected365: 332, userCount: 4200 },
    { cohort: "Feb W3", day0: 0, day7: 17.1, day14: null as any, day30: null as any, day60: null as any, day90: null as any, projected365: 358, userCount: 4800 },
  ];
}

function getAttributionData(): AttributionData[] {
  return [
    { source: "facebook", medium: "cpc", campaign: "superbowl_2026", signups: 1850, deposits: 555, revenue: 83250, conversionRate: 30 },
    { source: "google", medium: "cpc", campaign: "brand_search", signups: 1200, deposits: 480, revenue: 72000, conversionRate: 40 },
    { source: "google", medium: "cpc", campaign: "competitor_conquest", signups: 890, deposits: 267, revenue: 34710, conversionRate: 30 },
    { source: "tiktok", medium: "cpc", campaign: "sports_betting_tips", signups: 2100, deposits: 420, revenue: 33600, conversionRate: 20 },
    { source: "affiliate", medium: "referral", campaign: "top_affiliates_q1", signups: 1600, deposits: 640, revenue: 96000, conversionRate: 40 },
    { source: "influencer", medium: "social", campaign: "nba_season_launch", signups: 950, deposits: 285, revenue: 34200, conversionRate: 30 },
    { source: "email", medium: "newsletter", campaign: "weekly_picks_feb", signups: 320, deposits: 192, revenue: 28800, conversionRate: 60 },
    { source: "organic", medium: "search", campaign: "(none)", signups: 1800, deposits: 720, revenue: 86400, conversionRate: 40 },
  ];
}

export function getAcquisitionDashboard() {
  const channels = getChannelMetrics();
  const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const totalSignups = channels.reduce((s, c) => s + c.signups, 0);
  const totalDeposits = channels.reduce((s, c) => s + c.deposits, 0);

  return {
    summary: {
      totalSpend,
      totalRevenue,
      totalSignups,
      totalDeposits,
      blendedCac: totalSpend / Math.max(totalDeposits, 1),
      blendedRoas: totalRevenue / Math.max(totalSpend, 1),
      overallConversionRate: Math.round((totalDeposits / Math.max(totalSignups, 1)) * 100),
      avgLtv: Math.round(channels.reduce((s, c) => s + c.ltv, 0) / channels.length),
      ltvCacRatio: +(channels.reduce((s, c) => s + c.ltv, 0) / channels.length / (totalSpend / Math.max(totalDeposits, 1))).toFixed(1),
      paybackPeriodDays: Math.round((totalSpend / Math.max(totalDeposits, 1)) / ((channels.reduce((s, c) => s + c.ltv, 0) / channels.length) / 365)),
    },
    channels,
    forecasts: getKPIForecasts(),
    cohortLtv: getCohortLTVData(),
    attribution: getAttributionData(),
  };
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useSEO } from "@/hooks/use-seo";
import {
  ArrowLeft, DollarSign, TrendingUp, Users, Target, Zap, Shield,
  CheckCircle2, Circle, ArrowRight, ExternalLink, AlertTriangle,
  BarChart3, Globe, MessageSquare, Mail, Star, Flame, Building2,
  Award, Calendar, Clock, ChevronRight, Info, Megaphone, Hash,
  Webhook, HeartHandshake, Link2, CreditCard, Eye, BookOpen,
  Lightbulb, Lock, Activity, Layers
} from "lucide-react";

// ── Revenue Streams ────────────────────────────────────────────────────────────
const revenueStreams = [
  {
    id: "subscriptions",
    rank: 1,
    name: "Tier Subscriptions",
    category: "Direct",
    potential: "$10K–$100K+/mo",
    difficulty: "Active",
    timeToFirst: "Immediate",
    icon: CreditCard,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Your core SaaS business. Monthly recurring revenue from Sharp ($49), Edge ($99), Max ($249), Community Operator ($499), and Enterprise ($1,200+) subscribers.",
    tactics: [
      "Optimize your conversion funnel — free trial on Sharp reduces friction",
      "Email all registered users who haven't subscribed with a 72-hour discount offer",
      "Add a live member count to your pricing page: 'Join 847 members'",
      "Show real win rates prominently — your track record is your best sales pitch",
      "Introduce annual billing (you already have it) but push it harder in CTAs",
    ],
    monthlyModel: [
      { label: "100 members (avg $89)", value: "$8,900/mo" },
      { label: "500 members (avg $89)", value: "$44,500/mo" },
      { label: "1,000 members (avg $89)", value: "$89,000/mo" },
    ],
  },
  {
    id: "affiliates",
    rank: 2,
    name: "Sportsbook Affiliate Commissions",
    category: "Affiliate",
    potential: "$5K–$50K+/mo",
    difficulty: "Setup Required",
    timeToFirst: "2–4 weeks",
    icon: Link2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Every time one of your members signs up for a sportsbook through your tracked link and makes their first deposit, you earn $50–$300 CPA (Cost Per Acquisition). With a large, engaged audience of bettors, this can rival or exceed subscription revenue.",
    tactics: [
      "Add tracked affiliate links to your Sors Books hub — you already built the UI for this",
      "Feature 'Exclusive Sors Member Offers' prominently on the books hub",
      "Send a monthly email: 'Best sportsbook promotions this month'",
      "Create a 'Best Books for X Sport' content page to capture SEO traffic",
      "Add affiliate disclosures (legally required) at the footer of every page",
    ],
    monthlyModel: [
      { label: "50 new book sign-ups × $100 avg CPA", value: "$5,000/mo" },
      { label: "150 new book sign-ups × $100 avg CPA", value: "$15,000/mo" },
      { label: "300 new book sign-ups × $120 avg CPA", value: "$36,000/mo" },
    ],
  },
  {
    id: "community",
    rank: 3,
    name: "Community Operator Plan",
    category: "B2B",
    potential: "$5K–$20K/mo",
    difficulty: "Outreach Required",
    timeToFirst: "4–8 weeks",
    icon: MessageSquare,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    description: "Discord betting community operators pay $499/mo to use Sors as their credibility engine. The market is full of fake screenshot services — you offer cryptographic proof. 20–30 community operators alone = $10K–$15K/mo in pure B2B revenue.",
    tactics: [
      "Build a list of top betting Discord servers (r/sportsbook has many pinned)",
      "DM server owners offering a 2-week free trial of the Community plan",
      "Highlight the 'fake screenshot epidemic' — your proof system solves a real problem",
      "Offer to appear in their Discord for a live demo/Q&A session",
      "Create a Community Operator case study once you have your first one",
    ],
    monthlyModel: [
      { label: "10 operators × $499", value: "$4,990/mo" },
      { label: "25 operators × $499", value: "$12,475/mo" },
      { label: "50 operators × $499", value: "$24,950/mo" },
    ],
  },
  {
    id: "revshare",
    rank: 4,
    name: "Affiliate Revenue Share (NGR)",
    category: "Affiliate",
    potential: "$2K–$20K/mo",
    difficulty: "Negotiation Required",
    timeToFirst: "1–3 months",
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    description: "Beyond CPA, many sportsbooks offer ongoing revenue share — typically 20–35% of the Net Gaming Revenue (NGR) your referred players generate. One prolific bettor referred through your link could generate $200–$500/mo ongoing passively.",
    tactics: [
      "Negotiate rev share deals alongside CPA deals — ask for hybrid",
      "Rev share compounds: a player who bets $10K/mo = $2,000–$3,500/mo from 1 referral",
      "Focus rev share deals on books popular with sharp/recreational bettors",
      "Track your NGR players in a spreadsheet monthly — some will be evergreen earners",
    ],
    monthlyModel: [
      { label: "100 active referred bettors × $30 avg NGR share", value: "$3,000/mo" },
      { label: "300 active bettors × $35 avg NGR share", value: "$10,500/mo" },
      { label: "500 active bettors × $35 avg NGR share", value: "$17,500/mo" },
    ],
  },
  {
    id: "enterprise",
    rank: 5,
    name: "Enterprise White-Label",
    category: "B2B",
    potential: "$5K–$30K/deal",
    difficulty: "High Effort",
    timeToFirst: "3–6 months",
    icon: Building2,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "Licensing the Sors prediction engine, pick cards, and verification system to media companies, sportsbook affiliates, and large communities. Custom deals starting at $1,200/mo. Revenue share or flat licensing — both work.",
    tactics: [
      "Target sports media properties with 50K+ social followings",
      "Pitch to sportsbook affiliate networks — they manage many sites at once",
      "Offer API access as the upsell from Community plan",
      "Build a simple 'Powered by Sors Intelligence' embed widget for their sites",
    ],
    monthlyModel: [
      { label: "3 enterprise clients × $1,500 avg", value: "$4,500/mo" },
      { label: "8 enterprise clients × $2,000 avg", value: "$16,000/mo" },
      { label: "15 enterprise clients × $2,500 avg", value: "$37,500/mo" },
    ],
  },
  {
    id: "referrals",
    rank: 6,
    name: "Member Referral Program",
    category: "Growth",
    potential: "Accelerator (not standalone)",
    difficulty: "Low",
    timeToFirst: "Immediate (built)",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    description: "Your referral system is already built. Activate it. Sharp members who refer someone who subscribes earn 1 month free. Community operators earn 20% ongoing on every member they bring in. This turns your best members into salespeople.",
    tactics: [
      "Send every current member an email announcing the referral program",
      "Add referral link prominently to the profile page and post-login screen",
      "Community operators especially will push referrals if they earn 20%",
      "Shout out top referrers monthly — social proof compounds",
    ],
    monthlyModel: [
      { label: "Accelerates subscriber growth by 15–30%", value: "+$1,500–$15,000 indirect" },
    ],
  },
];

// ── Sportsbook Affiliate Programs ──────────────────────────────────────────────
const affiliatePrograms = [
  {
    name: "DraftKings",
    logo: "DK",
    color: "bg-green-600",
    cpa: "$100–$300",
    revShare: "25–35% NGR",
    deal: "Hybrid CPA + Rev Share",
    applyUrl: "affiliates.draftkings.com",
    payout: "Monthly, 30-day delay, wire/ACH",
    cookie: "30 days",
    requirements: "No minimum traffic — but quality of audience matters",
    tier: "Tier 1",
    tierColor: "bg-emerald-500",
    notes: "Largest US sportsbook by volume. High CPA for qualified affiliates. Strict on brand compliance — must not claim guaranteed wins.",
    bestFor: "Broad audience, heavy NFL/NBA bettors",
    approxMonthlyEarning: "Most programs' top earner",
    steps: [
      "Go to affiliates.draftkings.com and click 'Apply Now'",
      "Fill in your website/social details and describe your audience",
      "Wait 3–7 business days for approval email",
      "Log in to affiliate portal, copy your unique tracking link",
      "Add link to Sors Books hub for DraftKings",
      "Tag: 'Best for parlays and player props'",
    ],
  },
  {
    name: "FanDuel",
    logo: "FD",
    color: "bg-blue-600",
    cpa: "$50–$250",
    revShare: "20–30% NGR",
    deal: "CPA primary, rev share negotiable",
    applyUrl: "partners.fanduel.com",
    payout: "Monthly, net-30",
    cookie: "30 days",
    requirements: "Content site or social following preferred",
    tier: "Tier 1",
    tierColor: "bg-emerald-500",
    notes: "Part of Flutter Entertainment (world's largest gambling company). Well-run affiliate program. Excellent same-game parlay product — aligns perfectly with Sors' SGP builder.",
    bestFor: "SGP fans, casual bettors, NFL bettors",
    approxMonthlyEarning: "Top 3 US programs",
    steps: [
      "Navigate to partners.fanduel.com",
      "Submit application with website/social stats",
      "Approval usually within 5 business days",
      "Use their link builder to create tagged links per sport/promotion",
      "Feature in 'SGP Picks' section — high synergy with Sors tools",
    ],
  },
  {
    name: "BetMGM",
    logo: "MGM",
    color: "bg-yellow-700",
    cpa: "$75–$175",
    revShare: "20–30% NGR",
    deal: "Hybrid (negotiable)",
    applyUrl: "betmgmpartners.com",
    payout: "Monthly, net-30",
    cookie: "30 days",
    requirements: "Standard compliance checks",
    tier: "Tier 1",
    tierColor: "bg-emerald-500",
    notes: "Joint venture between MGM Resorts and Entain. Strong brand. Good player props market — Sors has a dedicated props engine, strong synergy here.",
    bestFor: "Player props bettors, casino crossovers",
    approxMonthlyEarning: "High — strong brand recognition",
    steps: [
      "Go to betmgmpartners.com and apply",
      "Disclose that you run a betting intelligence platform",
      "After approval, feature BetMGM on the player props pages — high intent traffic",
      "Negotiate hybrid: ask for $100 CPA + 20% NGR on high-volume players",
    ],
  },
  {
    name: "Caesars Sportsbook",
    logo: "CZR",
    color: "bg-purple-700",
    cpa: "$150–$400",
    revShare: "20–25% NGR",
    deal: "CPA primarily (highest in market)",
    applyUrl: "caesarsaffiliatenetwork.com",
    payout: "Monthly, net-30",
    cookie: "30 days",
    requirements: "U.S.-focused audience required",
    tier: "Tier 1",
    tierColor: "bg-emerald-500",
    notes: "Often the highest CPA in the US market, especially during football season promotions. Famous for 'Full Caesar' deposit match. Perfect if you want to maximize CPA revenue per conversion.",
    bestFor: "High-value bettor acquisition, NFL season",
    approxMonthlyEarning: "Highest CPA per referral",
    steps: [
      "Apply at caesarsaffiliatenetwork.com",
      "Caesars is selective — emphasize your pick quality and user trust system",
      "Apply during football season (Aug–Jan) when CPA bonuses are elevated",
      "Feature as 'Best for high-limit bets' in your books hub",
    ],
  },
  {
    name: "BetRivers / SugarHouse",
    logo: "BR",
    color: "bg-red-700",
    cpa: "$75–$120",
    revShare: "25–30% NGR",
    deal: "CPA or Rev Share",
    applyUrl: "affiliates.betrivers.com",
    payout: "Monthly, net-30",
    cookie: "45 days",
    requirements: "Lower barrier to entry than Tier 1 books",
    tier: "Tier 2",
    tierColor: "bg-blue-500",
    notes: "Rush Street Interactive platform. Available in many US states. Easier approval process — good starting point while building toward Tier 1 programs.",
    bestFor: "Midwest and Southeast US bettors",
    approxMonthlyEarning: "Moderate — good starting program",
    steps: [
      "Easiest of the major programs to get approved — start here while building track record",
      "Apply at affiliates.betrivers.com",
      "Use as benchmark to prove affiliate conversion rate for Tier 1 applications",
    ],
  },
  {
    name: "Hard Rock Bet",
    logo: "HR",
    color: "bg-orange-700",
    cpa: "$75–$130",
    revShare: "20–30% NGR",
    deal: "Hybrid available",
    applyUrl: "affiliate.hardrock.bet",
    payout: "Monthly",
    cookie: "30 days",
    requirements: "Standard compliance",
    tier: "Tier 2",
    tierColor: "bg-blue-500",
    notes: "Growing fast in Florida and new states. Hard Rock brand has strong recognition. Good option to diversify your portfolio beyond the big two.",
    bestFor: "Florida-based users, casino crossovers",
    approxMonthlyEarning: "Moderate — growing platform",
    steps: [
      "Apply at affiliate.hardrock.bet",
      "Good mid-tier program to have alongside DK and FD",
      "Feature for Florida-based bettors specifically",
    ],
  },
  {
    name: "ESPN Bet",
    logo: "ESPN",
    color: "bg-red-600",
    cpa: "$100–$250",
    revShare: "20–30% NGR",
    deal: "Competitive — new entrant wants affiliates",
    applyUrl: "espnbet.com/affiliates",
    payout: "Monthly",
    cookie: "30 days",
    requirements: "Standard, actively recruiting affiliates",
    tier: "Tier 1",
    tierColor: "bg-emerald-500",
    notes: "Penn Entertainment rebranded as ESPN Bet with Disney partnership. New entrant actively growing affiliate base — they want qualified affiliates and may offer elevated rates. High upside while they're still building market share.",
    bestFor: "ESPN-branded familiarity, mainstream bettors",
    approxMonthlyEarning: "Potentially highest short-term due to growth incentives",
    steps: [
      "Apply ASAP — new programs often have elevated rates for early affiliates",
      "ESPN brand has massive consumer awareness — good conversion rates",
      "Feature alongside DK and FD as the 'ESPN option'",
    ],
  },
];

// ── Execution Roadmap ──────────────────────────────────────────────────────────
const roadmapWeeks = [
  {
    week: "Week 1–2",
    title: "Legal & Compliance Foundation",
    priority: "critical",
    tasks: [
      { task: "Add affiliate disclosure to footer and books hub", why: "FTC requires disclosure. Without it, you risk account termination from all programs.", done: false },
      { task: "Update Privacy Policy to mention affiliate links", why: "GDPR and US state laws require this.", done: false },
      { task: "Add responsible gambling resources to every page", why: "Required by every sportsbook affiliate program as a condition of approval.", done: false },
      { task: "Review your disclaimer on the pricing page", why: "Must clearly state you don't provide gambling advice — this protects you legally.", done: false },
      { task: "Ensure your domain is pointed to a real URL (not replit.app)", why: "Affiliate programs reject .replit.app domains at submission.", done: false },
    ],
  },
  {
    week: "Week 3–4",
    title: "Apply to Top 3 Affiliate Programs",
    priority: "high",
    tasks: [
      { task: "Apply to DraftKings Affiliates (affiliates.draftkings.com)", why: "Largest US book, highest volume potential.", done: false },
      { task: "Apply to FanDuel Partners (partners.fanduel.com)", why: "2nd largest, strong SGP synergy with your tools.", done: false },
      { task: "Apply to BetRivers (affiliates.betrivers.com) as backup", why: "Easiest approval — good for building a conversion track record.", done: false },
      { task: "Set up dedicated /books page or Sors Books hub with placeholders", why: "Some programs want to see where your links will be placed.", done: false },
      { task: "Write your affiliate application description", why: "Explain you run a 46-factor AI picks platform with verified track record, not a generic site.", done: false },
    ],
  },
  {
    week: "Week 5–6",
    title: "Build Affiliate Infrastructure",
    priority: "high",
    tasks: [
      { task: "Integrate approved affiliate links into Sors Books hub", why: "This is your primary conversion surface — every book click should be tracked.", done: false },
      { task: "Create 'Sors Exclusive Offers' section with promoted bonuses", why: "Exclusive or negotiated offers convert 2–3x better than generic links.", done: false },
      { task: "Apply to Caesars and ESPN Bet (higher CPA potential)", why: "Caesars is often the highest CPA in market — apply after BetRivers confirms your conversion rate.", done: false },
      { task: "Set up tracking spreadsheet: clicks → sign-ups → CPA earned", why: "You need to know which programs and placements are converting so you can optimize.", done: false },
      { task: "Add UTM parameters to all affiliate links", why: "Lets you track which pages/emails drive the most affiliate conversions.", done: false },
    ],
  },
  {
    week: "Week 7–8",
    title: "Content Engine Launch",
    priority: "high",
    tasks: [
      { task: "Post first X/Twitter betting breakdown thread", why: "Organic content is your cheapest acquisition channel. One thread can drive 10–50 signups.", done: false },
      { task: "Make a list of 20 betting Discord servers to approach", why: "Community operators are your best B2B pipeline — each one is worth $499/mo if converted.", done: false },
      { task: "Write your first 'Book comparison' SEO page", why: "Ranking for 'best sportsbook for parlays' or similar drives consistent affiliate traffic.", done: false },
      { task: "Set up email sequence: 'Welcome' → 'Best Books This Week' → 'Monthly Edge Report'", why: "Email converts 3–5x better than social for betting offers.", done: false },
      { task: "Post your win rate prominently — this is your marketing asset", why: "A verified win rate above the 52.4% break-even is your most powerful ad. Show it everywhere.", done: false },
    ],
  },
  {
    week: "Week 9–10",
    title: "Community Operator Pipeline",
    priority: "medium",
    tasks: [
      { task: "DM 10 Discord betting server owners with Community plan offer", why: "Each converted operator = $499/mo + potential referral commissions from their members.", done: false },
      { task: "Offer first 3 operators a 1-month free trial", why: "Let them experience the verified picks system — churn is near zero once they see their community's reaction.", done: false },
      { task: "Create a 'Community Operator' landing page or blog post", why: "SEO + credibility. 'How Discord betting server owners prove their picks are real.'", done: false },
      { task: "Set up Discord server for Sors community (beta)", why: "Your own Discord is a direct sales channel for upselling Max and Community plans.", done: false },
    ],
  },
  {
    week: "Week 11–12",
    title: "Optimize & Scale",
    priority: "medium",
    tasks: [
      { task: "Review affiliate dashboard — which books are converting?", why: "Double down on converting programs, renegotiate or drop low performers.", done: false },
      { task: "Apply for BetMGM and Hard Rock Bet affiliate programs", why: "More programs = more options, more negotiating leverage, diversified risk.", done: false },
      { task: "Run first A/B test on pricing page CTA copy", why: "'Start Your Edge' vs 'Join 200+ Members' — small copy changes can move conversion 20%.", done: false },
      { task: "Calculate your true CAC and LTV including affiliate income", why: "With affiliate revenue, your business model looks very different. Know your real numbers.", done: false },
      { task: "Begin outreach to sports media sites for rev share / partnership", why: "A media partnership with a 50K+ follower site can accelerate affiliate signups dramatically.", done: false },
    ],
  },
];

// ── Marketing Channels ─────────────────────────────────────────────────────────
const marketingChannels = [
  {
    channel: "X (Twitter) / Sports Betting Community",
    icon: Hash,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    effort: "Low–Medium",
    cost: "Free",
    speed: "Medium (2–4 weeks to traction)",
    roi: "Very High",
    priority: 1,
    strategy: "Post weekly 'game breakdowns' showing how your 46-Factor Engine analyzed a matchup. Show your model's reasoning, not just the pick. Thread format, 5–10 posts, always end with 'Full analysis available at [your site]'.",
    tactics: [
      "Follow 50+ betting accounts: @SharpSide_co, @ActionNetworkHQ, @OddsJamApp, @PropSwap, prominent handicappers",
      "Engage authentically on others' posts before posting your own — build presence first",
      "Show real wins WITH the reasoning — not just 'WE WENT 5-0 TODAY'",
      "Pin a thread explaining your 46-factor model — makes new followers understand your edge",
      "Post injury report breakdowns — these get shared heavily in betting circles",
    ],
    kpi: "Aim for 1 paying signup per 100 engaged followers. 500 followers = 5 members minimum.",
    redFlags: "Never post guaranteed wins. Never post 'get rich quick.' Always include a disclaimer.",
  },
  {
    channel: "Reddit — r/sportsbook, r/sportsbetting, r/dfsports",
    icon: MessageSquare,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    effort: "Low",
    cost: "Free",
    speed: "Fast (days to weeks)",
    roi: "High",
    priority: 2,
    strategy: "Don't drop links. Make genuinely helpful posts about betting concepts, then mention you built a tool for this. The subreddit community is sharp — they detect promotion instantly. Add value first, mention the tool naturally.",
    tactics: [
      "Post 'I analyzed all 10,000 sims on tonight's Celtics game — here's what the model found' — data-heavy posts thrive",
      "Answer questions about parlays, EV, CLV with useful info, then mention your platform exists",
      "Do weekly 'model breakdown' posts on high-volume matchups",
      "Never use a brand-new account — build karma first (or use an established alt)",
    ],
    kpi: "One featured or upvoted post = 50–300 site visits. Top posts have driven 1,000+ visits to similar platforms.",
    redFlags: "Subreddit mods will ban you for obvious promotion. Be a community member, not a marketer.",
  },
  {
    channel: "Discord Betting Communities (outreach)",
    icon: Webhook,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    effort: "Medium",
    cost: "Free–$50 (gift Max access)",
    speed: "Medium (1–3 weeks per partnership)",
    roi: "Very High (niche audience)",
    priority: 3,
    strategy: "Find Discord servers with 500–10,000 members in the betting niche. Offer the server owner a free Max membership in exchange for an introduction post and access to the server. Niche audiences convert at 5–15x the rate of mass audiences.",
    tactics: [
      "Find servers through Disboard.org — search 'sports betting', 'picks', 'parlays'",
      "Reddit's r/sportsbook sidebar often has Discord links",
      "Approach the owner with: 'I built a 46-factor AI platform, here's a free Max account — if your members find value, here's a referral link'",
      "Offer to do a live Q&A in the server about sports betting analysis",
      "One 5,000-member betting Discord can drive 50–200 signups from a single intro post",
    ],
    kpi: "1 Discord partnership = 10–200 qualified signups depending on server engagement.",
    redFlags: "Don't spam. Don't post in servers without owner permission. One bad reputation in Discord circles spreads fast.",
  },
  {
    channel: "Email Marketing (your own list)",
    icon: Mail,
    color: "text-green-400",
    bg: "bg-green-500/10",
    effort: "Low",
    cost: "~$30/mo (Resend)",
    speed: "Fast (immediate reach)",
    roi: "Highest for conversions",
    priority: 4,
    strategy: "Email is 3–5x better converting than social for paid subscriptions. You already have Resend integrated. Every registered user is a lead. Build a 5-email welcome sequence and a weekly 'Edge Report' email.",
    tactics: [
      "Welcome email (Day 1): Show them 3 things only Sors can show them — confidence scores, EV, picks with grades",
      "Day 3 email: Share a recent win and explain why the model called it",
      "Day 7 email: 'Here's what members at your tier are using most'",
      "Weekly 'Edge Report': Top 3 model picks this week, free for all registered users — converts free → paid",
      "Monthly 'Best Sportsbook Promos' email: pure affiliate revenue driver",
    ],
    kpi: "30–40% open rate is excellent. 5–10% click rate. 1–3% conversion per email = solid.",
    redFlags: "Never buy email lists. Never send more than 3x/week. Always include unsubscribe link.",
  },
  {
    channel: "YouTube Betting Analysis",
    icon: Eye,
    color: "text-red-400",
    bg: "bg-red-500/10",
    effort: "High",
    cost: "Free (time + basic equipment)",
    speed: "Slow (3–12 months to scale)",
    roi: "Very High long-term",
    priority: 5,
    strategy: "Record yourself walking through how you analyzed a game using Sors. Real data, real thought process, real picks. Show the platform working. Long-form trust is the highest-converting content format. Compounds over 12+ months.",
    tactics: [
      "10-minute video: 'How I analyze tonight's NBA slate with AI' — show the platform live",
      "Title videos for search: 'NBA picks today' or 'Best bets tonight' — high search volume",
      "Include 'link in description' to the pricing page and sportsbook affiliate links",
      "Post once a week consistently — YouTube rewards consistency over virality",
      "Repurpose your best picks from the model as short-form clips for TikTok/Reels",
    ],
    kpi: "1,000 views = 5–15 signups for a sports betting platform. Compound effect — views accumulate forever.",
    redFlags: "YouTube's gambling advertising policy is strict. Don't make claims about guaranteed wins or 'sure things'.",
  },
  {
    channel: "SEO / Content Marketing",
    icon: Globe,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    effort: "High",
    cost: "Free (time) or $500–2K/mo for content writers",
    speed: "Slow (3–6 months for rankings)",
    roi: "High long-term (passive)",
    priority: 6,
    strategy: "Rank for sportsbook comparison terms and betting analysis keywords. 'Best sportsbook for parlays 2026', 'DraftKings promo code', 'NBA picks tonight AI' — these drive consistent high-intent affiliate and subscription traffic.",
    tactics: [
      "'DraftKings Promo Code' articles drive enormous affiliate traffic — write one for each major book",
      "'Best AI Sports Betting Tools 2026' — position Sors as the category leader",
      "Data-driven posts: 'We analyzed 10,000 NBA parlays — here's what we found' — viral potential",
      "Create a 'Track Record' page showing your model's verified win rate — SEO + trust signal",
      "Each piece of content should link to the pricing page and to affiliate offers",
    ],
    kpi: "A single top-ranked affiliate keyword page can drive $2,000–$10,000/mo in commissions.",
    redFlags: "SEO takes months. Don't expect results in 30 days. Consistency over 6+ months is required.",
  },
  {
    channel: "Paid Ads (Facebook / Instagram)",
    icon: Megaphone,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    effort: "High",
    cost: "$1,000+/mo minimum for meaningful results",
    speed: "Fast (but high risk)",
    roi: "Variable, often negative early on",
    priority: 7,
    strategy: "Only pursue paid ads after you've validated your organic funnel and reached $5K+ MRR. Meta has heavy restrictions on gambling-adjacent ads. You'll need careful ad copy that focuses on data and analysis, not picks or outcomes.",
    tactics: [
      "Wait until you have a 4-6% email conversion rate proven organically — then test paid",
      "Target: Sports bettors 25–45, male, interested in DraftKings/FanDuel/sports analytics",
      "Ad creative: Show the platform, show the data, show the track record — not the picks",
      "Start with $500/mo test budget. Measure cost per acquisition before scaling.",
    ],
    kpi: "Target CAC under $50 for Sharp tier, under $150 for Max. If CAC exceeds LTV payback period, pause.",
    redFlags: "Facebook/Instagram frequently ban gambling-adjacent ad accounts without warning. Have a backup strategy.",
  },
];

// ── Financial projections ─────────────────────────────────────────────────────
const financialScenarios = [
  {
    label: "Month 3 — Early Traction",
    scenario: "50 subscribers + 5 affiliate deals active",
    subscriptions: "$3,920",
    affiliates: "$1,500",
    community: "$0",
    total: "$5,420",
    notes: "Break-even point for a solo operator. Covers API costs, Stripe fees, and your time.",
  },
  {
    label: "Month 6 — Growth Phase",
    scenario: "150 subscribers + full affiliate program",
    subscriptions: "$12,750",
    affiliates: "$6,000",
    community: "$2,000",
    total: "$20,750",
    notes: "Meaningful income. Reinvest 30% into content/ads to accelerate growth.",
  },
  {
    label: "Month 12 — Scale",
    scenario: "400 subscribers + 5 community operators + strong affiliates",
    subscriptions: "$34,800",
    affiliates: "$18,000",
    community: "$9,975",
    total: "$62,775",
    notes: "Full-time business. At this stage, explore enterprise deals and white-label licensing.",
  },
  {
    label: "Year 2 — Business",
    scenario: "1,000 subscribers + 20 community operators + enterprise",
    subscriptions: "$89,000",
    affiliates: "$40,000",
    community: "$19,950",
    total: "$148,950",
    notes: "Six-figure/month revenue. Hire a content creator, a customer success person, and an affiliate manager.",
  },
];

export default function AdminMonetization() {
  useSEO({ title: "Revenue Intelligence", description: "Complete monetization playbook for Sors Maxima" });
  const [, setLocation] = useLocation();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const priorityColor = (p: string) => {
    if (p === "critical") return "text-red-400 bg-red-500/10 border-red-500/20";
    if (p === "high") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  };

  const priorityLabel = (p: string) => {
    if (p === "critical") return "Critical";
    if (p === "high") return "High";
    return "Medium";
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Revenue Intelligence Center</h1>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border">Owner Only</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Every way Sors Maxima makes money — with step-by-step execution playbooks for each</p>
          </div>
        </div>

        {/* Revenue Summary Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-emerald-300">The Big Picture</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Most platforms like this rely entirely on subscriptions. Sors Maxima has <strong className="text-foreground">6 distinct revenue streams</strong> that can run simultaneously.
                Your biggest untapped opportunity is <strong className="text-foreground">sportsbook affiliate commissions</strong> — a bettor who signs up for DraftKings through your link earns you $100–$300 the moment they make their first deposit.
                With an audience of serious bettors, this can easily match or exceed your subscription revenue.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><DollarSign className="w-3 h-3 text-emerald-400" /> Subscriptions: $49–$1,200+/mo per member</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Link2 className="w-3 h-3 text-blue-400" /> Affiliates: $50–$400 per sportsbook sign-up</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="w-3 h-3 text-green-400" /> Rev Share: 20–35% of referred player wagers ongoing</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3 text-indigo-400" /> Community: $499/mo per Discord operator</div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="streams" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="streams" data-testid="tab-streams"><DollarSign className="w-3 h-3 mr-1.5" />Revenue Streams</TabsTrigger>
            <TabsTrigger value="affiliates" data-testid="tab-affiliates"><Link2 className="w-3 h-3 mr-1.5" />Sportsbook Affiliates</TabsTrigger>
            <TabsTrigger value="roadmap" data-testid="tab-roadmap"><Calendar className="w-3 h-3 mr-1.5" />Execution Roadmap</TabsTrigger>
            <TabsTrigger value="marketing" data-testid="tab-marketing"><Megaphone className="w-3 h-3 mr-1.5" />Marketing Arsenal</TabsTrigger>
            <TabsTrigger value="financials" data-testid="tab-financials"><BarChart3 className="w-3 h-3 mr-1.5" />Financial Model</TabsTrigger>
          </TabsList>

          {/* ── Revenue Streams ─────────────────────────────────────────────── */}
          <TabsContent value="streams" className="space-y-4">
            <p className="text-sm text-muted-foreground">Six revenue streams ranked by monthly potential. Activate them in order — each one builds on the last.</p>
            <div className="space-y-4">
              {revenueStreams.map((stream) => {
                const Icon = stream.icon;
                return (
                  <Card key={stream.id} className={`border ${stream.border}`} data-testid={`card-stream-${stream.id}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className={`w-10 h-10 rounded-xl ${stream.bg} border ${stream.border} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${stream.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-black px-1.5">#{stream.rank}</Badge>
                            <h3 className="font-bold text-base">{stream.name}</h3>
                            <Badge variant="outline" className="text-xs">{stream.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{stream.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-base font-bold ${stream.color}`}>{stream.potential}</div>
                          <div className="text-xs text-muted-foreground">{stream.timeToFirst}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How to Activate</p>
                          <ul className="space-y-1.5">
                            {stream.tactics.map((t, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <ChevronRight className={`w-3.5 h-3.5 ${stream.color} shrink-0 mt-0.5`} />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Model</p>
                          <div className="space-y-2">
                            {stream.monthlyModel.map((m, i) => (
                              <div key={i} className={`flex items-center justify-between text-sm p-2.5 rounded-lg ${stream.bg} border ${stream.border}`}>
                                <span className="text-muted-foreground text-xs">{m.label}</span>
                                <span className={`font-bold text-sm ${stream.color}`}>{m.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Sportsbook Affiliates ──────────────────────────────────────── */}
          <TabsContent value="affiliates" className="space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-blue-300">Why This Is Your Biggest Opportunity</p>
                  <p className="text-muted-foreground">The US sports betting market opened in 2018 and is now a $15B/year industry. Sportsbooks spend $50–$400 acquiring each new customer because player LTV is enormous. As an affiliate, you're their acquisition channel — you earn the CPA when someone you refer deposits. With an audience of engaged bettors, you are the ideal affiliate. Most competitors haven't touched this revenue stream.</p>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <span className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> No inventory to manage</span>
                    <span className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Payment on first deposit only (CPA)</span>
                    <span className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Or ongoing % of player losses (Rev Share)</span>
                    <span className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Legal in most states — just disclose</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {affiliatePrograms.map((prog) => (
                <Card key={prog.name} className="overflow-hidden" data-testid={`card-affiliate-${prog.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4 border-b">
                      <div className={`w-10 h-10 rounded-lg ${prog.color} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                        {prog.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold">{prog.name}</h3>
                          <Badge className={`${prog.tierColor} text-white text-xs border-0`}>{prog.tier}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{prog.bestFor}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-emerald-400">{prog.cpa} CPA</div>
                        <div className="text-xs text-muted-foreground">{prog.revShare}</div>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Deal Structure</p>
                          <p className="text-sm font-medium">{prog.deal}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Payout</p>
                          <p className="text-sm">{prog.payout}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Cookie Duration</p>
                          <p className="text-sm">{prog.cookie}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Apply At</p>
                          <p className="text-sm font-mono text-blue-400 break-all">{prog.applyUrl}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{prog.notes}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">How to Apply — Step by Step</p>
                        <ol className="space-y-1.5">
                          {prog.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Compliance warning */}
            <Card className="border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-300 text-sm">Compliance Requirements — Read This First</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        "FTC requires disclosing affiliate relationships: 'We may earn a commission if you sign up through our links'",
                        "Must include 'Must be 21+' and responsible gambling notice on all affiliate pages",
                        "Never claim guaranteed wins or specific ROI on pages with affiliate links",
                        "Online sports betting is not legal in every US state — your pages should note this",
                        "Most sportsbooks require you only promote in states where they're licensed",
                        "Keep records of all affiliate agreements — treat them as business contracts",
                      ].map((rule, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          {rule}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Execution Roadmap ──────────────────────────────────────────── */}
          <TabsContent value="roadmap" className="space-y-4">
            <p className="text-sm text-muted-foreground">A sequential 12-week plan to activate all revenue streams. Check off items as you complete them.</p>
            <div className="space-y-4">
              {roadmapWeeks.map((phase, phaseIdx) => {
                const completedCount = phase.tasks.filter((_, i) => checkedItems.has(`${phaseIdx}-${i}`)).length;
                const pct = Math.round((completedCount / phase.tasks.length) * 100);
                return (
                  <Card key={phaseIdx} data-testid={`card-phase-${phaseIdx}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs border ${priorityColor(phase.priority)}`}>
                              {priorityLabel(phase.priority)}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">{phase.week}</span>
                          </div>
                          <h3 className="font-bold mt-1">{phase.title}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-muted-foreground">{completedCount}/{phase.tasks.length} done</div>
                          <Progress value={pct} className="w-24 h-2 mt-1" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {phase.tasks.map((item, itemIdx) => {
                          const key = `${phaseIdx}-${itemIdx}`;
                          const done = checkedItems.has(key);
                          return (
                            <button
                              key={itemIdx}
                              className="w-full flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 text-left transition-colors"
                              onClick={() => toggleItem(key)}
                              data-testid={`check-item-${key}`}
                            >
                              {done
                                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                              }
                              <div className="min-w-0">
                                <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{item.task}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.why}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Marketing Arsenal ─────────────────────────────────────────── */}
          <TabsContent value="marketing" className="space-y-4">
            <p className="text-sm text-muted-foreground">Seven channels ranked by priority. Work them in order — free organic channels first, paid last.</p>
            <div className="space-y-4">
              {marketingChannels.map((ch) => {
                const Icon = ch.icon;
                return (
                  <Card key={ch.channel} data-testid={`card-channel-${ch.priority}`}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className={`w-10 h-10 rounded-xl ${ch.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${ch.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-black px-1.5">#{ch.priority}</Badge>
                            <h3 className="font-bold text-sm">{ch.channel}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ch.strategy}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-xs text-muted-foreground">Cost:</span>
                            <Badge variant="secondary" className="text-xs">{ch.cost}</Badge>
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-xs text-muted-foreground">ROI:</span>
                            <span className={`text-xs font-bold ${ch.color}`}>{ch.roi}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{ch.speed}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Specific Tactics</p>
                          <ul className="space-y-1">
                            {ch.tactics.map((t, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <ChevronRight className={`w-3 h-3 ${ch.color} shrink-0 mt-0.5`} />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">KPI Benchmarks</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{ch.kpi}</p>
                          </div>
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                            <p className="text-xs text-amber-400 font-medium">Red Flags</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ch.redFlags}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Financial Model ───────────────────────────────────────────── */}
          <TabsContent value="financials" className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Combined revenue projections across all streams. These are conservative real-world estimates based on comparable platforms.</p>

              <div className="space-y-3">
                {financialScenarios.map((s, i) => (
                  <Card key={i} className={i === 3 ? "border-emerald-500/30" : ""} data-testid={`card-scenario-${i}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-bold text-sm">{s.label}</h3>
                          <p className="text-xs text-muted-foreground">{s.scenario}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-emerald-400">{s.total}</div>
                          <div className="text-xs text-muted-foreground">combined monthly</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2.5 rounded-lg bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-0.5">Subscriptions</div>
                          <div className="font-bold text-sm">{s.subscriptions}</div>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-blue-500/10">
                          <div className="text-xs text-muted-foreground mb-0.5">Affiliates</div>
                          <div className="font-bold text-sm text-blue-400">{s.affiliates}</div>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-indigo-500/10">
                          <div className="text-xs text-muted-foreground mb-0.5">Community B2B</div>
                          <div className="font-bold text-sm text-indigo-400">{s.community}</div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-muted p-2.5">
                        <p className="text-xs text-muted-foreground">{s.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Key financial principles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" /> Key Financial Principles for This Business</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      title: "Your gross margin is ~85%",
                      body: "Your costs are: API fees (~$200–500/mo), Replit hosting (~$25–50/mo), Stripe fees (2.9%), email/Resend (~$30/mo), and your time. Virtually no COGS. This is exceptional — most SaaS margins are 70–80%. Every dollar of revenue is mostly profit.",
                      icon: TrendingUp, color: "text-emerald-400",
                    },
                    {
                      title: "CAC should be under $50 for your first 100 members",
                      body: "If you're getting members through organic channels (Reddit, Discord, Twitter), your Customer Acquisition Cost is near zero. Even with referral perks (1 month free = ~$49 cost), you're at $49 CAC for a member worth $200–$500 LTV. That's a 4–10x LTV/CAC ratio — exceptional for any SaaS.",
                      icon: Target, color: "text-blue-400",
                    },
                    {
                      title: "Churn is your biggest financial risk",
                      body: "If 10% of your members cancel every month, you need 10% new members just to stay flat. Focus obsessively on reducing churn: weekly value emails, pick accuracy updates, and new features. Every 1% reduction in monthly churn adds hundreds of dollars of LTV per member.",
                      icon: AlertTriangle, color: "text-amber-400",
                    },
                    {
                      title: "Affiliate income can front-run your subscription revenue",
                      body: "A bettor who signs up for DraftKings through your link earns you $150–$300 in the same month. You don't need to wait for subscription MRR to build. Affiliate commissions can fund your ad spend and content creation before subscriptions reach $10K/mo.",
                      icon: Zap, color: "text-yellow-400",
                    },
                    {
                      title: "The Community plan multiplies revenue per relationship",
                      body: "One Discord operator at $499/mo is worth 10 Sharp subscribers. They also bring their members — each one potentially becomes a subscriber. A 500-member Discord server with 5% conversion = 25 new Sharp subscribers = $1,225/mo in additional subscription revenue from one B2B relationship.",
                      icon: Users, color: "text-indigo-400",
                    },
                    {
                      title: "When to hire",
                      body: "At $15K/mo: hire a part-time content creator to run your Twitter and YouTube. At $30K/mo: hire a customer success person to reduce churn — a 1% churn reduction at 500 members is worth $445/mo retained. At $60K/mo: hire an affiliate manager to maximize your book program commissions.",
                      icon: Award, color: "text-purple-400",
                    },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                        <Icon className={`w-5 h-5 ${item.color} shrink-0 mt-0.5`} />
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

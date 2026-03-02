import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/use-seo";
import {
  Rocket, CheckCircle2, Circle, AlertTriangle, TrendingUp, Users,
  DollarSign, Clock, Shield, BarChart3, Target, MessageSquare,
  Calendar, BookOpen, Zap, ArrowRight, ChevronRight, Info,
  Mail, Heart, RefreshCw, Star, Eye, Lock, Scale, Megaphone,
  Hash, UserCheck, CreditCard, Activity, Award, Flame
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CheckItem {
  id: string;
  label: string;
  detail: string;
  priority: "critical" | "high" | "medium";
  done: boolean;
}

interface Phase {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  color: string;
  items: CheckItem[];
}

// ── Launch Phase Data ──────────────────────────────────────────────────────────
const phases: Phase[] = [
  {
    id: "pre",
    title: "Phase 1 — Before You Announce",
    subtitle: "Get the foundation right before a single user signs up.",
    duration: "1–2 weeks before launch",
    color: "text-amber-400",
    items: [
      { id: "stripe-live", label: "Switch Stripe to Live Mode", detail: "Go to Stripe dashboard → toggle from Test → Live. Without this, no real payments process.", priority: "critical", done: false },
      { id: "domain", label: "Point a real domain to the app", detail: "yoursite.com looks far more credible than a .replit.app URL. Namecheap or Google Domains, ~$12/yr.", priority: "critical", done: false },
      { id: "disclaimer", label: "Add a clear legal disclaimer", detail: "Every page visible to users must say: 'Sors Maxima is for informational and entertainment purposes only. We do not provide financial or gambling advice.' This is non-negotiable.", priority: "critical", done: false },
      { id: "email-domain", label: "Send emails from your real domain", detail: "hello@yourdomain.com is far more trustworthy than a generic address. Set up Resend with your domain's DNS records.", priority: "high", done: false },
      { id: "privacy-tos", label: "Publish a Privacy Policy and Terms of Service", detail: "Use termly.io or similar. Free, covers GDPR and CCPA. Without this, you have legal exposure.", priority: "critical", done: false },
      { id: "cancel-flow", label: "Test the full cancel/refund flow", detail: "Know exactly what happens when a user cancels. Does their access stop immediately? End of billing period? Write it in your ToS.", priority: "high", done: false },
      { id: "test-pick", label: "Do a full dry run as a real user", detail: "Create a Sharp account yourself and go through the full experience. You'll catch broken flows before real users do.", priority: "high", done: false },
      { id: "backup", label: "Set up database backups", detail: "Your PostgreSQL data (users, picks, history) should back up daily. Replit databases include backups, but verify the retention period.", priority: "high", done: false },
      { id: "social-handles", label: "Secure social media handles", detail: "Get @sorsmaxima (or your handle) on X/Twitter and Instagram before anyone else does. Free, takes 5 minutes.", priority: "medium", done: false },
      { id: "refund-policy", label: "Write a refund policy", detail: "Recommended: 7-day money-back guarantee for Sharp, no refunds after access to Edge/Max picks. State this clearly.", priority: "high", done: false },
    ],
  },
  {
    id: "launch",
    title: "Phase 2 — Launch Week",
    subtitle: "Your first 7 days set the tone. Here's a realistic daily plan.",
    duration: "Days 1–7",
    color: "text-primary",
    items: [
      { id: "day1-soft", label: "Day 1: Soft launch to trusted people only", detail: "Do NOT announce publicly yet. Give access to 3–5 trusted people (friends, family, one person from a betting community). Ask for honest feedback on what's confusing.", priority: "critical", done: false },
      { id: "day2-feedback", label: "Day 2–3: Fix the top 3 issues from feedback", detail: "There will always be something. A confusing button, a page that breaks on mobile, a term no one understands. Fix the top 3 before announcing publicly.", priority: "critical", done: false },
      { id: "day4-post", label: "Day 4: Make your first public post", detail: "On X/Twitter: 'I built a sports betting intelligence platform. Not tips. Not touts. Data analysis for serious bettors. Sharp tier is $49/mo. Here's what it does: [link]' — Keep it honest, no hype.", priority: "high", done: false },
      { id: "day5-reddit", label: "Day 5: Post in r/sportsbook and r/sportsbetting", detail: "Don't spam. Make a genuine, informative post about the data you track and the track record page. Link your site. Reddit can drive significant organic traffic.", priority: "high", done: false },
      { id: "day6-email", label: "Day 6: Email your first 5 members personally", detail: "Not automated. A real email. 'Hi [name], I'm Jeffrey, I built Sors Maxima. How's your experience so far? Anything confusing?' This is how you build loyalty early.", priority: "high", done: false },
      { id: "day7-metrics", label: "Day 7: Review your first week metrics", detail: "How many signups? How many Sharp subscriptions? What's the conversion rate from landing page to signup? What do logs show users are clicking? Adjust your messaging accordingly.", priority: "medium", done: false },
    ],
  },
  {
    id: "post",
    title: "Phase 3 — First 90 Days",
    subtitle: "Survival, learning, and locking in your first real members.",
    duration: "Days 8–90",
    color: "text-emerald-400",
    items: [
      { id: "first10", label: "Get to 10 paying members before optimizing anything", detail: "Don't waste time on redesigns or new features until you have 10 people paying. Real users tell you what matters. Until then, everything is a guess.", priority: "critical", done: false },
      { id: "churn-watch", label: "Watch for the Day 30 churn spike", detail: "Most SaaS products lose 20–40% of users in month 1. This is normal. Track who cancels and email them asking one question: 'What would have made you stay?'", priority: "critical", done: false },
      { id: "content", label: "Post betting analysis content weekly", detail: "A weekly X/Twitter thread breaking down one game using your data builds credibility and drives organic sign-ups. Show the tool working — don't just market it.", priority: "high", done: false },
      { id: "upgrade-path", label: "Push Sharp → Edge upgrades at 30 days", detail: "At day 30, email every Sharp member: 'You've been with us a month. Here's what you're missing in Edge: [3 specific features]. Upgrade for $50 more/mo.' Be specific, not vague.", priority: "high", done: false },
      { id: "community", label: "Build a Discord or group for members", detail: "A private Discord channel for Sharp/Edge/Max members creates retention. Members who feel community tend to stay 2–3x longer. It's free to set up.", priority: "medium", done: false },
      { id: "testimonials-real", label: "Collect real testimonials by day 60", detail: "Email 5 active members: 'Would you write 2 sentences about your experience? I'll feature it on the site.' Real social proof converts far better than anything else.", priority: "high", done: false },
    ],
  },
];

// ── Operations Data ────────────────────────────────────────────────────────────
const opsSchedule = [
  {
    frequency: "Every Day",
    icon: Calendar,
    color: "text-primary",
    tasks: [
      { task: "Check that picks went out", why: "If the pick engine failed overnight, users will be unhappy. Takes 30 seconds to verify in your picks page." },
      { task: "Scan for any app errors", why: "Check the App Guardian or server logs. One silent error can break the experience for new users." },
      { task: "Review new applications", why: "Edge/Max applicants expect a response within 24–48 hours. Slow approvals hurt conversion." },
      { task: "Reply to any user emails", why: "Fast, personal support is your biggest competitive advantage over large betting services." },
    ],
  },
  {
    frequency: "Every Week",
    icon: RefreshCw,
    color: "text-amber-400",
    tasks: [
      { task: "Review your MRR (Monthly Recurring Revenue)", why: "This is your north star. If it grows, you're doing something right. If it shrinks, find out why." },
      { task: "Check API budget remaining", why: "You have a limited Odds API quota. Running out mid-month kills your edge detection features." },
      { task: "Look at what users are clicking", why: "Your analytics dashboard shows what features get used. Double down on what's popular. Cut what isn't." },
      { task: "Post one piece of betting analysis content", why: "Organic content is your cheapest acquisition channel. One good X/Twitter thread can drive 5–10 signups." },
      { task: "Check pick accuracy stats", why: "Your track record page is your credibility. Know your current win rate cold — you'll be asked about it." },
    ],
  },
  {
    frequency: "Every Month",
    icon: BarChart3,
    color: "text-emerald-400",
    tasks: [
      { task: "Calculate your churn rate", why: "Churn = (Cancelled this month / Total at start of month) × 100. Healthy SaaS churn is under 5% monthly." },
      { task: "Review and update your pricing page", why: "Test small copy changes. 'Join 200+ members' hits differently when it's accurate and growing." },
      { task: "Email inactive members", why: "Members who haven't logged in for 14+ days are likely to cancel. A personal email can re-engage 10–20% of them." },
      { task: "Check your Stripe payouts", why: "Make sure your bank account is correctly connected and payouts are landing. Don't assume." },
      { task: "Review your disclaimer and legal pages", why: "Laws around gambling adjacent services change. Make sure your disclaimer is still accurate and visible." },
    ],
  },
];

// ── Growth Channels Data ───────────────────────────────────────────────────────
const growthChannels = [
  {
    channel: "X (Twitter) Betting Community",
    difficulty: "Medium",
    speed: "Medium",
    cost: "Free",
    icon: Hash,
    strategy: "Follow and engage with accounts like @SharpSide_co, @ActionNetwork, popular betting analysts. Post weekly breakdowns of matchups using your data. Genuine value drives follows. Followers become members.",
    metric: "Aim for 1 signup per 100 engaged followers",
  },
  {
    channel: "Reddit — r/sportsbook & r/sportsbetting",
    difficulty: "Low",
    speed: "Fast",
    cost: "Free",
    icon: MessageSquare,
    strategy: "Don't spam. Make genuinely helpful posts about betting concepts, then mention your tool as something you built. The community can detect promotion instantly — be authentic.",
    metric: "One good post can drive 50–200 site visits",
  },
  {
    channel: "YouTube Betting Analysis",
    difficulty: "High",
    speed: "Slow",
    cost: "Free (time)",
    icon: Eye,
    strategy: "Record yourself walking through how you analyzed a game using the platform. Show real data, real thought process. Long-form video builds the deepest trust. Compound effect over 6–12 months.",
    metric: "1,000 views typically drives 5–15 signups",
  },
  {
    channel: "Private Discord / Community Partnerships",
    difficulty: "Medium",
    speed: "Medium",
    cost: "Free–$100",
    icon: Users,
    strategy: "Find betting Discord servers with 500–5,000 members. Offer the owner a free Max membership in exchange for a post. Niche audiences convert far better than mass audiences.",
    metric: "1 quality Discord can drive 10–50 members",
  },
  {
    channel: "Referral System (already built)",
    difficulty: "Low",
    speed: "Fast",
    cost: "Free",
    icon: UserCheck,
    strategy: "Offer Sharp members one month free if they refer someone who subscribes. You already have the referral system built. Activate it. Word-of-mouth from happy members is your most credible channel.",
    metric: "Good programs drive 20–30% of new signups",
  },
  {
    channel: "Paid Ads (Facebook/Instagram)",
    difficulty: "High",
    speed: "Fast",
    cost: "$500+/mo",
    icon: Megaphone,
    strategy: "Honest warning: paid ads for gambling-adjacent products face heavy restrictions on Facebook and Google. Platform policies frequently ban these ads. Focus organic channels first. Only test paid after $5,000 MRR.",
    metric: "High risk / variable return — start last",
  },
];

// ── Metrics Data ───────────────────────────────────────────────────────────────
const metricCards = [
  {
    name: "Monthly Recurring Revenue (MRR)",
    formula: "(# Sharp members × $49) + (# Edge members × $99) + (# Max members × $249)",
    healthy: "Growing month over month",
    warning: "Flat for 2+ months",
    danger: "Declining 2 consecutive months",
    why: "This is the health of your business, full stop. Everything else is a proxy.",
    icon: DollarSign,
    color: "text-emerald-400",
  },
  {
    name: "Monthly Churn Rate",
    formula: "(Cancellations this month ÷ Total members at start of month) × 100",
    healthy: "Under 5%",
    warning: "5–10%",
    danger: "Over 10%",
    why: "High churn means users aren't getting value. Fix the product before scaling acquisition.",
    icon: TrendingUp,
    color: "text-amber-400",
  },
  {
    name: "Customer Lifetime Value (LTV)",
    formula: "Average monthly revenue per member ÷ Monthly churn rate",
    healthy: "Over $200 (Sharp avg)",
    warning: "$100–200",
    danger: "Under $100",
    why: "If your LTV is low, paid acquisition will never work. Focus on retention first.",
    icon: Award,
    color: "text-primary",
  },
  {
    name: "Landing Page Conversion Rate",
    formula: "(Signups ÷ Unique visitors) × 100",
    healthy: "Over 3%",
    warning: "1–3%",
    danger: "Under 1%",
    why: "Low conversion means your messaging isn't landing. Test one change at a time.",
    icon: Target,
    color: "text-blue-400",
  },
  {
    name: "Pick Accuracy (Win Rate)",
    formula: "Wins ÷ Total settled picks × 100 (track all sports separately)",
    healthy: "Over 52.4% (profitable against -110 lines)",
    warning: "50–52.4%",
    danger: "Under 50%",
    why: "Your pick accuracy is your product's core claim. Monitor it weekly. Be honest if it dips.",
    icon: Activity,
    color: "text-violet-400",
  },
  {
    name: "Daily Active Rate",
    formula: "Users who logged in today ÷ Total active members",
    healthy: "Over 40% for Max, 20%+ for Sharp",
    warning: "10–20%",
    danger: "Under 10%",
    why: "Low daily activity predicts cancellation. Send re-engagement emails to users inactive 7+ days.",
    icon: Flame,
    color: "text-orange-400",
  },
];

// ── Legal Risk Items ───────────────────────────────────────────────────────────
const legalItems = [
  {
    icon: Scale,
    title: "You are NOT a licensed gambling operator",
    severity: "critical",
    detail: "Sors Maxima sells data analysis and intelligence tools — NOT gambling services. Your pricing, marketing, and communications must never imply you are picking winners for profit or running a tout service. The moment you promise profit, you enter legally murky territory.",
    action: "Review all your marketing copy right now and remove any 'guaranteed wins' or 'profit' language.",
  },
  {
    icon: Lock,
    title: "Display disclaimers everywhere, not just Terms of Service",
    severity: "critical",
    detail: "Your legal disclaimer must appear on the landing page, in pick displays, in emails, and in the app footer. Burying it in Terms of Service is not enough and won't protect you.",
    action: "Add a 1-sentence disclaimer to your app's global footer and landing page hero section.",
  },
  {
    icon: Shield,
    title: "GDPR and CCPA — You collect personal data",
    severity: "high",
    detail: "You store email addresses, IP addresses, betting history, and payment info. Under GDPR (EU) and CCPA (California), users have the right to request deletion of their data. You need a process for this.",
    action: "Add a 'Request Data Deletion' option to the Settings page. Email handle it manually for now.",
  },
  {
    icon: Heart,
    title: "Responsible Gambling messaging is expected",
    severity: "high",
    detail: "Reputable betting platforms include problem gambling resources. Include a visible link to ncpgambling.org or 1-800-GAMBLER in your footer. This is both ethical and helps with platform trust signals.",
    action: "Add responsible gambling link to footer with the national helpline number.",
  },
  {
    icon: CreditCard,
    title: "Chargebacks will happen — have a process",
    severity: "high",
    detail: "Some users will file chargebacks instead of cancelling. Each chargeback costs you the revenue plus a $15–25 Stripe dispute fee. A clear refund policy and responsive support dramatically reduce this.",
    action: "Set up a basic email support flow so users can contact you before disputing with their bank.",
  },
  {
    icon: Info,
    title: "Intellectual Property — Your picks are your IP",
    severity: "medium",
    detail: "Your Terms of Service should prohibit users from screenshotting and sharing your picks in public groups. This is common in the industry and protects the exclusivity of your Edge/Max tiers.",
    action: "Add a clause to ToS: 'Members may not publicly share platform-generated picks or analysis.'",
  },
];

// ── Retention Tactics ──────────────────────────────────────────────────────────
const retentionTactics = [
  {
    tactic: "Send a win notification when a pick hits",
    impact: "High",
    effort: "Low",
    detail: "When a tracked pick settles as a win, send a push/email notification: 'Your Edge pick on [team] just hit! +[units].' This creates a dopamine loop tied to your platform.",
  },
  {
    tactic: "Weekly 'Best Bets' digest email",
    impact: "High",
    effort: "Low",
    detail: "Every Sunday, send members a 2-minute email summary of your top picks for the week. This creates a habit loop. Members who open weekly emails churn at half the rate of those who don't.",
  },
  {
    tactic: "Show members their personal stats over time",
    impact: "High",
    effort: "Medium",
    detail: "'You've tracked 47 picks. Your personal win rate: 56.3%. Your best sport: NBA (+12 units).' Personal data creates ownership and attachment to the platform.",
  },
  {
    tactic: "Upgrade incentive at 90 days",
    impact: "Medium",
    effort: "Low",
    detail: "At day 90 of Sharp, offer one month of Edge free as a trial: 'Try Edge free this month — no commitment.' Converting 20% of Sharp to Edge triples that user's LTV.",
  },
  {
    tactic: "Exclusive content for Max tier only",
    impact: "High",
    effort: "Medium",
    detail: "Max members should feel distinctly different. Monthly 1-on-1 analysis calls, exclusive early access to new features, first to see weekly power ratings. Make $249/mo feel worth it.",
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminOwnerPlaybook() {
  useSEO({ title: "Owner's Playbook | Admin", description: "Business strategy and operations guide for Sors Maxima." });

  const [completedItems, setCompletedItems] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem("playbook-completed") || "[]"))
  );

  const { data: adminData } = useQuery<{ totalUsers: number; totalRevenue: number }>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const toggleItem = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("playbook-completed", JSON.stringify([...next]));
      return next;
    });
  };

  const allLaunchItems = phases.flatMap(p => p.items);
  const completedCount = allLaunchItems.filter(i => completedItems.has(i.id)).length;
  const completionPct = Math.round((completedCount / allLaunchItems.length) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Owner's Playbook</h1>
            <p className="text-muted-foreground mt-1">
              Honest, practical guidance for running Sors Maxima — written for a first-time platform owner.
            </p>
          </div>
        </div>

        {/* Launch Progress Bar */}
        <Card className="border-primary/20 bg-primary/5 mb-6">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Launch Readiness</span>
              </div>
              <span className="text-sm font-bold text-primary">{completionPct}% complete</span>
            </div>
            <Progress value={completionPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedCount} of {allLaunchItems.length} launch items checked off. Progress saves automatically.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="launch">
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="launch" className="gap-1.5"><Rocket className="w-3.5 h-3.5" />Launch Plan</TabsTrigger>
            <TabsTrigger value="ops" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />Daily Operations</TabsTrigger>
            <TabsTrigger value="growth" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Growth Strategy</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Key Metrics</TabsTrigger>
            <TabsTrigger value="legal" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Legal & Risk</TabsTrigger>
          </TabsList>

          {/* ── LAUNCH PLAN ── */}
          <TabsContent value="launch" className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Honest advice before you start</p>
                <p className="text-sm text-amber-200/70 mt-1">
                  Most first-time app owners launch too early or too late. The goal is to launch with just enough — not perfect. Check off the Critical items, then ship. You can fix Medium items after your first paying customers.
                </p>
              </div>
            </div>

            {phases.map(phase => {
              const phaseDone = phase.items.filter(i => completedItems.has(i.id)).length;
              const phasePct = Math.round((phaseDone / phase.items.length) * 100);
              return (
                <Card key={phase.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className={`text-base ${phase.color}`}>{phase.title}</CardTitle>
                        <CardDescription className="mt-1">{phase.subtitle}</CardDescription>
                      </div>
                      <Badge variant="outline" className="shrink-0 ml-4 text-xs">
                        <Clock className="w-3 h-3 mr-1" />{phase.duration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Progress value={phasePct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{phaseDone}/{phase.items.length}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {phase.items.map(item => {
                      const done = completedItems.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-border/40 hover:bg-muted/50"
                          }`}
                          data-testid={`checklist-item-${item.id}`}
                        >
                          {done
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            : <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {item.label}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 shrink-0 ${
                                  item.priority === "critical"
                                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                                    : item.priority === "high"
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                }`}
                              >
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── DAILY OPERATIONS ── */}
          <TabsContent value="ops" className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Running a SaaS is a job, not a project</p>
                <p className="text-sm text-blue-200/70 mt-1">
                  Building was the creative part. Operating requires consistent, boring discipline. Most platforms fail not from bad code, but from owners who stop showing up. These are the tasks that keep it alive.
                </p>
              </div>
            </div>

            {opsSchedule.map(schedule => (
              <Card key={schedule.frequency} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <schedule.icon className={`w-4 h-4 ${schedule.color}`} />
                    <CardTitle className={`text-base ${schedule.color}`}>{schedule.frequency}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedule.tasks.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.task}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.why}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Common First-Year Mistakes to Avoid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Adding features instead of fixing retention — more features don't fix a leaky bucket",
                  "Ignoring churn — one cancellation tells you more than 10 sign-ups",
                  "Changing prices constantly — set them, test for 90 days, then adjust",
                  "Not responding to user emails within 24 hours — support IS the product for early-stage",
                  "Building in public before you have 20 members — perfect your message with real users first",
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{m}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── GROWTH STRATEGY ── */}
          <TabsContent value="growth" className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-300">The honest truth about growth</p>
                <p className="text-sm text-emerald-200/70 mt-1">
                  Your first 100 members will come from direct effort, not algorithms. Identify where serious bettors spend time online, show up there with genuine value, and convert a small fraction. Repeat. There is no shortcut.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {growthChannels.map(ch => (
                <Card key={ch.channel} className="border-border/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                        <ch.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-foreground">{ch.channel}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[10px] h-4">Difficulty: {ch.difficulty}</Badge>
                            <Badge variant="outline" className="text-[10px] h-4">Speed: {ch.speed}</Badge>
                            <Badge variant="outline" className="text-[10px] h-4">Cost: {ch.cost}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{ch.strategy}</p>
                        <p className="text-xs text-primary/80 mt-2 font-medium">📊 {ch.metric}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" /> Retention Tactics That Work
                </CardTitle>
                <CardDescription>Keeping members is 5× cheaper than acquiring new ones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {retentionTactics.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-foreground">{t.tactic}</span>
                        <Badge variant="outline" className={`text-[10px] h-4 ${t.impact === "High" ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}>
                          {t.impact} Impact
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-4">{t.effort} Effort</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KEY METRICS ── */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <BarChart3 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-300">Track fewer metrics, track them religiously</p>
                <p className="text-sm text-violet-200/70 mt-1">
                  New owners get overwhelmed by data. These six numbers are the only ones that matter in your first year. Know them every week. Everything else is noise until you're at $10k MRR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {metricCards.map(m => (
                <Card key={m.name} className="border-border/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <m.icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground mb-1">{m.name}</h3>
                        <div className="p-2 bg-muted/50 rounded text-xs font-mono text-muted-foreground mb-3">
                          {m.formula}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-muted-foreground">Healthy: <span className="text-foreground">{m.healthy}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-muted-foreground">Watch: <span className="text-foreground">{m.warning}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                            <span className="text-muted-foreground">Act now: <span className="text-foreground">{m.danger}</span></span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">"{m.why}"</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400">Quick Revenue Calculator</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueCalculator />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LEGAL & RISK ── */}
          <TabsContent value="legal" className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <Shield className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">This is not legal advice</p>
                <p className="text-sm text-red-200/70 mt-1">
                  The items below are practical risk-reduction steps based on how similar platforms operate. If you scale beyond $5,000 MRR, consult an actual attorney familiar with online gambling laws in your jurisdiction.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {legalItems.map((item, i) => (
                <Card key={i} className={`border ${item.severity === "critical" ? "border-red-500/30" : item.severity === "high" ? "border-amber-500/30" : "border-border/50"}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        item.severity === "critical" ? "bg-red-500/10" : item.severity === "high" ? "bg-amber-500/10" : "bg-muted"
                      }`}>
                        <item.icon className={`w-4 h-4 ${
                          item.severity === "critical" ? "text-red-400" : item.severity === "high" ? "text-amber-400" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{item.title}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 ${
                            item.severity === "critical" ? "text-red-400 border-red-500/30" : item.severity === "high" ? "text-amber-400 border-amber-500/30" : ""
                          }`}>
                            {item.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                        <div className="flex items-start gap-1.5 mt-2 p-2 bg-muted/50 rounded">
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground font-medium">{item.action}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Useful Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "Termly — Privacy Policy & ToS Generator", url: "https://termly.io", detail: "Free tier covers basic needs. Creates GDPR-compliant policies." },
                  { name: "National Council on Problem Gambling", url: "https://ncpgambling.org", detail: "Link to this in your footer. Shows responsibility." },
                  { name: "Stripe Atlas — Business Formation", url: "https://stripe.com/atlas", detail: "If you haven't formed an LLC, consider it once you hit $500/mo." },
                  { name: "1-800-GAMBLER Helpline", url: "https://www.1800gambler.net", detail: "Include in footer: 'If you or someone you know has a gambling problem, call 1-800-GAMBLER.'" },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                    <Star className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Revenue Calculator ─────────────────────────────────────────────────────────
function RevenueCalculator() {
  const [sharp, setSharp] = useState(10);
  const [edge, setEdge] = useState(3);
  const [max, setMax] = useState(1);
  const mrr = sharp * 49 + edge * 99 + max * 249;
  const arr = mrr * 12;
  const avgLTV = mrr > 0 ? Math.round((mrr / (sharp + edge + max)) / 0.05) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sharp @ $49/mo", value: sharp, set: setSharp, color: "text-blue-400" },
          { label: "Edge @ $99/mo", value: edge, set: setEdge, color: "text-primary" },
          { label: "Max @ $249/mo", value: max, set: setMax, color: "text-amber-400" },
        ].map(({ label, value, set, color }) => (
          <div key={label} className="space-y-1">
            <label className={`text-xs font-medium ${color}`}>{label}</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => set(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full h-8 px-2 text-sm bg-background border border-border rounded text-foreground"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Monthly (MRR)</p>
          <p className="text-lg font-bold text-emerald-400">${mrr.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Annual (ARR)</p>
          <p className="text-lg font-bold text-foreground">${arr.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Est. Avg LTV</p>
          <p className="text-lg font-bold text-primary">${avgLTV.toLocaleString()}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">LTV estimated assuming 5% monthly churn. Adjust your member counts to model different scenarios.</p>
    </div>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

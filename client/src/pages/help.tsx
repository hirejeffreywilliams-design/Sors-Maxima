import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSEO } from "@/hooks/use-seo";
import {
  Zap, Calendar, Brain, Star, TrendingUp, Activity, Users,
  Calculator, Target, BarChart3, Layers, Shield, Search,
  ArrowRight, Clock, MapPin, HelpCircle, Lightbulb,
  DollarSign, BookOpen, Trophy, ChevronDown, ChevronUp,
  CheckCircle, Ticket, Eye, RefreshCw, Heart, Mail,
  Phone, ExternalLink, AlertTriangle,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

interface Feature {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  category: "start" | "edge" | "deep" | "track";
  path: string;
  pathLabel: string;
  why: string;
  when: string;
  where: string;
  how: string[];
  tips: string[];
  tags: string[];
}

const FEATURES: Feature[] = [
  {
    id: "command-center",
    name: "Command Center",
    tagline: "Pre-built AI parlay tickets — the best bets of today, assembled for you",
    icon: <Zap className="w-5 h-5" />,
    category: "start",
    path: "/",
    pathLabel: "Home / Picks (Zap icon in nav)",
    why: "Our engines analyze 46 data-backed factors — rest days, sharp money flow, line movement, weather, Sors simulations — and pre-build complete parlay tickets before you even open the app. You get the analysis output, not the raw data.",
    when: "Check first thing every morning. Tickets refresh every 5 minutes as new games and odds data arrive. Best to act early before the public moves lines.",
    where: "The home page — the first screen you land on after logging in. 'Today's Best Tickets' is the top section. Below it are Game Matchup Parlays covering all legs of specific games.",
    how: [
      "Open the home page (Zap icon in the nav)",
      "Browse the pre-built tickets — each shows a combined grade (A+ to F), total odds, Kelly-suggested stake, and payout",
      "Expand 'Game Matchup Parlays' to see full-game tickets with 10–20 legs",
      "Click 'Add All to Slip' on any ticket you want to bet",
      "Review in the Bet Slip on the right, enter your stake, and head to the sportsbook",
    ],
    tips: [
      "Tickets graded A or B+ are the system's highest-confidence plays — these converge across the most engines",
      "Check the engine convergence row (Sors Sim, Situational, Injury, Vegas, Market) — more green = stronger signal",
      "Game Matchup Parlays are great for high-value heavy days like NBA playoff nights",
    ],
    tags: ["tickets", "parlay", "ai", "picks", "daily", "home", "command center"],
  },
  {
    id: "daily-picks",
    name: "Daily Picks",
    tagline: "Every individual pick for today — browse, filter, and build your own parlay",
    icon: <Calendar className="w-5 h-5" />,
    category: "start",
    path: "/daily",
    pathLabel: "Daily (Calendar icon in nav)",
    why: "Sometimes you want to browse individual picks and hand-select your legs rather than take a pre-built ticket. Daily Picks shows every pick the system made today — sorted by grade, filterable by sport or market — so you stay in full control.",
    when: "Use when you have your own read on a game and want to compare it against the system, or when you want to mix individual legs across sports into a custom parlay.",
    where: "Navigation bar → Calendar icon (Daily). Sport tabs at the top filter by NBA, NFL, NHL, NCAAB, etc.",
    how: [
      "Navigate to Daily Picks (calendar icon in nav)",
      "Select a sport tab or stay on 'All' to see everything",
      "Browse picks sorted by grade — click any pick card to expand and read the full reasoning",
      "Click the '+' button on any pick to add it to your slip",
      "Mix picks from multiple sports to build your custom parlay",
    ],
    tips: [
      "Each pick card shows grade, confidence %, EV%, key factors, Sors Simulation results, and game context",
      "Look for picks where both the '46-Factor Model' and 'Sors Simulation' factors agree — high convergence",
      "Picks labeled 'Bet Now' have timing-sensitive value — lines may move quickly",
    ],
    tags: ["picks", "daily", "sport", "filter", "individual", "browse"],
  },
  {
    id: "bet-slip",
    name: "Bet Slip",
    tagline: "Your always-visible parlay builder — accumulate picks as you browse",
    icon: <Ticket className="w-5 h-5" />,
    category: "start",
    path: "/",
    pathLabel: "Right sidebar on desktop · Floating button on mobile",
    why: "The slip accumulates your picks as you browse every page. Combined odds and payout update in real time. You never have to rebuild your parlay from scratch — it persists across pages.",
    when: "Every time you find a pick you like, anywhere on the platform. Build as you browse, review at the end before heading to the sportsbook.",
    where: "Desktop: fixed right sidebar labeled 'Bet Slip'. Mobile: floating ticket icon at the bottom right of the screen. The number on it shows how many legs are in your slip.",
    how: [
      "Add picks using '+' or 'Add to Slip' buttons from any page",
      "Watch combined odds and projected payout update in real time as you add legs",
      "Enter your stake — use quick-select buttons (% of your bankroll or dollar amounts) or type any amount",
      "Click 'Track My Bet' (requires login) to record your slip for automatic settlement tracking",
      "Click 'Open Sportsbook' to get deep links for placing the bet at your preferred book",
      "Click 'Copy Slip' to copy a formatted text summary — great for sharing",
    ],
    tips: [
      "The Sors Simulation panel shows win probability from 10,000+ simulations using real team data",
      "Remove any leg by clicking the X next to it — odds recalculate instantly",
      "Copy Slip text is formatted for Discord/group chats — teammates see exactly what you're betting",
    ],
    tags: ["slip", "parlay", "stake", "payout", "sportsbook", "copy", "odds", "legs"],
  },
  {
    id: "smart-generator",
    name: "Smart Ticket Generator",
    tagline: "Tell it your preferences — it builds an optimized ticket in seconds",
    icon: <Brain className="w-5 h-5" />,
    category: "edge",
    path: "/generate",
    pathLabel: "Generate (Brain icon in nav)",
    why: "The generator selects picks that don't conflict with each other (no correlated risk), that have the highest combined expected value, and that match your bankroll and risk level. It does in 2 seconds what would take hours of research.",
    when: "Use when you want a fresh ticket built to your specifications, or when you want to explore different sport/leg combinations without doing the work yourself.",
    where: "Navigation bar → Brain icon (Generate).",
    how: [
      "Navigate to Generate (brain icon in nav)",
      "Select which sports you want included",
      "Set your number of legs (3–5 recommended for higher hit rate; 6–10 for bigger payouts)",
      "Enter your bankroll — this powers the Kelly Criterion stake suggestion",
      "Click Generate — receive a ready-to-bet ticket in seconds",
      "Not happy with it? Click Generate again — each run uses fresh live data",
    ],
    tips: [
      "3–5 leg parlays hit at a higher rate than 10+ leg parlays — better for consistency",
      "The generator avoids putting both sides of a spread from the same game in your ticket",
      "Try generating 3–4 different tickets and comparing their grades before choosing one",
    ],
    tags: ["generator", "parlay", "automated", "ai", "build", "create", "smart"],
  },
  {
    id: "visual-builder",
    name: "Visual Parlay Builder",
    tagline: "Browse every game and hand-pick exactly the legs you want",
    icon: <Layers className="w-5 h-5" />,
    category: "edge",
    path: "/builder",
    pathLabel: "Builder (Grid icon in nav)",
    why: "Full manual control. See every available game and every market — spread, moneyline, total — and click exactly what you want. The builder shows live EV indicators, line movement arrows, and SGP correlation warnings in real time.",
    when: "Use when you've done your own research and want to build a specific ticket. Also ideal for same-game parlays (SGPs) where you pick multiple legs from one game.",
    where: "Navigation bar → Grid icon (Builder).",
    how: [
      "Navigate to Builder (grid icon)",
      "Select a sport tab to see today's games",
      "Click any line (spread, ML, or total) to add it to your slip",
      "Watch the EV indicator — green (+EV) means the implied probability has value",
      "Read the line movement arrows — ↑ means the line moved in that direction",
      "Check the SGP correlation warning if you're taking multiple legs from one game",
    ],
    tips: [
      "Line movement arrows show direction since open — big moves usually mean sharp money",
      "SGP legs from the same game are correlated — only combine outcomes that can logically co-exist",
      "+EV means the sportsbook's implied probability is lower than the real probability — that's your edge",
    ],
    tags: ["builder", "manual", "parlay", "sgp", "games", "lines", "visual"],
  },
  {
    id: "player-props",
    name: "Player Props Analyzer",
    tagline: "Over/under on individual player stats — often the sharpest, most exploitable markets",
    icon: <Star className="w-5 h-5" />,
    category: "edge",
    path: "/player-props",
    pathLabel: "Props (Star icon in nav)",
    why: "Sportsbooks often set prop lines less precisely than game lines because there are too many to track closely. Our engine combines live player stats, historical performance data, and full injury reports to find props where the posted line is off from what the data projects.",
    when: "Check props 1–2 hours before tipoff. Reload just before game time to catch any final lineup or injury changes that shift projections.",
    where: "Navigation bar → Star icon (Props). Select sport (NBA, NHL, NCAAB) at the top.",
    how: [
      "Navigate to Player Props (star icon)",
      "Select your sport",
      "Browse player cards — red injury details show directly under the player name",
      "Click a player card to expand it and see all their available prop markets",
      "Read the injury report in the expanded panel to understand lineup context",
      "Click Over or Under on any market to add it directly to your slip",
    ],
    tips: [
      "Full ESPN injury reports now show under each player — check if a key teammate is out (boosts other players' lines)",
      "Props graded A or B+ have the strongest statistical backing from the engine",
      "The 'Top Props' section at the top surfaces the system's highest-confidence props across all players",
    ],
    tags: ["props", "players", "over", "under", "stats", "injury", "nba", "nhl"],
  },
  {
    id: "odds-center",
    name: "Odds Center",
    tagline: "Four tools in one: compare lines, find EV, track line movement, power rankings",
    icon: <TrendingUp className="w-5 h-5" />,
    category: "edge",
    path: "/odds-center",
    pathLabel: "Odds (TrendingUp icon in nav)",
    why: "Getting even slightly better odds on every bet compounds into significant profit over a full season. This tool shows you where to get the best price across DraftKings, FanDuel, BetMGM, Caesars, and others — and flags when sharp money is moving a line.",
    when: "Before placing any bet — always check for the best available price. The Line Movement tab is especially useful when you want to know if sharp money has already been on a game.",
    where: "Navigation bar → TrendingUp icon (Odds). Four tabs inside: Odds Comparison, EV Heatmap, Line Movement, Power Rankings.",
    how: [
      "Navigate to Odds Center",
      "Odds Comparison tab: same game across all books side by side — always bet the highest number",
      "EV Heatmap tab: red/green grid showing which markets have value; focus on green cells with 3%+ EV",
      "Line Movement tab: see how lines moved from open to now — sudden large moves = sharp syndicate action",
      "Power Rankings tab: live team strength ratings derived from real game results and stats",
    ],
    tips: [
      "Getting -108 instead of -110 saves 1.8% per bet — across 500 bets a year that's real money",
      "Steam moves (sudden large line jumps across multiple books simultaneously) often signal sharp money worth following",
      "EV Heatmap: cells showing 3%+ EV are the highest-value spots in today's slate",
    ],
    tags: ["odds", "compare", "ev", "line movement", "sharp", "sportsbooks", "value", "steam", "heatmap"],
  },
  {
    id: "live-center",
    name: "Live Center",
    tagline: "Real-time game tracking with in-game momentum signals for live betting",
    icon: <Activity className="w-5 h-5" />,
    category: "deep",
    path: "/live",
    pathLabel: "Live (Activity icon in nav)",
    why: "In-game betting is a completely different market from pre-game. Lines move fast based on score, momentum, and time remaining. Our live engine tracks momentum shifts in real time so you can spot when a team is on a run and the sportsbook hasn't adjusted yet.",
    when: "During games — especially second half in basketball, which has the most liquid live market. Also great for football after a significant scoring drive changes the spread.",
    where: "Navigation bar → Activity icon (Live). Shows all currently in-progress games sorted by sport.",
    how: [
      "Navigate to Live Center when games are in progress",
      "Watch score updates refresh every 60 seconds from ESPN's live API",
      "Check momentum indicators — teams on scoring runs often have lagging live spreads",
      "Use the cashout advisor if you have a live bet and want to know whether to hold or exit",
      "Check the hedge calculator to lock in profit on a running parlay",
    ],
    tips: [
      "Live totals in basketball are often softer than live spreads — easier to find mispriced lines",
      "The best live spots are often after a team goes up big — the line overcorrects for the score",
      "Quarter totals (basketball) and half totals (football) are the most exploitable in-game markets",
    ],
    tags: ["live", "in-game", "real-time", "momentum", "cashout", "scores", "streaming"],
  },
  {
    id: "tools",
    name: "Tools & Analytics",
    tagline: "Professional betting calculators — Kelly, CLV, variance, and more",
    icon: <Calculator className="w-5 h-5" />,
    category: "deep",
    path: "/tools",
    pathLabel: "Tools (Calculator icon in nav)",
    why: "The difference between recreational bettors and long-term profitable bettors is discipline and math. These tools give you the exact same frameworks professionals use — bet sizing, market timing, variance expectation — all pre-built and ready to use.",
    when: "Kelly Calculator: before every bet. Variance Simulator: when you're on a losing streak and need context. CLV Tracker: to measure whether you're actually getting good prices.",
    where: "Navigation bar → Calculator icon (Tools). All tools on one page with tabs.",
    how: [
      "Kelly Calculator: enter your estimated edge and the odds → get the mathematically optimal bet size",
      "CLV Predictor: enter your bet odds and closing line odds → see if you consistently beat the closing line",
      "Variance Simulator: run 1,000 simulated seasons to understand normal losing streaks at your win rate",
      "Correlation Engine: enter your parlay legs → see if they cancel each other out or reinforce",
      "Cashout Maximizer: enter a live parlay's current status → get an EV-based cashout recommendation",
    ],
    tips: [
      "Kelly Criterion: never bet more than (edge / odds) of your bankroll — this prevents ruin mathematically",
      "CLV Rate above 55% means you're consistently finding value — that's a strong signal",
      "A 10-unit loss at a 55% win rate over 50 bets is completely within normal variance — the simulator proves it",
    ],
    tags: ["kelly", "clv", "variance", "calculator", "bankroll", "math", "tools", "correlation"],
  },
  {
    id: "strategy",
    name: "Strategy Advisor",
    tagline: "An AI coach that grades your slip and suggests specific improvements",
    icon: <BookOpen className="w-5 h-5" />,
    category: "deep",
    path: "/strategy",
    pathLabel: "Strategy (accessible from nav or slip)",
    why: "Building a good ticket isn't just about individual picks — it's about how legs interact. The Strategy Advisor grades your full slip, flags correlated legs that hurt your real odds, and suggests replacements. It also offers strategy templates for different betting styles.",
    when: "After you've built a slip but before placing it. Also useful when starting a new betting approach — pick a template that fits your style (conservative, aggressive, prop specialist, etc.).",
    where: "Accessible from the nav menu or directly via the Analyze button in the slip.",
    how: [
      "Build a slip on any page",
      "Navigate to Strategy Advisor",
      "Click 'Analyze My Slip' to get a full breakdown with grade, warnings, and suggestions",
      "Review strengths, correlation risks, and suggested replacement legs",
      "Or choose a Strategy Template (Chalk Grinder, Value Hunter, Prop Specialist) for guided picks",
    ],
    tips: [
      "The Correlation Warning is the most important output — correlated legs reduce your real odds without showing it",
      "'Chalk Grinder' template hits most often — high win rate, smaller payouts. Best for beginners",
      "'Value Hunter' template focuses on +EV plays — lower hit rate but positive expected value long-term",
    ],
    tags: ["strategy", "analysis", "correlation", "advice", "template", "coach", "grade"],
  },
  {
    id: "track-my-bet",
    name: "Track My Bet",
    tagline: "Record your picks — results auto-update when games finish",
    icon: <Target className="w-5 h-5" />,
    category: "track",
    path: "/profile",
    pathLabel: "Bet Slip → 'Track My Bet' button (login required)",
    why: "You can't improve what you don't measure. Tracking bets reveals your actual win rate by sport, market type, and confidence tier. The system auto-settles picks from ESPN scores — you don't manage any of it manually.",
    when: "Every single time before you place a bet. Click it once, then go to the sportsbook. Results will appear on your Profile automatically within minutes of the game ending.",
    where: "In the Bet Slip (right sidebar on desktop, or open the mobile drawer). The button only shows when you're logged in.",
    how: [
      "Sign in to your account",
      "Build any parlay in the slip",
      "Click 'Track My Bet' — a confirmation shows that your picks are recorded",
      "Place the bet at the sportsbook as normal",
      "Check your Profile to see results — auto-settled from real ESPN final scores",
      "View your personal win rate by sport, market, and confidence tier over time",
    ],
    tips: [
      "You do nothing after clicking Track My Bet — the settlement engine checks ESPN every 5 minutes automatically",
      "After 50+ tracked picks, your personal win rate becomes statistically meaningful",
      "Closing Line Value (CLV) is also tracked — it predicts long-term profitability better than win rate alone",
    ],
    tags: ["track", "record", "settle", "win rate", "clv", "history", "profile", "auto"],
  },
  {
    id: "track-record",
    name: "Track Record",
    tagline: "The system's verified accuracy — real picks, real scores, real results",
    icon: <Shield className="w-5 h-5" />,
    category: "track",
    path: "/track-record",
    pathLabel: "Track Record (from Profile or direct URL)",
    why: "Every pick the system generates is recorded before the game starts and settled against real ESPN final scores. No cherry-picking, no hiding losses. This is full accountability — you can see exactly how the AI performs before trusting it with real money.",
    when: "Before subscribing, review the track record to make an informed decision. Check weekly to confirm the system continues to perform as expected.",
    where: "Accessible from your Profile page or directly at /track-record. Public — no login required.",
    how: [
      "Navigate to Track Record",
      "See total picks settled, overall win rate, and calibration score at the top",
      "Filter by sport (NBA, NFL, NHL, NCAAB) to see sport-specific accuracy",
      "Filter by market type (moneyline, spread, total) to see which markets the system does best in",
      "Check the calibration table — picks with 65%+ confidence should win more than 55% of the time",
    ],
    tips: [
      "Calibration score of 70+ means the system's confidence levels accurately predict actual win rates",
      "Moneyline win rates above 52.4% are profitable at -110 — the system tracks above this mark",
      "Spreads are the hardest market — even 48% can be profitable depending on the juice",
    ],
    tags: ["track record", "accuracy", "win rate", "calibration", "proof", "history", "verified"],
  },
  {
    id: "community",
    name: "Community",
    tagline: "Follow expert bettors, share tickets, and compete on the leaderboard",
    icon: <Users className="w-5 h-5" />,
    category: "track",
    path: "/community",
    pathLabel: "Community (Users icon in nav)",
    why: "Betting is better with data from peers. See what sharp community members are betting, tail their tickets, and compete monthly on the leaderboard. Community wisdom often spots angles the model hasn't fully priced in.",
    when: "Check the community feed daily — especially on major game days. Review the leaderboard weekly to find the most accurate community bettors to follow.",
    where: "Navigation bar → Users icon (Community).",
    how: [
      "Browse the community feed for shared tickets from other members",
      "Click Follow on bettors with strong verified track records",
      "Check the monthly leaderboard — sort by ROI% rather than profit for the most meaningful ranking",
      "Share your own tickets by clicking 'Share' in the Bet Slip",
      "Join sport-specific tipster groups for focused discussion",
    ],
    tips: [
      "Sort leaderboard by ROI% — someone up 30% ROI on modest stake beats someone up $5,000 on huge stakes",
      "Tailing works best on bettors with 100+ verified picks — small sample sizes are noisy",
      "The most tailed picks in the feed sometimes move lines — acting early maximizes value",
    ],
    tags: ["community", "social", "leaderboard", "follow", "tail", "share", "tipster", "groups"],
  },
  {
    id: "bankroll",
    name: "Bankroll Manager",
    tagline: "Track your money across every sportsbook — P&L, ROI, unit tracking",
    icon: <DollarSign className="w-5 h-5" />,
    category: "track",
    path: "/bankroll",
    pathLabel: "Bankroll (from Profile menu or nav)",
    why: "Most bettors lose not because their picks are bad but because they bet too much or too inconsistently. The Bankroll Manager enforces discipline — set unit sizes, track every book balance, and see your true long-term ROI.",
    when: "Set up on day one before placing any bets. Update after every session. Review monthly to see which sports and markets are your most profitable.",
    where: "Accessible from the Profile menu or directly at /bankroll.",
    how: [
      "Add each sportsbook you use with your current balance",
      "Set your unit size (recommended: 1–2% of total bankroll per bet)",
      "Log each bet — or it auto-fills from your tracked picks",
      "View P&L, ROI by book, sport, and bet type",
      "Use the tax export feature at year end for reporting",
    ],
    tips: [
      "Never bet more than 5% of your bankroll on a single game — Kelly recommends 1–3%",
      "Tracking separately by book reveals which books you perform best at — exploit the soft ones",
      "A 10-unit losing streak is statistically expected every 50–100 bets — don't panic or chase",
    ],
    tags: ["bankroll", "money", "roi", "units", "tracking", "sportsbooks", "p&l", "tax"],
  },
];

const CATEGORIES = {
  start: {
    label: "Start Here",
    color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
    desc: "The essentials — everything a new user needs on day one",
  },
  edge: {
    label: "Build Your Edge",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
    desc: "Tools that give you a measurable advantage over the market",
  },
  deep: {
    label: "Go Deeper",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
    desc: "Advanced analysis and math for serious, disciplined bettors",
  },
  track: {
    label: "Track & Grow",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    desc: "Measure everything, improve over time, stay accountable",
  },
};

const BEGINNER_PATH = [
  { step: 1, featureId: "bet-slip", label: "Understand the Bet Slip", desc: "Your central hub — know this first", path: "/" },
  { step: 2, featureId: "command-center", label: "Grab a Pre-Built Ticket", desc: "No research needed — AI does the work", path: "/" },
  { step: 3, featureId: "player-props", label: "Explore Player Props", desc: "Often the most exploitable market", path: "/player-props" },
  { step: 4, featureId: "odds-center", label: "Compare Odds Before Betting", desc: "Always shop for the best line", path: "/odds-center" },
  { step: 5, featureId: "track-my-bet", label: "Track Every Pick", desc: "Start measuring results from day one", path: "/profile" },
  { step: 6, featureId: "track-record", label: "Verify the System's Accuracy", desc: "Real data, no cherry-picking", path: "/track-record" },
];

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    q: "Is this real gambling advice?",
    a: "No. Sors Maxima is for entertainment and educational purposes only. Our analysis is based on statistical models and is not guaranteed betting advice. Past performance does not guarantee future results. Please bet responsibly and only risk what you can afford to lose.",
  },
  {
    category: "Getting Started",
    q: "What sports does the platform cover?",
    a: "We cover NBA, NFL, MLB, NHL, College Basketball (NCAAB), College Football (NCAAF), Soccer, Tennis, Golf, MMA, Boxing, NASCAR, and WNBA. All game data is sourced from ESPN's live API.",
  },
  {
    category: "Features",
    q: "How does the 46-factor prediction engine work?",
    a: "The engine integrates 46 data-backed factors across categories: core betting (sharp money, line movement, public fade), advanced analytics (momentum, H2H history, schedule strength), situational (rest days, back-to-backs, travel), physical (injuries, lineup changes), and environmental (weather, venue). It runs continuous learning — factor weights update automatically as real results come in.",
  },
  {
    category: "Features",
    q: "What is the Sors Simulation engine?",
    a: "The Sors Simulation engine runs 10,000+ simulated game outcomes per matchup using real team statistics and scoring patterns — escalating to 100,000 simulations in overnight deep runs. It gives you a probability distribution of results — not just a point estimate. The combined win probability shown in your Bet Slip comes from this simulation.",
  },
  {
    category: "Features",
    q: "What is Closing Line Value (CLV) and why does it matter?",
    a: "CLV measures whether you got a better price than the final odds at game time. Consistently betting before the line moves in your favor (positive CLV) is the strongest predictor of long-term profitability — better than win rate alone. The CLV Tracker monitors this automatically.",
  },
  {
    category: "Account & Billing",
    q: "What subscription tiers are available?",
    a: "Three tiers: Sharp ($49/mo — full 46-factor engine, unlimited picks, bet grading), Edge ($99/mo — everything in Sharp plus AI strategy advisor, prop projections, line movement alerts), and Max ($249/mo — everything in Edge plus first-in-line processing, exclusive picks, and custom model access).",
  },
  {
    category: "Account & Billing",
    q: "How do I cancel my subscription?",
    a: "Go to Settings → Billing. Cancel anytime — your access continues until the end of your billing period. No questions asked.",
  },
  {
    category: "Responsible Gaming",
    q: "What responsible gaming tools are available?",
    a: "Deposit limits, session time limits, cool-off periods (24h–30 days), self-exclusion, and loss streak alerts. Access all of these in Settings under Responsible Gaming.",
  },
  {
    category: "Security",
    q: "How is my data protected?",
    a: "Multi-layered security: TLS encryption in transit, scrypt password hashing, rate limiting, input sanitization, session fingerprinting, and account lockout after failed attempts. PII is minimized in logs.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIES[feature.category];

  return (
    <div className="border rounded-xl bg-card overflow-hidden transition-shadow hover:shadow-md">
      <button
        className="w-full text-left px-4 py-4 flex items-start gap-3"
        onClick={() => setOpen(v => !v)}
        data-testid={`feature-card-${feature.id}`}
      >
        <div className={`p-2 rounded-lg border ${cat.color} shrink-0 mt-0.5`}>
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{feature.name}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cat.color} border`}>
              {cat.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{feature.tagline}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">{feature.pathLabel}</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="px-4 pb-5 border-t pt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                WHY use this
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.why}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                WHEN to use it
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.when}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-green-500" />
              WHERE to find it
            </div>
            <p className="text-xs text-muted-foreground">{feature.where}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
              HOW to use it — step by step
            </div>
            <ol className="space-y-1.5">
              {feature.how.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Pro Tips
            </div>
            {feature.tips.map((tip, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5 shrink-0">→</span>
                {tip}
              </p>
            ))}
          </div>

          <Link href={feature.path}>
            <Button size="sm" className="w-full gap-2" data-testid={`button-go-${feature.id}`}>
              <ArrowRight className="w-3.5 h-3.5" />
              Go to {feature.name}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function HelpCenter() {
  useSEO({
    title: "Platform Guide — Sors Maxima",
    description: "Learn every feature of Sors Maxima — why, when, where, and how to use each tool.",
  });

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FEATURES.filter(f => {
      const matchesCat = activeCategory === "all" || f.category === activeCategory;
      const matchesSearch = !q ||
        f.name.toLowerCase().includes(q) ||
        f.tagline.toLowerCase().includes(q) ||
        f.tags.some(t => t.includes(q)) ||
        f.why.toLowerCase().includes(q) ||
        f.pathLabel.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-8">

      <div className="text-center space-y-2 pt-2">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Guide</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Every feature explained with <strong>why</strong> it exists, <strong>when</strong> to use it,{" "}
          <strong>where</strong> to find it, and <strong>how</strong> to use it step by step.
          New here? Start with the Beginner's Path below.
        </p>
      </div>

      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Beginner's Path — Start Here</span>
          <Badge variant="outline" className="text-[10px] ml-auto">6 steps</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          New to Sors Maxima? Follow these 6 steps in order to get up and running fast.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {BEGINNER_PATH.map(item => (
            <Link key={item.step} href={item.path}>
              <div
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/70 border hover:border-primary/40 hover:bg-background transition-colors cursor-pointer"
                data-testid={`beginner-step-${item.step}`}
              >
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center shrink-0 font-bold mt-0.5">
                  {item.step}
                </span>
                <div>
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search features — e.g. 'props', 'kelly', 'live', 'odds'..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-feature-search"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveCategory("all")}
            data-testid="filter-all"
          >
            All Features
          </Button>
          {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES[keyof typeof CATEGORIES]][]).map(([key, cat]) => (
            <Button
              key={key}
              variant={activeCategory === key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveCategory(key)}
              data-testid={`filter-${key}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {activeCategory !== "all" && (
          <p className="text-xs text-muted-foreground">
            {CATEGORIES[activeCategory as keyof typeof CATEGORIES]?.desc}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No features match your search.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            className="mt-2"
            data-testid="button-clear-search"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} feature{filtered.length !== 1 ? "s" : ""} — click any card to expand
          </p>
          {filtered.map(f => <FeatureCard key={f.id} feature={f} />)}
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Quick Navigation</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Best Tickets", path: "/", icon: <Zap className="w-3.5 h-3.5" /> },
            { label: "Daily Picks", path: "/daily", icon: <Calendar className="w-3.5 h-3.5" /> },
            { label: "Generate", path: "/generate", icon: <Brain className="w-3.5 h-3.5" /> },
            { label: "Player Props", path: "/player-props", icon: <Star className="w-3.5 h-3.5" /> },
            { label: "Odds Center", path: "/odds-center", icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { label: "Live Games", path: "/live", icon: <Activity className="w-3.5 h-3.5" /> },
            { label: "Tools", path: "/tools", icon: <Calculator className="w-3.5 h-3.5" /> },
            { label: "Strategy", path: "/strategy", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: "Track Record", path: "/track-record", icon: <Shield className="w-3.5 h-3.5" /> },
            { label: "Community", path: "/community", icon: <Users className="w-3.5 h-3.5" /> },
            { label: "Bankroll", path: "/bankroll", icon: <DollarSign className="w-3.5 h-3.5" /> },
            { label: "Builder", path: "/builder", icon: <Layers className="w-3.5 h-3.5" /> },
          ].map(item => (
            <Link key={item.path} href={item.path}>
              <div
                className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                data-testid={`quick-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-primary">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Frequently Asked Questions</span>
        </div>
        <Accordion type="multiple" className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border rounded-lg px-3 bg-card"
              data-testid={`faq-item-${i}`}
            >
              <AccordionTrigger className="text-xs font-medium text-left hover:no-underline py-3">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-center space-y-2">
        <Mail className="w-4 h-4 text-muted-foreground mx-auto" />
        <p className="text-xs font-semibold">Still need help?</p>
        <p className="text-xs text-muted-foreground">Can't find what you're looking for? Contact our team.</p>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-contact-support">
          <Mail className="w-3.5 h-3.5" />
          support@sorsmaxima.com
        </Button>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold">Responsible Gaming</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If gambling is affecting your life, help is available 24/7 at the National Council on Problem Gambling.
            </p>
            <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
              <span className="flex items-center gap-1 font-medium">
                <Phone className="w-3 h-3" />
                1-800-522-4700
              </span>
              <a
                href="https://www.ncpgambling.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary"
                data-testid="link-ncpg"
              >
                <ExternalLink className="w-3 h-3" />
                ncpgambling.org
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

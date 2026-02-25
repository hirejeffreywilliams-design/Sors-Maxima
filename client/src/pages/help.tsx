import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  HelpCircle,
  Zap,
  Shield,
  CreditCard,
  Activity,
  Wrench,
  Users,
  BarChart3,
  AlertTriangle,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How does the Smart Ticket Generator work?",
    answer: "The Smart Ticket Generator uses our AI engine to analyze 46 factors including team performance, player stats, historical trends, weather conditions, and sharp money movement. Simply select your sports, adjust your settings, and click Generate to receive optimized betting tickets with Power Scores and win probability."
  },
  {
    category: "Getting Started",
    question: "What is the Visual Parlay Builder?",
    answer: "The Visual Parlay Builder lets you browse real ESPN games and drag-and-drop selections to build custom parlays. It shows live edge indicators (+EV, ~EV, -EV), line movement arrows, and Same-Game Parlay (SGP) detection. You can access it from the home page by clicking the 'Visual Builder' tab."
  },
  {
    category: "Getting Started",
    question: "What sports does Sors Maxima cover?",
    answer: "We cover 14 sports including NBA, NFL, MLB, NHL, College Basketball (NCAAB), College Football (NCAAF), Soccer, Tennis, Golf, MMA, Boxing, NASCAR, WNBA, and more. All game data is sourced from ESPN's live API for maximum accuracy."
  },
  {
    category: "Getting Started",
    question: "Is this real gambling advice?",
    answer: "No. Sors Maxima is for entertainment and educational purposes only. Our analysis is based on statistical models and is not guaranteed betting advice. Past performance does not guarantee future results. Please gamble responsibly and only bet what you can afford to lose."
  },
  {
    category: "Features",
    question: "What are the Pro Tools?",
    answer: "Pro Tools include: Real-time Odds Comparison across sportsbooks, AI Prop Projections, Correlation Engine for same-game parlay optimization, Player Prop Lab for deep stat analysis, Arbitrage Finder for guaranteed profit opportunities, Custom Model Builder to adjust our 46 analysis factors, and Export Bet Slip to generate formatted slips for major sportsbooks."
  },
  {
    category: "Features",
    question: "How does the Sors Prediction Engine work?",
    answer: "The Sors Prediction Engine integrates 46 contributing factors across 7 categories (core betting, advanced analytics, psychological, physical health, technology, environmental, and financial) with synergy detection. It continuously learns from prediction outcomes and adapts factor weights to improve accuracy over time."
  },
  {
    category: "Features",
    question: "What is the Correlation Engine?",
    answer: "The Correlation Engine uses advanced statistical methods to model dependencies between betting leg outcomes. It helps identify when legs in your parlay are correlated (positively or negatively), which affects your actual win probability and expected value."
  },
  {
    category: "Features",
    question: "How do Live Rosters work?",
    answer: "Our roster data is sourced directly from ESPN's free API and covers all teams in NBA (30), NFL (32), MLB (30), and NHL (32). We preload and cache roster data at startup for instant access. This includes player details, coaching staff, and real-time injury status."
  },
  {
    category: "Features",
    question: "What is the Cash-Out Advisor?",
    answer: "The Cash-Out Advisor uses AI to recommend whether to hold, partially cash out, or fully cash out a live bet based on current momentum, time remaining, injury risk, and weather factors. Access it in the Live Center."
  },
  {
    category: "Account & Billing",
    question: "What subscription tiers are available?",
    answer: "We offer three paid tiers: Sharp ($49/mo — full 46-factor engine, unlimited usage, bet grading), Edge ($99/mo — everything in Sharp plus AI assistant, prop projections, line movement alerts), and Max ($249/mo — everything in Edge plus custom model builder, hedge tools, priority processing). Every tier includes unlimited daily usage. No credit limits, no caps."
  },
  {
    category: "Account & Billing",
    question: "How do I cancel my subscription?",
    answer: "Go to Settings, then manage your subscription through the billing portal. You can cancel anytime, and your access continues until the end of your billing period. You can also manage this from the Upgrade page."
  },
  {
    category: "Account & Billing",
    question: "Can I export my data?",
    answer: "Yes! Go to your Profile page and click 'Export My Data'. This downloads a JSON file containing your betting history, settings, and preferences. This is part of our GDPR/CCPA compliance."
  },
  {
    category: "Account & Billing",
    question: "How do I delete my account?",
    answer: "Go to your Profile page and click 'Delete Account'. This will permanently remove all your data after a confirmation step. This action cannot be undone."
  },
  {
    category: "Responsible Gaming",
    question: "What responsible gaming tools are available?",
    answer: "We provide deposit limits (daily/weekly/monthly), session time limits, cool-off periods (24h-30d), self-exclusion, loss streak alerts, and bankroll management tools. Access these in Settings under Responsible Gaming."
  },
  {
    category: "Responsible Gaming",
    question: "Where can I get help with gambling problems?",
    answer: "If you or someone you know has a gambling problem, please call the National Council on Problem Gambling helpline at 1-800-522-4700 (available 24/7). You can also text 1-800-522-4700 or visit ncpgambling.org for more resources."
  },
  {
    category: "Security",
    question: "How is my data protected?",
    answer: "We implement multi-layered security including encryption at rest and in transit (TLS), secure password hashing with scrypt, rate limiting, input sanitization, session fingerprinting, and account lockout after failed attempts. We also minimize PII in logs and maintain an audit trail."
  },
  {
    category: "Security",
    question: "What is session fingerprinting?",
    answer: "Session fingerprinting validates your browser identity to detect potential session hijacking. If we detect that your session is being used from an unexpected device or browser, we may require re-authentication."
  },
  {
    category: "Community",
    question: "How do Tipster Communities work?",
    answer: "You can create or join betting communities where tipsters share picks. Community creators can monetize their insights through tips and subscriptions (the platform takes 15% of earnings). Follow top performers and even auto-copy their picks with Copy Betting."
  },
  {
    category: "Community",
    question: "What are Pick Competitions?",
    answer: "Weekly and monthly accuracy contests where you compete against other users. Track your entries on the leaderboard and win prize pool rewards. Access Competitions from the Rewards page."
  },
];

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Getting Started": Zap,
  "Features": Wrench,
  "Account & Billing": CreditCard,
  "Responsible Gaming": Shield,
  "Security": Shield,
  "Community": Users,
};

const categoryColors: Record<string, string> = {
  "Getting Started": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Features": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Account & Billing": "bg-green-500/10 text-green-600 dark:text-green-400",
  "Responsible Gaming": "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  "Security": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Community": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

export default function HelpCenter() {
  useSEO({ title: "Help Center", description: "Guides, FAQs, and support resources" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(faqItems.map((item) => item.category)));

  const filteredItems = faqItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = categories.reduce((acc, cat) => {
    const items = filteredItems.filter((i) => i.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="min-h-full">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Help Center</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Find answers to common questions about Sors Maxima
          </p>
        </header>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-help-search"
          />
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            data-testid="button-filter-all"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              data-testid={`button-filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {Object.keys(groupedItems).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm text-muted-foreground">Try different search terms or clear filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => {
              const Icon = categoryIcons[category] || HelpCircle;
              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="w-5 h-5" />
                      {category}
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {items.map((item, idx) => (
                        <AccordionItem key={idx} value={`${category}-${idx}`}>
                          <AccordionTrigger
                            className="text-left text-sm"
                            data-testid={`faq-question-${category.toLowerCase().replace(/\s+/g, "-")}-${idx}`}
                          >
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Still need help?</h3>
              <p className="text-sm text-muted-foreground">Can't find what you're looking for? Reach out to our team.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button variant="outline" className="gap-2" data-testid="button-contact-email">
                  <Mail className="w-4 h-4" />
                  support@sorsmaxima.com
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Responsible Gaming Resources</p>
                <p className="text-xs text-muted-foreground">
                  If you or someone you know has a gambling problem, help is available 24/7:
                </p>
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    1-800-522-4700
                  </span>
                  <a
                    href="https://www.ncpgambling.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary"
                  >
                    <ExternalLink className="w-3 h-3" />
                    ncpgambling.org
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

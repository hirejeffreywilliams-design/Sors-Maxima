import { useState } from "react";
import { useSEO } from "@/hooks/use-seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, FileText, Zap, Brain, BarChart3, Database, Globe, Network, Cpu, Ticket, CreditCard, MessageSquare, Search, Layers, ClipboardList, BookOpen, Target, TrendingUp, Lightbulb, Users, ArrowUpRight, Activity, Eye, Sparkles } from "lucide-react";

export default function AdminIPRegistry() {
  useSEO({ title: "Admin IP Registry & Business Intelligence | Sors Maxima", description: "Proprietary IP assets, branded lexicon, and strategic business plan." });

  return (
    <div className="container mx-auto py-6 space-y-8" data-testid="admin-ip-registry-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Admin IP Registry & BI</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Confidential business intelligence and proprietary asset management.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground italic" data-testid="text-confidential-notice">
            This page contains confidential business intelligence. <br />
            For copyright registration, print as PDF and submit to the U.S. Copyright Office.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" data-testid="tabs-ip-registry">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto h-auto gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="registry" data-testid="tab-registry">IP Registry</TabsTrigger>
          <TabsTrigger value="lexicon" data-testid="tab-lexicon">Lexicon</TabsTrigger>
          <TabsTrigger value="mission" data-testid="tab-mission">Mission & Vision</TabsTrigger>
          <TabsTrigger value="plan" data-testid="tab-plan">Business Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
          <section className="space-y-4" data-testid="section-platform-vitals">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Section 1 — Platform Vitals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-vital-loc">
                <CardHeader className="pb-2">
                  <CardDescription>Total Lines of Code</CardDescription>
                  <CardTitle className="text-2xl font-bold">401,795</CardTitle>
                </CardHeader>
              </Card>
              <Card data-testid="card-vital-files">
                <CardHeader className="pb-2">
                  <CardDescription>Total Source Files</CardDescription>
                  <CardTitle className="text-2xl font-bold">413</CardTitle>
                </CardHeader>
              </Card>
              <Card data-testid="card-vital-frontend">
                <CardHeader className="pb-2">
                  <CardDescription>Frontend Components</CardDescription>
                  <CardTitle className="text-2xl font-bold">~280</CardTitle>
                </CardHeader>
              </Card>
              <Card data-testid="card-vital-backend">
                <CardHeader className="pb-2">
                  <CardDescription>Backend Routes</CardDescription>
                  <CardTitle className="text-2xl font-bold">~35</CardTitle>
                </CardHeader>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card data-testid="card-vital-db">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Database Architecture</span>
                  </div>
                  <p className="text-2xl font-bold">~40 Tables</p>
                  <p className="text-xs text-muted-foreground mt-1">PostgreSQL + Drizzle ORM</p>
                </CardContent>
              </Card>
              <Card data-testid="card-vital-api">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">API Integrations</span>
                  </div>
                  <p className="text-2xl font-bold">7 Providers</p>
                  <p className="text-xs text-muted-foreground mt-1">ESPN, BallDontLie, API-Football, NHL, MLB, Odds API, OpenAI</p>
                </CardContent>
              </Card>
              <Card data-testid="card-vital-realtime">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Real-time Delivery</span>
                  </div>
                  <p className="text-2xl font-bold">SSE Broadcast</p>
                  <p className="text-xs text-muted-foreground mt-1">Server-Sent Events real-time data sync</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="registry" className="space-y-6" data-testid="content-registry">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {IP_ASSETS.map((asset) => (
              <Card key={asset.name} className="flex flex-col" data-testid={`card-ip-asset-${asset.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {asset.icon}
                    </div>
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white" data-testid={`status-badge-${asset.name}`}>
                      REGISTERED
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{asset.name}</CardTitle>
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-primary">{asset.type}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">{asset.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lexicon" className="space-y-6" data-testid="content-lexicon">
          <Card>
            <CardHeader>
              <CardTitle>Sors Proprietary Lexicon™</CardTitle>
              <CardDescription>Proprietary terminology framework replacing industry-standard betting terms.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Sors Term</TableHead>
                    <TableHead className="w-[200px]">Industry Term</TableHead>
                    <TableHead>Definition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {LEXICON.map((item) => (
                    <TableRow key={item.sors}>
                      <TableCell className="font-bold text-primary">{item.sors}</TableCell>
                      <TableCell className="text-muted-foreground italic">{item.industry}</TableCell>
                      <TableCell>{item.definition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mission" className="space-y-8" data-testid="content-mission">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-primary/5 border-primary/20" data-testid="card-mission">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl leading-relaxed italic font-medium">
                  "Sors Maxima equips serious sports bettors with the same analytical firepower used by professional sportsbooks — delivered in real time, ranked by edge, and refined by every outcome."
                </p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/5 border-secondary/20" data-testid="card-vision">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-6 w-6 text-secondary-foreground" />
                  <CardTitle className="text-2xl">Vision</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xl leading-relaxed italic font-medium">
                  "To become the world's most trusted sports betting intelligence platform by pioneering data-driven, transparent, and accountable prediction systems that continuously learn and improve."
                </p>
              </CardContent>
            </Card>
          </div>
          <Card data-testid="card-values">
            <CardHeader>
              <CardTitle>Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {CORE_VALUES.map((value) => (
                  <div key={value} className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border text-center">
                    <span className="font-semibold text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6" data-testid="content-plan">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="section-kpis">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription>Market Size (2024)</CardDescription>
                <CardTitle className="text-2xl font-bold">$150B+</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription>Target Users</CardDescription>
                <CardTitle className="text-2xl font-bold">55M+ Bettors</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription>12-Month MRR Target</CardDescription>
                <CardTitle className="text-2xl font-bold">$64,450</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-market-opportunity">
              <CardHeader>
                <CardTitle className="text-lg">Market Opportunity & Problem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm mb-1">Market</h4>
                  <p className="text-sm text-muted-foreground">$150B+ US sports betting market (2024), 55M+ active US bettors.</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Problem</h4>
                  <p className="text-sm text-muted-foreground">97% of recreational bettors lose long-term due to lack of professional-grade analysis tools.</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Solution</h4>
                  <p className="text-sm text-muted-foreground">Sors Maxima — a subscription intelligence platform giving recreational bettors access to institutional-grade analytics at consumer pricing.</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-revenue-model">
              <CardHeader>
                <CardTitle className="text-lg">Revenue Model & Advantage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm mb-1">Pricing Tiers</h4>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-[10px] font-semibold uppercase">Sharp</p>
                      <p className="text-sm font-bold">$49/mo</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded border-primary/30 border">
                      <p className="text-[10px] font-semibold uppercase">Edge</p>
                      <p className="text-sm font-bold">$99/mo</p>
                    </div>
                    <div className="text-center p-2 bg-primary/20 rounded">
                      <p className="text-[10px] font-semibold uppercase">Max</p>
                      <p className="text-sm font-bold">$249/mo</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Competitive Advantage</h4>
                  <p className="text-sm text-muted-foreground">Proprietary 46-Factor engine, self-learning models, live odds integration across 10 books, and a branded UX that protects all IP behind the "Sors" namespace.</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-growth-strategy">
              <CardHeader>
                <CardTitle className="text-lg">Growth & Target Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm mb-1">Target Market</h4>
                  <p className="text-sm text-muted-foreground">Serious recreational bettors (25–45, $50K+ income), ex-DFS players, analytics enthusiasts.</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Growth Strategy</h4>
                  <p className="text-sm text-muted-foreground">Organic SEO via picks track record, referral program, paid social targeting sports podcast audiences.</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-financial-targets">
              <CardHeader>
                <CardTitle className="text-lg">Financial Targets & Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-[10px] uppercase text-muted-foreground">12-Month Target</h4>
                    <p className="text-lg font-bold">$773K ARR</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-[10px] uppercase text-muted-foreground">24-Month Target</h4>
                    <p className="text-lg font-bold">$3.3M ARR</p>
                  </div>
                </div>
                <div className="pt-2 border-t grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">LTV:CAC</p>
                    <p className="text-sm font-bold">{">"} 5:1</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Churn</p>
                    <p className="text-sm font-bold">{"<"} 3%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">NPS</p>
                    <p className="text-sm font-bold">{">"} 60</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const IP_ASSETS = [
  {
    name: "Sors 46-Factor Intelligence Engine™",
    type: "Algorithmic Model",
    description: "Core 46-variable prediction engine analyzing matchup, form, travel, rest, weather, market signals, and 39 other factors.",
    icon: <Brain className="h-5 w-5" />
  },
  {
    name: "Sors Simulation Engine™",
    type: "Simulation Platform",
    description: "1M+ daily Monte Carlo scenario simulations for outcome probability modeling.",
    icon: <Layers className="h-5 w-5" />
  },
  {
    name: "Sors Intelligence Grade System™",
    type: "Scoring Framework",
    description: "Proprietary A+/A/B+/B/C/D/F pick quality grading rubric with ambient glow UX.",
    icon: <Shield className="h-5 w-5" />
  },
  {
    name: "Sors Conviction Score™",
    type: "Metric",
    description: "AI-calibrated confidence percentage per pick output by the 46-Factor engine.",
    icon: <Target className="h-5 w-5" />
  },
  {
    name: "Unified Intelligence Hub™",
    type: "Data Architecture",
    description: "Master 60-second data orchestration cycle aggregating all sports/odds APIs.",
    icon: <Network className="h-5 w-5" />
  },
  {
    name: "Sors CLV Tracker™",
    type: "Analytics Tool",
    description: "Real-time closing line value tracker measuring bet quality post-game.",
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    name: "Platform Intelligence Engine™",
    type: "Infrastructure",
    description: "Autonomous system health monitor with self-healing diagnostics.",
    icon: <Cpu className="h-5 w-5" />
  },
  {
    name: "Autonomous Learning Engine™",
    type: "ML System",
    description: "Bootstrap + hourly self-training model that improves from settled bet outcomes.",
    icon: <Zap className="h-5 w-5" />
  },
  {
    name: "Life Changer Ticket™",
    type: "Feature",
    description: "Daily computer-generated high-confidence parlay selected by the simulation engine.",
    icon: <Ticket className="h-5 w-5" />
  },
  {
    name: "Sors Trading Cards™",
    type: "UX Innovation",
    description: "Collectible pick history cards with holographic shimmer, 3D tilt, and CALLED IT/MISSED stamps.",
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    name: "Sors Intelligence Feed™",
    type: "Data System",
    description: "Real-time SSE broadcast system delivering live picks and odds to members.",
    icon: <Activity className="h-5 w-5" />
  },
  {
    name: "Sors Signal Tracker™",
    type: "Analytics",
    description: "Pro market movement detection system tracking sharp money patterns.",
    icon: <Search className="h-5 w-5" />
  },
  {
    name: "Ticket Variation Engine™",
    type: "Feature",
    description: "Generates 5 alternative parlay blueprints (Safe Locks, EV Hunter, etc.) from user slips.",
    icon: <Layers className="h-5 w-5" />
  },
  {
    name: "Smart Pick Review Queue™",
    type: "HITL Feature",
    description: "Human-in-the-loop review queue with risk scoring, Kelly recommendations, and model vs market probability comparison.",
    icon: <ClipboardList className="h-5 w-5" />
  },
  {
    name: "Strategy Accountability System™",
    type: "Feature",
    description: "15-strategy preset system with per-leg violation tracking and active-mode filtering.",
    icon: <Lock className="h-5 w-5" />
  },
  {
    name: "Sors Books Intelligence Hub™",
    type: "Feature",
    description: "Sportsbook management with balance tracking, P&L history, and live odds comparison.",
    icon: <BookOpen className="h-5 w-5" />
  },
  {
    name: "Grade Ambient Glow System™",
    type: "UX Design",
    description: "Grade-matched ambient box-shadow glow and animated shimmer border on all pick/ticket cards.",
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    name: "Sors Lexicon™",
    type: "Brand Language",
    description: "Proprietary terminology framework replacing all industry-standard betting terms with Sors-exclusive branding.",
    icon: <FileText className="h-5 w-5" />
  }
];

const LEXICON = [
  {
    sors: "Sors Intelligence Grade™",
    industry: "Confidence / Pick Rating",
    definition: "Proprietary A+ to F quality score assigned by the 46-Factor engine to every pick"
  },
  {
    sors: "Intelligence Edge™",
    industry: "+EV / Expected Value",
    definition: "The net advantage a pick has over the sportsbook's implied probability"
  },
  {
    sors: "Sors Signal™",
    industry: "Sharp Money / Steam Move",
    definition: "Detected pro-money movement that tilts the market consensus"
  },
  {
    sors: "Market Drift™",
    industry: "Line Movement",
    definition: "Real-time movement of a betting line away from its opening number"
  },
  {
    sors: "Sors Conviction Score™",
    industry: "Confidence %",
    definition: "The engine's calibrated probability that a pick is correct"
  },
  {
    sors: "Life Changer Ticket™",
    industry: "Best Parlay of the Day",
    definition: "The daily top-rated computer-generated parlay from the simulation engine"
  },
  {
    sors: "Intelligence Ticket™",
    industry: "Parlay / Bet Slip",
    definition: "A multi-leg computer-generated betting ticket"
  },
  {
    sors: "Sors Stake Formula™",
    industry: "Kelly Criterion",
    definition: "Proprietary bet-sizing algorithm for optimal bankroll allocation"
  },
  {
    sors: "Intelligence Closing Value™ (ICV)",
    industry: "Closing Line Value (CLV)",
    definition: "Post-game measure of how well a bet beat the closing line"
  },
  {
    sors: "Market Gap™",
    industry: "Arbitrage",
    definition: "Cross-book price differential that creates a guaranteed-profit opportunity"
  },
  {
    sors: "Sors Rating™",
    industry: "Power Rating",
    definition: "Team strength score used as a 46-Factor input"
  },
  {
    sors: "Intelligence Consensus™",
    industry: "Public vs Sharp",
    definition: "Breakdown of where public money and sharp money are positioned"
  },
  {
    sors: "Sors Drift Alert™",
    industry: "Line Movement Alert",
    definition: "Real-time notification when a line moves significantly from its opener"
  },
  {
    sors: "Leg Correlation Score™",
    industry: "Parlay Correlation",
    definition: "Dependency analysis between parlay legs that affects combined probability"
  },
  {
    sors: "Sors Simulation Run™",
    industry: "Monte Carlo Run",
    definition: "One complete 1M-iteration simulation pass through the prediction engine"
  }
];

const CORE_VALUES = [
  "Data Integrity",
  "Continuous Learning",
  "Transparency",
  "Member-First Design",
  "Proprietary Excellence"
];

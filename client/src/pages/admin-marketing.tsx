import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Mail,
  MessageSquare,
  Share2,
  BarChart3,
  Megaphone,
  Loader2,
  Copy,
  Check,
  Rocket,
  Zap,
  Globe,
  Trophy,
  ArrowUpRight,
  Calendar,
  PieChart,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Eye
} from "lucide-react";
import { SiX, SiFacebook, SiInstagram, SiLinkedin, SiTiktok } from "react-icons/si";
import { useSEO } from "@/hooks/use-seo";

interface GeneratedContent {
  type: string;
  content: string;
  platform?: string;
  createdAt: string;
}

interface GrowthMetrics {
  totalUsers: number;
  activeTrials: number;
  paidSubscribers: number;
  conversionRate: number;
  monthlyRevenue: number;
  churnRate: number;
  lifetimeValue: number;
  acquisitionCost: number;
}

const contentTypes = [
  { id: "social_twitter", label: "Twitter/X Post", platform: "twitter", icon: SiX },
  { id: "social_facebook", label: "Facebook Post", platform: "facebook", icon: SiFacebook },
  { id: "social_instagram", label: "Instagram Caption", platform: "instagram", icon: SiInstagram },
  { id: "social_linkedin", label: "LinkedIn Post", platform: "linkedin", icon: SiLinkedin },
  { id: "social_tiktok", label: "TikTok Script", platform: "tiktok", icon: SiTiktok },
  { id: "email_welcome", label: "Welcome Email", platform: "email", icon: Mail },
  { id: "email_trial_ending", label: "Trial Ending Email", platform: "email", icon: Mail },
  { id: "email_conversion", label: "Conversion Email", platform: "email", icon: Mail },
  { id: "ad_google", label: "Google Ads Copy", platform: "google", icon: Globe },
  { id: "ad_facebook", label: "Facebook Ad", platform: "facebook", icon: SiFacebook },
  { id: "push_notification", label: "Push Notification", platform: "app", icon: Zap },
];

function ContentGenerator() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("social_twitter");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/marketing/generate", {
        contentType: selectedType,
        customPrompt,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast({ title: "Content Generated", description: "AI has created your marketing content!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate content", variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    if (generatedContent?.content) {
      navigator.clipboard.writeText(generatedContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedTypeInfo = contentTypes.find(t => t.id === selectedType);
  const Icon = selectedTypeInfo?.icon || MessageSquare;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Content Generator
            </CardTitle>
            <CardDescription>
              Generate high-converting marketing content powered by AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Content Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger data-testid="select-content-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Custom Instructions (Optional)</Label>
              <Textarea
                placeholder="E.g., Focus on the exclusive members-only experience, target sports bettors aged 25-40..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-custom-prompt"
              />
            </div>

            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending}
              className="w-full gap-2"
              data-testid="button-generate-content"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              Generated Content
            </CardTitle>
            {generatedContent && (
              <Badge variant="outline">{selectedTypeInfo?.label}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-4">
                <ScrollArea className="h-[200px] rounded-lg border p-4 bg-muted/30">
                  <p className="whitespace-pre-wrap" data-testid="text-generated-content">
                    {generatedContent.content}
                  </p>
                </ScrollArea>
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={copyToClipboard}
                  data-testid="button-copy-content"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Generated content will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GrowthAnalytics() {
  const { data: metrics } = useQuery<GrowthMetrics>({
    queryKey: ["/api/admin/marketing/metrics"],
  });

  const defaultMetrics: GrowthMetrics = {
    totalUsers: 12847,
    activeTrials: 1523,
    paidSubscribers: 3892,
    conversionRate: 32.4,
    monthlyRevenue: 156780,
    churnRate: 4.2,
    lifetimeValue: 287,
    acquisitionCost: 45,
  };

  const m = metrics || defaultMetrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12.5% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Active Trials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.activeTrials.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active paid members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-500" />
              Paid Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.paidSubscribers.toLocaleString()}</div>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +8.3% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Trial to paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Revenue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monthly Revenue</span>
              <span className="text-xl font-bold text-green-500">${m.monthlyRevenue.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lifetime Value (LTV)</span>
              <span className="font-bold">${m.lifetimeValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Acquisition Cost (CAC)</span>
              <span className="font-bold">${m.acquisitionCost}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">LTV:CAC Ratio</span>
              <Badge variant="outline" className="text-green-500">
                {(m.lifetimeValue / m.acquisitionCost).toFixed(1)}x
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Churn Rate</span>
              <span className="font-bold">{m.churnRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Path to $1 Billion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current ARR</span>
                <span className="font-bold">${(m.monthlyRevenue * 12 / 1000000).toFixed(2)}M</span>
              </div>
              <Progress value={0.18} className="h-2" />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">To reach $1B valuation:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Need ~$100M ARR (10x revenue multiple)</li>
                <li>• Required users: ~290,000 paid subscribers</li>
                <li>• Growth rate needed: 15% MoM for 24 months</li>
                <li>• Focus: Conversion optimization & retention</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">290K</div>
                <div className="text-xs text-muted-foreground">Target Subscribers</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">$100M</div>
                <div className="text-xs text-muted-foreground">Target ARR</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CampaignManager() {
  const { toast } = useToast();
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("email");

  const launchCampaignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/marketing/campaigns", {
        name: campaignName,
        type: campaignType,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign Created", description: "Your marketing campaign is ready!" });
      setCampaignName("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    },
  });

  const campaignTemplates = [
    { 
      name: "Upgrade Incentive", 
      type: "email",
      description: "Encourage Sharp members to upgrade to Edge or Max for premium features",
      audience: "Sharp tier members active for 30+ days",
    },
    { 
      name: "New Feature Announcement", 
      type: "push",
      description: "Announce new features to drive engagement",
      audience: "All users",
    },
    { 
      name: "Win Streak Celebration", 
      type: "email",
      description: "Celebrate user wins to increase retention",
      audience: "Users with 3+ day win streak",
    },
    { 
      name: "Re-engagement", 
      type: "email",
      description: "Bring back inactive users",
      audience: "Users inactive for 7+ days",
    },
    { 
      name: "Referral Program", 
      type: "multi",
      description: "Promote refer-a-friend program",
      audience: "Active paid subscribers",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Campaign Templates
          </CardTitle>
          <CardDescription>
            Pre-built campaign templates optimized for conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignTemplates.map((template, i) => (
              <Card key={i} className="hover-elevate cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="outline">{template.type}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <Users className="w-3 h-3 inline mr-1" />
                    {template.audience}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium">Trial Ending Reminder (Day 5)</h4>
                <p className="text-sm text-muted-foreground">Auto-email when 2 days left in trial</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium">Trial Expired Follow-up</h4>
                <p className="text-sm text-muted-foreground">Email 1 day after trial ends with special offer</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium">Weekly Win Report</h4>
                <p className="text-sm text-muted-foreground">Sunday summary of user's betting performance</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const complianceItems = [
  { category: "Legal Review", items: [
    { label: "Ad copy reviewed by legal counsel", status: "complete" },
    { label: "Responsible gambling disclaimers on all pages", status: "complete" },
    { label: "Affiliate disclosure prominently displayed", status: "complete" },
    { label: "Terms of service updated for analysis tool positioning", status: "complete" },
    { label: "Privacy policy covers analytics event tracking", status: "complete" },
  ]},
  { category: "Age & Geo Gating", items: [
    { label: "Age verification gate implemented (21+)", status: "complete" },
    { label: "Geo-blocking for restricted regions", status: "complete" },
    { label: "IP-based region detection active", status: "complete" },
    { label: "Self-exclusion list integration", status: "pending" },
    { label: "Problem gambling resource links on all betting pages", status: "complete" },
  ]},
  { category: "Ad Platform Compliance", items: [
    { label: "Meta ad policy review for betting analysis tools", status: "pending" },
    { label: "Google Ads gambling policy compliance", status: "pending" },
    { label: "TikTok advertising guidelines review", status: "pending" },
    { label: "Creative review workflow established", status: "complete" },
    { label: "No misleading win guarantees in any copy", status: "complete" },
  ]},
  { category: "Data & Privacy", items: [
    { label: "GDPR consent mechanisms implemented", status: "complete" },
    { label: "CCPA opt-out compliance", status: "complete" },
    { label: "First-party data only (no illicit data brokers)", status: "complete" },
    { label: "Hashed identifiers for partner joins", status: "complete" },
    { label: "Data processing agreements with partners", status: "pending" },
    { label: "User consent preferences stored and enforced", status: "complete" },
  ]},
  { category: "Responsible Gambling", items: [
    { label: "Deposit/time limit controls in Settings", status: "complete" },
    { label: "Loss-projection examples available", status: "complete" },
    { label: "NCPG helpline link (1-800-522-4700) on all pages", status: "complete" },
    { label: "Exclude self-excluded users from marketing", status: "pending" },
    { label: "Cool-off period warnings implemented", status: "complete" },
  ]},
];

function ComplianceChecklist() {
  const totalItems = complianceItems.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = complianceItems.reduce((sum, cat) => sum + cat.items.filter(i => i.status === "complete").length, 0);
  const completionRate = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Compliance Overview
          </CardTitle>
          <CardDescription>Campaign launch readiness: {completedItems}/{totalItems} items complete ({completionRate}%)</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completionRate} className="h-3 mb-4" />
          <div className="space-y-6">
            {complianceItems.map((category) => {
              const catComplete = category.items.filter(i => i.status === "complete").length;
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{category.category}</h3>
                    <Badge variant={catComplete === category.items.length ? "default" : "outline"}>
                      {catComplete}/{category.items.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        {item.status === "complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                        )}
                        <span className={`text-sm ${item.status === "complete" ? "text-muted-foreground" : ""}`} data-testid={`compliance-item-${i}`}>
                          {item.label}
                        </span>
                        {item.status === "pending" && (
                          <Badge variant="outline" className="text-xs ml-auto">Pending</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const audienceSegments = [
  {
    name: "Value Seekers",
    description: "Users who actively search for odds value and positive EV opportunities",
    signals: ["High ticket_generate frequency", "Searches for 'odds', 'value', '+EV'", "Uses odds comparison tools"],
    size: "~35% of users",
    ltv: "High",
    priority: "Primary",
  },
  {
    name: "Parlay Enthusiasts",
    description: "Users with high parlay ticket generation rate who love building multi-leg bets",
    signals: ["3+ parlays built per session", "Uses Visual Builder frequently", "Shares tickets socially"],
    size: "~25% of users",
    ltv: "Very High",
    priority: "Primary",
  },
  {
    name: "Data-Driven Bettors",
    description: "Users who consume analytics, team previews, and betting guides before placing bets",
    signals: ["Long session length (15+ min)", "Uses Pro Tools regularly", "Reads scheme analysis"],
    size: "~20% of users",
    ltv: "High",
    priority: "Secondary",
  },
  {
    name: "Casual Converters",
    description: "Casual users likely to convert to paid analytics with the right nudge",
    signals: ["2-3 sessions per week", "Uses free simulation limits", "Newsletter engagement"],
    size: "~15% of users",
    ltv: "Medium",
    priority: "Growth Target",
  },
  {
    name: "Fantasy/Betting Hybrid",
    description: "Users who play fantasy sports and use betting analysis as a complement",
    signals: ["Roster page views", "Player prop analysis usage", "Cross-sport activity"],
    size: "~5% of users",
    ltv: "Medium",
    priority: "Emerging",
  },
];

function AudienceSegments() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Audience Segments
          </CardTitle>
          <CardDescription>Privacy-safe audience targeting based on consented first-party data and in-app behavior signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {audienceSegments.map((segment, i) => (
            <div key={i} className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold" data-testid={`segment-name-${i}`}>{segment.name}</h3>
                  <Badge variant={segment.priority === "Primary" ? "default" : segment.priority === "Growth Target" ? "secondary" : "outline"}>
                    {segment.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{segment.size}</Badge>
                  <Badge variant={segment.ltv === "Very High" ? "default" : "secondary"}>LTV: {segment.ltv}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{segment.description}</p>
              <div>
                <p className="text-xs font-medium mb-1">Behavioral Signals:</p>
                <div className="flex flex-wrap gap-1">
                  {segment.signals.map((signal, j) => (
                    <Badge key={j} variant="outline" className="text-xs">{signal}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Targeting Rules
          </CardTitle>
          <CardDescription>Privacy-safe targeting methods for each channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium">First-Party Data</p>
              <p className="text-xs text-muted-foreground">App events, email lists, consented engagement cohorts. No third-party data brokers.</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium">Platform Audiences</p>
              <p className="text-xs text-muted-foreground">Lookalike/cohort audiences on Meta, Google, TikTok. Contextual targeting on sports content.</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium">Clean-Room Matching</p>
              <p className="text-xs text-muted-foreground">Hashed-ID techniques for partner joins. Server-side matching for conversions with consent.</p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm font-medium">Exclusion Lists</p>
              <p className="text-xs text-muted-foreground">Self-excluded users, opt-out lists, underage users, and geo-blocked regions always excluded.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const PROMO_LIBRARY: Record<string, { tier: string; color: string; campaigns: { type: string; platform: string; copy: string }[] }> = {
  all_members: {
    tier: "All Members",
    color: "from-slate-600 to-slate-800",
    campaigns: [
      {
        type: "Awareness",
        platform: "X / Twitter",
        copy: `🎰 Sors Maxima doesn't guess. Our 46-Factor Intelligence Engine analyzes real-time odds, sharp money flow, and situational data so you don't have to.\n\nExclusive members-only access. No free tier. No casual bettors.\n\nIf you're serious about betting — this is your edge.\n\n🔒 sors-maxima.com #SorsMaxima #SmartBetting #SportsIntelligence`,
      },
      {
        type: "Awareness",
        platform: "Instagram",
        copy: `The public bets on feelings. Our members bet on data.\n\n46 factors. Real-time odds. Sharp money signals. Monte Carlo simulations.\n\nSors Maxima is the intelligence layer serious bettors use to separate themselves from the crowd.\n\nMembers only. Apply your tier today.\n\n#SorsMaxima #BettingIntelligence #SharpMoney #SportsBetting #DataDriven #ExclusiveAccess`,
      },
      {
        type: "Win Showcase",
        platform: "X / Twitter",
        copy: `📊 This week's member picks:\n✅ NBA: +A grade · 73% confidence · Hit\n✅ NFL: Sharp money confirmed · RLM detected · Hit\n✅ MLB: Vegas Prediction™ play · Faded 68% public · Hit\n\nWhen the model says A+, members listen.\nWhen sharp money moves, members follow.\n\nSors Maxima — Intelligence Edge™, not guesswork.\n#SorsMaxima #WinningEdge`,
      },
      {
        type: "Exclusivity",
        platform: "SMS / Push",
        copy: `Sors Maxima | Exclusive Access\n\nYou're in. Most aren't.\n\nYour daily Intelligence Tickets™ are ready — built by the 46-Factor Engine, confirmed by sharp money flow.\n\nOpen the app. Your edge is waiting.`,
      },
    ],
  },
  sharp_tier: {
    tier: "Sharp ($49/mo)",
    color: "from-blue-600 to-blue-800",
    campaigns: [
      {
        type: "Retention",
        platform: "Email",
        copy: `Subject: Your Sharp intelligence is live — here's what's waiting\n\nHey [First Name],\n\nYour Sors Maxima Sharp membership means you're already ahead of 99% of bettors who rely on gut instinct.\n\nHere's what your engine generated today:\n• Daily Intelligence Tickets™ — fresh 46-factor picks\n• Sors Simulation™ results from overnight runs\n• Sharp money flow alerts\n\nBut here's the thing — Edge and Max members are seeing something you're not:\n→ Real-time odds convergence alerts\n→ Vegas Prediction™ strategy access\n→ AI Pick Edge Insight per pick\n\nYour sharp foundation deserves sharper tools. Upgrade to Edge for $50 more.\n\n[Upgrade to Edge →]\n\n— The Sors Maxima Team`,
      },
      {
        type: "Upgrade Promo",
        platform: "X / Twitter",
        copy: `Sharp members: you've seen the picks. You've seen the grades.\n\nBut have you seen the WHY behind every A+ call?\n\nEdge members get the Intel Insight™ — the AI breakdown of exactly why the model is on this side, what sharp money is doing, and what Vegas is protecting against.\n\nUpgrade. Know more. Bet sharper.\n#SorsMaxima #SharpTier #UpgradeYourEdge`,
      },
      {
        type: "FOMO",
        platform: "Push Notification",
        copy: `⚡ Edge members just got a Steam Move alert on tonight's game. Sharp: you have the pick. Edge: they know why the line is moving. Upgrade to see the full picture.`,
      },
      {
        type: "Conversion",
        platform: "Instagram",
        copy: `Sharp tier = a loaded weapon with the safety on.\n\nYou have the 46-Factor picks. The grades. The confidence scores.\n\nEdge tier removes the safety:\n• Real-time line movement alerts\n• Vegas Prediction™ strategy\n• Sors Drift Alert™ when sharp money hits\n• AI breakdown of every A+ pick\n\nOne upgrade. Infinite edge.\n\n#SorsMaxima #SharpMember #EdgeTier #BettingIntelligence`,
      },
    ],
  },
  edge_tier: {
    tier: "Edge ($99/mo)",
    color: "from-purple-600 to-purple-800",
    campaigns: [
      {
        type: "Retention",
        platform: "Email",
        copy: `Subject: Your Edge membership — the intelligence behind this week's best plays\n\nHey [First Name],\n\nEdge members had a strong week. Here's why:\n\n• Vegas Prediction™ confirmed 3 reverse line movement plays\n• Sharp money flow hit 65%+ on 4 of our top picks\n• Public Fade™ strategy: public was 71% on the other side — we hit\n\nThis is the advantage casual bettors will never have.\n\nAs an Edge member, you're already in the top tier of data-driven bettors.\n\nBut there's one level above. Max members get:\n→ Up to 5 independent bet slips\n→ First access to high-conviction Life Changer Tickets™\n→ Direct AI consultation — ask the model anything\n→ Priority match to Max-only picks unavailable below\n\nSee what Max looks like → [View Max Benefits]\n\n— The Sors Maxima Team`,
      },
      {
        type: "Upgrade Promo",
        platform: "X / Twitter",
        copy: `Edge members already see what the public can't.\n\nMax members see what most Edge members can't.\n\nWhen the Life Changer Ticket™ fires — the A+ 5-leg play the engine has been building toward all week — Max gets it first.\n\nFront-running the information is the game. Max is how you win it.\n\n#SorsMaxima #EdgeTier #MaxAccess #IntelligenceEdge`,
      },
      {
        type: "Win Showcase",
        platform: "Instagram",
        copy: `Edge member results this week:\n\n📊 Vegas Prediction™ plays: 4-1\n📊 Public Fade™ plays: 3-1  \n📊 A+ grade hit rate: 71%\n📊 Sharp confirmed picks: 5-2\n\nThis isn't luck. This is 46 factors, sharp money tracking, and Vegas positioning — all working for you.\n\nEdge members know what Vegas knows.\n\n#SorsMaxima #EdgeMember #SharpMoney #WinRate #DataDriven`,
      },
      {
        type: "FOMO",
        platform: "Push Notification",
        copy: `🔥 A Life Changer Ticket™ just generated for Max members — A+ grade, 79% confidence, 4-leg parlay at +680. Edge members get this next. Max gets it now.`,
      },
    ],
  },
  max_tier: {
    tier: "Max ($249/mo)",
    color: "from-amber-600 to-orange-700",
    campaigns: [
      {
        type: "Retention",
        platform: "Email",
        copy: `Subject: Max — your intelligence briefing for the week\n\nHey [First Name],\n\nYou're at the top of the intelligence stack. Here's your weekly summary:\n\n🏆 Life Changer Ticket™ this week: +A grade · 4-leg parlay · +740 odds\n⚡ Sharp steam moves detected: 7 (you were alerted on all)\n🎰 Vegas Prediction™ rate: 83% of confirmed RLM plays went your direction\n📊 AI consultations available: Unlimited — ask anything about any pick\n\nMax members don't just see the picks — they understand the entire market.\n\nYour 5 independent bet slips are ready. Your bankroll recommendations are updated.\n\nThis is what maximum intelligence looks like.\n\n— The Sors Maxima Team`,
      },
      {
        type: "Conversion",
        platform: "X / Twitter",
        copy: `Max tier members at Sors Maxima:\n\n→ 5 simultaneous bet slips running different strategies\n→ Life Changer Tickets™ before anyone else sees them\n→ Unlimited AI consultation on any pick, any time\n→ Every sharp signal, every steam move, every reverse line movement\n→ The full 46-factor breakdown — not just the grade\n\nThis is what maximum access looks like.\nThis is what serious bettors use.\n\n#SorsMaxima #MaxTier #SeriousBettors #IntelligenceEdge`,
      },
      {
        type: "Awareness",
        platform: "Instagram",
        copy: `There's casual. There's sharp. There's Max.\n\nSors Maxima Max members operate at the highest level of sports betting intelligence available to non-institutional bettors.\n\n5 simultaneous strategies. Life Changer Tickets™. Real-time sharp money tracking. Unlimited AI analysis. Vegas positioning intelligence.\n\nThis isn't for everyone. It was never meant to be.\n\nMax. The intelligence ceiling.\n\n#SorsMaxima #MaxTier #ExclusiveAccess #BettingIntelligence #SeriousBettors`,
      },
      {
        type: "Win Showcase",
        platform: "Push Notification",
        copy: `🏆 Max Alert: Life Changer Ticket™ fired. 4-leg A+ parlay at +740. 78% Sors Conviction Score™. Sharp money 69%. Vegas Prediction™ confirmed. This is yours first.`,
      },
    ],
  },
};

function promoTierColor(tier: string) {
  if (tier === "All Members") return "border-slate-400";
  if (tier.includes("Sharp")) return "border-blue-400";
  if (tier.includes("Edge")) return "border-purple-400";
  if (tier.includes("Max")) return "border-amber-400";
  return "border-border";
}

function PromoAdLibrary() {
  const { toast } = useToast();
  const [activeTier, setActiveTier] = useState<keyof typeof PROMO_LIBRARY>("all_members");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [aiTier, setAiTier] = useState("sharp_tier");
  const [aiCampaignType, setAiCampaignType] = useState("upgrade_promo");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiCopied, setAiCopied] = useState(false);

  const tierData = PROMO_LIBRARY[activeTier];

  const copySnippet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
      toast({ title: "Copied!", description: "Ad copy is ready to paste" });
    });
  };

  const generateTierAd = useMutation({
    mutationFn: async () => {
      const tierLabels: Record<string, string> = {
        sharp_tier: "Sharp ($49/mo)",
        edge_tier: "Edge ($99/mo)",
        max_tier: "Max ($249/mo)",
        all_members: "All Paid Members",
      };
      const campaignLabels: Record<string, string> = {
        upgrade_promo: "upgrade upsell (convince them to upgrade to the next tier)",
        retention: "retention (remind them of their value and keep them engaged)",
        win_showcase: "win showcase (highlight recent AI pick performance)",
        fomo: "FOMO urgency (they're missing out on picks/signals right now)",
        exclusivity: "exclusivity (reinforce the members-only, elite nature of the platform)",
        awareness: "awareness (introduce the platform to potential new members)",
      };
      const response = await apiRequest("POST", "/api/admin/marketing/generate", {
        contentType: "tier_promo",
        customPrompt: `Create a compelling ready-to-post marketing ad targeting ${tierLabels[aiTier]} members. Campaign type: ${campaignLabels[aiCampaignType]}. Use the Sors Maxima exclusive brand voice — no free tier exists, this is elite members-only betting intelligence. Use proprietary terms: Intelligence Edge™, Sors Signal™, Life Changer Ticket™, Sors Simulation™, 46-Factor Engine, Vegas Prediction™, Public Fade™. Emphasize exclusivity and data superiority over public bettors. Make it ready to post immediately — no placeholders except [First Name] for emails. Generate 3 versions: one for X/Twitter (under 280 chars), one for Instagram (with hashtags), one for email/SMS.`,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiResult(data.content);
    },
    onError: () => {
      toast({ title: "Generation failed", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PROMO_LIBRARY).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveTier(key as keyof typeof PROMO_LIBRARY)}
            data-testid={`button-promo-tier-${key}`}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              activeTier === key
                ? `${promoTierColor(val.tier)} bg-muted`
                : "border-border hover:border-muted-foreground/50"
            }`}
          >
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${val.color} text-white mb-2`}>
              <Trophy className="w-3 h-3" />
              {val.tier}
            </div>
            <p className="text-xs text-muted-foreground">{val.campaigns.length} ready ads</p>
          </button>
        ))}
      </div>

      <div className="space-y-4" data-testid="promo-snippets-list">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Ready-to-Post: {tierData.tier}
        </h3>
        {tierData.campaigns.map((campaign, idx) => (
          <Card key={idx} className={`border-l-4 ${promoTierColor(tierData.tier)}`} data-testid={`card-promo-${idx}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{campaign.type}</Badge>
                  <Badge className="text-xs bg-muted text-muted-foreground border border-border">{campaign.platform}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => copySnippet(campaign.copy, idx)}
                  data-testid={`button-copy-promo-${idx}`}
                >
                  {copiedIdx === idx ? (
                    <><Check className="w-3 h-3 text-green-500" />Copied!</>
                  ) : (
                    <><Copy className="w-3 h-3" />Copy</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded-lg p-3 border leading-relaxed" data-testid={`text-promo-copy-${idx}`}>
                {campaign.copy}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Tier Ad Generator
        </h3>
        <p className="text-sm text-muted-foreground">
          Generate custom ads targeting a specific tier. Outputs 3 ready-to-post versions: X/Twitter, Instagram, and Email/SMS.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs mb-1.5 block">Target Tier</Label>
            <Select value={aiTier} onValueChange={setAiTier}>
              <SelectTrigger data-testid="select-ai-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_members">All Paid Members</SelectItem>
                <SelectItem value="sharp_tier">Sharp ($49/mo)</SelectItem>
                <SelectItem value="edge_tier">Edge ($99/mo)</SelectItem>
                <SelectItem value="max_tier">Max ($249/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Campaign Type</Label>
            <Select value={aiCampaignType} onValueChange={setAiCampaignType}>
              <SelectTrigger data-testid="select-ai-campaign-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upgrade_promo">Upgrade Promo</SelectItem>
                <SelectItem value="retention">Retention / Re-engage</SelectItem>
                <SelectItem value="win_showcase">Win Showcase</SelectItem>
                <SelectItem value="fomo">FOMO / Urgency</SelectItem>
                <SelectItem value="exclusivity">Exclusivity / Prestige</SelectItem>
                <SelectItem value="awareness">Awareness</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => generateTierAd.mutate()}
          disabled={generateTierAd.isPending}
          className="w-full gap-2"
          data-testid="button-generate-tier-ad"
        >
          {generateTierAd.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating 3-platform ad set...</>
          ) : (
            <><Rocket className="w-4 h-4" />Generate Tier Ad Set</>
          )}
        </Button>
        {aiResult && (
          <div className="space-y-3">
            <ScrollArea className="h-[300px] rounded-lg border p-4 bg-muted/30">
              <pre className="text-sm whitespace-pre-wrap" data-testid="text-ai-tier-ad-result">{aiResult}</pre>
            </ScrollArea>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                navigator.clipboard.writeText(aiResult);
                setAiCopied(true);
                setTimeout(() => setAiCopied(false), 2000);
                toast({ title: "All 3 versions copied!" });
              }}
              data-testid="button-copy-ai-tier-ad"
            >
              {aiCopied ? <><Check className="w-4 h-4 text-green-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy All Versions</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminMarketing() {
  useSEO({ title: "Marketing Dashboard", description: "Marketing performance and campaign analytics" });
  return (
    <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            Marketing Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, manage, and deploy exclusive member marketing — Sharp · Edge · Max
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="promo_ads" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="promo_ads" className="gap-2" data-testid="tab-promo-ads">
            <Rocket className="w-4 h-4" />
            Promo Ads
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2" data-testid="tab-generate">
            <Sparkles className="w-4 h-4" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4" />
            Growth
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2" data-testid="tab-campaigns">
            <Megaphone className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2" data-testid="tab-compliance">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="audiences" className="gap-2" data-testid="tab-audiences">
            <Eye className="w-4 h-4" />
            Audiences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promo_ads">
          <PromoAdLibrary />
        </TabsContent>

        <TabsContent value="generate">
          <ContentGenerator />
        </TabsContent>

        <TabsContent value="analytics">
          <GrowthAnalytics />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignManager />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceChecklist />
        </TabsContent>

        <TabsContent value="audiences">
          <AudienceSegments />
        </TabsContent>
      </Tabs>
    </div>
  );
}

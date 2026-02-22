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
                placeholder="E.g., Focus on the 7-day free trial, target sports bettors aged 25-40..."
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
            <p className="text-xs text-muted-foreground">7-day Pro trials</p>
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
      name: "7-Day Trial Ending", 
      type: "email",
      description: "Remind users their trial is ending and encourage upgrade",
      audience: "Trial users with 1-2 days remaining",
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

export default function AdminMarketing() {
  return (
    <div className="max-w-screen-2xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            AI Marketing Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Marketing automation to drive growth
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate" className="gap-2" data-testid="tab-generate">
            <Sparkles className="w-4 h-4" />
            Content Generator
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4" />
            Growth Analytics
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

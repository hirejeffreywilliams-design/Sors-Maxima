import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronLeft,
  Target,
  Brain,
  Trophy,
  Zap,
  BarChart3,
  Shield,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Layers,
  DollarSign,
  Activity,
  Bookmark,
  Flame,
  MessageSquare,
  Wifi,
  Send,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

const TOTAL_STEPS = 6;

const sportOptions = [
  { id: "NBA", label: "NBA Basketball" },
  { id: "NFL", label: "NFL Football" },
  { id: "MLB", label: "MLB Baseball" },
  { id: "NHL", label: "NHL Hockey" },
  { id: "NCAAB", label: "March Madness" },
  { id: "NCAAF", label: "College Football" },
  { id: "soccer", label: "Soccer / Football" },
  { id: "MMA", label: "MMA / UFC" },
];

const experienceLevels = [
  { value: "beginner", label: "New to Betting", description: "Learning the basics of sports betting" },
  { value: "intermediate", label: "Recreational Bettor", description: "Bet regularly but looking to improve" },
  { value: "advanced", label: "Experienced Sharp", description: "Serious bettor seeking every edge" },
  { value: "professional", label: "Professional / Syndicate", description: "Full-time bettor or part of a group" },
];

const betTypes = [
  { id: "moneyline", label: "Moneylines", icon: Target },
  { id: "spread", label: "Spreads", icon: TrendingUp },
  { id: "totals", label: "Totals (O/U)", icon: BarChart3 },
  { id: "parlays", label: "Parlays", icon: Layers },
  { id: "props", label: "Player Props", icon: Brain },
  { id: "sgp", label: "Same Game Parlays", icon: Sparkles },
  { id: "teasers", label: "Teasers", icon: Activity },
  { id: "futures", label: "Futures", icon: DollarSign },
];

const features = [
  { icon: Brain, title: "46-Factor Prediction Engine", description: "Every pick analyzed across 46 data points — sharp money, injuries, line movement, weather, and momentum" },
  { icon: Flame, title: "Life Changer Ticket™", description: "One daily high-ceiling parlay with no risk ceiling — the platform's best play, fresh every morning" },
  { icon: Target, title: "Smart Ticket Generator", description: "AI builds optimized parlays in seconds with correlation detection and risk grading" },
  { icon: TrendingUp, title: "+EV Odds Center", description: "Identifies positive expected value bets across all major sportsbooks with live line movement alerts" },
  { icon: Sparkles, title: "Intelligence Cards™", description: "Earn collectible pick cards from your bets — rip packs, flip cards, and showcase wins to the community" },
  { icon: Wifi, title: "Live Data Stream", description: "Real-time scores, odds, and sharp signals pushed to your screen every 30 seconds — no refresh needed" },
  { icon: Bookmark, title: "Watchlist & Research Notes", description: "Save teams you're tracking and keep a private betting journal to log your reasoning and review results" },
  { icon: Shield, title: "Bet Grading & Track Record", description: "Every ticket graded A+ to F. All picks publicly logged and settled — full transparency, no cherry-picking" },
  { icon: MessageSquare, title: "Member Feedback System", description: "Rate your experience, report bugs, or suggest features — the team reads and replies to all submissions" },
  { icon: BarChart3, title: "Bankroll & Performance Tracker", description: "Track P&L, ROI, and win rate by sport and market. Auto-settlement from live final scores" },
];

const sportsbookOptions = [
  { id: "DraftKings", label: "DraftKings" },
  { id: "FanDuel", label: "FanDuel" },
  { id: "BetMGM", label: "BetMGM" },
  { id: "Caesars", label: "Caesars Sportsbook" },
  { id: "ESPN Bet", label: "ESPN Bet" },
  { id: "BetRivers", label: "BetRivers" },
  { id: "PointsBet", label: "PointsBet" },
  { id: "Bet365", label: "Bet365" },
  { id: "Pinnacle", label: "Pinnacle" },
  { id: "Other", label: "Other / Multiple" },
];

// ── Meet Your AI Analyst step ─────────────────────────────────────────────────

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function MeetAiStep({
  sports,
  experience,
  canProceedToNext,
  onProceedReady,
}: {
  sports: string[];
  experience: string;
  canProceedToNext: boolean;
  onProceedReady: () => void;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-load greeting on mount
  useEffect(() => {
    if (greetingLoaded) return;
    setGreetingLoaded(true);
    setIsLoading(true);

    apiRequest("POST", "/api/ai/onboarding-greeting", { sports, experience })
      .then(r => r.json())
      .then((data: { greeting?: string }) => {
        setMessages([{ id: "greeting", role: "assistant", content: data.greeting ?? "Welcome to Sors Maxima. I'm SORS Intelligence — ask me anything about today's picks, parlay math, or bankroll sizing." }]);
      })
      .catch(() => {
        setMessages([{ id: "greeting", role: "assistant", content: "Welcome to Sors Maxima. I'm SORS Intelligence — powered by live picks, real calibration stats, and Kelly sizing. What would you like to know?" }]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || hasAskedQuestion) return;

    const userMsg: AiMessage = { id: Date.now().toString(), role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setHasAskedQuestion(true);

    try {
      const payload = [...messages, userMsg]
        .filter(m => m.id !== "greeting")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await apiRequest("POST", "/api/ai/analyst", {
        messages: payload.length > 0 ? payload : [{ role: "user", content: trimmed }],
        isOnboarding: true,
      });
      const data = await res.json();
      const response = data.response ?? "Great question. The platform has live picks and analytics waiting for you — explore them in your dashboard.";
      setMessages(prev => [...prev, { id: `resp-${Date.now()}`, role: "assistant", content: response }]);
      onProceedReady();
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "I had trouble connecting just now, but I'm ready to help you once you're in the dashboard. Let's keep going!" }]);
      onProceedReady();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20" data-testid="onboarding-step-ai">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}>
          <Zap className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Meet Your AI Analyst</CardTitle>
        <CardDescription className="text-base max-w-lg mx-auto">
          SORS Intelligence is your data-driven betting companion. Say hi, ask one question, and see what it can do before you enter your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat area */}
        <div
          className="rounded-xl p-4 space-y-3 min-h-[140px]"
          style={{ background: "linear-gradient(160deg, rgba(8,8,14,0.97) 0%, rgba(14,10,6,0.97) 100%)", border: "1px solid rgba(240,83,43,0.2)" }}
        >
          <ScrollArea className="max-h-48">
            <div className="space-y-3 pr-2">
              {isLoading && messages.length === 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 flex-shrink-0" style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}>
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: "rgba(240,83,43,0.12)", border: "1px solid rgba(240,83,43,0.18)" }}>
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 flex-shrink-0" style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}>
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[85%] ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={msg.role === "user"
                      ? { background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.1)" }
                      : { background: "rgba(240,83,43,0.1)", border: "1px solid rgba(240,83,43,0.16)" }
                    }
                    data-testid={`onboarding-ai-msg-${msg.role}`}
                  >
                    <p className="text-[12px] leading-relaxed text-white/90 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 flex-shrink-0" style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}>
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: "rgba(240,83,43,0.12)", border: "1px solid rgba(240,83,43,0.18)" }}>
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input row — only allow one question */}
        {!hasAskedQuestion ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
              placeholder="Ask anything — best picks today, how Kelly works, parlay math…"
              disabled={isLoading || messages.length === 0}
              className="flex-1 h-10 text-sm"
              data-testid="input-onboarding-ai-question"
            />
            <Button
              size="sm"
              onClick={sendQuestion}
              disabled={isLoading || !input.trim() || messages.length === 0}
              className="h-10 px-4"
              data-testid="button-onboarding-ai-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">
              SORS Intelligence is ready. Click Continue to enter your dashboard.
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          This counts toward your daily message quota · Not gambling advice · Statistical analysis only
        </p>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  useSEO({ title: "Get Started", description: "Set up your Sors Maxima experience" });
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [selectedBetTypes, setSelectedBetTypes] = useState<string[]>([]);
  const [bankrollSize, setBankrollSize] = useState("");
  const [selectedSportsbooks, setSelectedSportsbooks] = useState<string[]>([]);
  const [aiStepReady, setAiStepReady] = useState(false);

  const savePreferences = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/onboarding", {
        sports: selectedSports,
        experience,
        betTypes: selectedBetTypes,
        bankrollSize,
        sportsbooks: selectedSportsbooks,
        onboardingCompleted: true,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/onboarding"], { onboardingCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      toast({ title: "Welcome to Sors Maxima", description: "Your preferences have been saved. Let's find your edge." });
      setLocation("/");
    },
    onError: () => {
      queryClient.setQueryData(["/api/user/onboarding"], { onboardingCompleted: true });
      toast({ title: "Preferences saved locally", description: "Redirecting to your dashboard." });
      setLocation("/");
    },
  });

  const toggleSport = (id: string) => {
    setSelectedSports(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleBetType = (id: string) => {
    setSelectedBetTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleSportsbook = (id: string) => {
    setSelectedSportsbooks(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return selectedSports.length > 0 && experience !== "";
      case 3: return selectedBetTypes.length > 0;
      case 4: return true;
      case 5: return true; // AI step — can always proceed (even without asking)
      case 6: return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else savePreferences.mutate();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" data-testid="page-onboarding">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="w-3 h-3" />
            Step {step} of {TOTAL_STEPS}
          </Badge>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2 max-w-xs mx-auto" />
        </div>

        {step === 1 && (
          <Card className="border-primary/20" data-testid="onboarding-step-welcome">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl">Welcome to Sors Maxima</CardTitle>
              <CardDescription className="text-base max-w-lg mx-auto">
                You've joined an exclusive community of data-driven bettors. Here's what your membership unlocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((f) => (
                  <div key={f.title} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-primary/20" data-testid="onboarding-step-sports">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Sports & Experience</CardTitle>
              <CardDescription>Select the sports you bet on and your experience level so we can personalize your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sports You Follow</Label>
                <div className="grid grid-cols-2 gap-2">
                  {sportOptions.map((sport) => (
                    <div
                      key={sport.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSport(sport.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSport(sport.id); } }}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left cursor-pointer ${
                        selectedSports.includes(sport.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                      data-testid={`sport-option-${sport.id}`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                        selectedSports.includes(sport.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}>
                        {selectedSports.includes(sport.id) && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      {sport.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Experience Level</Label>
                <div className="grid grid-cols-1 gap-2">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setExperience(level.value)}
                      className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                        experience === level.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`experience-option-${level.value}`}
                    >
                      <span className="text-sm font-medium">{level.label}</span>
                      <span className="text-xs text-muted-foreground">{level.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-primary/20" data-testid="onboarding-step-bets">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Betting Style</CardTitle>
              <CardDescription>Tell us what types of bets you make and your typical bankroll size.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Bet Types You Prefer</Label>
                <div className="grid grid-cols-2 gap-2">
                  {betTypes.map((bt) => (
                    <button
                      key={bt.id}
                      onClick={() => toggleBetType(bt.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                        selectedBetTypes.includes(bt.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                      data-testid={`bettype-option-${bt.id}`}
                    >
                      <bt.icon className="w-4 h-4 shrink-0" />
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Typical Bankroll Size</Label>
                <Select value={bankrollSize} onValueChange={setBankrollSize}>
                  <SelectTrigger data-testid="select-bankroll">
                    <SelectValue placeholder="Select your bankroll range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under500">Under $500</SelectItem>
                    <SelectItem value="500-2000">$500 - $2,000</SelectItem>
                    <SelectItem value="2000-10000">$2,000 - $10,000</SelectItem>
                    <SelectItem value="10000-50000">$10,000 - $50,000</SelectItem>
                    <SelectItem value="over50000">$50,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-primary/20" data-testid="onboarding-step-sportsbooks">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Which sportsbooks do you use?</CardTitle>
              <CardDescription>
                Optional — helps us tailor odds comparisons and EV alerts to books you actually have access to. We never ask for credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {sportsbookOptions.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => toggleSportsbook(book.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      selectedSportsbooks.includes(book.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                    data-testid={`sportsbook-option-${book.id}`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      selectedSportsbooks.includes(book.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}>
                      {selectedSportsbooks.includes(book.id) && "✓"}
                    </div>
                    {book.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Select all that apply — this data is only used to personalize your experience and is never sold or shared.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <MeetAiStep
            sports={selectedSports}
            experience={experience}
            canProceedToNext={aiStepReady}
            onProceedReady={() => setAiStepReady(true)}
          />
        )}

        {step === 6 && (
          <Card className="border-primary/20" data-testid="onboarding-step-ready">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">You're All Set</CardTitle>
              <CardDescription>Here's a quick guide to get the most out of Sors Maxima from day one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { step: "1", title: "Check the Dashboard", desc: "Your personalized feed shows today's best picks, live games, and trending bets." },
                  { step: "2", title: "Generate a Smart Ticket", desc: "Use the Auto Generator or Parlay Builder to create AI-optimized tickets." },
                  { step: "3", title: "Review Your Grades", desc: "Every ticket gets an A-F grade. Aim for B+ or higher for the best edge." },
                  { step: "4", title: "Track Your Results", desc: "Log your bets in the Bankroll Tracker to measure your ROI over time." },
                  { step: "5", title: "Use +EV Finder", desc: "The EV Heatmap shows positive expected value bets across all sportsbooks." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm font-medium text-primary">Pro Tip</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The 46-factor engine gets smarter the more you use it. Your first week of data helps calibrate predictions to your style.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1}
            data-testid="button-onboarding-back"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step < TOTAL_STEPS && (
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/user/onboarding", {
                      onboardingCompleted: true,
                    });
                  } catch {}
                  queryClient.setQueryData(["/api/user/onboarding"], { onboardingCompleted: true });
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
                  setLocation("/");
                }}
                className="text-muted-foreground"
                data-testid="button-onboarding-skip"
              >
                Skip for now
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={!canProceed() || savePreferences.isPending}
              data-testid="button-onboarding-next"
            >
              {savePreferences.isPending ? "Saving..." : step === TOTAL_STEPS ? "Enter Dashboard" : "Continue"}
              {!savePreferences.isPending && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

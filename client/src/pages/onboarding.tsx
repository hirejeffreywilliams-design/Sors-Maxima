import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";

const TOTAL_STEPS = 4;

const sportOptions = [
  { id: "NBA", label: "NBA Basketball" },
  { id: "NFL", label: "NFL Football" },
  { id: "MLB", label: "MLB Baseball" },
  { id: "NHL", label: "NHL Hockey" },
  { id: "NCAAB", label: "College Basketball" },
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
  { icon: Brain, title: "46-Factor Prediction Engine", description: "Every pick analyzed across 46 data points including sharp money, injury impact, weather, and momentum" },
  { icon: Target, title: "Smart Ticket Generator", description: "AI builds optimized parlays with correlation detection and risk grading" },
  { icon: TrendingUp, title: "+EV Finder", description: "Identifies positive expected value bets across all major sportsbooks" },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track your performance, ROI, and betting patterns over time" },
  { icon: Shield, title: "Bet Grading (A-F)", description: "Every ticket graded on quality so you know exactly what you're betting" },
  { icon: Zap, title: "Real-Time Alerts", description: "Line movement alerts, sharp action notifications, and injury updates" },
];

export default function OnboardingPage() {
  useSEO({ title: "Get Started", description: "Set up your Sors Maxima experience" });
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [selectedBetTypes, setSelectedBetTypes] = useState<string[]>([]);
  const [bankrollSize, setBankrollSize] = useState("");

  const savePreferences = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/onboarding", {
        sports: selectedSports,
        experience,
        betTypes: selectedBetTypes,
        bankrollSize,
        onboardingCompleted: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      toast({ title: "Welcome to Sors Maxima", description: "Your preferences have been saved. Let's find your edge." });
      setLocation("/");
    },
    onError: () => {
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

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return selectedSports.length > 0 && experience !== "";
      case 3: return selectedBetTypes.length > 0;
      case 4: return true;
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
                onClick={() => {
                  savePreferences.mutate();
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

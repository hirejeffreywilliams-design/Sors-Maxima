import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
  Trophy,
  DollarSign,
  CheckCircle2,
  Star,
  Shield,
  BarChart3,
  Brain,
  ArrowRight,
  CircleDot,
  Layers
} from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  actionLabel?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Sors Maxima",
    description: "This guide will show you exactly how to generate, read, and pick winning tickets step by step. Every pick is powered by live game data and real-time odds from 15+ major sportsbooks.",
    icon: <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />,
    tips: [
      "All game data comes live — scores, records, rosters, and injuries",
      "Odds are pulled from 15+ major sportsbooks in real time",
      "Our engine analyzes 46 different factors before recommending a pick",
      "Nothing is made up - every number is backed by real data"
    ]
  },
  {
    title: "Step 1: Pick Your Sports",
    description: "Start by selecting the sports you want to bet on. You can pick one sport or mix several together. The more sports you select, the more matchups are available for the engine to find value.",
    icon: <Target className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />,
    tips: [
      "Tap the sport buttons (NBA, NFL, MLB, NHL, etc.) to select them",
      "Selected sports turn colored - tap again to deselect",
      "Mixing 2-3 sports gives you the most diverse picks",
      "Or use 'Quick Pick' to auto-select today's active sports instantly"
    ],
    actionLabel: "Select sports on the main page"
  },
  {
    title: "Step 2: Set Your Risk Level",
    description: "Open 'Advanced Settings' to control how risky your tickets are. This directly affects how many legs per ticket and how big the potential payouts are.",
    icon: <Shield className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-500" />,
    tips: [
      "Conservative = 2-3 legs, higher chance of winning, smaller payouts",
      "Moderate = 3-4 legs, balanced risk and reward (recommended for beginners)",
      "Aggressive = 4-6 legs, lower win chance but much bigger payouts",
      "Set your bankroll (total $ you're working with) so stake sizes are calculated for you"
    ],
    actionLabel: "Tap 'Advanced Settings' to adjust"
  },
  {
    title: "Step 3: Generate Tickets",
    description: "Hit the big 'Generate Winning Tickets' button. The engine scans every live game, compares odds across sportsbooks, and builds the best possible parlay combinations for you.",
    icon: <Zap className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />,
    tips: [
      "Generation takes a few seconds while it analyzes all live matchups",
      "You'll get up to 6 optimized tickets ranked from best to worst",
      "Each ticket is named after the actual games it covers (e.g., 'Celtics vs Lakers')",
      "Hit 'Recalculate' anytime to refresh with the latest live data"
    ],
    actionLabel: "Tap 'Generate Winning Tickets'"
  },
  {
    title: "Step 4: Read Your Tickets",
    description: "Each ticket card shows you everything you need to decide if it's worth betting. Here's what the key numbers mean:",
    icon: <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />,
    tips: [
      "Grade (A+ to D) = overall quality rating. Aim for B or higher",
      "Win Prob = estimated chance this ticket wins. Higher = safer",
      "EV% = expected value. Positive means the odds are in your favor",
      "Confidence = how strongly our 46-factor engine agrees on this pick"
    ]
  },
  {
    title: "Step 5: Dig Into the Details",
    description: "Tap a ticket's 'Legs' button to expand it. Each leg is one individual bet inside the parlay. Check the matchup details, odds, and analysis signals before deciding.",
    icon: <Layers className="w-8 h-8 sm:w-12 sm:h-12 text-purple-500" />,
    tips: [
      "Each leg shows the teams, bet type (Spread, Moneyline, Total), and odds",
      "'Sharp Action' badge = professional bettors are on this side (good sign)",
      "'Steam Move' badge = line is moving fast, meaning the value is real",
      "Green data source badges show where the odds data came from"
    ]
  },
  {
    title: "Step 6: Pick & Use Your Ticket",
    description: "Found a ticket you like? Here's how to use it:",
    icon: <Star className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500" />,
    tips: [
      "'Add to Slip' = saves individual legs to your custom parlay builder",
      "'Track This Bet' = logs the bet so you can track your results over time",
      "Copy button = copies the picks to share with friends or paste into your sportsbook",
      "Look for tickets with Grade B+ or higher, positive EV%, and 'Sharp Action' legs"
    ],
    actionLabel: "Use the buttons on any ticket card"
  },
  {
    title: "Pro Tip: What Makes a Good Ticket",
    description: "Not all tickets are equal. Here's a quick checklist for picking winners:",
    icon: <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500" />,
    tips: [
      "Grade B or higher = the engine has strong confidence",
      "Positive EV% = the math says these odds have value for you",
      "Multiple 'Sharp Action' legs = pros agree with these picks",
      "Low model disagreement = all 46 factors are pointing the same way",
      "Check 'Risk Factors' in the details to know what could go wrong"
    ]
  },
  {
    title: "Bonus: Other Powerful Tools",
    description: "Beyond the ticket generator, explore these features to sharpen your edge even more:",
    icon: <Brain className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-500" />,
    tips: [
      "Visual Builder tab = manually build your own parlays with live odds",
      "Pro Tools = odds comparison, arbitrage finder, correlation engine",
      "Live Center = track games in real-time with momentum and cash-out advice",
      "Finance = log all your bets, track ROI, and manage your bankroll over time"
    ]
  },
  {
    title: "You're Ready to Win!",
    description: "You now know how to generate, read, and select the best tickets. Remember: always bet what you can afford to lose, and use the data to make smarter decisions.",
    icon: <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />,
    tips: [
      "Start with Conservative or Moderate risk while you learn",
      "Focus on tickets graded B or higher with positive EV%",
      "Use 'Recalculate' before placing bets to get the freshest data",
      "Set responsible gaming limits in Settings if needed",
      "Good luck - let the data work for you!"
    ]
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  isOpen: boolean;
}

export function OnboardingTutorial({ onComplete, isOpen }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  if (!isOpen) return null;
  
  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  
  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" data-testid="tutorial-overlay">
      <Card className="w-full max-w-lg relative overflow-hidden max-h-[90vh] overflow-y-auto" data-testid="tutorial-card">
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10 h-8 w-8 sm:h-9 sm:w-9"
          onClick={handleSkip}
          data-testid="button-close-tutorial"
        >
          <X className="w-4 h-4" />
        </Button>
        
        <CardContent className="pt-8 pb-4 sm:pt-6 px-4 sm:px-6 space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          
          <div className="text-center space-y-2 sm:space-y-3 py-2 sm:py-3">
            <div className="flex justify-center">
              {step.icon}
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-lg sm:text-xl font-bold leading-tight" data-testid="text-tutorial-title">{step.title}</h2>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed" data-testid="text-tutorial-description">
                {step.description}
              </p>
            </div>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2 bg-muted/50 rounded-lg p-3 sm:p-4">
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] sm:text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{tip}</span>
              </div>
            ))}
          </div>

          {step.actionLabel && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-primary">{step.actionLabel}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-2 pt-1 sm:pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
              data-testid="button-tutorial-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
              Back
            </Button>
            
            <div className="flex gap-1">
              {tutorialSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                    i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-muted-foreground/30'
                  }`}
                  data-testid={`button-tutorial-dot-${i}`}
                />
              ))}
            </div>
            
            <Button 
              size="sm"
              onClick={handleNext} 
              className="h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
              data-testid="button-tutorial-next"
            >
              {currentStep === tutorialSteps.length - 1 ? (
                <>
                  <span className="hidden sm:inline">Start Winning</span>
                  <span className="sm:hidden">Start</span>
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
          
          {currentStep < tutorialSteps.length - 1 && (
            <div className="text-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground text-[10px] sm:text-xs h-auto p-0 underline decoration-muted-foreground/30 underline-offset-2"
                data-testid="button-skip-tutorial"
              >
                Skip tutorial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
      data-testid="button-open-tutorial"
    >
      <Sparkles className="w-4 h-4" />
      How It Works
    </Button>
  );
}

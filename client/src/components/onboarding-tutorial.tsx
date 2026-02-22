import { useState, useEffect } from "react";
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
  Users,
  Trophy,
  DollarSign,
  Settings,
  CheckCircle2,
  Rocket
} from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Sors Maxima",
    description: "Your sports betting intelligence platform. Let's walk through how to get the most out of your experience.",
    icon: <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />,
    tips: [
      "We use real ESPN game data for all picks",
      "Odds from ESPN are compared and analyzed",
      "All recommendations are graded A-F for easy decision making"
    ]
  },
  {
    title: "Generate Smart Tickets",
    description: "The home page is your ticket generator. Select sports, set your risk level, and generate optimized parlays from real data.",
    icon: <Target className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />,
    tips: [
      "Choose multiple sports for diversified tickets",
      "Conservative = higher win chance, lower payouts",
      "Aggressive = lower win chance, higher payouts",
      "Use Quick Pick for instant recommendations"
    ]
  },
  {
    title: "Quick Pick Feature",
    description: "Short on time? Hit the Quick Pick button for instant tickets based on today's best opportunities.",
    icon: <Zap className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-500" />,
    tips: [
      "One click generates 3 optimized tickets",
      "Automatically selects today's active sports",
      "Uses moderate risk level for balanced picks",
      "Perfect for busy bettors"
    ]
  },
  {
    title: "Live Center",
    description: "Track your active bets in real-time. Use the hedge calculator to lock in profits or minimize losses.",
    icon: <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />,
    tips: [
      "See live momentum for in-progress games",
      "Calculate optimal hedge bets",
      "Get AI assistant advice on your active bets",
      "Track closing line value to see if you're beating the market"
    ]
  },
  {
    title: "Pro Tools",
    description: "Access advanced features like correlation analysis, odds comparison, and ML projections.",
    icon: <Rocket className="w-8 h-8 sm:w-12 sm:h-12 text-purple-500" />,
    tips: [
      "Compare odds across 6 major sportsbooks",
      "Find arbitrage opportunities",
      "Use the correlation engine for SGPs",
      "Run bankroll simulations"
    ]
  },
  {
    title: "Community & Tipsters",
    description: "Follow successful bettors, share your picks, and join tipster communities.",
    icon: <Users className="w-8 h-8 sm:w-12 sm:h-12 text-orange-500" />,
    tips: [
      "Follow top performers on the leaderboard",
      "Share your winning tickets",
      "Create your own tipster community",
      "Earn from your picks (platform takes 15%)"
    ]
  },
  {
    title: "Track Your Performance",
    description: "Use the Finance section to track all your bets, monitor ROI, and manage your bankroll.",
    icon: <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500" />,
    tips: [
      "Log bets across multiple sportsbooks",
      "See detailed performance analytics",
      "Track ROI over time",
      "Export tax reports at year end"
    ]
  },
  {
    title: "You're Ready!",
    description: "That's everything you need to start making smarter picks. Remember: always bet responsibly and only risk what you can afford.",
    icon: <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500" />,
    tips: [
      "Set betting limits in Settings > Responsible Gaming",
      "Enable Smart Alerts for opportunities",
      "Complete daily challenges for rewards",
      "Good luck!"
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
        
        <CardContent className="pt-8 pb-4 sm:pt-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
          
          <div className="text-center space-y-2 sm:space-y-4 py-2 sm:py-4">
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
                    i === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
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
                  <span className="hidden sm:inline">Get Started</span>
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

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Gem, Atom, Star, Trophy, Shield, Bot, LineChart, Bell, Users, Wallet, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
}

const tiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic quantum analysis',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '',
    yearlyPriceId: '',
    features: [
      '3 ticket generations per day',
      'Basic quantum coherence scores',
      '2 sports coverage',
      'Standard bet grading',
      'Community leaderboard view',
    ],
    icon: <Zap className="w-6 h-6" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full quantum analysis for serious bettors',
    monthlyPrice: 29,
    yearlyPrice: 290,
    monthlyPriceId: 'price_1SskcQIp7f8yVoSO8uj04w8T',
    yearlyPriceId: 'price_1SskcQIp7f8yVoSO1VDHyrWy',
    features: [
      'Unlimited ticket generations',
      'All 40+ quantum analysis factors',
      'All 6 sports coverage',
      'Advanced bet grading (A+ to F)',
      'Kelly Criterion stake sizing',
      'Correlation engine access',
      'Basic smart alerts',
      'Paper trading mode',
      'ROI dashboard',
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'Premium tools for professional edge',
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOEKOx5hde',
    yearlyPriceId: 'price_1SskcRIp7f8yVoSOOBNZTk3V',
    features: [
      'Everything in Pro',
      'Real-time steam move alerts',
      'AI Betting Assistant (unlimited)',
      'ML prop projections',
      'CLV tracking & analysis',
      'Public vs Sharp money data',
      'Live momentum tracker',
      'Priority support',
      'Advanced tax export',
      'Multi-sportsbook tracker',
    ],
    icon: <Crown className="w-6 h-6" />,
    popular: true,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'whale',
    name: 'Whale',
    description: 'VIP access for high-volume bettors',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    monthlyPriceId: 'price_1SskcRIp7f8yVoSOWQe60fFw',
    yearlyPriceId: 'price_1SskcSIp7f8yVoSOxK0pY4Ki',
    features: [
      'Everything in Elite',
      'VIP exclusive picks',
      '1-on-1 coaching sessions',
      'Private Discord channel',
      'Early access to new features',
      'Custom betting strategies',
      'Dedicated account manager',
      'White-glove support',
      'Exclusive whale leaderboard',
      'Beta feature testing',
    ],
    icon: <Gem className="w-6 h-6" />,
    color: 'from-yellow-500 to-orange-500',
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();

  const { data: subscription } = useQuery<{ tier: string; status: string; customerId: string | null }>({
    queryKey: ['/api/subscription'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest('POST', '/api/stripe/checkout', { priceId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (tier: PricingTier) => {
    if (tier.id === 'free') return;
    
    const priceId = isYearly ? tier.yearlyPriceId : tier.monthlyPriceId;
    checkoutMutation.mutate(priceId);
  };

  const currentTier = subscription?.tier || 'free';

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <header className="text-center space-y-4">
          <Badge variant="outline" className="gap-1 bg-purple-500/10 border-purple-500/30 text-purple-400">
            <Atom className="w-3 h-3" />
            Quantum-Powered Intelligence
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Choose Your Edge
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock the full power of quantum analysis with our premium tiers. Join thousands of winning bettors.
          </p>
          
          <div className="flex items-center justify-center gap-3 pt-4">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing-toggle"
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
            </Label>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative flex flex-col ${tier.popular ? 'border-purple-500 shadow-lg shadow-purple-500/20' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white">
                    <Trophy className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white mb-3`}>
                  {tier.icon}
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ${isYearly ? Math.round(tier.yearlyPrice / 12) : tier.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {isYearly && tier.yearlyPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${tier.yearlyPrice}/year (billed annually)
                    </p>
                  )}
                </div>
                
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={tier.popular ? "default" : tier.id === 'free' ? "outline" : "secondary"}
                  disabled={currentTier === tier.id || checkoutMutation.isPending}
                  onClick={() => handleSubscribe(tier)}
                  data-testid={`button-subscribe-${tier.id}`}
                >
                  {currentTier === tier.id ? 'Current Plan' : 
                   tier.id === 'free' ? 'Get Started Free' : 
                   `Subscribe to ${tier.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-xl p-8 border">
          <h2 className="text-2xl font-bold mb-6 text-center">Why Bettors Choose Sors Maxima</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Atom className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold">Quantum Analysis</h3>
              <p className="text-sm text-muted-foreground">
                40+ factors analyzed using quantum-inspired algorithms for superior pattern recognition
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <LineChart className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-semibold">Proven Results</h3>
              <p className="text-sm text-muted-foreground">
                Our users average 12% higher CLV and 23% better ROI vs market benchmarks
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-semibold">Smart Bankroll</h3>
              <p className="text-sm text-muted-foreground">
                Kelly Criterion sizing and risk management to protect and grow your bankroll
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Money-Back Guarantee</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Try any premium plan risk-free for 7 days. If you're not completely satisfied, 
            we'll refund your payment in full - no questions asked.
          </p>
        </div>
      </div>
    </div>
  );
}

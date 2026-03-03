import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useSearch, Link } from "wouter";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Zap, LayoutGrid, ShieldCheck } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const applicationFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(2, "Name must be at least 2 characters"),
  tier: z.enum(["edge", "max"], {
    required_error: "Please select a tier",
  }),
  experience: z.string().min(1, "Please select your experience level"),
  goals: z.string().min(10, "Please describe your goals in at least 10 characters"),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

type AuthResponse = {
  authenticated: boolean;
  username?: string;
  tier?: string;
  isAdmin?: boolean;
};

export default function ApplyPage() {
  useSEO({ title: "Apply for Access | Sors Maxima", description: "Apply for Edge or Max tier membership" });
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTier = params.get("tier") === "max" ? "max" : "edge";

  const { data: auth, isLoading: authLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/check"],
  });

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      email: "",
      username: "",
      tier: initialTier as "edge" | "max",
      experience: "",
      goals: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ApplicationFormValues) => {
      const res = await apiRequest("POST", "/api/apply", values);
      return res.json();
    },
    onSuccess: () => {
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nextStep = async () => {
    const fields = step === 1 ? ["email", "username", "tier"] : ["experience", "goals"];
    const isValid = await form.trigger(fields as any);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const onSubmit = (values: ApplicationFormValues) => {
    mutation.mutate(values);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Member check
  if (auth?.authenticated && auth.tier && auth.tier !== "free") {
    const tierMap: Record<string, string> = {
      pro: "Sharp",
      edge: "Edge",
      whale: "Max",
    };
    const tierName = tierMap[auth.tier] || auth.tier;

    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">You're Already a Member</CardTitle>
            <CardDescription className="text-base mt-2">
              You already have an active Sors Maxima <span className="font-bold text-foreground">{tierName}</span> membership.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Visit your Settings to manage your plan or upgrade to a higher tier.
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" onClick={() => setLocation("/")} data-testid="button-go-command-center">
              <Zap className="mr-2 h-4 w-4" /> Go to Command Center
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/settings")} data-testid="button-go-settings">
              <LayoutGrid className="mr-2 h-4 w-4" /> Manage Membership
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Logged in but free tier (shouldn't happen but just in case)
  if (auth?.authenticated && auth.tier === "free") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Choose a Plan</CardTitle>
            <CardDescription>
              To access Sors Maxima picks, you need to select a membership plan.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setLocation("/pricing")} data-testid="button-view-pricing">
              View Pricing & Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Application Submitted</CardTitle>
            <CardDescription>
              Thank you for applying to Sors Maxima. Our team will review your application and get back to you within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setLocation("/")} data-testid="button-return-home">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step {step} of 2</span>
            <div className="flex gap-1">
              <div className={`h-1 w-8 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1 w-8 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            </div>
          </div>
          <CardTitle className="text-2xl">Apply for Members-Only Access</CardTitle>
          <CardDescription>
            Join our elite community of sharp bettors. Applications are reviewed manually to maintain quality.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desired Tier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tier">
                              <SelectValue placeholder="Select a tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="edge">Edge Tier ($99/mo)</SelectItem>
                            <SelectItem value="max">Max Tier ($249/mo)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience">
                              <SelectValue placeholder="Select your experience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                            <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
                            <SelectItem value="professional">Professional (10+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="goals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Betting Goals & Strategy</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your betting goals and what you hope to achieve with Sors Maxima..."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="textarea-goals"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {step === 1 ? (
                <Button type="button" variant="ghost" onClick={() => setLocation("/")} data-testid="button-cancel">
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              
              {step === 1 ? (
                <Button type="button" onClick={nextStep} data-testid="button-next">
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { insertApplicationSchema, type InsertApplication } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO } from "@/hooks/use-seo";
import { Shield, Target, Zap, ChevronRight, CheckCircle } from "lucide-react";

export default function ApplyPage() {
  useSEO({ title: "Apply for Membership | Sors Maxima", description: "Apply for Edge or Max membership at Sors Maxima." });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTier = params.get("tier") || "edge";

  const form = useForm<InsertApplication>({
    resolver: zodResolver(insertApplicationSchema),
    defaultValues: {
      email: "",
      username: "",
      tier: initialTier,
      experience: "",
      goals: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertApplication) => {
      const res = await apiRequest("POST", "/api/apply", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "We've received your application. Check your email for confirmation.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Join the Inner Circle
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Sors Maxima Edge and Max tiers are restricted to maintain market impact.
            Apply below for access to our most advanced intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-muted/50">
            <CardHeader className="p-4 space-y-1">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">Verified Edge</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-muted/50">
            <CardHeader className="p-4 space-y-1">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">Market Protection</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-muted/50">
            <CardHeader className="p-4 space-y-1">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">Priority Data</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-primary/20 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle>Membership Application</CardTitle>
            <CardDescription>
              Tell us about your betting experience and goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} data-testid="input-apply-username" />
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
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-apply-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-apply-tier">
                            <SelectValue placeholder="Select a tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="edge">Sors Edge — $99/mo</SelectItem>
                          <SelectItem value="max">Sors Max — $249/mo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Sharp tier ($49/mo) is open access and does not require an application.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Betting Experience</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How long have you been betting? What markets do you focus on?"
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-apply-experience"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your goals with Sors Maxima?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What specific tools or data points are you looking for?"
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-apply-goals"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-apply-submit"
                >
                  {mutation.isPending ? "Submitting..." : "Submit Application"}
                  {!mutation.isPending && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-8 text-muted-foreground pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Private Review</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Priority Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

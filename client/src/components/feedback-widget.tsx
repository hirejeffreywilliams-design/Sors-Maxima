import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquarePlus, Send, Bug, Lightbulb, HelpCircle, Star,
  Heart, Target, CheckCircle, ChevronRight, ChevronLeft, X,
  TrendingUp, Smile, Meh, Frown
} from "lucide-react";

const CATEGORIES = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", description: "Something is broken" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", description: "I'd love to see..." },
  { value: "pick_feedback", label: "Pick Feedback", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", description: "About the picks engine" },
  { value: "praise", label: "Praise", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30", description: "Something I love" },
  { value: "general", label: "General", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", description: "Everything else" },
  { value: "question", label: "Question", icon: HelpCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", description: "I need help with..." },
];

const NPS_LABELS: Record<number, { label: string; icon: any; color: string }> = {
  0: { label: "Definitely not", icon: Frown, color: "text-red-400" },
  1: { label: "Definitely not", icon: Frown, color: "text-red-400" },
  2: { label: "Probably not", icon: Frown, color: "text-red-400" },
  3: { label: "Unlikely", icon: Frown, color: "text-orange-400" },
  4: { label: "Maybe not", icon: Meh, color: "text-orange-400" },
  5: { label: "Neutral", icon: Meh, color: "text-yellow-400" },
  6: { label: "Probably", icon: Meh, color: "text-yellow-400" },
  7: { label: "Likely", icon: Smile, color: "text-lime-400" },
  8: { label: "Very likely", icon: Smile, color: "text-green-400" },
  9: { label: "Almost certainly", icon: Smile, color: "text-emerald-400" },
  10: { label: "Absolutely yes!", icon: Smile, color: "text-emerald-400" },
};

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/feedback", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/my"] });
      setStep(4);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const reset = () => {
    setStep(1);
    setCategory("");
    setRating(0);
    setHoverRating(0);
    setNps(null);
    setSubject("");
    setMessage("");
  };

  const handleClose = (val: boolean) => {
    setOpen(val);
    if (!val) setTimeout(reset, 300);
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      category,
      rating: rating || undefined,
      nps: nps ?? undefined,
      subject: subject.trim() || undefined,
      message: message.trim(),
      page: window.location.pathname,
    });
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-24 lg:bottom-6 right-4 z-[55] rounded-full shadow-lg h-12 w-12 border-primary/30 bg-background/80 backdrop-blur-sm"
          data-testid="button-feedback-open"
          title="Send feedback"
        >
          <MessageSquarePlus className="w-5 h-5 text-primary" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/5 via-background to-background">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <MessageSquarePlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Send Feedback</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step < 4 ? `Step ${step} of 3` : "Done!"}
                  {step < 4 && <span className="ml-2 text-primary/60">· Your input shapes the platform</span>}
                </p>
              </div>
            </div>
            {step < 4 && (
              <div className="flex gap-1.5 mt-3">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${s <= step ? "bg-primary" : "bg-primary/15"}`}
                  />
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="px-6 py-5 min-h-[280px]">
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-4">What type of feedback do you have?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const selected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        data-testid={`button-feedback-category-${cat.value}`}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                          selected
                            ? `${cat.bg} ring-1 ring-current scale-[1.02]`
                            : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? cat.color : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-xs font-semibold ${selected ? cat.color : "text-foreground"}`}>{cat.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cat.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  {selectedCategory && (
                    <Badge variant="outline" className={`text-xs gap-1.5 ${selectedCategory.bg} ${selectedCategory.color} border-current/30`}>
                      <selectedCategory.icon className="w-3 h-3" />
                      {selectedCategory.label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        data-testid={`button-feedback-star-${n}`}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            n <= (hoverRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    {(hoverRating || rating) > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {["", "Poor", "Fair", "Good", "Great", "Excellent!"][hoverRating || rating]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject <span className="text-muted-foreground/40">(optional)</span></label>
                  <Input
                    placeholder="Brief summary..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={120}
                    className="text-sm"
                    data-testid="input-feedback-subject"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Feedback <span className="text-red-400">*</span></label>
                  <Textarea
                    placeholder="Tell us exactly what's on your mind. The more detail, the better."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="min-h-[110px] resize-none text-sm"
                    maxLength={1000}
                    data-testid="textarea-feedback-message"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{message.length}/1000</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold mb-1">One last question</p>
                  <p className="text-xs text-muted-foreground">
                    How likely are you to recommend Sors Maxima to a fellow bettor?
                  </p>
                </div>

                <div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setNps(i)}
                        data-testid={`button-feedback-nps-${i}`}
                        className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all duration-150 ${
                          nps === i
                            ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">Not at all likely</span>
                    <span className="text-[10px] text-muted-foreground">Extremely likely</span>
                  </div>
                </div>

                {nps !== null && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50`}>
                    {(() => {
                      const info = NPS_LABELS[nps];
                      const Icon = info.icon;
                      return (
                        <>
                          <Icon className={`w-5 h-5 ${info.color}`} />
                          <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
                        </>
                      );
                    })()}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  You can skip this by clicking Submit — it's completely optional.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">Thank you!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your feedback has been submitted and goes directly to our team.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/feedback">View my submissions</a>
                  </Button>
                  <Button size="sm" onClick={() => handleClose(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {step < 4 && (
            <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-card/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step > 1 ? setStep(step - 1) : handleClose(false)}
                className="gap-1 text-muted-foreground"
                data-testid="button-feedback-back"
              >
                {step > 1 ? <><ChevronLeft className="w-4 h-4" /> Back</> : <><X className="w-4 h-4" /> Cancel</>}
              </Button>

              <div className="flex gap-2">
                {step === 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="text-muted-foreground"
                    data-testid="button-feedback-skip-nps"
                  >
                    Skip & Submit
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    size="sm"
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 ? !category : !message.trim()}
                    className="gap-1"
                    data-testid="button-feedback-next"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || !message.trim()}
                    className="gap-1.5"
                    data-testid="button-feedback-submit"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

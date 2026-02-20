import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, Send, Bug, Lightbulb, HelpCircle, Star } from "lucide-react";

const categories = [
  { value: "bug", label: "Bug Report", icon: Bug },
  { value: "feature", label: "Feature Request", icon: Lightbulb },
  { value: "question", label: "Question", icon: HelpCircle },
  { value: "praise", label: "Praise", icon: Star },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: (data: { category: string; message: string; page: string }) =>
      apiRequest("POST", "/api/feedback", data),
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
      setCategory("");
      setMessage("");
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!category || !message.trim()) return;
    submitMutation.mutate({
      category,
      message: message.trim(),
      page: window.location.pathname,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-24 lg:bottom-6 right-4 z-[55] rounded-full shadow-lg h-12 w-12"
          data-testid="button-feedback-open"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Sors Maxima. Your feedback goes directly to our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-feedback-category">
                <SelectValue placeholder="What's this about?" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Your Message</Label>
            <Textarea
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
              data-testid="textarea-feedback-message"
            />
            <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-feedback-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!category || !message.trim() || message.length > 500 || submitMutation.isPending}
            className="gap-2"
            data-testid="button-feedback-submit"
          >
            <Send className="w-4 h-4" />
            {submitMutation.isPending ? "Sending..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

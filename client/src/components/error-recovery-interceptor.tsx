import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, HelpCircle, MessageSquare, CheckCircle, X } from "lucide-react";

const IGNORED_URL_PATTERNS = ["/api/health/", "/api/feedback", "/api/admin/"];

interface RecoveryEvent {
  type: string;
  message: string;
  url?: string;
  timestamp: number;
}

export function ErrorRecoveryInterceptor() {
  const [showModal, setShowModal] = useState(false);
  const [currentError, setCurrentError] = useState<RecoveryEvent | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const logHealthEvent = useMutation({
    mutationFn: (data: { type: string; severity: string; metadata: Record<string, unknown> }) =>
      apiRequest("POST", "/api/health/event", data),
  });

  const submitFeedback = useMutation({
    mutationFn: (data: { category: string; message: string; page: string }) =>
      apiRequest("POST", "/api/feedback", data),
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your feedback helps us improve." });
      setFeedbackText("");
      setShowFeedback(false);
      setShowModal(false);
    },
  });

  const handleError = useCallback((event: RecoveryEvent) => {
    const key = `${event.type}_${Math.floor(event.timestamp / 60000)}`;
    if (dismissed.has(key)) return;

    setCurrentError(event);
    setShowModal(true);

    logHealthEvent.mutate({
      type: event.type === "fetch_error" ? "api_error" : "error",
      severity: "medium",
      metadata: { message: event.message, url: event.url },
    });
  }, [dismissed, logHealthEvent]);

  useEffect(() => {
    const originalFetch = window.fetch;
    let errorCount = 0;
    const errorThreshold = 3;
    const errorWindow = 60000;
    let windowStart = Date.now();

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";

        if (IGNORED_URL_PATTERNS.some(p => url.includes(p))) {
          return response;
        }

        if (response.status >= 500) {
          const now = Date.now();
          if (now - windowStart > errorWindow) {
            errorCount = 0;
            windowStart = now;
          }
          errorCount++;

          if (errorCount >= errorThreshold) {
            handleError({
              type: "fetch_error",
              message: `Multiple server errors detected (${errorCount} in the last minute)`,
              url,
              timestamp: now,
            });
            errorCount = 0;
          }
        }

        return response;
      } catch (error) {
        const url = typeof args[0] === "string" ? args[0] : "";
        if (!IGNORED_URL_PATTERNS.some(p => url.includes(p))) {
          handleError({
            type: "network_error",
            message: "Network connection issue detected",
            url,
            timestamp: Date.now(),
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleError]);

  const handleRetry = () => {
    setShowModal(false);
    window.location.reload();
  };

  const handleDismiss = () => {
    if (currentError) {
      const key = `${currentError.type}_${Math.floor(currentError.timestamp / 60000)}`;
      setDismissed(prev => new Set(prev).add(key));
    }
    setShowModal(false);
    setCurrentError(null);
  };

  const handleHelpCenter = () => {
    setShowModal(false);
    logHealthEvent.mutate({ type: "help_view", severity: "low", metadata: { source: "error_recovery" } });
    navigate("/help");
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    submitFeedback.mutate({
      category: "bug",
      message: `[Auto-reported] ${currentError?.message || "Error"}\n\nUser notes: ${feedbackText}`,
      page: currentError?.url || window.location.pathname,
    });
  };

  return (
    <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-error-recovery">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <DialogTitle>Something went wrong</DialogTitle>
          </div>
          <DialogDescription>
            We noticed an issue and want to help you get back on track.
          </DialogDescription>
        </DialogHeader>

        {currentError && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentError.type === "network_error" ? "Connection" : "Server"}</Badge>
              <span className="text-sm text-muted-foreground">{currentError.message}</span>
            </div>

            <div className="grid gap-2">
              <Button
                variant="default"
                className="gap-2 justify-start"
                onClick={handleRetry}
                data-testid="button-error-retry"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh and try again
              </Button>

              <Button
                variant="outline"
                className="gap-2 justify-start"
                onClick={handleHelpCenter}
                data-testid="button-error-help"
              >
                <HelpCircle className="w-4 h-4" />
                Visit Help Center
              </Button>

              <Button
                variant="outline"
                className="gap-2 justify-start"
                onClick={() => setShowFeedback(!showFeedback)}
                data-testid="button-error-feedback"
              >
                <MessageSquare className="w-4 h-4" />
                Report this issue
              </Button>
            </div>

            {showFeedback && (
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you were doing when this happened..."
                  className="text-sm"
                  data-testid="textarea-error-feedback"
                />
                <Button
                  size="sm"
                  onClick={handleSendFeedback}
                  disabled={submitFeedback.isPending || !feedbackText.trim()}
                  className="gap-2"
                  data-testid="button-submit-error-feedback"
                >
                  {submitFeedback.isPending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  Send Report
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="gap-1" data-testid="button-dismiss-error">
            <X className="w-3 h-3" />
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

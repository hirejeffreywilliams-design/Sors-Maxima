import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Ticket,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai" | "admin";
  content: string;
  timestamp: string;
  confidence?: number;
  sources?: string[];
}

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  category: string;
}

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"chat" | "tickets">("chat");
  const [message, setMessage] = useState("");
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: tickets = [] } = useQuery<TicketSummary[]>({
    queryKey: ["/api/support/tickets"],
    enabled: isOpen,
  });

  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; ticketId?: string }) => {
      const res = await apiRequest("POST", "/api/support/chat", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (!currentTicketId && data.ticketId) {
        setCurrentTicketId(data.ticketId);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "ai",
          content: data.response,
          timestamp: new Date().toISOString(),
          confidence: data.confidence,
          sources: data.sources,
        },
      ]);
      setShowFeedback(data.ticketId);
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: { ticketId: string; helpful: boolean }) => {
      const res = await apiRequest(
        "POST",
        `/api/support/tickets/${data.ticketId}/feedback`,
        { helpful: data.helpful }
      );
      return res.json();
    },
    onSuccess: () => {
      setShowFeedback(null);
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest(
        "POST",
        `/api/support/tickets/${ticketId}/escalate`,
        { reason: "User requested human agent" }
      );
      return res.json();
    },
    onSuccess: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_${Date.now()}`,
          role: "ai",
          content:
            "Your request has been escalated to our support team. A human agent will review your case and respond as soon as possible. You can check the status of your ticket in the 'My Tickets' tab.",
          timestamp: new Date().toISOString(),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    chatMutation.mutate({
      message: message.trim(),
      ticketId: currentTicketId || undefined,
    });
    setMessage("");
  };

  const handleNewChat = () => {
    setCurrentTicketId(null);
    setMessages([]);
    setShowFeedback(null);
    setView("chat");
  };

  const loadTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const ticket = await res.json();
        setCurrentTicketId(ticketId);
        setMessages(ticket.messages || []);
        setView("chat");
      }
    } catch (e) {
      console.error("Failed to load ticket:", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "auto_resolved":
      case "resolved":
      case "closed":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "escalated":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined) return null;
    if (confidence >= 0.85) return <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />High confidence</Badge>;
    if (confidence >= 0.6) return <Badge variant="secondary" className="text-[10px] gap-1"><AlertTriangle className="w-3 h-3" />Moderate</Badge>;
    return null;
  };

  return (
    <>
      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 rounded-full w-12 h-12 shadow-lg"
          onClick={() => setIsOpen(true)}
          data-testid="button-support-chat"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] flex flex-col shadow-xl">
          <div className="flex items-center justify-between gap-2 p-3 border-b">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Support</span>
              {currentTicketId && (
                <Badge variant="secondary" className="text-[10px]">
                  {currentTicketId.slice(0, 12)}...
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleNewChat}
                data-testid="button-new-chat"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chat"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex border-b">
            <button
              className={`flex-1 text-xs py-2 text-center font-medium transition-colors ${
                view === "chat"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => setView("chat")}
              data-testid="tab-chat"
            >
              Chat
            </button>
            <button
              className={`flex-1 text-xs py-2 text-center font-medium transition-colors ${
                view === "tickets"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => setView("tickets")}
              data-testid="tab-tickets"
            >
              My Tickets {tickets.length > 0 && `(${tickets.length})`}
            </button>
          </div>

          {view === "chat" ? (
            <>
              <ScrollArea className="flex-1 p-3">
                <div ref={scrollRef} className="space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8 space-y-3">
                      <Bot className="w-10 h-10 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">
                          How can we help?
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ask about your account, billing, features, or any
                          issues you're experiencing.
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {[
                          "How do I cancel my subscription?",
                          "How does the Smart Ticket Generator work?",
                          "I need help with responsible gaming",
                          "My ticket export isn't working",
                        ].map((q) => (
                          <button
                            key={q}
                            className="text-xs text-left px-3 py-2 rounded-md bg-muted/50 hover-elevate transition-colors"
                            onClick={() => {
                              setMessage(q);
                              setTimeout(() => {
                                const userMsg: ChatMessage = {
                                  id: `user_${Date.now()}`,
                                  role: "user",
                                  content: q,
                                  timestamp: new Date().toISOString(),
                                };
                                setMessages((prev) => [...prev, userMsg]);
                                chatMutation.mutate({
                                  message: q,
                                  ticketId: currentTicketId || undefined,
                                });
                                setMessage("");
                              }, 50);
                            }}
                            data-testid={`button-quick-question-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role !== "user" && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          {msg.role === "ai" ? (
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === "ai" && getConfidenceBadge(msg.confidence) && (
                          <div className="mt-1.5">{getConfidenceBadge(msg.confidence)}</div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {showFeedback && currentTicketId && (
                <div className="px-3 py-2 border-t flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    Was this helpful?
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() =>
                        feedbackMutation.mutate({
                          ticketId: currentTicketId,
                          helpful: true,
                        })
                      }
                      data-testid="button-feedback-helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() =>
                        feedbackMutation.mutate({
                          ticketId: currentTicketId,
                          helpful: false,
                        })
                      }
                      data-testid="button-feedback-not-helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6"
                      onClick={() => {
                        if (currentTicketId) escalateMutation.mutate(currentTicketId);
                      }}
                      data-testid="button-talk-to-human"
                    >
                      Talk to human
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your question..."
                    className="text-xs"
                    disabled={chatMutation.isPending}
                    data-testid="input-support-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || chatMutation.isPending}
                    data-testid="button-send-support"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No support tickets yet
                    </p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      className="w-full text-left p-3 rounded-md bg-muted/30 hover-elevate transition-colors space-y-1.5"
                      onClick={() => loadTicket(ticket.id)}
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">
                          {ticket.subject || "Support Chat"}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{ticket.category}</span>
                        <span>
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}
    </>
  );
}

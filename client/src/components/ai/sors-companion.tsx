import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  X, Send, Maximize2, Zap,
  TrendingUp, BarChart3, Target, Brain, AlertTriangle,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ContextData {
  picks: { grade: string }[];
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey — I'm SORS Intelligence. I'm powered by live platform data: real calibration stats, today's graded picks, EV signals, and Kelly sizing. What do you want to know?",
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Top picks today", prompt: "What are today's top-graded picks?" },
  { icon: BarChart3, label: "Model performance", prompt: "How is the 46-Factor Model performing right now?" },
  { icon: Target, label: "Build a parlay", prompt: "Help me build a 3-leg parlay with the best current picks." },
  { icon: Brain, label: "Bankroll advice", prompt: "How should I size my bets using Kelly criterion?" },
];

function formatMessage(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
      >
        <Zap className="w-3.5 h-3.5 text-white" />
      </div>
      <div
        className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
        style={{ background: "rgba(240,83,43,0.12)", border: "1px solid rgba(240,83,43,0.18)" }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SorsCompanion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query live platform context to detect new picks for alert badge
  const { data: contextData } = useQuery<ContextData>({
    queryKey: ["/api/ai/analyst/context"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const newPickCount = contextData?.picks?.length ?? 0;
  const [lastSeenPickCount, setLastSeenPickCount] = useState<number | null>(null);
  const hasPlatformAlert = lastSeenPickCount !== null && newPickCount > lastSeenPickCount && !open;

  // On mount: seed lastSeenPickCount once picks load
  useEffect(() => {
    if (lastSeenPickCount === null && newPickCount > 0) {
      setLastSeenPickCount(newPickCount);
    }
  }, [newPickCount, lastSeenPickCount]);

  // On open: clear unread and mark current picks as seen
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setLastSeenPickCount(newPickCount);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, newPickCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Dismiss tooltip after 8s
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (payload: { role: "user" | "assistant"; content: string }[]) => {
      const res = await apiRequest("POST", "/api/ai/analyst", { messages: payload });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }
      return res.json() as Promise<{ response: string }>;
    },
    onSuccess: (data) => {
      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (!open) setHasUnread(true);
    },
    onError: (err: Error) => {
      const isCapacity = err.message.includes("capacity") || err.message.includes("503") || err.message.includes("429");
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: isCapacity
            ? "AI analysis is temporarily at capacity. Try again in a moment."
            : "Sorry, I hit an error. Try rephrasing your question or asking again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");

    const payload = updated
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }));

    chatMutation.mutate(payload);
  }, [messages, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showBadge = hasUnread || hasPlatformAlert;

  return (
    <>
      {/* ── Floating Avatar Button (bottom-right) ─────────────────────── */}
      <div className="fixed z-[60] select-none" style={{ bottom: "5.5rem", right: "1rem" }}>
        {/* Tooltip */}
        {showTooltip && !open && (
          <div
            className="absolute bottom-full right-0 mb-3 whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/90 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(8,8,14,0.97) 0%, rgba(20,12,8,0.99) 100%)",
              border: "1px solid rgba(240,83,43,0.35)",
              boxShadow: "0 4px 20px rgba(240,83,43,0.25)",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            <span className="text-orange-400">SORS</span> Intelligence — Ask me anything
            <div
              className="absolute bottom-0 right-4 translate-y-1/2 w-2 h-2 rotate-45"
              style={{
                background: "rgba(20,12,8,0.99)",
                borderRight: "1px solid rgba(240,83,43,0.35)",
                borderBottom: "1px solid rgba(240,83,43,0.35)",
              }}
            />
          </div>
        )}

        {/* Avatar button */}
        <button
          onClick={() => setOpen(v => !v)}
          data-testid="button-sors-companion-toggle"
          aria-label="Open SORS Intelligence AI analyst"
          className="relative w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 60%, #F0532B 100%)",
            boxShadow: open
              ? "0 0 0 3px rgba(240,83,43,0.5), 0 8px 32px rgba(240,83,43,0.4)"
              : "0 4px 20px rgba(240,83,43,0.35), 0 2px 8px rgba(0,0,0,0.4)",
            animation: open ? "none" : "companionFloat 3s ease-in-out infinite",
          }}
        >
          <div className="w-full h-full rounded-2xl flex items-center justify-center relative">
            <Zap className="w-6 h-6 text-white drop-shadow-sm" />
            {!open && showBadge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-[9px] font-black text-white">
                !
              </span>
            )}
          </div>
        </button>
      </div>

      {/* ── Right-side Slide-in Drawer ─────────────────────────────────── */}
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[58] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[59] flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: "min(420px, 100vw)",
          background: "linear-gradient(160deg, rgba(8,8,14,0.99) 0%, rgba(14,10,6,0.99) 100%)",
          borderLeft: "1px solid rgba(240,83,43,0.22)",
          boxShadow: open ? "-8px 0 48px rgba(0,0,0,0.65), 0 0 60px rgba(240,83,43,0.06)" : "none",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        aria-label="SORS Intelligence chat panel"
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(240,83,43,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-black tracking-tight text-white">SORS Intelligence</span>
                <Badge
                  className="text-[8px] px-1.5 py-0 h-4 font-black tracking-widest"
                  style={{ background: "rgba(240,83,43,0.18)", border: "1px solid rgba(240,83,43,0.3)", color: "#f97316" }}
                >
                  LIVE DATA
                </Badge>
              </div>
              <p className="text-[10px] text-white/35">46-Factor Model · Real picks · Kelly sizing</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/ai-analyst" onClick={() => setOpen(false)}>
              <button
                className="p-2 rounded-xl hover:bg-white/8 transition-colors text-white/40 hover:text-white/70"
                title="Open full AI Analyst page"
                data-testid="button-companion-expand"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </Link>
            <button
              className="p-2 rounded-xl hover:bg-white/8 transition-colors text-white/40 hover:text-white/70"
              onClick={() => setOpen(false)}
              data-testid="button-companion-close"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
                  >
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={msg.role === "user"
                    ? { background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.1)" }
                    : { background: "rgba(240,83,43,0.1)", border: "1px solid rgba(240,83,43,0.16)" }
                  }
                  data-testid={`companion-msg-${msg.role}-${msg.id}`}
                >
                  <p className="text-[12px] leading-relaxed text-white/90 whitespace-pre-wrap">
                    {formatMessage(msg.content)}
                  </p>
                  <p className="text-[9px] text-white/25 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && <TypingIndicator />}

            {/* Quick prompts on first load */}
            {messages.length === 1 && !chatMutation.isPending && (
              <div className="pt-1 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 px-1">Quick questions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_PROMPTS.map(qp => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.prompt)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        data-testid={`companion-quick-${qp.label.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <Icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-white/60">{qp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Disclaimer */}
        <div
          className="px-4 py-2 shrink-0 flex items-center gap-1.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <AlertTriangle className="w-2.5 h-2.5 text-yellow-500/60 shrink-0" />
          <span className="text-[8.5px] text-white/25 leading-tight">
            Statistical analysis only · Not gambling advice · 1-800-522-4700 (NCPG)
          </span>
        </div>

        {/* Input */}
        <div
          className="px-4 pb-4 pt-2.5 shrink-0"
          style={{ borderTop: "1px solid rgba(240,83,43,0.1)" }}
        >
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about picks, EV, Kelly sizing…"
              disabled={chatMutation.isPending}
              className="flex-1 h-10 text-[12px] bg-white/5 border-white/10 focus:border-orange-500/40 placeholder:text-white/25 text-white/90 rounded-xl"
              data-testid="input-companion-message"
            />
            <Button
              size="sm"
              onClick={() => sendMessage(input)}
              disabled={chatMutation.isPending || !input.trim()}
              className="h-10 w-10 p-0 rounded-xl shrink-0"
              style={{
                background: input.trim() ? "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" : "rgba(255,255,255,0.07)",
                border: "none",
              }}
              data-testid="button-companion-send"
            >
              {chatMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes companionFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

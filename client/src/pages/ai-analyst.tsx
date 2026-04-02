import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/use-seo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap, Send, TrendingUp, BarChart3, Target, Brain,
  AlertTriangle, Sparkles, Bot, RefreshCw, ChevronRight,
  Activity, DollarSign, Percent, Shield,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: `Welcome to SORS Intelligence — your personal betting analyst.

I'm powered by live platform data: today's graded picks across 6 sports, real calibration stats from the 46-Factor Model, EV calculations, and Kelly criterion guidance.

Ask me anything about your picks, parlay construction, bankroll management, or what the model is saying right now.`,
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Today's top picks", prompt: "What are today's highest-graded picks across all sports?", color: "#22c55e" },
  { icon: BarChart3, label: "Model calibration", prompt: "Walk me through how the 46-Factor Model is calibrated and its current performance.", color: "#60a5fa" },
  { icon: Target, label: "Build a parlay", prompt: "Help me build an optimal 3-leg parlay with the best picks available right now.", color: "#f97316" },
  { icon: Brain, label: "Kelly sizing", prompt: "Explain Kelly criterion and how I should size my bets as a smart bettor.", color: "#a78bfa" },
  { icon: DollarSign, label: "+EV plays", prompt: "Which picks have the strongest positive expected value right now?", color: "#fbbf24" },
  { icon: Shield, label: "Parlay risks", prompt: "Explain joint probability risks in parlays and how they affect expected value.", color: "#f43f5e" },
];

const SUGGESTED_FOLLOWUPS = [
  "Which sport has the best model accuracy?",
  "What's quarter-Kelly and why use it?",
  "Explain closing line value (CLV)",
  "How do correlated parlay legs work?",
  "What makes a Grade A pick?",
];

function formatContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i} className="block">
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>;
          }
          const bulletMatch = part.match(/^[•\-]\s+(.+)/);
          if (bulletMatch) {
            return (
              <span key={j} className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                <span>{bulletMatch[1]}</span>
              </span>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </span>
    );
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
      >
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm mt-0.5"
        style={{ background: "rgba(240,83,43,0.1)", border: "1px solid rgba(240,83,43,0.18)" }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-white/35 leading-none mb-0.5">{label}</p>
        <p className="text-[11px] font-black text-white/80 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function AIAnalystPage() {
  useSEO({ title: "AI Analyst", description: "SORS Intelligence — your personal sports betting AI analyst powered by the 46-Factor Model" });

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: aiStatus } = useQuery<{ available?: boolean }>({ queryKey: ["/api/ai/status"] });
  const isUnavailable = aiStatus?.available === false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (payload: { role: "user" | "assistant"; content: string }[]) => {
      const res = await apiRequest("POST", "/api/ai/analyst", { messages: payload });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }
      return res.json() as Promise<{ response: string }>;
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: data.response, timestamp: new Date() },
      ]);
    },
    onError: (err: Error) => {
      const isCapacity = err.message.includes("capacity") || err.message.includes("503") || err.message.includes("429");
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: isCapacity
            ? "AI analysis is temporarily at capacity. Your picks are still powered by the full 46-factor engine. Try again in a moment."
            : "Sorry, I hit an error. Try rephrasing your question.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending || isUnavailable) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    const payload = updated.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content }));
    chatMutation.mutate(payload);
  }, [messages, chatMutation, isUnavailable]);

  const resetChat = () => {
    setMessages([WELCOME]);
    setInput("");
  };

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        <PageHero
          icon={<Zap className="w-6 h-6" />}
          title="AI Analyst"
          badge="LIVE DATA"
          subtitle="SORS Intelligence — your personal betting analyst"
          description="Powered by real platform data: live calibration stats, today's graded picks across 6 sports, EV signals, Kelly criterion sizing, and joint probability analysis. Ask anything about your picks, parlay strategy, or bankroll management."
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className="text-[9px] px-2 py-0.5 font-black tracking-widest"
                style={{ background: "rgba(240,83,43,0.15)", border: "1px solid rgba(240,83,43,0.3)", color: "#f97316" }}
              >
                46-FACTOR MODEL
              </Badge>
              {isUnavailable && (
                <Badge variant="destructive" className="text-[9px]">AI Unavailable</Badge>
              )}
            </div>
          }
        />

        <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">

          {/* ── Left Sidebar ─────────────────────────────────────── */}
          <div className="space-y-3 lg:sticky lg:top-20">

            {/* Platform signals */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: "linear-gradient(160deg, rgba(8,8,14,0.95) 0%, rgba(14,10,6,0.98) 100%)",
                border: "1px solid rgba(240,83,43,0.18)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
                >
                  <Activity className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[11px] font-black text-white/80">Live Context</span>
              </div>
              <div className="space-y-2">
                <StatCard label="Model" value="46-Factor Engine" icon={Brain} color="#a78bfa" />
                <StatCard label="Coverage" value="NBA · NFL · MLB · NHL · NCAAB · UFC" icon={Target} color="#22c55e" />
                <StatCard label="Sizing" value="Quarter-Kelly (≤2.5%)" icon={Percent} color="#60a5fa" />
                <StatCard label="Data" value="Real picks · Live calibration" icon={BarChart3} color="#f97316" />
              </div>
            </div>

            {/* Quick prompts */}
            <div
              className="rounded-2xl p-4 space-y-2"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Quick Questions</p>
              <div className="space-y-1">
                {QUICK_PROMPTS.map(qp => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={qp.label}
                      onClick={() => sendMessage(qp.prompt)}
                      disabled={chatMutation.isPending}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all hover:bg-white/5 group"
                      data-testid={`analyst-quick-${qp.label.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: qp.color }} />
                      <span className="text-[11px] text-white/55 group-hover:text-white/75 transition-colors flex-1">{qp.label}</span>
                      <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/35 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Responsible gambling */}
            <div
              className="rounded-xl p-3 space-y-1"
              style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-yellow-500/70 shrink-0" />
                <p className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-wide">Responsible Gambling</p>
              </div>
              <p className="text-[9px] text-white/35 leading-relaxed">
                Statistical analysis — not betting advice. Never bet more than you can afford to lose. For help: <span className="text-yellow-500/60">1-800-522-4700</span> (NCPG · 24/7 · Free)
              </p>
            </div>
          </div>

          {/* ── Main Chat Panel ───────────────────────────────────── */}
          <div
            className="rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(8,8,14,0.98) 0%, rgba(14,10,6,0.99) 100%)",
              border: "1px solid rgba(240,83,43,0.2)",
              boxShadow: "0 0 60px rgba(240,83,43,0.06)",
              height: "min(680px, calc(100vh - 12rem))",
            }}
          >
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
                >
                  <Zap className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-white">SORS Intelligence</p>
                  <p className="text-[9px] text-white/30">46-Factor Model · Real-time picks · Kelly criterion</p>
                </div>
              </div>
              <button
                onClick={resetChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/35 hover:text-white/60 hover:bg-white/6 transition-all text-[10px]"
                data-testid="button-analyst-reset"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div ref={scrollRef as any} className="p-5 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
                      >
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[11px] font-black text-white/50">You</span>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div
                        className={`px-4 py-3 rounded-2xl ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                        style={msg.role === "user"
                          ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }
                          : { background: "rgba(240,83,43,0.09)", border: "1px solid rgba(240,83,43,0.16)" }
                        }
                      >
                        <div className="text-[12.5px] leading-relaxed text-white/85 space-y-1">
                          {formatContent(msg.content)}
                        </div>
                      </div>
                      <p className="text-[9px] text-white/20 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && <TypingIndicator />}

                {/* Suggested follow-ups after AI response */}
                {messages.length > 1 && !chatMutation.isPending && messages[messages.length - 1]?.role === "assistant" && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">Suggested follow-ups</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_FOLLOWUPS.slice(0, 3).map(s => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          className="px-2.5 py-1 rounded-full text-[10px] text-white/45 hover:text-white/70 transition-colors"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input area */}
            <div
              className="px-4 pb-4 pt-3 shrink-0"
              style={{ borderTop: "1px solid rgba(240,83,43,0.1)" }}
            >
              {isUnavailable && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] text-yellow-500/80" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  AI analysis is temporarily unavailable. Platform picks and analytics still operate normally.
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Ask about picks, parlays, EV, Kelly sizing, model calibration…"
                  disabled={chatMutation.isPending || isUnavailable}
                  className="flex-1 h-11 text-sm bg-white/5 border-white/10 focus:border-orange-500/40 placeholder:text-white/25 text-white/90 rounded-xl"
                  data-testid="input-analyst-message"
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={chatMutation.isPending || !input.trim() || isUnavailable}
                  className="h-11 w-11 p-0 rounded-xl shrink-0"
                  style={{
                    background: input.trim() && !isUnavailable ? "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" : "rgba(255,255,255,0.07)",
                    border: "none",
                  }}
                  data-testid="button-analyst-send"
                >
                  {chatMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </Button>
              </div>
              <p className="text-[9px] text-white/20 mt-2 text-center">
                Statistical analysis only · Not gambling advice · Odds subject to change
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

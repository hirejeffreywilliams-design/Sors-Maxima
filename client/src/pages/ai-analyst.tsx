import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Zap, Send, RotateCcw, TrendingUp, BarChart3, Target, Brain,
  Shield, AlertTriangle, ChevronRight, Activity, Star, Flame,
  TrendingDown, Minus,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSEO } from "@/hooks/use-seo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ActivePick {
  pick: string;
  sport: string;
  grade: string;
  odds: number;
  confidence: number;
  ev: number | null;
  kellyFraction: number | null;
  edge: number | null;
  betType: string;
  impliedProbability: number | null;
}

interface CalibrationContext {
  hasData: boolean;
  overallWinRate: number | null;
  settledPicks: number;
  trend: string;
  last20WinRate: number | null;
  calibrationScore: number | null;
  bySport: { sport: string; actualWinRate: number | null; settled: number; won: number; lost: number }[];
  byGrade: { grade: string; actualWinRate: number | null; settled: number; roi: number | null; breakEvenRate: number | null }[];
  avgModelAgreement: number | null;
}

interface AnalystContext {
  picks: ActivePick[];
  calibration: CalibrationContext;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Welcome. I'm SORS Intelligence — your dedicated sports betting analyst. I have access to live platform data: real calibration statistics, today's graded picks with EV and Kelly values, and the full 46-Factor scoring model.\n\nAsk me about specific picks, how to size your bets, parlay construction, or what the model is seeing right now.",
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Today's Best Plays", prompt: "What are the highest-confidence picks right now, and what does the EV look like on each?" },
  { icon: BarChart3, label: "Model Performance", prompt: "How is the platform performing? Walk me through the win rates by sport and grade." },
  { icon: Target, label: "Parlay Analysis", prompt: "Help me understand how to build a 3-leg parlay. Show me the joint probability math." },
  { icon: Brain, label: "Kelly Sizing", prompt: "Explain Quarter-Kelly sizing and how I should size my bets given my bankroll." },
  { icon: Shield, label: "Risk Analysis", prompt: "What risk factors should I weigh before placing a bet? Walk me through the 46-Factor Model." },
  { icon: Activity, label: "Calibration Deep Dive", prompt: "Which sports and confidence tiers is the model best calibrated for right now?" },
];

function formatMessage(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return <span key={i}>{formatted}{i < lines.length - 1 && <br />}</span>;
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
      >
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div
        className="px-4 py-3.5 rounded-2xl rounded-tl-sm"
        style={{ background: "rgba(240,83,43,0.1)", border: "1px solid rgba(240,83,43,0.18)" }}
      >
        <div className="flex gap-1.5 items-center h-5">
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

function GradeChip({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    D: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${colors[grade] ?? "bg-white/10 text-white/60 border-white/10"}`}>
      {grade}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/40" />;
}

function ModelAgreementDots({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i <= rounded ? "bg-orange-400" : "bg-white/12"}`}
        />
      ))}
    </div>
  );
}

function LiveContextPanel({ context }: { context: AnalystContext | undefined }) {
  const cal = context?.calibration;
  const picks = context?.picks ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Activity className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Model Health</span>
        </div>
        {cal?.hasData ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">Overall Win Rate</span>
              <span className="text-[13px] font-black text-emerald-400">{cal.overallWinRate?.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">Last 20 Picks</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-white/80">{cal.last20WinRate?.toFixed(1) ?? "—"}%</span>
                <TrendIcon trend={cal.trend} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">Settled Picks</span>
              <span className="text-[12px] font-bold text-white/70">{cal.settledPicks}</span>
            </div>
            {cal.calibrationScore != null && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">Calibration Score</span>
                <span
                  className={`text-[12px] font-bold ${
                    cal.calibrationScore >= 75 ? "text-emerald-400" :
                    cal.calibrationScore >= 50 ? "text-yellow-400" : "text-red-400"
                  }`}
                >
                  {cal.calibrationScore}/100
                </span>
              </div>
            )}
            {cal.avgModelAgreement != null && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">Model Agreement</span>
                <div className="flex items-center gap-2">
                  <ModelAgreementDots score={cal.avgModelAgreement} />
                  <span className="text-[10px] text-white/40">{cal.avgModelAgreement.toFixed(1)}/5</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-white/35 italic">Building track record — {cal?.settledPicks ?? 0} picks settled.</p>
        )}
      </div>

      {cal?.bySport && cal.bySport.length > 0 && (
        <>
          <Separator className="bg-white/8" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2.5">Win Rate by Sport</p>
            <div className="space-y-1.5">
              {cal.bySport.map(s => (
                <div key={s.sport} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/55 font-medium">{s.sport}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        style={{ width: `${Math.min(100, (s.actualWinRate ?? 0))}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-white/70 w-10 text-right">{s.actualWinRate?.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {cal?.byGrade && cal.byGrade.length > 0 && (
        <>
          <Separator className="bg-white/8" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2.5">Win Rate by Grade</p>
            <div className="space-y-1.5">
              {cal.byGrade.map(g => (
                <div key={g.grade} className="flex items-center gap-2">
                  <GradeChip grade={g.grade} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[11px] text-white/50">{g.settled} settled</span>
                    <span className="text-[11px] font-bold text-white/75">{g.actualWinRate?.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {picks.length > 0 && (
        <>
          <Separator className="bg-white/8" />
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Active A/B Picks</span>
              <Badge
                className="text-[8px] px-1 py-0 h-3.5 font-black ml-auto"
                style={{ background: "rgba(240,83,43,0.18)", border: "1px solid rgba(240,83,43,0.3)", color: "#f97316" }}
              >
                {picks.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {picks.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl p-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  data-testid={`pick-context-${i}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <GradeChip grade={p.grade} />
                    <span className="text-[10px] font-bold text-white/80 truncate">{p.sport}</span>
                    <span className="text-[10px] text-white/35 ml-auto">{p.odds > 0 ? "+" : ""}{p.odds}</span>
                  </div>
                  <p className="text-[11px] text-white/65 leading-tight">{p.pick}</p>
                  <div className="flex gap-2 mt-1.5">
                    {p.ev != null && (
                      <span className={`text-[9px] font-bold ${p.ev > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        EV {p.ev > 0 ? "+" : ""}{p.ev.toFixed(1)}%
                      </span>
                    )}
                    <span className="text-[9px] text-white/35">Conf {p.confidence}%</span>
                    {p.kellyFraction != null && (
                      <span className="text-[9px] text-amber-400/70">
                        K×¼: {(p.kellyFraction * 0.25 * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator className="bg-white/8" />
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3 h-3 text-yellow-500/50 shrink-0 mt-0.5" />
        <p className="text-[9px] text-white/25 leading-snug">
          Statistical analysis only. Not financial or gambling advice. Help: 1-800-522-4700 (NCPG).
        </p>
      </div>
    </div>
  );
}

export default function AIAnalystPage() {
  useSEO({ title: "AI Analyst — SORS Intelligence | Sors Maxima", description: "Chat with SORS Intelligence — your AI-powered sports betting analyst with live 46-Factor Model data, calibration stats, and Kelly sizing." });

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: contextData, isLoading: contextLoading } = useQuery<AnalystContext>({
    queryKey: ["/api/ai/analyst/context"],
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const resp = data.response.toLowerCase();
      const suggestions: string[] = [];
      if (resp.includes("parlay") || resp.includes("leg")) suggestions.push("Show me the joint probability for those legs");
      if (resp.includes("kelly") || resp.includes("stake")) suggestions.push("How does Quarter-Kelly change for higher-risk bets?");
      if (resp.includes("calibration") || resp.includes("win rate")) suggestions.push("Which sport has the best calibration right now?");
      if (resp.includes("ev") || resp.includes("expected value")) suggestions.push("What EV threshold should I target for Grade A picks?");
      if (resp.includes("grade")) suggestions.push("What's the historical win rate difference between A and B grades?");
      setFollowUpSuggestions(suggestions.slice(0, 3));
    },
    onError: (err: Error) => {
      const isCapacity = err.message.toLowerCase().includes("capacity") || err.message.includes("429") || err.message.includes("503");
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: isCapacity
            ? "AI analysis is briefly at capacity. Your picks are still powered by the full 46-factor engine — please retry in a moment."
            : "I hit an error processing that. Try rephrasing or try again.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setFollowUpSuggestions([]);
    const payload = updated
      .filter(m => m.id !== "welcome" && !m.id.startsWith("welcome-"))
      .map(m => ({ role: m.role, content: m.content }));
    chatMutation.mutate(payload);
  }, [messages, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([{ ...WELCOME_MESSAGE, id: "welcome-" + Date.now(), timestamp: new Date() }]);
    setFollowUpSuggestions([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const picks = contextData?.picks ?? [];
  const hasGradeA = picks.some(p => p.grade === "A");

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" data-testid="page-ai-analyst">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col border-r"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
            >
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[12px] font-black text-white tracking-tight">Platform Context</span>
            <Badge
              className="text-[8px] px-1.5 py-0 h-4 font-black tracking-widest ml-auto"
              style={{ background: "rgba(240,83,43,0.18)", border: "1px solid rgba(240,83,43,0.3)", color: "#f97316" }}
            >
              LIVE
            </Badge>
          </div>
          <p className="text-[10px] text-white/35">Real calibration · Today's picks · Kelly data</p>
        </div>

        <div
          className="px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Quick analysis</p>
          <div className="space-y-1">
            {QUICK_PROMPTS.slice(0, 4).map(qp => {
              const Icon = qp.icon;
              return (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  disabled={chatMutation.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all hover:bg-white/6 group"
                  data-testid={`analyst-sidebar-${qp.label.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <Icon className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400 shrink-0 transition-colors" />
                  <span className="text-[11px] font-medium text-white/50 group-hover:text-white/80 transition-colors">{qp.label}</span>
                  <ChevronRight className="w-3 h-3 text-white/20 ml-auto shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {contextLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-6 rounded-lg bg-white/6 animate-pulse" />
                ))}
              </div>
            ) : (
              <LiveContextPanel context={contextData} />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Main Chat ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="px-5 py-4 shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
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
                <h1 className="text-[15px] font-black text-white tracking-tight">SORS Intelligence</h1>
                {hasGradeA && (
                  <Badge
                    className="text-[8px] px-1.5 py-0 h-4 font-black animate-pulse"
                    style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}
                    data-testid="badge-grade-a-picks"
                  >
                    <Star className="w-2 h-2 mr-0.5 inline" />
                    GRADE A LIVE
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-white/35">46-Factor Model · Kelly Sizing · Joint Probability</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            className="h-8 px-3 text-[11px] text-white/40 hover:text-white/70 gap-1.5"
            data-testid="button-analyst-new-chat"
          >
            <RotateCcw className="w-3 h-3" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5 max-w-3xl mx-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" }}
                  >
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`px-4 py-3.5 rounded-2xl max-w-[80%] ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={msg.role === "user"
                    ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }
                    : { background: "rgba(240,83,43,0.09)", border: "1px solid rgba(240,83,43,0.16)" }
                  }
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  <p className="text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap">
                    {formatMessage(msg.content)}
                  </p>
                  <p className="text-[9px] text-white/25 mt-1.5">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {chatMutation.isPending && <TypingIndicator />}

            {messages.length === 1 && !chatMutation.isPending && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Suggested questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map(qp => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.prompt)}
                        className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.99]"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        data-testid={`analyst-suggested-${qp.label.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <Icon className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] font-bold text-white/70">{qp.label}</p>
                          <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{qp.prompt.slice(0, 60)}…</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {followUpSuggestions.length > 0 && !chatMutation.isPending && (
              <div className="flex flex-wrap gap-2">
                {followUpSuggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      background: "rgba(240,83,43,0.1)",
                      border: "1px solid rgba(240,83,43,0.25)",
                      color: "#f97316",
                    }}
                    data-testid={`follow-up-${s.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about picks, EV, parlay math, Kelly sizing…"
                disabled={chatMutation.isPending}
                className="flex-1 h-11 bg-white/5 border-white/10 focus:border-orange-500/40 placeholder:text-white/25 text-white/90 rounded-xl text-[13px]"
                data-testid="input-analyst-message"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={chatMutation.isPending || !input.trim()}
                className="h-11 px-4 rounded-xl shrink-0 font-bold text-[12px] gap-2"
                style={{
                  background: input.trim() ? "linear-gradient(135deg, #F0532B 0%, #f59e0b 100%)" : "rgba(255,255,255,0.07)",
                  border: "none",
                }}
                data-testid="button-analyst-send"
              >
                {chatMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Analyze</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-[9px] text-white/20 mt-2 text-center">
              Statistical analysis only · Not gambling advice · Bet responsibly · 1-800-522-4700 (NCPG)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

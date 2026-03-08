import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Shield, Copy, MessageSquare, ExternalLink, Trophy, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface VerifyResult {
  authentic: boolean;
  verificationCode: string;
  card: {
    grade: string;
    sport: string;
    pick: string;
    game: string;
    settledResult?: string;
    odds?: number;
    betType?: string;
    confidence?: number;
  };
  instanceNumber?: number;
  issuedTo: string;
  acquiredAt?: string;
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "#22c55e", "A": "#22c55e", "A-": "#22c55e",
  "B+": "#84cc16", "B": "#84cc16", "B-": "#84cc16",
  "C+": "#eab308", "C": "#eab308", "C-": "#eab308",
  "D": "#ef4444", "F": "#ef4444",
};

const SPORT_BG: Record<string, string> = {
  NBA: "from-orange-950/60 via-zinc-950 to-zinc-950",
  NFL: "from-blue-950/60 via-zinc-950 to-zinc-950",
  NHL: "from-sky-950/60 via-zinc-950 to-zinc-950",
  MLB: "from-red-950/60 via-zinc-950 to-zinc-950",
  NCAAB: "from-violet-950/60 via-zinc-950 to-zinc-950",
  NCAAF: "from-amber-950/60 via-zinc-950 to-zinc-950",
};

export default function CardVerifyPage() {
  const [, params] = useRoute("/c/:collectionId");
  const collectionId = params?.collectionId;
  const { toast } = useToast();
  const [copied, setCopied] = useState<"link" | "discord" | null>(null);

  const { data, isLoading, isError } = useQuery<VerifyResult>({
    queryKey: ["/api/cards/verify", collectionId],
    queryFn: async () => {
      const res = await fetch(`/api/cards/verify/${collectionId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!collectionId,
    retry: false,
  });

  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/c/${collectionId}`
    : `/c/${collectionId}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied("link");
    toast({ title: "Link copied!", description: "Paste it anywhere to share your verified win." });
    setTimeout(() => setCopied(null), 2500);
  };

  const handleCopyDiscord = async () => {
    if (!data) return;
    const isWin = data.card.settledResult === "won";
    const isPending = !data.card.settledResult || data.card.settledResult === "pending";
    const resultLabel = isWin ? "✅ CALLED IT" : isPending ? "⏳ LIVE PICK" : "❌ MISSED";
    const gradeEmoji = data.card.grade?.startsWith("A") ? "🏆" : data.card.grade?.startsWith("B") ? "⚡" : "📊";
    const oddsStr = data.card.odds
      ? (data.card.odds > 0 ? `+${data.card.odds}` : `${data.card.odds}`)
      : "";

    const msg = [
      `${gradeEmoji} **SORS MAXIMA™ VERIFIED PICK**`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🎯 **${data.card.pick}**`,
      `🏅 Grade: **${data.card.grade}** | Sport: ${data.card.sport}`,
      data.card.game ? `🏟️ Game: ${data.card.game}` : null,
      oddsStr ? `💰 Odds: ${oddsStr}` : null,
      `📊 Result: ${resultLabel}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🔐 Issued to: @${data.issuedTo}`,
      `🛡️ Verification Code: \`${data.verificationCode}\``,
      `🔗 Verify Authenticity: ${verifyUrl}`,
      ``,
      `*Powered by Sors 46-Factor Engine™ — Cannot be fabricated*`,
    ].filter(Boolean).join("\n");

    await navigator.clipboard.writeText(msg);
    setCopied("discord");
    toast({ title: "Discord message copied!", description: "Paste it into your Discord channel." });
    setTimeout(() => setCopied(null), 2500);
  };

  const gradeColor = data?.card.grade ? (GRADE_COLORS[data.card.grade] || "#94a3b8") : "#94a3b8";
  const sportBg = data?.card.sport ? (SPORT_BG[data.card.sport] || "from-zinc-900/80 via-zinc-950 to-zinc-950") : "from-zinc-900/80 via-zinc-950 to-zinc-950";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">SORS MAXIMA™</div>
            <div className="text-[10px] text-white/35 uppercase tracking-widest font-bold">Card Verification Portal</div>
          </div>
        </div>
        <a
          href="/"
          className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          data-testid="link-visit-app"
        >
          Visit App <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4" data-testid="loading-verify">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/40">Verifying card authenticity...</p>
            </div>
          )}

          {(isError || (!isLoading && !data)) && (
            <div className="text-center py-16 space-y-4" data-testid="error-verify">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Card Not Found</h2>
                <p className="text-sm text-white/40 mt-1">This verification link is invalid or the card has been removed.</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Authenticity Banner */}
              <div
                className="rounded-2xl border p-5 flex items-center gap-4"
                style={data.authentic ? {
                  background: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.25)",
                } : {
                  background: "rgba(239,68,68,0.08)",
                  borderColor: "rgba(239,68,68,0.25)",
                }}
                data-testid="banner-authenticity"
              >
                <div
                  className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-2"
                  style={data.authentic ? {
                    background: "rgba(34,197,94,0.12)",
                    borderColor: "rgba(34,197,94,0.35)",
                    boxShadow: "0 0 24px rgba(34,197,94,0.22)",
                  } : {
                    background: "rgba(239,68,68,0.12)",
                    borderColor: "rgba(239,68,68,0.35)",
                  }}
                >
                  {data.authentic
                    ? <Shield className="w-7 h-7 text-emerald-400" />
                    : <XCircle className="w-7 h-7 text-red-400" />
                  }
                </div>
                <div>
                  <div
                    className="text-xl font-black tracking-tight"
                    style={{ color: data.authentic ? "#22c55e" : "#ef4444" }}
                    data-testid="text-verify-status"
                  >
                    {data.authentic ? "SIGNATURE VERIFIED" : "VERIFICATION FAILED"}
                  </div>
                  <div className="text-xs text-white/45 mt-0.5">
                    {data.authentic
                      ? "Cryptographic signature matches. This card is genuine and was issued by Sors Maxima."
                      : "The signature on this card does not match our records. It may have been altered."}
                  </div>
                </div>
              </div>

              {/* Card Details Panel */}
              <div
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${sportBg} overflow-hidden`}
                data-testid="panel-card-details"
              >
                {/* Grade Header */}
                <div
                  className="px-5 py-3 border-b border-white/8 flex items-center justify-between"
                  style={{ background: `${gradeColor}12` }}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" style={{ color: gradeColor }} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/50">
                      {data.card.sport} Intelligence Card
                    </span>
                  </div>
                  <Badge
                    className="text-sm font-black px-3 py-0.5 border"
                    style={{
                      background: `${gradeColor}20`,
                      borderColor: `${gradeColor}40`,
                      color: gradeColor,
                    }}
                    data-testid="badge-grade"
                  >
                    {data.card.grade}
                  </Badge>
                </div>

                {/* Pick Info */}
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">{data.card.game}</p>
                    <h2 className="text-xl font-black text-white leading-tight" data-testid="text-pick">{data.card.pick}</h2>
                  </div>

                  {/* Result */}
                  {data.card.settledResult && data.card.settledResult !== "pending" ? (
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2 border w-fit"
                      style={data.card.settledResult === "won" ? {
                        background: "rgba(34,197,94,0.10)",
                        borderColor: "rgba(34,197,94,0.25)",
                      } : {
                        background: "rgba(239,68,68,0.10)",
                        borderColor: "rgba(239,68,68,0.25)",
                      }}
                      data-testid="badge-result"
                    >
                      {data.card.settledResult === "won"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                      }
                      <span
                        className="text-sm font-black uppercase tracking-wider"
                        style={{ color: data.card.settledResult === "won" ? "#22c55e" : "#ef4444" }}
                      >
                        {data.card.settledResult === "won" ? "Called It ✓" : "Missed"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-primary/25 bg-primary/8 w-fit">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-black uppercase tracking-wider text-primary/80">Live Pick</span>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Issued To</p>
                      <p className="text-sm font-black text-white/80" data-testid="text-issued-to">@{data.issuedTo}</p>
                    </div>
                    {data.instanceNumber && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Serial Number</p>
                        <p className="text-sm font-mono font-black text-white/60">#{String(data.instanceNumber).padStart(6, "0")}</p>
                      </div>
                    )}
                    {data.acquiredAt && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Date Issued</p>
                        <p className="text-sm font-bold text-white/60">{new Date(data.acquiredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Code */}
                <div
                  className="px-5 py-3 border-t border-white/8 flex items-center justify-between"
                  style={{ background: "rgba(0,0,0,0.25)" }}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">46-Factor Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-white/25 uppercase tracking-widest">Code:</span>
                    <code className="text-[10px] font-mono font-black text-white/50 tracking-widest" data-testid="text-verify-code">
                      {data.verificationCode}
                    </code>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3" data-testid="section-actions">
                <button
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white hover:border-white/20"
                >
                  {copied === "link" ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">Copied!</span></>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Link</>
                  )}
                </button>

                <button
                  onClick={handleCopyDiscord}
                  data-testid="button-copy-discord"
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20 hover:border-primary/50"
                >
                  {copied === "discord" ? (
                    <><CheckCircle2 className="w-4 h-4" /> <span>Copied!</span></>
                  ) : (
                    <><MessageSquare className="w-4 h-4" /> Discord Message</>
                  )}
                </button>
              </div>

              {/* What is this */}
              <div className="rounded-xl border border-white/7 bg-white/3 px-5 py-4 space-y-2">
                <p className="text-xs font-black text-white/50 uppercase tracking-widest">What is this?</p>
                <p className="text-xs text-white/35 leading-relaxed">
                  Sors Intelligence Cards are cryptographically signed picks issued by the Sors 46-Factor Engine™. Each card contains a SHA-256 signature tied to the owner's account — it cannot be fabricated, screenshotted-and-faked, or transferred without a record. This verification page proves the win is real.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8 px-4 py-4 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
          Sors Maxima™ · Intelligence Card Verification · Secured by Sors 46-Factor Engine
        </p>
      </footer>
    </div>
  );
}

import { useRef, useState, useEffect } from "react";

interface ShareLeg {
  outcome: string;
  americanOdds?: number;
  sport?: string;
  market?: string;
  team?: string;
  grade?: string;
}

interface SlipShareCardProps {
  legs: ShareLeg[];
  totalAmericanOdds: number;
  stake?: number;
  payout?: number;
  onClose: () => void;
}

function sportEmoji(s?: string) {
  const map: Record<string, string> = {
    NBA: "🏀", NHL: "🏒", NFL: "🏈", MLB: "⚾",
    NCAAB: "🏀", NCAAF: "🏈", MMA: "🥊", SOCCER: "⚽",
  };
  return s ? (map[s.toUpperCase()] ?? "⚡") : "⚡";
}

function gradeAccent(legs: ShareLeg[]): string {
  const grades = legs.map(l => (l.grade ?? "B").toUpperCase());
  if (grades.some(g => g === "A+")) return "#f59e0b";
  if (grades.some(g => g.startsWith("A"))) return "#22c55e";
  if (grades.some(g => g === "B+")) return "#14b8a6";
  return "#6366f1";
}

export function SlipShareCard({ legs, totalAmericanOdds, stake, payout, onClose }: SlipShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const accent = gradeAccent(legs);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setTilt({ x: -(ny - 0.5) * 16, y: (nx - 0.5) * 16 });
    setGlowPos({ x: nx * 100, y: ny * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlowPos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const formatText = () => {
    const lines = [
      `⚡ SORS MAXIMA — ${legs.length}-LEG PARLAY`,
      `${"─".repeat(34)}`,
      `Combined Odds: ${totalAmericanOdds > 0 ? "+" : ""}${totalAmericanOdds}`,
      stake ? `Stake: $${stake}  →  Payout: $${payout?.toLocaleString()}` : "",
      "",
      ...legs.map((l, i) => `${i + 1}. ${l.outcome} (${l.americanOdds > 0 ? "+" : ""}${l.americanOdds})${l.sport ? `  [${l.sport}]` : ""}`),
      "",
      "Powered by Sors 46-Factor Intelligence",
      "sorsmaxima.com",
    ].filter(l => l !== null);
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(formatText()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      (navigator as any).share({ title: "Sors Maxima Parlay", text: formatText() }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  const profit = payout && stake ? payout - stake : undefined;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
      data-testid="slip-share-card-modal"
    >
      <div
        className="w-full max-w-sm"
        style={{ perspective: "900px" }}
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovered(true)}
      >
        {/* Outer rainbow border ring */}
        <div
          style={{
            padding: "2px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ff0080, #ff8c00, #ffe100, #00ff88, #00bfff, #bf5fff, #ff0080)",
            backgroundSize: "300% 300%",
            animation: "holo-shift 4s ease infinite",
            boxShadow: `0 0 50px ${accent}50, 0 0 100px ${accent}20, 0 24px 80px rgba(0,0,0,0.9)`,
          }}
        >
          {/* Card body */}
          <div
            ref={cardRef}
            style={{
              borderRadius: "18px",
              background: "linear-gradient(160deg, #070a18 0%, #0b0e22 50%, #060810 100%)",
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: isHovered ? "transform 0.08s ease-out" : "transform 0.4s ease-out",
              transformStyle: "preserve-3d",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* ── Layer 1: Background constellation dots ── */}
            <div
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* ── Layer 2: Diagonal grid lines ── */}
            <div
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: `
                  repeating-linear-gradient(
                    60deg,
                    transparent,
                    transparent 38px,
                    rgba(255,255,255,0.015) 38px,
                    rgba(255,255,255,0.015) 40px
                  )
                `,
              }}
            />

            {/* ── Layer 3: Holographic rainbow shimmer ── */}
            <div
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `linear-gradient(
                  125deg,
                  transparent 15%,
                  rgba(255,0,128,0.07) 25%,
                  rgba(255,140,0,0.08) 32%,
                  rgba(255,230,0,0.07) 39%,
                  rgba(0,255,128,0.08) 46%,
                  rgba(0,200,255,0.07) 53%,
                  rgba(160,0,255,0.08) 60%,
                  transparent 72%
                )`,
                backgroundSize: "300% 300%",
                animation: "holo-pulse 3s ease-in-out infinite",
                mixBlendMode: "screen",
              } as React.CSSProperties}
            />

            {/* ── Layer 4: Moving light sweep ── */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              <div
                style={{
                  position: "absolute",
                  width: "80px",
                  height: "200%",
                  top: "-50%",
                  left: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 50%, transparent)",
                  animation: "holo-sweep 8s ease-in-out infinite",
                }}
              />
            </div>

            {/* ── Layer 5: Mouse-follow glow ── */}
            <div
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${accent}25 0%, transparent 55%)`,
                transition: "background 0.06s",
              }}
            />

            {/* ── Card Content ── */}
            <div style={{ position: "relative", zIndex: 1 }}>

              {/* Rainbow top bar */}
              <div
                style={{
                  height: "4px",
                  background: "linear-gradient(90deg, #ff0080, #ff8c00, #ffe100, #00ff88, #00bfff, #bf5fff, #ff0080)",
                  backgroundSize: "200% 100%",
                  animation: "holo-rainbow-bar 3s linear infinite",
                }}
              />

              {/* Header row */}
              <div style={{
                padding: "14px 18px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div>
                  <div style={{
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.35em",
                    textTransform: "uppercase",
                    background: "linear-gradient(135deg, #8898c8, #c0cce8, #8898c8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "3px",
                  }}>
                    SORS MAXIMA
                  </div>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: `linear-gradient(135deg, ${accent}, #ffffff 50%, ${accent})`,
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "holo-shift 4s ease infinite",
                  }}>
                    {legs.length}-Leg Parlay
                  </div>
                </div>

                {/* Emblem */}
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: `2px solid ${accent}55`,
                  background: `radial-gradient(circle at 40% 35%, ${accent}30, transparent 65%)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1px",
                  boxShadow: `0 0 20px ${accent}45, inset 0 0 10px ${accent}15`,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: "20px", filter: `drop-shadow(0 0 6px ${accent})` }}>⚡</span>
                  <span style={{
                    fontSize: "5.5px",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    color: accent,
                    textTransform: "uppercase",
                  }}>
                    46-FACTOR
                  </span>
                </div>
              </div>

              {/* Legs */}
              <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {legs.slice(0, 6).map((leg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 10px",
                      borderRadius: "9px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Leg number bubble */}
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: `1.5px solid ${accent}70`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "9px",
                      fontWeight: 900,
                      color: accent,
                      background: `${accent}15`,
                    }}>
                      {i + 1}
                    </div>

                    {/* Sport emoji */}
                    <span style={{ fontSize: "12px", flexShrink: 0 }}>{sportEmoji(leg.sport)}</span>

                    {/* Pick text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.92)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {leg.outcome}
                      </div>
                      {leg.market && (
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.38)", marginTop: "1px" }}>
                          {leg.sport} · {leg.market}
                        </div>
                      )}
                    </div>

                    {/* Odds */}
                    <div style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      fontFamily: "monospace",
                      color: accent,
                      flexShrink: 0,
                      letterSpacing: "0.03em",
                    }}>
                      {leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}
                    </div>
                  </div>
                ))}
                {legs.length > 6 && (
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: "2px" }}>
                    +{legs.length - 6} more legs
                  </div>
                )}
              </div>

              {/* Stats bar */}
              <div style={{
                margin: "0 18px 14px",
                padding: "11px 16px",
                borderRadius: "10px",
                border: `1px solid ${accent}40`,
                background: `linear-gradient(135deg, ${accent}12, rgba(255,255,255,0.02))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                gap: "8px",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "3px" }}>
                    Combined
                  </div>
                  <div style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: accent,
                    lineHeight: 1,
                    textShadow: `0 0 14px ${accent}80`,
                  }}>
                    {totalAmericanOdds > 0 ? "+" : ""}{totalAmericanOdds}
                  </div>
                </div>

                {stake != null && (
                  <>
                    <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "3px" }}>
                        Stake
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "rgba(255,255,255,0.65)", lineHeight: 1 }}>
                        ${stake}
                      </div>
                    </div>
                  </>
                )}

                {payout != null && (
                  <>
                    <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "3px" }}>
                        Payout
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: 900, color: "#22c55e", lineHeight: 1, textShadow: "0 0 14px rgba(34,197,94,0.6)" }}>
                        ${payout.toLocaleString()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "10px 18px 15px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
                  46-Factor Intelligence
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: copied ? "#22c55e" : "rgba(255,255,255,0.75)",
                      fontSize: "9px",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    data-testid="button-holo-copy"
                  >
                    {copied ? "✓ COPIED" : "COPY"}
                  </button>
                  <button
                    onClick={handleShare}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "8px",
                      background: `linear-gradient(135deg, ${accent}90, ${accent}55)`,
                      border: `1px solid ${accent}70`,
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      boxShadow: `0 0 14px ${accent}50`,
                    }}
                    data-testid="button-holo-share"
                  >
                    SHARE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        Tap outside to close
      </p>
    </div>
  );
}

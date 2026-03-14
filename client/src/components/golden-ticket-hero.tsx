import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, Star, Zap, Lock, Trophy, Sparkles } from "lucide-react";

// ─── Deterministic particle data (no Math.random to avoid hydration issues) ───
const PARTICLES = [
  { id: 0,  x: 8,   y: 15,  size: 6,  color: "#22c55e", delay: 0,    dur: 5.2, shape: "circle" },
  { id: 1,  x: 92,  y: 22,  size: 8,  color: "#f59e0b", delay: 1.1,  dur: 4.8, shape: "hex"    },
  { id: 2,  x: 15,  y: 72,  size: 5,  color: "#10b981", delay: 0.6,  dur: 6.1, shape: "ring"   },
  { id: 3,  x: 82,  y: 68,  size: 7,  color: "#fcd34d", delay: 2.3,  dur: 4.4, shape: "plus"   },
  { id: 4,  x: 3,   y: 45,  size: 4,  color: "#16a34a", delay: 1.8,  dur: 5.7, shape: "circle" },
  { id: 5,  x: 97,  y: 50,  size: 9,  color: "#d97706", delay: 0.3,  dur: 3.9, shape: "hex"    },
  { id: 6,  x: 25,  y: 5,   size: 5,  color: "#22c55e", delay: 3.1,  dur: 5.5, shape: "ring"   },
  { id: 7,  x: 70,  y: 8,   size: 6,  color: "#f59e0b", delay: 1.5,  dur: 4.1, shape: "plus"   },
  { id: 8,  x: 50,  y: 3,   size: 4,  color: "#10b981", delay: 2.7,  dur: 6.3, shape: "circle" },
  { id: 9,  x: 38,  y: 95,  size: 7,  color: "#fcd34d", delay: 0.9,  dur: 4.6, shape: "hex"    },
  { id: 10, x: 62,  y: 92,  size: 5,  color: "#22c55e", delay: 3.4,  dur: 5.1, shape: "ring"   },
  { id: 11, x: 5,   y: 30,  size: 8,  color: "#d97706", delay: 1.2,  dur: 4.3, shape: "plus"   },
  { id: 12, x: 95,  y: 35,  size: 4,  color: "#16a34a", delay: 2.0,  dur: 5.9, shape: "circle" },
  { id: 13, x: 20,  y: 88,  size: 6,  color: "#f59e0b", delay: 0.4,  dur: 4.7, shape: "hex"    },
  { id: 14, x: 78,  y: 85,  size: 5,  color: "#22c55e", delay: 1.9,  dur: 5.3, shape: "ring"   },
  { id: 15, x: 45,  y: 98,  size: 7,  color: "#fcd34d", delay: 3.0,  dur: 4.0, shape: "plus"   },
  { id: 16, x: 12,  y: 58,  size: 4,  color: "#10b981", delay: 2.5,  dur: 6.0, shape: "circle" },
  { id: 17, x: 88,  y: 60,  size: 8,  color: "#f59e0b", delay: 0.7,  dur: 3.8, shape: "hex"    },
  { id: 18, x: 33,  y: 18,  size: 5,  color: "#22c55e", delay: 1.6,  dur: 5.6, shape: "ring"   },
  { id: 19, x: 68,  y: 20,  size: 6,  color: "#d97706", delay: 2.8,  dur: 4.5, shape: "plus"   },
  { id: 20, x: 55,  y: 12,  size: 9,  color: "#16a34a", delay: 0.2,  dur: 5.0, shape: "circle" },
  { id: 21, x: 42,  y: 82,  size: 4,  color: "#fcd34d", delay: 3.3,  dur: 4.2, shape: "hex"    },
  { id: 22, x: 7,   y: 80,  size: 6,  color: "#22c55e", delay: 1.4,  dur: 6.2, shape: "ring"   },
  { id: 23, x: 93,  y: 78,  size: 5,  color: "#f59e0b", delay: 2.1,  dur: 4.9, shape: "plus"   },
  { id: 24, x: 75,  y: 42,  size: 7,  color: "#10b981", delay: 0.8,  dur: 5.4, shape: "circle" },
  { id: 25, x: 22,  y: 40,  size: 4,  color: "#d97706", delay: 3.2,  dur: 3.7, shape: "hex"    },
  { id: 26, x: 58,  y: 75,  size: 8,  color: "#22c55e", delay: 1.7,  dur: 5.8, shape: "ring"   },
  { id: 27, x: 85,  y: 12,  size: 5,  color: "#fcd34d", delay: 0.5,  dur: 4.4, shape: "plus"   },
];

function Particle({ p }: { p: typeof PARTICLES[0] }) {
  const shapeStyle: React.CSSProperties = {};
  if (p.shape === "hex") {
    shapeStyle.clipPath = "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)";
  } else if (p.shape === "plus") {
    shapeStyle.clipPath = "polygon(33% 0%,67% 0%,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0% 67%,0% 33%,33% 33%)";
  } else if (p.shape === "ring") {
    return (
      <div
        style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size + 4,
          height: p.size + 4,
          border: `2px solid ${p.color}`,
          borderRadius: "50%",
          opacity: 0.7,
          animation: `particleFloat ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          filter: `drop-shadow(0 0 4px ${p.color}80)`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${p.x}%`,
        top: `${p.y}%`,
        width: p.size,
        height: p.size,
        background: p.color,
        borderRadius: p.shape === "circle" ? "50%" : "2px",
        opacity: 0.75,
        animation: `particleFloat ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
        filter: `drop-shadow(0 0 5px ${p.color}90)`,
        ...shapeStyle,
      }}
    />
  );
}

// ─── Gold ticket gradient stops ────────────────────────────────────────────────
const GOLD_BG = "linear-gradient(135deg, #7c4d00 0%, #b87333 8%, #f59e0b 18%, #fcd34d 30%, #fffbe6 38%, #fcd34d 46%, #f59e0b 58%, #d97706 70%, #92400e 82%, #f59e0b 90%, #fcd34d 100%)";
const GOLD_INNER = "linear-gradient(135deg, #f59e0b22, #fcd34d44 40%, #fffbe620 60%, #f59e0b22)";

// ─── Ticket half: left ─────────────────────────────────────────────────────────
function LeftHalf({ splitting }: { splitting: boolean }) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: GOLD_BG,
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px 0 0 20px",
        borderRight: "none",
        transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.7s ease",
        transform: splitting ? "translateX(-110%)" : "translateX(0)",
        opacity: splitting ? 0 : 1,
        flexShrink: 0,
      }}
    >
      {/* Inner sheen overlay */}
      <div style={{ position: "absolute", inset: 0, background: GOLD_INNER, pointerEvents: "none" }} />
      {/* Left notch */}
      <div style={{
        position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)",
        width: 48, height: 48, borderRadius: "50%",
        background: "#050a08",
        zIndex: 10,
        boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)",
      }} />
      {/* Border lines */}
      <div style={{ position: "absolute", inset: 10, border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "12px 0 0 12px", borderRight: "none", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px 0 0 8px", borderRight: "none", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 5, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 32px 20px 24px", gap: 8 }}>
        {/* SM Monogram */}
        <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
          <span style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(64px, 10vw, 110px)",
            fontWeight: 900,
            color: "transparent",
            WebkitTextStroke: "2px rgba(120,60,0,0.7)",
            background: "linear-gradient(180deg, #7c4d00 0%, #92400e 30%, #b45309 60%, #78350f 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            letterSpacing: "-4px",
            filter: "drop-shadow(0 2px 0 rgba(255,255,255,0.4)) drop-shadow(0 -1px 0 rgba(0,0,0,0.5))",
            userSelect: "none",
          }}>
            S
          </span>
        </div>

        {/* SORS text */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(11px, 1.8vw, 16px)", fontWeight: 700, letterSpacing: "0.35em", color: "rgba(92,46,0,0.85)", textTransform: "uppercase" }}>
            SORS
          </div>
          <div style={{ fontSize: "clamp(8px, 1.2vw, 11px)", letterSpacing: "0.2em", color: "rgba(92,46,0,0.6)", textTransform: "uppercase", marginTop: 2 }}>
            INTELLIGENCE
          </div>
        </div>

        {/* Corner stars */}
        <div style={{ position: "absolute", top: 22, left: 22, color: "rgba(120,60,0,0.5)", fontSize: 12 }}>★★★</div>
        <div style={{ position: "absolute", bottom: 22, left: 22, color: "rgba(120,60,0,0.5)", fontSize: 10 }}>◆ ◆ ◆</div>
      </div>
    </div>
  );
}

// ─── Ticket half: right ────────────────────────────────────────────────────────
function RightHalf({ splitting }: { splitting: boolean }) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: GOLD_BG,
        position: "relative",
        overflow: "hidden",
        borderRadius: "0 20px 20px 0",
        borderLeft: "none",
        transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.7s ease",
        transform: splitting ? "translateX(110%)" : "translateX(0)",
        opacity: splitting ? 0 : 1,
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: GOLD_INNER, pointerEvents: "none" }} />
      {/* Right notch */}
      <div style={{
        position: "absolute", left: -24, top: "50%", transform: "translateY(-50%)",
        width: 48, height: 48, borderRadius: "50%",
        background: "#050a08",
        zIndex: 10,
        boxShadow: "inset 0 0 8px rgba(0,0,0,0.8)",
      }} />
      <div style={{ position: "absolute", inset: 10, border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "0 12px 12px 0", borderLeft: "none", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0 8px 8px 0", borderLeft: "none", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 5, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px 20px 32px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", lineHeight: 1 }}>
          <span style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(64px, 10vw, 110px)",
            fontWeight: 900,
            color: "transparent",
            WebkitTextStroke: "2px rgba(120,60,0,0.7)",
            background: "linear-gradient(180deg, #7c4d00 0%, #92400e 30%, #b45309 60%, #78350f 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-4px",
            filter: "drop-shadow(0 2px 0 rgba(255,255,255,0.4)) drop-shadow(0 -1px 0 rgba(0,0,0,0.5))",
            userSelect: "none",
          }}>
            M
          </span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(11px, 1.8vw, 16px)", fontWeight: 700, letterSpacing: "0.35em", color: "rgba(92,46,0,0.85)", textTransform: "uppercase" }}>
            MAXIMA
          </div>
          <div style={{ fontSize: "clamp(8px, 1.2vw, 11px)", letterSpacing: "0.2em", color: "rgba(92,46,0,0.6)", textTransform: "uppercase", marginTop: 2 }}>
            PLATFORM
          </div>
        </div>

        {/* Ticket # */}
        <div style={{ position: "absolute", top: 22, right: 22, fontSize: "clamp(7px, 1vw, 10px)", letterSpacing: "0.15em", color: "rgba(92,46,0,0.55)", fontFamily: "monospace" }}>
          #001 · VIP ACCESS
        </div>
        <div style={{ position: "absolute", bottom: 22, right: 22, color: "rgba(120,60,0,0.5)", fontSize: 12 }}>★★★</div>
      </div>
    </div>
  );
}

// ─── Perforated center line ────────────────────────────────────────────────────
function PerfLine({ splitting }: { splitting: boolean }) {
  return (
    <div style={{
      position: "absolute",
      left: "50%",
      top: 0,
      bottom: 0,
      width: 2,
      transform: "translateX(-50%)",
      zIndex: 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 0,
      opacity: splitting ? 0 : 1,
      transition: "opacity 0.3s",
      pointerEvents: "none",
    }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <div key={i} style={{ width: 2, height: "3.5%", background: "rgba(0,0,0,0.35)", marginBottom: "1%" }} />
      ))}
    </div>
  );
}

// ─── Floating quantum orbits (rings around the ticket) ────────────────────────
function QuantumOrbit({ radius, speed, color, opacity }: { radius: number; speed: number; color: string; opacity: number }) {
  return (
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: radius * 2,
      height: radius * 0.6,
      transform: "translate(-50%, -50%)",
      border: `1px solid ${color}`,
      borderRadius: "50%",
      opacity,
      animation: `orbitSpin ${speed}s linear infinite`,
      pointerEvents: "none",
    }} />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Phase = "idle" | "hover" | "splitting" | "open";

export function GoldenTicketHero() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = () => {
    if (phase === "idle" || phase === "hover") {
      setPhase("splitting");
      timerRef.current = setTimeout(() => setPhase("open"), 800);
    }
  };

  const handleReset = () => {
    setPhase("idle");
  };

  const splitting = phase === "splitting";
  const open = phase === "open";

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @keyframes particleFloat {
          0%   { transform: translateY(0px) rotate(0deg) scale(1); }
          50%  { transform: translateY(-18px) rotate(180deg) scale(1.15); }
          100% { transform: translateY(-8px) rotate(360deg) scale(0.9); }
        }
        @keyframes ticketBob {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-10px) scale(1.01); }
        }
        @keyframes orbitSpin {
          from { transform: translate(-50%, -50%) rotateX(72deg) rotateZ(0deg); }
          to   { transform: translate(-50%, -50%) rotateX(72deg) rotateZ(360deg); }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 40px 8px #f59e0b55, 0 0 80px 16px #22c55e22, 0 30px 80px rgba(0,0,0,0.6); }
          50%       { box-shadow: 0 0 60px 16px #f59e0b77, 0 0 120px 30px #22c55e44, 0 30px 80px rgba(0,0,0,0.6); }
        }
        @keyframes revealScale {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ticket-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 55%, transparent 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <section
        className="relative overflow-hidden"
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 50% 0%, #0d1f0d 0%, #050a08 50%, #020605 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 16px 60px",
        }}
        data-testid="section-hero"
      >
        {/* Background glow blobs */}
        <div style={{ position: "absolute", top: "20%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #22c55e18 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #f59e0b12 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Tagline above ticket */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 32,
            opacity: open ? 0 : 1,
            transition: "opacity 0.4s",
            maxWidth: "100%",
            padding: "0 8px",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: "clamp(10px, 1.5vw, 13px)", letterSpacing: "clamp(0.1em, 0.3vw, 0.3em)", color: "#22c55e", textTransform: "uppercase", fontWeight: 600, textAlign: "center" }}>
            Private Intelligence Platform
          </span>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", flexShrink: 0 }} />
        </div>

        {/* ── THE TICKET ── */}
        <div
          style={{
            position: "relative",
            width: "min(820px, 94vw)",
            height: "clamp(240px, 32vw, 340px)",
            marginBottom: 40,
            cursor: open ? "default" : "pointer",
            animation: (phase === "idle" || phase === "hover") ? "ticketBob 4s ease-in-out infinite, goldPulse 3s ease-in-out infinite" : "none",
          }}
          onClick={handleClick}
          data-testid="golden-ticket"
        >
          {/* Particle field */}
          {mounted && (
            <div style={{ position: "absolute", inset: "-60px", pointerEvents: "none", zIndex: 1 }}>
              {PARTICLES.map((p) => <Particle key={p.id} p={p} />)}
            </div>
          )}

          {/* Quantum orbit rings */}
          <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
            <QuantumOrbit radius={520} speed={18} color="#22c55e44" opacity={0.5} />
            <QuantumOrbit radius={600} speed={25} color="#f59e0b33" opacity={0.35} />
            <QuantumOrbit radius={450} speed={12} color="#10b98133" opacity={0.4} />
          </div>

          {/* The actual ticket */}
          <div
            style={{
              position: "relative",
              zIndex: 5,
              width: "100%",
              height: "100%",
              display: "flex",
              borderRadius: 20,
              overflow: "visible",
            }}
          >
            <LeftHalf splitting={splitting} />
            <PerfLine splitting={splitting} />
            <RightHalf splitting={splitting} />

            {/* Shimmer overlay */}
            {!open && (
              <div
                className="ticket-shimmer"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 20,
                  zIndex: 6,
                  pointerEvents: "none",
                  opacity: phase === "hover" ? 0.8 : 0.4,
                  transition: "opacity 0.3s",
                }}
              />
            )}

            {/* Hover glow */}
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: 24,
              border: "2px solid rgba(245,158,11,0.6)",
              zIndex: 7,
              pointerEvents: "none",
              boxShadow: phase === "hover" ? "0 0 30px 6px rgba(245,158,11,0.4), inset 0 0 20px rgba(245,158,11,0.1)" : "none",
              transition: "box-shadow 0.3s",
            }} />
          </div>

          {/* Click hint */}
          {(phase === "idle" || phase === "hover") && (
            <div
              style={{
                position: "absolute",
                bottom: -36,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "clamp(10px, 1.4vw, 12px)",
                letterSpacing: "0.25em",
                color: "rgba(245,158,11,0.7)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                animation: "ticketBob 2s ease-in-out infinite",
              }}
            >
              ↑ Click to Access ↑
            </div>
          )}
        </div>

        {/* ── REVEAL PANEL (shown after ticket opens) ── */}
        {open && (
          <div
            style={{
              animation: "revealScale 0.6s cubic-bezier(0.23,1,0.32,1) forwards",
              width: "min(680px, 94vw)",
              background: "linear-gradient(135deg, rgba(16,30,16,0.95) 0%, rgba(10,20,12,0.98) 100%)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 24,
              padding: "clamp(28px, 5vw, 48px)",
              boxShadow: "0 0 60px 10px rgba(245,158,11,0.15), 0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
              textAlign: "center",
            }}
            data-testid="panel-access-granted"
          >
            {/* Trophy icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Trophy style={{ width: 32, height: 32, color: "#f59e0b" }} />
              </div>
            </div>

            <div style={{ color: "rgba(245,158,11,0.6)", fontSize: "clamp(9px, 1.2vw, 11px)", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 8 }}>
              Access Unlocked
            </div>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1.2, marginBottom: 10 }}>
              Welcome to Sors Maxima
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(13px, 1.8vw, 15px)", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
              Institutional-grade sports intelligence. 46-factor analysis, 10K daily simulations, grade A+ picks — delivered to members only.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <Link href="/login">
                <button
                  style={{
                    padding: "14px 32px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    borderRadius: 12,
                    color: "#000",
                    fontWeight: 700,
                    fontSize: "clamp(13px, 1.6vw, 15px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
                    letterSpacing: "0.03em",
                  }}
                  data-testid="button-member-login"
                >
                  <Lock style={{ width: 16, height: 16 }} />
                  Member Login
                </button>
              </Link>
              <Link href="/register">
                <button
                  style={{
                    padding: "14px 32px",
                    background: "rgba(34,197,94,0.12)",
                    border: "1.5px solid rgba(34,197,94,0.4)",
                    borderRadius: 12,
                    color: "#22c55e",
                    fontWeight: 600,
                    fontSize: "clamp(13px, 1.6vw, 15px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backdropFilter: "blur(8px)",
                  }}
                  data-testid="button-request-access"
                >
                  <Sparkles style={{ width: 16, height: 16 }} />
                  Get Started
                </button>
              </Link>
            </div>

            {/* Tier pills */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { name: "Sharp", price: "$49/mo", color: "#6366f1" },
                { name: "Edge",  price: "$99/mo", color: "#22c55e" },
                { name: "Max",   price: "$249/mo", color: "#f59e0b" },
              ].map((t) => (
                <div
                  key={t.name}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: `1px solid ${t.color}40`,
                    background: `${t.color}12`,
                    color: t.color,
                    fontSize: "clamp(10px, 1.3vw, 12px)",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  {t.name} · {t.price}
                </div>
              ))}
            </div>

            {/* Close / reset */}
            <button
              onClick={handleReset}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", letterSpacing: "0.1em" }}
              data-testid="button-close-reveal"
            >
              ↩ Back
            </button>
          </div>
        )}

        {/* Title below ticket (shown when idle) */}
        {!open && (
          <div
            style={{
              textAlign: "center",
              marginTop: 16,
              opacity: (phase === "idle" || phase === "hover") ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          >
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(20px, 3.5vw, 32px)", letterSpacing: "-0.02em", marginBottom: 8 }}>
              Exclusive Intelligence for the Modern Bettor
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(12px, 1.6vw, 15px)", maxWidth: 480, margin: "0 auto" }}>
              46-factor analysis · 10K daily simulations · Grade A+ picks only
            </p>
          </div>
        )}
      </section>
    </>
  );
}

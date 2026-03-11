import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TradingCard } from "@/components/trading-card";
import { Button } from "@/components/ui/button";
import { Zap, ArrowUp, Hand, Sparkles, Eye, Share2, ArrowRight } from "lucide-react";

interface PackRipRevealProps {
  cards: { collection: any; card: any }[];
  onClose: () => void;
}

const TEAR_THRESHOLD = 42;

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 4,
  dur: 3 + Math.random() * 4,
  color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#34d399" : "#d97706",
  opacity: 0.25 + Math.random() * 0.45,
}));

const BURST_SPARKS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  return {
    id: i,
    x: Math.cos(angle) * (60 + Math.random() * 180),
    y: Math.sin(angle) * (60 + Math.random() * 180),
    color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#34d399" : "#fb923c",
    size: 2 + Math.random() * 4,
  };
});

export function PackRipReveal({ cards, onClose }: PackRipRevealProps) {
  const [phase, setPhase] = useState<"idle" | "ripping" | "revealed">("idle");
  const [dragY, setDragY] = useState(0);
  const isDragging = useRef(false);
  const startY = useRef(0);

  const triggerRip = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("ripping");
    setTimeout(() => setPhase("revealed"), 900);
  }, [phase]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "idle") return;
    isDragging.current = true;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [phase]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || phase !== "idle") return;
    const delta = startY.current - e.clientY;
    if (delta > 0) setDragY(Math.min(delta, TEAR_THRESHOLD + 20));
    if (delta >= TEAR_THRESHOLD) {
      isDragging.current = false;
      setDragY(0);
      triggerRip();
    }
  }, [phase, triggerRip]);

  const onPointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setDragY(0);
    }
  }, []);

  const tearProgress = dragY / TEAR_THRESHOLD;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/97">

      {/* Ambient gold background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(251,191,36,0.06) 0%, transparent 70%)"
        }} />
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
            }}
            animate={{
              y: [0, -18, 0],
              opacity: [p.opacity, p.opacity * 0.4, p.opacity],
            }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {phase !== "revealed" ? (
          <motion.div
            key="pack"
            className="relative flex flex-col items-center gap-0"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
          >
            {/* Step indicator + context header */}
            <motion.div
              className="mb-5 text-center space-y-1.5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.30)", color: "rgba(251,191,36,0.85)" }}
                >
                  <Sparkles style={{ width: 11, height: 11 }} />
                  Step 1 of 2 · Rip Open Your Pack
                </div>
              </div>
              <p
                className="font-black uppercase tracking-tight"
                style={{ fontSize: 22, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Your Pack Is Ready
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", letterSpacing: "0.05em" }}>
                {cards.length} Intelligence Card{cards.length !== 1 ? "s" : ""} sealed inside — rip it to reveal them
              </p>
            </motion.div>

            {/* Pack wrapper */}
            <div className="relative" style={{ width: 272, height: 408 }}>

              {/* ── TOP HALF (tear strip + upper pack) ── */}
              <motion.div
                className="absolute top-0 left-0 right-0 overflow-hidden cursor-grab active:cursor-grabbing"
                style={{
                  height: 204,
                  y: -dragY,
                }}
                animate={phase === "ripping" ? {
                  y: -520,
                  rotate: -12,
                  opacity: 0,
                  transition: { duration: 0.55, ease: [0.4, 0, 0.6, 1] }
                } : {}}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                data-testid="pack-tear-strip"
              >
                {/* Tear strip band */}
                <div
                  className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center gap-2 select-none"
                  style={{
                    height: 44,
                    background: "linear-gradient(180deg, #92400e 0%, #b45309 40%, #78350f 100%)",
                    borderRadius: "12px 12px 0 0",
                    borderBottom: "1px dashed rgba(251,191,36,0.5)",
                  }}
                >
                  <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.35em", color: "rgba(251,191,36,0.7)" }}>▲</span>
                  <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.25em", color: "rgba(251,191,36,0.7)" }}>
                    {tearProgress > 0.4 ? "ALMOST..." : "TEAR HERE"}
                  </span>
                  <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.35em", color: "rgba(251,191,36,0.7)" }}>▲</span>
                </div>

                {/* Upper pack body */}
                <div
                  className="absolute left-0 right-0 bottom-0"
                  style={{
                    top: 44,
                    background: "linear-gradient(160deg, #451a03 0%, #78350f 25%, #b45309 50%, #92400e 75%, #451a03 100%)",
                  }}
                >
                  {/* Metallic sheen sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.12) 50%, rgba(255,255,255,0.08) 52%, transparent 70%)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
                  />
                  {/* S M monogram halves */}
                  <div className="absolute inset-0 flex items-center justify-center gap-4" style={{ paddingTop: 8 }}>
                    <span style={{
                      fontSize: 68,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "transparent",
                      WebkitTextStroke: "1.5px rgba(251,191,36,0.35)",
                      lineHeight: 1,
                      fontFamily: "Georgia, serif",
                      textShadow: "0 0 30px rgba(251,191,36,0.2)",
                    }}>S</span>
                  </div>
                </div>
              </motion.div>

              {/* Tear gap glow effect */}
              {dragY > 10 && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: 204 - dragY - 2,
                    height: dragY + 4,
                    background: "linear-gradient(180deg, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0.05) 100%)",
                    boxShadow: "0 0 20px rgba(251,191,36,0.4)",
                    zIndex: 5,
                  }}
                />
              )}

              {/* ── BOTTOM HALF ── */}
              <motion.div
                className="absolute left-0 right-0 bottom-0 overflow-hidden"
                style={{ height: 204 }}
                animate={phase === "ripping" ? {
                  y: 340,
                  rotate: 6,
                  opacity: 0,
                  transition: { duration: 0.65, ease: [0.4, 0, 1, 1], delay: 0.05 }
                } : {}}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(200deg, #451a03 0%, #78350f 25%, #b45309 50%, #92400e 75%, #451a03 100%)",
                  }}
                >
                  {/* Metallic sheen sweep (offset) */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.10) 50%, rgba(255,255,255,0.06) 52%, transparent 70%)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8, delay: 1.6 }}
                  />

                  {/* M monogram */}
                  <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 8 }}>
                    <span style={{
                      fontSize: 68,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "transparent",
                      WebkitTextStroke: "1.5px rgba(251,191,36,0.35)",
                      lineHeight: 1,
                      fontFamily: "Georgia, serif",
                      textShadow: "0 0 30px rgba(251,191,36,0.2)",
                    }}>M</span>
                  </div>

                  {/* Brand label */}
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-5 gap-1.5">
                    <div className="flex gap-1 items-center mb-1">
                      {Array.from({ length: cards.length }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 28,
                            height: 38,
                            borderRadius: 3,
                            background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)",
                            border: "1px solid rgba(251,191,36,0.3)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                            transform: `rotate(${(i - (cards.length - 1) / 2) * 5}deg) translateY(${Math.abs(i - (cards.length - 1) / 2) * 3}px)`,
                          }}
                        />
                      ))}
                    </div>
                    <p style={{
                      fontSize: 7,
                      fontWeight: 900,
                      letterSpacing: "0.3em",
                      color: "rgba(251,191,36,0.6)",
                      textTransform: "uppercase",
                    }}>
                      SORS MAXIMA™
                    </p>
                    <p style={{
                      fontSize: 6,
                      fontWeight: 700,
                      letterSpacing: "0.25em",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                    }}>
                      {cards.length} INTELLIGENCE CARD{cards.length !== 1 ? "S" : ""} INSIDE
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Pack outer border & corner accents */}
              <div
                className="absolute inset-0 pointer-events-none rounded-xl"
                style={{
                  border: "1.5px solid rgba(251,191,36,0.4)",
                  boxShadow: [
                    "0 0 0 1px rgba(0,0,0,0.6)",
                    "0 0 40px rgba(251,191,36,0.15)",
                    "inset 0 0 0 1px rgba(251,191,36,0.08)",
                  ].join(", "),
                  borderRadius: 12,
                  zIndex: 20,
                }}
              />
              {/* Corner rivets */}
              {[
                { top: 6, left: 6 },
                { top: 6, right: 6 },
                { bottom: 6, left: 6 },
                { bottom: 6, right: 6 },
              ].map((pos, i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    ...pos,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(251,191,36,0.5)",
                    zIndex: 21,
                  }}
                />
              ))}
            </div>

            {/* Drag instruction — prominent */}
            {phase === "idle" && dragY === 0 && (
              <motion.div
                className="mt-4 flex flex-col items-center gap-2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <Hand style={{ width: 14, height: 14, color: "rgba(251,191,36,0.7)" }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.22em", color: "rgba(251,191,36,0.7)", fontWeight: 800, textTransform: "uppercase" }}>
                    Grab &amp; swipe the pack upward
                  </span>
                  <ArrowUp style={{ width: 14, height: 14, color: "rgba(251,191,36,0.7)" }} />
                </div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>
                  or use the button below
                </p>
              </motion.div>
            )}
            {dragY > 0 && (
              <motion.div className="mt-4 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <ArrowUp style={{ width: 14, height: 14, color: "rgba(251,191,36,0.9)" }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.15em", color: "rgba(251,191,36,0.9)", fontWeight: 900 }}>
                    {Math.round(tearProgress * 100)}% — keep going!
                  </span>
                </div>
                {tearProgress > 0.6 && (
                  <p style={{ fontSize: 10, color: "rgba(251,191,36,0.6)", fontWeight: 700 }}>Almost there...</p>
                )}
              </motion.div>
            )}

            {/* Fallback button */}
            {phase === "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-4"
              >
                <Button
                  onClick={triggerRip}
                  className="font-black tracking-widest px-8 h-11 hover-elevate active-elevate-2"
                  style={{
                    background: "linear-gradient(135deg, #b45309, #fbbf24, #b45309)",
                    color: "#1c0a00",
                    boxShadow: "0 0 24px rgba(251,191,36,0.35)",
                  }}
                  data-testid="button-rip-it-open"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  RIP IT OPEN
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            className="flex flex-col items-center gap-6 w-full max-w-5xl px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Burst sparks */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0">
              {BURST_SPARKS.map(s => (
                <motion.div
                  key={s.id}
                  className="absolute rounded-full"
                  style={{ backgroundColor: s.color, width: s.size, height: s.size }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: s.x, y: s.y, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: s.id * 0.01 }}
                />
              ))}
            </div>

            {/* Step 2 header */}
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", damping: 15 }}
              className="text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.30)", color: "rgba(52,211,153,0.85)" }}
                >
                  <Sparkles style={{ width: 11, height: 11 }} />
                  Step 2 of 2 · Collect Your Cards
                </div>
              </div>
              <h2
                className="font-black uppercase tracking-tight"
                style={{
                  fontSize: 30,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Pack Opened!
              </h2>
              <p style={{ fontSize: 11, letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                {cards.length} card{cards.length !== 1 ? "s" : ""} revealed below — click any card to flip it and read the full pick analysis
              </p>
            </motion.div>

            {/* Cards fan */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 z-10">
              {cards.map((item, idx) => (
                <motion.div
                  key={item.collection?.id ?? idx}
                  className="relative"
                  style={{ width: 260, height: 370 }}
                  initial={{ scale: 0.4, opacity: 0, y: 60, rotate: (idx % 2 === 0 ? -18 : 18) }}
                  animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: 0.25 + idx * 0.18, type: "spring", damping: 14, stiffness: 160 }}
                >
                  {/* Reveal glow */}
                  <motion.div
                    className="absolute -inset-3 rounded-3xl pointer-events-none"
                    style={{ background: "radial-gradient(ellipse, rgba(251,191,36,0.25) 0%, transparent 70%)" }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 0.8 + idx * 0.18, duration: 1.2 }}
                  />
                  {/* Flip hint on first card */}
                  {idx === 0 && (
                    <motion.div
                      className="absolute -bottom-7 left-0 right-0 flex items-center justify-center gap-1 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.7, 0.7, 0] }}
                      transition={{ delay: 1.2, duration: 2.5, times: [0, 0.15, 0.85, 1] }}
                    >
                      <Eye style={{ width: 10, height: 10, color: "rgba(251,191,36,0.6)" }} />
                      <span style={{ fontSize: 9, color: "rgba(251,191,36,0.6)", fontWeight: 700, letterSpacing: "0.15em" }}>TAP TO FLIP</span>
                    </motion.div>
                  )}
                  <TradingCard
                    card={item.card}
                    instanceNumber={item.collection?.instanceNumber}
                    isFlippable={true}
                  />
                </motion.div>
              ))}
            </div>

            {/* What to do next hints */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + cards.length * 0.18 }}
            >
              {[
                { icon: <Eye style={{ width: 12, height: 12 }} />, text: "Flip any card to read the full pick analysis" },
                { icon: <Share2 style={{ width: 12, height: 12 }} />, text: "Showcase your best cards on the Community tab" },
                { icon: <ArrowRight style={{ width: 12, height: 12 }} />, text: "Trade duplicates with other members" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <span style={{ color: "rgba(251,191,36,0.6)" }}>{icon}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", fontWeight: 600 }}>{text}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + cards.length * 0.18 }}
            >
              <Button
                onClick={onClose}
                size="lg"
                className="font-black px-12 h-14 text-lg hover-elevate active-elevate-2"
                style={{
                  background: "linear-gradient(135deg, #166534, #16a34a, #166534)",
                  color: "white",
                  boxShadow: "0 0 28px rgba(34,197,94,0.35)",
                }}
                data-testid="button-add-to-collection"
              >
                ADD ALL TO COLLECTION
              </Button>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: "center", marginTop: 8, letterSpacing: "0.05em" }}>
                Cards are permanently saved · They won't disappear
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

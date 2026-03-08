import { useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { TradingCard } from "@/components/trading-card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy } from "lucide-react";

interface PackRipRevealProps {
  cards: { collection: any; card: any }[];
  onClose: () => void;
}

export function PackRipReveal({ cards, onClose }: PackRipRevealProps) {
  const [isRipped, setIsRipped] = useState(false);
  const dragControls = useDragControls();

  const handleRip = () => {
    if (isRipped) return;
    setIsRipped(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
      <AnimatePresence>
        {!isRipped ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-[280px] h-[420px] cursor-grab active:cursor-grabbing"
            data-testid="pack-container"
          >
            {/* The Pack Visual */}
            <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl border-2 border-primary/30">
              {/* Top Half */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-800 flex flex-col items-center justify-end pb-4"
                style={{ clipPath: "inset(0 0 50% 0)" }}
                animate={isRipped ? { y: -400, opacity: 0 } : {}}
                transition={{ duration: 0.6, ease: "easeIn" }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -50) handleRip();
                }}
              >
                <div className="absolute top-8 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-primary tracking-tighter">SORS MAXIMA™</h2>
                  <p className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Intelligence Pack</p>
                </div>
              </motion.div>

              {/* Bottom Half */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-zinc-800 flex flex-col items-center pt-4"
                style={{ clipPath: "inset(50% 0 0 0)" }}
                animate={isRipped ? { y: 400, opacity: 0 } : {}}
                transition={{ duration: 0.6, ease: "easeIn" }}
              >
                <div className="mt-auto pb-12 flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="w-6 h-8 rounded-sm bg-white/5 border border-white/10" />
                    ))}
                  </div>
                  <Button 
                    onClick={handleRip}
                    className="font-black tracking-widest bg-primary text-black hover:bg-primary/90"
                    data-testid="button-rip-it-open"
                  >
                    RIP IT OPEN
                  </Button>
                </div>
              </motion.div>

              {/* Perforated Line */}
              {!isRipped && (
                <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-white/20 z-10 flex items-center justify-center">
                   <div className="px-2 bg-zinc-850 text-[8px] font-black text-white/30 tracking-widest">DRAG UP TO RIP</div>
                </div>
              )}
            </div>

            {/* Sparkles around pack */}
            <div className="absolute -inset-4 pointer-events-none">
                <Sparkles className="absolute top-0 left-0 w-4 h-4 text-primary animate-pulse" />
                <Sparkles className="absolute bottom-0 right-0 w-4 h-4 text-primary animate-pulse delay-700" />
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-12 w-full max-w-6xl px-4">
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-black text-primary tracking-tighter uppercase text-center"
            >
              Pack Contents
            </motion.h2>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              {cards.map((item, idx) => (
                <motion.div
                  key={item.collection.id}
                  initial={{ scale: 0, opacity: 0, y: 50, rotate: idx % 2 === 0 ? -10 : 10 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0, 
                    rotate: 0,
                    transition: { delay: 0.2 + idx * 0.15, type: "spring", damping: 15 }
                  }}
                  className="w-[280px] h-[400px] relative group"
                >
                   {/* Reveal Shimmer Effect */}
                   <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ delay: 0.8 + idx * 0.15, duration: 1 }}
                      className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl z-0"
                   />

                  <TradingCard
                    card={item.card}
                    instanceNumber={item.collection.instanceNumber}
                    isFlippable={true}
                  />
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Button 
                onClick={onClose} 
                size="lg"
                className="font-black px-12 h-14 text-lg hover-elevate active-elevate-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                data-testid="button-add-to-collection"
              >
                ADD ALL TO COLLECTION
              </Button>
            </motion.div>

            {/* Background Sparks/Particles */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ 
                            x: "50%", 
                            y: "50%", 
                            scale: 0,
                            opacity: 1 
                        }}
                        animate={{ 
                            x: `${Math.random() * 100}%`, 
                            y: `${Math.random() * 100}%`,
                            scale: Math.random() * 2,
                            opacity: 0
                        }}
                        transition={{ 
                            duration: 1.5, 
                            delay: 0.4,
                            ease: "easeOut"
                        }}
                        className="absolute w-1 h-1 bg-primary rounded-full"
                    />
                ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

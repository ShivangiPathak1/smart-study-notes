import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { Flashcard } from "@/types/notes";

export function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        No flashcards available.
      </div>
    );
  }

  const card = cards[idx];
  const next = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % cards.length);
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Card {idx + 1} of {cards.length}
        </span>
        <Button variant="ghost" size="sm" onClick={() => { setIdx(0); setFlipped(false); }}>
          <RotateCcw className="mr-2 h-3 w-3" /> Restart
        </Button>
      </div>
      <Progress value={((idx + 1) / cards.length) * 100} />

      <div
        className="perspective relative h-72 cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${idx}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-border p-8 shadow-glow ${
              flipped ? "bg-gradient-fresh text-white" : "bg-gradient-hero text-white"
            }`}
          >
            <div className="text-center">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/80">
                {flipped ? "Answer" : "Question"}
              </div>
              <p className="text-xl font-semibold leading-relaxed">
                {flipped ? card.answer : card.question}
              </p>
              {!flipped && (
                <p className="mt-6 text-xs text-white/70">Click to flip</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={prev} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button onClick={next} className="flex-1 bg-gradient-hero text-white shadow-glow hover:opacity-95">
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
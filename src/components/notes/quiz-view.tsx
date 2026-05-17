import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/notes";

export function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);

  if (!questions?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        No quiz available.
      </div>
    );
  }

  const pick = (qi: number, ci: number) => {
    if (submitted) return;
    const copy = [...answers];
    copy[qi] = ci;
    setAnswers(copy);
  };

  const score = answers.reduce(
    (acc: number, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0),
    0,
  );
  const allAnswered = answers.every((a) => a !== null);

  const reset = () => {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {score} / {questions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round((score / questions.length) * 100)}% correct
              </div>
            </div>
          </div>
          <Button onClick={reset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </motion.div>
      )}

      {questions.map((q, qi) => (
        <Card key={qi} className="p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {qi + 1}
            </span>
            <h3 className="text-base font-medium leading-relaxed">{q.question}</h3>
          </div>
          <div className="grid gap-2">
            {q.choices.map((choice, ci) => {
              const selected = answers[qi] === ci;
              const correct = ci === q.correctIndex;
              const showResult = submitted;
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => pick(qi, ci)}
                  disabled={submitted}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-border p-3 text-left text-sm transition-colors",
                    !showResult && selected && "border-primary bg-primary/10",
                    !showResult && !selected && "hover:bg-accent",
                    showResult && correct && "border-green-500 bg-green-500/10",
                    showResult && selected && !correct && "border-destructive bg-destructive/10",
                  )}
                >
                  <span>{choice}</span>
                  {showResult && correct && <Check className="h-4 w-4 text-green-600" />}
                  {showResult && selected && !correct && (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {q.explanation}
            </p>
          )}
        </Card>
      ))}

      {!submitted && (
        <Button
          size="lg"
          className="w-full"
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
        >
          Submit quiz
        </Button>
      )}
    </div>
  );
}
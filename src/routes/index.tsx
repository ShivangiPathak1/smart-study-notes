import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  FileText,
  Layers,
  ListChecks,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: Camera,
    title: "Snap anything",
    desc: "Handwritten pages, whiteboard photos, screenshots, or PDFs.",
  },
  {
    icon: FileText,
    title: "Clean notes",
    desc: "Structured markdown with headings, bullets, and key terms.",
  },
  {
    icon: Sparkles,
    title: "Smart summaries",
    desc: "Tight revision notes you can actually study from.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    desc: "Auto-generated decks with a beautiful flip review mode.",
  },
  {
    icon: ListChecks,
    title: "Quizzes",
    desc: "Multiple-choice quizzes with scoring and explanations.",
  },
  {
    icon: Zap,
    title: "Instant",
    desc: "One upload, one AI pass — all of it ready in seconds.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[500px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl"
          />
          <div className="container mx-auto px-4 py-20 sm:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                AI-powered study sidekick
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Turn messy notes into{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  study-ready material
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                Upload a photo or PDF of your lecture notes. NoteMe extracts the text,
                cleans it up, and generates summaries, flashcards and quizzes — instantly.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup">
                  <Button size="lg" className="h-12 px-6 text-base">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                    Log in
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="h-full p-6 transition-shadow hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Built with NoteMe · Powered by Lovable Cloud + Lovable AI
      </footer>
    </div>
  );
}
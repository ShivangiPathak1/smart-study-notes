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
    gradient: "bg-gradient-hero",
  },
  {
    icon: FileText,
    title: "Clean notes",
    desc: "Structured markdown with headings, bullets, and key terms.",
    gradient: "bg-gradient-cool",
  },
  {
    icon: Sparkles,
    title: "Smart summaries",
    desc: "Tight revision notes you can actually study from.",
    gradient: "bg-gradient-primary",
  },
  {
    icon: Layers,
    title: "Flashcards",
    desc: "Auto-generated decks with a beautiful flip review mode.",
    gradient: "bg-gradient-fresh",
  },
  {
    icon: ListChecks,
    title: "Quizzes",
    desc: "Multiple-choice quizzes with scoring and explanations.",
    gradient: "bg-gradient-warm",
  },
  {
    icon: Zap,
    title: "Instant",
    desc: "One upload, one AI pass — all of it ready in seconds.",
    gradient: "bg-gradient-hero",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="aurora" />
          <div className="container mx-auto px-4 py-20 sm:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                <Sparkles className="h-3 w-3 text-primary" />
                AI-powered study sidekick
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Turn messy notes into{" "}
                <span className="text-gradient-hero">study-ready material</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                Upload a photo or PDF of your lecture notes. NoteMe extracts the text,
                cleans it up, and generates summaries, flashcards and quizzes — instantly.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup">
                  <Button size="lg" className="h-12 bg-gradient-hero px-6 text-base text-white shadow-glow transition-transform hover:scale-105 hover:opacity-95">
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
                <Card className="group relative h-full overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 ${f.gradient}`} />
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${f.gradient}`}>
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
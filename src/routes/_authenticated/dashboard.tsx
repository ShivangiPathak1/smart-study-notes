import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  FileText,
  Folder,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listNotes } from "@/lib/notes.functions";
import { formatDistanceToNow } from "date-fns";

const GRADIENTS = [
  "bg-gradient-hero",
  "bg-gradient-cool",
  "bg-gradient-primary",
  "bg-gradient-fresh",
  "bg-gradient-warm",
];
function gradientFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchNotes = useServerFn(listNotes);
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => fetchNotes(),
    refetchInterval: (q) => {
      const data = q.state.data as { status?: string }[] | undefined;
      return data?.some((n) => n.status === "processing") ? 3000 : false;
    },
  });

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!notes) return [];
    const q = query.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        n.summary?.toLowerCase().includes(q) ||
        n.clean_notes?.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const subjects = useMemo(() => {
    if (!notes) return 0;
    return new Set(notes.map((n) => n.subject || "General")).size;
  }, [notes]);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your <span className="text-gradient-hero">study library</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every note you've scanned, ready to revise.
          </p>
        </div>
        <Link to="/upload">
          <Button size="lg" className="bg-gradient-hero text-white shadow-glow transition-transform hover:scale-105">
            <Plus className="mr-2 h-4 w-4" /> New upload
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label="Total notes" value={notes?.length ?? 0} loading={isLoading} gradient="bg-gradient-cool" />
        <StatCard icon={Folder} label="Subjects" value={subjects} loading={isLoading} gradient="bg-gradient-fresh" />
        <StatCard
          icon={Sparkles}
          label="Processing"
          value={notes?.filter((n) => n.status === "processing").length ?? 0}
          loading={isLoading}
          gradient="bg-gradient-warm"
        />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, subject, keyword…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasNotes={(notes?.length ?? 0) > 0} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <Link
                  to="/notes/$id"
                  params={{ id: n.id }}
                  className="group block"
                >
                  <Card className="relative h-full overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-glow">
                    <div className={`absolute inset-x-0 top-0 h-1.5 ${gradientFor(n.subject || n.id)}`} />
                    <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-2xl ${gradientFor(n.subject || n.id)}`} />
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={`border-0 text-white text-xs ${gradientFor(n.subject || n.id)}`}>
                        {n.subject || "General"}
                      </Badge>
                      <StatusBadge status={n.status} />
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
                      {n.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {n.summary || n.original_text?.slice(0, 160) || "Tap to view."}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  gradient = "bg-gradient-hero",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
  gradient?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5 transition-transform hover:-translate-y-0.5">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl ${gradient}`} />
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${gradient}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold">
            {loading ? <Skeleton className="h-7 w-10" /> : value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "processing")
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  if (status === "failed")
    return <Badge variant="destructive">Failed</Badge>;
  return (
    <Badge variant="outline" className="border-green-500/40 text-green-600">
      Ready
    </Badge>
  );
}

function EmptyState({ hasNotes }: { hasNotes: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Upload className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        {hasNotes ? "No matches" : "Start your library"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasNotes
          ? "Try a different keyword."
          : "Upload a photo or PDF of your notes — NoteMe will do the rest."}
      </p>
      {!hasNotes && (
        <Link to="/upload" className="mt-6">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Upload your first note
          </Button>
        </Link>
      )}
    </Card>
  );
}
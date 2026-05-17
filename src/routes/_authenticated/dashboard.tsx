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
          <h1 className="text-3xl font-bold tracking-tight">Your study library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every note you've scanned, ready to revise.
          </p>
        </div>
        <Link to="/upload">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" /> New upload
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label="Total notes" value={notes?.length ?? 0} loading={isLoading} />
        <StatCard icon={Folder} label="Subjects" value={subjects} loading={isLoading} />
        <StatCard
          icon={Sparkles}
          label="Processing"
          value={notes?.filter((n) => n.status === "processing").length ?? 0}
          loading={isLoading}
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
                  <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
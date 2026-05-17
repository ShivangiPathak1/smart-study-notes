import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getNote, deleteNote } from "@/lib/notes.functions";
import { FlashcardsView } from "@/components/notes/flashcards-view";
import { QuizView } from "@/components/notes/quiz-view";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Flashcard, QuizQuestion } from "@/types/notes";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  component: NoteDetail,
});

function NoteDetail() {
  const { id } = Route.useParams();
  const fetchNote = useServerFn(getNote);
  const removeNote = useServerFn(deleteNote);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: () => fetchNote({ data: { id } }),
    refetchInterval: (q) => {
      const data = q.state.data as { status?: string } | undefined;
      return data?.status === "processing" ? 3000 : false;
    },
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const download = (text: string, name: string) => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await removeNote({ data: { id } });
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Deleted");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!note) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Note not found.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
        </Link>
      </main>
    );
  }

  const processing = note.status === "processing";
  const failed = note.status === "failed";
  const flashcards = (note.flashcards as unknown as Flashcard[] | null) ?? [];
  const quiz = (note.quiz as unknown as QuizQuestion[] | null) ?? [];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Link to="/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
        </Button>
      </Link>

      <div className="relative mt-2 flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-hero opacity-20 blur-3xl" />
        <div>
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-gradient-hero text-white">{note.subject || "General"}</Badge>
            {processing && (
              <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing
              </Badge>
            )}
            {failed && <Badge variant="destructive">Failed</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            <span className="text-gradient-hero">{note.title}</span>
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      {processing && (
        <Card className="mt-6 flex items-center gap-3 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">Generating your study material…</p>
            <p className="text-xs text-muted-foreground">
              OCR, clean notes, summary, flashcards & quiz. Usually 10–30 seconds.
            </p>
          </div>
        </Card>
      )}

      {failed && (
        <Card className="mt-6 border-destructive/40 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">Processing failed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {note.error_message || "Something went wrong. Try uploading again."}
          </p>
        </Card>
      )}

      {!processing && !failed && (
        <Tabs defaultValue="clean" className="mt-6">
          <TabsList className="flex flex-wrap bg-muted/60 p-1">
            <TabsTrigger value="clean">Clean notes</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="original">Original</TabsTrigger>
          </TabsList>

          <TabsContent value="clean" className="mt-4">
            <Card className="p-6">
              <ActionsBar
                onCopy={() => copy(note.clean_notes || "")}
                onDownload={() => download(note.clean_notes || "", `${note.title}.md`)}
              />
              <article className="prose-notes mt-4 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.clean_notes || "*No content*"}
                </ReactMarkdown>
              </article>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <Card className="relative overflow-hidden p-6">
              <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-gradient-warm opacity-15 blur-3xl" />
              <ActionsBar
                onCopy={() => copy(note.summary || "")}
                onDownload={() => download(note.summary || "", `${note.title}-summary.md`)}
              />
              <article className="prose-notes mt-4 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.summary || "*No summary*"}
                </ReactMarkdown>
              </article>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="mt-4">
            <FlashcardsView cards={flashcards} />
          </TabsContent>

          <TabsContent value="quiz" className="mt-4">
            <QuizView questions={quiz} />
          </TabsContent>

          <TabsContent value="original" className="mt-4">
            <Card className="p-6">
              <ActionsBar
                onCopy={() => copy(note.original_text || "")}
                onDownload={() => download(note.original_text || "", `${note.title}-raw.txt`)}
              />
              <pre className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                {note.original_text || "No text extracted"}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}

function ActionsBar({
  onCopy,
  onDownload,
}: {
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCopy}>
        <Copy className="mr-2 h-3 w-3" /> Copy
      </Button>
      <Button variant="ghost" size="sm" onClick={onDownload}>
        <Download className="mr-2 h-3 w-3" /> Download
      </Button>
    </div>
  );
}
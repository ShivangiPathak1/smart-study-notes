import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileImage, FileText, Loader2, Upload as UploadIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { createNoteFromUpload, processNote } from "@/lib/notes.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

const MAX_SIZE = 15 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];

function UploadPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createNote = useServerFn(createNoteFromUpload);
  const process = useServerFn(processNote);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF allowed");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("Max file size is 15 MB");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setBusy(true);
    setProgress(15);

    try {
      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("notes-files")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setProgress(45);

      const note = await createNote({
        data: {
          title: title.trim() || "Untitled",
          subject: subject.trim() || "General",
          filePath,
        },
      });
      setProgress(60);

      toast.success("Uploaded — generating study material…");
      qc.invalidateQueries({ queryKey: ["notes"] });
      // Kick off processing (fire and navigate immediately)
      process({ data: { id: note.id } })
        .then(() => {
          toast.success("Notes ready!");
          qc.invalidateQueries({ queryKey: ["notes"] });
          qc.invalidateQueries({ queryKey: ["note", note.id] });
        })
        .catch((err) => {
          toast.error(err?.message || "AI processing failed");
          qc.invalidateQueries({ queryKey: ["notes"] });
          qc.invalidateQueries({ queryKey: ["note", note.id] });
        });
      setProgress(100);
      navigate({ to: "/notes/$id", params: { id: note.id } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <h1 className="text-3xl font-bold tracking-tight">New upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo, screenshot, or PDF of your notes.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <Card
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "border-2 border-dashed p-8 transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            {file ? (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {file.type === "application/pdf" ? (
                    <FileText className="h-6 w-6" />
                  ) : (
                    <FileImage className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadIcon className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-medium">
                  Drop a file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, WEBP or PDF — up to 15 MB
                </p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  On mobile this opens your camera too
                </p>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cell Biology — Lecture 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology"
              />
            </div>
          </div>

          {busy && progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {progress < 100 ? "Uploading…" : "Almost there…"}
              </p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={!file || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busy ? "Processing…" : "Scan & generate"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
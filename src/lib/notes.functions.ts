import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";

const BUCKET = "notes-files";

/* -------------- List / Get / Delete -------------- */

export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // remove file too
    const { data: row } = await supabase
      .from("notes")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (row?.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
    }
    const { error } = await supabase.from("notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, userId };
  });

/* -------------- Create note placeholder -------------- */

export const createNoteFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; subject: string; filePath: string }) =>
    z
      .object({
        title: z.string().min(1).max(200),
        subject: z.string().min(1).max(80),
        filePath: z.string().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Validate user owns this path
    if (!data.filePath.startsWith(`${userId}/`)) {
      throw new Error("Invalid file path");
    }
    const { data: row, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: data.title,
        subject: data.subject,
        file_path: data.filePath,
        status: "processing",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* -------------- AI Processing -------------- */

const AiOutputSchema = z.object({
  title: z.string().default("Untitled Notes"),
  subject: z.string().default("General"),
  originalText: z.string().default(""),
  cleanNotes: z.string().default(""),
  summary: z.string().default(""),
  flashcards: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .max(12)
    .default([]),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        choices: z.array(z.string()).min(2).max(6),
        correctIndex: z.number().int().min(0).max(5),
        explanation: z.string().optional(),
      }),
    )
    .max(10)
    .default([]),
});

export const processNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable");

    const { data: row, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) throw new Error("Note not found");
    if (row.user_id !== userId) throw new Error("Forbidden");
    if (!row.file_path) throw new Error("No file attached");

    // Signed URL via admin so AI gateway can fetch it
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.file_path, 60 * 10);
    if (sErr || !signed?.signedUrl) throw new Error("Could not access file");

    const isPdf = row.file_path.toLowerCase().endsWith(".pdf");

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-2.5-flash");

      const prompt = `You are an expert academic note-processing assistant. Analyze the attached ${
        isPdf ? "PDF document" : "image of student notes (handwritten, whiteboard, or screenshot)"
      } and produce structured study material.

Rules:
- Use clear OCR — preserve every legible word in originalText.
- cleanNotes must be valid markdown with # / ## headings, bullet points, bold key terms.
- summary should be 3-6 short paragraphs of exam-revision notes.
- Generate 8-10 flashcards covering the most important concepts.
- Generate 6-10 multiple-choice quiz questions with exactly 4 choices each; correctIndex is 0-based.
- title: short and descriptive. subject: 1-3 words (e.g. "Biology", "Linear Algebra").`;

      const { experimental_output: output } = await generateText({
        model,
        experimental_output: Output.object({ schema: AiOutputSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              isPdf
                ? {
                    type: "file",
                    data: new URL(signed.signedUrl),
                    mediaType: "application/pdf",
                  }
                : { type: "image", image: new URL(signed.signedUrl) },
            ],
          },
        ],
      });

      const update = {
        title: output.title || row.title,
        subject: output.subject || row.subject,
        original_text: output.originalText,
        clean_notes: output.cleanNotes,
        summary: output.summary,
        flashcards: output.flashcards,
        quiz: output.quiz,
        status: "ready" as const,
        error_message: null,
      };

      const { data: updated, error: updErr } = await supabase
        .from("notes")
        .update(update)
        .eq("id", data.id)
        .select()
        .single();
      if (updErr) throw new Error(updErr.message);
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Processing failed";
      await supabase
        .from("notes")
        .update({ status: "failed", error_message: message })
        .eq("id", data.id);
      throw new Error(message);
    }
  });

/* -------------- Profile -------------- */

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) =>
    z.object({ name: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ name: data.name })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
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
  title: z.string(),
  subject: z.string(),
  originalText: z.string(),
  cleanNotes: z.string(),
  summary: z.string(),
  flashcards: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        choices: z.array(z.string()),
        correctIndex: z.number(),
        explanation: z.string(),
      }),
    ),
});

const LooseAiOutputSchema = z
  .object({
    title: z.unknown().optional(),
    subject: z.unknown().optional(),
    originalText: z.unknown().optional(),
    cleanNotes: z.unknown().optional(),
    summary: z.unknown().optional(),
    flashcards: z.unknown().optional(),
    quiz: z.unknown().optional(),
  })
  .passthrough();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const fallbackString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const normalizeAiOutput = (value: unknown, row: { title: string; subject: string | null }) => {
  const parsed = LooseAiOutputSchema.parse(value);
  const flashcards = (Array.isArray(parsed.flashcards) ? parsed.flashcards : [])
    .map(asRecord)
    .filter((card): card is Record<string, unknown> => Boolean(card))
    .filter((card) => typeof card.question === "string" && typeof card.answer === "string")
    .slice(0, 12)
    .map((card) => ({
      question: fallbackString(card.question, "Question"),
      answer: fallbackString(card.answer, "Answer"),
    }));
  const quiz = (Array.isArray(parsed.quiz) ? parsed.quiz : [])
    .map(asRecord)
    .filter((question): question is Record<string, unknown> => Boolean(question))
    .filter((question) => typeof question.question === "string" && Array.isArray(question.choices))
    .slice(0, 10)
    .map((question) => {
      const choices = (question.choices as unknown[])
        .filter((choice): choice is string => typeof choice === "string" && Boolean(choice.trim()))
        .slice(0, 4);
      const rawIndex = typeof question.correctIndex === "number" && Number.isFinite(question.correctIndex)
        ? Math.trunc(question.correctIndex)
        : 0;
      return {
        question: fallbackString(question.question, "Question"),
        choices,
        correctIndex: Math.min(Math.max(rawIndex, 0), Math.max(choices.length - 1, 0)),
        explanation: fallbackString(
          question.explanation,
          "Review the related section in the generated notes.",
        ),
      };
    })
    .filter((question) => question.choices.length >= 2);

  return {
    title: fallbackString(parsed.title, row.title || "Untitled Notes"),
    subject: fallbackString(parsed.subject, row.subject || "General"),
    originalText: fallbackString(parsed.originalText, ""),
    cleanNotes: fallbackString(
      parsed.cleanNotes,
      "# Notes\n\n> **Overview:** The uploaded material could not be fully structured. Try a clearer image or a shorter PDF.",
    ),
    summary: fallbackString(
      parsed.summary,
      "The uploaded material could not be fully read. Try uploading a clearer image or a shorter PDF.",
    ),
    flashcards,
    quiz,
  };
};

const extractJsonFromResponse = (response: string) => {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI did not return structured notes. Try a clearer image.");
  }
  cleaned = cleaned
    .slice(start, end + 1)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return JSON.parse(cleaned);
};

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
      } and return ONLY a JSON object (no prose, no markdown fences) with this exact shape:
{
  "title": string,
  "subject": string,
  "originalText": string,
  "cleanNotes": string,
  "summary": string,
  "flashcards": [{ "question": string, "answer": string }],
  "quiz": [{ "question": string, "choices": [string, string, string, string], "correctIndex": 0-3, "explanation": string }]
}

Rules:
- OCR carefully; preserve every legible word in originalText.
- cleanNotes MUST be richly structured GitHub-Flavored Markdown with CLEAR LOGICAL SECTIONS. Required structure:
    1. Start with a single "# <Topic Title>" H1.
    2. Then a short "> **Overview:** ..." blockquote (2–3 sentences).
    3. Then a "## Key Concepts" section as a bullet list of **bold term** — definition.
    4. Then 2–5 "## <Section Name>" H2 sections grouped by logical theme (one per major idea / sub-topic) — inside each, use "### Sub-heading" where helpful, bullet lists, numbered steps for processes, and **bold** for key terms.
    5. Where useful, include a markdown table (e.g. comparisons, properties, formulas) and/or fenced code blocks for equations or code.
    6. Use "> **Example:** ..." or "> **Note:** ..." blockquote callouts for examples, warnings, and tips.
    7. Separate top-level "##" sections with a "---" horizontal rule.
    8. End with a "## Takeaways" section of 3–6 concise bullet points.
- summary: 3–6 short paragraphs of exam-revision notes, plain prose (no headings).
- Generate 6-10 flashcards covering the most important concepts.
- Generate 5-8 multiple-choice quiz questions with exactly 4 choices each; correctIndex is 0-based and must point to one of the choices.
- title: short and descriptive. subject: 1-3 words (e.g. "Biology", "Linear Algebra").
- If the document is unreadable, still return valid JSON with empty arrays and a note in summary.`;

      const messages = [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: prompt },
            isPdf
              ? {
                  type: "file" as const,
                  data: new URL(signed.signedUrl),
                  mediaType: "application/pdf",
                }
              : { type: "image" as const, image: new URL(signed.signedUrl) },
          ],
        },
      ];

      let output: z.infer<typeof AiOutputSchema>;
      try {
        const res = await generateText({
          model,
          experimental_output: Output.object({ schema: AiOutputSchema }),
          messages,
        });
        output = res.experimental_output;
      } catch (structuredErr) {
        console.warn("[processNote] structured output failed, falling back to JSON parse:", structuredErr);
        const res = await generateText({ model, messages });
        const raw = res.text ?? "";
        const cleaned = raw
          .replace(/^```json\s*/im, "")
          .replace(/^```\s*/im, "")
          .replace(/```\s*$/im, "")
          .trim();
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start === -1 || end <= start) {
          throw new Error("AI did not return readable structured notes. Try a clearer image.");
        }
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        output = AiOutputSchema.parse(parsed);
      }

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
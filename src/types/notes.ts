export type Flashcard = { question: string; answer: string };
export type QuizQuestion = {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  original_text: string | null;
  clean_notes: string | null;
  summary: string | null;
  flashcards: Flashcard[] | null;
  quiz: QuizQuestion[] | null;
  file_url: string | null;
  file_path: string | null;
  status: "processing" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
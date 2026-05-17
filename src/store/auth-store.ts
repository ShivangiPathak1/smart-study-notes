import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setSession: (s: Session | null) => void;
  setInitialized: (b: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  setSession: (s) => set({ session: s, user: s?.user ?? null }),
  setInitialized: (b) => set({ initialized: b }),
}));
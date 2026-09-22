import type { User } from "@supabase/supabase-js";
import type { Profile, UserRole } from "./database";

export type { UserRole };

export interface SessionState {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthErrorResponse {
  message: string;
  code?: string;
  status?: number;
}

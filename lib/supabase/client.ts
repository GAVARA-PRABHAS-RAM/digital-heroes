import { createBrowserClient } from "@supabase/ssr";

/**
 * Checks whether valid Supabase public credentials are provided.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && !url.includes("placeholder"));
}

/**
 * Creates a Supabase client for use in browser / client components.
 * Fallbacks to placeholder credentials if environment variables are not yet provided,
 * preventing static site generation and build steps from crashing.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  if (!isSupabaseConfigured() && typeof window !== "undefined") {
    console.warn(
      "[Digital Heroes] Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

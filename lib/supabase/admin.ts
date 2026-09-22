import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates an administrative Supabase client using the service role key.
 * 
 * SECURITY WARNING:
 * - This client bypasses Row Level Security (RLS).
 * - It MUST NEVER be imported or used in client components or exposed to the browser.
 * - Enforces server-only execution.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("CRITICAL SECURITY VIOLATION: createAdminClient called in client-side context.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn(
      "[Digital Heroes] SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations will not function until configured."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey || "placeholder-service-role-key", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

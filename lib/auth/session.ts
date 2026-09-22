import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export interface AuthenticatedUser {
  user: User;
  profile: Profile | null;
  role: "subscriber" | "admin";
}

function handleControlFlowError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  if (digest === "DYNAMIC_SERVER_USAGE" || digest?.startsWith("NEXT_REDIRECT")) {
    throw error;
  }
}

/**
 * Retrieves the current authenticated user from Supabase Auth (server-side).
 * Returns null if Supabase is unconfigured or no active session exists.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    handleControlFlowError(error);
    console.error("Error fetching current user:", error);
    return null;
  }
}

/**
 * Retrieves the current session.
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return null;
    }

    return session;
  } catch (error) {
    handleControlFlowError(error);
    console.error("Error fetching session:", error);
    return null;
  }
}

/**
 * Retrieves the current user along with their database profile and role.
 * If the profile row was not yet created, automatically provisions a subscriber profile.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabase = createClient();
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Fallback: If trigger did not run, securely create the default subscriber profile
    if (!profile && !error) {
      const newProfile = {
        id: user.id,
        email: user.email || "",
        full_name: (user.user_metadata?.full_name as string) || null,
        role: "subscriber" as const,
      };

      const { data: inserted } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .maybeSingle();

      profile = inserted || newProfile;
    }

    const role = (profile?.role === "admin" ? "admin" : "subscriber") as "subscriber" | "admin";

    return {
      user,
      profile: profile as Profile | null,
      role,
    };
  } catch (error) {
    handleControlFlowError(error);
    console.error("Error fetching user profile:", error);
    return {
      user,
      profile: null,
      role: "subscriber",
    };
  }
}

/**
 * Guard: Requires an authenticated user session.
 * Redirects to /login if unauthenticated.
 */
export async function requireAuth(redirectTo = "/login"): Promise<AuthenticatedUser> {
  const auth = await getAuthenticatedUser();
  if (!auth || !auth.user) {
    redirect(redirectTo);
  }
  return auth;
}

/**
 * Guard: Requires an authenticated user with the administrator role.
 * Redirects to /dashboard (or custom path) if user is not an admin.
 */
export async function requireAdmin(redirectTo = "/dashboard"): Promise<AuthenticatedUser> {
  const auth = await requireAuth();
  if (auth.role !== "admin") {
    redirect(redirectTo);
  }
  return auth;
}

/**
 * Guard: Requires an authenticated user with an active subscription.
 * Administrators bypass this check so they can manage and inspect features.
 * Non-subscribers and lapsed users are redirected to /subscription.
 */
export async function requireActiveSubscription(
  redirectTo = "/subscription"
): Promise<AuthenticatedUser> {
  const auth = await requireAuth();

  // Administrators bypass subscription requirements
  if (auth.role === "admin") {
    return auth;
  }

  // Check subscription status
  const { hasActiveSubscription } = await import(
    "@/services/subscriptions/subscriptionService"
  );
  const isActive = await hasActiveSubscription(auth.user.id);

  if (!isActive) {
    redirect(redirectTo);
  }

  return auth;
}

/**
 * Server Action Guard: Validates whether an authenticated user has an active subscription.
 * Does not call redirect(), returning a clean boolean for server actions.
 */
export async function verifyActiveSubscription(
  auth: AuthenticatedUser
): Promise<{ allowed: boolean; reason?: string }> {
  if (auth.role === "admin") {
    return { allowed: true };
  }

  const { hasActiveSubscription } = await import(
    "@/services/subscriptions/subscriptionService"
  );
  const isActive = await hasActiveSubscription(auth.user.id);

  if (!isActive) {
    return {
      allowed: false,
      reason:
        "An active subscription is required to perform this action. Please subscribe or renew your membership.",
    };
  }

  return { allowed: true };
}


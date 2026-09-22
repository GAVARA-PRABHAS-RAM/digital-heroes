import { createClient as createServerClient } from "@/lib/supabase/server";
import { userCharitySchema } from "@/lib/validations/charity";
import type { Charity, CharityEvent, UserCharity } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CharityWithEvents extends Charity {
  charity_events?: CharityEvent[];
}

export interface UserCharitySelection {
  userCharity: UserCharity;
  charity: Charity;
}

function getClient(client?: SupabaseClient) {
  return client || createServerClient();
}

/**
 * Retrieves all active partner charities with their upcoming events.
 */
export async function getActiveCharities(
  client?: SupabaseClient
): Promise<CharityWithEvents[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("charities")
    .select("*, charity_events(*)")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching active charities:", error);
    return [];
  }

  return (data as CharityWithEvents[]) || [];
}

/**
 * Retrieves the currently selected charity and allocation percentage for a subscriber.
 */
export async function getUserCharity(
  userId: string,
  client?: SupabaseClient
): Promise<UserCharitySelection | null> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("user_charities")
    .select("*, charity:charities(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user charity selection:", error);
    return null;
  }

  if (!data || !data.charity) {
    return null;
  }

  return {
    userCharity: {
      id: data.id,
      user_id: data.user_id,
      charity_id: data.charity_id,
      contribution_percentage: data.contribution_percentage,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    charity: data.charity as Charity,
  };
}

/**
 * Updates or sets the subscriber's chosen charity and contribution percentage (min 10%).
 */
export async function setUserCharity(
  userId: string,
  input: { charityId: string; contributionPercentage: number },
  client?: SupabaseClient
): Promise<{ success: boolean; userCharity?: UserCharity; error?: string }> {
  const supabase = getClient(client);

  // 1. Validate inputs (enforcing min 10% strictly)
  const validation = userCharitySchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid charity selection input",
    };
  }

  const { charityId, contributionPercentage } = validation.data;

  // 2. Verify the charity is active
  const { data: charity, error: charityError } = await supabase
    .from("charities")
    .select("id, active")
    .eq("id", charityId)
    .maybeSingle();

  if (charityError || !charity || !charity.active) {
    return {
      success: false,
      error: "Selected charity is currently unavailable or inactive.",
    };
  }

  // 3. Check for existing selection
  const { data: existing, error: existingError } = await supabase
    .from("user_charities")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing user charity:", existingError);
    return { success: false, error: "Failed to verify existing charity selection." };
  }

  if (existing) {
    // Update existing row
    const { data: updated, error: updateError } = await supabase
      .from("user_charities")
      .update({
        charity_id: charityId,
        contribution_percentage: contributionPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user charity:", updateError);
      return { success: false, error: updateError.message || "Failed to update charity selection." };
    }

    return { success: true, userCharity: updated as UserCharity };
  } else {
    // Insert new selection
    const { data: inserted, error: insertError } = await supabase
      .from("user_charities")
      .insert({
        user_id: userId,
        charity_id: charityId,
        contribution_percentage: contributionPercentage,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting user charity:", insertError);
      return { success: false, error: insertError.message || "Failed to save charity selection." };
    }

    return { success: true, userCharity: inserted as UserCharity };
  }
}

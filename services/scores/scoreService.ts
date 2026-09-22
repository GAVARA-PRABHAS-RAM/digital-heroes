import { createClient as createServerClient } from "@/lib/supabase/server";
import { scoreInputSchema, scoreUpdateSchema } from "@/lib/validations/scores";
import type { Score } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScoreStats {
  count: number;
  average: number | null;
  best: number | null;
  scores: Score[];
}

function getClient(client?: SupabaseClient) {
  return client || createServerClient();
}

/**
 * Retrieves the rolling scores for a user, ordered by date descending (newest first).
 */
export async function getUserScores(
  userId: string,
  client?: SupabaseClient
): Promise<Score[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user scores:", error);
    return [];
  }

  return (data as Score[]) || [];
}

/**
 * Computes summary statistics (count up to 5, average, best) for a user's recent scores.
 */
export async function getScoreStats(
  userId: string,
  client?: SupabaseClient
): Promise<ScoreStats> {
  const scores = await getUserScores(userId, client);

  if (!scores.length) {
    return {
      count: 0,
      average: null,
      best: null,
      scores: [],
    };
  }

  const count = scores.length;
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const average = Number((total / count).toFixed(1));
  const best = Math.max(...scores.map((s) => s.score));

  return {
    count,
    average,
    best,
    scores,
  };
}

/**
 * Submits a new Stableford score (1-45), enforces unique date per user,
 * and maintains the rolling 5-score retention window by pruning older scores.
 */
export async function submitScore(
  userId: string,
  input: { score: number; score_date: string },
  client?: SupabaseClient
): Promise<{ success: boolean; score?: Score; error?: string }> {
  const supabase = getClient(client);

  // 1. Validate inputs
  const validation = scoreInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid score input",
    };
  }

  const { score, score_date } = validation.data;

  // 2. Prevent duplicate date for the same user
  const { data: existing, error: checkError } = await supabase
    .from("scores")
    .select("id")
    .eq("user_id", userId)
    .eq("score_date", score_date)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing score date:", checkError);
    return { success: false, error: "Failed to verify score date. Please try again." };
  }

  if (existing) {
    return {
      success: false,
      error: "A score has already been logged for this date. Please choose a different date or edit the existing round.",
    };
  }

  // 3. Insert the new score
  const { data: inserted, error: insertError } = await supabase
    .from("scores")
    .insert({
      user_id: userId,
      score,
      score_date,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting score:", insertError);
    return {
      success: false,
      error: insertError.message || "Failed to record score. Please try again.",
    };
  }

  // 4. Automatic 5-score rolling retention:
  // Fetch all scores for this user sorted newest first (score_date DESC, created_at DESC)
  // Prune any scores beyond the top 5
  const { data: allScores, error: listError } = await supabase
    .from("scores")
    .select("id, score_date, created_at")
    .eq("user_id", userId)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!listError && allScores && allScores.length > 5) {
    const scoresToPrune = allScores.slice(5).map((s) => s.id);
    if (scoresToPrune.length > 0) {
      const { error: pruneError } = await supabase
        .from("scores")
        .delete()
        .in("id", scoresToPrune);

      if (pruneError) {
        console.warn("Notice: prune of rolling scores exceeded threshold:", pruneError);
      }
    }
  }

  return {
    success: true,
    score: inserted as Score,
  };
}

/**
 * Updates an existing score entry with a new Stableford score (1-45).
 */
export async function updateScore(
  userId: string,
  scoreId: string,
  newScore: number,
  client?: SupabaseClient
): Promise<{ success: boolean; score?: Score; error?: string }> {
  const supabase = getClient(client);

  const validation = scoreUpdateSchema.safeParse({ score: newScore });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid score",
    };
  }

  const { data: updated, error } = await supabase
    .from("scores")
    .update({
      score: validation.data.score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scoreId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating score:", error);
    return { success: false, error: error.message || "Failed to update score." };
  }

  return {
    success: true,
    score: updated as Score,
  };
}

/**
 * Deletes a score entry belonging to the user.
 */
export async function deleteScore(
  userId: string,
  scoreId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient(client);

  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("id", scoreId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting score:", error);
    return { success: false, error: error.message || "Failed to delete score." };
  }

  return { success: true };
}

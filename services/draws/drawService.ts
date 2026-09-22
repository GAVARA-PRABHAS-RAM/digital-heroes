import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateRandomNumbers, generateAlgorithmicNumbers } from "@/lib/draw/numberGenerator";
import { matchAllParticipants, matchSingleTicket } from "@/lib/draw/matching";
import { calculatePrizeDistribution, type PrizeCalculationResult } from "@/lib/draw/prizeCalculator";
import { transformScoresToDrawNumbers } from "@/lib/draw/scoreToNumbers";
import type { Draw, DrawEntry, Winner, Prize, Score } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserWinningWithDetails extends Winner {
  draw?: Draw;
  prize?: Prize;
}

export interface UserEntryWithDraw extends DrawEntry {
  draw?: Draw;
  matchedNumbers?: number[];
  matchCount?: number;
  tier?: number | null;
}

export interface DrawFullDetails extends Draw {
  winning_numbers?: number[];
  prizes?: Prize[];
  draw_results?: { winning_numbers: number[]; generated_by: string }[];
  draw_entries?: DrawEntry[];
  winners?: (Winner & { profile?: { full_name: string; email: string } })[];
}

function getClient(client?: SupabaseClient) {
  return client || createServerClient();
}

/**
 * Retrieves all draws ordered by month descending.
 */
export async function getAllDraws(client?: SupabaseClient): Promise<DrawFullDetails[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("draws")
    .select("*, prizes(*), draw_results(*)")
    .order("draw_month", { ascending: false });

  if (error) {
    console.error("Error fetching all draws:", error);
    return [];
  }

  // Ensure winning_numbers is populated from draw_results if column is null
  return (data || []).map((d) => ({
    ...d,
    winning_numbers:
      d.winning_numbers || (d.draw_results && d.draw_results[0]?.winning_numbers) || null,
  })) as DrawFullDetails[];
}

/**
 * Retrieves a single draw with all related prizes, results, and entries.
 * Redacts unpublished winning numbers and prize calculations for non-admin viewers.
 */
export async function getDrawWithDetails(
  drawId: string,
  client?: SupabaseClient,
  options?: { isAdmin?: boolean }
): Promise<DrawFullDetails | null> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("draws")
    .select("*, prizes(*), draw_results(*), draw_entries(*), winners(*, profile:profiles(full_name, email))")
    .eq("id", drawId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching draw details:", error);
    return null;
  }

  const isPublished = data.status === "published" || data.status === "completed";
  const isAdmin = options?.isAdmin === true;

  const winningNumbers =
    (isPublished || isAdmin)
      ? data.winning_numbers || (data.draw_results && data.draw_results[0]?.winning_numbers) || null
      : null;

  return {
    ...data,
    winning_numbers: winningNumbers,
    draw_results: isPublished || isAdmin ? data.draw_results || [] : [],
    prizes: isPublished || isAdmin ? data.prizes || [] : [],
    winners: isPublished || isAdmin ? data.winners || [] : [],
  } as DrawFullDetails;
}

/**
 * Retrieves the upcoming or active draw.
 * Priority: Earliest upcoming draw open for entries (status: 'draft' or 'simulated').
 * If no draft/simulated draw exists, returns null.
 *
 * Information Security:
 * For non-admin callers, simulated winning numbers, draw results, and prize pool
 * distributions are strictly redacted to prevent leaking unpublished results.
 */
export async function getUpcomingDraw(
  client?: SupabaseClient,
  options?: { isAdmin?: boolean }
): Promise<DrawFullDetails | null> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("draws")
    .select("*, prizes(*), draw_results(*)")
    .in("status", ["draft", "simulated"])
    .order("draw_month", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const isPublished = data.status === "published" || data.status === "completed";
  const isAdmin = options?.isAdmin === true;

  return {
    ...data,
    winning_numbers:
      (isPublished || isAdmin)
        ? data.winning_numbers || (data.draw_results && data.draw_results[0]?.winning_numbers) || null
        : null,
    draw_results: isPublished || isAdmin ? data.draw_results || [] : [],
    prizes: isPublished || isAdmin ? data.prizes || [] : [],
  } as DrawFullDetails;
}

/**
 * Retrieves all published or completed draws.
 */
export async function getPublishedDraws(client?: SupabaseClient): Promise<DrawFullDetails[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("draws")
    .select("*, prizes(*), draw_results(*)")
    .in("status", ["published", "completed"])
    .order("draw_month", { ascending: false });

  if (error) {
    console.error("Error fetching published draws:", error);
    return [];
  }

  return (data || []).map((d) => ({
    ...d,
    winning_numbers:
      d.winning_numbers || (d.draw_results && d.draw_results[0]?.winning_numbers) || null,
  })) as DrawFullDetails[];
}

/**
 * Retrieves draw tickets allocated to the user, with matching calculations if the draw is published.
 */
export async function getUserDrawEntries(
  userId: string,
  client?: SupabaseClient
): Promise<UserEntryWithDraw[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("draw_entries")
    .select("*, draw:draws(*, draw_results(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching user draw entries:", error);
    return [];
  }

  return data.map((entry) => {
    const draw = entry.draw as (Draw & { draw_results?: { winning_numbers: number[] }[]; winning_numbers?: number[] }) | undefined;
    let matchedNumbers: number[] = [];
    let matchCount = 0;
    let tier: number | null = null;

    if (draw && (draw.status === "published" || draw.status === "completed")) {
      const winningNums =
        draw.winning_numbers || (draw.draw_results && draw.draw_results[0]?.winning_numbers);
      if (winningNums && winningNums.length === 5) {
        const matchRes = matchSingleTicket(
          { userId, numbers: entry.numbers, entryId: entry.id },
          winningNums
        );
        matchedNumbers = matchRes.matchedNumbers;
        matchCount = matchRes.matchCount;
        tier = matchRes.tier;
      }
    } else if (draw) {
      // SECURITY: Redact unpublished winning numbers and draw results from non-published draws
      draw.winning_numbers = undefined;
      if (draw.draw_results) {
        draw.draw_results = [];
      }
    }

    return {
      ...entry,
      matchedNumbers,
      matchCount,
      tier,
    };
  }) as UserEntryWithDraw[];
}

/**
 * Retrieves prizes won by the user in published draws.
 */
export async function getUserWinnings(
  userId: string,
  client?: SupabaseClient
): Promise<UserWinningWithDetails[]> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("winners")
    .select("*, draw:draws!inner(*), prize:prizes(*)")
    .eq("user_id", userId)
    .in("draw.status", ["published", "completed"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user winnings:", error);
    return [];
  }

  return (data as UserWinningWithDetails[]) || [];
}

/**
 * Finds previous rollover amount from the most recent prior draw.
 */
export async function getPreviousDrawRollover(
  drawMonth: string,
  client?: SupabaseClient
): Promise<number> {
  const supabase = getClient(client);

  const { data } = await supabase
    .from("prizes")
    .select("rollover_amount, draw:draws(draw_month)")
    .eq("tier", 5)
    .lt("draw.draw_month", drawMonth)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.rollover_amount ? Number(data.rollover_amount) : 0.0;
}

/**
 * Allows an eligible subscriber to enter a draw using their latest Stableford scores.
 */
export async function enterDrawWithLatestScores(
  userId: string,
  drawId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; entry?: DrawEntry; error?: string }> {
  const supabase = getClient(client);

  // 1. Verify draw exists and is open for entries (draft or simulated, not published)
  const { data: draw, error: drawErr } = await supabase
    .from("draws")
    .select("id, status, draw_month")
    .eq("id", drawId)
    .maybeSingle();

  if (drawErr || !draw) {
    return { success: false, error: "Draw not found" };
  }

  if (draw.status === "published" || draw.status === "completed") {
    return { success: false, error: "This draw is already published and closed to new entries." };
  }

  // 2. Prevent duplicate entries
  const { data: existing } = await supabase
    .from("draw_entries")
    .select("id")
    .eq("draw_id", drawId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "You already have an active ticket entered for this monthly draw." };
  }

  // 3. Retrieve user's latest Stableford scores
  const { data: scores, error: scoreErr } = await supabase
    .from("scores")
    .select("id, score, score_date")
    .eq("user_id", userId)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (scoreErr) {
    return { success: false, error: "Failed to retrieve your score history." };
  }

  if (!scores || scores.length === 0) {
    return {
      success: false,
      error: "You must record at least one Stableford score before entering a monthly draw.",
    };
  }

  // 4. Transform scores to 5 unique draw numbers (1 to 45)
  const seed = `${drawId}-${userId}`;
  const transformed = transformScoresToDrawNumbers(scores, seed);

  // 5. Insert draw entry with immutable score snapshot
  const insertPayload: Record<string, any> = {
    draw_id: drawId,
    user_id: userId,
    numbers: transformed.numbers,
  };

  // Include snapshot if column is present
  try {
    insertPayload.score_snapshot = transformed.snapshot;
  } catch {
    // Ignore if not supported
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("draw_entries")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) {
    console.error("Error inserting draw entry:", insertErr);
    // If score_snapshot column failed, retry without it
    if (insertErr.message?.includes("score_snapshot")) {
      const { data: retryData, error: retryErr } = await supabase
        .from("draw_entries")
        .insert({
          draw_id: drawId,
          user_id: userId,
          numbers: transformed.numbers,
        })
        .select()
        .single();

      if (retryErr) return { success: false, error: retryErr.message };
      return { success: true, entry: retryData as DrawEntry };
    }
    return { success: false, error: insertErr.message || "Failed to enter draw." };
  }

  return { success: true, entry: inserted as DrawEntry };
}

/**
 * Admin: Create a new draft draw.
 */
export async function createDraw(
  input: {
    draw_month: string;
    draw_type: "random" | "algorithmic";
    draw_number?: string;
    prize_pool_percentage?: number;
  },
  client?: SupabaseClient
): Promise<{ success: boolean; draw?: Draw; error?: string }> {
  const supabase = getClient(client);

  const prevRollover = await getPreviousDrawRollover(input.draw_month, supabase);
  const drawNumber =
    input.draw_number ||
    `DH-${input.draw_month.replace(/-/g, "").slice(0, 6)}`;

  const drawPayload: Record<string, any> = {
    draw_month: input.draw_month,
    draw_type: input.draw_type,
    status: "draft",
    draw_number: drawNumber,
  };

  // Try optional Stage 4 columns
  try {
    drawPayload.draw_date = input.draw_month;
    drawPayload.prize_pool_percentage = input.prize_pool_percentage || 50.0;
    drawPayload.total_prize_pool = 0.0;
    drawPayload.rollover_amount = prevRollover;
  } catch {
    // Ignore
  }

  let { data, error } = await supabase.from("draws").insert(drawPayload).select().single();

  if (error && error.message?.includes("column")) {
    // Fallback if migration not yet applied
    const fallback = await supabase
      .from("draws")
      .insert({
        draw_month: input.draw_month,
        draw_type: input.draw_type,
        status: "draft",
        draw_number: drawNumber,
      })
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error creating draw:", error);
    return { success: false, error: error.message || "Failed to create draw." };
  }

  return { success: true, draw: data as Draw };
}

export interface SimulationResult {
  drawId: string;
  drawMonth: string;
  drawType: "random" | "algorithmic";
  winningNumbers: number[];
  prizeDistribution: PrizeCalculationResult;
  entriesCount: number;
  matchSummary: {
    tier5Count: number;
    tier4Count: number;
    tier3Count: number;
    nonWinnersCount: number;
  };
  winners: {
    userId: string;
    tier: number;
    numbers: number[];
    matchedNumbers: number[];
    matchCount: number;
    prizeAmount: number;
  }[];
}

/**
 * Admin: Simulates draw number generation, ticket matching, and prize allocation.
 */
export async function simulateDraw(
  drawId: string,
  options: {
    draw_type?: "random" | "algorithmic";
    prize_pool_percentage?: number;
  } = {},
  client?: SupabaseClient
): Promise<{ success: boolean; simulation?: SimulationResult; error?: string }> {
  const supabase = getClient(client);

  // 1. Fetch draw
  const { data: draw, error: dErr } = await supabase
    .from("draws")
    .select("*")
    .eq("id", drawId)
    .single();

  if (dErr || !draw) return { success: false, error: "Draw not found." };
  if (draw.status === "published" || draw.status === "completed") {
    return { success: false, error: "Cannot simulate an already published draw." };
  }

  const drawType = options.draw_type || (draw.draw_type as "random" | "algorithmic") || "random";
  const prizePoolPct = options.prize_pool_percentage || (draw.prize_pool_percentage ? Number(draw.prize_pool_percentage) : 50.0);

  // 2. Fetch all existing entries for this draw
  let { data: entries } = await supabase
    .from("draw_entries")
    .select("id, user_id, numbers")
    .eq("draw_id", drawId);

  entries = entries || [];

  // If no entries exist yet in dev/test, auto-enroll active subscribers with their scores
  if (entries.length === 0) {
    const { data: profiles } = await supabase.from("profiles").select("id");
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        await enterDrawWithLatestScores(p.id, drawId, supabase);
      }
      const { data: refreshed } = await supabase
        .from("draw_entries")
        .select("id, user_id, numbers")
        .eq("draw_id", drawId);
      entries = refreshed || [];
    }
  }

  // 3. Count active subscribers
  const { count: activeSubCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const effectiveSubscriberCount = Math.max(activeSubCount || 0, entries.length, 1);

  // 4. Generate winning numbers
  let winningNumbers: number[];
  if (drawType === "algorithmic") {
    // Query score frequencies from database
    const { data: scores } = await supabase.from("scores").select("score");
    const scoreList = (scores || []).map((s) => s.score);
    const gen = generateAlgorithmicNumbers(scoreList);
    winningNumbers = gen.numbers;
  } else {
    const gen = generateRandomNumbers();
    winningNumbers = gen.numbers;
  }

  // 5. Match tickets
  const matching = matchAllParticipants(entries, winningNumbers);

  // 6. Calculate prize pool and distributions
  const prevRollover = await getPreviousDrawRollover(draw.draw_month, supabase);
  const prizeDist = calculatePrizeDistribution({
    activeSubscribersCount: effectiveSubscriberCount,
    subscriptionPrice: 20.0,
    prizePoolPercentage: prizePoolPct,
    previousRollover: prevRollover,
    winnerCounts: {
      tier5: matching.tier5Winners.length,
      tier4: matching.tier4Winners.length,
      tier3: matching.tier3Winners.length,
    },
  });

  // Prepare winner list with assigned prizes
  const simulationWinners: SimulationResult["winners"] = [
    ...matching.tier5Winners.map((w) => ({
      userId: w.userId,
      tier: 5,
      numbers: w.numbers,
      matchedNumbers: w.matchedNumbers,
      matchCount: w.matchCount,
      prizeAmount: prizeDist.tiers.tier5.amountPerWinner,
    })),
    ...matching.tier4Winners.map((w) => ({
      userId: w.userId,
      tier: 4,
      numbers: w.numbers,
      matchedNumbers: w.matchedNumbers,
      matchCount: w.matchCount,
      prizeAmount: prizeDist.tiers.tier4.amountPerWinner,
    })),
    ...matching.tier3Winners.map((w) => ({
      userId: w.userId,
      tier: 3,
      numbers: w.numbers,
      matchedNumbers: w.matchedNumbers,
      matchCount: w.matchCount,
      prizeAmount: prizeDist.tiers.tier3.amountPerWinner,
    })),
  ];

  // 7. Update draw status to 'simulated'
  const updatePayload: Record<string, any> = {
    status: "simulated",
    draw_type: drawType,
    simulated_at: new Date().toISOString(),
  };

  try {
    updatePayload.winning_numbers = winningNumbers;
    updatePayload.prize_pool_percentage = prizePoolPct;
    updatePayload.total_prize_pool = prizeDist.basePrizePool;
    updatePayload.rollover_amount = prevRollover;
  } catch {
    // Ignore
  }

  await supabase.from("draws").update(updatePayload).eq("id", drawId);

  // Store temporary/simulated draw results in draw_results
  await supabase.from("draw_results").delete().eq("draw_id", drawId);
  await supabase.from("draw_results").insert({
    draw_id: drawId,
    winning_numbers: winningNumbers,
    generated_by: drawType,
  });

  return {
    success: true,
    simulation: {
      drawId,
      drawMonth: draw.draw_month,
      drawType,
      winningNumbers,
      prizeDistribution: prizeDist,
      entriesCount: entries.length,
      matchSummary: {
        tier5Count: matching.tier5Winners.length,
        tier4Count: matching.tier4Winners.length,
        tier3Count: matching.tier3Winners.length,
        nonWinnersCount: matching.nonWinners.length,
      },
      winners: simulationWinners,
    },
  };
}

/**
 * Admin: Publishes a simulated draw, locking numbers, creating immutable prize tiers and winner records.
 */
export async function publishDraw(
  drawId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient(client);

  // 1. Fetch draw
  const { data: draw, error: dErr } = await supabase
    .from("draws")
    .select("*, draw_results(*)")
    .eq("id", drawId)
    .single();

  if (dErr || !draw) return { success: false, error: "Draw not found." };
  if (draw.status === "published" || draw.status === "completed") {
    return { success: false, error: "Draw is already published." };
  }

  const winningNumbers: number[] =
    draw.winning_numbers || (draw.draw_results && draw.draw_results[0]?.winning_numbers);

  if (!winningNumbers || winningNumbers.length !== 5) {
    return { success: false, error: "Please simulate the draw before publishing." };
  }

  // 2. Fetch all entries
  const { data: entries } = await supabase
    .from("draw_entries")
    .select("id, user_id, numbers")
    .eq("draw_id", drawId);

  const validEntries = entries || [];

  // 3. Match participants
  const matching = matchAllParticipants(validEntries, winningNumbers);

  // 4. Calculate final prize distribution
  const { count: activeSubCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const effectiveCount = Math.max(activeSubCount || 0, validEntries.length, 1);
  const prevRollover = await getPreviousDrawRollover(draw.draw_month, supabase);
  const prizePoolPct = draw.prize_pool_percentage ? Number(draw.prize_pool_percentage) : 50.0;

  const prizeDist = calculatePrizeDistribution({
    activeSubscribersCount: effectiveCount,
    subscriptionPrice: 20.0,
    prizePoolPercentage: prizePoolPct,
    previousRollover: prevRollover,
    winnerCounts: {
      tier5: matching.tier5Winners.length,
      tier4: matching.tier4Winners.length,
      tier3: matching.tier3Winners.length,
    },
  });

  // 5. Clean prior prizes/winners for this draw (if re-simulated)
  await supabase.from("winners").delete().eq("draw_id", drawId);
  await supabase.from("prizes").delete().eq("draw_id", drawId);

  // 6. Insert Prizes for Tier 5, 4, 3
  const { data: insertedPrizes, error: prizeErr } = await supabase
    .from("prizes")
    .insert([
      {
        draw_id: drawId,
        tier: 5,
        pool_percentage: 40,
        pool_amount: prizeDist.tiers.tier5.totalPool,
        winner_count: matching.tier5Winners.length,
        amount_per_winner: prizeDist.tiers.tier5.amountPerWinner,
        rollover_amount: prizeDist.tiers.tier5.rolloverForward,
      },
      {
        draw_id: drawId,
        tier: 4,
        pool_percentage: 35,
        pool_amount: prizeDist.tiers.tier4.totalPool,
        winner_count: matching.tier4Winners.length,
        amount_per_winner: prizeDist.tiers.tier4.amountPerWinner,
        rollover_amount: 0,
      },
      {
        draw_id: drawId,
        tier: 3,
        pool_percentage: 25,
        pool_amount: prizeDist.tiers.tier3.totalPool,
        winner_count: matching.tier3Winners.length,
        amount_per_winner: prizeDist.tiers.tier3.amountPerWinner,
        rollover_amount: 0,
      },
    ])
    .select();

  if (prizeErr || !insertedPrizes) {
    console.error("Error creating prize tiers:", prizeErr);
    return { success: false, error: "Failed to persist prize tiers." };
  }

  const prize5 = insertedPrizes.find((p) => p.tier === 5);
  const prize4 = insertedPrizes.find((p) => p.tier === 4);
  const prize3 = insertedPrizes.find((p) => p.tier === 3);

  // 7. Insert Winner records
  const winnersToInsert: any[] = [];

  for (const w of matching.tier5Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.userId,
      prize_id: prize5?.id,
      match_count: 5,
      prize_amount: prizeDist.tiers.tier5.amountPerWinner,
      verification_status: "pending",
      payment_status: "pending",
    });
  }

  for (const w of matching.tier4Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.userId,
      prize_id: prize4?.id,
      match_count: 4,
      prize_amount: prizeDist.tiers.tier4.amountPerWinner,
      verification_status: "pending",
      payment_status: "pending",
    });
  }

  for (const w of matching.tier3Winners) {
    winnersToInsert.push({
      draw_id: drawId,
      user_id: w.userId,
      prize_id: prize3?.id,
      match_count: 3,
      prize_amount: prizeDist.tiers.tier3.amountPerWinner,
      verification_status: "pending",
      payment_status: "pending",
    });
  }

  if (winnersToInsert.length > 0) {
    const { error: winErr } = await supabase.from("winners").insert(winnersToInsert);
    if (winErr) {
      console.error("Error creating winner records:", winErr);
      return { success: false, error: "Failed to persist winners." };
    }
  }

  // 8. Lock draw by updating status to 'published'
  const updatePayload: Record<string, any> = {
    status: "published",
    published_at: new Date().toISOString(),
  };

  try {
    updatePayload.winning_numbers = winningNumbers;
    updatePayload.total_prize_pool = prizeDist.basePrizePool;
    updatePayload.rollover_amount = prevRollover;
  } catch {
    // Ignore
  }

  const { error: pubErr } = await supabase.from("draws").update(updatePayload).eq("id", drawId);
  if (pubErr) {
    return { success: false, error: pubErr.message || "Failed to set draw status to published." };
  }

  return { success: true };
}

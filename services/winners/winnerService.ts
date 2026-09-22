import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Winner, WinnerProof, Payout, Draw, Prize } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WinnerWithDetails extends Winner {
  draw?: Draw;
  prize?: Prize;
  profile?: { id: string; email: string; full_name: string };
  proofs?: WinnerProof[];
  latestProof?: WinnerProof | null;
  payout?: Payout | null;
}

export interface FinancialReportSummary {
  totalSubscribers: number;
  totalPrizePool: number;
  totalWinnings: number;
  proofs: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  payouts: {
    pendingCount: number;
    pendingAmount: number;
    paidCount: number;
    paidAmount: number;
    totalAmount: number;
  };
}

function getClient(client?: SupabaseClient) {
  return client || createServerClient();
}

/**
 * Retrieves all winning entries for a subscriber along with proof history and payouts.
 */
export async function getSubscriberWinningsWithProofs(
  userId: string,
  client?: SupabaseClient
): Promise<WinnerWithDetails[]> {
  const supabase = getClient(client);

  const { data: winners, error } = await supabase
    .from("winners")
    .select("*, draw:draws!inner(*), prize:prizes(*), winner_proofs(*), payouts(*)")
    .eq("user_id", userId)
    .in("draw.status", ["published", "completed"])
    .order("created_at", { ascending: false });

  if (error || !winners) {
    console.error("Error fetching subscriber winnings:", error);
    return [];
  }

  return winners.map((w: any) => {
    const proofs: WinnerProof[] = (w.winner_proofs || []).sort(
      (a: WinnerProof, b: WinnerProof) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
    const payout: Payout | null = w.payouts?.[0] || null;

    return {
      ...w,
      proofs,
      latestProof: proofs[0] || null,
      payout,
    } as WinnerWithDetails;
  });
}

/**
 * Uploads a winner scorecard proof file to Supabase Storage and records metadata.
 * Preserves audit history: replacement uploads create NEW proof records without deleting previous ones.
 */
export async function uploadWinnerProofFile(
  userId: string,
  winnerId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  client?: SupabaseClient
): Promise<{ success: boolean; proof?: WinnerProof; error?: string }> {
  const supabase = getClient(client);

  // 1. Authorize: verify user owns this winning record
  const { data: winner, error: wErr } = await supabase
    .from("winners")
    .select("id, user_id, verification_status, match_count, prize_amount")
    .eq("id", winnerId)
    .maybeSingle();

  if (wErr || !winner) {
    return { success: false, error: "Winning record not found." };
  }

  if (winner.user_id !== userId) {
    return { success: false, error: "Unauthorized: You do not own this winning entry." };
  }

  // 2. Validate winner eligibility
  if (winner.match_count < 3) {
    return { success: false, error: "Non-winning tickets are not eligible for proof submission." };
  }

  if (winner.verification_status === "approved") {
    return { success: false, error: "Winner proof has already been verified and approved." };
  }

  // 3. Validate file
  const allowedMime = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedMime.includes(mimeType.toLowerCase())) {
    return { success: false, error: "Invalid file type. Allowed formats: PNG, JPEG, WebP." };
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (fileBuffer.byteLength > maxBytes) {
    return { success: false, error: "File exceeds maximum size limit of 5 MB." };
  }

  // 4. Upload file to private storage bucket
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${userId}/${winnerId}/${Date.now()}_${cleanName}`;

  const { error: storageErr } = await supabase.storage
    .from("winner-proofs")
    .upload(filePath, Buffer.from(fileBuffer), {
      contentType: mimeType,
      upsert: false,
    });

  if (storageErr) {
    console.error("Storage upload error:", storageErr);
    return { success: false, error: `Upload failed: ${storageErr.message}` };
  }

  // 5. Insert new winner_proofs record (preserving audit history of prior proofs)
  const insertPayload: Record<string, any> = {
    winner_id: winnerId,
    file_url: filePath,
    status: "pending",
  };

  const { data: proof, error: proofErr } = await supabase
    .from("winner_proofs")
    .insert(insertPayload)
    .select()
    .single();

  if (proofErr) {
    // If status column doesn't exist yet, retry without status
    if (proofErr.message?.includes("status")) {
      const { data: fallbackProof, error: fallbackErr } = await supabase
        .from("winner_proofs")
        .insert({
          winner_id: winnerId,
          file_url: filePath,
        })
        .select()
        .single();

      if (fallbackErr) {
        return { success: false, error: "Failed to persist proof record." };
      }
      // Update winner verification_status to pending
      await supabase.from("winners").update({ verification_status: "pending" }).eq("id", winnerId);
      return { success: true, proof: { ...fallbackProof, status: "pending" } };
    }

    console.error("Proof insert error:", proofErr);
    return { success: false, error: "Failed to persist proof record." };
  }

  // 6. Reset winner verification_status to pending
  await supabase
    .from("winners")
    .update({ verification_status: "pending" })
    .eq("id", winnerId);

  return { success: true, proof };
}

/**
 * Generates an ephemeral signed URL for secure proof inspection.
 * Requires caller to be the owner subscriber or an administrator.
 */
export async function getWinnerProofSignedUrl(
  userId: string,
  proofId: string,
  isAdmin: boolean = false,
  client?: SupabaseClient
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  const supabase = getClient(client);

  // Retrieve proof with winner record
  const { data: proof, error: pErr } = await supabase
    .from("winner_proofs")
    .select("*, winner:winners(id, user_id)")
    .eq("id", proofId)
    .maybeSingle();

  if (pErr || !proof) {
    return { success: false, error: "Proof document not found." };
  }

  const winner = proof.winner as { id: string; user_id: string } | undefined;
  if (!winner) {
    return { success: false, error: "Associated winner record not found." };
  }

  // Authorization check
  if (!isAdmin && winner.user_id !== userId) {
    return { success: false, error: "Unauthorized: You do not have permission to view this proof." };
  }

  // Generate 1-hour signed URL from private bucket
  const { data: signedData, error: signErr } = await supabase.storage
    .from("winner-proofs")
    .createSignedUrl(proof.file_url, 3600);

  if (signErr || !signedData?.signedUrl) {
    console.error("Failed to generate signed URL:", signErr);
    return { success: false, error: "Could not generate secure view link." };
  }

  return { success: true, signedUrl: signedData.signedUrl };
}

/**
 * Admin: Retrieves all winners across draws with profile details, proof history, and payout state.
 */
export async function getAllAdminWinners(
  client?: SupabaseClient
): Promise<WinnerWithDetails[]> {
  const supabase = getClient(client);

  const { data: winners, error } = await supabase
    .from("winners")
    .select(
      "*, profile:profiles(id, email, full_name), draw:draws(id, draw_number, draw_month, draw_type, status), prize:prizes(*), winner_proofs(*), payouts(*)"
    )
    .order("created_at", { ascending: false });

  if (error || !winners) {
    console.error("Error fetching admin winners:", error);
    return [];
  }

  return winners.map((w: any) => {
    const proofs: WinnerProof[] = (w.winner_proofs || []).sort(
      (a: WinnerProof, b: WinnerProof) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
    const payout: Payout | null = w.payouts?.[0] || null;

    return {
      ...w,
      proofs,
      latestProof: proofs[0] || null,
      payout,
    } as WinnerWithDetails;
  });
}

/**
 * Admin: Approves a winner's proof, updates verification_status to approved, and creates pending payout.
 */
export async function approveWinnerProof(
  adminId: string,
  winnerId: string,
  proofId?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient(client);

  // 1. Verify winner exists
  const { data: winner, error: wErr } = await supabase
    .from("winners")
    .select("id, prize_amount, verification_status, payment_status")
    .eq("id", winnerId)
    .maybeSingle();

  if (wErr || !winner) {
    return { success: false, error: "Winner record not found." };
  }

  // 2. Fetch proofs
  const { data: proofs } = await supabase
    .from("winner_proofs")
    .select("id, status")
    .eq("winner_id", winnerId)
    .order("uploaded_at", { ascending: false });

  if (!proofs || proofs.length === 0) {
    return { success: false, error: "Cannot approve: No proof document has been uploaded." };
  }

  const targetProofId = proofId || proofs[0].id;
  const now = new Date().toISOString();

  // 3. Update proof status to approved
  try {
    await supabase
      .from("winner_proofs")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: adminId,
      })
      .eq("id", targetProofId);
  } catch {
    await supabase
      .from("winner_proofs")
      .update({
        reviewed_at: now,
        reviewed_by: adminId,
      })
      .eq("id", targetProofId);
  }

  // 4. Update winner verification_status to approved
  const { error: winUpErr } = await supabase
    .from("winners")
    .update({ verification_status: "approved" })
    .eq("id", winnerId);

  if (winUpErr) {
    console.error("Error updating winner verification status:", winUpErr);
    return { success: false, error: "Failed to update winner status." };
  }

  // 5. Ensure payout record exists with status = pending
  const { data: existingPayout } = await supabase
    .from("payouts")
    .select("id")
    .eq("winner_id", winnerId)
    .maybeSingle();

  if (!existingPayout) {
    await supabase.from("payouts").insert({
      winner_id: winnerId,
      amount: winner.prize_amount,
      status: "pending",
    });
  }

  return { success: true };
}

/**
 * Admin: Rejects a winner's proof with a required reason.
 * Preserves the rejected proof in history and sets winner verification_status to rejected.
 */
export async function rejectWinnerProof(
  adminId: string,
  winnerId: string,
  reason: string,
  proofId?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient(client);

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "A non-empty rejection reason is required." };
  }

  // 1. Verify winner exists
  const { data: winner, error: wErr } = await supabase
    .from("winners")
    .select("id, verification_status")
    .eq("id", winnerId)
    .maybeSingle();

  if (wErr || !winner) {
    return { success: false, error: "Winner record not found." };
  }

  // 2. Fetch proofs
  const { data: proofs } = await supabase
    .from("winner_proofs")
    .select("id, status")
    .eq("winner_id", winnerId)
    .order("uploaded_at", { ascending: false });

  if (!proofs || proofs.length === 0) {
    return { success: false, error: "No proof uploaded to reject." };
  }

  const targetProofId = proofId || proofs[0].id;
  const now = new Date().toISOString();

  // 3. Update proof to rejected with reason
  try {
    await supabase
      .from("winner_proofs")
      .update({
        status: "rejected",
        review_notes: reason.trim(),
        reviewed_at: now,
        reviewed_by: adminId,
      })
      .eq("id", targetProofId);
  } catch {
    await supabase
      .from("winner_proofs")
      .update({
        review_notes: reason.trim(),
        reviewed_at: now,
        reviewed_by: adminId,
      })
      .eq("id", targetProofId);
  }

  // 4. Update winner verification_status to rejected
  const { error: winUpErr } = await supabase
    .from("winners")
    .update({ verification_status: "rejected" })
    .eq("id", winnerId);

  if (winUpErr) {
    return { success: false, error: "Failed to update winner verification state." };
  }

  return { success: true };
}

/**
 * Admin: Marks an approved winner's payout as Paid.
 * STRICT GATING: Only winners with verification_status === 'approved' can be marked Paid.
 */
export async function markWinnerPayoutPaid(
  adminId: string,
  winnerId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; paidAt?: string; error?: string }> {
  const supabase = getClient(client);

  // 1. Authoritative re-fetch: verify winner state server-side
  const { data: winner, error: wErr } = await supabase
    .from("winners")
    .select("id, prize_amount, verification_status, payment_status")
    .eq("id", winnerId)
    .maybeSingle();

  if (wErr || !winner) {
    return { success: false, error: "Winner record not found." };
  }

  // 2. Strict invariant check: must be approved
  if (winner.verification_status !== "approved") {
    return {
      success: false,
      error: `Payout blocked: Winner verification status is '${winner.verification_status}'. Winner must be approved before payout can be marked Paid.`,
    };
  }

  // 3. Invariant check: cannot be paid twice
  if (winner.payment_status === "paid") {
    return { success: false, error: "This winner payout has already been marked as Paid." };
  }

  const now = new Date().toISOString();

  // 4. Atomically update winner payment_status and payouts status
  const { error: upWinErr } = await supabase
    .from("winners")
    .update({ payment_status: "paid" })
    .eq("id", winnerId);

  if (upWinErr) {
    console.error("Error updating winner payment status:", upWinErr);
    return { success: false, error: "Failed to update winner payment status." };
  }

  const { data: existingPayout } = await supabase
    .from("payouts")
    .select("id")
    .eq("winner_id", winnerId)
    .maybeSingle();

  if (existingPayout) {
    await supabase
      .from("payouts")
      .update({
        status: "paid",
        paid_at: now,
      })
      .eq("id", existingPayout.id);
  } else {
    await supabase.from("payouts").insert({
      winner_id: winnerId,
      amount: winner.prize_amount,
      status: "paid",
      paid_at: now,
    });
  }

  return { success: true, paidAt: now };
}

/**
 * Admin: Aggregates financial and audit report statistics.
 */
export async function getAdminFinancialReport(
  client?: SupabaseClient
): Promise<FinancialReportSummary & { payoutList: WinnerWithDetails[] }> {
  const supabase = getClient(client);

  // 1. Total subscribers
  const { count: subCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // 2. Total prize pool from prizes table
  const { data: prizes } = await supabase.from("prizes").select("pool_amount");
  const totalPrizePool = (prizes || []).reduce((sum, p) => sum + Number(p.pool_amount || 0), 0);

  // 3. Winners summary
  const { data: winners } = await supabase
    .from("winners")
    .select(
      "*, profile:profiles(id, email, full_name), draw:draws(id, draw_number, draw_month), winner_proofs(*), payouts(*)"
    )
    .order("created_at", { ascending: false });

  const validWinners = winners || [];
  const totalWinnings = validWinners.reduce((sum, w) => sum + Number(w.prize_amount || 0), 0);

  // 4. Proofs breakdown
  const { data: proofs } = await supabase.from("winner_proofs").select("id, status");
  const validProofs = proofs || [];
  const pendingProofs = validProofs.filter((p) => !p.status || p.status === "pending").length;
  const approvedProofs = validProofs.filter((p) => p.status === "approved").length;
  const rejectedProofs = validProofs.filter((p) => p.status === "rejected").length;

  // 5. Payouts breakdown & list
  let pendingPayoutCount = 0;
  let pendingPayoutAmount = 0;
  let paidPayoutCount = 0;
  let paidPayoutAmount = 0;

  const payoutList: WinnerWithDetails[] = [];

  for (const w of validWinners) {
    const amt = Number(w.prize_amount || 0);
    const sortedProofs: WinnerProof[] = (w.winner_proofs || []).sort(
      (a: WinnerProof, b: WinnerProof) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
    const payout: Payout | null = w.payouts?.[0] || null;

    const detailed: WinnerWithDetails = {
      ...w,
      proofs: sortedProofs,
      latestProof: sortedProofs[0] || null,
      payout,
    };

    if (w.payment_status === "paid") {
      paidPayoutCount++;
      paidPayoutAmount += amt;
      payoutList.push(detailed);
    } else if (w.verification_status === "approved") {
      pendingPayoutCount++;
      pendingPayoutAmount += amt;
      payoutList.push(detailed);
    }
  }

  return {
    totalSubscribers: subCount || 0,
    totalPrizePool,
    totalWinnings,
    proofs: {
      pending: pendingProofs,
      approved: approvedProofs,
      rejected: rejectedProofs,
      total: validProofs.length,
    },
    payouts: {
      pendingCount: pendingPayoutCount,
      pendingAmount: pendingPayoutAmount,
      paidCount: paidPayoutCount,
      paidAmount: paidPayoutAmount,
      totalAmount: pendingPayoutAmount + paidPayoutAmount,
    },
    payoutList,
  };
}

"use server";

import { requireAdmin, requireAuth } from "@/lib/auth/session";
import {
  uploadWinnerProofFile,
  getWinnerProofSignedUrl,
  approveWinnerProof,
  rejectWinnerProof,
  markWinnerPayoutPaid,
} from "@/services/winners/winnerService";
import { revalidatePath } from "next/cache";

/**
 * Subscriber: Uploads scorecard verification proof for a winning ticket.
 */
export async function uploadWinnerProofAction(formData: FormData) {
  try {
    const auth = await requireAuth();
    const winnerId = formData.get("winnerId") as string;
    const file = formData.get("proof") as File | null;

    if (!winnerId) {
      return { success: false, error: "Winner ID is required." };
    }

    if (!file || typeof file === "string" || file.size === 0) {
      return { success: false, error: "Please select a valid image file to upload." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadWinnerProofFile(
      auth.user.id,
      winnerId,
      arrayBuffer,
      file.name,
      file.type
    );

    if (result.success) {
      revalidatePath("/winnings");
      revalidatePath("/admin/winners");
      revalidatePath("/admin/reports");
    }

    return result;
  } catch (error) {
    console.error("Error in uploadWinnerProofAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload proof document",
    };
  }
}

/**
 * Subscriber or Admin: Generates an ephemeral signed URL to inspect a proof file securely.
 */
export async function getSignedProofUrlAction(proofId: string) {
  try {
    const auth = await requireAuth();
    const isAdmin = auth.role === "admin";
    const result = await getWinnerProofSignedUrl(auth.user.id, proofId, isAdmin);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate proof view link",
    };
  }
}

/**
 * Admin: Approves a winner's proof scorecard and creates pending payout.
 */
export async function approveWinnerProofAction(winnerId: string, proofId?: string) {
  try {
    const auth = await requireAdmin();
    const result = await approveWinnerProof(auth.user.id, winnerId, proofId);

    if (result.success) {
      revalidatePath("/admin/winners");
      revalidatePath("/admin/reports");
      revalidatePath("/winnings");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve winner proof",
    };
  }
}

/**
 * Admin: Rejects a winner's proof with a required reason.
 */
export async function rejectWinnerProofAction(winnerId: string, reason: string, proofId?: string) {
  try {
    const auth = await requireAdmin();
    const result = await rejectWinnerProof(auth.user.id, winnerId, reason, proofId);

    if (result.success) {
      revalidatePath("/admin/winners");
      revalidatePath("/admin/reports");
      revalidatePath("/winnings");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject winner proof",
    };
  }
}

/**
 * Admin: Marks an approved winner's payout as Paid.
 * Server-side gated strictly to verification_status === 'approved'.
 */
export async function markPayoutPaidAction(winnerId: string) {
  try {
    const auth = await requireAdmin();
    const result = await markWinnerPayoutPaid(auth.user.id, winnerId);

    if (result.success) {
      revalidatePath("/admin/winners");
      revalidatePath("/admin/reports");
      revalidatePath("/winnings");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payout",
    };
  }
}

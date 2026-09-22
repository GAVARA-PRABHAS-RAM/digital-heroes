"use server";

import { requireAuth, verifyActiveSubscription } from "@/lib/auth/session";
import { submitScore, updateScore, deleteScore } from "@/services/scores/scoreService";
import { revalidatePath } from "next/cache";

export async function addScoreAction(formData: { score: number; score_date: string }) {
  try {
    const auth = await requireAuth();
    const subCheck = await verifyActiveSubscription(auth);
    if (!subCheck.allowed) {
      return { success: false, error: subCheck.reason };
    }

    const result = await submitScore(auth.user.id, formData);
    if (result.success) {
      revalidatePath("/scores");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record score",
    };
  }
}

export async function updateScoreAction(scoreId: string, score: number) {
  try {
    const auth = await requireAuth();
    const subCheck = await verifyActiveSubscription(auth);
    if (!subCheck.allowed) {
      return { success: false, error: subCheck.reason };
    }

    const result = await updateScore(auth.user.id, scoreId, score);
    if (result.success) {
      revalidatePath("/scores");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update score",
    };
  }
}

export async function deleteScoreAction(scoreId: string) {
  try {
    const auth = await requireAuth();
    const subCheck = await verifyActiveSubscription(auth);
    if (!subCheck.allowed) {
      return { success: false, error: subCheck.reason };
    }

    const result = await deleteScore(auth.user.id, scoreId);
    if (result.success) {
      revalidatePath("/scores");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete score",
    };
  }
}

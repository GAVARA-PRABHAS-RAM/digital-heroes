"use server";

import { requireAdmin, requireAuth, verifyActiveSubscription } from "@/lib/auth/session";
import {
  createDraw,
  simulateDraw,
  publishDraw,
  enterDrawWithLatestScores,
} from "@/services/draws/drawService";
import { revalidatePath } from "next/cache";

/**
 * Admin: Create a new draw.
 */
export async function createDrawAction(payload: {
  draw_month: string;
  draw_type: "random" | "algorithmic";
  draw_number?: string;
  prize_pool_percentage?: number;
}) {
  try {
    await requireAdmin();
    const result = await createDraw(payload);
    if (result.success) {
      revalidatePath("/admin/draws");
      revalidatePath("/draws");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create draw",
    };
  }
}

/**
 * Admin: Simulates draw generation, participant matching, and prize distributions.
 */
export async function simulateDrawAction(
  drawId: string,
  options: {
    draw_type?: "random" | "algorithmic";
    prize_pool_percentage?: number;
  } = {}
) {
  try {
    await requireAdmin();
    const result = await simulateDraw(drawId, options);
    if (result.success) {
      revalidatePath("/admin/draws");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to simulate draw",
    };
  }
}

/**
 * Admin: Publishes a simulated draw, locking official winning numbers and creating winners.
 */
export async function publishDrawAction(drawId: string) {
  try {
    await requireAdmin();
    const result = await publishDraw(drawId);
    if (result.success) {
      revalidatePath("/admin/draws");
      revalidatePath("/draws");
      revalidatePath("/winnings");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish draw",
    };
  }
}

/**
 * Subscriber: Enters the upcoming monthly draw using their latest Stableford scores.
 */
export async function enterDrawAction(drawId: string) {
  try {
    const auth = await requireAuth();
    const subCheck = await verifyActiveSubscription(auth);
    if (!subCheck.allowed) {
      return { success: false, error: subCheck.reason };
    }

    const result = await enterDrawWithLatestScores(auth.user.id, drawId);
    if (result.success) {
      revalidatePath("/draws");
      revalidatePath("/dashboard");
      revalidatePath("/admin/draws");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to enter draw",
    };
  }
}

"use server";

import { requireAuth, verifyActiveSubscription } from "@/lib/auth/session";
import { setUserCharity } from "@/services/charities/charityService";
import { revalidatePath } from "next/cache";

export async function updateUserCharityAction(payload: {
  charityId: string;
  contributionPercentage: number;
}) {
  try {
    const auth = await requireAuth();
    const subCheck = await verifyActiveSubscription(auth);
    if (!subCheck.allowed) {
      return { success: false, error: subCheck.reason };
    }

    const result = await setUserCharity(auth.user.id, payload);
    if (result.success) {
      revalidatePath("/charity");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update charity selection",
    };
  }
}

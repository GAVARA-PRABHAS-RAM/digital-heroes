"use server";

import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(payload: {
  fullName: string;
  phone?: string | null;
}) {
  try {
    const auth = await requireAuth();
    const validation = profileUpdateSchema.safeParse(payload);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || "Invalid profile information",
      };
    }

    const { fullName, phone } = validation.data;
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id);

    if (profileError) {
      return {
        success: false,
        error: profileError.message || "Failed to update profile",
      };
    }

    // Also update auth user metadata
    await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

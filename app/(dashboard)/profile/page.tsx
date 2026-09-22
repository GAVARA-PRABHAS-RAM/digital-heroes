import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { ProfileClient } from "@/components/profile/ProfileClient";

export const metadata = {
  title: "Player Profile | Digital Heroes",
  description: "View and manage your golfer profile details, phone, and account settings.",
};

export default async function ProfilePage() {
  const auth = await requireAuth();

  const profile = auth.profile || {
    id: auth.user.id,
    email: auth.user.email || "",
    full_name: (auth.user.user_metadata?.full_name as string) || null,
    phone: null,
    role: auth.role,
    created_at: auth.user.created_at,
    updated_at: auth.user.created_at,
  };

  return <ProfileClient initialProfile={profile} />;
}

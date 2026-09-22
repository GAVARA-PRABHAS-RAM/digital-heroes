import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getAllDraws } from "@/services/draws/drawService";
import { createClient } from "@/lib/supabase/server";
import { AdminDrawsClient } from "@/components/admin/draws/AdminDrawsClient";

export const metadata = {
  title: "Admin Draw & Prize Engine | Digital Heroes",
  description: "Schedule, simulate, and publish monthly prize draws with audited tier calculations.",
};

export default async function AdminDrawsPage() {
  await requireAdmin("/dashboard");
  const draws = await getAllDraws();

  // Get count of active subscriptions
  const supabase = createClient();
  const { count } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <AdminDrawsClient
      initialDraws={draws}
      activeSubscribersCount={count || 0}
    />
  );
}

import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getAllAdminWinners } from "@/services/winners/winnerService";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminWinnersClient } from "@/components/admin/winners/AdminWinnersClient";

export const metadata = {
  title: "Winner Verification & Proofs | Admin",
  description: "Review winner scorecard proofs, approve or reject submissions, and manage prize payout disbursements.",
};

export default async function AdminWinnersPage() {
  await requireAdmin("/dashboard");
  const winners = await getAllAdminWinners();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Winner Verification & Payout Management"
        description="Inspect submitted winner scorecard proofs, verify authenticity, approve or reject claims with documented reasons, and release cash prize disbursements."
      />

      <AdminWinnersClient initialWinners={winners} />
    </div>
  );
}

import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminFinancialReport } from "@/services/winners/winnerService";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AdminReportsClient } from "@/components/admin/reports/AdminReportsClient";

export const metadata = {
  title: "Reports, Payouts & Analytics | Admin",
  description: "Review financial statistics, winner verification metrics, and cash prize payout reconciliation.",
};

export default async function AdminReportsPage() {
  await requireAdmin("/dashboard");
  const summary = await getAdminFinancialReport();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports & Payout Reconciliation"
        description="Comprehensive accounting overview of active subscribers, prize pools, winner proofs review progress, and verified prize payout disbursals."
      />

      <AdminReportsClient summary={summary} />
    </div>
  );
}

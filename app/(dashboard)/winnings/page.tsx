import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { getSubscriberWinningsWithProofs } from "@/services/winners/winnerService";
import { getUserDrawEntries } from "@/services/draws/drawService";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SubscriberWinningsClient } from "@/components/winnings/SubscriberWinningsClient";

export const metadata = {
  title: "Winnings & Draw Entries | Digital Heroes",
  description: "View your monthly draw ticket numbers, matched numbers, scorecard proof verification, and claimed prize payouts.",
};

export default async function WinningsPage() {
  const auth = await requireAuth();
  const [winnings, entries] = await Promise.all([
    getSubscriberWinningsWithProofs(auth.user.id),
    getUserDrawEntries(auth.user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Draw Entries & Prize Winnings"
        description="Review your allocated ticket numbers, track winning tier matches, submit your scorecard proof for verification, and monitor cash prize payouts."
      />

      <SubscriberWinningsClient winnings={winnings} entries={entries} />
    </div>
  );
}

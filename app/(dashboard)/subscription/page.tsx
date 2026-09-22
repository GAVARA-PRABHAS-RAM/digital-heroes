import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { getUserSubscription } from "@/services/subscriptions/subscriptionService";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SubscriptionClient } from "@/components/subscriptions/SubscriptionClient";

export const metadata = {
  title: "Subscription & Billing | Digital Heroes",
  description: "Manage your Digital Heroes membership plan, billing cycle, renewal status, and Stripe payments in INR.",
};

export default async function SubscriptionPage() {
  const auth = await requireAuth();
  const subscription = await getUserSubscription(auth.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Membership & Subscription"
        description="Select or manage your recurring membership plan in Indian Rupees (INR) to participate in monthly draws, fund partner charities, and track your golf scores."
      />

      <SubscriptionClient subscription={subscription} />
    </div>
  );
}

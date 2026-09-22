import React from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard } from "lucide-react";

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscription Management"
        description="Monitor active subscription plans, track Stripe customer IDs, past-due accounts, and cancellation rates."
      />

      <EmptyState
        icon={<CreditCard className="w-8 h-8 text-slate-500" />}
        title="No Subscription Records"
        description="Stripe customer records, recurring subscription status, and billing lifecycle management will be enabled in Stage 4."
      />
    </div>
  );
}

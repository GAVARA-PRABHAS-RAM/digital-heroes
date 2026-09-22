import React from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Users, CreditCard, Sparkles, CheckCircle } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="System monitoring, user management, draw simulation and publication, winner verification, and financial payouts."
        badge="Superuser Access"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Subscribers"
          value="--"
          subtitle="Database sync pending"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Subscriptions"
          value="--"
          subtitle="Stripe webhook pending"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <MetricCard
          title="Current Draw State"
          value="Draft"
          subtitle="RNG engine pending"
          icon={<Sparkles className="w-5 h-5" />}
        />
        <MetricCard
          title="Pending Verifications"
          value="0"
          subtitle="Scorecard audits"
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Draw Engine Control</CardTitle>
            <CardDescription>Configure upcoming draw dates, simulate number generation, and publish winners.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">
            Draw simulation, seeded RNG execution, and prize pool calculation rules will be activated in Stage 6.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Winner Audit & Proof Queue</CardTitle>
            <CardDescription>Review uploaded scorecards and golfer attestations before disbursing cash payouts.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">
            Winner scorecard verification and Stripe Connect / bank payout processing will be enabled in Stage 6.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

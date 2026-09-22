import React from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Target } from "lucide-react";

export default function AdminScoresPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Score Management & Moderation"
        description="Audit golfer round submissions, verify course and slope ratings, flag anomalous scores, and review differentials."
      />

      <EmptyState
        icon={<Target className="w-8 h-8 text-slate-500" />}
        title="No Scores Submitted"
        description="Scorecard auditing, handicap differential validation, and manual round moderation will be enabled in Stage 3."
      />
    </div>
  );
}

import React from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Heart, Plus } from "lucide-react";

export default function AdminCharitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Charity Management"
        description="Register verified non-profit partners, update registration tax numbers, manage campaigns, and review donation allocations."
        actions={
          <Button disabled className="gap-2">
            <Plus className="w-4 h-4" /> Add Charity
          </Button>
        }
      />

      <EmptyState
        icon={<Heart className="w-8 h-8 text-rose-500" />}
        title="No Charities Registered"
        description="Non-profit registration, logo management via Supabase Storage, and active status toggles will be activated in Stage 5."
      />
    </div>
  );
}

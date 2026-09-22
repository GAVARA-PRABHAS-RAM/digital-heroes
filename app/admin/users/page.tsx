import React from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="Inspect registered subscriber accounts, roles (subscriber vs. admin), handicap numbers, and account status."
      />

      <EmptyState
        icon={<Users className="w-8 h-8 text-slate-500" />}
        title="No Users Loaded"
        description="User table synchronization and administrative role assignment will be functional once Supabase Auth and database tables are linked in Stage 2."
      />
    </div>
  );
}

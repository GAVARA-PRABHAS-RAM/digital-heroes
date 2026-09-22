import React from "react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeartHandshake } from "lucide-react";

export default function CharitiesPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl mx-auto space-y-4 text-center mb-12">
          <Badge variant="outline">Verified Partners</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Charity Directory
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Discover accredited non-profit organizations supported by Digital Heroes subscribers.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <EmptyState
            icon={<HeartHandshake className="w-8 h-8 text-rose-500" />}
            title="Charity Directory Under Staging"
            description="Verified non-profit partner profiles, mission statements, registration numbers, and donation tracking will be connected to the database in Stage 2 and configured in Stage 5."
          />
        </div>
      </Container>
    </div>
  );
}

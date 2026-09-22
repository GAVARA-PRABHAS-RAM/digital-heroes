import React from "react";
import { Container } from "@/components/layout/Container";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { requireAuth } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    await requireAuth("/login");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8">
        <Container>
          <div className="mb-6">
            <DashboardNav />
          </div>
          {children}
        </Container>
      </main>
      <Footer />
    </>
  );
}

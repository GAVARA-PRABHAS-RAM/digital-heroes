import React from "react";
import { Container } from "@/components/layout/Container";
import { AdminNav } from "@/components/layout/AdminNav";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    await requireAdmin("/dashboard");
  }

  return (
    <>
      <Navbar />
      <div className="bg-slate-900 text-white py-2 border-b border-slate-800">
        <Container>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold uppercase tracking-wider">Administrator Control Center</span>
            </div>
            <span className="text-slate-400">Strict RLS & Server-Role Protection</span>
          </div>
        </Container>
      </div>
      <main className="flex-1 py-8">
        <Container>
          <div className="mb-6">
            <AdminNav />
          </div>
          {children}
        </Container>
      </main>
      <Footer />
    </>
  );
}

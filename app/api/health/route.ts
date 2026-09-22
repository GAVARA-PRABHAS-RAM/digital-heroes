import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    application: "Digital Heroes",
    stage: 7,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      supabaseConfigured: isSupabaseConfigured(),
      adminRoleKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}

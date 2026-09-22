import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const k = trimmed.substring(0, idx).trim();
    const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    env[k] = v;
  }
}

// Anon client (like a regular subscriber before admin elevation)
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkAnon() {
  console.log("=== TESTING SUBSCRIBER DRAW ACCESS ===");

  // 1. Upcoming Draw (Draft or Simulated)
  const { data: upcomingDraw, error: upErr } = await anonClient
    .from("draws")
    .select("*, prizes(*), draw_results(*)")
    .in("status", ["draft", "simulated"])
    .order("draw_month", { ascending: true })
    .limit(1)
    .maybeSingle();

  console.log("Upcoming draw query:", { error: upErr, drawNumber: upcomingDraw?.draw_number, month: upcomingDraw?.draw_month, status: upcomingDraw?.status });

  // Redaction check
  const isPublished = upcomingDraw?.status === "published" || upcomingDraw?.status === "completed";
  const sanitized = upcomingDraw ? {
    ...upcomingDraw,
    winning_numbers: isPublished ? upcomingDraw.winning_numbers : null,
    draw_results: isPublished ? upcomingDraw.draw_results : [],
    prizes: isPublished ? upcomingDraw.prizes : [],
  } : null;

  console.log("Sanitized non-admin upcoming draw view:", {
    draw_number: sanitized?.draw_number,
    status: sanitized?.status,
    winning_numbers: sanitized?.winning_numbers,
    draw_results_count: sanitized?.draw_results?.length,
    prizes_count: sanitized?.prizes?.length,
  });

  // 2. Published Draws
  const { data: publishedDraws, error: pubErr } = await anonClient
    .from("draws")
    .select("*, prizes(*), draw_results(*)")
    .in("status", ["published", "completed"])
    .order("draw_month", { ascending: false });

  console.log("Published draws query:", {
    error: pubErr,
    count: publishedDraws?.length,
    draws: publishedDraws?.map(d => ({
      draw_number: d.draw_number,
      month: d.draw_month,
      status: d.status,
      winning_numbers: d.winning_numbers || d.draw_results?.[0]?.winning_numbers
    }))
  });
  // 3. Test Draw Entry Rules
  const { data: pubDraw } = await anonClient.from("draws").select("id, status").eq("draw_number", "DH-STAGE4-VERIFY").single();
  const { data: simDraw } = await anonClient.from("draws").select("id, status").eq("draw_number", "DH-MANUAL-TEST").single();

  const isPubOpen = pubDraw.status !== "published" && pubDraw.status !== "completed";
  const isSimOpen = simDraw.status !== "published" && simDraw.status !== "completed";

  console.log("Draw Entry Eligibility Rules:", {
    publishedDrawAllowsEntries: isPubOpen, // Expected: false
    simulatedDrawAllowsEntries: isSimOpen, // Expected: true
  });
}

checkAnon();

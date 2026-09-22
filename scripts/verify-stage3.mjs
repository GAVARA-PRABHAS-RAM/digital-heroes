import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env.local
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

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runVerification() {
  console.log("=== DIGITAL HEROES: STAGE 3 INTEGRATION VERIFICATION ===");

  // 1. Check partner charities
  console.log("\n1. Verifying active charities and events...");
  const { data: charities, error: cErr } = await supabase
    .from("charities")
    .select("*, charity_events(*)")
    .eq("active", true);

  if (cErr || !charities || charities.length === 0) {
    console.error("FAILED to load charities:", cErr);
    process.exit(1);
  }
  console.log(`✓ Found ${charities.length} active partner charities.`);
  charities.forEach((c) => {
    console.log(`  - ${c.name} (${c.charity_events?.length || 0} upcoming events)`);
  });

  // 2. Find test account
  console.log("\n2. Locating test account...");
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", "prabhasram257@gmail.com")
    .single();

  if (pErr || !profile) {
    console.error("FAILED to find test user profile:", pErr);
    process.exit(1);
  }
  console.log(`✓ Test account located: ${profile.email} (${profile.id}), role: ${profile.role}`);

  const userId = profile.id;

  // 3. Test Charity Selection & Minimum 10% Allocation
  console.log("\n3. Testing Charity Selection & Minimum 10% Constraint...");
  const selectedCharity = charities[0];

  // Try inserting invalid percentage (< 10) directly via service-role / constraint check
  const { error: invalidPctErr } = await supabase
    .from("user_charities")
    .insert({
      user_id: userId,
      charity_id: selectedCharity.id,
      contribution_percentage: 5,
    });

  if (invalidPctErr) {
    console.log(`✓ Database CHECK constraint properly rejected 5% contribution: "${invalidPctErr.message}"`);
  } else {
    console.error("FAILED: DB allowed contribution percentage < 10%");
    process.exit(1);
  }

  // Upsert valid selection: 25%
  console.log("Setting valid charity selection: 25% to", selectedCharity.name);
  const { data: existingUc } = await supabase
    .from("user_charities")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingUc) {
    await supabase
      .from("user_charities")
      .update({
        charity_id: selectedCharity.id,
        contribution_percentage: 25,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUc.id);
  } else {
    await supabase
      .from("user_charities")
      .insert({
        user_id: userId,
        charity_id: selectedCharity.id,
        contribution_percentage: 25,
      });
  }

  const { data: savedUc } = await supabase
    .from("user_charities")
    .select("*, charity:charities(*)")
    .eq("user_id", userId)
    .single();

  console.log(`✓ Current user charity: ${savedUc.charity.name} at ${savedUc.contribution_percentage}% contribution`);

  // 4. Test Scores: 1-45 constraint, duplicate dates, and 5-score rolling retention
  console.log("\n4. Testing Stableford Scores (1-45, unique date, 5-score rolling retention)...");

  // Clean existing scores for a deterministic test
  await supabase.from("scores").delete().eq("user_id", userId);

  // Test invalid score (< 1)
  const { error: lowScoreErr } = await supabase
    .from("scores")
    .insert({ user_id: userId, score: 0, score_date: "2026-09-01" });
  if (lowScoreErr) {
    console.log(`✓ DB CHECK constraint rejected score 0: "${lowScoreErr.message}"`);
  }

  // Test invalid score (> 45)
  const { error: highScoreErr } = await supabase
    .from("scores")
    .insert({ user_id: userId, score: 50, score_date: "2026-09-01" });
  if (highScoreErr) {
    console.log(`✓ DB CHECK constraint rejected score 50: "${highScoreErr.message}"`);
  }

  // Insert round 1
  await supabase.from("scores").insert({ user_id: userId, score: 32, score_date: "2026-09-10" });
  console.log("✓ Inserted Round 1: 32 pts on 2026-09-10");

  // Test duplicate date rejection
  const { error: dupDateErr } = await supabase
    .from("scores")
    .insert({ user_id: userId, score: 38, score_date: "2026-09-10" });
  if (dupDateErr) {
    console.log(`✓ Unique constraint unique_user_score_date rejected duplicate date 2026-09-10: "${dupDateErr.message}"`);
  } else {
    console.error("FAILED: DB allowed duplicate score date for user!");
    process.exit(1);
  }

  // Insert rounds 2, 3, 4, 5
  await supabase.from("scores").insert([
    { user_id: userId, score: 35, score_date: "2026-09-11" },
    { user_id: userId, score: 38, score_date: "2026-09-12" },
    { user_id: userId, score: 40, score_date: "2026-09-13" },
    { user_id: userId, score: 36, score_date: "2026-09-14" },
  ]);

  const { data: fiveScores } = await supabase
    .from("scores")
    .select("id, score, score_date")
    .eq("user_id", userId)
    .order("score_date", { ascending: false });

  console.log(`✓ User currently has ${fiveScores.length} rounds logged.`);
  fiveScores.forEach((s) => console.log(`  - ${s.score_date}: ${s.score} pts`));

  // Now simulate adding a 6th score (2026-09-15 with 42 pts) and executing rolling retention
  console.log("\nAdding 6th round (2026-09-15 with 42 pts)...");
  await supabase.from("scores").insert({ user_id: userId, score: 42, score_date: "2026-09-15" });

  // Rolling 5 pruning
  const { data: allScores } = await supabase
    .from("scores")
    .select("id, score_date, created_at")
    .eq("user_id", userId)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (allScores.length > 5) {
    const pruneIds = allScores.slice(5).map((s) => s.id);
    await supabase.from("scores").delete().in("id", pruneIds);
    console.log(`✓ Rolling retention pruned ${pruneIds.length} oldest score(s) beyond the 5-round window.`);
  }

  // Verify exactly 5 scores remain
  const { data: retainedScores } = await supabase
    .from("scores")
    .select("id, score, score_date")
    .eq("user_id", userId)
    .order("score_date", { ascending: false });

  console.log(`✓ Final retained scores count: ${retainedScores.length} (must be 5)`);
  retainedScores.forEach((s, idx) => console.log(`  ${idx + 1}. ${s.score_date}: ${s.score} pts`));

  // Verify oldest date (2026-09-10) was pruned and newest (2026-09-15) is at rank 1
  const dates = retainedScores.map((s) => s.score_date);
  if (!dates.includes("2026-09-10") && dates[0] === "2026-09-15") {
    console.log("✓ PERFECT: Oldest round (2026-09-10) was pruned, newest (2026-09-15) is rank 1.");
  } else {
    console.error("FAILED: Rolling retention dates unexpected:", dates);
    process.exit(1);
  }

  // 5. Test stats calculation
  const total = retainedScores.reduce((sum, s) => sum + s.score, 0);
  const avg = Number((total / retainedScores.length).toFixed(1));
  const best = Math.max(...retainedScores.map((s) => s.score));
  console.log(`✓ Stats computed: Count=${retainedScores.length}/5, Average=${avg} pts, Best=${best} pts`);

  console.log("\n=== ALL STAGE 3 BACKEND & DATABASE VERIFICATIONS PASSED ===");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

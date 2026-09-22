import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

async function promote() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/promote-admin.mjs <user-email>");
    process.exit(1);
  }

  const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env";
  const envContent = fs.readFileSync(envFile, "utf8");
  const env = Object.fromEntries(
    envContent
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const [k, ...v] = l.trim().split("=");
        return [k.trim(), v.join("=").trim()];
      })
  );

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Supabase credentials missing in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[Admin Promotion] Looking up auth user for email: ${email}...`);
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("[Admin Promotion] Error listing users:", listError.message);
    process.exit(1);
  }

  const authUser = usersData.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());

  if (!authUser) {
    console.error(`[Admin Promotion] User not found in Supabase Auth for ${email}. Ensure user has signed up first.`);
    process.exit(1);
  }

  console.log(`[Admin Promotion] Found auth user (${authUser.id}). Promoting to admin...`);

  // Attempt via promote_to_admin procedure first
  const { error: rpcError } = await supabase.rpc("promote_to_admin", {
    target_email: email.trim(),
  });

  if (!rpcError) {
    console.log(`[Admin Promotion] Successfully promoted ${email} to admin role via RPC!`);
    return;
  }

  // Fallback to direct table update via service role
  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Admin",
      role: "admin",
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("[Admin Promotion] Failed to update profile role:", upsertError.message);
    process.exit(1);
  }

  console.log(`[Admin Promotion] Successfully promoted ${email} to admin role!`);
}

promote();

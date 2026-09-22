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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, role");
  console.log("Profiles in DB:", profiles);

  const { data: winners } = await supabase
    .from("winners")
    .select("*, profile:profiles(email, full_name), draw:draws(draw_number, draw_month)");
  console.log("Winners with profile and draw:", JSON.stringify(winners, null, 2));
}

inspect();

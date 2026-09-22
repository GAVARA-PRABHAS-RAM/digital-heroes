import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

async function seed() {
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

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[Seed] Checking existing charities...");
  const { data: existing, error: checkError } = await supabase.from("charities").select("id, name");

  if (checkError) {
    console.error("[Seed] Error checking charities:", checkError.message);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`[Seed] Found ${existing.length} charities already seeded. Skipping.`);
    return;
  }

  console.log("[Seed] Seeding sample non-profit organizations...");

  const sampleCharities = [
    {
      name: "Junior Golf & Youth Leadership (Sample)",
      description: "Empowering under-resourced youth through golf coaching, academic tutoring, and leadership development programs.",
      website_url: "https://example.org/junior-golf",
      image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&auto=format&fit=crop&q=80",
      featured: true,
      active: true,
    },
    {
      name: "Veterans Adaptive Sports Foundation (Sample)",
      description: "Providing rehabilitative golf clinics, adaptive mobility equipment, and community peer support for wounded veterans.",
      website_url: "https://example.org/veterans-sports",
      image_url: "https://images.unsplash.com/photo-1593111774642-a1551c911d9d?w=600&auto=format&fit=crop&q=80",
      featured: true,
      active: true,
    },
    {
      name: "Green Fairways Ecological Trust (Sample)",
      description: "Advancing water conservation, native habitat restoration, and eco-friendly turf management across public golf landscapes.",
      website_url: "https://example.org/green-fairways",
      image_url: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&auto=format&fit=crop&q=80",
      featured: false,
      active: true,
    },
    {
      name: "Children's Health & Wellness Alliance (Sample)",
      description: "Funding pediatric cancer research, sports rehabilitation facilities, and healthy lifestyle community initiatives.",
      website_url: "https://example.org/childrens-health",
      image_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
      featured: false,
      active: true,
    },
  ];

  const { data: insertedCharities, error: insertError } = await supabase
    .from("charities")
    .insert(sampleCharities)
    .select();

  if (insertError) {
    console.error("[Seed] Failed to insert charities:", insertError.message);
    process.exit(1);
  }

  console.log(`[Seed] Successfully inserted ${insertedCharities.length} charities.`);

  // Seed sample upcoming charity events
  const sampleEvents = [
    {
      charity_id: insertedCharities[0].id,
      title: "Annual Youth Open Charity Scramble",
      description: "18-hole scramble tournament with celebrity coaches raising funds for youth scholarship gear.",
      event_date: "2026-10-15",
      location: "Bandon Dunes Golf Resort, OR",
    },
    {
      charity_id: insertedCharities[1].id,
      title: "Hero Invitational Pro-Am",
      description: "Charity tournament pairing military veterans with PGA tour mentors and supporters.",
      event_date: "2026-11-08",
      location: "Torrey Pines South, CA",
    },
    {
      charity_id: insertedCharities[2].id,
      title: "Eco-Fairway Sustainability Symposium",
      description: "Panel discussion and walking tour exploring water-recycling and native biodiversity in golf.",
      event_date: "2026-10-28",
      location: "Streamsong Golf Resort, FL",
    },
  ];

  const { error: eventsError } = await supabase.from("charity_events").insert(sampleEvents);

  if (eventsError) {
    console.warn("[Seed] Warning inserting charity events:", eventsError.message);
  } else {
    console.log("[Seed] Successfully inserted upcoming charity events.");
  }
}

seed();

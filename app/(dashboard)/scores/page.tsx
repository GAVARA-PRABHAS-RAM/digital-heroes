import React from "react";
import { requireAuth } from "@/lib/auth/session";
import { getUserScores, getScoreStats } from "@/services/scores/scoreService";
import { ScoresClient } from "@/components/scores/ScoresClient";

export const metadata = {
  title: "Golf Scores | Digital Heroes",
  description: "Track your Stableford golf scores and manage your 5-score rolling average.",
};

export default async function ScoresPage() {
  const auth = await requireAuth();
  const scores = await getUserScores(auth.user.id);
  const stats = await getScoreStats(auth.user.id);

  return <ScoresClient initialScores={scores} initialStats={stats} />;
}

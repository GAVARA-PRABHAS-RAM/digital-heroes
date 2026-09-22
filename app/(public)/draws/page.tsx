import React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getUpcomingDraw,
  getPublishedDraws,
  getUserDrawEntries,
  getUserWinnings,
} from "@/services/draws/drawService";
import { getUserScores } from "@/services/scores/scoreService";
import { SubscriberDrawClient } from "@/components/draws/SubscriberDrawClient";

export const metadata = {
  title: "Monthly Prize Draws | Digital Heroes",
  description: "View monthly prize draws, audited schedules, and verified winning numbers.",
};

export default async function DrawsPage() {
  const user = await getCurrentUser();

  const [upcomingDraw, publishedDraws, userEntries, userWinnings, userScores] = await Promise.all([
    getUpcomingDraw(),
    getPublishedDraws(),
    user ? getUserDrawEntries(user.id) : Promise.resolve([]),
    user ? getUserWinnings(user.id) : Promise.resolve([]),
    user ? getUserScores(user.id) : Promise.resolve([]),
  ]);

  return (
    <SubscriberDrawClient
      isAuthenticated={!!user}
      upcomingDraw={upcomingDraw}
      publishedDraws={publishedDraws}
      userEntries={userEntries}
      userWinnings={userWinnings}
      latestScoresCount={userScores.length}
    />
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Sparkles,
  Ticket,
  Trophy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import { enterDrawAction } from "@/app/actions/draws";
import { formatDate } from "@/lib/utils";
import type { DrawFullDetails, UserEntryWithDraw, UserWinningWithDetails } from "@/services/draws/drawService";

interface SubscriberDrawClientProps {
  isAuthenticated: boolean;
  upcomingDraw: DrawFullDetails | null;
  publishedDraws: DrawFullDetails[];
  userEntries: UserEntryWithDraw[];
  userWinnings: UserWinningWithDetails[];
  latestScoresCount: number;
}

export function SubscriberDrawClient({
  isAuthenticated,
  upcomingDraw,
  publishedDraws,
  userEntries,
  userWinnings,
  latestScoresCount,
}: SubscriberDrawClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Find user's entry for the upcoming draw if exists
  const activeEntry = upcomingDraw
    ? userEntries.find((e) => e.draw_id === upcomingDraw.id)
    : null;

  // Handle enter draw
  const handleEnterDraw = async () => {
    if (!upcomingDraw) return;
    setIsLoading(true);
    setFeedback(null);

    try {
      const result = await enterDrawAction(upcomingDraw.id);

      if (!result.success) {
        setFeedback({ type: "error", message: result.error || "Failed to enter draw." });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        message: "You have successfully entered the upcoming monthly draw with your latest scores!",
      });
      setTimeout(() => setFeedback(null), 5000);
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12">
      <Container>
        {/* Render DashboardNav if subscriber is authenticated */}
        {isAuthenticated && (
          <div className="mb-8">
            <DashboardNav />
          </div>
        )}

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border mb-6 transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="max-w-3xl mx-auto space-y-3 text-center mb-10">
          <Badge variant="outline" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Monthly Rewards Schedule
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Monthly Prize Draws
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Active subscribers participate in monthly 5-number prize draws using tickets derived from
            their latest Stableford scorecards. Match 3, 4, or 5 numbers to win verified cash prizes!
          </p>
        </div>

        {/* Active Upcoming Draw Section */}
        {upcomingDraw ? (
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm overflow-hidden">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="warning" className="text-[10px]">
                      Upcoming Monthly Draw
                    </Badge>
                    <CardTitle className="text-2xl font-bold">
                      Draw Date: {upcomingDraw.draw_month}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Reference #{upcomingDraw.draw_number || upcomingDraw.id.slice(0, 8)} • Draw Type:{" "}
                      <span className="capitalize">{upcomingDraw.draw_type}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="self-start sm:self-auto text-xs font-semibold">
                      Open for Entries
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* User's Ticket status */}
                {isAuthenticated ? (
                  activeEntry ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            Your Active Ticket Entered
                          </span>
                        </div>
                        <Badge variant="success" className="text-[10px]">
                          Confirmed Participant
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeEntry.numbers.map((num, i) => (
                          <div
                            key={i}
                            className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-sm"
                          >
                            <span>{num}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Derived from your latest Stableford scorecards. Numbers are locked for this draw.
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Draw Entry Status
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You have not entered your ticket for this monthly draw cycle yet. Active
                        subscribers can participate using their latest logged rounds.
                      </p>

                      {latestScoresCount > 0 ? (
                        <Button
                          onClick={handleEnterDraw}
                          isLoading={isLoading}
                          size="sm"
                          className="gap-2 text-xs"
                        >
                          <Ticket className="w-3.5 h-3.5" /> Enter Draw with Latest Scores
                        </Button>
                      ) : (
                        <Link href="/scores">
                          <Button size="sm" variant="outline" className="gap-2 text-xs">
                            <Award className="w-3.5 h-3.5" /> Log Score to Qualify for Draw
                          </Button>
                        </Link>
                      )}
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 space-y-2">
                    <p>Sign in to view your tickets and participate in this monthly prize draw.</p>
                    <Link href="/login">
                      <Button size="sm" className="text-xs">
                        Sign In to Participate
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center p-8">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Next Draw Announcing Soon</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                The upcoming monthly draw schedule will be published shortly. Keep your Stableford rounds updated to be ready for entry!
              </p>
            </Card>
          </div>
        )}

        {/* Historical Published Draws */}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Historical Draws ({publishedDraws.length})
            </h2>
            <span className="text-xs text-slate-400">Audited Results & Winning Numbers</span>
          </div>

          {publishedDraws.length > 0 ? (
            <div className="space-y-6">
              {publishedDraws.map((draw) => {
                const userEntryForThisDraw = userEntries.find((e) => e.draw_id === draw.id);
                const winningNums = draw.winning_numbers || [];

                return (
                  <Card key={draw.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold">
                              Draw Month: {draw.draw_month}
                            </CardTitle>
                            <Badge variant="success" className="capitalize text-[10px]">
                              Official Published
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            Draw #{draw.draw_number || draw.id.slice(0, 8)} • Method:{" "}
                            <span className="capitalize">{draw.draw_type}</span>
                          </CardDescription>
                        </div>

                        {draw.published_at && (
                          <span className="text-xs text-slate-400">
                            Audited {formatDate(draw.published_at)}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      {/* Winning Numbers Presentation */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Official Winning Numbers
                        </span>
                        <div className="flex items-center gap-2.5">
                          {winningNums.map((num) => (
                            <div
                              key={num}
                              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-lg shadow-sm"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* User's Ticket Participation Result for this draw */}
                      {userEntryForThisDraw && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Your Ticket & Match Outcomes
                            </span>
                            {userEntryForThisDraw.matchCount && userEntryForThisDraw.matchCount >= 3 ? (
                              <Badge variant="warning" className="gap-1 text-xs">
                                <Trophy className="w-3.5 h-3.5" />
                                {userEntryForThisDraw.matchCount}-Number Winner (Tier {userEntryForThisDraw.tier})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-slate-400">
                                {userEntryForThisDraw.matchCount || 0} Matches
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {userEntryForThisDraw.numbers.map((n) => {
                              const isMatched = winningNums.includes(n);
                              return (
                                <div
                                  key={n}
                                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                    isMatched
                                      ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                                      : "bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  <span>{n}</span>
                                </div>
                              );
                            })}
                          </div>

                          {userEntryForThisDraw.matchCount && userEntryForThisDraw.matchCount >= 3 && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Congratulations! You won a verified prize in this draw!
                              </span>
                              <Link
                                href="/winnings"
                                className="font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                              >
                                View in Winnings <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="w-8 h-8 text-indigo-500" />}
              title="No Historical Draws Published Yet"
              description="Monthly prize draws take place at the end of each billing cycle. When the upcoming draw is simulated and officially published, verified winning numbers will appear here."
            />
          )}
        </div>

        {/* 3 Prize Tiers Explanation */}
        <div className="max-w-3xl mx-auto mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto font-black text-lg">
              5
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tier 5 (40% Jackpot)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matches all 5 numbers. If unawarded, the entire 5-match jackpot rolls over to next month.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto font-black text-lg">
              4
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tier 4 (35% Pool)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matches 4 out of 5 numbers. Split equally among all 4-match participants.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto font-black text-lg">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tier 3 (25% Pool)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matches 3 out of 5 numbers. Split equally among all 3-match participants.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

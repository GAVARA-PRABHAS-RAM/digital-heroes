import React from "react";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getScoreStats } from "@/services/scores/scoreService";
import { getUserCharity } from "@/services/charities/charityService";
import { getUserSubscription } from "@/services/subscriptions/subscriptionService";
import { getUpcomingDraw, getUserDrawEntries } from "@/services/draws/drawService";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  Award,
  CreditCard,
  Gift,
  HeartHandshake,
  User,
  ArrowRight,
  Plus,
  Sparkles,
  Calendar,
  CheckCircle2,
  Sliders,
  Shield,
  TrendingUp,
  Target,
} from "lucide-react";

export const metadata = {
  title: "Dashboard Overview | Digital Heroes",
  description: "Subscriber dashboard with real-time golf scores, charity allocation, and monthly draw status.",
};

export default async function DashboardPage() {
  const auth = await getAuthenticatedUser();
  const userId = auth?.user.id || "";

  const [stats, userCharity, subscription, upcomingDraw, drawEntries] = await Promise.all([
    getScoreStats(userId),
    getUserCharity(userId),
    getUserSubscription(userId),
    getUpcomingDraw(),
    getUserDrawEntries(userId),
  ]);

  const user = auth?.user;
  const profile = auth?.profile;
  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || "Golfer";
  const userEmail = profile?.email || user?.email || "subscriber@example.com";
  const userRole = auth?.role || "subscriber";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-transparent p-6 dark:border-slate-800 dark:from-emerald-950/20 dark:via-indigo-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-sm shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Welcome back, {displayName}
                </h1>
                <Badge variant={userRole === "admin" ? "warning" : "success"} className="capitalize text-[10px]">
                  {userRole}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {userEmail} • Rolling Stableford handicap window & monthly charity allocation active.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/scores">
              <Button size="sm" className="gap-1.5 shadow-sm text-xs">
                <Plus className="w-3.5 h-3.5" /> Log Score
              </Button>
            </Link>
            <Link href="/charity">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <HeartHandshake className="w-3.5 h-3.5" /> Choose Charity
              </Button>
            </Link>
            <Link href="/profile">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <User className="w-3.5 h-3.5" /> Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Rolling Scores"
          value={`${stats.count} / 5`}
          subtitle={stats.count === 5 ? "Rolling window full" : `${5 - stats.count} more to complete`}
          icon={<Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <MetricCard
          title="Stableford Avg"
          value={stats.average !== null ? `${stats.average} pts` : "—"}
          subtitle={stats.best !== null ? `Best: ${stats.best} pts` : "No scores logged yet"}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        />
        <MetricCard
          title="Charity Allocation"
          value={userCharity ? `${userCharity.userCharity.contribution_percentage}%` : "Not Set"}
          subtitle={userCharity ? userCharity.charity.name : "Min 10% required"}
          icon={<HeartHandshake className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
        />
        <MetricCard
          title="Draw Tickets"
          value={drawEntries.length}
          subtitle={upcomingDraw ? `Cycle: ${upcomingDraw.draw_month}` : "Monthly prize draw"}
          icon={<Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        />
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Scores & Charity Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Scores Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base font-bold">Rolling 5 Scorecards</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Your latest 5 Stableford rounds (oldest pruned when 6th is entered).
                  </CardDescription>
                </div>
                <Link href="/scores">
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    Manage Scores <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {stats.scores.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No Golf Scores Recorded Yet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Enter your 18-hole Stableford scores (1–45 pts) to build your rolling average.
                    </p>
                  </div>
                  <Link href="/scores">
                    <Button size="sm" className="text-xs gap-1.5 mt-2">
                      <Plus className="w-3.5 h-3.5" /> Post First Score
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.scores.slice(0, 3).map((score, index) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                          {score.score}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {score.score_date}
                            </span>
                            {index === 0 && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Stableford Score • Round #{index + 1}
                          </span>
                        </div>
                      </div>
                      <Link href="/scores">
                        <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}

                  {stats.scores.length > 3 && (
                    <div className="pt-1 text-center">
                      <Link
                        href="/scores"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        View all {stats.scores.length} rounds in rolling window →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charity Selection Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <CardTitle className="text-base font-bold">Partner Charity Allocation</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Non-profit receiving your monthly subscription contribution (min 10%).
                  </CardDescription>
                </div>
                <Link href="/charity">
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    Manage Charity <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {userCharity ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="success" className="text-[10px] mb-1">
                        Active Allocation
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {userCharity.charity.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {userCharity.charity.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {userCharity.userCharity.contribution_percentage}%
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Of Monthly Sub
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <HeartHandshake className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No Charity Selected
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose a partner organization to allocate at least 10% of your membership fees.
                    </p>
                  </div>
                  <Link href="/charity">
                    <Button size="sm" className="text-xs gap-1.5 mt-2">
                      <HeartHandshake className="w-3.5 h-3.5" /> Choose A Cause
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Subscription & Quick Actions */}
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Subscription Status
                </CardTitle>
                {subscription ? (
                  subscription.cancel_at_period_end ? (
                    <Badge variant="warning" className="text-[10px]">
                      Cancellation Scheduled
                    </Badge>
                  ) : subscription.status === "active" || subscription.status === "trialing" ? (
                    <Badge variant="success" className="text-[10px] capitalize">
                      Active
                    </Badge>
                  ) : subscription.status === "past_due" ? (
                    <Badge variant="warning" className="text-[10px] capitalize">
                      Past Due
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] capitalize">
                      Lapsed
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    No Plan
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {subscription && (subscription.status === "active" || subscription.status === "trialing") ? (
                <>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Plan:</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {subscription.plan === "yearly" ? "Annual Plan (₹14,999)" : "Monthly Plan (₹1,499)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{subscription.cancel_at_period_end ? "Access Ends:" : "Next Renewal:"}</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {subscription.current_period_end || subscription.renewal_date
                        ? formatDate(subscription.current_period_end || subscription.renewal_date)
                        : "Active"}
                    </span>
                  </div>
                  {subscription.cancel_at_period_end && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Cancellation scheduled at end of billing cycle. Access remains active until then.
                    </p>
                  )}
                </>
              ) : subscription && (subscription.status === "cancelled" || subscription.status === "canceled" || subscription.status === "lapsed") ? (
                <div className="space-y-2">
                  <p className="text-rose-600 dark:text-rose-400 font-medium">
                    Your previous membership has ended.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Renew your subscription to continue logging Stableford scores and entering monthly prize draws.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    You do not have an active membership plan. An active subscription is required to earn entries into monthly prize draws and support partner charities.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link href="/subscription" className="w-full">
                <Button
                  variant={subscription?.status === "active" ? "outline" : "primary"}
                  size="sm"
                  className="w-full text-xs gap-1"
                >
                  {subscription?.status === "active" ? "Manage Subscription" : "Subscribe Now (from ₹1,499)"}{" "}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Monthly Draw Hub Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Gift className="w-4 h-4 text-indigo-600" /> Monthly Draw Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Next Draw Cycle:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {upcomingDraw ? upcomingDraw.draw_month : "Monthly Schedule"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Your Active Tickets:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {drawEntries.length} tickets
                </span>
              </div>
              <p className="text-[11px] leading-relaxed pt-1">
                Automated monthly draws award 3 prize tiers based on matched numbers.
              </p>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link href="/winnings" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                  View Winnings & Tickets <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Quick Links */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Subscriber Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Link
                href="/scores"
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
              >
                Log Golf Scores
              </Link>
              <Link
                href="/charity"
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
              >
                Partner Charities
              </Link>
              <Link
                href="/draws"
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
              >
                Monthly Draws
              </Link>
              <Link
                href="/profile"
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-emerald-500 transition-colors text-slate-700 dark:text-slate-200"
              >
                Account Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

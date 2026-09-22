import React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  ArrowRight,
  Award,
  Heart,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 py-8 sm:py-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <Container>
          <div className="relative z-10 mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/60 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Next Generation Charity & Golf Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Elevate Your Game.{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                Win Big.
              </span>{" "}
              Champion Good Causes.
            </h1>

            <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Digital Heroes combines handicap-tracked golf performance with recurring subscription rewards and direct, transparent charitable fundraising.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start Your Membership
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn How It Works
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WHS-aligned score tracking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Transparent monthly draws
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified non-profit partners
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* 3 Core Pillars */}
      <section className="py-8 bg-slate-50/50 dark:bg-slate-900/30 border-y border-slate-200/60 dark:border-slate-800/60">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <Badge variant="outline">The Three Pillars</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              A Platform Built on Purpose
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Every round you play and every subscription fee powers performance recognition, exciting draws, and measurable social good.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Performance */}
            <Card className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <CardTitle>1. Play & Track</CardTitle>
                <CardDescription>
                  Log certified 18-hole scorecards with course rating and slope to earn draw entry multipliers.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>• Course handicap calculations aligned with standard differentials</p>
                <p>• Verified round submissions unlock monthly performance rewards</p>
              </CardContent>
            </Card>

            {/* Pillar 2: Win */}
            <Card className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center justify-center mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle>2. Chance to Win</CardTitle>
                <CardDescription>
                  Participate in transparent monthly draws with guaranteed prize tiers and audited winner draws.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>• Subscription-backed base entries plus skill/activity bonuses</p>
                <p>• Transparent draw results and authenticated verification</p>
              </CardContent>
            </Card>

            {/* Pillar 3: Impact */}
            <Card className="border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center mb-2">
                  <Heart className="w-6 h-6" />
                </div>
                <CardTitle>3. Charity Impact</CardTitle>
                <CardDescription>
                  Direct a defined percentage of your membership to accredited charity partners of your choice.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>• Direct allocation to vetted registered non-profits</p>
                <p>• Transparent reconciliation reports and impact updates</p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* How It Works Overview */}
      <section>
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              How the Ecosystem Operates
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Four straightforward steps from registration to making an impact.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Subscribe & Choose",
                desc: "Choose a membership tier and select which partner charities receive your contribution.",
              },
              {
                step: "02",
                title: "Submit Scores",
                desc: "Post your golf rounds with course and slope ratings to build your verified playing record.",
              },
              {
                step: "03",
                title: "Enter Monthly Draws",
                desc: "Each active month grants you entry tickets, boosted by your playing activity.",
              },
              {
                step: "04",
                title: "Empower Causes",
                desc: "Charity partners receive automated disbursements and transparent impact reports.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900"
              >
                <div className="text-3xl font-black text-slate-200 dark:text-slate-800 mb-2">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Platform CTA */}
      <section>
        <Container>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-8 sm:p-12 text-center relative overflow-hidden shadow-lg">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to Join the Movement?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Become a subscriber today to submit scores, enter monthly draws, and directly support impactful charities.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
                    Get Started Now
                  </Button>
                </Link>
                <Link href="/pricing" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-600 text-white hover:bg-slate-800">
                    View Membership Tiers
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

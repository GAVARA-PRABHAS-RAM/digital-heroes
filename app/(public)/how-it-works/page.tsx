import React from "react";
import { Container } from "@/components/layout/Container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Award, Gift, Heart, Shield } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl mx-auto space-y-4 text-center mb-12">
          <Badge variant="outline">Architecture & Flow</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            How Digital Heroes Works
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            A transparent platform aligning amateur golf performance, monthly prize rewards, and non-profit funding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Award className="w-8 h-8 text-emerald-600 mb-2" />
              <CardTitle>1. Golf Performance & Tracking</CardTitle>
              <CardDescription>
                Subscribers submit authenticated 18-hole scorecards including course rating, slope rating, and gross scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Calculates differentials compatible with standard World Handicap System (WHS) principles.</p>
              <p>• Score activity qualifies subscribers for additional performance draw entries.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Heart className="w-8 h-8 text-rose-500 mb-2" />
              <CardTitle>2. Charity Allocation</CardTitle>
              <CardDescription>
                Every subscriber selects accredited non-profit organizations from our verified directory.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Configurable allocation percentage per user.</p>
              <p>• Recurring monthly contributions are pooled and disbursed transparently.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Gift className="w-8 h-8 text-indigo-600 mb-2" />
              <CardTitle>3. Monthly Draws & Rewards</CardTitle>
              <CardDescription>
                Subscriptions automatically generate monthly draw tickets, augmented by submitted scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Verifiable draw engine executes monthly ticket selection.</p>
              <p>• Prize tiers are published with formal winner verification procedures.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-slate-700 dark:text-slate-300 mb-2" />
              <CardTitle>4. Verification & Transparency</CardTitle>
              <CardDescription>
                To maintain platform integrity, draw winners upload proof documents before payout disbursement.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>• Secure digital scorecard proof submission via Supabase Storage.</p>
              <p>• Administrator review workflow before prize disbursement.</p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}

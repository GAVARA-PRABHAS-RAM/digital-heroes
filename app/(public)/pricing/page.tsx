import React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: "Membership Pricing & Plans | Digital Heroes",
  description: "Flexible Monthly and discounted Annual subscription plans in INR (Indian Rupees).",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const ctaLink = user ? "/subscription" : "/signup";

  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl mx-auto space-y-4 text-center mb-12">
          <Badge variant="outline">Subscription Plans</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Digital Heroes Membership
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Join the golf platform that rewards your performance with cash prizes while funding non-profit charities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <Badge variant="default" className="w-fit mb-2">Flexible</Badge>
              <CardTitle className="text-xl">Monthly Plan</CardTitle>
              <CardDescription>Full access on a flexible month-to-month basis</CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                    ₹1,499
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    / month
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-1">Billed monthly in INR • Cancel anytime</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Standard monthly draw ticket generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3, 4, and 5-number match cash prize eligibility</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Direct charity donation split (minimum 10%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rolling 5-score Stableford handicap tracking</span>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={ctaLink} className="w-full">
                <Button variant="outline" className="w-full">
                  {user ? "Select Monthly Plan" : "Get Started Monthly"}
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Annual Plan (Discounted / Featured) */}
          <Card className="flex flex-col justify-between border-2 border-emerald-500 shadow-lg relative bg-gradient-to-b from-emerald-50/20 to-transparent dark:from-emerald-950/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="success" className="gap-1 shadow-sm px-3 py-1 text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Best Value: Save ₹2,989/yr
              </Badge>
            </div>
            <CardHeader className="pt-7">
              <Badge variant="default" className="w-fit mb-2">Annual Savings</Badge>
              <CardTitle className="text-xl">Annual Plan</CardTitle>
              <CardDescription>Commit for the full season with exclusive savings</CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹14,999
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    / year
                  </span>
                </div>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block mt-1">
                  Save ₹2,989 compared with 12 × ₹1,499 (₹17,988)
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>12 Monthly Draws Guaranteed</strong> (full season)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Maximum charitable contribution impact</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Priority scorecard verification for prize claims</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Annual Plan badge on your member profile</span>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={ctaLink} className="w-full">
                <Button variant="primary" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {user ? "Select Annual Plan" : "Get Started Annually"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          <p>Test Mode active. All amounts displayed in Indian Rupees (INR). Payments powered by Stripe.</p>
        </div>
      </Container>
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { Subscription } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import {
  createCheckoutSessionAction,
  createCustomerPortalAction,
  cancelSubscriptionAction,
} from "@/app/actions/subscriptions";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  ArrowRight,
  Loader2,
  Check,
  RotateCcw,
  ExternalLink,
  Ban,
} from "lucide-react";

interface SubscriptionClientProps {
  subscription: Subscription | null;
}

export function SubscriptionClient({ subscription }: SubscriptionClientProps) {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("status");

  const [isPending, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Status determinations
  const isActive =
    subscription?.status === "active" || subscription?.status === "trialing";
  const isCancelled =
    subscription?.status === "cancelled" || subscription?.status === "canceled";
  const isPastDue = subscription?.status === "past_due";
  const isLapsed =
    subscription?.status === "lapsed" ||
    (isCancelled &&
      subscription?.current_period_end &&
      new Date(subscription.current_period_end).getTime() < Date.now());
  const isCancellationScheduled = Boolean(
    isActive && subscription?.cancel_at_period_end
  );

  const currentPeriodEnd =
    subscription?.current_period_end || subscription?.renewal_date;

  // Handle Checkout creation
  const handleSelectPlan = async (plan: "monthly" | "yearly") => {
    setLoadingPlan(plan);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await createCheckoutSessionAction(plan);
        if (res.success && res.url) {
          window.location.href = res.url;
        } else {
          setErrorMessage(res.error || "Failed to initiate Stripe Checkout.");
          setLoadingPlan(null);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Error initiating checkout.");
        setLoadingPlan(null);
      }
    });
  };

  // Handle Customer Portal
  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setErrorMessage(null);

    try {
      const res = await createCustomerPortalAction();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setErrorMessage(res.error || "Failed to open customer billing portal.");
        setPortalLoading(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Portal error.");
      setPortalLoading(false);
    }
  };

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await cancelSubscriptionAction();
        if (res.success) {
          setIsCancelModalOpen(false);
        } else {
          setErrorMessage(res.error || "Failed to schedule cancellation.");
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Cancellation error.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Feedback Banners */}
      {checkoutStatus === "success" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Payment completed successfully! Your subscription is activating via the Stripe webhook.
            If your status doesn&apos;t update immediately, please refresh in a few seconds.
          </span>
        </div>
      )}

      {checkoutStatus === "cancelled" && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
          <span>Checkout was cancelled. You can choose a membership plan whenever you&apos;re ready.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Subscription View */}
      {isActive && subscription && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">
                      {subscription.plan === "yearly"
                        ? "Annual Plan"
                        : "Monthly Plan"}
                    </CardTitle>
                    <CardDescription>
                      Connected to automated monthly prize draws and partner charity distributions.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCancellationScheduled ? (
                      <Badge variant="warning" className="gap-1">
                        <Clock className="w-3 h-3" /> Cancellation Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Member
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Cancellation Scheduled Alert */}
                {isCancellationScheduled && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Membership Scheduled to End
                    </div>
                    <p className="text-amber-700 dark:text-amber-300">
                      Your subscription will automatically cancel at the end of your billing cycle on{" "}
                      <strong>{formatDate(currentPeriodEnd)}</strong>. You retain full access to monthly
                      draws, scores, and winnings until this date.
                    </p>
                  </div>
                )}

                {/* Plan Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Plan Rate</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {subscription.plan === "yearly" ? "₹14,999" : "₹1,499"}
                    </div>
                    <span className="text-[11px] text-slate-400 capitalize">
                      Billed {subscription.plan === "yearly" ? "annually" : "monthly"} (INR)
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Member Since</span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatDate(subscription.start_date || subscription.created_at)}
                    </div>
                    <span className="text-[11px] text-slate-400">Initial activation date</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isCancellationScheduled ? "Access Expires On" : "Next Renewal Date"}
                    </span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {currentPeriodEnd ? formatDate(currentPeriodEnd) : "Automatic"}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isCancellationScheduled ? "End of paid period" : "Automatic renewal"}
                    </span>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Automatic entry into monthly cash prize draws</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Charity contribution split active for your chosen partner cause</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Attested 5-score rolling Stableford handicap tracking active</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">
                  Stripe Test Subscription: {subscription.stripe_subscription_id || "Active"}
                </div>
                <div className="flex items-center gap-2">
                  {subscription.stripe_customer_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPortal}
                      disabled={portalLoading}
                      className="text-xs gap-1.5"
                    >
                      {portalLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      Billing Portal
                    </Button>
                  )}

                  {!isCancellationScheduled && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="text-xs"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>

            {/* Direct Impact Sidebar */}
            <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Charity Impact
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A minimum of 10% (up to 100%) of every membership charge is remitted directly to your
                selected non-profit partner organization.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Currency: INR (₹)
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Compliant with RBI guidelines for recurring subscriptions.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Unsubscribed or Lapsed State: Plan Selector */}
      {(!isActive || !subscription) && (
        <div className="space-y-8">
          {/* Lapsed Notice if applicable */}
          {isLapsed && (
            <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                <Ban className="w-4 h-4 text-rose-600" />
                Subscription Lapsed / Inactive
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Your previous Digital Heroes subscription has ended. While your past scores, charity records,
                and historical draw results are preserved, an active membership is required to submit new golf
                rounds and participate in upcoming monthly draws.
              </p>
            </div>
          )}

          {!isLapsed && (
            <div className="max-w-2xl mx-auto text-center space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Choose Your Hero Membership
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Unlock monthly cash prize draws, fund non-profit charities, and track your attested Stableford scores.
              </p>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Monthly Plan</CardTitle>
                  <Badge variant="outline">Flexible</Badge>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      ₹1,499
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      / month
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Billed monthly in INR • Cancel anytime
                  </span>
                </div>
                <CardDescription className="text-xs mt-2">
                  Full access with flexible month-to-month billing.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automatic monthly draw ticket generation</span>
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
                  <span>Rolling 5-score Stableford tracking & handicap</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => handleSelectPlan("monthly")}
                  disabled={isPending}
                  className="w-full text-xs font-bold"
                >
                  {loadingPlan === "monthly" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Connecting Stripe Checkout...
                    </>
                  ) : (
                    "Subscribe Monthly — ₹1,499/mo"
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Annual Plan (Featured Discount) */}
            <Card className="flex flex-col justify-between border-2 border-emerald-500 dark:border-emerald-600 shadow-lg relative bg-gradient-to-b from-emerald-50/30 to-transparent dark:from-emerald-950/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="success" className="gap-1 shadow-sm px-3 py-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> Best Value: Save ₹2,989/yr
                </Badge>
              </div>

              <CardHeader className="pt-7">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Annual Plan</CardTitle>
                  <Badge variant="accent">Discounted</Badge>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹14,999
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      / year
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block mt-1">
                    Save ₹2,989 compared with paying 12 × ₹1,499 (₹17,988)
                  </span>
                </div>
                <CardDescription className="text-xs mt-2">
                  Discounted annual membership. Guaranteed 12 monthly draw entries with 2 months free equivalent.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>12 Monthly Draws Guaranteed</strong> (full season participation)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Maximum charitable contribution allocation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Priority verification for prize scorecard claims</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Annual Plan Supporter badge on profile</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="primary"
                  onClick={() => handleSelectPlan("yearly")}
                  disabled={isPending}
                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {loadingPlan === "yearly" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Connecting Stripe Checkout...
                    </>
                  ) : (
                    <>
                      Subscribe Annually — ₹14,999/yr
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="text-center text-xs text-slate-400">
            Secure payments processed via Stripe Test Mode in INR. No real credit card charges are incurred.
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Membership Renewal?"
        description="Your subscription will remain active until the end of your paid billing period."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            If you confirm, cancellation will take effect on{" "}
            <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : "the end of your billing cycle"}</strong>.
            Until that date, you will continue to participate in monthly draws, log scores, and support your chosen charity.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              className="text-xs"
            >
              Keep Membership
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmCancel}
              className="text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Scheduling Cancellation...
                </>
              ) : (
                "Confirm Cancellation at Period End"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

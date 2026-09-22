"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FinancialReportSummary, WinnerWithDetails } from "@/services/winners/winnerService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { markPayoutPaidAction } from "@/app/actions/winners";
import {
  Users,
  Trophy,
  DollarSign,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AdminReportsClientProps {
  summary: FinancialReportSummary & { payoutList: WinnerWithDetails[] };
}

export function AdminReportsClient({ summary }: AdminReportsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleMarkPaid = (winnerId: string) => {
    startTransition(async () => {
      const res = await markPayoutPaidAction(winnerId);
      if (res.success) {
        showFeedback("success", "Payout disbursement recorded as Paid.");
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to mark payout as Paid.");
      }
    });
  };

  const filteredPayouts = summary.payoutList.filter((item) => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const email = item.profile?.email?.toLowerCase() || "";
      const name = item.profile?.full_name?.toLowerCase() || "";
      const ref = item.draw?.draw_number?.toLowerCase() || "";
      if (!email.includes(q) && !name.includes(q) && !ref.includes(q)) {
        return false;
      }
    }

    // Filter
    if (payoutFilter === "pending") return item.payment_status !== "paid";
    if (payoutFilter === "paid") return item.payment_status === "paid";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Primary Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Active Subscribers */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Subscribers
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary.totalSubscribers}
          </div>
          <p className="text-xs text-slate-400">Monthly recurring draw participants</p>
        </div>

        {/* Total Prize Pool */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Prize Pool
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            ${summary.totalPrizePool.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400">Cumulative prize pool across all draw cycles</p>
        </div>

        {/* Total Awarded Winnings */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Awarded Winnings
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${summary.totalWinnings.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400">Total matched prize liabilities calculated</p>
        </div>
      </div>

      {/* Secondary Metrics: Proofs & Payouts Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proof Verification Statistics */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Scorecard Verification Status
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {summary.proofs.total} Documents Uploaded
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </div>
              <div className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-1">
                {summary.proofs.pending}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved
              </div>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                {summary.proofs.approved}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
              <div className="flex items-center justify-center gap-1 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </div>
              <div className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-1">
                {summary.proofs.rejected}
              </div>
            </div>
          </div>
        </Card>

        {/* Payout Cash Liabilities & Reconciliation */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Cash Payout Reconciliation
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              ${summary.payouts.totalAmount.toFixed(2)} Approved Pool
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Pending Disbursals ({summary.payouts.pendingCount})
              </span>
              <div className="text-xl font-bold text-amber-800 dark:text-amber-200">
                ${summary.payouts.pendingAmount.toFixed(2)}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Approved, awaiting release</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Disbursed / Paid ({summary.payouts.paidCount})
              </span>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                ${summary.payouts.paidAmount.toFixed(2)}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Funds transferred</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payout Reconciliation Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Approved Winner Payout Queue
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Approved winning submissions requiring or having completed cash prize payouts.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setPayoutFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  payoutFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({summary.payoutList.length})
              </button>
              <button
                onClick={() => setPayoutFilter("pending")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  payoutFilter === "pending"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({summary.payouts.pendingCount})
              </button>
              <button
                onClick={() => setPayoutFilter("paid")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  payoutFilter === "paid"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Paid ({summary.payouts.paidCount})
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs py-1 h-8"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredPayouts.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Recipient Player</th>
                    <th className="px-4 py-3">Draw Reference</th>
                    <th className="px-4 py-3">Match Tier</th>
                    <th className="px-4 py-3">Prize Amount</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Payout Status</th>
                    <th className="px-4 py-3">Paid Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPayouts.map((item) => {
                    const isPaid = item.payment_status === "paid";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div>{item.profile?.full_name || "Subscriber"}</div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {item.profile?.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                          {item.draw?.draw_number || item.draw?.draw_month || "Monthly Draw"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="accent" className="text-[10px]">
                            {item.match_count} Matches
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ${Number(item.prize_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="text-[10px]">
                            Approved
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isPaid ? "success" : "outline"} className="text-[10px] capitalize">
                            {item.payment_status || "pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {item.payout?.paid_at ? formatDate(item.payout.paid_at) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isPaid ? (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isPending}
                              onClick={() => handleMarkPaid(item.id)}
                              className="text-xs py-1 h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Mark as Paid"
                              )}
                            </Button>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Disbursed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Receipt className="w-8 h-8 text-slate-400" />}
            title="No Payouts in Queue"
            description="No approved winning records match the current filter selection."
          />
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WinnerWithDetails } from "@/services/winners/winnerService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  getSignedProofUrlAction,
  approveWinnerProofAction,
  rejectWinnerProofAction,
  markPayoutPaidAction,
} from "@/app/actions/winners";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  DollarSign,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Ban,
  FileText,
  Loader2,
  Calendar,
  User,
  History,
} from "lucide-react";

interface AdminWinnersClientProps {
  initialWinners: WinnerWithDetails[];
}

type FilterTab = "all" | "needs_review" | "approved" | "rejected" | "pending_payout" | "paid";

export function AdminWinnersClient({ initialWinners }: AdminWinnersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters and search
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback alerts
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Proof inspection modal
  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    winner: WinnerWithDetails | null;
    selectedProofId: string | null;
    imageUrl: string | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    winner: null,
    selectedProofId: null,
    imageUrl: null,
    loading: false,
    error: null,
  });

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    winner: WinnerWithDetails | null;
    reason: string;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    winner: null,
    reason: "",
    loading: false,
    error: null,
  });

  // KPI calculations
  const totalWinners = initialWinners.length;
  const needsReviewCount = initialWinners.filter(
    (w) =>
      w.latestProof &&
      (w.verification_status === "pending" || !w.verification_status)
  ).length;
  const approvedCount = initialWinners.filter((w) => w.verification_status === "approved").length;
  const rejectedCount = initialWinners.filter((w) => w.verification_status === "rejected").length;
  const pendingPayoutCount = initialWinners.filter(
    (w) => w.verification_status === "approved" && w.payment_status !== "paid"
  ).length;
  const paidCount = initialWinners.filter((w) => w.payment_status === "paid").length;

  // Filter logic
  const filteredWinners = initialWinners.filter((w) => {
    // Search matching
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const email = w.profile?.email?.toLowerCase() || "";
      const name = w.profile?.full_name?.toLowerCase() || "";
      const drawNum = w.draw?.draw_number?.toLowerCase() || "";
      const matchesQuery =
        email.includes(query) || name.includes(query) || drawNum.includes(query);
      if (!matchesQuery) return false;
    }

    // Tab filtering
    switch (activeTab) {
      case "needs_review":
        return Boolean(w.latestProof && (w.verification_status === "pending" || !w.verification_status));
      case "approved":
        return w.verification_status === "approved";
      case "rejected":
        return w.verification_status === "rejected";
      case "pending_payout":
        return w.verification_status === "approved" && w.payment_status !== "paid";
      case "paid":
        return w.payment_status === "paid";
      default:
        return true;
    }
  });

  // Open Proof Inspection Modal
  const handleInspectProof = async (winner: WinnerWithDetails, proofId?: string) => {
    const targetProof = proofId
      ? winner.proofs?.find((p) => p.id === proofId)
      : winner.latestProof;

    if (!targetProof) return;

    setInspectModal({
      isOpen: true,
      winner,
      selectedProofId: targetProof.id,
      imageUrl: null,
      loading: true,
      error: null,
    });

    try {
      const res = await getSignedProofUrlAction(targetProof.id);
      if (res.success && res.signedUrl) {
        setInspectModal((prev) => ({
          ...prev,
          imageUrl: res.signedUrl!,
          loading: false,
        }));
      } else {
        setInspectModal((prev) => ({
          ...prev,
          loading: false,
          error: res.error || "Failed to generate secure inspection link.",
        }));
      }
    } catch {
      setInspectModal((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load proof image.",
      }));
    }
  };

  // Switch proof version inside modal
  const handleSwitchProofVersion = async (proofId: string) => {
    if (!inspectModal.winner) return;
    handleInspectProof(inspectModal.winner, proofId);
  };

  // Action: Approve Proof
  const handleApprove = async (winnerId: string, proofId?: string) => {
    startTransition(async () => {
      const res = await approveWinnerProofAction(winnerId, proofId);
      if (res.success) {
        showFeedback("success", "Winner proof approved! Pending payout scheduled.");
        setInspectModal((prev) => ({ ...prev, isOpen: false }));
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to approve proof.");
      }
    });
  };

  // Action: Open Reject Modal
  const handleOpenReject = (winner: WinnerWithDetails) => {
    setRejectModal({
      isOpen: true,
      winner,
      reason: "",
      loading: false,
      error: null,
    });
  };

  // Action: Submit Rejection
  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.winner) return;

    if (!rejectModal.reason.trim()) {
      setRejectModal((prev) => ({ ...prev, error: "Please provide a rejection reason." }));
      return;
    }

    setRejectModal((prev) => ({ ...prev, loading: true, error: null }));

    startTransition(async () => {
      const res = await rejectWinnerProofAction(
        rejectModal.winner!.id,
        rejectModal.reason.trim(),
        rejectModal.winner!.latestProof?.id
      );

      if (res.success) {
        showFeedback("success", "Winner proof marked as rejected. Subscriber notified.");
        setRejectModal({ isOpen: false, winner: null, reason: "", loading: false, error: null });
        setInspectModal((prev) => ({ ...prev, isOpen: false }));
        router.refresh();
      } else {
        setRejectModal((prev) => ({
          ...prev,
          loading: false,
          error: res.error || "Failed to reject proof.",
        }));
      }
    });
  };

  // Action: Mark as Paid
  const handleMarkPaid = async (winnerId: string) => {
    startTransition(async () => {
      const res = await markPayoutPaidAction(winnerId);
      if (res.success) {
        showFeedback("success", "Winner payout successfully marked as Paid!");
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to process payout.");
      }
    });
  };

  return (
    <div className="space-y-6">
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

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Winners</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalWinners}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Needs Review</span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{needsReviewCount}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Approved</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedCount}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Rejected</span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{rejectedCount}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase">Pending Payout</span>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{pendingPayoutCount}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Paid Out</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{paidCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto text-xs font-semibold">
          {[
            { id: "all", label: "All Winners", count: totalWinners },
            { id: "needs_review", label: "Needs Review", count: needsReviewCount },
            { id: "approved", label: "Approved", count: approvedCount },
            { id: "rejected", label: "Rejected", count: rejectedCount },
            { id: "pending_payout", label: "Pending Payout", count: pendingPayoutCount },
            { id: "paid", label: "Paid", count: paidCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search email, name, draw..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Winners List / Table */}
      {filteredWinners.length > 0 ? (
        <div className="grid gap-4">
          {filteredWinners.map((winner) => {
            const isApproved = winner.verification_status === "approved";
            const isRejected = winner.verification_status === "rejected";
            const isPaid = winner.payment_status === "paid";
            const hasProof = Boolean(winner.latestProof);
            const proofCount = winner.proofs?.length || 0;

            return (
              <Card key={winner.id} className="p-5 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Winner info & Match details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-slate-900 dark:text-white">
                        {winner.profile?.full_name || "Digital Heroes Player"}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({winner.profile?.email || "No email"})
                      </span>
                      <Badge variant="accent" className="text-xs">
                        {winner.match_count} Matches (Tier {winner.prize?.tier || (winner.match_count === 5 ? 1 : winner.match_count === 4 ? 2 : 3)})
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Draw: <strong className="text-slate-700 dark:text-slate-300">{winner.draw?.draw_number || "DH-DRAW"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Month: <strong className="text-slate-700 dark:text-slate-300">{winner.draw?.draw_month || "Monthly"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Awarded: <strong className="text-slate-700 dark:text-slate-300">{formatDate(winner.created_at)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Prize: <strong className="text-emerald-600 font-bold">${Number(winner.prize_amount).toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Proof notes & Rejection reason preview */}
                    {isRejected && winner.latestProof?.review_notes && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300">
                        <strong>Rejection Reason:</strong> {winner.latestProof.review_notes}
                      </div>
                    )}
                  </div>

                  {/* Middle: Badges */}
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <Badge variant="success" className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : isRejected ? (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Proof Rejected
                        </Badge>
                      ) : hasProof ? (
                        <Badge variant="warning" className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Proof Needs Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          No Proof Uploaded
                        </Badge>
                      )}

                      <Badge
                        variant={isPaid ? "success" : "outline"}
                        className="text-xs capitalize"
                      >
                        Payout: {winner.payment_status || "pending"}
                      </Badge>
                    </div>

                    {proofCount > 1 && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {proofCount} submissions (Audit History)
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* View Proof Button */}
                    {hasProof && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInspectProof(winner)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Inspect Proof
                      </Button>
                    )}

                    {/* Approve Button */}
                    {!isApproved && hasProof && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleApprove(winner.id, winner.latestProof?.id)}
                        className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    )}

                    {/* Reject Button */}
                    {!isRejected && hasProof && !isPaid && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleOpenReject(winner)}
                        className="text-xs"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    )}

                    {/* Mark as Paid Button (Strictly gated to verification approved) */}
                    {!isPaid ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isPending || !isApproved}
                        onClick={() => handleMarkPaid(winner.id)}
                        title={
                          !isApproved
                            ? "Winner must be verified and approved before marking payout as Paid."
                            : "Mark prize payout as Paid"
                        }
                        className="text-xs"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                        Mark Paid
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Disbursed
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy className="w-8 h-8 text-slate-400" />}
          title="No Winners Found"
          description={
            searchQuery
              ? `No winner records matching query "${searchQuery}".`
              : "No winning participants found in this filter category."
          }
        />
      )}

      {/* Inspect Proof Modal */}
      <Modal
        isOpen={inspectModal.isOpen}
        onClose={() => setInspectModal((prev) => ({ ...prev, isOpen: false, imageUrl: null }))}
        title={`Winner Scorecard Verification — ${inspectModal.winner?.profile?.full_name || "Winner"}`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {inspectModal.loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500">Generating secure ephemeral inspection link...</p>
            </div>
          )}

          {inspectModal.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {inspectModal.error}
            </div>
          )}

          {inspectModal.imageUrl && (
            <div className="space-y-4">
              {/* Audit history switcher if winner uploaded multiple proofs */}
              {inspectModal.winner && inspectModal.winner.proofs && inspectModal.winner.proofs.length > 1 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    Proof Audit History ({inspectModal.winner.proofs.length} Submissions)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {inspectModal.winner.proofs.map((proof, idx) => {
                      const isSelected = proof.id === inspectModal.selectedProofId;
                      return (
                        <button
                          key={proof.id}
                          onClick={() => handleSwitchProofVersion(proof.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <span>Version #{inspectModal.winner!.proofs!.length - idx}</span>
                          <Badge
                            variant={
                              proof.status === "approved"
                                ? "success"
                                : proof.status === "rejected"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[9px] py-0 px-1 capitalize"
                          >
                            {proof.status || "pending"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proof Image Box */}
              <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/10 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inspectModal.imageUrl}
                  alt="Winner Scorecard Proof"
                  className="max-w-full h-auto rounded-lg object-contain"
                />
              </div>

              {/* Action row within modal */}
              {inspectModal.winner && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500">
                    Prize: <strong className="text-emerald-600">${Number(inspectModal.winner.prize_amount).toFixed(2)}</strong> ({inspectModal.winner.match_count} matches)
                  </div>
                  <div className="flex items-center gap-2">
                    {inspectModal.winner.verification_status !== "approved" && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          handleApprove(
                            inspectModal.winner!.id,
                            inspectModal.selectedProofId || undefined
                          )
                        }
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve Proof
                      </Button>
                    )}
                    {inspectModal.winner.verification_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleOpenReject(inspectModal.winner!)}
                        className="text-xs"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Reject Proof
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Rejection Modal with Mandatory Reason */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() =>
          setRejectModal({ isOpen: false, winner: null, reason: "", loading: false, error: null })
        }
        title="Reject Scorecard Proof"
        description="Provide a clear, detailed reason for rejecting this winner's proof scorecard. The reason will be visible to the subscriber so they can upload an appropriate replacement."
      >
        <form onSubmit={handleSubmitReject} className="space-y-4">
          {rejectModal.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {rejectModal.error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Scorecard photo is blurry and illegible. Player name and competition date are cropped out."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRejectModal({ isOpen: false, winner: null, reason: "", loading: false, error: null })
              }
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={rejectModal.loading || !rejectModal.reason.trim()}
              className="text-xs"
            >
              {rejectModal.loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

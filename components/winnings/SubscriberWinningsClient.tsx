"use client";

import React, { useState, useTransition } from "react";
import type { WinnerWithDetails } from "@/services/winners/winnerService";
import type { UserEntryWithDraw } from "@/services/draws/drawService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  uploadWinnerProofAction,
  getSignedProofUrlAction,
} from "@/app/actions/winners";
import {
  Trophy,
  Ticket,
  Gift,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  ShieldCheck,
  DollarSign,
  Loader2,
} from "lucide-react";

interface SubscriberWinningsClientProps {
  winnings: WinnerWithDetails[];
  entries: UserEntryWithDraw[];
}

export function SubscriberWinningsClient({
  winnings,
  entries,
}: SubscriberWinningsClientProps) {
  const [isPending, startTransition] = useTransition();

  // Modal state for viewing signed proof images
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    title: string;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    imageUrl: null,
    title: "",
    loading: false,
    error: null,
  });

  // Upload form state per winner
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadSuccesses, setUploadSuccesses] = useState<Record<string, string>>({});

  // Summary KPI calculations
  const totalPrizesCount = winnings.length;
  const approvedCount = winnings.filter((w) => w.verification_status === "approved").length;
  const pendingVerificationCount = winnings.filter(
    (w) => w.verification_status === "pending" || !w.verification_status
  ).length;
  const totalPaidCash = winnings
    .filter((w) => w.payment_status === "paid")
    .reduce((sum, w) => sum + Number(w.prize_amount || 0), 0);
  const totalWonCash = winnings.reduce((sum, w) => sum + Number(w.prize_amount || 0), 0);

  // Open Proof Viewer Modal via ephemeral signed URL
  const handleViewProof = async (proofId: string, title: string) => {
    setViewModal({
      isOpen: true,
      imageUrl: null,
      title,
      loading: true,
      error: null,
    });

    try {
      const res = await getSignedProofUrlAction(proofId);
      if (res.success && res.signedUrl) {
        setViewModal((prev) => ({
          ...prev,
          imageUrl: res.signedUrl!,
          loading: false,
        }));
      } else {
        setViewModal((prev) => ({
          ...prev,
          loading: false,
          error: res.error || "Failed to generate secure preview URL.",
        }));
      }
    } catch {
      setViewModal((prev) => ({
        ...prev,
        loading: false,
        error: "An unexpected error occurred while loading proof.",
      }));
    }
  };

  // Handle file selection
  const handleFileChange = (winnerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadErrors((prev) => ({ ...prev, [winnerId]: "" }));
    setUploadSuccesses((prev) => ({ ...prev, [winnerId]: "" }));

    if (!file) return;

    // Validate MIME
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadErrors((prev) => ({
        ...prev,
        [winnerId]: "Invalid file type. Please upload a PNG, JPEG, or WebP image.",
      }));
      return;
    }

    // Validate 5MB limit
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadErrors((prev) => ({
        ...prev,
        [winnerId]: "File is too large. Maximum allowed size is 5MB.",
      }));
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [winnerId]: file }));
  };

  // Submit proof upload
  const handleUploadProof = async (winnerId: string) => {
    const file = selectedFiles[winnerId];
    if (!file) {
      setUploadErrors((prev) => ({
        ...prev,
        [winnerId]: "Please select an image file first.",
      }));
      return;
    }

    setUploadErrors((prev) => ({ ...prev, [winnerId]: "" }));
    setUploadSuccesses((prev) => ({ ...prev, [winnerId]: "" }));

    const formData = new FormData();
    formData.append("winnerId", winnerId);
    formData.append("proof", file);

    startTransition(async () => {
      const result = await uploadWinnerProofAction(formData);
      if (result.success) {
        setUploadSuccesses((prev) => ({
          ...prev,
          [winnerId]: "Scorecard proof uploaded successfully! Awaiting administrator review.",
        }));
        setSelectedFiles((prev) => {
          const next = { ...prev };
          delete next[winnerId];
          return next;
        });
      } else {
        setUploadErrors((prev) => ({
          ...prev,
          [winnerId]: result.error || "Failed to upload proof.",
        }));
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Prizes Won
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalPrizesCount}
          </div>
          <span className="text-[11px] text-slate-400">Total match payouts awarded</span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Verification
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {pendingVerificationCount}
          </div>
          <span className="text-[11px] text-slate-400">Awaiting scorecard review</span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Verified Prizes
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {approvedCount}
          </div>
          <span className="text-[11px] text-slate-400">Approved for payment</span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Cash Disbursed
          </span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            ${totalPaidCash.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">
            Out of ${totalWonCash.toFixed(2)} won
          </span>
        </div>
      </div>

      {/* Prize Winnings & Proof Upload Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Prize Winnings & Verification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit your official scorecard screenshot for verification to unlock your cash payout.
          </p>
        </div>

        {winnings.length > 0 ? (
          <div className="grid gap-5">
            {winnings.map((w) => {
              const latestProof = w.latestProof;
              const hasProof = Boolean(latestProof);
              const isApproved = w.verification_status === "approved";
              const isRejected = w.verification_status === "rejected";
              const isPendingVerif = !isApproved && !isRejected;
              const isPaid = w.payment_status === "paid";

              return (
                <Card key={w.id} className="p-6 border-slate-200 dark:border-slate-800">
                  <div className="space-y-5">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            {w.match_count}-Number Match Prize
                          </span>
                          <Badge variant="accent" className="text-xs">
                            Tier {w.prize?.tier || (w.match_count === 5 ? 1 : w.match_count === 4 ? 2 : 3)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            Draw Reference:{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {w.draw?.draw_number || "DH-DRAW"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Draw Date:{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {formatDate(w.draw?.published_at || w.draw?.draw_month)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Cycle:{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {w.draw?.draw_month || "Monthly"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Prize Amount & Status Badges */}
                      <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2">
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          ${Number(w.prize_amount).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isApproved ? (
                            <Badge variant="success" className="text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </Badge>
                          ) : isRejected ? (
                            <Badge variant="destructive" className="text-[11px] flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Proof Rejected
                            </Badge>
                          ) : hasProof ? (
                            <Badge variant="warning" className="text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Under Review
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Proof Needed
                            </Badge>
                          )}

                          <Badge
                            variant={isPaid ? "success" : "outline"}
                            className="text-[11px] capitalize"
                          >
                            Payment: {w.payment_status || "pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Verification & Proof State Body */}
                    <div>
                      {/* STATE 1: APPROVED */}
                      {isApproved && (
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-3">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                                Scorecard Verified & Approved!
                              </h4>
                              <p className="text-emerald-700 dark:text-emerald-300">
                                {isPaid
                                  ? `Your cash prize of $${Number(w.prize_amount).toFixed(
                                      2
                                    )} has been fully disbursed and paid out.`
                                  : "Your scorecard verification is complete. Payout processing is underway and cash will be disbursed to your account."}
                              </p>
                              {w.payout?.paid_at && (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Paid Date: {formatDate(w.payout.paid_at)}
                                </p>
                              )}
                            </div>
                          </div>

                          {latestProof && (
                            <div className="pt-1 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200"
                                onClick={() =>
                                  handleViewProof(
                                    latestProof.id,
                                    `Verified Scorecard Proof - ${w.draw?.draw_number}`
                                  )
                                }
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                View Verified Scorecard
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* STATE 2: REJECTED (Allows Replacement Upload) */}
                      {isRejected && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 space-y-2">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="text-xs space-y-1.5 flex-1">
                                <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                                  Proof Rejected by Administrator
                                </h4>
                                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/60">
                                  <span className="font-semibold text-rose-800 dark:text-rose-300">
                                    Admin Rejection Reason:
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 italic">
                                    &ldquo;{latestProof?.review_notes || "The uploaded document did not meet verification criteria. Please provide a clear, legible scorecard."}&rdquo;
                                  </p>
                                </div>
                                <p className="text-rose-700 dark:text-rose-300">
                                  Please upload a replacement scorecard photo or screenshot below. Your previous submission has been preserved in audit history.
                                </p>
                              </div>
                            </div>

                            {latestProof && (
                              <div className="pl-8 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200"
                                  onClick={() =>
                                    handleViewProof(
                                      latestProof.id,
                                      `Previous Rejected Scorecard - ${w.draw?.draw_number}`
                                    )
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  View Previous Submission
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Replacement Upload Form */}
                          <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/10 space-y-3">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <UploadCloud className="w-4 h-4 text-amber-600" />
                              Upload Replacement Scorecard Proof
                            </h5>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={(e) => handleFileChange(w.id, e)}
                                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer dark:file:bg-slate-100 dark:file:text-slate-900"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUploadProof(w.id)}
                                disabled={isPending || !selectedFiles[w.id]}
                                className="text-xs"
                              >
                                {isPending ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  "Submit Replacement Proof"
                                )}
                              </Button>
                            </div>
                            {uploadErrors[w.id] && (
                              <p className="text-xs text-rose-600 font-medium">
                                {uploadErrors[w.id]}
                              </p>
                            )}
                            {uploadSuccesses[w.id] && (
                              <p className="text-xs text-emerald-600 font-medium">
                                {uploadSuccesses[w.id]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* STATE 3: PENDING WITH PROOF UPLOADED (Under Review) */}
                      {isPendingVerif && hasProof && (
                        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-3">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                                Scorecard Proof Submitted — Awaiting Review
                              </h4>
                              <p className="text-amber-700 dark:text-amber-300">
                                Your scorecard proof was uploaded on{" "}
                                <strong>{formatDate(latestProof!.uploaded_at)}</strong> and is currently being audited by our verification team. You will be notified once reviewed.
                              </p>
                            </div>
                          </div>

                          <div className="pt-1 flex flex-wrap items-center gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
                              onClick={() =>
                                handleViewProof(
                                  latestProof!.id,
                                  `Submitted Scorecard Proof - ${w.draw?.draw_number}`
                                )
                              }
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              View Uploaded Scorecard
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* STATE 4: PENDING WITHOUT PROOF (Needs Initial Upload) */}
                      {isPendingVerif && !hasProof && (
                        <div className="p-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 dark:border-indigo-800/60 dark:bg-indigo-950/10 space-y-3">
                          <div className="flex items-start gap-3">
                            <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">
                                Proof of Scorecard Required
                              </h4>
                              <p className="text-slate-600 dark:text-slate-300">
                                Congratulations on your winning draw! To claim your cash prize of{" "}
                                <strong>${Number(w.prize_amount).toFixed(2)}</strong>, please upload a photo or screenshot of your signed golf scorecard confirming your Stableford scores.
                              </p>
                              <span className="text-[11px] text-slate-400">
                                Supported formats: PNG, JPEG, WebP (Max 5MB). Stored securely in encrypted private storage.
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(e) => handleFileChange(w.id, e)}
                              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer dark:file:bg-slate-100 dark:file:text-slate-900"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUploadProof(w.id)}
                              disabled={isPending || !selectedFiles[w.id]}
                              className="text-xs"
                            >
                              {isPending ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                "Submit Scorecard Proof"
                              )}
                            </Button>
                          </div>
                          {uploadErrors[w.id] && (
                            <p className="text-xs text-rose-600 font-medium">
                              {uploadErrors[w.id]}
                            </p>
                          )}
                          {uploadSuccesses[w.id] && (
                            <p className="text-xs text-emerald-600 font-medium">
                              {uploadSuccesses[w.id]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Gift className="w-8 h-8 text-indigo-500" />}
            title="No Draw Winnings Recorded"
            description="When monthly draws are conducted and your allocated tickets match 3, 4, or 5 winning numbers, your cash prize claims will appear here for verification and payout."
          />
        )}
      </div>

      {/* Allocated Draw Tickets Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            Your Allocated Draw Tickets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tickets generated for past and upcoming monthly draws. Only 3, 4, and 5-number match tickets qualify for cash prizes.
          </p>
        </div>

        {entries.length > 0 ? (
          <div className="grid gap-3">
            {entries.map((entry) => {
              const isPublished =
                entry.draw?.status === "published" || entry.draw?.status === "completed";
              const matchCount = entry.matchCount ?? 0;
              const isWinner = matchCount >= 3;

              return (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Numbers: [{entry.numbers.join(", ")}]
                        </span>
                        {isPublished && (
                          <Badge
                            variant={isWinner ? "success" : "default"}
                            className="text-[10px]"
                          >
                            {matchCount} Matches
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400">
                        Draw: {entry.draw?.draw_number || entry.draw?.draw_month || "Monthly Draw"} • Allocated on {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {isPublished ? (
                      isWinner ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Prize Claim Generated
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          No prize won ({matchCount} matches)
                        </span>
                      )
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Allocated for Draw
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 text-center space-y-2">
            <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Tickets Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tickets are automatically generated when you submit your golf scores and participate in active draws.
            </p>
          </div>
        )}
      </div>

      {/* Ephemeral Signed URL Modal Viewer */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal((prev) => ({ ...prev, isOpen: false, imageUrl: null }))}
        title={viewModal.title}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {viewModal.loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500">Retrieving secure signed proof document...</p>
            </div>
          )}

          {viewModal.error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {viewModal.error}
            </div>
          )}

          {viewModal.imageUrl && (
            <div className="space-y-3">
              <div className="max-h-[500px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/10 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewModal.imageUrl}
                  alt="Winner Proof Scorecard"
                  className="max-w-full h-auto rounded-lg object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Secure temporary preview. Link expires automatically after 1 hour.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

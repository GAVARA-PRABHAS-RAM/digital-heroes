"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Sparkles,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Users,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  createDrawAction,
  simulateDrawAction,
  publishDrawAction,
} from "@/app/actions/draws";
import { formatDate } from "@/lib/utils";
import type { DrawFullDetails, SimulationResult } from "@/services/draws/drawService";

interface AdminDrawsClientProps {
  initialDraws: DrawFullDetails[];
  activeSubscribersCount: number;
}

export function AdminDrawsClient({
  initialDraws,
  activeSubscribersCount,
}: AdminDrawsClientProps) {
  const router = useRouter();

  // Create Draw Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [createMonth, setCreateMonth] = useState(todayStr.slice(0, 7) + "-28");
  const [createType, setCreateType] = useState<"random" | "algorithmic">("random");
  const [createNumber, setCreateNumber] = useState("");
  const [createPrizePct, setCreatePrizePct] = useState<number>(50);

  // Active Draw Simulation Inspection
  const [selectedDraw, setSelectedDraw] = useState<DrawFullDetails | null>(
    initialDraws.length > 0 ? initialDraws[0] : null
  );
  const [simType, setSimType] = useState<"random" | "algorithmic">("random");
  const [simPrizePct, setSimPrizePct] = useState<number>(50);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Publish Modal
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const clearFeedback = () => {
    setTimeout(() => setFeedback(null), 5000);
  };

  // Handle Create Draw
  const handleCreateDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createDrawAction({
        draw_month: createMonth,
        draw_type: createType,
        draw_number: createNumber.trim() || undefined,
        prize_pool_percentage: createPrizePct,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error || "Failed to create draw." });
        setIsLoading(false);
        return;
      }

      setIsCreateOpen(false);
      setFeedback({ type: "success", message: "Monthly draw successfully scheduled!" });
      clearFeedback();
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Error creating draw." });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Simulate Draw
  const handleSimulateDraw = async () => {
    if (!selectedDraw) return;
    setIsLoading(true);

    try {
      const result = await simulateDrawAction(selectedDraw.id, {
        draw_type: simType,
        prize_pool_percentage: simPrizePct,
      });

      if (!result.success || !result.simulation) {
        setFeedback({ type: "error", message: result.error || "Failed to simulate draw." });
        setIsLoading(false);
        return;
      }

      setSimulationResult(result.simulation);
      setFeedback({
        type: "success",
        message: `Draw simulated successfully! Generated 5 balls via ${result.simulation.drawType} generation.`,
      });
      clearFeedback();
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Error simulating draw." });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Publish Draw
  const handlePublishDraw = async () => {
    if (!selectedDraw) return;
    setIsLoading(true);

    try {
      const result = await publishDrawAction(selectedDraw.id);

      if (!result.success) {
        setFeedback({ type: "error", message: result.error || "Failed to publish draw." });
        setIsLoading(false);
        return;
      }

      setIsPublishOpen(false);
      setFeedback({
        type: "success",
        message: "Draw published! Winning numbers, prize payouts, and winner records are now official and immutable.",
      });
      clearFeedback();
      router.refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Error publishing draw." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Draw & Prize Engine Management"
        description="Schedule monthly prize draws, configure subscription prize-pool percentages, simulate random or score-frequency weighted draws, and publish audited winning numbers."
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Schedule New Draw
          </Button>
        }
      />

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
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

      {/* PRD Assumption Callout */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">PRD Ambiguity Note & Configurable Architecture:</span>{" "}
          The Level 1 PRD specifies that a fixed portion of monthly subscriptions funds the prize
          pool, but does not define the exact percentage. This application provides a configurable
          prize-pool contribution rate (defaulting to <strong>50.00%</strong> of active subscriptions),
          persisted on each draw record for full accounting auditability.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scheduled Draws List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Scheduled Draws ({initialDraws.length})
            </h2>
            <Badge variant="outline" className="text-[10px]">
              Active Subscribers: {activeSubscribersCount}
            </Badge>
          </div>

          {initialDraws.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-8 h-8 text-indigo-500" />}
              title="No Draws Scheduled"
              description="Create your first monthly draw to begin ticket allocation and simulation."
              action={
                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Schedule First Draw
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {initialDraws.map((draw) => {
                const isSelected = selectedDraw?.id === draw.id;
                const winningNums = draw.winning_numbers;

                return (
                  <div
                    key={draw.id}
                    onClick={() => {
                      setSelectedDraw(draw);
                      setSimulationResult(null);
                      setSimType((draw.draw_type as "random" | "algorithmic") || "random");
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/30 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Draw Cycle: {draw.draw_month}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Ref: {draw.draw_number || draw.id.slice(0, 8)} • {draw.draw_type}
                        </p>
                      </div>
                      <Badge
                        variant={
                          draw.status === "published"
                            ? "success"
                            : draw.status === "simulated"
                            ? "warning"
                            : "outline"
                        }
                        className="capitalize text-[10px]"
                      >
                        {draw.status}
                      </Badge>
                    </div>

                    {winningNums && winningNums.length === 5 && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                          Balls:
                        </span>
                        {winningNums.map((n) => (
                          <div
                            key={n}
                            className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center justify-center"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Columns: Draw Console & Simulation Engine */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDraw ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-bold">
                        Draw: {selectedDraw.draw_month} ({selectedDraw.draw_number || "DH-ACTIVE"})
                      </CardTitle>
                      <Badge
                        variant={
                          selectedDraw.status === "published"
                            ? "success"
                            : selectedDraw.status === "simulated"
                            ? "warning"
                            : "outline"
                        }
                        className="capitalize text-xs"
                      >
                        {selectedDraw.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Generation Method: <span className="font-semibold capitalize">{selectedDraw.draw_type}</span> • Status: {selectedDraw.status}
                    </CardDescription>
                  </div>

                  {selectedDraw.status !== "published" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSimulateDraw}
                        isLoading={isLoading}
                        className="gap-1.5 text-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-indigo-600" />
                        {selectedDraw.status === "simulated" ? "Re-Simulate" : "Simulate Draw"}
                      </Button>
                      {selectedDraw.status === "simulated" && (
                        <Button
                          size="sm"
                          onClick={() => setIsPublishOpen(true)}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Publish Results
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Status Notice */}
                {selectedDraw.status === "published" ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Published & Immutable:</span> This draw was officialized
                      on {selectedDraw.published_at ? formatDate(selectedDraw.published_at) : "today"}.
                      Winning numbers and prize allocations are locked and published to subscribers.
                    </div>
                  </div>
                ) : (
                  /* Simulation Configuration Panel */
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/60 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Simulation Parameters
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Generation Algorithm
                        </label>
                        <select
                          value={simType}
                          onChange={(e) => setSimType(e.target.value as "random" | "algorithmic")}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs dark:bg-slate-900 dark:border-slate-700 font-medium"
                        >
                          <option value="random">Random (Crypto-safe RNG 1–45)</option>
                          <option value="algorithmic">Algorithmic (Score-frequency weighted)</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Algorithmic mode weighs candidate numbers according to recent community Stableford scores.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Prize Pool Allocation (%)
                        </label>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          value={simPrizePct}
                          onChange={(e) => setSimPrizePct(Number(e.target.value))}
                          className="text-xs font-semibold"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Percentage of monthly subscription revenues dedicated to prize pool (default 50%).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Winning Numbers Presentation */}
                {(simulationResult?.winningNumbers || selectedDraw.winning_numbers) && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {selectedDraw.status === "published" ? "Official Winning Numbers" : "Simulated Winning Numbers"}
                    </span>
                    <div className="flex items-center gap-3">
                      {(simulationResult?.winningNumbers || selectedDraw.winning_numbers || []).map(
                        (num, idx) => (
                          <div
                            key={num}
                            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md"
                          >
                            <span className="text-xl font-black">{num}</span>
                            <span className="text-[9px] uppercase font-bold opacity-80">Ball {idx + 1}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Prize Breakdown & Rollover Details */}
                {simulationResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-slate-400">Total Prize Pool</span>
                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                          ${simulationResult.prizeDistribution.totalPrizePoolWithRollover.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Base: ${simulationResult.prizeDistribution.basePrizePool.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400">Previous Rollover Added</span>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          ${simulationResult.prizeDistribution.previousRolloverAdded.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">From prior unawarded jackpot</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Next Rollover Forward</span>
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          ${simulationResult.prizeDistribution.nextRolloverAmount.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {simulationResult.prizeDistribution.nextRolloverAmount > 0
                            ? "Carried to next month"
                            : "Jackpot claimed!"}
                        </span>
                      </div>
                    </div>

                    {/* Tiers Table */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Tier Distributions & Multiple Winner Splitting
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Tier</th>
                              <th className="p-3">Allocation</th>
                              <th className="p-3">Total Tier Pool</th>
                              <th className="p-3">Winners</th>
                              <th className="p-3">Amount / Winner</th>
                              <th className="p-3">Rollover Forward</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                Tier 5 (5-Match)
                              </td>
                              <td className="p-3">40% + Rollover</td>
                              <td className="p-3 font-semibold">
                                ${simulationResult.prizeDistribution.tiers.tier5.totalPool.toFixed(2)}
                              </td>
                              <td className="p-3 font-bold text-emerald-600">
                                {simulationResult.prizeDistribution.tiers.tier5.winnerCount}
                              </td>
                              <td className="p-3 font-bold">
                                ${simulationResult.prizeDistribution.tiers.tier5.amountPerWinner.toFixed(2)}
                              </td>
                              <td className="p-3 font-semibold text-amber-600">
                                ${simulationResult.prizeDistribution.tiers.tier5.rolloverForward.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                Tier 4 (4-Match)
                              </td>
                              <td className="p-3">35%</td>
                              <td className="p-3 font-semibold">
                                ${simulationResult.prizeDistribution.tiers.tier4.totalPool.toFixed(2)}
                              </td>
                              <td className="p-3 font-bold text-emerald-600">
                                {simulationResult.prizeDistribution.tiers.tier4.winnerCount}
                              </td>
                              <td className="p-3 font-bold">
                                ${simulationResult.prizeDistribution.tiers.tier4.amountPerWinner.toFixed(2)}
                              </td>
                              <td className="p-3 text-slate-400">—</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                Tier 3 (3-Match)
                              </td>
                              <td className="p-3">25%</td>
                              <td className="p-3 font-semibold">
                                ${simulationResult.prizeDistribution.tiers.tier3.totalPool.toFixed(2)}
                              </td>
                              <td className="p-3 font-bold text-emerald-600">
                                {simulationResult.prizeDistribution.tiers.tier3.winnerCount}
                              </td>
                              <td className="p-3 font-bold">
                                ${simulationResult.prizeDistribution.tiers.tier3.amountPerWinner.toFixed(2)}
                              </td>
                              <td className="p-3 text-slate-400">—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-10 text-center text-slate-400">
              Select or schedule a draw from the list to begin simulation and prize calculation.
            </Card>
          )}
        </div>
      </div>

      {/* Schedule Draw Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isLoading) setIsCreateOpen(false);
        }}
        title="Schedule Monthly Prize Draw"
        description="Set up an active draw period. Draw numbers will remain hidden until simulated and published."
      >
        <form onSubmit={handleCreateDraw} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Draw Month / Scheduled Date
            </label>
            <Input
              type="date"
              value={createMonth}
              onChange={(e) => setCreateMonth(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Generation Method
            </label>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as "random" | "algorithmic")}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs dark:bg-slate-900 dark:border-slate-700 font-medium"
            >
              <option value="random">Random (Crypto-safe RNG 1–45)</option>
              <option value="algorithmic">Algorithmic (Score-frequency weighted)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Draw Reference Code (Optional)
            </label>
            <Input
              type="text"
              value={createNumber}
              onChange={(e) => setCreateNumber(e.target.value)}
              placeholder="e.g. DH-202609"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subscription Prize-Pool Contribution Rate (%)
            </label>
            <Input
              type="number"
              min={10}
              max={100}
              value={createPrizePct}
              onChange={(e) => setCreatePrizePct(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Configurable percentage (default 50%). Persisted to guarantee reproducible audit logs.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Draw
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={isPublishOpen}
        onClose={() => {
          if (!isLoading) setIsPublishOpen(false);
        }}
        title="Publish Official Draw Results"
        description="Are you sure you want to lock and publish this monthly draw? This operation cannot be undone."
      >
        <div className="space-y-4 pt-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold">Permanent Audit Lock:</span>
            <p>
              Publishing will make the 5 winning numbers visible to all subscribers, record official
              prize awards, and freeze participant tickets.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPublishOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePublishDraw}
              isLoading={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm & Publish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

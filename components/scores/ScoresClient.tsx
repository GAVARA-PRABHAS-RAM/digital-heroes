"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Award,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  addScoreAction,
  updateScoreAction,
  deleteScoreAction,
} from "@/app/actions/scores";
import type { Score } from "@/types/database";
import type { ScoreStats } from "@/services/scores/scoreService";

interface ScoresClientProps {
  initialScores: Score[];
  initialStats: ScoreStats;
}

export function ScoresClient({ initialScores, initialStats }: ScoresClientProps) {
  const router = useRouter();

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [deletingScore, setDeletingScore] = useState<Score | null>(null);

  // Add form state
  const todayStr = new Date().toISOString().split("T")[0];
  const [addScoreVal, setAddScoreVal] = useState<string>("");
  const [addDateVal, setAddDateVal] = useState<string>(todayStr);

  // Edit form state
  const [editScoreVal, setEditScoreVal] = useState<string>("");

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const clearFeedbackAfterDelay = () => {
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // Handle Add Score
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const scoreNum = parseInt(addScoreVal, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setFormError("Score must be a valid integer between 1 and 45 points.");
      return;
    }

    if (!addDateVal) {
      setFormError("Please select a date for this scorecard.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await addScoreAction({
        score: scoreNum,
        score_date: addDateVal,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to record score.");
        setIsLoading(false);
        return;
      }

      setIsAddOpen(false);
      setAddScoreVal("");
      setAddDateVal(todayStr);
      setFeedback({
        type: "success",
        message: "Scorecard successfully logged! Rolling 5-score window updated.",
      });
      clearFeedbackAfterDelay();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Edit Score
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;

    setFormError(null);
    const scoreNum = parseInt(editScoreVal, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setFormError("Score must be a valid integer between 1 and 45 points.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateScoreAction(editingScore.id, scoreNum);

      if (!result.success) {
        setFormError(result.error || "Failed to update score.");
        setIsLoading(false);
        return;
      }

      setEditingScore(null);
      setFeedback({
        type: "success",
        message: "Score updated successfully.",
      });
      clearFeedbackAfterDelay();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Score
  const handleDeleteConfirm = async () => {
    if (!deletingScore) return;

    setIsLoading(true);

    try {
      const result = await deleteScoreAction(deletingScore.id);

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error || "Failed to delete score.",
        });
        setIsLoading(false);
        return;
      }

      setDeletingScore(null);
      setFeedback({
        type: "success",
        message: "Score successfully removed from your record.",
      });
      clearFeedbackAfterDelay();
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

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Golf Score Management"
        description="Log your attested 18-hole Stableford scores (1–45 pts). The system automatically retains your latest 5 rounds to calculate your rolling average."
        actions={
          <Button
            onClick={() => {
              setFormError(null);
              setAddScoreVal("");
              setAddDateVal(todayStr);
              setIsAddOpen(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Log Round Score
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard
          title="Rounds in Window"
          value={`${initialStats.count} / 5`}
          subtitle={
            initialStats.count === 5
              ? "Rolling window full (oldest pruned on next entry)"
              : `${5 - initialStats.count} more round${5 - initialStats.count === 1 ? "" : "s"} to complete window`
          }
          icon={<Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        />
        <MetricCard
          title="Stableford Average"
          value={initialStats.average !== null ? `${initialStats.average} pts` : "—"}
          subtitle="Computed across your active rolling 5 rounds"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        />
        <MetricCard
          title="Best Round"
          value={initialStats.best !== null ? `${initialStats.best} pts` : "—"}
          subtitle="Peak Stableford performance in current window"
          icon={<Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        />
      </div>

      {/* Rolling Policy Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-200">
            5-Score Rolling Retention Rule:
          </span>{" "}
          Digital Heroes preserves exactly your 5 most recent rounds. When a 6th score is submitted,
          the oldest round is automatically pruned from the database. Only one score per calendar date is permitted.
        </div>
      </div>

      {/* Scores List / Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Active Rolling Scorecards ({initialScores.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Ordered newest first (Reverse Chronological)
          </span>
        </div>

        {initialScores.length === 0 ? (
          <EmptyState
            icon={<Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
            title="No Scorecards Recorded"
            description="You haven't logged any rounds yet. Post your latest 18-hole Stableford score (1–45 points) to start tracking your rolling average."
            action={
              <Button
                onClick={() => {
                  setFormError(null);
                  setAddScoreVal("");
                  setAddDateVal(todayStr);
                  setIsAddOpen(true);
                }}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Log Your First Round
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {initialScores.map((score, index) => (
              <div
                key={score.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-4">
                  {/* Score circle badge */}
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800/80 dark:text-emerald-200 shrink-0">
                    <span className="text-xl font-black leading-none">{score.score}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
                      PTS
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatDate(score.score_date)}
                      </span>
                      {index === 0 && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                          Latest Round
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Date logged: {score.score_date}</span>
                      <span>•</span>
                      <span>Rank #{index + 1} in rolling window</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setEditingScore(score);
                      setEditScoreVal(score.score.toString());
                    }}
                    className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingScore(score);
                    }}
                    className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Score Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          if (!isLoading) {
            setIsAddOpen(false);
            setFormError(null);
          }
        }}
        title="Log Golf Score"
        description="Enter your 18-hole Stableford score and the date of play. Valid range is 1 to 45 points."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Stableford Points (1 – 45)
            </label>
            <Input
              type="number"
              min={1}
              max={45}
              step={1}
              value={addScoreVal}
              onChange={(e) => setAddScoreVal(e.target.value)}
              placeholder="e.g. 36"
              required
              disabled={isLoading}
              className="text-base font-semibold"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Stableford points awarded based on net score vs. par (typically 36 is par play).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Round Date
            </label>
            <Input
              type="date"
              max={todayStr}
              value={addDateVal}
              onChange={(e) => setAddDateVal(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Only one score per date is permitted. Future dates are prohibited.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Save Round
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Score Modal */}
      <Modal
        isOpen={!!editingScore}
        onClose={() => {
          if (!isLoading) {
            setEditingScore(null);
            setFormError(null);
          }
        }}
        title="Edit Score"
        description={
          editingScore ? `Update Stableford score for round on ${editingScore.score_date}` : ""
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Stableford Points (1 – 45)
            </label>
            <Input
              type="number"
              min={1}
              max={45}
              step={1}
              value={editScoreVal}
              onChange={(e) => setEditScoreVal(e.target.value)}
              required
              disabled={isLoading}
              className="text-base font-semibold"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingScore(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Update Score
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingScore}
        onClose={() => {
          if (!isLoading) setDeletingScore(null);
        }}
        title="Delete Scorecard"
        description="Are you sure you want to remove this scorecard? This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          {deletingScore && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm">
              <div className="font-semibold text-slate-900 dark:text-white">
                Round on {formatDate(deletingScore.score_date)}
              </div>
              <div className="text-slate-600 dark:text-slate-300 mt-1">
                Score: <span className="font-bold text-emerald-600">{deletingScore.score} pts</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingScore(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={isLoading}
            >
              Delete Round
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

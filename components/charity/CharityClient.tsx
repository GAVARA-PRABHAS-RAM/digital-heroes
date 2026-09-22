"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  HeartHandshake,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { updateUserCharityAction } from "@/app/actions/charity";
import type { CharityWithEvents, UserCharitySelection } from "@/services/charities/charityService";

interface CharityClientProps {
  charities: CharityWithEvents[];
  initialUserCharity: UserCharitySelection | null;
}

export function CharityClient({ charities, initialUserCharity }: CharityClientProps) {
  const router = useRouter();

  // Current selection state
  const [selectedCharityId, setSelectedCharityId] = useState<string | null>(
    initialUserCharity?.charity.id || (charities.length > 0 ? charities[0].id : null)
  );
  const [percentage, setPercentage] = useState<number>(
    initialUserCharity?.userCharity.contribution_percentage || 20
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Selection modal state
  const [confirmCharity, setConfirmCharity] = useState<CharityWithEvents | null>(null);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const clearFeedbackAfterDelay = () => {
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // Find currently active charity object
  const activeCharity = charities.find((c) => c.id === initialUserCharity?.charity.id);

  // Filtered charities
  const filteredCharities = charities.filter((charity) => {
    const matchesSearch =
      charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charity.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === "all") return true;
    if (selectedCategory === "featured") return charity.featured;
    if (selectedCategory === "youth") return charity.name.toLowerCase().includes("youth") || charity.description.toLowerCase().includes("youth") || charity.description.toLowerCase().includes("children");
    if (selectedCategory === "veterans") return charity.name.toLowerCase().includes("veteran") || charity.description.toLowerCase().includes("veteran") || charity.description.toLowerCase().includes("heroes");
    if (selectedCategory === "health") return charity.name.toLowerCase().includes("health") || charity.description.toLowerCase().includes("health") || charity.description.toLowerCase().includes("cancer") || charity.description.toLowerCase().includes("community");

    return true;
  });

  // Handle Save / Update Allocation Percentage
  const handleSavePercentage = async () => {
    if (!initialUserCharity) {
      setFeedback({
        type: "error",
        message: "Please select a charity from the list below before saving an allocation.",
      });
      return;
    }

    if (percentage < 10 || percentage > 100) {
      setFeedback({
        type: "error",
        message: "Charity contribution percentage must be between 10% and 100%.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateUserCharityAction({
        charityId: initialUserCharity.charity.id,
        contributionPercentage: percentage,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update contribution percentage.",
        });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        message: `Contribution percentage successfully updated to ${percentage}%.`,
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

  // Handle Select New Charity Confirmation
  const handleConfirmSelect = async () => {
    if (!confirmCharity) return;

    setIsLoading(true);

    try {
      const effectivePercentage = Math.max(10, percentage);
      const result = await updateUserCharityAction({
        charityId: confirmCharity.id,
        contributionPercentage: effectivePercentage,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update charity selection.",
        });
        setIsLoading(false);
        return;
      }

      setSelectedCharityId(confirmCharity.id);
      setConfirmCharity(null);
      setFeedback({
        type: "success",
        message: `You are now supporting ${confirmCharity.name} with ${effectivePercentage}% of your membership!`,
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Charity Selection & Allocation"
        description="Select a verified non-profit cause to receive your monthly membership contributions. Every member allocates at least 10% of their subscription directly to charity."
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

      {/* Active Charity & Allocation Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Your Current Allocation
              </Badge>
              {initialUserCharity && (
                <Badge variant="outline" className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {initialUserCharity.userCharity.contribution_percentage}% Allocated
                </Badge>
              )}
            </div>

            {activeCharity ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {activeCharity.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {activeCharity.description}
                </p>
                {activeCharity.website_url && (
                  <a
                    href={activeCharity.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <span>Visit Official Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  No Charity Selected Yet
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Choose an organization from the directory below to direct your fundraising impact.
                  A minimum of 10% is allocated automatically.
                </p>
              </>
            )}
          </div>

          {/* Allocation Slider Control */}
          <div className="w-full lg:w-80 p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm dark:bg-slate-950 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Contribution Split
                </span>
              </div>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {percentage}%
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none dark:bg-slate-700"
              />
              <div className="flex justify-between text-[11px] font-medium text-slate-400">
                <span>10% (Min)</span>
                <span>50%</span>
                <span>100% (All-In)</span>
              </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className={`py-1 text-xs font-semibold rounded-lg border transition-all ${
                    percentage === pct
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {initialUserCharity && (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={handleSavePercentage}
                isLoading={isLoading}
                disabled={percentage === initialUserCharity.userCharity.contribution_percentage}
              >
                Save New Percentage
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Partner Charity Directory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Browse verified organizations and review upcoming events & community initiatives.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search charities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Causes" },
            { id: "featured", label: "Featured" },
            { id: "youth", label: "Youth & Sports" },
            { id: "veterans", label: "Veterans & First Responders" },
            { id: "health", label: "Health & Community" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Charities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCharities.map((charity) => {
            const isCurrent = charity.id === initialUserCharity?.charity.id;

            return (
              <Card
                key={charity.id}
                className={`flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? "ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50/20"
                    : "hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          {charity.name}
                        </CardTitle>
                        {charity.featured && (
                          <Badge variant="warning" className="gap-1 text-[10px]">
                            <Sparkles className="w-3 h-3" /> Featured
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-3">
                        {charity.description}
                      </CardDescription>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Upcoming Events preview */}
                  {charity.charity_events && charity.charity_events.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Upcoming Events ({charity.charity_events.length})
                      </span>
                      <div className="space-y-2">
                        {charity.charity_events.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 dark:bg-slate-800/60 dark:border-slate-700/60 text-xs"
                          >
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                              <span>{ev.title}</span>
                              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                {ev.event_date}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {ev.description}
                            </p>
                            {ev.location && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                <MapPin className="w-3 h-3" />
                                <span>{ev.location}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {charity.website_url && (
                    <div className="pt-1">
                      <a
                        href={charity.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <span>Official website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full gap-2 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Currently Selected ({initialUserCharity?.userCharity.contribution_percentage}%)
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => setConfirmCharity(charity)}
                    >
                      <HeartHandshake className="w-4 h-4" />
                      Select This Charity
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmCharity}
        onClose={() => {
          if (!isLoading) setConfirmCharity(null);
        }}
        title="Confirm Charity Selection"
        description="Switching your active charity will allocate your monthly membership contributions to this organization."
      >
        <div className="space-y-4 pt-2">
          {confirmCharity && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                {confirmCharity.name}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {confirmCharity.description}
              </p>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                Your current allocation of {Math.max(10, percentage)}% will be directed to this charity.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCharity(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSelect}
              isLoading={isLoading}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

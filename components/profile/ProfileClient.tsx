"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction } from "@/app/actions/profile";
import {
  User,
  Mail,
  Phone,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
} from "lucide-react";
import type { Profile } from "@/types/database";

interface ProfileClientProps {
  initialProfile: Profile;
}

export function ProfileClient({ initialProfile }: ProfileClientProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");

  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({
        type: "error",
        message: "Full name cannot be blank.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() ? phone.trim() : null,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update profile.",
        });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        message: "Profile updated successfully.",
      });
      setTimeout(() => setFeedback(null), 5000);
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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
    }
  };

  const formattedDate = () => {
    try {
      return new Date(initialProfile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return initialProfile.created_at;
    }
  };

  const initials = (fullName || initialProfile.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Account & Golfer Profile"
        description="View and update your personal details, review your subscription role, and manage session security."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Overview */}
        <div className="space-y-6">
          <Card className="text-center p-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md mb-4">
                {initials || "DH"}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {fullName || "Subscriber"}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {initialProfile.email}
              </span>

              <div className="flex items-center gap-2 mt-4">
                {initialProfile.role === "admin" ? (
                  <Badge variant="warning" className="gap-1 text-xs">
                    <Shield className="w-3.5 h-3.5" /> Administrator
                  </Badge>
                ) : (
                  <Badge variant="success" className="gap-1 text-xs">
                    <Shield className="w-3.5 h-3.5" /> Subscriber
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Member Since
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {formattedDate()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
            </div>
          </Card>

          {/* Security & Sign Out Card */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Account Security
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Signed in with Supabase Authentication. Your role and permissions are strictly enforced
              by Row-Level Security.
            </p>
            <Button
              variant="outline"
              onClick={handleSignOut}
              isLoading={isSigningOut}
              className="w-full gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Digital Heroes
            </Button>
          </Card>
        </div>

        {/* Right Column: Editable Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Golfer Profile Details</CardTitle>
              <CardDescription>
                Update your contact information. Email address and account role are managed via system
                administration.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jack Nicklaus"
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Phone Number (Optional)
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    disabled={isLoading}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used solely for prize draw notification and verification attestation.
                  </p>
                </div>

                {/* Read-Only: Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Email Address (Read-only)
                    </label>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Lock className="w-3 h-3" /> Managed by Auth Provider
                    </span>
                  </div>
                  <Input
                    type="email"
                    value={initialProfile.email}
                    disabled
                    className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Read-Only: Role */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Account Role (Read-only)
                    </label>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Shield className="w-3 h-3" /> Protected by Database Trigger
                    </span>
                  </div>
                  <Input
                    type="text"
                    value={initialProfile.role === "admin" ? "Administrator" : "Subscriber"}
                    disabled
                    className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 cursor-not-allowed font-medium capitalize"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Role elevation is strictly restricted to system administrators via RLS triggers.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="submit" isLoading={isLoading} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Container } from "./Container";
import { Shield, Heart, Award, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand pillar */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">Digital Heroes</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Empowering golfers to track performance, enter monthly prize draws, and generate transparent charitable donations.
            </p>
          </div>

          {/* Platform Pillars */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Platform Pillars
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Performance Tracking</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Monthly Draw-Based Rewards</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Direct Charity Contribution</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Explore
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/how-it-works" className="hover:text-emerald-600 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/charities" className="hover:text-emerald-600 transition-colors">
                  Charity Directory
                </Link>
              </li>
              <li>
                <Link href="/draws" className="hover:text-emerald-600 transition-colors">
                  Monthly Draws
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-600 transition-colors">
                  Membership Options
                </Link>
              </li>
            </ul>
          </div>

          {/* Member Portals */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Portals
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/dashboard" className="hover:text-emerald-600 transition-colors">
                  Subscriber Dashboard
                </Link>
              </li>
              <li>
                <Link href="/scores" className="hover:text-emerald-600 transition-colors">
                  Submit Scores
                </Link>
              </li>
              <li>
                <Link href="/charity" className="hover:text-emerald-600 transition-colors">
                  Charity Allocation
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-emerald-600 transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Digital Heroes. All rights reserved.</p>
          <p className="text-[11px] max-w-md text-center sm:text-right">
            Non-profit fundraising operates in compliance with relevant charitable gaming and prize draw regulations.
          </p>
        </div>
      </Container>
    </footer>
  );
}

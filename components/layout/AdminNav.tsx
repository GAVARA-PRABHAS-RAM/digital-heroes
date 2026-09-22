"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Users,
  CreditCard,
  Target,
  Heart,
  Sparkles,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: ShieldAlert },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/scores", label: "Scores", icon: Target },
  { href: "/admin/charities", label: "Charities", icon: Heart },
  { href: "/admin/draws", label: "Draws", icon: Sparkles },
  { href: "/admin/winners", label: "Winners & Proofs", icon: CheckCircle },
  { href: "/admin/reports", label: "Reports & Payouts", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      {adminLinks.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
              isActive
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", isActive ? "text-emerald-400 dark:text-emerald-600" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

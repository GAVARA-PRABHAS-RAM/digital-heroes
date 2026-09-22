"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Award,
  HeartHandshake,
  CreditCard,
  Sparkles,
  Gift,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const subscriberLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/scores", label: "Scores", icon: Award },
  { href: "/charity", label: "Charity", icon: HeartHandshake },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/draws", label: "Draws", icon: Sparkles },
  { href: "/winnings", label: "Winnings", icon: Gift },
  { href: "/profile", label: "Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      {subscriberLinks.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Icon className={cn("w-4 h-4", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

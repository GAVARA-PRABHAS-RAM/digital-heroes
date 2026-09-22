"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LogOut, User, Sparkles } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [role, setRole] = useState<string>("subscriber");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.role) {
            setRole(profile.role);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role) setRole(profile.role);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (isLoading) {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />;
  }

  if (user) {
    const displayName =
      (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Golfer";

    return (
      <div className="flex items-center gap-3">
        <Link
          href={role === "admin" ? "/admin" : "/dashboard"}
          className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold leading-tight line-clamp-1">{displayName}</span>
            <span className="text-[10px] text-slate-500 capitalize">{role}</span>
          </div>
          {role === "admin" && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Admin
            </Badge>
          )}
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          title="Sign Out"
          className="text-slate-500 hover:text-rose-600 px-2.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-1.5 text-xs">Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <Link href="/login">
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </Link>
      <Link href="/signup">
        <Button variant="primary" size="sm" className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Join Digital Heroes
        </Button>
      </Link>
    </div>
  );
}

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Loading...",
  className,
  spinnerSize = "md",
}: LoadingStateProps) {
  const spinnerSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-3",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-emerald-600 dark:text-emerald-400", spinnerSizes[spinnerSize])} />
      {message && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{message}</p>}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
}

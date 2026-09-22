import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministically formats a date string or Date object as DD/MM/YYYY.
 * Uses UTC date values to guarantee 100% identical output across server and client,
 * preventing any React hydration mismatches caused by browser or server locales.
 *
 * Example:
 *   formatDate("2026-09-21T06:47:16.354812+00:00") => "21/09/2026"
 *   formatDate("2026-09-28") => "28/09/2026"
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  if (typeof dateInput === "string") {
    // Fast path for ISO or YYYY-MM-DD date strings
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}


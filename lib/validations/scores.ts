import { z } from "zod";

export const scoreInputSchema = z.object({
  score: z
    .number({
      required_error: "Score is required",
      invalid_type_error: "Score must be a valid number",
    })
    .int("Score must be an integer")
    .min(1, "Score must be at least 1 (Stableford scale is 1 to 45)")
    .max(45, "Score cannot exceed 45 (Stableford scale is 1 to 45)"),
  score_date: z
    .string({
      required_error: "Score date is required",
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      // Allow today up to end of today UTC
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return date <= tomorrow;
    }, "Score date cannot be in the future"),
});

export const scoreUpdateSchema = z.object({
  score: z
    .number({
      required_error: "Score is required",
      invalid_type_error: "Score must be a valid number",
    })
    .int("Score must be an integer")
    .min(1, "Score must be at least 1 (Stableford scale is 1 to 45)")
    .max(45, "Score cannot exceed 45 (Stableford scale is 1 to 45)"),
});

export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type ScoreUpdateInput = z.infer<typeof scoreUpdateSchema>;
